import { useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

// Deterministic leather maps are generated at build time by
// scripts/prepare-leather-textures.cjs. Loading them through drei's
// Suspense-aware loader keeps the 1024x1024 pixel work off the main thread and
// shares one cached set of GPU textures across retries and replays.
export const LEATHER_ASSETS = [
  '/assets/intro/leather-albedo.webp',
  '/assets/intro/leather-normal.webp',
  '/assets/intro/leather-roughness.webp',
];

export type Leather = { map: THREE.Texture; normal: THREE.Texture; bump: THREE.Texture };

export function useLeather(): Leather {
  const [albedo, normal, roughness] = useTexture(LEATHER_ASSETS);
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  roughness.wrapS = roughness.wrapT = THREE.RepeatWrapping;
  roughness.anisotropy = 4;
  return useMemo(() => ({ map: albedo, normal, bump: roughness }), [albedo, normal, roughness]);
}
