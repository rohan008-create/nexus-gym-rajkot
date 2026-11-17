import { Suspense, useEffect, useRef, useState } from 'react';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';
import PunchingBagModel, { BagAsset } from './PunchingBagModel';
import HangingChains from './HangingChains';
import CinematicEnvironment from './CinematicEnvironment';
import CameraControls from './CameraControls';
import LeatherFragments from './LeatherFragments';
import InternalFilling from './InternalFilling';
import ShockwaveEffect from './ShockwaveEffect';
import RiftSurface from './RiftSurface';
import CinematicLeather from './CinematicLeather';
import { useBagAnimation } from '../../hooks/useBagAnimation';

export type ExplosionState = 'IDLE' | 'EXPLODING' | 'FALLING' | 'COMPLETE';
type Props = { asset: BagAsset; reduced: boolean; idle: boolean; onStart: () => void; onComplete: () => void; onPhase: (phase: ExplosionState) => void; fracturedModelUrl?: string; breakthrough?: boolean; canStart?: boolean; onPrepared?: (ready: boolean) => void };
function Ready({ onReady }: { onReady: React.Dispatch<React.SetStateAction<boolean>> }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    // All effects and lights already exist. Compile their shaders before the tap,
    // including invisible debris, so impact introduces no new shader variants.
    const timer = setTimeout(() => {
      // Synchronous compilation cannot keep polling disposed materials if the
      // independent Enter button unmounts this renderer during preparation.
      void Promise.resolve().then(() => { if (!cancelled) gl.compile(scene, camera); }).then(() => {
        if (cancelled) return;
        // Shader compilation alone does not upload hidden debris buffers or its
        // textures. Draw every effect into a tiny scissor before enabling input.
        const viewport = gl.getViewport(new THREE.Vector4());
        const scissor = gl.getScissor(new THREE.Vector4());
        const scissorTest = gl.getScissorTest();
        const objects: { object: THREE.Object3D; visible: boolean; culled: boolean }[] = [];
        scene.traverse(object => {
          objects.push({ object, visible: object.visible, culled: object.frustumCulled });
          object.visible = true; object.frustumCulled = false;
        });
        try {
          gl.setScissor(0, 0, 2, 2); gl.setScissorTest(true);
          gl.render(scene, camera);
        } finally {
          objects.forEach(({ object, visible, culled }) => { object.visible = visible; object.frustumCulled = culled; });
          gl.setViewport(viewport); gl.setScissor(scissor); gl.setScissorTest(scissorTest);
        }
        frame = requestAnimationFrame(() => { if (!cancelled) onReady(true); });
      }).catch(() => { /* The independent Enter Nexus button remains available. */ });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [gl, scene, camera, onReady]);
  return null;
}

export default function BagExplosion({ asset, reduced, idle, onStart, onComplete, onPhase, fracturedModelUrl, breakthrough = false, canStart = true, onPrepared }: Props) {
  const { gl, camera, size } = useThree();
  const [phase, setPhase] = useState<ExplosionState>('IDLE');
  const [burst, setBurst] = useState(false), [ready, setReady] = useState(false);
  useEffect(() => { onPrepared?.(ready); }, [ready, onPrepared]);
  const started = useRef(false), startedAt = useRef(0), elapsed = useRef(0), lastPhase = useRef<ExplosionState>('IDLE');
  const effectElapsed = useRef(0);
  const transform = useRef(new THREE.Matrix4());
  const bodyGroup = useRef<THREE.Group>(null), chainJolt = useRef<THREE.Group>(null);
  const pivot = useBagAnimation(idle && phase === 'IDLE' && !reduced, phase !== 'IDLE');
  const cameraBase = useRef(new THREE.Vector3());
  const completionTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(completionTimer.current), []);
  const finish = () => {
    if (lastPhase.current === 'COMPLETE') return;
    lastPhase.current = 'COMPLETE'; started.current = false;
    gl.domElement.style.opacity = '0'; camera.position.copy(cameraBase.current);
    onPhase('COMPLETE'); onComplete();
  };
  const gesture = useRef({ pointers: new Set<number>(), x: 0, y: 0, moved: false, multi: false });
  useEffect(() => {
    const canvas = gl.domElement, g = gesture.current;
    const down = (e: PointerEvent) => { if (!g.pointers.size) { g.x = e.clientX; g.y = e.clientY; g.moved = false; g.multi = false; } g.pointers.add(e.pointerId); if (g.pointers.size > 1) g.multi = true; };
    const move = (e: PointerEvent) => { if (g.pointers.size && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 6) g.moved = true; };
    const up = (e: PointerEvent) => g.pointers.delete(e.pointerId);
    const cancel = (e: PointerEvent) => { g.moved = true; up(e); };
    canvas.addEventListener('pointerdown', down, true); window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', cancel, true);
    return () => { canvas.removeEventListener('pointerdown', down, true); window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', cancel, true); canvas.style.cursor = ''; canvas.style.opacity = '1'; };
  }, [gl]);
  const trigger = (event: ThreeEvent<MouseEvent>) => {
    if (!ready || !canStart || started.current || event.delta > 6 || gesture.current.moved || gesture.current.multi) return;
    event.stopPropagation(); started.current = true;
    bodyGroup.current!.updateWorldMatrix(true, false); transform.current.copy(bodyGroup.current!.matrixWorld);
    cameraBase.current.copy(camera.position); startedAt.current = performance.now(); elapsed.current = 0;
    gl.domElement.style.cursor = ''; setPhase('EXPLODING'); lastPhase.current = 'EXPLODING'; onPhase('EXPLODING'); onStart();
    completionTimer.current = setTimeout(finish, breakthrough ? (reduced ? 900 : 2400) : 3500);
  };
  useFrame(() => {
    if (!started.current) return;
    const t = (performance.now() - startedAt.current) / 1000;
    elapsed.current = t;
    effectElapsed.current = Math.max(0, t - (breakthrough ? .1 : 0));
    const impact = breakthrough ? .25 : .15;
    if (t >= impact && !burst) setBurst(true);
    if (breakthrough && bodyGroup.current && !burst) {
      const pressure = Math.sin(Math.min(1, t / .25) * Math.PI / 2);
      bodyGroup.current.scale.set(1 + pressure * .045, 1 - pressure * .055, 1 + pressure * .045);
    }
    if (t >= .5 && lastPhase.current === 'EXPLODING') { lastPhase.current = 'FALLING'; setPhase('FALLING'); onPhase('FALLING'); }
    if (chainJolt.current) {
      chainJolt.current.rotation.z = reduced ? 0 : Math.sin(t * 27) * .003 * Math.exp(-t * 2.4);
      // The torn suspension clears with the front page, rather than hanging over the hero.
      if (breakthrough) chainJolt.current.position.y = 7.15 + (reduced ? 0 : THREE.MathUtils.smoothstep(t, .42, 1.15) * 12);
    }
    const shakeTime = breakthrough ? t - .25 : t;
    if (!reduced && shakeTime >= 0 && shakeTime < .65) { const amplitude = (breakthrough ? .085 : .045) * Math.exp(-shakeTime * 7); camera.position.copy(cameraBase.current); camera.position.x += Math.sin(shakeTime * 91) * amplitude; camera.position.y += Math.sin(shakeTime * 117) * amplitude * .65; }
    else camera.position.copy(cameraBase.current);
    gl.domElement.style.opacity = `${1 - THREE.MathUtils.smoothstep(t, breakthrough ? (reduced ? .25 : 1.65) : 2.8, breakthrough ? (reduced ? .85 : 2.35) : 3.45)}`;
    if (t >= (breakthrough ? (reduced ? .9 : 2.4) : 3.5)) finish();
  });
  const active = phase !== 'IDLE';
  return <>
    {breakthrough && <RiftSurface elapsed={elapsed} active={active} reduced={reduced} />}
    <CinematicEnvironment animate={!reduced} cinematic={breakthrough} elapsed={elapsed} />
    <group position={[0, 3.2, 0]} ref={pivot}>
      <group position={[0, 7.15, 0]} ref={chainJolt}><group position={[0, -7.15, 0]}><HangingChains /></group></group>
      <group position={[0, -3.2, 0]} ref={bodyGroup} visible={!burst}>
        <PunchingBagModel {...asset} />
        {/* Pick a simple volume, rather than ray-testing every stitch and leather triangle. */}
        <mesh name="BagInteraction" onClick={trigger}
          onPointerOver={() => { if (!active && ready) gl.domElement.style.cursor = 'pointer'; }} onPointerOut={() => { gl.domElement.style.cursor = ''; }}>
          <cylinderGeometry args={[.65, .65, 3.2, 12]} />
          <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} forceSinglePass />
        </mesh>
      </group>
    </group>
    <Suspense fallback={null}>
      {breakthrough && !fracturedModelUrl ? <>
        <CinematicLeather active={burst} elapsed={effectElapsed} transform={transform.current} mobile={size.width < 700} reduced={reduced} />
        <Ready onReady={setReady} />
      </> :
      <Physics paused={!burst} gravity={[0, -15, 0]} timeStep={1 / 60} interpolate>
        <Ready onReady={setReady} />
        <LeatherFragments burst={burst} transform={transform.current} fracturedModelUrl={fracturedModelUrl} elapsed={effectElapsed} reduced={reduced} />
      </Physics>}
    </Suspense>
    <InternalFilling elapsed={effectElapsed} transform={transform.current} mobile={size.width < 700} reduced={reduced} active={burst} cinematic={breakthrough} />
    <ShockwaveEffect elapsed={effectElapsed} reduced={reduced} active={active && !reduced} cinematic={breakthrough} />
    <CameraControls enabled={!active} />
  </>;
}
