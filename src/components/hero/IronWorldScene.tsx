'use client';
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export type GymStatus = 'loading' | 'ready' | 'error';
type Props = { active: boolean; reduced: boolean; onStatus: (status: GymStatus) => void; pointer: React.MutableRefObject<{ x: number; y: number }> };
type V3 = [number, number, number];
class SceneBoundary extends Component<{ children: React.ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Plate({ radius = 1, red = false }: { radius?: number; red?: boolean }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, radius * .18, 0, Math.PI * 2, true); shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape, { depth: .2, bevelEnabled: true, bevelThickness: .055, bevelSize: .04, bevelSegments: 3, steps: 1, curveSegments: 64 });
  }, [radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group>
    <mesh geometry={geometry} dispose={null}><meshStandardMaterial color={red ? '#bc1732' : '#20242c'} metalness={.7} roughness={.3} /></mesh>
    {[.255, -.055].map(z => <group key={z} position={[0, 0, z]}>
      <mesh><torusGeometry args={[radius * .85, .018, 8, 80]} /><meshStandardMaterial color={red ? '#ff4058' : '#7d8794'} metalness={.85} roughness={.25} /></mesh>
      <mesh><torusGeometry args={[radius * .21, .033, 10, 40]} /><meshStandardMaterial color="#b5bdc9" metalness={.95} roughness={.2} /></mesh>
      {[0, 1, 2].map(i => <mesh key={i} position={[Math.cos(i * Math.PI * 2 / 3) * radius * .57, Math.sin(i * Math.PI * 2 / 3) * radius * .57, 0]} rotation={[0, 0, i * Math.PI * 2 / 3]}><capsuleGeometry args={[.035, radius * .28, 3, 6]} /><meshStandardMaterial color={red ? '#e2354c' : '#4f5865'} metalness={.6} roughness={.35} /></mesh>)}
    </group>)}
  </group>;
}
function Dumbbell() {
  return <group rotation={[.1, .2, -.55]}>
    <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.115, .115, 2.8, 24]} /><meshStandardMaterial color="#ced3dc" metalness={1} roughness={.2} /></mesh>
    {Array.from({ length: 16 }, (_, i) => <mesh key={i} position={[-.65 + i * .085, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.119, .008, 4, 12]} /><meshStandardMaterial color="#57616d" metalness={.9} roughness={.35} /></mesh>)}
    {[-1, 1].map(side => <group key={side} position={[side * 1.1, 0, 0]}>
      <RoundedBox args={[.63, 1.23, 1.23]} radius={.12} smoothness={3}><meshStandardMaterial color="#171c24" metalness={.65} roughness={.28} /></RoundedBox>
      <mesh position={[side * .33, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.36, .36, .035, 32]} /><meshStandardMaterial color="#d31a36" metalness={.65} roughness={.3} /></mesh>
      <mesh position={[side * .36, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.27, .014, 6, 32]} /><meshStandardMaterial color="#ff8a97" metalness={.85} roughness={.2} /></mesh>
    </group>)}
  </group>;
}
function Bell() {
  const geometry = useMemo(() => {
    const curve = new THREE.SplineCurve([[0,-.85],[.5,-.85],[.8,-.68],[.95,-.2],[.8,.4],[.4,.68],[0,.68]].map(([x,y])=>new THREE.Vector2(x,y)));
    const body = new THREE.LatheGeometry(curve.getPoints(48), 64);
    const path = new THREE.CatmullRomCurve3([[-.55,.5,0],[-.66,1,0],[-.45,1.6,0],[.45,1.6,0],[.66,1,0],[.55,.5,0]].map(p=>new THREE.Vector3(...p as V3)));
    return { body, handle: new THREE.TubeGeometry(path, 64, .12, 12, false) };
  }, []);
  useEffect(() => () => { geometry.body.dispose(); geometry.handle.dispose(); }, [geometry]);
  return <group rotation={[.2, -.3, .24]}>
    <mesh geometry={geometry.body} dispose={null}><meshStandardMaterial color="#a30f29" metalness={.65} roughness={.28} /></mesh>
    <mesh geometry={geometry.handle} dispose={null}><meshStandardMaterial color="#b0b9c7" metalness={1} roughness={.18} /></mesh>
    <mesh position={[0,-.79,0]}><cylinderGeometry args={[.59,.57,.06,48]} /><meshStandardMaterial color="#151922" metalness={.8} roughness={.25} /></mesh>
    <mesh position={[0,-.02,.94]}><circleGeometry args={[.23,32]} /><meshStandardMaterial color="#171b22" metalness={.6} roughness={.3} /></mesh>
    <mesh position={[0,-.02,.949]}><torusGeometry args={[.16,.015,8,32]} /><meshStandardMaterial color="#ffabb6" metalness={.9} roughness={.2} /></mesh>
  </group>;
}
function Floating({ children, at, rotation = [0,0,0], scale = 1, phase, reduced }: { children: React.ReactNode; at: V3; rotation?: V3; scale?: number; phase: number; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.position.y = at[1] + (reduced ? 0 : Math.sin(t * .48 + phase) * .12);
    ref.current.rotation.y = rotation[1] + (reduced ? 0 : Math.sin(t * .3 + phase) * .11);
    ref.current.rotation.z = rotation[2] + (reduced ? 0 : Math.cos(t * .3 + phase) * .035);
  });
  return <group ref={ref} position={at} rotation={rotation} scale={scale}>{children}</group>;
}
function Equipment({ reduced, pointer, onStatus }: Pick<Props, 'reduced' | 'pointer' | 'onStatus'>) {
  const { camera, viewport, size } = useThree();
  const mobile = size.width < 760;
  const half = viewport.width / 2;
  const ready = useRef(false);
  useFrame((_, delta) => {
    if (!ready.current) { ready.current = true; onStatus('ready'); }
    const amount = reduced || mobile ? 0 : 1;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.current.x * .25 * amount, 3, Math.min(delta, .05));
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pointer.current.y * .18 * amount, 3, Math.min(delta, .05));
    camera.lookAt(0, 0, 0);
  });
  return <>
    <ambientLight intensity={.4} />
    <directionalLight position={[-4, 7, 8]} intensity={3.4} color="#f5eee2" />
    <pointLight position={[5,-1,3]} intensity={42} distance={15} color="#ff183e" />
    <pointLight position={[-5,1,2]} intensity={22} distance={12} color="#b5c9ee" />
    <Environment resolution={64} frames={1}>
      <Lightformer position={[-4, 3, 5]} scale={[3, 7, 1]} intensity={4} />
      <Lightformer position={[5, 0, 3]} scale={[2, 8, 1]} intensity={4} color="#ff2945" />
      <Lightformer position={[0, 5, 2]} rotation={[Math.PI / 2,0,0]} scale={[8, 3, 1]} intensity={3} />
    </Environment>
    <Floating at={[mobile ? -half * .62 : -half * .67, mobile ? 2.9 : 2.1, -.5]} rotation={[.4,.1,-.16]} scale={mobile ? .48 : .9} phase={0} reduced={reduced}><Dumbbell /></Floating>
    <Floating at={[mobile ? half * .77 : half * .69, mobile ? 2.2 : 1.7, -1]} rotation={[.25,-.45,.3]} scale={mobile ? .72 : 1.4} phase={1} reduced={reduced}><Plate red /></Floating>
    <Floating at={[mobile ? -half * .83 : -half * .77, mobile ? -1.3 : -1.75, 1]} rotation={[.2,.4,-.3]} scale={mobile ? .8 : 1.35} phase={2} reduced={reduced}><Plate /></Floating>
    <Floating at={[mobile ? half * .77 : half * .72, mobile ? -1.45 : -1.9, .6]} scale={mobile ? .55 : .93} phase={3} reduced={reduced}><Bell /></Floating>
    <Floating at={[mobile ? half * .1 : half * .18, mobile ? 3.8 : 4.5, -3]} rotation={[.8,.3,-.4]} scale={mobile ? .38 : .5} phase={4} reduced={reduced}><Plate /></Floating>
    <Floating at={[-half * .35, mobile ? -3.55 : -3.75, -2]} rotation={[.8,.2,.2]} scale={mobile ? .28 : .42} phase={5} reduced={reduced}><Dumbbell /></Floating>
  </>;
}
export default function IronWorldScene({ active, reduced, onStatus, pointer }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true), [failed, setFailed] = useState(false);
  const fail = () => { setFailed(true); onStatus('error'); };
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    const node = host.current;
    const lost = (event: Event) => { event.preventDefault(); setFailed(true); onStatus('error'); };
    if (node) { observer.observe(node); node.addEventListener('webglcontextlost', lost, true); }
    return () => { observer.disconnect(); node?.removeEventListener('webglcontextlost', lost, true); };
  }, [onStatus]);
  return <div ref={host} className={`persistent-scene iron-world-scene${failed ? ' is-fallback' : ''}`} role="img" aria-label="A kinetic sculpture of floating three dimensional dumbbells, crimson weight plates and a polished kettlebell">
    <div className="iron-world-fallback" aria-hidden />
    {!failed && <SceneBoundary onError={fail}><Canvas dpr={[1,1.25]} frameloop={visible && active && !reduced ? 'always' : 'demand'} camera={{ position:[0,0,14], fov:40 }} gl={{ alpha:true, antialias:true }} onCreated={({ gl }) => { gl.toneMapping=THREE.ACESFilmicToneMapping; gl.toneMappingExposure=1.1; }} fallback={<span>Beyond limits. Nexus Fitness Club.</span>}>
      <Suspense fallback={null}><Equipment reduced={reduced} pointer={pointer} onStatus={onStatus} /></Suspense>
    </Canvas></SceneBoundary>}
    <div className="iron-world-shade" aria-hidden />
  </div>;
}
