import type {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  InstancedMesh,
  Mesh,
  Points,
  Sprite,
  PointLight,
  Object3D,
  BufferGeometry,
  MeshPhysicalMaterial,
  MeshBasicMaterial,
  SpriteMaterial,
  PointsMaterial,
  LineSegments,
  LineBasicMaterial,
  Texture,
  DataTexture,
  PMREMGenerator as PMREMGeneratorType,
  Raycaster,
  Plane,
  Vector2,
  Vector3,
  Matrix4,
  Euler,
  Color,
  BufferAttribute,
  Float32BufferAttribute,
  FogExp2,
  RingGeometry,
  CircleGeometry,
  CylinderGeometry,
  BoxGeometry,
  LatheGeometry,
  PlaneGeometry,
  SphereGeometry,
  EdgesGeometry,
  DirectionalLight,
  AmbientLight,
  HemisphereLight,
  Material,
} from 'three';

/* ------------------------------------------------------------------ */
/*  Public contract                                                    */
/* ------------------------------------------------------------------ */

export interface SceneController {
  dispose(): void;
  onMouseMove(x: number, y: number): void;
  onScroll(scrollY: number): void;
  onClick(x: number, y: number): void;
  setReducedMotion(value: boolean): void;
  pause(): void;
  resume(): void;
  resize(): void;
}

/* ------------------------------------------------------------------ */
/*  Internal types                                                     */
/* ------------------------------------------------------------------ */

interface InstanceData {
  px: number;
  py: number;
  pz: number;
  rx: number;
  ry: number;
  rz: number;
  raxisX: number;
  raxisY: number;
  raxisZ: number;
  rotSpeed: number;
  baseSpeed: number;
  scale: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
}

interface ScanTile {
  mesh: Mesh;
  outline: LineSegments;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: Texture;
  flickerTimer: number;
  baseOpacity: number;
}

interface Shockwave {
  mesh: Mesh;
  progress: number;
  active: boolean;
}

type ThreeModule = typeof import('three');

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SWARM_COUNT = 75;
const INSTANCES_PER_TYPE = 19;
const PARTICLE_COUNT = 200;
const FLARE_COUNT = 17;
const SCAN_TILE_COUNT = 5;
const ENERGY_DECAY = 0.96;
const ENERGY_MIN = 0.001;
const ENERGY_CAP = 1.0;
const HERO_POS: [number, number, number] = [4, -0.3, -2];
const EXCLUSION_RADIUS = 3.5;
const REPEL_RADIUS = 2.5;
const SPAWN_Z_MIN = -30;
const SPAWN_Z_MAX = 5;
const PIXEL_RATIO_CAP = 1.75;

/* ------------------------------------------------------------------ */
/*  Utility helpers                                                    */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: number): [number, number, number] {
  return [
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
  ];
}

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function normalizeAxis(): [number, number, number] {
  let x = Math.random() - 0.5;
  let y = Math.random() - 0.5;
  let z = Math.random() - 0.5;
  const len = Math.sqrt(x * x + y * y + z * z) || 1;
  x /= len;
  y /= len;
  z /= len;
  return [x, y, z];
}

/* ------------------------------------------------------------------ */
/*  Procedural geometry builders                                       */
/* ------------------------------------------------------------------ */

function buildMolarGeometry(T: ThreeModule): BufferGeometry {
  const points: InstanceType<typeof Vector2>[] = [];
  const profile: [number, number][] = [
    [0, -0.5],
    [0.08, -0.45],
    [0.12, -0.3],
    [0.06, -0.15],
    [0.04, -0.05],
    [0.2, 0.05],
    [0.28, 0.15],
    [0.3, 0.25],
    [0.25, 0.35],
    [0.3, 0.42],
    [0.22, 0.48],
    [0.15, 0.5],
    [0, 0.5],
  ];
  for (const [x, y] of profile) {
    points.push(new T.Vector2(x, y));
  }
  const geo = new T.LatheGeometry(points, 24);
  geo.scale(0.4, 0.4, 0.4);
  geo.computeVertexNormals();
  return geo;
}

function buildToothbrushGeometry(T: ThreeModule): BufferGeometry {
  const handle = new T.BoxGeometry(0.06, 0.5, 0.04, 1, 4, 1);
  handle.translate(0, -0.15, 0);

  const head = new T.BoxGeometry(0.12, 0.18, 0.03, 1, 1, 1);
  head.translate(0, 0.19, 0);

  const bristleGroup: BufferGeometry[] = [];
  const rows = 4;
  const cols = 3;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bristle = new T.CylinderGeometry(0.005, 0.005, 0.06, 4);
      bristle.translate(
        -0.04 + c * 0.04,
        0.24 + r * 0.035,
        0.04
      );
      bristleGroup.push(bristle);
    }
  }

  const allGeos = [handle, head, ...bristleGroup];
  const merged = mergeGeometries(T, allGeos);
  for (const g of allGeos) g.dispose();
  merged.scale(0.7, 0.7, 0.7);
  merged.computeVertexNormals();
  return merged;
}

