'use client';
import { Component, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildGymGeometry } from './buildGymGeometry';
import DetailedExterior from './DetailedExterior';
import DetailedInterior from './DetailedInterior';
import { sampleCamera, settleTourFov, type Point } from './gymTourConfig';

const INITIAL_CAMERA = { position: [25, 16, 32] as Point, fov: 43, near: .2, far: 180 };
const GL_OPTIONS = { antialias: true, powerPreference: 'default' as WebGLPowerPreference, alpha: false };

function Sign({ text, position, width, color = '#f02643' }: { text: string; position: Point; width: number; color?: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192;
    const context = canvas.getContext('2d')!;
    context.fillStyle = color; context.font = '900 115px Arial'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText(text, 512, 99, 1000);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position}><planeGeometry args={[width, width * .1875]} /><meshBasicMaterial map={texture} transparent depthWrite={false} /></mesh>;
}
function Scene({ progress, active, mobile, onInvalidate, onReady, onFailure }: {
  progress: React.MutableRefObject<number>; active: boolean; mobile: boolean; onInvalidate: React.MutableRefObject<() => void>; onReady: () => void; onFailure: () => void;
}) {
  const { camera, gl, scene, invalidate, size, setFrameloop } = useThree();
  const exterior = useRef<THREE.Group>(null), interior = useRef<THREE.Group>(null);
  const readiness = useRef({ announced: false, scheduled: false, frame: 0 });
  const lifecycle = useRef({ stopped: false, failed: false });
  const assets = useMemo(buildGymGeometry, []);
  const motion = useMemo(() => ({ position: [0, 0, 0] as Point, target: [0, 0, 0] as Point, look: new THREE.Vector3(), initialized: false, inside: false }), []);
  const stopForContextLoss = () => {
    lifecycle.current.stopped = true;
    onInvalidate.current = () => {};
    cancelAnimationFrame(readiness.current.frame); readiness.current.scheduled = false;
    // Public per-canvas API: cancel pending demand work before React unmounts.
    setFrameloop('never');
    if (!lifecycle.current.failed) { lifecycle.current.failed = true; onFailure(); }
  };
  useEffect(() => {
    lifecycle.current.stopped = false;
    setFrameloop('demand');
    onInvalidate.current = () => { if (!lifecycle.current.stopped) invalidate(); };
    const lost = (event: Event) => { event.preventDefault(); stopForContextLoss(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    invalidate();
    return () => {
      lifecycle.current.stopped = true;
      setFrameloop('never');
      onInvalidate.current = () => {};
      cancelAnimationFrame(readiness.current.frame); readiness.current.scheduled = false;
      gl.domElement.removeEventListener('webglcontextlost', lost);
    };
  }, [invalidate, gl, onReady, onFailure, onInvalidate, setFrameloop]);
  useEffect(() => { motion.initialized = false; invalidate(); }, [active, mobile, size.width, size.height, invalidate, motion]);
  useEffect(() => () => assets.dispose(), [assets]);
  useFrame((_, delta) => {
    if (lifecycle.current.stopped) return;
    if (gl.getContext().isContextLost()) { stopForContextLoss(); return; }
    const inside = progress.current >= .45;
    const fov = sampleCamera(progress.current, mobile, motion.position, motion.target);
    const snap = !motion.initialized || inside !== motion.inside || !active;
    const alpha = snap ? 1 : 1 - Math.exp(-12 * Math.min(delta, .05));
    camera.position.x += (motion.position[0] - camera.position.x) * alpha;
    camera.position.y += (motion.position[1] - camera.position.y) * alpha;
    camera.position.z += (motion.position[2] - camera.position.z) * alpha;
    motion.look.x += (motion.target[0] - motion.look.x) * alpha;
    motion.look.y += (motion.target[1] - motion.look.y) * alpha;
    motion.look.z += (motion.target[2] - motion.look.z) * alpha;
    camera.lookAt(motion.look);
    const perspective = camera as THREE.PerspectiveCamera;
    const fovError = fov - perspective.fov;
    if (Math.abs(fovError) > .000001) {
      perspective.fov = settleTourFov(perspective.fov, fov, alpha);
      perspective.updateProjectionMatrix();
    }
    exterior.current!.visible = !inside; interior.current!.visible = inside;
    motion.initialized = true; motion.inside = inside;
    const distance = Math.abs(camera.position.x - motion.position[0]) + Math.abs(camera.position.y - motion.position[1]) + Math.abs(camera.position.z - motion.position[2]) + Math.abs(motion.look.x - motion.target[0]) + Math.abs(motion.look.y - motion.target[1]) + Math.abs(motion.look.z - motion.target[2]) + Math.abs(perspective.fov - fov);
    // Own the final draw (priority 1), so a queued R3F frame cannot use a lost
    // or already-disposed program after the context-loss event/unmount begins.
    try {
      if (gl.getContext().isContextLost()) { stopForContextLoss(); return; }
      gl.render(scene, camera);
    } catch (error) {
      // Context loss may occur inside a native GL call before its event arrives.
      // Preserve every unrelated shader/render error while the context is valid.
      if (gl.getContext().isContextLost()) { stopForContextLoss(); return; }
      throw error;
    }
    if (active && distance > .002) invalidate();
    // Announce readiness on the following RAF, after the successful final draw.
    if (!readiness.current.announced && !readiness.current.scheduled && size.width > 0 && size.height > 0) {
      readiness.current.scheduled = true;
      readiness.current.frame = requestAnimationFrame(() => {
        if (!lifecycle.current.stopped && !gl.getContext().isContextLost()) {
          readiness.current.announced = true; onReady();
        }
      });
    }
  }, 1);
  return <>
    <color attach="background" args={['#d4d3c9']} />
    <hemisphereLight args={['#f3eee0', '#676f6d', 2.2]} />
    <directionalLight position={[8, 18, 14]} intensity={3.2} color="#fff1d9" />
    <directionalLight position={[-12, 8, -6]} intensity={1.2} color="#b8d6e2" />
    <group ref={exterior} dispose={null}>
      <DetailedExterior fallback={<>
        {assets.exterior.map((part, i) => <mesh key={i} geometry={part.geometry} material={part.material} />)}
        <Sign text="NEXUS" position={[-3.5, 7.1, .36]} width={6} />
        <Sign text="FITNESS CLUB" position={[-3.5, 6.52, .37]} width={3.8} color="#f3eee0" />
        <Sign text="RESULTS MATTER" position={[3.8, 7.1, .36]} width={5} color="#f3eee0" />
      </>} />
    </group>
    <group ref={interior} visible={false} dispose={null}>
      <DetailedInterior active={active} fallback={<>
        {assets.interior.map((part, i) => <mesh key={i} geometry={part.geometry} material={part.material} />)}
        <Sign text="NEXUS" position={[3.8, 6.3, -11.75]} width={4.6} />
        <Sign text="BEYOND LIMITS" position={[3.8, 5.65, -11.74]} width={3.8} color="#f3eee0" />
      </>} />
    </group>
  </>;
}
class Boundary extends Component<{ children: React.ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}
export default function GymTourCanvas(props: Parameters<typeof Scene>[0]) {
  return <Boundary onFailure={props.onFailure}><Canvas frameloop="demand" dpr={[1, 1.25]} camera={INITIAL_CAMERA} gl={GL_OPTIONS} aria-hidden="true"><Scene {...props} /></Canvas></Boundary>;
}
