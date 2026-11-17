import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useBagSurface } from './BagSurface';
export type BagAsset = { modelUrl?: string; logoUrl?: string };
function ExternalBag({ url }: { url: string }) { const { scene } = useGLTF(url); const clone = useMemo(() => scene.clone(true), [scene]); return <primitive object={clone} />; }
function ProceduralBag({ logoUrl }: { logoUrl: string }) {
  const { leather, body, logoGeometry, logoMaterial } = useBagSurface();
  const material = <meshStandardMaterial map={leather.map} normalMap={leather.normal} normalScale={new THREE.Vector2(.16, .16)} roughnessMap={leather.bump} roughness={.83} metalness={.02} />;
  return <group>
    <mesh geometry={body}>{material}</mesh>
    <mesh geometry={logoGeometry} position={[0, .38, 0]}><primitive object={logoMaterial} attach="material" /></mesh>
    {[-1.4, 1.35].map(y => <group key={y} position={[0, y, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.611, .027, 8, 128]} />{material}</mesh>
      {[-.025, .025].map(d => <mesh key={d} rotation={[Math.PI / 2, 0, 0]} position={[0, d, 0]}><torusGeometry args={[.633, .0035, 5, 128]} /><meshStandardMaterial color="#827164" roughness={.94} /></mesh>)}
    </group>)}
    {[0, 1, 2, 3].map(i => { const a = Math.PI / 4 + i * Math.PI / 2; return <group key={i} rotation={[0, a, 0]}>
      <mesh position={[0, 1.27, .61]}><boxGeometry args={[.15, .44, .045]} />{material}</mesh>
      <mesh position={[0, 1.55, .57]}><torusGeometry args={[.075, .017, 8, 20]} /><meshStandardMaterial color="#aeb1ba" metalness={1} roughness={.22} /></mesh>
      {[-.049, .049].map(x => <group key={x}>{Array.from({ length: 14 }, (_, j) => <mesh key={j} position={[x, 1.09 + j * .026, .635]}><boxGeometry args={[.004, .012, .003]} /><meshStandardMaterial color="#84756b" roughness={1} /></mesh>)}</group>)}
      {[1.12, 1.33].map(y => <mesh key={y} position={[0, y, .638]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.018, .018, .01, 10]} /><meshStandardMaterial color="#787980" metalness={1} roughness={.35} /></mesh>)}
    </group>; })}
    <mesh position={[0, 0, -.628]}><boxGeometry args={[.018, 2.7, .013]} />{material}</mesh>
  </group>;
}
/** GLB contract: meters, body centered at origin, height 3.14, logo/front facing +Z. */
export default function PunchingBagModel({ modelUrl, logoUrl = '/assets/nexus-logo.png' }: BagAsset) { return modelUrl ? <ExternalBag url={modelUrl} /> : <ProceduralBag logoUrl={logoUrl} />; }
