import * as THREE from 'three';

export type RopeLayout = {
  unit: number; viewHeight: number; heroHeight: number; rootTop: number;
  aboutStart: number; aboutEnd: number; headingPageY: number; version: number;
  sceneHeight?: number;
};
export type RopeUpdate = { phase: number; progress: number; amplitude: number; layout: RopeLayout };
const TAU = Math.PI * 2;
const smooth = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

/** Fixed anchor, physical arc-length sampling and a fixed-size reusable buffer. */
export class RopeGeometry {
  readonly geometry = new THREE.BufferGeometry();
  readonly mobile: boolean;
  readonly anchor: THREE.Vector3;
  readonly radius: number;
  readonly step: number;
  readonly segments: number;
  readonly radial: number;
  readonly samples = 720;
  readonly maxDepth = 26;
  readonly centers: THREE.Vector3[];
  readonly curve: THREE.Vector3[];
  readonly cumulative: Float32Array;
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly uvs: Float32Array;
  private readonly indices: Uint32Array;
  private readonly template: Uint32Array;
  private readonly cos: Float32Array;
  private readonly sin: Float32Array;
  private readonly radii: Float32Array;
  private readonly crossNormals: Float32Array;
  private profileX = 0;
  private profileY = 0;
  private profileZ = 0;
  private readonly tangent = new THREE.Vector3();
  private readonly previous = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly binormal = new THREE.Vector3();
  private readonly axis = new THREE.Vector3();
  private readonly vertexCount: number;
  private active = -1;
  private layoutVersion = -1;
  private baseArc = 0;
  private fullArc = 0;
  visibleLength = 0;
  headingArc = 0;
  readonly end = new THREE.Vector3();

