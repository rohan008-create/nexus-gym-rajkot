import * as THREE from 'three';

// Add headroom to the gym storey while keeping the stair/floor datum fixed.
// Everything above the fascia moves up intact rather than stretching upstairs.
export function raiseGymBand(geometry: THREE.BufferGeometry, matrix = new THREE.Matrix4(), rigid: 'logo' | 'lettering' | null = null) {
  const position = geometry.getAttribute('position');
  const point = new THREE.Vector3(), inverse = matrix.clone().invert();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i).applyMatrix4(matrix);
    const y = point.y;
    if (y > 4.37 && !(point.x > 6.8 && point.z > .95 && y < 6.4)) {
      const lift = rigid ? (rigid === 'logo' ? .45 : .6) : .6 * THREE.MathUtils.clamp((y - 4.37) / (8.15 - 4.37), 0, 1);
      point.y += lift;
    }
    point.applyMatrix4(inverse);
    position.setXYZ(i, point.x, point.y, point.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
}
