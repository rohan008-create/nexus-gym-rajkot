'use client';
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';

export type KettlebellStatus = 'loading' | 'ready' | 'error';
type Props = { reduced: boolean; active: boolean; onStatus: (status: KettlebellStatus) => void };
class Boundary extends Component<{ children: React.ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Bell({ reduced, onStatus }: Pick<Props, 'reduced' | 'onStatus'>) {
  const bell = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const { body, handle, badge, shade } = useMemo(() => {
    const points = [[0, -.94], [.48, -.94], [.71, -.87], [.91, -.64], [1.02, -.28], [1.01, .08], [.88, .43], [.62, .69], [.38, .77], [0, .79]];
    const curve = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y)));
    const body = new THREE.LatheGeometry(curve.getPoints(64), 96);
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.64, .48, 0), new THREE.Vector3(-.77, 1.02, 0),
      new THREE.Vector3(-.67, 1.68, 0), new THREE.Vector3(-.36, 1.88, 0),
      new THREE.Vector3(.36, 1.88, 0), new THREE.Vector3(.67, 1.68, 0),
      new THREE.Vector3(.77, 1.02, 0), new THREE.Vector3(.64, .48, 0),
    ], false, 'centripetal');
    const handle = new THREE.TubeGeometry(path, 100, .125, 16, false);
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#15171b'; ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#8d9299'; ctx.lineWidth = 3; ctx.strokeRect(22, 22, 468, 468);
    ctx.textAlign = 'center'; ctx.fillStyle = '#f22a3c'; ctx.font = 'bold 65px Arial'; ctx.fillText('NEXUS', 256, 125);
    ctx.fillStyle = '#f5f5f5'; ctx.font = 'bold 178px Arial'; ctx.fillText('24', 256, 310);
    ctx.fillStyle = '#acb0b7'; ctx.font = '27px Arial'; ctx.fillText('KG / CAST SERIES', 256, 375);
    ctx.fillStyle = '#ef1b2e'; ctx.fillRect(198, 419, 116, 5);
    const badge = new THREE.CanvasTexture(canvas); badge.colorSpace = THREE.SRGBColorSpace;
    const sc = document.createElement('canvas'); sc.width = sc.height = 128;
    const s = sc.getContext('2d')!; const gradient = s.createRadialGradient(64, 64, 3, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(0,0,0,.9)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
    s.fillStyle = gradient; s.fillRect(0, 0, 128, 128);
    return { body, handle, badge, shade: new THREE.CanvasTexture(sc) };
  }, []);
  useEffect(() => { onStatus('ready'); return () => { body.dispose(); handle.dispose(); badge.dispose(); shade.dispose(); }; }, [body, handle, badge, shade, onStatus]);
  useFrame(({ clock, pointer }, delta) => {
    if (!bell.current) return;
    const t = clock.elapsedTime;
    bell.current.position.y = reduced ? .05 : .05 + Math.sin(t * .85) * .085;
    bell.current.rotation.y = THREE.MathUtils.damp(bell.current.rotation.y, -.22 + (reduced ? 0 : pointer.x * .2), 3, delta);
    bell.current.rotation.z = reduced ? -.09 : -.09 + Math.sin(t * .6) * .025;
    if (shadow.current) shadow.current.scale.setScalar(1 + (reduced ? 0 : Math.sin(t * .85) * .04));
  });
  return <>
    <group ref={bell} rotation={[.08, -.22, -.09]}>
      <mesh geometry={body} name="NexusKettlebell" dispose={null}>
        <meshStandardMaterial color="#282b31" roughness={.38} metalness={.82} />
      </mesh>
      <mesh geometry={handle} dispose={null}><meshStandardMaterial color="#717780" roughness={.27} metalness={.95} /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[side * .68, .71, 0]} rotation={[0, 0, side * .23]}>
        <cylinderGeometry args={[.144, .144, .16, 32]} /><meshStandardMaterial color="#c41229" metalness={.7} roughness={.25} />
      </mesh>)}
      <mesh position={[0, -.02, 1.065]}><boxGeometry args={[.62, .65, .035]} /><meshStandardMaterial map={badge} roughness={.42} metalness={.35} /></mesh>
      <mesh position={[0, -.87, 0]}><cylinderGeometry args={[.77, .66, .055, 80]} /><meshStandardMaterial color="#b20b22" metalness={.75} roughness={.3} /></mesh>
    </group>
    <mesh ref={shadow} position={[0, -1.48, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3.9, 2.7]} /><meshBasicMaterial map={shade} transparent depthWrite={false} opacity={.85} /></mesh>
    <mesh position={[0, -1.52, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.55, 1.56, 100]} /><meshBasicMaterial color="#e31c35" transparent opacity={.32} side={THREE.DoubleSide} /></mesh>
  </>;
}

export default function KettlebellScene({ active, reduced, onStatus }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={host} className="persistent-scene kettlebell-scene" role="img" aria-label="Floating graphite Nexus kettlebell with polished steel handle and crimson accents">
    <div className="kettlebell-halo" aria-hidden />
    <span className="kettlebell-edition" aria-hidden>THE STRENGTH COLLECTION <i /> 01 / NEXUS</span>
    <Boundary onError={() => onStatus('error')}>
      <Canvas dpr={[1, 1.5]} frameloop={visible && active && !reduced ? 'always' : 'demand'} camera={{ position: [0, .7, 7.8], fov: 36 }} gl={{ alpha: true, antialias: true }} onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.15;
      }} fallback={<span>Strength, by Nexus.</span>}>
        <ambientLight intensity={.35} />
        <directionalLight position={[-3, 5, 5]} intensity={3} color="#e7edff" />
        <pointLight position={[3, 1, -1]} intensity={24} color="#fa1635" />
        <spotLight position={[-3, 4, 3]} intensity={35} angle={.6} penumbra={1} />
        <Suspense fallback={null}>
          <Environment resolution={64} frames={1}>
            <Lightformer position={[-3, 3, 2]} scale={[2, 5, 1]} intensity={3} />
            <Lightformer position={[3, 1, 1]} scale={[1, 4, 1]} intensity={2} color="#ff2943" />
            <Lightformer position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[5, 2, 1]} intensity={2} />
          </Environment>
          <Bell reduced={reduced} onStatus={onStatus} />
        </Suspense>
      </Canvas>
    </Boundary>
    <div className="kettlebell-caption" aria-hidden><span>FORGED FOR<br /><strong>YOUR NEXT LEVEL.</strong></span><span className="kettlebell-spec">24<span>KG</span></span></div>
  </div>;
}
