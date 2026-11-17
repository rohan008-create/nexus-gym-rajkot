'use client';
import { createContext, useContext, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

function createPalette() {
  const size = 128;
  const noise = new Uint8Array(size * size * 4);
  const normals = new Uint8Array(size * size * 4);
  let seed = 1107;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grain = seed >>> 24;
    noise.set([225 + grain * .1, 225 + grain * .1, 225 + grain * .1, 255], i * 4);
    normals.set([121 + grain * .05, 123 + (grain % 17) * .5, 255, 255], i * 4);
  }
  const roughness = new THREE.DataTexture(noise, size, size);
  const normal = new THREE.DataTexture(normals, size, size);
  [roughness, normal].forEach(texture => { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(7, 13); texture.needsUpdate = true; texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true; });
  const materials = new Map<string, THREE.MeshPhysicalMaterial>();
  const geometries = new Map<string, THREE.BufferGeometry>();
  return {
    material(color: string, metalness: number, finish: number) {
      const key = `${color}:${metalness}:${finish}`;
      if (!materials.has(key)) materials.set(key, new THREE.MeshPhysicalMaterial({ color, metalness, roughness: finish, roughnessMap: roughness, normalMap: normal, normalScale: new THREE.Vector2(.1, .075), clearcoat: .08, clearcoatRoughness: .6, envMapIntensity: .85 }));
      return materials.get(key)!;
    },
    geometry(args: [number, number, number], radius: number) {
      const key = `${args.join(':')}:${radius}`;
      if (!geometries.has(key)) geometries.set(key, new RoundedBoxGeometry(...args, 2, Math.min(radius, ...args.map(value => value / 2 - .0001))));
      return geometries.get(key)!;
    },
    dispose() { materials.forEach(material => material.dispose()); geometries.forEach(geometry => geometry.dispose()); normal.dispose(); roughness.dispose(); },
  };
}
const Palette = createContext<ReturnType<typeof createPalette> | null>(null);
export function LockerMaterials({ children }: { children: React.ReactNode }) {
  const palette = useMemo(createPalette, []);
  useEffect(() => () => palette.dispose(), [palette]);
  return <Palette.Provider value={palette}>{children}</Palette.Provider>;
}
export function MetalBox({ args, position, color = '#18191d', metalness = .28, roughness = .54, radius = .012, rotation }: { args: [number, number, number]; position?: [number, number, number]; color?: string; metalness?: number; roughness?: number; radius?: number; rotation?: [number, number, number] }) {
  const palette = useContext(Palette)!;
  return <mesh geometry={palette.geometry(args, radius)} material={palette.material(color, metalness, roughness)} position={position} rotation={rotation} dispose={null} />;
}
