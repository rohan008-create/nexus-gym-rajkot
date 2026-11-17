'use client';
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { membershipPlans } from './membershipPlans';
import PodModel, { POD_POSITIONS as POSITIONS, POD_OPEN as DOOR_ANGLE } from './PodModel';
import { LockerMaterials } from './LockerMaterials';

type Props = { selected: number | null; mobile: boolean; visiblePlan: number; reduced: boolean; active: boolean; onSelect: (index: number) => void; onSettled: (index: number | null) => void; onReady: () => void; onError: () => void; onEnquire: (plan: string) => void };
class LockerBoundary extends Component<{ children: React.ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function LockerWorld(props: Props) {
  const { gl, scene, camera, size } = useThree();
  const angles = useRef([0, 0, 0]);
  const opened = useRef<number | null>(null);
  const settled = useRef<number | null>(null);
  const requested = useRef<number | null>(props.selected);
  const changeDelay = useRef(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const aim = useMemo(() => new THREE.Vector3(0, 1.9, 0), []);
  if (requested.current !== props.selected) { requested.current = props.selected; changeDelay.current = .17; }
  useEffect(() => {
    if (!props.mobile) return;
    angles.current = [0, 0, 0]; opened.current = null; settled.current = null; setOpenIndex(null);
  }, [props.mobile, props.visiblePlan]);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, .04);
    scene.environment = environment.texture;
    const lost = (event: Event) => { event.preventDefault(); props.onError(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    props.onReady();
    return () => { gl.domElement.removeEventListener('webglcontextlost', lost); scene.environment = null; environment.dispose(); pmrem.dispose(); room.dispose(); };
  }, [gl, scene]);
  useFrame((_, dt) => {
    // Finish closing the previous door before opening the next, even under rapid input.
    const desired = requested.current;
    changeDelay.current = Math.max(0, changeDelay.current - dt);
    if (changeDelay.current === 0 && opened.current !== desired) {
      if (opened.current !== null && Math.abs(angles.current[opened.current]) > .003) {
        if (openIndex !== null) setOpenIndex(null);
      } else {
        opened.current = desired;
        if (openIndex !== desired) setOpenIndex(desired);
      }
    } else if (changeDelay.current === 0 && opened.current === desired && openIndex !== desired) {
      setOpenIndex(desired);
    }
    const done = desired !== null && opened.current === desired && Math.abs(angles.current[desired] - DOOR_ANGLE) < .035;
    const nextSettled = done ? desired : null;
    if (nextSettled !== settled.current) { settled.current = nextSettled; props.onSettled(nextSettled); }
    const focus = props.mobile || props.reduced || desired === null ? 0 : POSITIONS[desired] * .09;
    const fov = (camera as THREE.PerspectiveCamera).fov * Math.PI / 180;
    const viewHeight = props.mobile ? Math.max(5.8, 4.9 / (size.width / size.height)) : Math.max(5.45, 10.25 / (size.width / size.height));
    const distance = viewHeight / (2 * Math.tan(fov / 2));
    camera.position.z = props.reduced ? distance : THREE.MathUtils.damp(camera.position.z, distance, 5, dt);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, props.mobile ? .9 : 1.65 + focus, 4, dt);
    aim.x = THREE.MathUtils.damp(aim.x, focus, 4, dt);
    camera.lookAt(aim);
  });
  return <>
    <ambientLight intensity={.38} /><directionalLight position={[-4, 7, 6]} intensity={2.4} color="#eef0ff" /><directionalLight position={[5, 4, 2]} intensity={.65} color="#d7dce8" /><directionalLight position={[0, 6, -3]} intensity={1.3} color="#e50914" />
    {membershipPlans.map((plan, index) => (!props.mobile || props.visiblePlan === index) && <PodModel key={plan.id} plan={plan} index={index} mobile={props.mobile} selected={props.selected === index} open={openIndex === index} showDisplay={settled.current === index && props.selected === index} reduced={props.reduced} onEnquire={props.onEnquire} onSelect={() => props.onSelect(index)} reportAngle={(i, angle) => { angles.current[i] = angle; }} />)}
    {membershipPlans.map((_, index) => (!props.mobile || props.visiblePlan === index) && <mesh key={index} position={[props.mobile ? 0 : POSITIONS[index], -.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.85, 1.9]} /><shaderMaterial transparent depthWrite={false} vertexShader="varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}" fragmentShader="varying vec2 vUv;void main(){float r=length((vUv-.5)*2.0);gl_FragColor=vec4(0.0,0.0,0.0,.8*(1.0-smoothstep(.12,1.0,r)));}" /></mesh>)}
  </>;
}

export default function LockerScene(props: Props) {
  return <LockerBoundary onError={props.onError}><Canvas className="locker-canvas" dpr={[1, 1.35]} frameloop={props.active ? 'always' : 'never'} camera={{ position: [props.mobile ? .9 : 1.65, 3.05, props.mobile ? 8.2 : 10.9], fov: props.mobile ? 38 : 29, near: .1, far: 40 }} gl={{ alpha: true, antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }} fallback={<span>3D preview unavailable. Use the plan controls below.</span>} onCreated={({ gl }) => { gl.domElement.style.touchAction = 'pan-y'; }}><Suspense fallback={null}><LockerMaterials><LockerWorld {...props} /></LockerMaterials></Suspense></Canvas></LockerBoundary>;
}
