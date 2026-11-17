import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
export { useReducedMotion } from './useReducedMotion';
export function useBagAnimation(enabled: boolean, freeze = false) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => { if (!ref.current || freeze) return; const t = clock.elapsedTime; ref.current.rotation.z = enabled ? Math.sin(t * .9) * .065 : 0; ref.current.rotation.x = enabled ? Math.sin(t * .7) * .018 : 0; });
  return ref;
}
