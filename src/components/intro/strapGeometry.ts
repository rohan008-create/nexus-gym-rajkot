import * as THREE from 'three';

/** Thin solid webbing: separate front, back and edge normals. */
export function createStrap(samples: number, width: number, length: number) {
  const geometry = new THREE.BufferGeometry(), uv = new Float32Array(samples * 16), indices: number[] = [];
  for (let i = 0; i < samples; i++) {
    const v = (1 - i / (samples - 1)) * length / (width * 8);
    uv.set([0, v, 1, v, 1, v, 0, v, 0, v, .03, v, .97, v, 1, v], i * 16);
    if (i < samples - 1) for (let face = 0; face < 4; face++) {
      const k = i * 8 + face * 2; indices.push(k, k + 8, k + 1, k + 1, k + 8, k + 9);
    }
  }
  for (const name of ['position', 'normal']) geometry.setAttribute(name,
    new THREE.BufferAttribute(new Float32Array(samples * 24), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geometry.setIndex(indices);
  return { geometry, width, samples, twist: 0, thickness: .018,
    points: Array.from({ length: samples }, () => new THREE.Vector3()),
    tangents: Array.from({ length: samples }, () => new THREE.Vector3()),
    sides: Array.from({ length: samples }, () => new THREE.Vector3()),
    rotation: new THREE.Quaternion(), desired: new THREE.Vector3(), facing: new THREE.Vector3(), side: new THREE.Vector3(), cross: new THREE.Vector3() };
}

const CORNERS = [[-.5, .5], [.5, .5], [.5, -.5], [-.5, -.5], [-.5, -.5], [-.5, .5], [.5, .5], [.5, -.5]];

/** Parallel-transport frames keep webbing in world space, then smoothly apply
 * the bag's actual twist. Camera orbit never turns the strap into a billboard. */
export function updateStrap(band: ReturnType<typeof createStrap>, curve: THREE.Curve<THREE.Vector3>, startAcross: THREE.Vector3, endAcross: THREE.Vector3, stretch = 1, pinnedTop = false) {
  const { samples, points, tangents, sides, rotation, desired, facing, side, cross } = band;
  for (let i = 0; i < samples; i++) {
    curve.getPoint(i / (samples - 1), points[i]); curve.getTangent(i / (samples - 1), tangents[i]);
    if (pinnedTop && i === 0) tangents[i].set(0, -1, 0);
    if (i === 0) sides[i].copy(startAcross).addScaledVector(tangents[i], -startAcross.dot(tangents[i]));
    else sides[i].copy(sides[i - 1]).applyQuaternion(rotation.setFromUnitVectors(tangents[i - 1], tangents[i]));
    if (sides[i].lengthSq() < 1e-8) sides[i].set(0, 0, 1).cross(tangents[i]);
    sides[i].normalize();
  }
  const last = samples - 1;
  desired.copy(endAcross).addScaledVector(tangents[last], -endAcross.dot(tangents[last])).normalize();
  let twist = Math.atan2(cross.crossVectors(sides[last], desired).dot(tangents[last]), sides[last].dot(desired));
  while (twist - band.twist > Math.PI) twist -= Math.PI * 2;
  while (twist - band.twist < -Math.PI) twist += Math.PI * 2;
  band.twist = twist;
  const position = band.geometry.getAttribute('position'), normal = band.geometry.getAttribute('normal');
  for (let i = 0; i < samples; i++) {
    const t = i / last, angle = twist * t * t * (3 - 2 * t);
    side.copy(sides[i]).applyAxisAngle(tangents[i], angle);
    facing.crossVectors(tangents[i], side).normalize();
    for (let j = 0; j < 8; j++) {
      const [x, z] = CORNERS[j], k = i * 8 + j, p = points[i];
      position.setXYZ(k, p.x + side.x * x * band.width / stretch + facing.x * z * band.thickness,
        p.y + side.y * x * band.width / stretch + facing.y * z * band.thickness,
        p.z + side.z * x * band.width / stretch + facing.z * z * band.thickness);
      const n = j < 2 ? facing : j < 4 ? cross.copy(facing).negate() : j < 6 ? cross.copy(side).negate() : side;
      normal.setXYZ(k, n.x, n.y, n.z);
    }
  }
  position.needsUpdate = normal.needsUpdate = true;
}
