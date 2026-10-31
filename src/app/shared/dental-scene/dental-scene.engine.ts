import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Euler,
  Fog,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NearestFilter,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Quaternion,
  Scene,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import {
  buildCrown,
  buildEnvironment,
  buildRoot,
  buildTooth,
  clamp,
  createGlintTexture,
  createMaterials,
  easeOutCubic,
} from './dental-geometry';

/**
 * Immersive dental fly-through: dozens of glossy teeth, brushes, mirrors and implants tumble past
 * the camera in a deep-teal void, with lens-flare glints, glitching scan tiles and one hero molar.
 * Inspired by "object swarm" brand films, built entirely from procedural geometry (no model files).
 */

export interface DentalSceneOptions {
  /** Render a single still frame and never start the animation loop. */
  readonly reducedMotion: boolean;
}

interface Flyer {
  readonly mesh: InstancedMesh;
  readonly index: number;
  readonly position: Vector3;
  readonly rotation: Euler;
  readonly spin: Vector3;
  readonly scale: number;
  readonly speed: number;
}

interface Tile {
  readonly mesh: Mesh;
  readonly frame: LineSegments;
  readonly position: Vector3;
  readonly speed: number;
  nextGlitch: number;
}

interface Spark {
  readonly sprite: Sprite;
  readonly velocity: Vector3;
  life: number;
}

interface Wave {
  readonly mesh: Mesh;
  life: number;
}

interface Glint {
  readonly sprite: Sprite;
  readonly target: Flyer;
  readonly offset: Vector3;
  readonly speed: number;
  readonly phase: number;
}

const TRAIL_COUNT = 36;
const FOV = 50;
const CAMERA_Z = 8;
const TUNNEL_NEAR = CAMERA_Z - 2.6;
const TUNNEL_LENGTH = 48;
const FOG_COLOR = 0x04252d;
/** Where the hero molar sits (right of the headline). */
const HERO_X = 3.4;
const TILE_COLORS = ['#19b8c6', '#ffffff', '#0e7c82', '#7fe7ee', '#06303a', '#d9f7fb'];

/* ------------------------------------------------------------ geometry merge */

interface Part {
  readonly geometry: BufferGeometry;
  /** Used when the geometry has no vertex colours of its own. */
  readonly color: Color;
}

/** Bakes several shapes into one vertex-coloured geometry so a whole object can be instanced. */
function mergeParts(parts: readonly Part[]): BufferGeometry {
  const flat = parts.map((part) => ({
    geometry: part.geometry.index ? part.geometry.toNonIndexed() : part.geometry,
    color: part.color,
  }));
  let total = 0;
  for (const entry of flat) {
    total += entry.geometry.getAttribute('position').count;
  }

  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);
  let offset = 0;

  for (const { geometry, color } of flat) {
    const position = geometry.getAttribute('position') as BufferAttribute;
    const normal = geometry.getAttribute('normal') as BufferAttribute;
    const vertexColor = geometry.getAttribute('color') as BufferAttribute | undefined;
    for (let i = 0; i < position.count; i++) {
      const k = (offset + i) * 3;
      positions[k] = position.getX(i);
      positions[k + 1] = position.getY(i);
      positions[k + 2] = position.getZ(i);
      normals[k] = normal.getX(i);
      normals[k + 1] = normal.getY(i);
      normals[k + 2] = normal.getZ(i);
      colors[k] = vertexColor ? vertexColor.getX(i) : color.r;
      colors[k + 1] = vertexColor ? vertexColor.getY(i) : color.g;
      colors[k + 2] = vertexColor ? vertexColor.getZ(i) : color.b;
    }
    offset += position.count;
  }

  const merged = new BufferGeometry();
  merged.setAttribute('position', new BufferAttribute(positions, 3));
  merged.setAttribute('normal', new BufferAttribute(normals, 3));
  merged.setAttribute('color', new BufferAttribute(colors, 3));
  return merged;
}

function swarmMolar(): BufferGeometry {
  const warm = new Color('#e7dab9');
  return mergeParts([
    { geometry: buildCrown(56, 42), color: new Color('#ffffff') },
    { geometry: buildRoot(-0.36, -0.1, 0.16, 24, 16), color: warm },
    { geometry: buildRoot(0.36, 0.1, -0.16, 24, 16), color: warm },
  ]);
}

