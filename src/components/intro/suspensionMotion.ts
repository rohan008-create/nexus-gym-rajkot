import * as THREE from 'three';

export function createSuspension(anchor: THREE.Vector3, end: THREE.Vector3) {
  const nodes = Array.from({ length: 10 }, (_, i) => anchor.clone().lerp(end, i / 9));
  return { anchor: anchor.clone(), nodes, previous: nodes.map(p => p.clone()),
    rest: anchor.distanceTo(end) / 9, work: new THREE.Vector3(), velocity: new THREE.Vector3() };
}

/** Damped Verlet chain with both attachment points pinned every substep. */
export function stepSuspension(sim: ReturnType<typeof createSuspension>, end: THREE.Vector3, delta: number, time: number, reduced = false) {
  const { nodes, previous, anchor, work, velocity } = sim, last = nodes.length - 1;
  if (reduced) {
    nodes.forEach((p, i) => { p.copy(anchor).lerp(end, i / last); previous[i].copy(p); });
    return;
  }
  const dt = Math.min(Math.max(delta, 0), 1 / 30), steps = Math.max(1, Math.ceil(dt * 120)), h = dt / steps;
  // Elastic webbing contracts as the bag rises; excess rest length caused
  // compression buckles and S-shaped waves in the previous hanging ribbon.
  const rest = anchor.distanceTo(end) / last;
  for (let step = 0; step < steps; step++) {
    for (let i = 1; i < last; i++) {
      work.copy(nodes[i]); velocity.subVectors(nodes[i], previous[i]);
      nodes[i].addScaledVector(velocity, Math.exp(-8 * h));
      const t = i / last;
      // Webbing resists folding into loose loops when the bag rises again.
      nodes[i].x += (anchor.x + (end.x - anchor.x) * t - nodes[i].x) * 28 * h * h;
      nodes[i].z += (anchor.z + (end.z - anchor.z) * t - nodes[i].z) * 28 * h * h;
      nodes[i].y -= 1.5 * h * h; previous[i].copy(work);
    }
    for (let iteration = 0; iteration < 12; iteration++) {
      nodes[0].copy(anchor); nodes[last].copy(end);
      for (let i = 0; i < last; i++) {
        work.subVectors(nodes[i + 1], nodes[i]);
        const length = work.length(); if (length < 1e-8) continue;
        const weightA = i === 0 ? 0 : 1, weightB = i + 1 === last ? 0 : 1;
        work.multiplyScalar((length - rest) / length * .88 / (weightA + weightB));
        if (weightA) nodes[i].add(work);
        if (weightB) nodes[i + 1].sub(work);
      }
    }
    nodes[0].copy(anchor); nodes[last].copy(end);
    previous[0].copy(anchor); previous[last].copy(end);
  }
}
