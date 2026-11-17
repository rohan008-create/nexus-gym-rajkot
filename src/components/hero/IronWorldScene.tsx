'use client';

import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export type GymStatus = 'loading' | 'ready' | 'error';
type Props = { active: boolean; reduced: boolean; onStatus: (status: GymStatus) => void; pointer: React.MutableRefObject<{ x: number; y: number }> };
type V3 = [number, number, number];
const steel = '#686e78', frame = '#262b33', red = '#cf1932';

class SceneBoundary extends Component<{ children: React.ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Beam({ at, size, color = frame, glow = false }: { at: V3; size: V3; color?: string; glow?: boolean }) {
  return <mesh position={at}><boxGeometry args={size} /><meshStandardMaterial color={color} metalness={glow ? .2 : .75} roughness={.36} emissive={glow ? color : '#000000'} emissiveIntensity={glow ? 3 : 0} /></mesh>;
}

function Barbell({ at = [0, 0, 0], scale = 1 }: { at?: V3; scale?: number }) {
  return <group position={at} scale={scale} name="loaded-barbell">
    <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.038, .038, 3.4, 12]} /><meshStandardMaterial color="#b4bdc8" metalness={.92} roughness={.23} /></mesh>
    {[-1, 1].map(side => <group key={side}>
      {[0, 1, 2].map(i => <group key={i} position={[side * (1.08 + i * .14), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh><cylinderGeometry args={[.47 - i * .065, .47 - i * .065, .115, 28]} /><meshStandardMaterial color={i === 0 ? '#ad1830' : '#20252b'} metalness={.55} roughness={.42} /></mesh>
        <mesh position={[0, .065, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.3 - i * .045, .012, 6, 28]} /><meshStandardMaterial color="#69717d" metalness={.8} roughness={.3} /></mesh>
      </group>)}
      <mesh position={[side * 1.57, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.075, .075, .09, 16]} /><meshStandardMaterial color={red} metalness={.7} roughness={.3} /></mesh>
    </group>)}
  </group>;
}

function Rack() {
  return <group position={[.2, 0, -.6]} name="power-rack">
    {[-1.35, 1.35].flatMap(x => [-1.1, 1.1].map(z => <group key={`${x}-${z}`}>
      <Beam at={[x, 2.1, z]} size={[.13, 4.2, .13]} />
      <Beam at={[x, .09, z]} size={[.48, .12, .48]} />
      {Array.from({ length: 13 }, (_, i) => <mesh key={i} position={[x, .65 + i * .23, z + .069]}><circleGeometry args={[.022, 8]} /><meshBasicMaterial color="#08090b" /></mesh>)}
    </group>))}
    {[-1.35, 1.35].map(x => <Beam key={x} at={[x, 4.16, 0]} size={[.16, .16, 2.38]} />)}
    <Beam at={[0, 4.16, -1.1]} size={[2.84, .19, .16]} color={red} />
    <Beam at={[0, 3.98, 1.1]} size={[2.84, .065, .065]} color={steel} />
    <Beam at={[0, .2, -1.1]} size={[2.8, .13, .13]} />
    {[-1.35, 1.35].map(x => <Beam key={x} at={[x, 2.55, 1.2]} size={[.18, .16, .4]} color={red} />)}
    <Barbell at={[0, 2.7, 1.17]} />
    <Beam at={[0, .18, 1.4]} size={[1.2, .18, 3.4]} />
    {[-.1, 2.4].map(z => <Beam key={z} at={[0, .47, z]} size={[.17, .8, .17]} />)}
    <RoundedBox args={[.79, .22, 2.18]} radius={.09} smoothness={2} position={[0, .91, 1.25]}><meshStandardMaterial color="#96142a" roughness={.7} /></RoundedBox>
    <Beam at={[0, .94, 1.25]} size={[.03, .012, 1.7]} color="#e14c5e" />
  </group>;
}

function Dumbbell({ at }: { at: V3 }) {
  return <group position={at} rotation={[0, 0, Math.PI / 2]}>
    <mesh><cylinderGeometry args={[.045, .045, .66, 8]} /><meshStandardMaterial color={steel} metalness={.9} roughness={.26} /></mesh>
    {[-.27, .27].map(y => <mesh key={y} position={[0, y, 0]} rotation={[0, Math.PI / 6, 0]}><cylinderGeometry args={[.19, .19, .21, 6]} /><meshStandardMaterial color="#343944" metalness={.6} roughness={.4} /></mesh>)}
  </group>;
}

function DumbbellRack() {
  return <group position={[-3.8, 0, .2]} rotation={[0, .12, 0]} name="dumbbell-rack">
    {[-1.25, 1.25].map(x => <Beam key={x} at={[x, .8, 0]} size={[.13, 1.6, .7]} />)}
    {[.66, 1.33].map(y => <group key={y}>
      <Beam at={[0, y, 0]} size={[3.1, .1, .65]} />
      <Beam at={[0, y + .04, .34]} size={[3.1, .07, .04]} color={red} />
      {[-1.12, -.38, .38, 1.12].map(x => <Dumbbell key={x} at={[x, y + .24, 0]} />)}
    </group>)}
  </group>;
}

function Treadmill({ at }: { at: V3 }) {
  return <group position={at} rotation={[0, -.16, 0]} name="treadmill">
    <RoundedBox args={[1.35, .24, 2.8]} radius={.08} smoothness={2} position={[0, .18, 0]}><meshStandardMaterial color="#242a32" metalness={.6} roughness={.4} /></RoundedBox>
    <Beam at={[0, .315, 0]} size={[.98, .025, 2.5]} color="#101216" />
    {[-.62, .62].map(x => <group key={x}>
      <Beam at={[x, .33, 0]} size={[.045, .03, 2.6]} color={red} />
      <group position={[x, 1.12, -.84]} rotation={[-.2, 0, 0]}><Beam at={[0, 0, 0]} size={[.095, 1.8, .095]} color={steel} /></group>
      <Beam at={[x, 1.66, -.25]} size={[.085, .085, .9]} />
    </group>)}
    <group position={[0, 1.97, -1.02]} rotation={[-.3, 0, 0]}>
      <Beam at={[0, 0, 0]} size={[1.18, .55, .12]} />
      <Beam at={[0, .025, .068]} size={[.62, .31, .015]} color="#4d9eac" glow />
    </group>
    {Array.from({ length: 8 }, (_, i) => <Beam key={i} at={[0, .332, -.95 + i * .27]} size={[.94, .004, .009]} color="#45494f" />)}
  </group>;
}

function HangingBag({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.z = reduced ? 0 : Math.sin(clock.elapsedTime * .65) * .025; });
  return <group position={[-3.65, 4.5, -3.5]} ref={ref} name="punching-bag">
    {[-.25, .25].map(x => <group key={x} position={[x, -.45, 0]} rotation={[0, 0, -x * .5]}><Beam at={[0, 0, 0]} size={[.025, .9, .025]} color={steel} /></group>)}
    <mesh position={[0, -1.95, 0]}><cylinderGeometry args={[.43, .43, 2.2, 32]} /><meshStandardMaterial color="#42121e" roughness={.66} metalness={.12} /></mesh>
    {[-1.05, -2.85].map(y => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[.442, .442, .13, 32]} /><meshStandardMaterial color={red} roughness={.5} /></mesh>)}
    <Beam at={[0, -1.8, .433]} size={[.12, .6, .015]} color="#e7ddd7" />
  </group>;
}