function swarmToothbrush(): BufferGeometry {
  const turquoise = new Color('#18b6c6');
  const white = new Color('#ffffff');
  const handle = new CapsuleGeometry(0.11, 1.5, 6, 18);
  handle.scale(1, 1, 0.5);
  handle.translate(0, -0.55, 0);
  const neck = new CylinderGeometry(0.06, 0.09, 0.5, 12);
  neck.translate(0, 0.48, 0);
  const head = new CapsuleGeometry(0.13, 0.5, 6, 18);
  head.scale(1, 1, 0.45);
  head.translate(0, 0.98, 0);
  const bristles = new BoxGeometry(0.22, 0.52, 0.16);
  bristles.translate(0, 0.98, 0.1);
  return mergeParts([
    { geometry: handle, color: turquoise },
    { geometry: neck, color: turquoise },
    { geometry: head, color: white },
    { geometry: bristles, color: new Color('#aeeef5') },
  ]);
}

function swarmMirror(): BufferGeometry {
  const chrome = new Color('#e3f1f4');
  const handle = new CylinderGeometry(0.035, 0.05, 1.5, 12);
  handle.translate(0, -0.45, 0);
  const collar = new CylinderGeometry(0.06, 0.06, 0.18, 12);
  collar.translate(0, 0.3, 0);
  const ring = new TorusGeometry(0.27, 0.04, 12, 36);
  ring.translate(0, 0.66, 0);
  const disc = new CylinderGeometry(0.26, 0.26, 0.02, 36);
  disc.rotateX(Math.PI / 2);
  disc.translate(0, 0.66, 0);
  return mergeParts([
    { geometry: handle, color: chrome },
    { geometry: collar, color: new Color('#18b6c6') },
    { geometry: ring, color: chrome },
    { geometry: disc, color: new Color('#ffffff') },
  ]);
}

function swarmImplant(): BufferGeometry {
  const steel = new Color('#d6e0e4');
  const parts: Part[] = [];
  parts.push({ geometry: new CylinderGeometry(0.15, 0.09, 1.1, 18), color: steel });
  for (let i = 0; i < 7; i++) {
    const y = -0.46 + i * 0.15;
    const radius = 0.09 + (0.15 - 0.09) * ((y + 0.55) / 1.1);
    const thread = new TorusGeometry(radius + 0.01, 0.028, 8, 22);
    thread.rotateX(Math.PI / 2);
    thread.translate(0, y, 0);
    parts.push({ geometry: thread, color: new Color('#f2fbfd') });
  }
  const abutment = new CylinderGeometry(0.1, 0.1, 0.4, 16);
  abutment.translate(0, 0.75, 0);
  parts.push({ geometry: abutment, color: new Color('#18b6c6') });
  return mergeParts(parts);
}

/* -------------------------------------------------------------------- engine */

