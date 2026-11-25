'use client';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RopeLayout } from './ropeGeometry';

export type RopeMotion = {
  progress: React.MutableRefObject<number>;
  pointer: React.MutableRefObject<{ x: number; y: number }>;
  velocity: React.MutableRefObject<number>;
  layout: React.MutableRefObject<RopeLayout>;
};
export function useRopeScrollMotion({ pointer, layout }: RopeMotion, reduced: boolean) {
  const { camera, size } = useThree();
  useFrame((_, delta) => {
    const mobile = size.width < 720;
    const px = !reduced && !mobile ? pointer.current.x * .075 : 0;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, px, 4, Math.min(delta, .05));
    // Document pixels map to world units. Only the camera descends: the rope anchor
    // remains in the Hero's world coordinates, and naturally leaves the viewport.
    const scroll = Math.max(0, window.scrollY - layout.current.rootTop);
    const stickyEnd = Math.max(0, (layout.current.sceneHeight ?? layout.current.heroHeight * 2) - layout.current.viewHeight / layout.current.unit);
    camera.position.y = .1 - Math.min(scroll, stickyEnd) * layout.current.unit;
    camera.lookAt(camera.position.x * .2, camera.position.y, 0);
  });
}
