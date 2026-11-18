'use client';
import { Component, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { BagAsset } from './PunchingBagModel';
import BagExplosion, { ExplosionState } from './BagExplosion';
import { BagSurface } from './BagSurface';
import { ExplosionAudio } from './ExplosionAudio';
import { useReducedMotion } from '../../hooks/useBagAnimation';
import { LEATHER_ASSETS } from './leather';
function SceneFallback({ onFailure, onRetry }: { onFailure: () => void; onRetry: () => void }) {
  useEffect(onFailure, [onFailure]);
  return <div className="fallback" role="alert"><p>The entrance animation is unavailable. You can still enter Nexus.</p><button onClick={onRetry}>Retry scene</button></div>;
}
class SceneBoundary extends Component<{ children: React.ReactNode; onFailure: () => void; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('Nexus entrance scene failed:', error, info.componentStack); }
  render() { return this.state.failed ? <SceneFallback onFailure={this.props.onFailure} onRetry={this.props.onRetry} /> : this.props.children; }
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
export type PunchingBagIntroProps = { asset?: BagAsset; animationState?: 'intact' | 'paused'; fracturedModelUrl?: string; onExplosionComplete?: () => void; onExplosionStart?: () => void; breakthrough?: boolean; canStart?: boolean; onSceneFailure?: () => void };
export default function PunchingBagIntro({ asset = {}, animationState = 'intact', fracturedModelUrl, onExplosionComplete, onExplosionStart, breakthrough = false, canStart = true, onSceneFailure }: PunchingBagIntroProps) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<ExplosionState>('IDLE');
  const [run, setRun] = useState(0);
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
  const [sceneFailed, setSceneFailed] = useState(false);
  const failScene = useCallback(() => {
    setSceneFailed(true); setSceneReady(false); audio.current?.stop(); onSceneFailure?.();
  }, [onSceneFailure]);
  const cleanup = useRef<() => void>(() => {});
  const retryScene = useCallback(() => {
    // Failed loader promises are cached. Evict them before remounting the canvas.
    useTexture.clear(asset.logoUrl ?? '/assets/nexus-logo.png');
    useTexture.clear('/assets/trainers/nexus-lanyard-strap.png');
    // useTexture is called with an array, so the loader cache key is the array
    // itself; clear that key as well as the individual URLs.
    useTexture.clear(LEATHER_ASSETS);
    LEATHER_ASSETS.forEach(url => useTexture.clear(url));
    if (asset.modelUrl) useGLTF.clear(asset.modelUrl);
    if (fracturedModelUrl) useGLTF.clear(fracturedModelUrl);
    cleanup.current(); setContextLost(false); setSceneFailed(false); setSceneReady(false);
    setPhase('IDLE'); setRun(value => value + 1);
  }, [asset.logoUrl, asset.modelUrl, fracturedModelUrl]);
  useEffect(() => () => cleanup.current(), []);
  return <main className={`intro${breakthrough ? ' intro-breakthrough' : ''}`} data-phase={phase} data-ready={sceneReady} onPointerDown={event => {
    if (!(event.target instanceof Element) || !event.target.closest('button')) audio.current?.unlock();
  }} aria-label="Interactive Nexus Fitness Club punching bag">
    {contextLost ? <SceneFallback onFailure={failScene} onRetry={retryScene} /> : <SceneBoundary key={run} onFailure={failScene} onRetry={retryScene}><Canvas frameloop={complete ? 'demand' : 'always'} camera={{ position: [0, .35, 13.2], fov: 35, near: .1, far: 80 }} dpr={run > 0 ? 1 : [1, breakthrough ? 1.1 : 1.25]} gl={{ antialias: run === 0, alpha: breakthrough, powerPreference: 'default', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }} onCreated={({ gl }) => {
      gl.outputColorSpace = THREE.SRGBColorSpace;
      const lost = (event: Event) => { event.preventDefault(); setContextLost(true); failScene(); }; gl.domElement.addEventListener('webglcontextlost', lost); cleanup.current = () => gl.domElement.removeEventListener('webglcontextlost', lost);
    }} fallback={<div className="fallback">The entrance animation is unavailable. Use Enter Nexus to continue.</div>}>
      {!breakthrough && <color attach="background" args={['#000000']} />}
      {!complete && <Suspense fallback={null}><BagSurface key={run} logoUrl={asset.logoUrl}>
        <BagExplosion asset={asset} reduced={reduced} idle={animationState === 'intact'} fracturedModelUrl={fracturedModelUrl} onPhase={setPhase} breakthrough={breakthrough} canStart={canStart} onPrepared={setSceneReady}
          onStart={() => { audio.current?.play(breakthrough ? .1 : 0); onExplosionStart?.(); }} onComplete={() => { audio.current?.stop(); setPhase('COMPLETE'); onExplosionComplete?.(); }} />
        {!breakthrough && <Reveal reduced={reduced} />}
      </BagSurface></Suspense>}
      <Framing />
    </Canvas></SceneBoundary>}
    {breakthrough && !complete && <div className={`entrance-campaign-ui${phase !== 'IDLE' ? ' is-breaking' : ''}`}>
      <span className="entrance-mobile-break" aria-hidden="true">BREAK</span>
      <img className="entrance-brand" src="/assets/nexus-logo.png" alt="Nexus Fitness Club" />
      <p className="entrance-location"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z" fill="#ef1328" stroke="white" strokeWidth="1.5" /><circle cx="12" cy="9" r="2.2" fill="#080808" /></svg>RAJKOT, GUJARAT</p>
      <div className="entrance-campaign-footer"><span>01 / THE BREAKTHROUGH</span><span>BUILT TO GO BEYOND.</span></div>
    </div>}
    {!contextLost && !sceneFailed && <>
      {phase === 'IDLE' && <div className="hint">{canStart && sceneReady ? 'Drag to explore · Tap the bag to break through' : 'Preparing your entrance'}</div>}
      {complete && <button className="replay" onClick={() => { audio.current?.stop(); setRun(n => n + 1); setPhase('IDLE'); }}>Replay</button>}
    </>}
  </main>;
}
