'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowUpRight, LockKeyhole, Unlock } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { membershipPlans } from './membershipPlans';
import { useReducedMotion } from '../../hooks/useBagAnimation';
const LockerScene = dynamic(() => import('./LockerScene'), { ssr: false });

export default function NexusLockerRoom({ onEnquire }: { onEnquire: (plan: string) => void }) {
  const root = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [displayed, setDisplayed] = useState<number | null>(null);
  const [settled, setSettled] = useState<number | null>(null);
  const [visiblePlan, setVisiblePlan] = useState(1);
  const [mobile, setMobile] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState('loading');
  const reduced = useReducedMotion();
  const ready = useCallback(() => setStatus('ready'), []);
  const error = useCallback(() => setStatus('error'), []);
  const choose = useCallback((index: number) => {
    setSettled(null); setVisiblePlan(index);
    setSelected(current => current === index ? null : index);
  }, []);
  useEffect(() => {
    if (displayed === selected) return;
    if (displayed === null) { setDisplayed(selected); return; }
    const timer = window.setTimeout(() => setDisplayed(selected), 150);
    return () => window.clearTimeout(timer);
  }, [selected, displayed]);
  useEffect(() => {
    const query = matchMedia('(max-width: 719px)');
    const resize = () => { setMobile(query.matches); setSelected(null); setSettled(null); };
    resize(); query.addEventListener('change', resize);
    const warm = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNearby(true); warm.disconnect(); } }, { rootMargin: '350px' });
    const visibility = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
    if (root.current) { warm.observe(root.current); visibility.observe(root.current); }
    const tab = () => setActive(!document.hidden && !!root.current && root.current.getBoundingClientRect().bottom > 0 && root.current.getBoundingClientRect().top < innerHeight);
    document.addEventListener('visibilitychange', tab);
    return () => { warm.disconnect(); visibility.disconnect(); query.removeEventListener('change', resize); document.removeEventListener('visibilitychange', tab); };
  }, []);
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const find = gsap.utils.selector(root);
      gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 88%', end: 'top 25%', scrub: .4 } })
        .fromTo(find('.locker-atmosphere'), { opacity: 0 }, { opacity: 1, duration: 1 }, 0)
        .fromTo(find('.locker-eyebrow'), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .3 }, .05)
        .fromTo(find('.locker-heading > span'), { yPercent: 100 }, { yPercent: 0, duration: .5 }, .15)
        .fromTo(find('.locker-scene-area'), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .65 }, .3)
        .fromTo(find('.locker-floor-ring'), { scaleX: .7, opacity: 0 }, { scaleX: 1, opacity: .7, duration: .5 }, .4)
        .fromTo(find('.locker-instruction'), { opacity: 0 }, { opacity: 1, duration: .3 }, .6);
    }, root);
    return () => media.revert();
  }, []);
  const plan = displayed === null ? null : membershipPlans[displayed];
  const selectedPlan = selected === null ? null : membershipPlans[selected];
  const revealed = status === 'error' || settled === selected;
  return <section ref={root} className="locker-room-section equipment-pods-section" id="membership" aria-labelledby="locker-room-title" data-locker-status={status} data-selected-plan={selectedPlan?.id || 'none'} data-revealed={!!selectedPlan && revealed}>
    <div className="locker-atmosphere" aria-hidden /><div className="locker-arc locker-arc-left" aria-hidden /><div className="locker-arc locker-arc-right" aria-hidden />
    <header className="locker-room-header"><p className="locker-eyebrow"><span>//</span> 07 / MEMBERSHIP PLANS <span>//</span></p><h2 id="locker-room-title" className="locker-heading"><span>THE NEXUS <em>ACCESS PODS.</em></span></h2><p className="locker-subtitle">YOUR AMBITION. YOUR ACCESS.</p></header>
    <div className="locker-scene-area">
      <div className="locker-floor-ring" aria-hidden />
      {nearby && status !== 'error' && <LockerScene key={mobile ? 'mobile' : 'desktop'} selected={selected} mobile={mobile} visiblePlan={visiblePlan} reduced={reduced} active={active} onSelect={choose} onEnquire={onEnquire} onSettled={setSettled} onReady={ready} onError={error} />}
      {status !== 'ready' && <p className="locker-scene-notice">{status === 'error' ? 'Explore your plan using the controls below. The 3D preview is unavailable on this device.' : 'Preparing your access pods...'}</p>}
    </div>
    <p className="locker-instruction"><LockKeyhole size={13} aria-hidden />SELECT A POD TO REVEAL YOUR NEXT LEVEL</p>
    <div className="locker-plan-controls" role="group" aria-label="Choose a membership pod">{membershipPlans.map((item, index) => <button key={item.id} type="button" aria-pressed={mobile ? visiblePlan === index : selected === index} onClick={() => { if (mobile) { setSelected(null); setSettled(null); setVisiblePlan(index); } else choose(index); }}><span>{item.number}</span>{item.name}<LockKeyhole size={13} aria-hidden /></button>)}</div>
    {mobile && <button className="locker-mobile-open" onClick={() => choose(visiblePlan)} aria-expanded={selected === visiblePlan} aria-controls="membership-details"><Unlock size={15} aria-hidden />{selected === visiblePlan ? 'CLOSE POD' : 'OPEN POD'}<ArrowUpRight size={16} aria-hidden /></button>}
    <p className="locker-demo-note">DEMO PLANS / Prices, durations and benefits will be confirmed by Nexus. No payment is taken here.</p>
    <div className="membership-details-area" id="membership-details" aria-live="polite" aria-atomic="true">
      {plan ? <article className={`membership-panel${revealed ? ' is-revealed' : ''}${displayed !== selected ? ' is-closing' : ''}`} key={plan.id} aria-labelledby="membership-plan-title"><div><p className="membership-kicker">{plan.number} / DEMO MEMBERSHIP</p><h3 id="membership-plan-title">{plan.name.toUpperCase()} <em>PLAN.</em></h3><p>{plan.description}</p></div><div className="membership-confirmation"><p className="membership-focus">{plan.focus}</p><ul>{plan.benefits.length ? plan.benefits.map(benefit => <li key={benefit}>{benefit}</li>) : <li>Benefits: to be confirmed</li>}<li>Duration: {plan.duration || 'to be confirmed'}</li><li>Price: {plan.price || 'enquire with the club'}</li></ul></div><div className="membership-action"><button className="primary-cta" onClick={() => onEnquire(plan.name)}>JOIN NOW <ArrowUpRight size={18} aria-hidden /></button><span>Prepare a {plan.name} plan enquiry</span><button className="locker-close" onClick={() => { setSelected(null); setSettled(null); }}>Close pod</button></div></article> : <div className="membership-empty"><span aria-hidden>01 / 03</span><p>Three pods. Your next chapter.<br /><span>Choose a pod to explore your membership.</span></p></div>}
    </div>
  </section>;
}


