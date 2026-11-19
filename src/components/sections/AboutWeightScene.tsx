'use client';
import { Component, useEffect, useRef, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TourReflections } from '../hero/gym-tour/TourLighting';

type Props = { progress: MutableRefObject<number>; pointer: MutableRefObject<{ x: number; y: number }>; invalidateRef: MutableRefObject<() => void>; selected: number; active: boolean; reduced: boolean };
function Sculpture({ progress, pointer, invalidateRef, selected, active, reduced }: Props) {
  const assembly = useRef<THREE.Group>(null);
  const plates = useRef<(THREE.Group | null)[]>([]);
  const { invalidate, gl, scene, camera, setFrameloop } = useThree();
  useEffect(() => {
    invalidateRef.current = () => { if (active && !document.hidden) invalidate(); };
    if (active) invalidate();
    return () => { invalidateRef.current = () => {}; };
  }, [active, invalidate, invalidateRef, selected, reduced]);
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); setFrameloop('never'); gl.domElement.style.opacity = '0'; };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, setFrameloop]);
  useFrame(() => {
    if (!active || document.hidden || gl.getContext().isContextLost()) return;
    const p = reduced ? .5 : progress.current;
    if (assembly.current) assembly.current.rotation.set(.22 + (reduced ? 0 : pointer.current.y * .08), -.35 + p * .7 + (reduced ? 0 : pointer.current.x * .12), -.38);
    plates.current.forEach((plate, i) => { if (plate) plate.position.x = (i < 3 ? -1 : 1) * (.82 + (i % 3) * (.24 + Math.sin(p * Math.PI) * .18)); });
    gl.render(scene, camera);
  }, 1);
  const accent = ['#ef3048', '#ff8755', '#b8d6e2'][selected];
  return <>
    <TourReflections />
    <hemisphereLight args={['#f3eee0', '#676f6d', 1.35]} />
    <directionalLight position={[8, 18, 14]} intensity={1.8} color="#fff1d9" />
    <directionalLight position={[-12, 8, -6]} intensity={1.5} color="#b8d6e2" />
    <pointLight position={[1, -1, 3]} intensity={12} color={accent} distance={8} />
    <group ref={assembly} position={[0, .25, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.14, .14, 4.1, 40]} /><meshStandardMaterial color="#c6cbca" metalness={.9} roughness={.24} /></mesh>
      {Array.from({ length: 6 }, (_, i) => <group ref={node => { plates.current[i] = node; }} key={i} position={[(i < 3 ? -1 : 1) * (.82 + i % 3 * .3), 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.02 - i % 3 * .12, 1.02 - i % 3 * .12, .20, 48]} /><meshStandardMaterial color="#242a2d" metalness={.65} roughness={.32} /></mesh>
        {[-1, 1].map(side => <group key={side} position={[side * .105, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh><torusGeometry args={[.84 - i % 3 * .12, .018, 8, 64]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={.65} roughness={.3} metalness={.6} /></mesh>
          <mesh><torusGeometry args={[.25, .035, 10, 40]} /><meshStandardMaterial color="#b8bdbe" metalness={.85} roughness={.2} /></mesh>
        </group>)}
      </group>)}
      {Array.from({ length: 18 }, (_, i) => <mesh key={i} position={[-.5 + i * .059, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.143, .006, 4, 24]} /><meshStandardMaterial color="#798184" metalness={.8} roughness={.45} /></mesh>)}
    </group>
    <mesh position={[0, -1.55, 0]}><cylinderGeometry args={[2.35, 2.45, .25, 80]} /><meshStandardMaterial color="#20272a" roughness={.6} metalness={.45} /></mesh>
    <mesh position={[0, -1.41, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[2.12, .012, 6, 100]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.5} /></mesh>
  </>;
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
export default function AboutWeightScene(props: Props) {
  return <Boundary><Canvas frameloop="demand" dpr={[1, 1.25]} camera={{ position: [0, 2, 7.5], fov: 43 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}><Sculpture {...props} /></Canvas></Boundary>;
}
