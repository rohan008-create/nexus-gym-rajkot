'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { smooth, type TourPlayback } from './gymTourConfig';

/** The original exterior is merged by material. Carve its portal in world space
 * without mutating shared geometry or removing the rest of the facade. */
export function openEntrance(material: THREE.Material) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vEntranceWorld;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvEntranceWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = 'varying vec3 vEntranceWorld;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      if (vEntranceWorld.x > 7.12 && vEntranceWorld.x < 8.98 &&
          vEntranceWorld.y > 4.515 && vEntranceWorld.y < 6.44 &&
          vEntranceWorld.z > -0.85 && vEntranceWorld.z < 1.2) discard;`);
  };
  material.customProgramCacheKey = () => 'nexus-open-entrance-v1';
}

export default function EntranceArchitecture({ motion }: { motion: TourPlayback }) {
  const door = useRef<THREE.Group>(null);
  useFrame(() => { if (door.current) door.current.rotation.y = -Math.PI * .5 * smooth((motion.progress - .38) / .10); });
  return <group>
    {/* Flush threshold between the straight landing and the interior floor. */}
    <mesh position={[8.05, 4.42, .56]}><boxGeometry args={[2.20, .18, .84]} /><meshStandardMaterial color="#252d31" metalness={.35} roughness={.45} /></mesh>
    {[7.08, 9.02].map(x => <mesh key={x} position={[x, 5.46, .87]}><boxGeometry args={[.075, 2.07, .11]} /><meshStandardMaterial color="#161d22" metalness={.4} roughness={.35} /></mesh>)}
    <mesh position={[8.05, 6.46, .87]}><boxGeometry args={[2.02, .06, .14]} /><meshStandardMaterial color="#ffe5bd" emissive="#ffe5bd" emissiveIntensity={.6} /></mesh>
    <group ref={door} position={[8.97, 4.51, .92]}>
      <mesh position={[-.91, .95, 0]}><boxGeometry args={[1.8, 1.9, .035]} /><meshStandardMaterial color="#31525c" metalness={.25} roughness={.2} transparent opacity={.7} depthWrite={false} /></mesh>
      <mesh position={[-1.65, 1.05, .06]}><boxGeometry args={[.035, .52, .055]} /><meshStandardMaterial color="#c8cecb" metalness={.85} roughness={.25} /></mesh>
    </group>
  </group>;
}
