'use client';
import dynamic from 'next/dynamic';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import './entrance.css';

const Intro = dynamic(() => import('../components/intro/PunchingBagIntro'), { ssr: false, loading: () => <div className="loading" aria-label="Loading 3D scene" /> });
const Hero = memo(dynamic(() => import('../components/hero/HeroSection'), { ssr: false }));
type Stage = 'waiting' | 'breaking' | 'revealed';

export default function Page() {
  const [stage, setStage] = useState<Stage>('waiting');
  const [prepared, setPrepared] = useState(false);
  const [mountHero, setMountHero] = useState(false);
  const [heroEntering, setHeroEntering] = useState(false);
  const [run, setRun] = useState(0);
  const reduced = useReducedMotion();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = []; }, []);
  const ready = useCallback(() => setPrepared(true), []);
  useEffect(() => {
    const timer = setTimeout(() => setMountHero(true), 600);
    return () => { clearTimeout(timer); clearTimers(); navigator.vibrate?.(0); };
  }, [clearTimers]);
  useEffect(() => {
    if (!mountHero) return;
    // HTML remains usable even if the optional rope renderer stalls.
    const timer = setTimeout(ready, 10000);
    return () => clearTimeout(timer);
  }, [mountHero, ready]);
  useEffect(() => {
    if (stage === 'revealed') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const blockScroll = (event: Event) => event.preventDefault();
    const blockKeys = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key) && !(event.target instanceof HTMLButtonElement)) event.preventDefault();
    };
    window.addEventListener('wheel', blockScroll, { passive: false, capture: true });
    window.addEventListener('touchmove', blockScroll, { passive: false, capture: true });
    window.addEventListener('keydown', blockKeys);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('wheel', blockScroll, true);
      window.removeEventListener('touchmove', blockScroll, true);
      window.removeEventListener('keydown', blockKeys);
    };
  }, [stage]);
  const finish = useCallback(() => {
    clearTimers(); setHeroEntering(true); setStage('revealed');
    navigator.vibrate?.(0); window.scrollTo(0, 0);
    requestAnimationFrame(() => document.getElementById('hero-title')?.focus({ preventScroll: true }));
  }, [clearTimers]);
  const start = useCallback(() => {
    if (stage !== 'waiting') return;
    setStage('breaking');
    timers.current.push(setTimeout(() => setHeroEntering(true), reduced ? 150 : 720));
    if (!reduced) timers.current.push(setTimeout(() => navigator.vibrate?.([30, 35, 15]), 250));
    // Also finish when a WebGL context is interrupted mid-animation.
    timers.current.push(setTimeout(finish, reduced ? 1000 : 2500));
  }, [stage, reduced, finish]);
  const replay = useCallback(() => {
    clearTimers(); window.scrollTo(0, 0); setHeroEntering(false);
    setStage('waiting'); setRun(value => value + 1);
  }, [clearTimers]);
  return <div className="nexus-entrance" data-entrance={stage}>
    {mountHero && <div className="entrance-landing" aria-hidden={stage !== 'revealed'} ref={node => { if (node) node.inert = stage !== 'revealed'; }}>
      <Hero entranceEnabled={heroEntering} interactive={stage === 'revealed'} onPrepared={ready} onReplayIntro={replay} />
    </div>}
    {stage !== 'revealed' && <div className="entrance-overlay" role="region" aria-label="Break through to Nexus">
      <Intro key={run} breakthrough canStart={prepared} onExplosionStart={start} onExplosionComplete={finish} />
      {stage === 'waiting' && <button className="entrance-skip" disabled={!prepared} onClick={finish}>{prepared ? 'ENTER NEXUS ↗' : 'PREPARING NEXUS'}</button>}
    </div>}
  </div>;
}
