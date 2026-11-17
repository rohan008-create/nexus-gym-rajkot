'use client';
import { Component, Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LockerMaterials } from './LockerMaterials';
import VaultModel from './VaultModel';
type Props = { selected: number | null; mobile: boolean; reduced: boolean; active: boolean; onSelect: (index: number) => void; onSettled: (index: number | null) => void; onReady: () => void; onError: () => void };
class VaultBoundary extends Component<{ children: React.ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function World(props: Props) {
  const { gl, scene, camera, size } = useThree();
  const callbacks = useRef(props); callbacks.current = props;
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl), room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, .04);
    scene.environment = environment.texture;
    const lost = (event: Event) => { event.preventDefault(); callbacks.current.onError(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    callbacks.current.onReady();
    return () => { gl.domElement.removeEventListener('webglcontextlost', lost); scene.environment = null; environment.dispose(); pmrem.dispose(); room.dispose(); };
  }, [gl, scene]);
  useEffect(() => {
    const height = Math.max(6.3, 8.2 / (size.width / size.height));
    camera.position.set(1.2, 3.6, height / (2 * Math.tan(32 * Math.PI / 360)));
    camera.lookAt(-.3, 2.25, 0); camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return <><ambientLight intensity={.45} /><directionalLight position={[-4, 7, 6]} intensity={3.5} color="#e4e9f5" /><directionalLight position={[5, 2, 4]} intensity={1.2} color="#a4b1c8" /><pointLight position={[-3, 3, -1]} intensity={20} color="#ed152b" /><LockerMaterials><VaultModel selected={props.selected} reduced={props.reduced} onSelect={props.onSelect} onSettled={props.onSettled} /></LockerMaterials></>;
}
export default function LockerScene(props: Props) {
  return <VaultBoundary onError={props.onError}><Canvas className="vault-canvas" dpr={[1, 1.5]} frameloop={props.active ? 'always' : 'never'} camera={{ position: [1.2, 3.6, 12], fov: 32, near: .1, far: 50 }} gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }} fallback={<span>Choose a plan to explore your membership.</span>} onCreated={({ gl }) => { gl.domElement.style.touchAction = 'pan-y'; }}><Suspense fallback={null}><World {...props} /></Suspense></Canvas></VaultBoundary>;
}
