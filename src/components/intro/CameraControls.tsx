import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
export default function CameraControls({ enabled = true }: { enabled?: boolean }) {
  const aspect = useThree(s => s.size.width / s.size.height);
  const distance = aspect < .7 ? 15.5 : 13.2;
  return <OrbitControls enabled={enabled} makeDefault target={[0, -.15, 0]} enablePan={false} enableDamping dampingFactor={.065} minDistance={distance} maxDistance={20} minPolarAngle={Math.PI * .34} maxPolarAngle={Math.PI * .64} rotateSpeed={.55} zoomSpeed={.5} />;
}
