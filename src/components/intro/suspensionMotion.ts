import * as THREE from 'three';

export function createSuspension(anchor: THREE.Vector3, end: THREE.Vector3) {
  const nodes = Array.from({ length: 10 }, (_, i) => anchor.clone().lerp(end, i / 9));
  return { anchor: anchor.clone(), nodes, previous: nodes.map(p => p.clone()),
    rest: anchor.distanceTo(end) / 9, accumulator: 0, work: new THREE.Vector3(), velocity: new THREE.Vector3() };
}

/** Damped Verlet chain with both attachment points pinned every substep. */
export function stepSuspension(sim: ReturnType<typeof createSuspension>, end: THREE.Vector3, delta: number, time: number, reduced = false) {
  const { nodes, previous, anchor, work, velocity } = sim, last = nodes.length - 1;
  if (reduced) {
    sim.accumulator = 0;
    nodes.forEach((p, i) => { p.copy(anchor).lerp(end, i / last); previous[i].copy(p); });
    return;
  }
  const h = 1 / 120;
  sim.accumulator += Math.min(Math.max(delta, 0), .05);
  const steps = Math.floor((sim.accumulator + 1e-10) / h);
  sim.accumulator -= steps * h;
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

/** Gravity-driven load with elastic vertical travel and retained release momentum. */
export function createBagMotion() {
  return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, spin: 0,
    pitch: 0, tilt: 0, accumulator: 0, time: 0 };
}

export function stepBagMotion(m: ReturnType<typeof createBagMotion>, delta: number,
  breeze: boolean, pull?: { held: boolean; x: number; y: number; yaw: number; pitch: number }) {
  const h = 1 / 120;
  m.accumulator += Math.min(Math.max(delta, 0), .05);
  const steps = Math.floor((m.accumulator + 1e-10) / h);
  m.accumulator -= steps * h;
  for (let i = 0; i < steps; i++) {
    m.time += h;
    const held = pull?.held;
    const wind = breeze ? Math.sin(m.time * .72) * .13 + Math.sin(m.time * 1.17) * .045 : 0;
    const length = 8.8, rise = (m.x * m.x + m.z * m.z) / (2 * length);
    m.vx += (held ? (pull.x - m.x) * 65 - m.vx * 14 : -9.81 / length * m.x - m.vx * .75 + wind) * h;
    m.vz += (held ? (Math.abs(pull.x) * .18 - m.z) * 50 - m.vz * 12 : -9.81 / length * m.z - m.vz * .85) * h;
    m.vy += (((held ? pull.y : rise) - m.y) * 42 - m.vy * (held ? 12 : 4.5)) * h;
    m.spin += (((held ? pull.yaw : 0) - m.yaw) * (held ? 18 : 2.8) - m.spin * (held ? 7 : 1.5)) * h;
    const pitch = held ? pull.pitch : -m.z / length;
    m.tilt += ((pitch - m.pitch) * 14 - m.tilt * 4) * h;
    m.x += m.vx * h; m.y += m.vy * h; m.z += m.vz * h;
    m.yaw += m.spin * h; m.pitch += m.tilt * h;
  }
}
