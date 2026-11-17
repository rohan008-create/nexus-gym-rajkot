'use client';
import { Component, Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { BagAsset } from './PunchingBagModel';
import BagExplosion, { ExplosionState } from './BagExplosion';
import { BagSurface } from './BagSurface';
import { ExplosionAudio } from './ExplosionAudio';
import { useReducedMotion } from '../../hooks/useBagAnimation';
class SceneBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="fallback" role="alert"><p>The 3D scene could not load. Please check WebGL support and try again.</p><button onClick={() => location.reload()}>Reload scene</button></div> : this.props.children; }
}
function Reveal({ reduced }: { reduced: boolean }) {
  const gl = useThree(s => s.gl);
  useEffect(() => { if (reduced) return; const canvas = gl.domElement; const tween = gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.8, ease: 'power2.out' }); return () => { tween.kill(); canvas.style.opacity = '1'; }; }, [gl, reduced]);
  return null;
}
function Framing() {
  const { camera, size } = useThree();
  useEffect(() => { camera.position.set(0, .35, size.width / size.height < .7 ? 15.5 : 13.2); camera.lookAt(0, -.15, 0); camera.updateProjectionMatrix(); }, [camera, size.width, size.height]);
  return null;
}
export type PunchingBagIntroProps = { asset?: BagAsset; animationState?: 'intact' | 'paused'; fracturedModelUrl?: string; onExplosionComplete?: () => void; onExplosionStart?: () => void; breakthrough?: boolean; canStart?: boolean };
export default function PunchingBagIntro({ asset = {}, animationState = 'intact', fracturedModelUrl, onExplosionComplete, onExplosionStart, breakthrough = false, canStart = true }: PunchingBagIntroProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<ExplosionState>('IDLE');
  const [run, setRun] = useState(0), [muted, setMuted] = useState(false);
  const audio = useRef<ExplosionAudio>();
  if (!audio.current) audio.current = new ExplosionAudio();
  useEffect(() => () => audio.current?.dispose(), []);
  const complete = phase === 'COMPLETE';
  const [contextLost, setContextLost] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  useEffect(() => {
    if (!sceneReady) return;
    const timer = setTimeout(() => audio.current?.prepare(), 100);
    return () => clearTimeout(timer);
  }, [sceneReady]);
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => () => cleanup.current(), []);
  return <main className={`intro${breakthrough ? ' intro-breakthrough' : ''}`} data-phase={phase} data-ready={sceneReady} onPointerDown={event => {
    if (!(event.target instanceof Element) || !event.target.closest('button')) audio.current?.unlock();
  }} aria-label="Interactive Nexus Fitness Club punching bag">
    {contextLost ? <div className="fallback" role="alert"><p>The graphics context was interrupted.</p><button onClick={() => location.reload()}>Reload scene</button></div> : <SceneBoundary><Canvas frameloop={complete ? 'demand' : 'always'} camera={{ position: [0, .35, 13.2], fov: 35, near: .1, far: 80 }} dpr={[1, breakthrough ? 1.35 : 1.75]} gl={{ antialias: true, alpha: breakthrough, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }} onCreated={({ gl }) => {
      gl.outputColorSpace = THREE.SRGBColorSpace;
      const lost = (event: Event) => { event.preventDefault(); setContextLost(true); }; gl.domElement.addEventListener('webglcontextlost', lost); cleanup.current = () => gl.domElement.removeEventListener('webglcontextlost', lost);
    }} fallback={<div className="fallback">WebGL is required to explore this scene.</div>}>
      {!breakthrough && <color attach="background" args={['#000000']} />}
      {!complete && <Suspense fallback={null}><BagSurface key={run} logoUrl={asset.logoUrl}>
        <BagExplosion asset={asset} reduced={reduced} idle={animationState === 'intact'} fracturedModelUrl={fracturedModelUrl} onPhase={setPhase} breakthrough={breakthrough} canStart={canStart} onPrepared={setSceneReady}
          onStart={() => { audio.current?.play(breakthrough ? .1 : 0); onExplosionStart?.(); }} onComplete={() => { audio.current?.stop(); setPhase('COMPLETE'); onExplosionComplete?.(); }} />
        {!breakthrough && <Reveal reduced={reduced} />}
      </BagSurface></Suspense>}
      <Framing />
    </Canvas></SceneBoundary>}
    {!contextLost && <>
      {phase === 'IDLE' && <div className="hint">{canStart && sceneReady ? 'Drag to explore · Tap the bag to break through' : 'Preparing your entrance'}</div>}
      {phase === 'IDLE' && <button className="sound-control" aria-label={muted ? 'Unmute explosion sound' : 'Mute explosion sound'} aria-pressed={muted} onClick={() => { const value = !muted; setMuted(value); audio.current?.setMuted(value); }}>{muted ? 'Sound off' : 'Sound on'}</button>}
      {complete && <button className="replay" onClick={() => { audio.current?.stop(); setRun(n => n + 1); setPhase('IDLE'); }}>Replay</button>}
    </>}
  </main>;
}
