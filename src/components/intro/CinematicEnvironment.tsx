import { Environment, Lightformer } from '@react-three/drei';
import SmokeEffect from './SmokeEffect';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
export default function CinematicEnvironment({ animate, cinematic = false, elapsed }: { animate: boolean; cinematic?: boolean; elapsed?: React.MutableRefObject<number> }) {
  const ring = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ring.current || !cinematic || !elapsed) return;
    const fade = 1 - THREE.MathUtils.smoothstep(elapsed.current, .25, .55);
    ring.current.visible = fade > 0;
    ring.current.children.forEach((child, i) => { ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = fade * (i ? .065 : 1); });
  });
  return <>
    <ambientLight intensity={.16} />
    <spotLight position={[-3, 5, 5]} intensity={230} angle={.65} penumbra={1} decay={2} color="#e1e6f0" />
    <rectAreaLight position={[1, 1, 5]} intensity={5} width={3} height={5} color="#d4dce8" />
    <pointLight position={[2, .7, -1]} intensity={14} color="#ff1020" decay={2} />
    <pointLight position={[-2, -.3, -1]} intensity={10} color="#ec071b" decay={2} />
    <Environment resolution={128}>
      <Lightformer position={[-3, 2, 4]} scale={[2, 6, 1]} intensity={3} color="#d4dcea" target={[0, 0, 0]} />
      <Lightformer position={[3, 0, -2]} scale={[1, 6, 1]} intensity={5} color="#ee1020" target={[0, 0, 0]} />
      <Lightformer position={[-3, 0, -2]} scale={[.6, 5, 1]} intensity={4} color="#b80a15" target={[0, 0, 0]} />
      <Lightformer position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[3, 3, 1]} intensity={2} />
    </Environment>
    <group ref={ring} position={[0, -.2, -2]}>
      <mesh><torusGeometry args={[1.85, .008, 8, 192]} /><meshBasicMaterial color="#a61721" toneMapped={false} transparent /></mesh>
      <mesh><torusGeometry args={[1.85, .035, 8, 192]} /><meshBasicMaterial color="#b10917" transparent opacity={.065} depthWrite={false} /></mesh>
    </group>
    <SmokeEffect animate={animate} layers={cinematic ? 1 : 2} detail={cinematic ? 3 : 5} />
  </>;
}
