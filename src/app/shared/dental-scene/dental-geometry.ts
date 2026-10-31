import {
  BackSide,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from 'three';

/** Procedural dental geometry and materials shared by the 3D scene. */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/* ------------------------------------------------------------------ geometry */

/** Builds an indexed (cols+1) x (rows+1) grid surface from a flat xyz array. */
export function gridGeometry(positions: Float32Array, cols: number, rows: number): BufferGeometry {
  const indices = new Uint32Array(cols * rows * 6);
  let cursor = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const a = row * (cols + 1) + col + 1;
      const b = row * (cols + 1) + col;
      const c = (row + 1) * (cols + 1) + col;
      const d = (row + 1) * (cols + 1) + col + 1;
      indices[cursor++] = a;
      indices[cursor++] = b;
      indices[cursor++] = d;
      indices[cursor++] = b;
      indices[cursor++] = c;
      indices[cursor++] = d;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  // Make sure faces point away from the middle of the shape, whatever the grid's winding was.
  const position = geometry.getAttribute('position') as BufferAttribute;
  const normal = geometry.getAttribute('normal') as BufferAttribute;
  const centre = new Vector3();
  for (let i = 0; i < position.count; i++) {
    centre.x += position.getX(i);
    centre.y += position.getY(i);
    centre.z += position.getZ(i);
  }
  centre.divideScalar(position.count);
  let outward = 0;
  for (let i = 0; i < position.count; i++) {
    outward +=
      normal.getX(i) * (position.getX(i) - centre.x) +
      normal.getY(i) * (position.getY(i) - centre.y) +
      normal.getZ(i) * (position.getZ(i) - centre.z);
  }
  if (outward < 0) {
    const flipped = geometry.getIndex() as BufferAttribute;
    for (let i = 0; i < flipped.count; i += 3) {
      const second = flipped.getX(i + 1);
      flipped.setX(i + 1, flipped.getX(i + 2));
      flipped.setX(i + 2, second);
    }
    flipped.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  return geometry;
}

/** Averages normals along the wrap-around seam and across pole rows so shading stays seamless. */
export function weldNormals(
  geometry: BufferGeometry,
  cols: number,
  rows: number,
  poleRows: readonly number[],
): void {
  const normal = geometry.getAttribute('normal') as BufferAttribute;
  const sum = new Vector3();
  const next = new Vector3();

  for (let row = 0; row <= rows; row++) {
    const start = row * (cols + 1);
    if (poleRows.includes(row)) {
      sum.set(0, 0, 0);
      for (let col = 0; col <= cols; col++) {
        sum.add(next.fromBufferAttribute(normal, start + col));
      }
      sum.normalize();
      for (let col = 0; col <= cols; col++) {
        normal.setXYZ(start + col, sum.x, sum.y, sum.z);
      }
    } else {
      sum.fromBufferAttribute(normal, start).add(next.fromBufferAttribute(normal, start + cols));
      sum.normalize();
      normal.setXYZ(start, sum.x, sum.y, sum.z);
      normal.setXYZ(start + cols, sum.x, sum.y, sum.z);
    }
  }
  normal.needsUpdate = true;
}

/** Enamel crown: a rounded block with four cusps, a central pit and a warm neck. */
export function buildCrown(cols = 128, rows = 96): BufferGeometry {
  const positions = new Float32Array((cols + 1) * (rows + 1) * 3);
  const colors = new Float32Array((cols + 1) * (rows + 1) * 3);
  const crest = new Color('#ffffff');
  const neck = new Color('#eadfc6');
  const mixed = new Color();

  const bump = (x: number, z: number, cx: number, cz: number): number =>
    Math.exp(-((x - cx) * (x - cx) + (z - cz) * (z - cz)) / 0.16);

  let cursor = 0;
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    for (let col = 0; col <= cols; col++) {
      const u = col / cols;
      const vx = -Math.cos(u * Math.PI * 2) * Math.sin(v * Math.PI);
      const vy = Math.cos(v * Math.PI);
      const vz = Math.sin(u * Math.PI * 2) * Math.sin(v * Math.PI);

      // Super-ellipsoid: pushes a sphere towards a soft cube.
      const sx = Math.sign(vx) * Math.pow(Math.abs(vx), 0.78);
      const sy = Math.sign(vy) * Math.pow(Math.abs(vy), 0.78);
      const sz = Math.sign(vz) * Math.pow(Math.abs(vz), 0.78);

      let x = sx * 1.12;
      let y = sy * 0.82;
      let z = sz * 0.98;

      // Narrow towards the neck.
      const squeeze = 1 - 0.42 * smoothstep(0.05, -0.95, sy);
      x *= squeeze;
      z *= squeeze;

      // Four cusps, a central pit and shallow grooves on the biting surface.
      const upper = smoothstep(0.15, 0.85, sy);
      const cusps =
        bump(x, z, 0.52, 0.42) +
        bump(x, z, -0.52, 0.42) +
        bump(x, z, 0.52, -0.42) +
        bump(x, z, -0.52, -0.42);
      y += upper * 0.14 * cusps;
      y -= upper * 0.2 * Math.exp(-(x * x + z * z) / 0.14);
      y -=
        upper *
        0.06 *
        (Math.exp(-(x * x) / 0.012) * Math.exp(-(z * z) / 1.2) +
          Math.exp(-(z * z) / 0.012) * Math.exp(-(x * x) / 1.2));

      positions[cursor] = x;
      positions[cursor + 1] = y;
      positions[cursor + 2] = z;

      mixed.copy(crest).lerp(neck, smoothstep(0.2, -0.9, sy));
      colors[cursor] = mixed.r;
      colors[cursor + 1] = mixed.g;
      colors[cursor + 2] = mixed.b;
      cursor += 3;
    }
  }

  const geometry = gridGeometry(positions, cols, rows);
  weldNormals(geometry, cols, rows, [0, rows]);
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

/** A tapering, slightly curved root that ends in a rounded tip. */
export function buildRoot(
  cx: number,
  tilt: number,
  bend: number,
  cols = 48,
  rows = 36,
): BufferGeometry {
  const length = 1.45;
  const radius = 0.44;
  const positions = new Float32Array((cols + 1) * (rows + 1) * 3);

  let cursor = 0;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const r = radius * (1 - 0.82 * t) * Math.sqrt(Math.max(0, 1 - Math.pow(t, 7)));
    for (let col = 0; col <= cols; col++) {
      const angle = (col / cols) * Math.PI * 2;
      positions[cursor] = r * Math.cos(angle) + tilt * t + bend * t * t + cx;
      positions[cursor + 1] = -t * length - 0.42;
      positions[cursor + 2] = r * Math.sin(angle) * 0.85;
      cursor += 3;
    }
  }

  const geometry = gridGeometry(positions, cols, rows);
  weldNormals(geometry, cols, rows, [rows]);
  return geometry;
}

/* ----------------------------------------------------------------- materials */

export interface Materials {
  readonly enamel: MeshPhysicalMaterial;
  readonly root: MeshPhysicalMaterial;
  readonly turquoise: MeshPhysicalMaterial;
  readonly white: MeshPhysicalMaterial;
  readonly chrome: MeshPhysicalMaterial;
  readonly mirror: MeshPhysicalMaterial;
  readonly glass: MeshPhysicalMaterial;
}

export function createMaterials(): Materials {
  return {
    enamel: new MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.2,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      sheen: 0.6,
      sheenColor: new Color('#bdeef5'),
      sheenRoughness: 0.45,
    }),
    root: new MeshPhysicalMaterial({
      color: new Color('#e7dab9'),
      roughness: 0.5,
      clearcoat: 0.3,
      clearcoatRoughness: 0.4,
    }),
    turquoise: new MeshPhysicalMaterial({
      color: new Color('#16b4c4'),
      roughness: 0.28,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    }),
    white: new MeshPhysicalMaterial({
      color: new Color('#ffffff'),
      roughness: 0.32,
      clearcoat: 0.7,
      clearcoatRoughness: 0.2,
    }),
    chrome: new MeshPhysicalMaterial({
      color: new Color('#e3f1f4'),
      metalness: 1,
      roughness: 0.16,
    }),
    mirror: new MeshPhysicalMaterial({
      color: new Color('#f4ffff'),
      metalness: 1,
      roughness: 0.03,
    }),
    glass: new MeshPhysicalMaterial({
      color: new Color('#d6fbff'),
      transparent: true,
      opacity: 0.4,
      roughness: 0.04,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.7,
      depthWrite: false,
    }),
  };
}