  constructor(mobile: boolean) {
    this.mobile = mobile; this.radius = mobile ? .115 : .18;
    this.anchor = new THREE.Vector3(mobile ? 1.64 : 2.53, 4.15, 0);
    this.step = mobile ? .078 : .06; this.segments = mobile ? 600 : 800; this.radial = mobile ? 32 : 48;
    this.vertexCount = (this.segments + 1) * (this.radial + 1);
    this.positions = new Float32Array((this.vertexCount + 2) * 3);
    this.normals = new Float32Array((this.vertexCount + 2) * 3);
    this.uvs = new Float32Array((this.vertexCount + 2) * 2);
    this.radii = new Float32Array(this.vertexCount);
    this.crossNormals = new Float32Array(this.vertexCount * 3);
    this.cos = new Float32Array(this.radial + 1); this.sin = new Float32Array(this.radial + 1);
    this.centers = Array.from({ length: this.segments + 1 }, () => new THREE.Vector3());
    this.curve = Array.from({ length: this.samples + 1 }, () => new THREE.Vector3());
    this.cumulative = new Float32Array(this.samples + 1);
    const indexList: number[] = [];
    for (let j = 0; j < this.radial; j++) indexList.push(this.vertexCount, j + 1, j);
    for (let i = 0; i <= this.segments; i++) for (let j = 0; j <= this.radial; j++) {
      const vertex = i * (this.radial + 1) + j, angle = j / this.radial * TAU;
      this.cos[j] = Math.cos(angle); this.sin[j] = Math.sin(angle);
      this.radii[vertex] = this.profile(angle, i * this.step);
      this.crossNormals[vertex * 3] = this.profileX; this.crossNormals[vertex * 3 + 1] = this.profileY; this.crossNormals[vertex * 3 + 2] = this.profileZ;
      this.uvs[vertex * 2] = j / this.radial;
      this.uvs[vertex * 2 + 1] = i * this.step / (TAU * this.radius);
      if (i < this.segments && j < this.radial) { const next = vertex + this.radial + 1; indexList.push(vertex, vertex + 1, next, vertex + 1, next + 1, next); }
    }
    // Space after all side indices also accommodates the moving lower cap.
    for (let j = 0; j < this.radial * 3; j++) indexList.push(0);
    this.indices = new Uint32Array(indexList); this.template = this.indices.slice();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setIndex(new THREE.BufferAttribute(this.indices, 1).setUsage(THREE.DynamicDrawUsage));
  }
  private profile(angle: number, arc: number) {
    // Three interlocking helical plies create real deep fiber grooves and a lobed
    // silhouette. The cross-section is a union of round strands, not a smooth pipe.
    const a = this.radius * .5, b = this.radius * .6, twist = arc * TAU / .74;
    let outer = 0, cx = 0, cy = 0;
    for (let ply = 0; ply < 3; ply++) {
      const phi = twist + ply * TAU / 3, difference = angle - phi;
      const projection = a * Math.cos(difference), perpendicular = a * Math.sin(difference);
      const candidate = projection + Math.sqrt(Math.max(0, b * b - perpendicular * perpendicular));
      if (candidate > outer) { outer = candidate; cx = a * Math.cos(phi); cy = a * Math.sin(phi); }
    }
    const nx = (outer * Math.cos(angle) - cx) / b, ny = (outer * Math.sin(angle) - cy) / b;
    const nz = (nx * cy - ny * cx) * TAU / .74, norm = Math.hypot(nx, ny, nz);
    this.profileX = nx / norm; this.profileY = ny / norm; this.profileZ = nz / norm;
    return outer;
  }
  private arcAtDepth(depth: number) {
    const sample = THREE.MathUtils.clamp(depth / this.maxDepth * this.samples, 0, this.samples - .0001), lo = Math.floor(sample);
    return THREE.MathUtils.lerp(this.cumulative[lo], this.cumulative[lo + 1], sample - lo);
  }
  update({ phase, progress, amplitude, layout }: RopeUpdate) {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    const { curve, cumulative, anchor } = this;
    // An anchored centerline of sufficient capacity is sampled independently of visible length.
    // Feeding more rope reveals its continuation; existing centerline portions never relocate.
    for (let i = 0; i <= this.samples; i++) {
      const depth = i / this.samples * this.maxDepth, envelope = smooth(depth, 0, 1.35);
      const wave = depth * 2.05 - phase;
      let x: number;
      if (this.mobile) {
        const pageY = (depth - (anchor.y - .1) + layout.viewHeight * .5) / layout.unit;
        const afterHeroCopy = smooth(pageY, 480, 650);
        const aboutLane = smooth(pageY, layout.aboutStart - 160, layout.aboutStart - 30) * (1 - smooth(pageY, layout.aboutEnd, layout.aboutEnd + 150));
        const openX = .91 * Math.sin(depth * 1.65) + .08 * Math.sin(wave) * amplitude;
        x = THREE.MathUtils.lerp(anchor.x, openX, afterHeroCopy);
        x = THREE.MathUtils.lerp(x, 1.2 + .025 * Math.sin(wave), aboutLane);
      } else x = anchor.x + (1.45 * Math.sin(depth * .98) + .14 * Math.sin(wave) * amplitude) * envelope;
      const y = anchor.y - depth + .025 * Math.sin(wave * .7) * envelope;
      const z = (.4 * Math.sin(depth * .6) + .09 * Math.sin(wave * .6)) * envelope;
      curve[i].set(x, y, z);
      cumulative[i] = i === 0 ? 0 : cumulative[i - 1] + curve[i].distanceTo(curve[i - 1]);
    }
    if (this.layoutVersion !== layout.version) {
      const baseDepth = anchor.y - .1 + layout.viewHeight * .5 - .12;
      this.baseArc = this.arcAtDepth(baseDepth);
      const endDepth = anchor.y - .1 - layout.viewHeight * .5 + (layout.sceneHeight ?? layout.heroHeight * 2) * layout.unit - .35;
      this.fullArc = this.arcAtDepth(endDepth);
      this.layoutVersion = layout.version;
    }
    this.headingArc = this.arcAtDepth(anchor.y - .1 - layout.viewHeight * .5 + layout.headingPageY * layout.unit);
    this.visibleLength = Math.min(THREE.MathUtils.lerp(this.baseArc, this.fullArc, p), (this.segments - 1) * this.step);
    const active = Math.max(2, Math.ceil(this.visibleLength / this.step));
    if (active !== this.active) {
      if (this.active > 0) {
        const old = this.radial * 3 + this.active * this.radial * 6;
        for (let j = 0; j < this.radial * 3; j++) this.indices[old + j] = this.template[old + j];
        for (let j = 0; j <= this.radial; j++) this.uvs[(this.active * (this.radial + 1) + j) * 2 + 1] = this.active * this.step / (TAU * this.radius);
      }
      const cap = this.radial * 3 + active * this.radial * 6;
      for (let j = 0; j < this.radial; j++) { this.indices[cap + j * 3] = this.vertexCount + 1; this.indices[cap + j * 3 + 1] = active * (this.radial + 1) + j; this.indices[cap + j * 3 + 2] = active * (this.radial + 1) + j + 1; }
      this.geometry.index!.needsUpdate = true;
      this.geometry.setDrawRange(0, cap + this.radial * 3); this.active = active;
    }
    let cursor = 1;
    for (let i = 0; i <= active; i++) {
      const distance = Math.min(i * this.step, this.visibleLength);
      while (cursor < this.samples && cumulative[cursor] < distance) cursor++;
      const fraction = (distance - cumulative[cursor - 1]) / Math.max(.000001, cumulative[cursor] - cumulative[cursor - 1]);
      this.centers[i].copy(curve[cursor - 1]).lerp(curve[cursor], fraction);
    }
    this.end.copy(this.centers[active]);
    const { previous, tangent, normal, binormal, axis } = this;
    previous.subVectors(this.centers[1], this.centers[0]).normalize();
    normal.set(0, 0, 1).addScaledVector(previous, -previous.z).normalize();
    for (let i = 0; i <= active; i++) {
      tangent.subVectors(this.centers[Math.min(active, i + 1)], this.centers[Math.max(0, i - 1)]).normalize();
      axis.crossVectors(previous, tangent); const sine = axis.length();
      if (sine > .000001) { axis.multiplyScalar(1 / sine); normal.applyAxisAngle(axis, Math.atan2(sine, THREE.MathUtils.clamp(previous.dot(tangent), -1, 1))); }
      normal.addScaledVector(tangent, -normal.dot(tangent)).normalize(); binormal.crossVectors(tangent, normal).normalize(); previous.copy(tangent);
      const center = this.centers[i];
      for (let j = 0; j <= this.radial; j++) {
        const vertex = i * (this.radial + 1) + j, index = vertex * 3;
        const r = i === active ? this.profile(j / this.radial * TAU, this.visibleLength) : this.radii[vertex];
        const nx = normal.x * this.cos[j] + binormal.x * this.sin[j], ny = normal.y * this.cos[j] + binormal.y * this.sin[j], nz = normal.z * this.cos[j] + binormal.z * this.sin[j];
        this.positions[index] = center.x + nx * r; this.positions[index + 1] = center.y + ny * r; this.positions[index + 2] = center.z + nz * r;
        const tx = i === active ? this.profileX : this.crossNormals[index], ty = i === active ? this.profileY : this.crossNormals[index + 1], tz = i === active ? this.profileZ : this.crossNormals[index + 2];
        this.normals[index] = normal.x * tx + binormal.x * ty + tangent.x * tz;
        this.normals[index + 1] = normal.y * tx + binormal.y * ty + tangent.y * tz;
        this.normals[index + 2] = normal.z * tx + binormal.z * ty + tangent.z * tz;
        if (i === active) this.uvs[vertex * 2 + 1] = this.visibleLength / (TAU * this.radius);
      }
      if (i === 0 || i === active) {
        const index = (this.vertexCount + (i === 0 ? 0 : 1)) * 3, sign = i === 0 ? -1 : 1;
        this.positions[index] = center.x; this.positions[index + 1] = center.y; this.positions[index + 2] = center.z;
        this.normals[index] = tangent.x * sign; this.normals[index + 1] = tangent.y * sign; this.normals[index + 2] = tangent.z * sign;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
    this.geometry.attributes.uv.needsUpdate = true;
  }
  dispose() { this.geometry.dispose(); }
}
