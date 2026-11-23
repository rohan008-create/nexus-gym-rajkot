'use client';
import dynamic from 'next/dynamic';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Lightning } from '../components/ui/lightning';
import './entrance.css';

const Intro = dynamic(() => import('../components/intro/PunchingBagIntro'), { ssr: false, loading: () => <div className="loading" aria-label="Loading 3D scene" /> });
// Keep the landing server-rendered while splitting its interactive scene code.
const Hero = memo(dynamic(() => import('../components/hero/HeroSection')));
type Stage = 'waiting' | 'breaking' | 'revealed';

export default function Page() {
  const [stage, setStage] = useState<Stage>('waiting');
  const [sceneFailed, setSceneFailed] = useState(false);
  const sceneFailure = useCallback(() => setSceneFailed(true), []);
  const [heroEntering, setHeroEntering] = useState(false);
  const [run, setRun] = useState(0);
  const reduced = useReducedMotion();
  const welcomeAudio = useRef<HTMLAudioElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = []; }, []);
  useEffect(() => {
    return () => { clearTimers(); navigator.vibrate?.(0); };
  }, [clearTimers]);
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
    if (welcomeAudio.current) {
      welcomeAudio.current.currentTime = 0;
      welcomeAudio.current.volume = .9;
      void welcomeAudio.current.play().catch(() => {});
    }
    setStage('breaking');
    timers.current.push(setTimeout(() => setHeroEntering(true), reduced ? 150 : 720));
    if (!reduced) timers.current.push(setTimeout(() => navigator.vibrate?.([30, 35, 15]), 250));
    // Also finish when a WebGL context is interrupted mid-animation.
    timers.current.push(setTimeout(finish, reduced ? 1000 : 2500));
  }, [stage, reduced, finish]);
  const replay = useCallback(() => {
    welcomeAudio.current?.pause();
    clearTimers(); window.scrollTo(0, 0); setHeroEntering(false);
    setSceneFailed(false); setStage('waiting'); setRun(value => value + 1);
  }, [clearTimers]);
  return <div className="nexus-entrance" data-entrance={stage}>
    <audio ref={welcomeAudio} src="/audio/welcome-nexus-natural.mp3" preload="auto" />
    <div className="entrance-landing" aria-hidden={stage !== 'revealed'} ref={node => { if (node) node.inert = stage !== 'revealed'; }}>
      <Hero entranceEnabled={heroEntering} interactive={stage === 'revealed'} onReplayIntro={replay} />
    </div>
    {stage !== 'revealed' && <div className="entrance-overlay" role="region" aria-label="Break through to Nexus">
      <Intro key={run} breakthrough onExplosionStart={start} onExplosionComplete={finish} onSceneFailure={sceneFailure} />
      {stage === 'waiting' && !sceneFailed && !reduced && <div className="entrance-thunder" aria-hidden="true">
        <Lightning className="entrance-lightning" interactive={false} placement="sides" color="#ff2945" cloudColor="#5c1222" clouds={.32} branches={3} amplitude={.85} reach={.88} frequency={.65} speed={.8} glow={.8} intensity={1.05} thickness={1.6} quality={.65} fade="bottom" opacity={.8} seed={7} />
      </div>}
      {stage === 'waiting' && <button className="entrance-skip" onClick={finish}>ENTER NEXUS ↗</button>}
    </div>}
  </div>;
}