/* ------------------------------------------------------------------- objects */

export function buildTooth(materials: Materials, crown: BufferGeometry): Group {
  const tooth = new Group();
  tooth.add(new Mesh(crown, materials.enamel));
  tooth.add(new Mesh(buildRoot(-0.36, -0.1, 0.16), materials.root));
  tooth.add(new Mesh(buildRoot(0.36, 0.1, -0.16), materials.root));
  return tooth;
}

export function buildToothbrush(materials: Materials): Group {
  const brush = new Group();

  const handle = new Mesh(new CapsuleGeometry(0.11, 1.5, 8, 24), materials.turquoise);
  handle.scale.set(1, 1, 0.5);
  handle.position.y = -0.55;
  brush.add(handle);

  const neck = new Mesh(new CylinderGeometry(0.06, 0.09, 0.5, 16), materials.turquoise);
  neck.position.y = 0.48;
  brush.add(neck);

  const head = new Mesh(new CapsuleGeometry(0.13, 0.5, 8, 24), materials.white);
  head.scale.set(1, 1, 0.45);
  head.position.y = 0.98;
  brush.add(head);

  const bristleGeometry = new CylinderGeometry(0.014, 0.014, 0.2, 6);
  bristleGeometry.rotateX(Math.PI / 2);
  bristleGeometry.translate(0, 0, 0.1);
  const rows = 7;
  const columns = 3;
  const bristles = new InstancedMesh(bristleGeometry, materials.white, rows * columns);
  const placement = new Matrix4();
  const tint = new Color();
  let index = 0;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      placement.makeTranslation((column - 1) * 0.065, 0.79 + row * 0.063, 0.045);
      bristles.setMatrixAt(index, placement);
      bristles.setColorAt(index, tint.set(row % 2 === 0 ? '#ffffff' : '#7fe3ec'));
      index++;
    }
  }
  bristles.instanceMatrix.needsUpdate = true;
  if (bristles.instanceColor) {
    bristles.instanceColor.needsUpdate = true;
  }
  brush.add(bristles);

  return brush;
}

