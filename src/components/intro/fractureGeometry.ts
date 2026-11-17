import * as THREE from 'three';

export function seededRandom(seed = 781) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
export type LeatherPiece = { shell: THREE.BufferGeometry; logo?: THREE.BufferGeometry; center: THREE.Vector3; mass: number };

/** Partitions the actual approved surface, rather than substituting a cylinder. */
export function fractureGeometry(body: THREE.BufferGeometry, logo: THREE.BufferGeometry, columns = 6, rows = 6): LeatherPiece[] {
  const random = seededRandom();
  const seeds = Array.from({ length: columns * rows }, (_, i) => ({ a: ((i % columns) + .2 + random() * .6) / columns * Math.PI * 2, y: -1.57 + (Math.floor(i / columns) + .2 + random() * .6) / rows * 3.14 }));
  const select = (p: THREE.Vector3) => {
    const angle = Math.atan2(p.x, p.z);
    let winner = 0, nearest = Infinity;
    seeds.forEach((s, i) => { const da = Math.atan2(Math.sin(angle - s.a), Math.cos(angle - s.a)); const dy = p.y - s.y; const distance = (da * .625) ** 2 + dy ** 2; if (distance < nearest) { nearest = distance; winner = i; } });
    return winner;
  };
  type Face = { p: THREE.Vector3[]; n: THREE.Vector3[]; uv: THREE.Vector2[] };
  const shells: Face[][] = seeds.map(() => []), logos: Face[][] = seeds.map(() => []);
  const split = (geometry: THREE.BufferGeometry, buckets: Face[][], logoMesh: boolean) => {
    const indices = geometry.index!.array, pos = geometry.attributes.position, uv = geometry.attributes.uv, normal = geometry.attributes.normal;
    for (let i = 0; i < indices.length; i += 3) {
      const ids = [indices[i], indices[i + 1], indices[i + 2]];
      const p = ids.map(id => new THREE.Vector3().fromBufferAttribute(pos, id));
      if (logoMesh) p.forEach(v => v.y += .38);
      const n = ids.map(id => new THREE.Vector3().fromBufferAttribute(normal, id));
      const tex = ids.map(id => new THREE.Vector2(uv.getX(id), uv.getY(id)));
      const chosen = p.map(select);
      if (chosen[0] === chosen[1] && chosen[1] === chosen[2]) {
        buckets[chosen[0]].push({ p, n, uv: tex });
        continue;
      }
      // Cut boundary triangles at the actual Voronoi seam. Assigning whole
      // triangles produces the conspicuous stair-step / saw-tooth silhouette.
      const center = p[0].clone().add(p[1]).add(p[2]).multiplyScalar(1 / 3);
      const angle = Math.atan2(center.x, center.z);
      const localSeeds = seeds.map(s => ({ x: Math.atan2(Math.sin(s.a - angle), Math.cos(s.a - angle)) * .625, y: s.y }));
      type Vertex = { x: number; y: number; p: THREE.Vector3; n: THREE.Vector3; uv: THREE.Vector2 };
      const triangle: Vertex[] = p.map((point, j) => ({
        x: Math.atan2(Math.sin(Math.atan2(point.x, point.z) - angle), Math.cos(Math.atan2(point.x, point.z) - angle)) * .625,
        y: point.y, p: point, n: n[j], uv: tex[j],
      }));
      // Include every cell: cap triangles can span a cell whose site is not the
      // closest site to any triangle corner (sampling corners leaves holes).
      for (let candidate = 0; candidate < seeds.length; candidate++) {
        const seed = localSeeds[candidate];
        let polygon = triangle;
        for (let k = 0; k < localSeeds.length && polygon.length; k++) {
          if (k === candidate) continue;
          const other = localSeeds[k];
          const dx = other.x - seed.x, dy = other.y - seed.y;
          const limit = (other.x * other.x + other.y * other.y - seed.x * seed.x - seed.y * seed.y) * .5;
          const output: Vertex[] = [];
          polygon.forEach((a, j) => {
            const b = polygon[(j + 1) % polygon.length];
            const da = a.x * dx + a.y * dy - limit, db = b.x * dx + b.y * dy - limit;
            if (da <= 0) output.push(a);
            if ((da < 0) !== (db < 0)) {
              const t = da / (da - db);
              output.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
                p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t).normalize(), uv: a.uv.clone().lerp(b.uv, t) });
            }
          });
          polygon = output;
        }
        for (let j = 1; j < polygon.length - 1; j++) {
          const vertices = [polygon[0], polygon[j], polygon[j + 1]];
          buckets[candidate].push({ p: vertices.map(v => v.p), n: vertices.map(v => v.n), uv: vertices.map(v => v.uv) });
        }
      }
    }
  };
  split(body, shells, false); split(logo, logos, true);
  function build(faces: Face[], center: THREE.Vector3, thickness: boolean) {
    const p: number[] = [], n: number[] = [], uv: number[] = [];
    const put = (v: THREE.Vector3, normal: THREE.Vector3, tex: THREE.Vector2) => { p.push(v.x - center.x, v.y - center.y, v.z - center.z); n.push(normal.x, normal.y, normal.z); uv.push(tex.x, tex.y); };
    faces.forEach(f => f.p.forEach((v, i) => put(v, f.n[i], f.uv[i])));
    const outerCount = p.length / 3;
    if (thickness) {
      const edges = new Map<string, { a: THREE.Vector3; b: THREE.Vector3; na: THREE.Vector3; nb: THREE.Vector3; count: number }>();
      const key = (v: THREE.Vector3) => `${Math.round(v.x * 100000)},${Math.round(v.y * 100000)},${Math.round(v.z * 100000)}`;
      faces.forEach(f => {
        [2, 1, 0].forEach(i => put(f.p[i].clone().addScaledVector(f.n[i], -.018), f.n[i].clone().negate(), f.uv[i]));
        for (let i = 0; i < 3; i++) { const j = (i + 1) % 3, k = [key(f.p[i]), key(f.p[j])].sort().join('|'); const entry = edges.get(k); if (entry) entry.count++; else edges.set(k, { a: f.p[i], b: f.p[j], na: f.n[i], nb: f.n[j], count: 1 }); }
      });
      edges.forEach(e => { if (e.count !== 1) return; const ai = e.a.clone().addScaledVector(e.na, -.018), bi = e.b.clone().addScaledVector(e.nb, -.018); const normal = e.b.clone().sub(e.a).cross(ai.clone().sub(e.a)).normalize(); [e.a, e.b, ai, e.b, bi, ai].forEach(v => put(v, normal, new THREE.Vector2())); });
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.addGroup(0, outerCount, 0); if (thickness) geometry.addGroup(outerCount, p.length / 3 - outerCount, 1); return geometry;
  }
  return shells.flatMap((faces, i) => {
    if (!faces.length) return [];
    const box = new THREE.Box3(); faces.forEach(f => f.p.forEach(v => box.expandByPoint(v))); const center = box.getCenter(new THREE.Vector3());
    let area = 0; faces.forEach(f => { area += f.p[1].clone().sub(f.p[0]).cross(f.p[2].clone().sub(f.p[0])).length() * .5; });
    return [{ shell: build(faces, center, true), logo: logos[i].length ? build(logos[i], center, false) : undefined, center, mass: Math.max(.04, area * 1.9) }];
  });
}