export class DentalSceneEngine {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 90);
  private readonly materials = createMaterials();
  private readonly swarmMaterial: MeshPhysicalMaterial;
  private readonly flyers: Flyer[] = [];
  private readonly instanced: InstancedMesh[] = [];
  private readonly tiles: Tile[] = [];
  private readonly glints: Glint[] = [];
  private readonly trail: Spark[] = [];
  private readonly waves: Wave[] = [];
  private cursorLight?: PointLight;
  private readonly heroTooth: Group;
  private readonly heroHalo: Mesh;
  private readonly glintTexture: Texture;
  private readonly tileTexture: CanvasTexture;
  private readonly tileContext: CanvasRenderingContext2D | null;
  private readonly environmentTarget: WebGLRenderTarget;
  private readonly resizeObserver: ResizeObserver;
  private readonly visibilityObserver?: IntersectionObserver;

  private readonly pointerTarget = new Vector2();
  private readonly pointer = new Vector2();
  private readonly lookTarget = new Vector3();
  private readonly tempMatrix = new Matrix4();
  private readonly tempQuaternion = new Quaternion();
  private readonly tempScale = new Vector3();

  private visible = true;
  private documentVisible = true;
  private disposed = false;
  private looping = false;
  private startedAt = 0;
  private lastFrame = 0;
  private nextTileTexture = 0;

  /** Recent mouse movement, 0..1.5. Everything in the scene is driven by this, so it rests when the mouse rests. */
  private energy = 0;
  private pulse = 0;
  private yaw = 0.5;
  private yawTarget = 0.5;
  private lastScroll = -1;
  private hasPointer = false;
  private forceFrame = true;
  private fxActive = false;
  private trailCursor = 0;
  private lastX = 0;
  private lastY = 0;
  private sparkX = -999;
  private sparkY = -999;
  private readonly cursor = new Vector3();
  private readonly cursorDir = new Vector3();

  constructor(
    private readonly host: HTMLElement,
    private readonly options: DentalSceneOptions,
  ) {
    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.camera.position.set(0, 0, CAMERA_Z);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = SRGBColorSpace;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.75));

    // Styled inline: the canvas is created at runtime, so component-scoped CSS cannot reach it.
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    host.appendChild(canvas);

    this.scene.fog = new Fog(FOG_COLOR, 11, 46);

    // Image-based lighting gives the glossy, chrome-like highlights.
    const generator = new PMREMGenerator(this.renderer);
    const environment = buildEnvironment();
    this.environmentTarget = generator.fromScene(environment, 0.03);
    this.scene.environment = this.environmentTarget.texture;
    generator.dispose();
    this.disposeObject(environment);

    const key = new DirectionalLight(0xffffff, 1.4);
    key.position.set(4, 6, 8);
    this.scene.add(key);

    this.swarmMaterial = new MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.16,
      metalness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.5,
    });

    this.buildSwarm();

    // Hero molar: full-resolution, sitting right of the headline.
    this.heroTooth = buildTooth(this.materials, buildCrown());
    this.heroTooth.scale.setScalar(1.35);
    this.heroTooth.position.set(HERO_X, -0.1, 0);
    this.scene.add(this.heroTooth);

    this.heroHalo = new Mesh(
      new TorusGeometry(2.1, 0.012, 10, 140),
      new MeshBasicMaterial({
        color: new Color('#7fe7ee'),
        transparent: true,
        opacity: 0.7,
        fog: false,
      }),
    );
    this.heroHalo.position.copy(this.heroTooth.position);
    this.heroHalo.rotation.set(1.2, 0.2, 0);
    this.scene.add(this.heroHalo);

    // Glitching scan tiles.
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = 32;
    tileCanvas.height = 18;
    this.tileContext = tileCanvas.getContext('2d');
    this.tileTexture = new CanvasTexture(tileCanvas);
    this.tileTexture.magFilter = NearestFilter;
    this.tileTexture.minFilter = NearestFilter;
    this.tileTexture.colorSpace = SRGBColorSpace;
    this.paintTileTexture();
    this.buildTiles();

    this.glintTexture = createGlintTexture();
    this.buildGlints();
    this.buildEffects();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();

    if (options.reducedMotion) {
      this.heroTooth.rotation.set(-0.1, 0.6, 0);
      this.updateFlyers(0, 0, 0);
      this.render();
      return;
    }

    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    if (typeof IntersectionObserver !== 'undefined') {
      this.visibilityObserver = new IntersectionObserver((entries) => {
        this.visible = entries.some((entry) => entry.isIntersecting);
        this.syncLoop();
      });
      this.visibilityObserver.observe(host);
    }

    this.startedAt = performance.now();
    this.syncLoop();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerdown', this.onPointerDown);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.resizeObserver.disconnect();
    this.visibilityObserver?.disconnect();

    this.instanced.forEach((mesh) => mesh.dispose());
    this.disposeObject(this.scene);
    this.swarmMaterial.dispose();
    this.glintTexture.dispose();
    this.tileTexture.dispose();
    this.environmentTarget.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  /* ----------------------------------------------------------- scene building */

  private buildSwarm(): void {
    const kinds: ReadonlyArray<{ geometry: BufferGeometry; count: number; size: [number, number] }> = [
      { geometry: swarmMolar(), count: 34, size: [0.55, 1.0] },
      { geometry: swarmToothbrush(), count: 16, size: [0.7, 1.2] },
      { geometry: swarmMirror(), count: 12, size: [0.7, 1.15] },
      { geometry: swarmImplant(), count: 14, size: [0.7, 1.1] },
    ];
    const tint = new Color();
    const palette = ['#ffffff', '#ffffff', '#dff9fc', '#9defe8', '#bfeff6'];

    for (const kind of kinds) {
      const mesh = new InstancedMesh(kind.geometry, this.swarmMaterial, kind.count);
      mesh.frustumCulled = false;
      this.instanced.push(mesh);
      this.scene.add(mesh);

      for (let i = 0; i < kind.count; i++) {
        mesh.setColorAt(i, tint.set(palette[Math.floor(Math.random() * palette.length)]));
        const flyer: Flyer = {
          mesh,
          index: i,
          position: new Vector3(),
          rotation: new Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
          ),
          spin: new Vector3(
            (Math.random() - 0.5) * 1.4,
            (Math.random() - 0.5) * 1.4,
            (Math.random() - 0.5) * 1.4,
          ),
          scale: kind.size[0] + Math.random() * (kind.size[1] - kind.size[0]),
          speed: 0.85 + Math.random() * 0.5,
        };
        this.respawn(flyer.position, true);
        this.flyers.push(flyer);
      }
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }

  /** Picks a spot in the tunnel, keeping the hero molar's neighbourhood clear. */
  private respawn(position: Vector3, anywhere: boolean): void {
    for (let attempt = 0; attempt < 6; attempt++) {
      position.x = 3 + (Math.random() - 0.5) * 22;
      position.y = (Math.random() - 0.5) * 12;
      if (Math.hypot(position.x - HERO_X, position.y) > 2.8) {
        break;
      }
    }
    position.z = anywhere ? TUNNEL_NEAR - Math.random() * TUNNEL_LENGTH : TUNNEL_NEAR - TUNNEL_LENGTH;
  }

  private buildTiles(): void {
    const slots: ReadonlyArray<readonly [number, number, number]> = [
      [-1.5, 1.2, -7],
      [6.5, -1.8, -13],
      [2.2, 2.6, -19],
      [8.5, 1.4, -26],
      [-3.8, -2.2, -32],
    ];
    for (const [x, y, z] of slots) {
      const geometry = new PlaneGeometry(2.6, 1.46);
      const mesh = new Mesh(
        geometry,
        new MeshBasicMaterial({
          map: this.tileTexture,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          side: DoubleSide,
        }),
      );
      const frame = new LineSegments(
        new EdgesGeometry(geometry),
        new LineBasicMaterial({ color: new Color('#7fe7ee'), transparent: true, opacity: 0.9 }),
      );
      frame.scale.setScalar(1.06);
      mesh.add(frame);
      mesh.position.set(x, y, z);
      mesh.rotation.set(0.1, -0.25, 0.05);
      this.scene.add(mesh);
      this.tiles.push({
        mesh,
        frame,
        position: new Vector3(x, y, z),
        speed: 0.9,
        nextGlitch: Math.random(),
      });
    }
  }

  private paintTileTexture(): void {
    const context = this.tileContext;
    if (!context) {
      return;
    }
    context.fillStyle = '#052a32';
    context.fillRect(0, 0, 32, 18);
    for (let i = 0; i < 38; i++) {
      context.fillStyle = TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)];
      context.globalAlpha = 0.45 + Math.random() * 0.55;
      context.fillRect(
        Math.floor(Math.random() * 32),
        Math.floor(Math.random() * 18),
        1 + Math.floor(Math.random() * 7),
        1 + Math.floor(Math.random() * 3),
      );
    }
    context.globalAlpha = 1;
    this.tileTexture.needsUpdate = true;
  }

  private buildGlints(): void {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const target = this.flyers[Math.floor(Math.random() * this.flyers.length)];
      const sprite = new Sprite(
        new SpriteMaterial({
          map: this.glintTexture,
          color: new Color('#d6fbff'),
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
          opacity: 0,
        }),
      );
      this.scene.add(sprite);
      this.glints.push({
        sprite,
        target,
        offset: new Vector3(
          (Math.random() - 0.5) * 0.9,
          (Math.random() - 0.5) * 0.9,
          0.3 + Math.random() * 0.3,
        ),
        speed: 1.2 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  /** Cursor light, sparkle trail and click shockwaves. */
  private buildEffects(): void {
    this.cursorLight = new PointLight(0x7fe7ee, 0, 24, 2);
    this.scene.add(this.cursorLight);

    for (let i = 0; i < TRAIL_COUNT; i++) {
      const sprite = new Sprite(
        new SpriteMaterial({
          map: this.glintTexture,
          color: new Color('#9ceaf0'),
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
          opacity: 0,
          fog: false,
        }),
      );
      this.scene.add(sprite);
      this.trail.push({ sprite, velocity: new Vector3(), life: 0 });
    }

    for (let i = 0; i < 3; i++) {
      const mesh = new Mesh(
        new TorusGeometry(1, 0.025, 8, 96),
        new MeshBasicMaterial({
          color: new Color('#9ceaf0'),
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
          fog: false,
        }),
      );
      mesh.visible = false;
      this.scene.add(mesh);
      this.waves.push({ mesh, life: 0 });
    }
  }

  /* ------------------------------------------------------------------ runtime */

  /** Converts a pointer event into a point/ray in the scene under the cursor. */
  private track(event: PointerEvent): void {
    const rect = this.host.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    this.pointerTarget.set(clamp(x, -1.2, 1.2), clamp(-y, -1.2, 1.2));

    this.camera.updateMatrixWorld();
    this.cursorDir
      .set(this.pointerTarget.x, this.pointerTarget.y, 0.5)
      .unproject(this.camera)
      .sub(this.camera.position)
      .normalize();
    const t = (1 - this.camera.position.z) / this.cursorDir.z;
    this.cursor.copy(this.camera.position).addScaledVector(this.cursorDir, t);
    this.hasPointer = true;
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const dx = this.lastX ? event.clientX - this.lastX : 0;
    const dy = this.lastY ? event.clientY - this.lastY : 0;
    this.lastX = event.clientX;
    this.lastY = event.clientY;

    this.track(event);
    this.energy = Math.min(1.5, this.energy + Math.hypot(dx, dy) / 70);
    this.yawTarget += dx * 0.011;

    // Leave a sparkle behind the cursor every ~18px of travel.
    if (Math.hypot(event.clientX - this.sparkX, event.clientY - this.sparkY) > 18) {
      this.sparkX = event.clientX;
      this.sparkY = event.clientY;
      this.spawnSpark();
    }
  };

  /** Click or tap: a shockwave ripples out and the whole scene lurches. */
  private readonly onPointerDown = (event: PointerEvent): void => {
    this.track(event);
    this.energy = Math.max(this.energy, 1.3);
    this.yawTarget += 3.2;
    this.pulse = 1;

    const wave = this.waves.find((entry) => entry.life <= 0) ?? this.waves[0];
    wave.life = 1;
    wave.mesh.visible = true;
    wave.mesh.position.copy(this.cursor);
    wave.mesh.lookAt(this.camera.position);
  };

  private spawnSpark(): void {
    const spark = this.trail[this.trailCursor];
    this.trailCursor = (this.trailCursor + 1) % this.trail.length;
    spark.life = 1;
    spark.sprite.position.copy(this.cursor);
    spark.sprite.position.x += (Math.random() - 0.5) * 0.3;
    spark.sprite.position.y += (Math.random() - 0.5) * 0.3;
    spark.velocity.set((Math.random() - 0.5) * 1.2, 0.3 + Math.random() * 0.8, (Math.random() - 0.5) * 0.8);
  }

  private readonly onVisibilityChange = (): void => {
    this.documentVisible = document.visibilityState !== 'hidden';
    this.forceFrame = true;
    this.syncLoop();
  };

  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
    this.renderer.setAnimationLoop(null);
    this.looping = false;
  };

  private syncLoop(): void {
    if (this.disposed) {
      return;
    }
    const shouldRun = this.visible && this.documentVisible;
    if (shouldRun && !this.looping) {
      this.looping = true;
      this.forceFrame = true;
      this.lastFrame = performance.now();
      this.renderer.setAnimationLoop(this.frame);
    } else if (!shouldRun && this.looping) {
      this.looping = false;
      this.renderer.setAnimationLoop(null);
    }
  }

  private resize(): void {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (width === 0 || height === 0 || this.disposed) {
      return;
    }
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.forceFrame = true;

    // On narrow screens centre the hero molar and keep it inside the frame.
    const narrow = this.camera.aspect < 1;
    this.heroTooth.position.x = narrow ? 0 : HERO_X;
    this.heroTooth.position.y = narrow ? 1.2 : -0.1;
    this.heroTooth.scale.setScalar(narrow ? 1.0 : 1.35);
    this.heroHalo.position.copy(this.heroTooth.position);

    if (this.options.reducedMotion || !this.looping) {
      this.render();
    }
  }

  private readonly frame = (): void => {
    const now = performance.now();
    const delta = Math.min(0.05, (now - this.lastFrame) / 1000);
    const elapsed = (now - this.startedAt) / 1000;
    this.lastFrame = now;

    // Nothing is moving: skip the frame entirely (the canvas keeps its last image).
    const scrolled = Math.abs(window.scrollY - this.lastScroll) > 0.5;
    const settling =
      this.energy > 0.004 ||
      this.pulse > 0.01 ||
      this.fxActive ||
      Math.abs(this.yawTarget - this.yaw) > 0.002 ||
      this.pointerTarget.distanceTo(this.pointer) > 0.001;
    if (!(this.forceFrame || elapsed < 2 || scrolled || settling)) {
      return;
    }
    this.forceFrame = false;

    this.update(elapsed, delta);
    this.render();
  };

  private update(time: number, delta: number): void {
    // Energy fades quickly once the mouse stops, so the scene comes to rest.
    this.energy *= Math.exp(-delta * 2.4);
    this.pulse *= Math.exp(-delta * 1.8);
    const activity = clamp(this.energy * 1.3, 0, 1);

    const follow = 1 - Math.exp(-delta * 3);
    this.pointer.x += (this.pointerTarget.x - this.pointer.x) * follow;
    this.pointer.y += (this.pointerTarget.y - this.pointer.y) * follow;
    this.yaw += (this.yawTarget - this.yaw) * (1 - Math.exp(-delta * 4));

    // Scrolling the page also drives the fly-through (a "warp" feel) and rolls the camera.
    const scrollY = window.scrollY;
    const scrollSpeed = this.lastScroll < 0 ? 0 : Math.abs(scrollY - this.lastScroll);
    this.lastScroll = scrollY;
    const scroll = clamp(scrollY / Math.max(1, window.innerHeight), 0, 1.5);
    const flow = (this.energy * 6 + Math.min(scrollSpeed, 80) * 0.06) * delta;

    this.updateFlyers(flow, delta, activity);
    this.updateTiles(time, flow, activity);
    this.updateGlints(time, Math.max(activity, this.pulse));
    this.updateEffects(delta);

    const intro = easeOutCubic(clamp(time / 1.6, 0, 1));
    const narrow = this.camera.aspect < 1;
    this.heroTooth.scale.setScalar((narrow ? 1.0 : 1.35) * (0.6 + 0.4 * intro));
    this.heroTooth.rotation.y = this.yaw + scroll * 2;
    this.heroTooth.rotation.x = -0.12 - this.pointer.y * 0.25;
    this.heroTooth.rotation.z = -this.pointer.x * 0.1;
    this.heroTooth.position.y = (narrow ? 1.2 : -0.1) + Math.sin(time * 2.2) * 0.12 * clamp(this.energy, 0, 1);
    this.heroHalo.position.copy(this.heroTooth.position);
    this.heroHalo.rotation.z += delta * this.energy * 1.6;

    this.camera.position.set(this.pointer.x * 0.9, this.pointer.y * 0.6, CAMERA_Z);
    this.lookTarget.set(2.6 + this.pointer.x * 0.6, this.pointer.y * 0.4, 0);
    this.camera.lookAt(this.lookTarget);
    this.camera.rotateZ(-this.pointer.x * 0.05 + scroll * 0.18);

    if (activity > 0.15 && time > this.nextTileTexture) {
      this.nextTileTexture = time + 0.35;
      this.paintTileTexture();
    }
  }

  private updateFlyers(flow: number, delta: number, activity: number): void {
    const touched = new Set<InstancedMesh>();
    const spinScale = activity * 2.2;
    const repel = this.hasPointer && this.energy > 0.02 && Math.abs(this.cursorDir.z) > 1e-4;
    const camera = this.camera.position;

    for (const flyer of this.flyers) {
      flyer.position.z += flow * flyer.speed;
      if (flyer.position.z > TUNNEL_NEAR) {
        this.respawn(flyer.position, false);
      }

      // The cursor pushes nearby objects out of its way.
      if (repel) {
        const t = (flyer.position.z - camera.z) / this.cursorDir.z;
        const dx = flyer.position.x - (camera.x + this.cursorDir.x * t);
        const dy = flyer.position.y - (camera.y + this.cursorDir.y * t);
        const distance = Math.hypot(dx, dy);
        const radius = 2.8;
        if (distance < radius && distance > 1e-3) {
          const push = Math.pow(1 - distance / radius, 2) * this.energy * 10 * delta;
          flyer.position.x += (dx / distance) * push;
          flyer.position.y += (dy / distance) * push;
        }
      }

      flyer.rotation.x += flyer.spin.x * delta * spinScale;
      flyer.rotation.y += flyer.spin.y * delta * spinScale;
      flyer.rotation.z += flyer.spin.z * delta * spinScale;

      this.tempQuaternion.setFromEuler(flyer.rotation);
      this.tempScale.setScalar(flyer.scale);
      this.tempMatrix.compose(flyer.position, this.tempQuaternion, this.tempScale);
      flyer.mesh.setMatrixAt(flyer.index, this.tempMatrix);
      touched.add(flyer.mesh);
    }
    touched.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  private updateTiles(time: number, flow: number, activity: number): void {
    for (const tile of this.tiles) {
      tile.position.z += flow * tile.speed;
      if (tile.position.z > TUNNEL_NEAR - 1) {
        tile.position.z -= TUNNEL_LENGTH * 0.8;
        tile.position.x = 1 + (Math.random() - 0.5) * 16;
        tile.position.y = (Math.random() - 0.5) * 7;
      }
      let jitterX = 0;
      if (activity > 0.15 && time > tile.nextGlitch) {
        tile.nextGlitch = time + 0.12 + Math.random() * 0.6;
        jitterX = (Math.random() - 0.5) * 0.35;
        tile.mesh.scale.set(1 + Math.random() * 0.25, 1 - Math.random() * 0.15, 1);
        (tile.mesh.material as MeshBasicMaterial).opacity = Math.random() < 0.25 ? 0.15 : 0.85;
        tile.frame.visible = Math.random() > 0.2;
      }
      tile.mesh.position.set(tile.position.x + jitterX, tile.position.y, tile.position.z);
    }
  }

  private updateGlints(time: number, activity: number): void {
    for (const glint of this.glints) {
      glint.sprite.position.copy(glint.target.position).add(glint.offset);
      const wave = 0.5 + 0.5 * Math.sin(time * glint.speed + glint.phase);
      const flare = Math.pow(wave, 6) * activity;
      const depth = clamp(1 - (CAMERA_Z - glint.sprite.position.z) / 38, 0.2, 1);
      glint.sprite.material.opacity = flare * depth;
      glint.sprite.scale.setScalar(0.5 + flare * 1.9);
    }
  }

  private updateEffects(delta: number): void {
    let active = false;

    for (const spark of this.trail) {
      if (spark.life <= 0) {
        continue;
      }
      active = true;
      spark.life -= delta * 1.3;
      spark.sprite.position.addScaledVector(spark.velocity, delta);
      spark.sprite.material.opacity = Math.max(0, spark.life * spark.life);
      spark.sprite.scale.setScalar(0.25 + (1 - spark.life) * 0.7);
    }

    for (const wave of this.waves) {
      if (wave.life <= 0) {
        continue;
      }
      active = true;
      wave.life -= delta * 0.9;
      wave.mesh.scale.setScalar(0.3 + (1 - wave.life) * 9);
      (wave.mesh.material as MeshBasicMaterial).opacity = Math.max(0, wave.life * 0.8);
      if (wave.life <= 0) {
        wave.mesh.visible = false;
      }
    }

    // A cyan light follows the cursor and glows while the mouse moves.
    if (this.cursorLight && this.hasPointer) {
      this.cursorLight.position.set(this.cursor.x, this.cursor.y, 3);
      this.cursorLight.intensity = 70 * clamp(this.energy, 0, 1) + 90 * this.pulse;
    }

    this.fxActive = active;
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private disposeObject(root: Object3D): void {
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    root.traverse((object) => {
      const item = object as Mesh;
      if (item.geometry) {
        geometries.add(item.geometry);
      }
      const material = item.material as Material | Material[] | undefined;
      if (Array.isArray(material)) {
        material.forEach((entry) => materials.add(entry));
      } else if (material) {
        materials.add(material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }
}