function WallMark() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.textAlign = 'center'; ctx.fillStyle = '#e4e7eb'; ctx.font = '900 italic 160px Arial'; ctx.fillText('NEXUS', 512, 170);
    ctx.fillStyle = '#ff354b'; ctx.font = '22px Arial'; ctx.fillText('T H E   I R O N   W O R L D', 512, 222);
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace; return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[0, 3.4, -4.77]}><planeGeometry args={[4.9, 1.23]} /><meshBasicMaterial map={texture} transparent toneMapped={false} /></mesh>;
}

function Gym({ reduced, onStatus, pointer }: Pick<Props, 'reduced' | 'onStatus' | 'pointer'>) {
  const { camera, size } = useThree();
  const mobile = size.width < 760;
  const started = useRef<number | null>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = mobile ? 48 : 43;
    perspective.updateProjectionMatrix();
  }, [camera, mobile]);
  useFrame(({ clock }, delta) => {
    if (started.current === null) { started.current = clock.elapsedTime; onStatus('ready'); }
    const t = reduced ? 1 : Math.min(1, (clock.elapsedTime - started.current) / 2.3);
    const ease = 1 - Math.pow(1 - t, 3);
    const scroll = reduced ? 0 : Math.min(1, window.scrollY / Math.max(window.innerHeight, 1));
    const px = reduced || mobile ? 0 : pointer.current.x * .6;
    const py = reduced || mobile ? 0 : pointer.current.y * .25;
    target.set(mobile ? 10.6 : 10.5 + px, mobile ? 7.4 : 6.5 + py, (mobile ? 15.6 : 14) + (1 - ease) * 3 - scroll * 1.2);
    camera.position.lerp(target, reduced ? 1 : 1 - Math.exp(-3 * Math.min(delta, .05)));
    camera.lookAt(mobile ? 0 : -3.2, mobile ? .7 : 1.1, 0);
  });
  return <>
    <color attach="background" args={['#080b10']} />
    <fog attach="fog" args={['#080b10', 20, 43]} />
    <ambientLight intensity={.85} color="#a8b5cd" />
    <hemisphereLight args={['#c5d9ff', '#15101a', 1.5]} />
    <directionalLight position={[2, 9, 7]} intensity={3.2} color="#d9e7ff" />
    <pointLight position={[-4, 3, -2]} intensity={32} distance={12} color="#ff173c" />
    <pointLight position={[4, 4, 1]} intensity={28} distance={13} color="#9ecaff" />
    <group position={[0, -.3, 0]}>
      <mesh position={[0, -.14, 0]}><boxGeometry args={[12.8, .26, 11]} /><meshStandardMaterial color="#141922" roughness={.48} metalness={.5} /></mesh>
      {Array.from({ length: 13 }, (_, i) => <Beam key={`x${i}`} at={[-6 + i, .002, 0]} size={[.012, .008, 10.8]} color="#303843" />)}
      {Array.from({ length: 11 }, (_, i) => <Beam key={`z${i}`} at={[0, .003, -5 + i]} size={[12.6, .008, .012]} color="#303843" />)}
      <Beam at={[0, .02, 5.25]} size={[12.65, .035, .035]} color="#ff173c" glow />
      <Beam at={[6.25, .02, 0]} size={[.035, .035, 10.5]} color="#ff173c" glow />
      <Beam at={[0, 2.5, -4.9]} size={[12.5, 5, .12]} color="#151a23" />
      {[-5.9, -3, 3, 5.9].map(x => <Beam key={x} at={[x, 2.5, -4.8]} size={[.045, 4.8, .045]} color="#454f60" />)}
      {[-4.6, -.8, 3.6].map(z => <group key={z} name="ceiling-portal">
        {[-6, 6].map(x => <Beam key={x} at={[x, 2.7, z]} size={[.13, 5.4, .13]} />)}
        <Beam at={[0, 5.36, z]} size={[12.1, .15, .15]} />
        <Beam at={[0, 5.25, z + .02]} size={[11.8, .035, .045]} color="#ff1637" glow />
      </group>)}
      {[-3.4, 2.8].map(x => <Beam key={x} at={[x, 5.18, -.6]} size={[.045, .035, 7.7]} color="#bfdaff" glow />)}
      <WallMark />
      <Rack />
      <DumbbellRack />
      <Treadmill at={[3.9, 0, -2.4]} />
      <Treadmill at={[5.5, 0, -2.4]} />
      <HangingBag reduced={reduced} />
      <group position={[-2.9, .5, 3.7]} rotation={[0, -.4, .15]}><Barbell scale={.8} /></group>
      <Dumbbell at={[3.5, .22, 3.8]} />
      <Dumbbell at={[4.2, .22, 3.5]} />
    </group>
  </>;
}

