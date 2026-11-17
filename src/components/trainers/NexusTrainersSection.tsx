'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowUpRight, MousePointer2, RotateCw } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { trainers } from './trainers';
const Lanyard = dynamic(() => import('./Lanyard'), { ssr: false });

function TrainerBadge({ index }: { index: number }) {
  const trainer = trainers[index];
  const [flipSignal, setFlipSignal] = useState(0);
  const [back, setBack] = useState(false);
  const [status, setStatus] = useState('loading');
  return <div className="trainer-installation" data-trainer={trainer.id} data-status={status}>
    <div className="trainer-lanyard-slot">
      <Lanyard frontImage={trainer.frontImage} backImage={trainer.backImage} strapImage="/assets/trainers/nexus-lanyard-strap.png" imageFit="contain" orientation="portrait" finish="metallic" metal="graphite" cardColor="#101010" strapColor="#111111" strapWidth={.7} size={.53} cornerRadius={.15} anchor="center" strapLength={trainer.strapLength} gravity={1} damping={.45} elasticity={.55} breeze={.2} interactive intro introDelay={index * .16} flipSignal={flipSignal} onFlip={setBack} onReady={() => setStatus('ready')} onError={() => setStatus('error')} />
      {status !== 'ready' && <div className="trainer-render-fallback"><img src={trainer.frontImage} alt={`${trainer.name} illustrative badge`} width={768} height={1080} /><span>{status === 'error' ? '3D preview unavailable. Profile details are below.' : 'Preparing interactive badge…'}</span></div>}
    </div>
    <div className="trainer-badge-label"><span>{String(index + 1).padStart(2, '0')} / ELITE TEAM</span><button type="button" onClick={() => setFlipSignal(signal => signal + 1)} disabled={status !== 'ready'} aria-label={`Flip ${trainer.name} badge`} aria-pressed={back}><RotateCw size={13} aria-hidden />{back ? 'FRONT' : 'FLIP'}</button></div>
  </div>;
}

export default function NexusTrainersSection() {
  const root = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(0);
  const [nearby, setNearby] = useState(false);
  useEffect(() => {
    const query = matchMedia('(max-width: 719px)');
    const update = () => setMobile(query.matches);
    update(); setMounted(true); query.addEventListener('change', update);
    const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) { setNearby(true); observer.disconnect(); } }, { rootMargin: '300px' });
    if (root.current) observer.observe(root.current);
    return () => { query.removeEventListener('change', update); observer.disconnect(); };
  }, []);
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const find = gsap.utils.selector(root);
      gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 88%', end: 'top 30%', scrub: .4 } })
        .fromTo(find('.trainers-eyebrow'), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .35 }, 0)
        .fromTo(find('.trainers-heading > span'), { yPercent: 105 }, { yPercent: 0, stagger: .1, duration: .5 }, .1)
        .fromTo(find('.trainers-introduction'), { opacity: 0 }, { opacity: 1, duration: .4 }, .3)
        .fromTo(find('.trainers-stage'), { opacity: 0 }, { opacity: 1, duration: .6 }, .35)
        .fromTo(find('.trainers-instruction'), { opacity: 0 }, { opacity: 1, duration: .3 }, .7);
    }, root);
    return () => media.revert();
  }, []);
  const trainer = trainers[selected];
  return <section ref={root} id="trainers" className="trainers-section" aria-labelledby="trainers-title">
    <header className="trainers-header"><p className="eyebrow trainers-eyebrow"><span aria-hidden />06 / THE NEXUS TEAM</p><h2 id="trainers-title" className="trainers-heading"><span>MEET THE <em>ELITE.</em></span></h2><p className="trainers-subtitle">THE PEOPLE BEHIND YOUR PROGRESS.</p><p className="trainers-introduction">Meet the people dedicated to helping you move forward.</p></header>
    <p className="trainers-demo-note">DEMO PROFILES · Illustrative portraits and sample training focuses. Actual Nexus team details coming soon.</p>
    <div className="trainers-stage" aria-label="Interactive trainer badges">
      {mounted && nearby ? (mobile ? <TrainerBadge key={selected} index={selected} /> : trainers.map((item, index) => <TrainerBadge key={item.id} index={index} />)) : <div className="trainers-stage-placeholder" aria-hidden />}
    </div>
    <p className="trainers-instruction"><MousePointer2 size={13} aria-hidden /><span>DRAG TO INTERACT <i>•</i> CLICK TO FLIP</span></p>
    <div className="trainers-profile-area">
      <div className="trainers-selector" role="group" aria-label="Choose a demo trainer">{trainers.map((item, index) => <button key={item.id} type="button" aria-pressed={selected === index} aria-controls="trainer-profile" onClick={() => setSelected(index)}><span>{String(index + 1).padStart(2, '0')}</span>{item.name}<ArrowUpRight size={14} aria-hidden /></button>)}</div>
      <article className="trainer-profile" id="trainer-profile" aria-live="polite" aria-atomic="true"><div><p className="trainer-profile-kicker">DEMO / ELITE TRAINER PROFILE</p><h3>{trainer.name}</h3><p className="trainer-specialization">{trainer.specialization}</p></div><div><p>{trainer.bio}</p><ul aria-label="Training focus">{trainer.trainingFocus.map(focus => <li key={focus}>{focus}</li>)}</ul></div></article>
    </div>
  </section>;
}
