import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, MathUtils } from 'three';
export { useReducedMotion } from './useReducedMotion';
export type BagPull = { held: boolean; x: number; y: number; yaw: number; pitch: number };
export function useBagAnimation(enabled: boolean, freeze = false, pull?: React.MutableRefObject<BagPull>) {
  const ref = useRef<Group>(null);
  const motion = useRef({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, spin: 0, pitch: 0, tilt: 0 });
  useFrame(({ clock }, delta) => {
    if (!ref.current || freeze) return;
    const t = clock.elapsedTime, m = motion.current, held = pull?.current.held;
    const targetX = held ? pull.current.x : enabled ? Math.sin(t * .72) * .14 : 0;
    const targetY = held ? pull.current.y : enabled ? Math.sin(t * 1.05) * .035 : 0;
    const targetZ = held ? Math.abs(pull.current.x) * .18 : enabled ? Math.sin(t * .51) * .045 : 0;
    const targetYaw = held ? pull.current.yaw : enabled ? Math.sin(t * .4) * .16 : 0;
    const targetPitch = held ? pull.current.pitch : enabled ? Math.sin(t * .53) * .025 : 0;
    const dt = Math.min(delta, 1 / 30), steps = Math.max(1, Math.ceil(dt * 120)), h = dt / steps;
    for (let i = 0; i < steps; i++) {
      m.vx += ((targetX - m.x) * 48 - m.vx * 10) * h;
      m.vy += ((targetY - m.y) * 58 - m.vy * 10) * h;
      m.vz += ((targetZ - m.z) * 40 - m.vz * 9) * h;
      m.spin += ((targetYaw - m.yaw) * 16 - m.spin * 5.5) * h;
      m.tilt += ((targetPitch - m.pitch) * 22 - m.tilt * 7) * h;
      m.x += m.vx * h; m.y += m.vy * h; m.z += m.vz * h;
      m.yaw += m.spin * h; m.pitch += m.tilt * h;
    }
    ref.current.position.set(m.x, 3.2 + m.y, m.z);
    ref.current.rotation.z = MathUtils.damp(ref.current.rotation.z, (enabled ? Math.sin(t * .72) * .035 : 0) - m.x * .09, 5, dt);
    ref.current.rotation.y = m.yaw;
    ref.current.rotation.x = m.pitch;
  });
  return ref;
}
