'use client';
import { Component, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import BattleRopeMesh from './BattleRopeMesh';
import BattleRopeLighting from './BattleRopeLighting';
import { RopeMotion, useRopeScrollMotion } from './RopeScrollController';
import SmokeEffect from '../intro/SmokeEffect';

export type RopeStatus = 'loading' | 'ready' | 'error';
type Props = RopeMotion & { reduced: boolean; onStatus: (status: RopeStatus) => void; active?: boolean };
class SceneBoundary extends Component<{ children: React.ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function Scene(props: Props) {
  const mobile = useThree(s => s.size.width < 720);
  const { gl, scene, camera, invalidate } = useThree();
  const [geometryReady, setGeometryReady] = useState(false);
  const ready = useCallback(() => setGeometryReady(true), []);
  useEffect(() => {
    if (!geometryReady) return;
    let cancelled = false, frame = 0, remaining = 4;
    const timer = setTimeout(() => {
      void gl.compileAsync(scene, camera).then(() => {
        const warm = () => {
          if (cancelled) return;
          invalidate();
          if (--remaining > 0) frame = requestAnimationFrame(warm);
          else props.onStatus('ready');
        };
        frame = requestAnimationFrame(warm);
      }).catch(() => { if (!cancelled) props.onStatus('error'); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); cancelAnimationFrame(frame); };
  }, [geometryReady, gl, scene, camera, invalidate, props.onStatus]);
  useRopeScrollMotion(props, props.reduced);
  return <><BattleRopeLighting /><BattleRopeMesh {...props} mobile={mobile} onReady={ready} />
    <group position={[2.2, .9, -1]}><SmokeEffect animate={!props.reduced} /></group>
    {!props.reduced && <Sparkles count={mobile ? 9 : 22} position={[mobile ? .8 : 2.5, -4, -1]} scale={[3, 17, 3]} size={.5} speed={.08} opacity={.16} color="#b0a1a4" />}
  </>;
}
export default function BattleRopeScene(props: Props) {
  const [dpr, setDpr] = useState<number | [number, number]>([1, 1.65]);
  const [visible, setVisible] = useState(true);
  const container = useRef<HTMLDivElement>(null);
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => () => cleanup.current(), []);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={container} className="persistent-scene" aria-label="Animated three-dimensional braided battle rope">
    <SceneBoundary onError={() => props.onStatus('error')}>
      <Canvas frameloop={visible && props.active !== false ? 'always' : 'demand'} dpr={dpr} camera={{ position: [0, .1, 10.2], fov: 35, near: .1, far: 50 }} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
        const lost = (event: Event) => { event.preventDefault(); props.onStatus('error'); }; gl.domElement.addEventListener('webglcontextlost', lost); cleanup.current = () => gl.domElement.removeEventListener('webglcontextlost', lost);
      }} fallback={<span className="webgl-note">3D preview unavailable on this device.</span>}>
        {props.active !== false && <PerformanceMonitor flipflops={2} onDecline={() => setDpr(1)} onFallback={() => setDpr(1)} />}
        <Suspense fallback={null}><Scene {...props} /></Suspense>
      </Canvas>
    </SceneBoundary>
  </div>;
}
