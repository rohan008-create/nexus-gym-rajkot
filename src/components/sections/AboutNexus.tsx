'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, MoveUpRight, ScanLine } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from '../../hooks/useBagAnimation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './about-editorial.css';
const AboutWeightScene = dynamic(() => import('./AboutWeightScene'), { ssr: false });
export type AboutPanel = 'About' | 'Programs' | 'Plans' | 'Location';
const pillars = [
  { title: 'Strength', label: 'BUILD YOUR FOUNDATION', copy: 'A stronger body. A stronger everyday. Make room for your next personal best.', photo: 'program-strength.webp' },
  { title: 'Endurance', label: 'FIND YOUR NEXT GEAR', copy: 'Find your pace, go a little further, and build the energy to keep showing up.', photo: 'program-cardio.webp' },
  { title: 'Confidence', label: 'BECOME YOUR OWN PROOF', copy: 'Progress you can feel. A place to learn, find your rhythm, and back yourself.', photo: 'program-personal.webp' },
];
const detail: Record<AboutPanel, string> = {
  About: 'A place to discover what you are capable of.',
  Programs: 'Explore your next training direction with the Nexus team.',
  Plans: 'Ask the Nexus team about membership options during your trial enquiry.',
  Location: 'Find your Nexus in Rajkot. Contact the team for directions.',
};
export default function AboutNexus({ panel, onTrial }: { panel: AboutPanel; onTrial: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const motion = useRef(.5), pointer = useRef({ x: 0, y: 0 }), invalidate = useRef<() => void>(() => {});
  const [inView, setInView] = useState(false), [loaded, setLoaded] = useState(false), [visible, setVisible] = useState(true);
  const [selected, setSelected] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { setInView(entry.isIntersecting); if (entry.isIntersecting) setLoaded(true); });
    if (root.current) observer.observe(root.current);
    const visibility = () => setVisible(!document.hidden);
    visibility(); document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.from('.bd-heading-line > span', { yPercent: 110, rotate: 4, opacity: 0, stagger: .12, duration: 1.15, ease: 'power4.out', scrollTrigger: { trigger: root.current, start: 'top 82%', once: true } });
        gsap.from('.bd-reveal', { y: 35, opacity: 0, stagger: .1, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: root.current, start: 'top 72%', once: true } });
        gsap.from('.bd-feature', { y: 45, opacity: 0, stagger: .12, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.bd-features', start: 'top 90%', once: true } });
        ScrollTrigger.create({ trigger: root.current, start: 'top bottom', end: 'bottom top', onUpdate: self => { motion.current = self.progress; invalidate.current(); } });
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, []);
  return <div ref={root} className="about-copy nexus-story built-different" data-about-motion={reduced ? 'reduced' : 'animated'} data-selected-pillar={pillars[selected].title.toLowerCase()}>
    <div className="bd-topline"><span><i /> THE NEXUS STANDARD</span><span>RAJKOT, INDIA <b>01 — 03</b></span></div>
    <header className="bd-header">
      <h2 id="about-title" className="bd-heading"><span className="bd-heading-line"><span>BUILT</span></span><span className="bd-heading-line"><span className="bd-heading-accent">DIFFERENT<span className="bd-period">.</span></span></span></h2>
      <div className="bd-manifesto bd-reveal"><MoveUpRight size={35} strokeWidth={1.2} aria-hidden /><p>A DIFFERENT KIND<br />OF STRONG.</p><span>More than a place to train.<br />A reason to show up.</span></div>
    </header>
    <div className="bd-studio bd-reveal">
      <div className="bd-stage" onPointerMove={event => { const bounds = event.currentTarget.getBoundingClientRect(); pointer.current = { x: (event.clientX - bounds.left) / bounds.width * 2 - 1, y: (event.clientY - bounds.top) / bounds.height * 2 - 1 }; invalidate.current(); }} onPointerLeave={() => { pointer.current = { x: 0, y: 0 }; invalidate.current(); }}>
        <div className="bd-stage-grid" aria-hidden /><span className="bd-stage-monogram" aria-hidden>N</span>
        <div className="bd-stage-top"><span><ScanLine size={13} aria-hidden /> THE NEXT REP / NEXUS</span><span className="bd-live-dot">{reduced ? 'THE STUDIO' : 'LIVE IN 3D'}</span></div>
        <div className="bd-sculpture" aria-hidden>{loaded && <AboutWeightScene progress={motion} pointer={pointer} invalidateRef={invalidate} selected={selected} active={inView && visible} reduced={reduced} />}</div>
        <div className="bd-stage-bottom"><span>0{selected + 1}<small> / 03</small></span><span>MOVE WITH PURPOSE.<br />MAKE IT YOURS.</span></div>
      </div>
      <div className="bd-story">
        <span className="bd-story-label">YOUR NEXT CHAPTER</span>
        <div className="bd-chapter" key={selected} aria-live="polite"><span className="bd-chapter-index">0{selected + 1} / {pillars[selected].label}</span><h3>{selected === 0 ? <>Not just stronger.<br /><em>More you.</em></> : selected === 1 ? <>Find your pace.<br /><em>Go further.</em></> : <>Back yourself.<br /><em>Own your next.</em></>}</h3><p>{pillars[selected].copy}</p></div>
        <div className="bd-story-rule" /><p className="bd-story-description">Your effort. Your pace. A space that brings out your next level—one session at a time.</p>
        {panel !== 'About' && <p className="bd-panel-note">{detail[panel]}</p>}
        <button className="bd-cta" onClick={onTrial}><span>FIND YOUR NEXUS</span><ArrowUpRight size={20} aria-hidden /></button><span className="bd-cta-note">Start with a conversation. Make your next move.</span>
      </div>
    </div>
    <div className="bd-features" role="group" aria-label="Explore your training pillars">{pillars.map((item, i) => <button type="button" key={item.title} className={`bd-feature${selected === i ? ' is-selected' : ''}`} aria-pressed={selected === i} aria-label={`Explore ${item.title}`} onClick={() => { setSelected(i); invalidate.current(); }}>
      <img src={`/assets/photography/${item.photo}`} alt="" loading="lazy" /><span className="bd-feature-shade" aria-hidden /><span className="bd-feature-top"><span>0{i + 1} / THE NEXUS WAY</span><ArrowUpRight size={20} aria-hidden /></span><span className="bd-feature-copy"><span>{item.label}</span><strong>{item.title}<i>.</i></strong></span><span className="bd-feature-progress" aria-hidden />
    </button>)}</div>
    <footer className="bd-footer"><span>YOUR EFFORT. YOUR PACE. YOUR PROGRESS.</span><span>BUILT FOR <b>WHAT’S NEXT ↗</b></span></footer>
  </div>;
}
