'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { COMPLEX_SETBACK } from './gymTourConfig';

export default function NightExteriorLighting({ night }: { night: boolean }) {
  const glow = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, '#ffe4adab'); gradient.addColorStop(.2, '#ffd18b50'); gradient.addColorStop(1, '#ffd18b00');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
  useEffect(() => () => glow.dispose(), [glow]);
  return <>
    {/* Stable light count avoids shader rebuilds on theme changes. */}
    {[-6, 5].map(x => <pointLight key={x} position={[x, 7.9, 1.5 - COMPLEX_SETBACK]} color="#ffce8c" intensity={night ? 65 : 0} distance={16} decay={2} />)}
    <pointLight position={[-10.02, 8.35, 3.9]} color="#ffdb9a" intensity={night ? 100 : 0} distance={23} decay={2} />
    <pointLight position={[8.05, 6.4, 1.5 - COMPLEX_SETBACK]} color="#ffd7a4" intensity={night ? 24 : 0} distance={8} decay={2} />
    <group visible={night} name="Nexus after dark">
      <mesh position={[-30, 34, -96]}><sphereGeometry args={[1.2, 24, 16]} /><meshBasicMaterial color="#edf1ff" toneMapped={false} /></mesh>
      <mesh position={[-30, 34, -95.8]}><planeGeometry args={[10, 10]} /><meshBasicMaterial map={glow} color="#b5caff" transparent opacity={.35} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
      <mesh position={[-10.02, 8.37, 3.9]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[.55, .22]} /><meshBasicMaterial color="#ffdf9c" side={THREE.DoubleSide} toneMapped={false} /></mesh>
      {[-10, -5, 4, 8].map(x => <mesh key={x} position={[x, .015, x === -10 ? 3.9 : 1.0 - COMPLEX_SETBACK]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[5, 4]} /><meshBasicMaterial map={glow} transparent opacity={.48} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>)}
      <group position={[0, 0, -COMPLEX_SETBACK]}>
        {[-7.15, -3.6, 0, 3.6, 7.15].flatMap(x => [11.77, 15.16].map(y => <group key={`${x}-${y}`}>
          <mesh position={[x, y, .09]}><boxGeometry args={[2.55, .035, .04]} /><meshBasicMaterial color="#ffe4b1" toneMapped={false} /></mesh>
          <mesh position={[x, y - .22, .1]}><planeGeometry args={[3.2, 1.3]} /><meshBasicMaterial map={glow} transparent opacity={.22} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
        </group>))}
        {[-8.8, 8.8].flatMap(x => [2.7, 8.25, 11.95, 15.3].map(y => <group key={`${x}-${y}`}>
          <mesh position={[x, y, .14]}><boxGeometry args={[.10, .26, .08]} /><meshBasicMaterial color="#ffdc9a" toneMapped={false} /></mesh>
          <mesh position={[x, y - .3, .16]}><planeGeometry args={[.95, 2.2]} /><meshBasicMaterial map={glow} transparent opacity={.55} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
        </group>))}
        <mesh position={[-.8, 4.4, .28]}><boxGeometry args={[16.2, .035, .04]} /><meshBasicMaterial color="#f52c48" toneMapped={false} /></mesh>
        {[2, 5, 8, 11, 14, 17].map(i => <mesh key={i} position={[8.05, .24 + (i + .5) * .21 + .08, 8.8 - i * .355 + .18]}><boxGeometry args={[1.95, .025, .03]} /><meshBasicMaterial color="#ffe0a9" toneMapped={false} /></mesh>)}
      </group>
    </group>
  </>;
}