function buildDentalMirrorGeometry(T: ThreeModule): BufferGeometry {
  const mirrorFace = new T.CircleGeometry(0.15, 24);
  mirrorFace.rotateX(Math.PI * 0.5);
  mirrorFace.translate(0, 0.35, 0);

  const handleGeo = new T.CylinderGeometry(0.02, 0.025, 0.5, 8);
  handleGeo.translate(0, 0.05, 0);

  const neckGeo = new T.CylinderGeometry(0.015, 0.02, 0.1, 8);
  neckGeo.rotateZ(0.2);
  neckGeo.translate(0.01, 0.32, 0);

  const allGeos = [mirrorFace, handleGeo, neckGeo];
  const merged = mergeGeometries(T, allGeos);
  for (const g of allGeos) g.dispose();
  merged.scale(0.65, 0.65, 0.65);
  merged.computeVertexNormals();
  return merged;
}

function buildImplantGeometry(T: ThreeModule): BufferGeometry {
  const screwBody = new T.CylinderGeometry(0.08, 0.06, 0.35, 16, 20);

  // Apply screw threads by displacing vertices
  const posAttr = screwBody.getAttribute('position') as BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const angle = Math.atan2(z, x);
    const threadDisp = Math.sin(y * 30 + angle) * 0.008;
    const dist = Math.sqrt(x * x + z * z);
    if (dist > 0.01) {
      const factor = (dist + threadDisp) / dist;
      posAttr.setX(i, x * factor);
      posAttr.setZ(i, z * factor);
    }
  }
  posAttr.needsUpdate = true;
  screwBody.translate(0, -0.1, 0);

  const abutment = new T.CylinderGeometry(0.05, 0.07, 0.1, 12);
  abutment.translate(0, 0.12, 0);

  const crown = new T.SphereGeometry(0.09, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
  crown.translate(0, 0.22, 0);

  const allGeos = [screwBody, abutment, crown];
  const merged = mergeGeometries(T, allGeos);
  for (const g of allGeos) g.dispose();
  merged.scale(0.65, 0.65, 0.65);
  merged.computeVertexNormals();
  return merged;
}

/** Fallback manual merge when BufferGeometryUtils is unavailable. */
function mergeGeometries(T: ThreeModule, geometries: BufferGeometry[]): BufferGeometry {
  let totalVerts = 0;
  let totalIdx = 0;
  for (const g of geometries) {
    totalVerts += (g.getAttribute('position') as BufferAttribute).count;
    if (g.index) totalIdx += g.index.count;
    else totalIdx += (g.getAttribute('position') as BufferAttribute).count;
  }

  const pos = new Float32Array(totalVerts * 3);
  const norm = new Float32Array(totalVerts * 3);
  const idx = new Uint32Array(totalIdx);

  let vertOffset = 0;
  let idxOffset = 0;

  for (const g of geometries) {
    const gPos = g.getAttribute('position') as BufferAttribute;
    const gNorm = g.getAttribute('normal') as BufferAttribute | null;
    const count = gPos.count;

    for (let i = 0; i < count; i++) {
      pos[(vertOffset + i) * 3] = gPos.getX(i);
      pos[(vertOffset + i) * 3 + 1] = gPos.getY(i);
      pos[(vertOffset + i) * 3 + 2] = gPos.getZ(i);
      if (gNorm) {
        norm[(vertOffset + i) * 3] = gNorm.getX(i);
        norm[(vertOffset + i) * 3 + 1] = gNorm.getY(i);
        norm[(vertOffset + i) * 3 + 2] = gNorm.getZ(i);
      }
    }

    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        idx[idxOffset + i] = g.index.array[i] + vertOffset;
      }
      idxOffset += g.index.count;
    } else {
      for (let i = 0; i < count; i++) {
        idx[idxOffset + i] = vertOffset + i;
      }
      idxOffset += count;
    }

    vertOffset += count;
  }

  const merged = new T.BufferGeometry();
  merged.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  merged.setAttribute('normal', new T.Float32BufferAttribute(norm, 3));
  merged.setIndex(Array.from(idx));
  return merged;
}

/* ------------------------------------------------------------------ */
/*  Texture generators                                                 */
/* ------------------------------------------------------------------ */

