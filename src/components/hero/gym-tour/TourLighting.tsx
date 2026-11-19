'use client';
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** Baked RoomEnvironment PMREM, encoded as sRGB with linear values scaled by 1/128. */
export function TourReflections() {
  const { scene, invalidate } = useThree();
  useEffect(() => {
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    let mounted = true;
    const atlas = new THREE.TextureLoader().load('/models/nexus-gym/room-reflections.png', texture => {
      if (!mounted) return;
      texture.mapping = THREE.CubeUVReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      scene.environment = texture;
      scene.environmentIntensity = .3 * 128;
      invalidate();
    });
    return () => {
      mounted = false;
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      atlas.dispose();
    };
  }, [scene, invalidate]);
  return null;
}

// Original concept layout, matching build_interior.py. A single floor overlay
// supplies soft grounding without shadow maps or another render loop.
const CONTACTS = [
  [-5.9, -6.0, 2.7, 2.6], [-2.7, -6.0, 2.7, 2.6],
  [-5.9, -9.2, 2.7, 2.6], [-2.7, -8.4, 1.25, 2.3],
  ...[-3.3, -4.9, -6.5, -8.1, -9.7].map(z => [-8.12, z, 1.1, 1.7]),
  ...[[3, -5], [5.4, -5], [7.8, -5], [3, -9], [5.4, -9]].map(([x, z]) => [x, z, 1.7, 3]),
  [7.65, -9.2, 1.1, 1.8], [-.8, -10.6, 1.2, 1.2],
  [7.24, -2.05, 1.6, .85], [8, -2.9, 1.5, 1.1],
];

export function InteriorContactShading() {
  const geometry = useMemo(() => new THREE.PlaneGeometry(18.5, 12.5), []);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const context = canvas.getContext('2d')!;
    for (const [x, z, width, depth] of CONTACTS) {
      context.save();
      context.translate((x + 9.25) / 18.5 * 512, (z + 12.5) / 12.5 * 512);
      context.scale(width / 18.5 * 512, depth / 12.5 * 512);
      const gradient = context.createRadialGradient(0, 0, .05, 0, 0, .7);
      gradient.addColorStop(0, 'rgba(3, 6, 8, .5)');
      gradient.addColorStop(.45, 'rgba(3, 6, 8, .26)');
      gradient.addColorStop(1, 'rgba(3, 6, 8, 0)');
      context.fillStyle = gradient;
      context.fillRect(-.7, -.7, 1.4, 1.4);
      context.restore();
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1 }), [texture]);
  useEffect(() => () => { texture.dispose(); geometry.dispose(); material.dispose(); }, [texture, geometry, material]);
  return <mesh geometry={geometry} material={material} position={[0, 4.204, -6.25]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
  </mesh>;
}
