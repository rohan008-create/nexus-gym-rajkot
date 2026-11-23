import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, MathUtils } from 'three';
import { createBagMotion, stepBagMotion } from '../components/intro/suspensionMotion';
export { useReducedMotion } from './useReducedMotion';
export type BagPull = { held: boolean; x: number; y: number; yaw: number; pitch: number };
export function useBagAnimation(enabled: boolean, freeze = false, pull?: React.MutableRefObject<BagPull>) {
  const ref = useRef<Group>(null);
  const motion = useRef(createBagMotion());
  useFrame((_, delta) => {
    if (!ref.current || freeze) return;
    const m = motion.current;
    if (!enabled && !pull?.current.held) Object.assign(m, createBagMotion());
    else stepBagMotion(m, delta, enabled, pull?.current);
    ref.current.position.set(m.x, 3.2 + m.y, m.z);
    ref.current.rotation.z = MathUtils.damp(ref.current.rotation.z, -Math.atan2(m.x, 8.8), 6, Math.min(delta, .05));
    ref.current.rotation.y = m.yaw;
    ref.current.rotation.x = m.pitch;
  });
  return ref;
}
