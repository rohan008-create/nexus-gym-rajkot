'use client';
import { Component, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildGymGeometry } from './buildGymGeometry';
import StreetExterior from './StreetExterior';
import DetailedExterior from './DetailedExterior';
import DetailedInterior from './DetailedInterior';
import { InteriorContactShading, TourReflections } from './TourLighting';
import { advanceTour, DESKTOP_CAMERAS, sampleCamera, type Point } from './gymTourConfig';
import RyanTourGuide from './RyanTourGuide';
import EntranceArchitecture, { openEntrance } from './EntranceArchitecture';
import { raiseGymBand } from './raiseGymBand';

const INITIAL_CAMERA = { position: DESKTOP_CAMERAS[0].position, fov: DESKTOP_CAMERAS[0].fov, near: .06, far: 180 };
const GL_OPTIONS = { antialias: true, powerPreference: 'high-performance' as WebGLPowerPreference, alpha: false };

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
function Scene({ progress, active, mobile, onInvalidate, onPresent, onReady, onFailure }: {
  progress: React.MutableRefObject<number>; active: boolean; mobile: boolean; onInvalidate: React.MutableRefObject<() => void>; onReady: () => void; onFailure: () => void;
  onPresent: (progress: number, shutter: number) => void;
}) {
  const { camera, gl, scene, invalidate, size, setFrameloop, setDpr } = useThree();
  const slowFrames = useRef(0);
  const exterior = useRef<THREE.Group>(null), interior = useRef<THREE.Group>(null);
  const sky = useRef<THREE.HemisphereLight>(null), sun = useRef<THREE.DirectionalLight>(null), fill = useRef<THREE.DirectionalLight>(null);
  const readiness = useRef({ announced: false, scheduled: false, frame: 0 });
  const lifecycle = useRef({ stopped: false, failed: false });
  const assets = useMemo(() => {
    const result = buildGymGeometry();
    result.exterior.forEach(part => { raiseGymBand(part.geometry); openEntrance(part.material); });
    return result;
  }, []);
  const motion = useMemo(() => ({ position: [0, 0, 0] as Point, target: [0, 0, 0] as Point, progress: 0, shutter: 0, initialized: false }), []);
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
  useEffect(() => { motion.initialized = false; invalidate(); }, [active, mobile, invalidate, motion]);
  useEffect(() => () => assets.dispose(), [assets]);
  // Update progress before the guide/door sample it, including the last demand frame.
  useFrame((_, delta) => {
    if (lifecycle.current.stopped || document.hidden || (!active && readiness.current.announced)) return;
    if (!motion.initialized) {
      motion.progress = progress.current;
      motion.initialized = true;
    } else {
      const moving = advanceTour(motion, progress.current, delta);
      if (moving && active) {
        // Lower the pixel cost only after sustained slow scrolling. Ignore the
        // long first delta when the on-demand canvas wakes up.
        slowFrames.current = delta > .026 ? slowFrames.current + 1 : Math.max(0, slowFrames.current - 1);
        if (slowFrames.current >= 8) {
          const resolution = gl.getPixelRatio();
          if (resolution > .7) setDpr(Math.max(.7, resolution - .15));
          slowFrames.current = 0;
        }
        invalidate();
      } else {
        slowFrames.current = 0;
      }
    }
  }, -1);
  useFrame(() => {
    if (lifecycle.current.stopped || document.hidden || (!active && readiness.current.announced)) return;
    if (gl.getContext().isContextLost()) { stopForContextLoss(); return; }
    const fov = sampleCamera(motion.progress, mobile, motion.position, motion.target);
    camera.position.fromArray(motion.position);
    camera.lookAt(...motion.target);
    const perspective = camera as THREE.PerspectiveCamera;
    // Independently frame width and height without moving the camera closer.
    // Keep the whole building visible, easing back before the stair shot.
    const opening = 1 - THREE.MathUtils.smoothstep(motion.progress, 0, .12);
    const widthBoost = 1 + (mobile ? .02 : .20) * opening;
    const heightBoost = 1 + (mobile ? -.03 : .02) * opening;
    perspective.fov = fov;
    perspective.updateProjectionMatrix();
    perspective.projectionMatrix.elements[0] *= widthBoost;
    perspective.projectionMatrix.elements[5] *= heightBoost;
    perspective.projectionMatrix.elements[9] -= opening * .05;
    perspective.projectionMatrixInverse.copy(perspective.projectionMatrix).invert();
    // Bring the room into view before the camera turns towards the doorway.
    // Keep the exterior shell inside the gym since it supplies the ceiling.
    interior.current!.visible = motion.progress >= .45;
    const indoor = THREE.MathUtils.smoothstep(motion.progress, .66, .8);
    sky.current!.intensity = THREE.MathUtils.lerp(2.2, 1.35, indoor);
    sun.current!.intensity = THREE.MathUtils.lerp(3.2, 1.8, indoor);
    fill.current!.intensity = THREE.MathUtils.lerp(1.2, 1.5, indoor);
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
    onPresent(motion.progress, motion.shutter);
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
    <color attach="background" args={['#94c5e7']} />
    <TourReflections />
    <hemisphereLight ref={sky} args={['#f3eee0', '#676f6d', 2.2]} />
    <directionalLight ref={sun} position={[8, 18, 14]} intensity={3.2} color="#fff1d9" castShadow shadow-mapSize={[1536,1536]} shadow-camera-left={-28} shadow-camera-right={28} shadow-camera-top={25} shadow-camera-bottom={-24} shadow-camera-near={.5} shadow-camera-far={80} shadow-normalBias={.035} shadow-bias={-.0001} />
    <directionalLight ref={fill} position={[-12, 8, -6]} intensity={1.2} color="#b8d6e2" />
    <group ref={exterior} dispose={null}>
      <DetailedExterior fallback={<>
        {assets.exterior.map((part, i) => <mesh key={i} geometry={part.geometry} material={part.material} />)}
        <Sign text="NEXUS" position={[-3.5, 7.55, .36]} width={6} />
        <Sign text="FITNESS CLUB" position={[-3.5, 6.97, .37]} width={3.8} color="#f3eee0" />
        <Sign text="RESULTS MATTER" position={[3.8, 7.7, .36]} width={5} color="#f3eee0" />
      </>} />
    </group>
    <StreetExterior motion={motion} active={active} />
    <EntranceArchitecture motion={motion} />
    <RyanTourGuide motion={motion} active={active} />
    <group ref={interior} position={[0, .31, 0]} dispose={null}>
      <DetailedInterior active={active} fallback={<>
        {assets.interior.map((part, i) => <mesh key={i} geometry={part.geometry} material={part.material} />)}
        <Sign text="NEXUS" position={[3.8, 6.3, -11.75]} width={4.6} />
        <Sign text="BEYOND LIMITS" position={[3.8, 5.65, -11.74]} width={3.8} color="#f3eee0" />
      </>} />
      <InteriorContactShading />
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
  return <Boundary onFailure={props.onFailure}><Canvas className="gym-tour-world" shadows="soft" frameloop="demand" dpr={[1, 1.5]} camera={INITIAL_CAMERA} gl={GL_OPTIONS} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1; }} aria-hidden="true"><Scene {...props} /></Canvas></Boundary>;
}