export function buildMirror(materials: Materials): Group {
  const mirror = new Group();

  const handle = new Mesh(new CylinderGeometry(0.035, 0.05, 1.5, 20), materials.chrome);
  handle.position.y = -0.45;
  mirror.add(handle);

  const collar = new Mesh(new CylinderGeometry(0.06, 0.06, 0.18, 20), materials.turquoise);
  collar.position.y = 0.3;
  mirror.add(collar);

  const ring = new Mesh(new TorusGeometry(0.27, 0.04, 20, 56), materials.chrome);
  ring.position.y = 0.66;
  mirror.add(ring);

  const disc = new Mesh(new CylinderGeometry(0.26, 0.26, 0.02, 56), materials.mirror);
  disc.rotation.x = Math.PI / 2;
  disc.position.y = 0.66;
  mirror.add(disc);

  return mirror;
}

export function createGlintTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    context.translate(size / 2, size / 2);
    const glow = context.createRadialGradient(0, 0, 0, 0, 0, size / 2);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)');
    glow.addColorStop(0.25, 'rgba(190,247,255,0.35)');
    glow.addColorStop(1, 'rgba(190,247,255,0)');
    context.fillStyle = glow;
    context.fillRect(-size / 2, -size / 2, size, size);

    context.fillStyle = '#ffffff';
    context.beginPath();
    context.moveTo(0, -60);
    context.quadraticCurveTo(4, -4, 60, 0);
    context.quadraticCurveTo(4, 4, 0, 60);
    context.quadraticCurveTo(-4, 4, -60, 0);
    context.quadraticCurveTo(-4, -4, 0, -60);
    context.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Soft studio lighting baked into an environment map, so enamel, chrome and glass have something to reflect. */
export function buildEnvironment(): Scene {
  const environment = new Scene();

  const room = new Mesh(
    new BoxGeometry(24, 14, 24),
    new MeshBasicMaterial({ color: new Color('#8fdde8'), side: BackSide }),
  );
  environment.add(room);

  const panel = (width: number, height: number, tint: Color, x: number, y: number, z: number) => {
    const mesh = new Mesh(
      new PlaneGeometry(width, height),
      new MeshBasicMaterial({ color: tint, side: DoubleSide }),
    );
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    environment.add(mesh);
  };

  panel(9, 4, new Color(34, 34, 34), 2, 8, 6);
  panel(4, 8, new Color(22, 26, 28), -9, 1, 4);
  panel(3, 7, new Color(8, 28, 30), 9, 0, -3);
  panel(10, 3, new Color(14, 22, 24), 0, -6, 7);
  return environment;
}

