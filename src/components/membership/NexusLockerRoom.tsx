'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowUpRight, LockKeyhole, Unlock, Check, ShieldCheck } from 'lucide-react';
import { membershipPlans } from './membershipPlans';
import { useReducedMotion } from '../../hooks/useBagAnimation';
import './vault.css';
const LockerScene = dynamic(() => import('./LockerScene'), { ssr: false });

export default function NexusLockerRoom({ onEnquire }: { onEnquire: (plan: string) => void }) {
  const root = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [settled, setSettled] = useState<number | null>(null);
  const [mobile, setMobile] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState('loading');
  const reduced = useReducedMotion();
  const ready = useCallback(() => setStatus('ready'), []);
  const error = useCallback(() => setStatus('error'), []);
  const choose = useCallback((index: number) => { setSettled(null); setSelected(current => current === index ? null : index); }, []);
  useEffect(() => {
    const query = matchMedia('(max-width: 719px)');
    const resize = () => setMobile(query.matches);
    resize(); query.addEventListener('change', resize);
    let frame = 0;
    const update = () => {
      const bounds = root.current?.getBoundingClientRect();
      setActive(!document.hidden && !!bounds && bounds.bottom > 0 && bounds.top < innerHeight);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    const warm = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNearby(true); warm.disconnect(); } }, { rootMargin: '350px' });
    const visibility = new IntersectionObserver(update);
    if (root.current) { warm.observe(root.current); visibility.observe(root.current); }
    document.addEventListener('visibilitychange', update);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => { cancelAnimationFrame(frame); warm.disconnect(); visibility.disconnect(); query.removeEventListener('change', resize); document.removeEventListener('visibilitychange', update); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, []);
  const plan = selected === null ? null : membershipPlans[selected];
  const revealed = !!plan && (status === 'error' || settled === selected);
  return <section ref={root} className="nexus-vault-section" id="membership" aria-labelledby="vault-title" data-locker-status={status} data-selected-plan={plan?.id || 'none'} data-revealed={revealed} data-vault-active={active}>
    <div className="vault-atmosphere" aria-hidden />
    <header className="vault-header"><p className="vault-eyebrow"><span>07 / MEMBERSHIP</span><span>RESERVED FOR YOUR NEXT SELF</span></p><div className="vault-title-row"><h2 id="vault-title">THE NEXUS <em>VAULT.</em></h2><p>Your ambition holds the key. <br />Unlock what comes next.</p></div></header>
    <div className="vault-layout">
      <div className="vault-stage">
        <div className="vault-stage-top"><span><i /> NEXUS SECURITY SYSTEM</span><span>NX — 007</span></div>
        <div className="vault-scene-area">
          {nearby && status !== 'error' && <LockerScene selected={selected} mobile={mobile} reduced={reduced} active={active || (selected !== null && settled !== selected)} onSelect={choose} onSettled={setSettled} onReady={ready} onError={error} />}
          {status !== 'ready' && <p className="vault-scene-notice">{status === 'error' ? 'Your next level is still within reach. Choose a plan to explore.' : 'Preparing the vault...'}</p>}
        </div>
        <div className="vault-stage-bottom"><span>{revealed ? <Unlock size={13} /> : <LockKeyhole size={13} />}{revealed ? 'ACCESS GRANTED' : plan ? 'AUTHENTICATING ACCESS' : 'AWAITING YOUR SELECTION'}</span><span>RAJKOT / GUJARAT</span></div>
      </div>
      <div className="vault-console">
        <p className="vault-console-kicker"><span>01 — SELECT YOUR ACCESS</span><ShieldCheck size={17} /></p>
        <h3>Greatness.<br /><em>On your terms.</em></h3>
        <p className="vault-console-description">Three ways in. One commitment to yourself.<br />Choose your plan to unlock the vault.</p>
        <div className="vault-plan-controls" role="group" aria-label="Choose a membership plan">{membershipPlans.map((item, index) => <button key={item.id} type="button" aria-pressed={selected === index} aria-controls="membership-details" onClick={() => choose(index)}><span className="vault-plan-number">{item.number}</span><span className="vault-plan-name">{item.name}<small>{item.focus}</small></span>{selected === index ? <Unlock size={18} /> : <ArrowUpRight size={18} />}</button>)}</div>
        <div id="membership-details" className="vault-details" aria-live="polite" aria-busy={!!plan && !revealed}>
          {plan && revealed ? <article className="vault-plan-detail" key={plan.id}><p className="vault-access-label"><Check size={12} />ACCESS GRANTED / {plan.number}</p><h4>{plan.name.toUpperCase()} <em>ACCESS.</em></h4><p>{plan.description}</p><ul>{plan.benefits.map(benefit => <li key={benefit}>{benefit}</li>)}<li>{plan.duration || 'Duration tailored with the club'}</li><li>{plan.price || 'Contact Nexus for pricing & benefits'}</li></ul><button className="vault-join" onClick={() => onEnquire(plan.name)}>ENQUIRE ABOUT {plan.name.toUpperCase()}<ArrowUpRight size={18} /></button><button className="vault-close" onClick={() => { setSelected(null); setSettled(null); }}>Close vault</button></article> : <div className="vault-locked-state"><LockKeyhole size={20} /><p>{plan ? 'Unlocking your next chapter...' : 'Your next chapter is locked in here.'}<span>{plan ? 'The wheel turns. Your journey begins.' : 'Select Basic, Pro or Elite to reveal your access.'}</span></p><span className="vault-status-dot" /></div>}
        </div>
        <p className="vault-plan-note">Plans are a preview. Nexus will confirm pricing, duration and benefits. No payment is taken here.</p>
      </div>
    </div>
    <footer className="vault-footer"><span>BUILT BY EFFORT. OPENED BY YOU.</span><span>YOUR AMBITION. YOUR ACCESS. <ArrowUpRight size={13} /></span></footer>
  </section>;
}
