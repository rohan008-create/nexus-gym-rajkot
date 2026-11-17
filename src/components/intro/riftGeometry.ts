import * as THREE from 'three';

/** One continuous, asymmetrical rip shared by both halves of the page. */
export function riftSeam(v: number) {
  return .5 + (v - .5) * .15 + Math.sin(v * 41) * .008 + Math.sin(v * 113 + .4) * .0035;
}

export function createRiftSheet(width: number, height: number, side: -1 | 1, mobile: boolean) {
  const columns = mobile ? 28 : 44, rows = mobile ? 72 : 112;
  const positions: number[] = [], uvs: number[] = [], edge: number[] = [], indices: number[] = [];
  for (let y = 0; y <= rows; y++) {
    const v = y / rows, seam = riftSeam(v);
    for (let x = 0; x <= columns; x++) {
      const u = x / columns;
      const pageU = side < 0 ? seam * u : seam + (1 - seam) * u;
      positions.push((pageU - .5) * width, (v - .5) * height, 0);
      uvs.push(pageU, v);
      edge.push(side < 0 ? 1 - u : u);
      if (y < rows && x < columns) {
        const a = y * (columns + 1) + x, b = a + columns + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('edgeDistance', new THREE.Float32BufferAttribute(edge, 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