function createGradientTexture(T: ThreeModule): DataTexture {
  const height = 256;
  const data = new Uint8Array(4 * height);
  const bottom = hexToRgb(0x031a20);
  const top = hexToRgb(0x06323c);

  for (let i = 0; i < height; i++) {
    const t = i / (height - 1);
    const idx = i * 4;
    data[idx] = Math.round((bottom[0] + (top[0] - bottom[0]) * t) * 255);
    data[idx + 1] = Math.round((bottom[1] + (top[1] - bottom[1]) * t) * 255);
    data[idx + 2] = Math.round((bottom[2] + (top[2] - bottom[2]) * t) * 255);
    data[idx + 3] = 255;
  }

  const tex = new T.DataTexture(data, 1, height, T.RGBAFormat, T.UnsignedByteType);
  tex.needsUpdate = true;
  return tex;
}

function createFlareTexture(): HTMLCanvasElement {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.2, 'rgba(200,255,255,0.8)');
  grad.addColorStop(0.5, 'rgba(0,229,255,0.3)');
  grad.addColorStop(1, 'rgba(0,229,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

function createSparkleTexture(): HTMLCanvasElement {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(0,229,255,0.6)');
  grad.addColorStop(1, 'rgba(0,229,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

function createGlitchCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const w = 80;
  const h = 60;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  fillGlitchPattern(ctx, w, h);
  return { canvas, ctx };
}

function fillGlitchPattern(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0, 20, 30, 0.8)';
  ctx.fillRect(0, 0, w, h);

  const blockCount = 8 + Math.floor(Math.random() * 12);
  for (let i = 0; i < blockCount; i++) {
    const bx = Math.floor(Math.random() * w);
    const by = Math.floor(Math.random() * h);
    const bw = 3 + Math.floor(Math.random() * 15);
    const bh = 2 + Math.floor(Math.random() * 8);
    const isCyan = Math.random() > 0.4;
    if (isCyan) {
      const alpha = 0.3 + Math.random() * 0.7;
      ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
    } else {
      const alpha = 0.2 + Math.random() * 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    }
    ctx.fillRect(bx, by, bw, bh);
  }

  // Scanlines
  for (let row = 0; row < h; row += 3) {
    ctx.fillStyle = 'rgba(0, 229, 255, 0.05)';
    ctx.fillRect(0, row, w, 1);
  }
}

/* ------------------------------------------------------------------ */
/*  Environment map helper                                             */
/* ------------------------------------------------------------------ */

function createEnvironmentMap(T: ThreeModule, renderer: WebGLRenderer): Texture {
  const pmrem = new T.PMREMGenerator(renderer) as InstanceType<typeof PMREMGeneratorType>;
  const envScene = new T.Scene();

  const light1 = new T.DirectionalLight(0x00e5ff, 2);
  light1.position.set(5, 5, 5);
  envScene.add(light1);

  const light2 = new T.DirectionalLight(0x80ffff, 1);
  light2.position.set(-3, 2, -5);
  envScene.add(light2);

  const light3 = new T.AmbientLight(0x0a2030, 1.5);
  envScene.add(light3);

  const hemi = new T.HemisphereLight(0x06323c, 0x031a20, 1);
  envScene.add(hemi);

  const envTex = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();

  // Dispose temp scene objects
  envScene.traverse((obj: Object3D) => {
    const m = obj as Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      if (Array.isArray(m.material)) {
        m.material.forEach((mat) => mat.dispose());
      } else {
        m.material.dispose();
      }
    }
  });

  return envTex;
}

/* ------------------------------------------------------------------ */
/*  Main init                                                          */
/* ------------------------------------------------------------------ */

