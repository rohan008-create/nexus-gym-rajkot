import { Environment, Lightformer } from '@react-three/drei';
import SmokeEffect from './SmokeEffect';
export default function CinematicEnvironment({ animate, cinematic = false, elapsed }: { animate: boolean; cinematic?: boolean; elapsed?: React.MutableRefObject<number> }) {
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
    <SmokeEffect animate={animate} />
  </>;
}