export default function IronWorldScene({ active, reduced, onStatus, pointer }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [failed, setFailed] = useState(false);
  const fail = () => { setFailed(true); onStatus('error'); };
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    const node = host.current;
    const lost = (event: Event) => { event.preventDefault(); setFailed(true); onStatus('error'); };
    if (node) { observer.observe(node); node.addEventListener('webglcontextlost', lost, true); }
    return () => { observer.disconnect(); node?.removeEventListener('webglcontextlost', lost, true); };
  }, [onStatus]);
  return <div ref={host} className={`persistent-scene iron-world-scene${failed ? ' is-fallback' : ''}`} role="img" aria-label="Three dimensional concept gym with a loaded squat rack, red bench, dumbbell rack, treadmills and a hanging punching bag">
    <div className="iron-world-fallback" aria-hidden />
    {!failed && <SceneBoundary onError={fail}>
      <Canvas dpr={[1, 1.5]} performance={{ min: .6 }} frameloop={visible && active && !reduced ? 'always' : 'demand'} camera={{ position: [10.5, 6.5, 17], fov: 43, near: .1, far: 70 }} gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.2; }} fallback={<span>Step into your next chapter.</span>}>
        <Gym reduced={reduced} onStatus={onStatus} pointer={pointer} />
      </Canvas>
    </SceneBoundary>}
    <div className="iron-world-shade" aria-hidden />
    <div className="iron-world-tag" aria-hidden><span className="iron-live-dot" /> THE IRON WORLD <span>01 / NEXUS</span></div>
    <div className="iron-world-caption" aria-hidden><span>STRENGTH. ENDURANCE. <b>YOU.</b></span><span>3D CONCEPT SPACE <i>↗</i></span></div>
  </div>;
}