export async function initScene(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
): Promise<SceneController> {
  // Dynamic import – single await for the whole library
  const T = (await import('three')) as ThreeModule;

  /* ------ state --------------------------------------------------- */
  let energy = 0;
  let mouseNdcX = 0;
  let mouseNdcY = 0;
  let prevMouseNdcX = 0;
  let prevMouseNdcY = 0;
  let animFrameId: number | null = null;
  let disposed = false;
  let paused = false;
  let reducedMotion = false;
  let reducedMotionRendered = false;
  let scrollY = 0;
  let scrollBoost = 0;
  let clickSpinMomentum = 0;
  let flareFlash = 0;
  let cursor3D = new T.Vector3(0, 0, 0);
  const shockwaves: Shockwave[] = [];

  /* ------ renderer ------------------------------------------------ */
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const maxRatio = Math.min(window.devicePixelRatio, PIXEL_RATIO_CAP);
  renderer.setPixelRatio(maxRatio);
  renderer.setSize(container.clientWidth, container.clientHeight, false);

  /* ------ scene --------------------------------------------------- */
  const scene = new T.Scene();
  const bgTex = createGradientTexture(T);
  scene.background = bgTex;
  scene.fog = new T.FogExp2(0x031a20, 0.012) as FogExp2;

  /* ------ environment --------------------------------------------- */
  const envMap = createEnvironmentMap(T, renderer);
  scene.environment = envMap;

  /* ------ camera -------------------------------------------------- */
  const aspect = container.clientWidth / container.clientHeight;
  const camera = new T.PerspectiveCamera(50, aspect, 0.1, 100);
  camera.position.set(0, 0, 8);

  const cameraBasePos = new T.Vector3(0, 0, 8);
  const cameraTarget = new T.Vector3(0, 0, 8);

  /* ------ raycaster & plane for cursor projection ----------------- */
  const raycaster = new T.Raycaster();
  const cursorPlane = new T.Plane(new T.Vector3(0, 0, 1), 0);
  const ndcVec = new T.Vector2(0, 0);

  /* ------ lights -------------------------------------------------- */
  const ambientLight = new T.AmbientLight(0x1a3a4a, 0.6);
  scene.add(ambientLight);

  const dirLight = new T.DirectionalLight(0x80e0ff, 0.8);
  dirLight.position.set(5, 8, 10);
  scene.add(dirLight);

  const cursorLight = new T.PointLight(0x00e5ff, 0, 10);
  cursorLight.position.set(0, 0, 2);
  scene.add(cursorLight);

  /* ------ procedural geometries ----------------------------------- */
  const molarGeo = buildMolarGeometry(T);
  const toothbrushGeo = buildToothbrushGeometry(T);
  const mirrorGeo = buildDentalMirrorGeometry(T);
  const implantGeo = buildImplantGeometry(T);
  const geometries = [molarGeo, toothbrushGeo, mirrorGeo, implantGeo];

  /* ------ swarm material ------------------------------------------ */
  const swarmMat = new T.MeshPhysicalMaterial({
    color: 0xd0e8ef,
    metalness: 0.3,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.5,
  });

  /* ------ swarm instanced meshes ---------------------------------- */
  const instancedMeshes: InstancedMesh[] = [];
  const instanceDataArrays: InstanceData[][] = [];
  const dummy = new T.Object3D();

  const typeCounts = [INSTANCES_PER_TYPE, INSTANCES_PER_TYPE, INSTANCES_PER_TYPE, SWARM_COUNT - INSTANCES_PER_TYPE * 3];

  for (let typeIdx = 0; typeIdx < 4; typeIdx++) {
    const count = typeCounts[typeIdx];
    const instMesh = new T.InstancedMesh(geometries[typeIdx], swarmMat, count);
    instMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    instMesh.frustumCulled = false;

    const dataArr: InstanceData[] = [];
    for (let i = 0; i < count; i++) {
      const [axX, axY, axZ] = normalizeAxis();
      const data: InstanceData = {
        px: randomInRange(-12, 12),
        py: randomInRange(-8, 8),
        pz: randomInRange(SPAWN_Z_MIN, SPAWN_Z_MAX),
        rx: Math.random() * Math.PI * 2,
        ry: Math.random() * Math.PI * 2,
        rz: Math.random() * Math.PI * 2,
        raxisX: axX,
        raxisY: axY,
        raxisZ: axZ,
        rotSpeed: randomInRange(0.3, 1.5),
        baseSpeed: randomInRange(0.02, 0.08),
        scale: randomInRange(0.6, 1.4),
      };
      dataArr.push(data);

      dummy.position.set(data.px, data.py, data.pz);
      dummy.rotation.set(data.rx, data.ry, data.rz);
      dummy.scale.setScalar(data.scale);
      dummy.updateMatrix();
      instMesh.setMatrixAt(i, dummy.matrix);
    }

    instMesh.instanceMatrix.needsUpdate = true;
    instanceDataArrays.push(dataArr);
    instancedMeshes.push(instMesh);
    scene.add(instMesh);
  }

  /* ------ hero molar ---------------------------------------------- */
  const heroMolarGeo = buildMolarGeometry(T);
  const heroMolarMat = new T.MeshPhysicalMaterial({
    color: 0xe8f4f8,
    metalness: 0.3,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.5,
  });
  const heroMolar = new T.Mesh(heroMolarGeo, heroMolarMat) as Mesh;
  heroMolar.scale.setScalar(2.5 / 0.4); // undo the 0.4 scale in geo, then apply 2.5
  heroMolar.position.set(HERO_POS[0], HERO_POS[1], HERO_POS[2]);
  scene.add(heroMolar);

  let heroRotX = 0;
  let heroRotY = 0;
  let heroSpinVel = 0;

  /* ------ cyan ring around hero molar ----------------------------- */
  const ringGeo = new T.RingGeometry(1.6, 1.75, 48);
  const ringMat = new T.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.35,
    side: T.DoubleSide,
    depthWrite: false,
  });
  const cyanRing = new T.Mesh(ringGeo, ringMat) as Mesh;
  cyanRing.position.set(HERO_POS[0], HERO_POS[1], HERO_POS[2] + 0.05);
  scene.add(cyanRing);

  /* ------ lens flare sprites -------------------------------------- */
  const flareCanvas = createFlareTexture();
  const flareTex = new T.CanvasTexture(flareCanvas) as Texture;
  const flares: Sprite[] = [];
  const flareParentIndices: { typeIdx: number; instanceIdx: number }[] = [];

  for (let i = 0; i < FLARE_COUNT; i++) {
    const spriteMat = new T.SpriteMaterial({
      map: flareTex,
      transparent: true,
      opacity: 0,
      blending: T.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new T.Sprite(spriteMat) as Sprite;
    sprite.scale.setScalar(randomInRange(0.15, 0.45));
    scene.add(sprite);
    flares.push(sprite);

    // Attach to a random swarm instance
    const tIdx = Math.floor(Math.random() * 4);
    const iIdx = Math.floor(Math.random() * typeCounts[tIdx]);
    flareParentIndices.push({ typeIdx: tIdx, instanceIdx: iIdx });
  }

  /* ------ scan tiles ---------------------------------------------- */
  const scanTiles: ScanTile[] = [];
  const scanPositions: [number, number, number][] = [
    [-5.5, 3.0, -6],
    [6.0, -4.0, -8],
    [-3.0, -5.5, -5],
    [7.5, 2.5, -10],
    [-7.0, -1.0, -7],
  ];

  for (let i = 0; i < SCAN_TILE_COUNT; i++) {
    const { canvas: glitchCanvas, ctx: glitchCtx } = createGlitchCanvas();
    const glitchTex = new T.CanvasTexture(glitchCanvas) as Texture;
    glitchTex.needsUpdate = true;

    const planeMat = new T.MeshBasicMaterial({
      map: glitchTex,
      transparent: true,
      opacity: 0.55,
      side: T.DoubleSide,
      depthWrite: false,
    });
    const planeGeo = new T.PlaneGeometry(0.8, 0.6);
    const planeMesh = new T.Mesh(planeGeo, planeMat) as Mesh;
    const [sx, sy, sz] = scanPositions[i];
    planeMesh.position.set(sx, sy, sz);
    planeMesh.lookAt(camera.position);
    scene.add(planeMesh);

    // Wireframe outline
    const edgesGeo = new T.EdgesGeometry(planeGeo);
    const lineMat = new T.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.6,
    });
    const lineSegs = new T.LineSegments(edgesGeo, lineMat) as LineSegments;
    lineSegs.position.copy(planeMesh.position);
    lineSegs.rotation.copy(planeMesh.rotation);
    scene.add(lineSegs);

    scanTiles.push({
      mesh: planeMesh,
      outline: lineSegs,
      canvas: glitchCanvas,
      ctx: glitchCtx,
      texture: glitchTex,
      flickerTimer: Math.random() * 100,
      baseOpacity: 0.4 + Math.random() * 0.3,
    });
  }

  /* ------ sparkle trail (cursor particles) ------------------------ */
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  const particleColors = new Float32Array(PARTICLE_COUNT * 3);
  const particleSizes = new Float32Array(PARTICLE_COUNT);
  const particles: Particle[] = [];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: 0, y: 0, z: -50,
      vx: 0, vy: 0, vz: 0,
      life: 0, maxLife: 1,
      r: 0, g: 0.9, b: 1,
    });
    particlePositions[i * 3] = 0;
    particlePositions[i * 3 + 1] = 0;
    particlePositions[i * 3 + 2] = -50;
    particleColors[i * 3] = 0;
    particleColors[i * 3 + 1] = 0.9;
    particleColors[i * 3 + 2] = 1;
    particleSizes[i] = 0;
  }

  const sparkleCanvas = createSparkleTexture();
  const sparkleTex = new T.CanvasTexture(sparkleCanvas) as Texture;

  const particleGeo = new T.BufferGeometry();
  particleGeo.setAttribute('position', new T.Float32BufferAttribute(particlePositions, 3));
  particleGeo.setAttribute('color', new T.Float32BufferAttribute(particleColors, 3));
  particleGeo.setAttribute('size', new T.Float32BufferAttribute(particleSizes, 1));

  const particleMat = new T.PointsMaterial({
    size: 0.12,
    map: sparkleTex,
    transparent: true,
    vertexColors: true,
    blending: T.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const particleSystem = new T.Points(particleGeo, particleMat) as Points;
  particleSystem.frustumCulled = false;
  scene.add(particleSystem);

  let nextParticleIdx = 0;

  /* ------ ResizeObserver ------------------------------------------ */
  const resizeObserver = new ResizeObserver(() => {
    if (disposed) return;
    handleResize();
  });
  resizeObserver.observe(container);

  function handleResize(): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);

    // If in reduced motion, re-render the single frame
    if (reducedMotion) {
      renderer.render(scene, camera);
    }
  }

  /* ------ projection helper --------------------------------------- */
  function projectCursorTo3D(nx: number, ny: number): void {
    ndcVec.set(nx, ny);
    raycaster.setFromCamera(ndcVec, camera);
    const target = new T.Vector3();
    raycaster.ray.intersectPlane(cursorPlane, target);
    if (target) {
      cursor3D.copy(target);
    }
  }

  /* ------ spawn particles ----------------------------------------- */
  function spawnParticle(cx: number, cy: number, cz: number): void {
    const p = particles[nextParticleIdx];
    p.x = cx + (Math.random() - 0.5) * 0.15;
    p.y = cy + (Math.random() - 0.5) * 0.15;
    p.z = cz + (Math.random() - 0.5) * 0.15;
    p.vx = (Math.random() - 0.5) * 0.04;
    p.vy = (Math.random() - 0.5) * 0.04 + 0.01;
    p.vz = (Math.random() - 0.5) * 0.02;
    p.life = 1.0;
    p.maxLife = 0.5 + Math.random() * 0.8;
    const isCyan = Math.random() > 0.3;
    if (isCyan) {
      p.r = 0;
      p.g = 0.85 + Math.random() * 0.15;
      p.b = 1;
    } else {
      p.r = 0.9 + Math.random() * 0.1;
      p.g = 0.95 + Math.random() * 0.05;
      p.b = 1;
    }
    nextParticleIdx = (nextParticleIdx + 1) % PARTICLE_COUNT;
  }

  /* ------ create shockwave ---------------------------------------- */
  function createShockwave(x: number, y: number, z: number): void {
    const swGeo = new T.RingGeometry(0.1, 0.25, 32);
    const swMat = new T.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.8,
      side: T.DoubleSide,
      depthWrite: false,
    });
    const swMesh = new T.Mesh(swGeo, swMat) as Mesh;
    swMesh.position.set(x, y, z);
    swMesh.lookAt(camera.position);
    scene.add(swMesh);
    shockwaves.push({ mesh: swMesh, progress: 0, active: true });
  }

  /* ------ animation loop ------------------------------------------ */
  function tick(): void {
    if (disposed) return;
    if (paused) {
      animFrameId = null;
      return;
    }

    if (reducedMotion) {
      if (!reducedMotionRendered) {
        renderer.render(scene, camera);
        reducedMotionRendered = true;
      }
      animFrameId = null;
      return;
    }

    // Calculate mouse speed & update energy
    const dx = mouseNdcX - prevMouseNdcX;
    const dy = mouseNdcY - prevMouseNdcY;
    const speed = Math.sqrt(dx * dx + dy * dy);
    energy += speed * 4;
    if (energy > ENERGY_CAP) energy = ENERGY_CAP;
    prevMouseNdcX = mouseNdcX;
    prevMouseNdcY = mouseNdcY;

    // Scroll boost
    scrollBoost *= 0.94;
    const effectiveEnergy = Math.min(energy + scrollBoost, ENERGY_CAP);

    // Skip if no energy
    if (effectiveEnergy < ENERGY_MIN) {
      energy = 0;
      animFrameId = null;
      return;
    }

    // Decay
    energy *= ENERGY_DECAY;

    // Project cursor to 3D
    projectCursorTo3D(mouseNdcX, mouseNdcY);

    // --- Cursor light ---
    cursorLight.position.set(cursor3D.x, cursor3D.y, cursor3D.z + 1);
    cursorLight.intensity = effectiveEnergy * 2;

    // --- Camera sway ---
    cameraTarget.set(
      cameraBasePos.x + mouseNdcX * 0.6 * effectiveEnergy,
      cameraBasePos.y + mouseNdcY * 0.3 * effectiveEnergy,
      cameraBasePos.z,
    );
    camera.position.x = T.MathUtils.lerp(camera.position.x, cameraTarget.x, 0.05);
    camera.position.y = T.MathUtils.lerp(camera.position.y, cameraTarget.y, 0.05);
    camera.rotation.z = T.MathUtils.lerp(camera.rotation.z, scrollBoost * 0.02, 0.05);

    // --- Hero molar ---
    const heroTargetRotX = -mouseNdcY * 0.25 * effectiveEnergy;
    const heroTargetRotY = mouseNdcX * 0.25 * effectiveEnergy;
    heroRotX = T.MathUtils.lerp(heroRotX, heroTargetRotX, 0.04);
    heroRotY = T.MathUtils.lerp(heroRotY, heroTargetRotY, 0.04);
    clickSpinMomentum *= 0.96;
    heroMolar.rotation.set(heroRotX, heroRotY + clickSpinMomentum, 0);

    // --- Cyan ring pulse ---
    const ringOpacity = 0.2 + effectiveEnergy * 0.35;
    (ringMat as MeshBasicMaterial).opacity = ringOpacity;
    cyanRing.rotation.z += effectiveEnergy * 0.005;

    // --- Swarm update ---
    const flowSpeed = effectiveEnergy * (1 + scrollBoost * 3);
    const heroVec = new T.Vector3(HERO_POS[0], HERO_POS[1], HERO_POS[2]);

    for (let typeIdx = 0; typeIdx < 4; typeIdx++) {
      const instMesh = instancedMeshes[typeIdx];
      const dataArr = instanceDataArrays[typeIdx];
      const count = dataArr.length;

      for (let i = 0; i < count; i++) {
        const d = dataArr[i];

        // Flow toward camera (positive z)
        d.pz += d.baseSpeed * flowSpeed;

        // Respawn
        if (d.pz > SPAWN_Z_MAX) {
          d.pz = SPAWN_Z_MIN;
          d.px = randomInRange(-12, 12);
          d.py = randomInRange(-8, 8);
        }

        // Tumbling
        const angularSpeed = d.rotSpeed * effectiveEnergy * 0.04;
        d.rx += d.raxisX * angularSpeed;
        d.ry += d.raxisY * angularSpeed;
        d.rz += d.raxisZ * angularSpeed;

        // Exclusion zone around hero molar
        const dhx = d.px - HERO_POS[0];
        const dhy = d.py - HERO_POS[1];
        const dhz = d.pz - HERO_POS[2];
        const distHero = Math.sqrt(dhx * dhx + dhy * dhy + dhz * dhz);
        if (distHero < EXCLUSION_RADIUS && distHero > 0.01) {
          const pushForce = (EXCLUSION_RADIUS - distHero) * 0.02;
          d.px += (dhx / distHero) * pushForce;
          d.py += (dhy / distHero) * pushForce;
          d.pz += (dhz / distHero) * pushForce;
        }

        // Repel from cursor
        const dcx = d.px - cursor3D.x;
        const dcy = d.py - cursor3D.y;
        const dcz = d.pz - cursor3D.z;
        const distCursor = Math.sqrt(dcx * dcx + dcy * dcy + dcz * dcz);
        if (distCursor < REPEL_RADIUS && distCursor > 0.01) {
          const repelForce = (REPEL_RADIUS - distCursor) * 0.04 * effectiveEnergy;
          d.px += (dcx / distCursor) * repelForce;
          d.py += (dcy / distCursor) * repelForce;
          d.pz += (dcz / distCursor) * repelForce;
        }

        // Update instance matrix
        dummy.position.set(d.px, d.py, d.pz);
        dummy.rotation.set(d.rx, d.ry, d.rz);
        dummy.scale.setScalar(d.scale);
        dummy.updateMatrix();
        instMesh.setMatrixAt(i, dummy.matrix);
      }

      instMesh.instanceMatrix.needsUpdate = true;
    }

    // --- Flares ---
    flareFlash *= 0.9;
    const tempMat = new T.Matrix4();
    const tempPos = new T.Vector3();
    for (let i = 0; i < FLARE_COUNT; i++) {
      const { typeIdx, instanceIdx } = flareParentIndices[i];
      instancedMeshes[typeIdx].getMatrixAt(instanceIdx, tempMat);
      tempPos.setFromMatrixPosition(tempMat);
      flares[i].position.copy(tempPos);
      const flareOpacity = Math.max(effectiveEnergy * 0.4, flareFlash);
      (flares[i].material as SpriteMaterial).opacity = T.MathUtils.clamp(flareOpacity, 0, 1);
    }

    // --- Scan tiles glitch ---
    for (const tile of scanTiles) {
      tile.flickerTimer += effectiveEnergy;

      if (effectiveEnergy > 0.1 && tile.flickerTimer > 3) {
        tile.flickerTimer = 0;
        fillGlitchPattern(tile.ctx, tile.canvas.width, tile.canvas.height);
        tile.texture.needsUpdate = true;
      }

      const flickerOp = tile.baseOpacity + Math.sin(tile.flickerTimer * 0.5) * 0.15 * effectiveEnergy;
      (tile.mesh.material as MeshBasicMaterial).opacity = T.MathUtils.clamp(flickerOp, 0, 1);
      (tile.outline.material as LineBasicMaterial).opacity = T.MathUtils.clamp(flickerOp + 0.1, 0, 1);
    }

    // --- Sparkle trail ---
    if (effectiveEnergy > 0.05) {
      const spawnCount = Math.ceil(effectiveEnergy * 5);
      for (let s = 0; s < spawnCount; s++) {
        spawnParticle(cursor3D.x, cursor3D.y, cursor3D.z);
      }
    }

    const posArr = particleGeo.getAttribute('position') as BufferAttribute;
    const colArr = particleGeo.getAttribute('color') as BufferAttribute;
    const sizeArr = particleGeo.getAttribute('size') as BufferAttribute;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i];
      if (p.life > 0) {
        p.life -= 0.016 / p.maxLife;
        p.x += p.vx;
        p.y += p.vy - 0.001; // slight gravity
        p.z += p.vz;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.vz *= 0.98;

        const alpha = Math.max(p.life, 0);
        posArr.setXYZ(i, p.x, p.y, p.z);
        colArr.setXYZ(i, p.r * alpha, p.g * alpha, p.b * alpha);
        sizeArr.setX(i, alpha * 0.12);
      } else {
        posArr.setXYZ(i, 0, 0, -50);
        sizeArr.setX(i, 0);
      }
    }
    posArr.needsUpdate = true;
    colArr.needsUpdate = true;
    sizeArr.needsUpdate = true;

    // --- Shockwaves ---
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      if (!sw.active) continue;
      sw.progress += effectiveEnergy * 0.05;
      const scale = 1 + sw.progress * 15;
      sw.mesh.scale.setScalar(scale);
      const op = 1 - sw.progress;
      (sw.mesh.material as MeshBasicMaterial).opacity = Math.max(op, 0);

      if (sw.progress >= 1) {
        sw.active = false;
        scene.remove(sw.mesh);
        (sw.mesh.geometry as BufferGeometry).dispose();
        (sw.mesh.material as MeshBasicMaterial).dispose();
        shockwaves.splice(i, 1);
      }
    }

    // --- Render ---
    renderer.render(scene, camera);

    // Schedule next frame
    animFrameId = requestAnimationFrame(tick);
  }

  /* ------ start loop (initially idle — no energy) ----------------- */
  function ensureAnimating(): void {
    if (animFrameId === null && !disposed && !paused && !reducedMotion) {
      animFrameId = requestAnimationFrame(tick);
    }
  }

  // Render a single initial frame so the scene is not blank
  renderer.render(scene, camera);

  /* ------ controller ---------------------------------------------- */
  const controller: SceneController = {
    onMouseMove(x: number, y: number): void {
      if (disposed) return;
      mouseNdcX = x;
      mouseNdcY = y;
      // Inject a bit of energy on move
      const dx2 = x - prevMouseNdcX;
      const dy2 = y - prevMouseNdcY;
      const sp = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      energy = Math.min(energy + sp * 3, ENERGY_CAP);
      ensureAnimating();
    },

    onScroll(sy: number): void {
      if (disposed) return;
      const delta = Math.abs(sy - scrollY);
      scrollY = sy;
      scrollBoost = Math.min(scrollBoost + delta * 0.002, 0.5);
      energy = Math.min(energy + delta * 0.001, ENERGY_CAP);
      ensureAnimating();
    },

    onClick(x: number, y: number): void {
      if (disposed) return;
      // Project click to 3D
      ndcVec.set(x, y);
      raycaster.setFromCamera(ndcVec, camera);
      const clickPos = new T.Vector3();
      raycaster.ray.intersectPlane(cursorPlane, clickPos);
      if (clickPos) {
        createShockwave(clickPos.x, clickPos.y, clickPos.z);
      }

      // Hero spin boost
      clickSpinMomentum += 0.5;

      // Flash flares
      flareFlash = 1.0;

      // Inject energy
      energy = Math.min(energy + 0.4, ENERGY_CAP);
      ensureAnimating();
    },

    setReducedMotion(value: boolean): void {
      reducedMotion = value;
      if (value) {
        reducedMotionRendered = false;
        if (animFrameId !== null) {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
        // Render one frame
        renderer.render(scene, camera);
        reducedMotionRendered = true;
      } else {
        ensureAnimating();
      }
    },

    pause(): void {
      paused = true;
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    },

    resume(): void {
      paused = false;
      if (!reducedMotion) {
        ensureAnimating();
      }
    },

    resize(): void {
      handleResize();
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;

      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }

      resizeObserver.disconnect();

      // Dispose shockwaves
      for (const sw of shockwaves) {
        if (sw.active) {
          scene.remove(sw.mesh);
          (sw.mesh.geometry as BufferGeometry).dispose();
          (sw.mesh.material as MeshBasicMaterial).dispose();
        }
      }
      shockwaves.length = 0;

      // Dispose scan tile canvases
      for (const tile of scanTiles) {
        tile.texture.dispose();
      }

      // Dispose flare texture
      flareTex.dispose();
      sparkleTex.dispose();

      // Traverse and dispose all scene objects
      scene.traverse((obj: Object3D) => {
        const m = obj as Mesh;
        if (m.geometry) {
          m.geometry.dispose();
        }
        if (m.material) {
          if (Array.isArray(m.material)) {
            for (const mat of m.material) {
              disposeMaterial(mat);
            }
          } else {
            disposeMaterial(m.material);
          }
        }
      });

      // Dispose background and environment
      bgTex.dispose();
      envMap.dispose();

      renderer.dispose();
    },
  };

  function disposeMaterial(mat: Material): void {
    const withMaps = mat as { map?: Texture | null; envMap?: Texture | null };
    if (withMaps.map) withMaps.map.dispose();
    if (withMaps.envMap) withMaps.envMap.dispose();
    mat.dispose();
  }

  return controller;
}
