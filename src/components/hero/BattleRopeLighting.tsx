import { Environment, Lightformer } from '@react-three/drei';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
export default function BattleRopeLighting() {
  const rig = useRef<THREE.Group>(null);
  useFrame(({ camera }) => { if (rig.current) rig.current.position.y = camera.position.y; });
  return <>
    <ambientLight intensity={.4} />
    <group ref={rig}>
    <rectAreaLight position={[0, 3, 5]} intensity={11} width={5} height={7} color="#eceef4" />
    <spotLight position={[-3, 5, 6]} intensity={190} angle={.75} penumbra={1} color="#f0f0f5" />
    <pointLight position={[4, .4, -1.5]} intensity={20} color="#ff1e27" />
    <pointLight position={[-3, -1, 3]} intensity={7} color="#c3c9d3" />
    </group>
    <Environment resolution={64}>
      <Lightformer position={[-3, 3, 5]} scale={[4, 7, 1]} intensity={2.5} color="#e3e8f1" target={[0, 0, 0]} />
      <Lightformer position={[4, 1, -2]} scale={[1, 6, 1]} intensity={2.5} color="#da1021" target={[0, 0, 0]} />
    </Environment>
  </>;
}
