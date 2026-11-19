'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Plus, Minus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useReducedMotion } from '../../hooks/useBagAnimation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './about-editorial.css';
const AboutWeightScene = dynamic(() => import('./AboutWeightScene'), { ssr: false });
export type AboutPanel = 'About' | 'Programs' | 'Plans' | 'Location';
const pillars = [
  { title: 'Strength', label: 'BUILD YOUR FOUNDATION', copy: 'A stronger body. A stronger everyday. Make room for your next personal best.', photo: 'program-strength.webp', alt: 'Strength training with gym equipment' },
  { title: 'Endurance', label: 'FIND YOUR NEXT GEAR', copy: 'Find your pace, go a little further, and build the energy to keep showing up.', photo: 'program-cardio.webp', alt: 'Cardio training equipment' },
  { title: 'Confidence', label: 'BECOME YOUR OWN PROOF', copy: 'Progress you can feel. A place to learn, find your rhythm, and back yourself.', photo: 'program-personal.webp', alt: 'Personal training session' },
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
  const reduced = useReducedMotion();
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { setInView(entry.isIntersecting); if (entry.isIntersecting) setLoaded(true); });
    if (root.current) observer.observe(root.current);
    const visibility = () => setVisible(!document.hidden); visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const [selected, setSelected] = useState(0);
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.from('.nexus-story-heading > span', { yPercent: 105, rotate: 3, opacity: 0, stagger: .12, duration: 1, ease: 'power4.out', scrollTrigger: { trigger: root.current, start: 'top 85%', toggleActions: 'play none none none' } });
        gsap.from('.nexus-story-stage, .nexus-story-content', { y: 45, opacity: 0, duration: .9, stagger: .15, ease: 'power3.out', scrollTrigger: { trigger: '.nexus-story-grid', start: 'top 88%', toggleActions: 'play none none none' } });
        ScrollTrigger.create({ trigger: root.current, start: 'top bottom', end: 'bottom top', onUpdate: self => { motion.current = self.progress; invalidate.current(); } });
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, []);
  return <div ref={root} className="about-copy nexus-story" data-about-motion="3d">
    <div className="nexus-story-meta"><span><i /> THE NEXUS STANDARD</span><span>RAJKOT, GUJARAT / 01</span></div>
    <header className="nexus-story-header"><h2 id="about-title" className="nexus-story-heading"><span>BUILT</span><span>DIFFERENT<span className="nexus-story-dot">.</span></span></h2><div className="nexus-story-aside"><ArrowDownRight size={52} strokeWidth={1} aria-hidden="true" /><p>More than a place to train.<br />A reason to show up.</p></div></header>
    <div className="nexus-story-grid">
      <div className="nexus-story-stage" onPointerMove={event => { const bounds = event.currentTarget.getBoundingClientRect(); pointer.current = { x: (event.clientX - bounds.left) / bounds.width * 2 - 1, y: (event.clientY - bounds.top) / bounds.height * 2 - 1 }; invalidate.current(); }} onPointerLeave={() => { pointer.current = { x: 0, y: 0 }; invalidate.current(); }}>
        <span className="nexus-stage-watermark" aria-hidden="true">N</span>
        <div className="nexus-stage-backup" aria-hidden="true"><img src="/assets/photography/about-gym.webp" alt="" loading="lazy" /></div>
        <div className="nexus-stage-canvas" aria-hidden="true">{loaded && <AboutWeightScene progress={motion} pointer={pointer} invalidateRef={invalidate} selected={selected} active={inView && visible} reduced={reduced} />}</div>
        <div className="nexus-stage-top"><span>NEXUS / THE NEXT REP</span><span>0{selected + 1}</span></div>
        <div className="nexus-stage-label"><span>{pillars[selected].label}</span><strong>{pillars[selected].title.toUpperCase()}.</strong></div>
        <div className="nexus-stage-bottom"><span>DESIGNED FOR YOUR NEXT LEVEL</span><ArrowUpRight size={20} aria-hidden="true" /></div>
      </div>
      <div className="nexus-story-content"><p className="nexus-story-eyebrow">THIS IS YOUR STARTING POINT.</p><h3>Not just stronger.<br /><em>More you.</em></h3><p className="nexus-story-intro">Nexus is where effort finds direction. Build strength, find your rhythm, and move forward together—one session at a time.</p>
        <div className="nexus-story-pillars">{pillars.map((item,i) => <div key={item.title} className={`nexus-story-pillar${selected === i ? ' is-selected' : ''}`}><button type="button" aria-expanded={selected === i} aria-controls={`nexus-pillar-${i}`} onClick={() => setSelected(i)}><span className="nexus-story-number">0{i+1}</span><span>{item.title}</span>{selected === i ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}</button><div id={`nexus-pillar-${i}`} hidden={selected !== i}><p>{item.copy}</p></div></div>)}</div>
        {panel !== 'About' && <p className="nexus-story-panel" aria-live="polite">{detail[panel]}</p>}
        <button className="nexus-story-cta" onClick={onTrial}>FIND YOUR NEXUS <span><ArrowUpRight size={22} aria-hidden="true" /></span></button><span className="nexus-story-cta-note">Your next chapter starts with a trial.</span>
      </div>
    </div>
    <footer className="nexus-story-footer"><span>YOUR EFFORT. YOUR PACE. YOUR PROGRESS.</span><span>NEXUS FITNESS CLUB <i>↗</i></span></footer>
  </div>;
}
