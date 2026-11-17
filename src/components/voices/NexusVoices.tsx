'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDownRight, Pause, Play } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getVoicesContent, SHOW_DEMO_TESTIMONIALS, testimonials } from './testimonials';
import TestimonialCard, { StoryPlaceholder } from './TestimonialCard';
import Marquee from './Marquee';
import './nexusVoices.css';

export default function NexusVoices() {
  const root = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false), [reading, setReading] = useState(false);
  const content = getVoicesContent(testimonials, SHOW_DEMO_TESTIMONIALS);
  useEffect(() => {
    const section = root.current;
    if (!section) return;
    let visible = false;
    const sync = () => section.dataset.running = String(visible && !document.hidden);
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
    observer.observe(section); document.addEventListener('visibilitychange', sync);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, []);
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const select = gsap.utils.selector(root);
      gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 82%', toggleActions: 'play none none none' } })
        .from(select('.voices-eyebrow'), { opacity: 0, y: 12, duration: .4 })
        .from(select('.voices-headline > span'), { opacity: 0, yPercent: 45, duration: .65, stagger: .1, ease: 'power3.out' }, .1)
        .from(select('.voices-description, .voices-status'), { opacity: 0, y: 12, duration: .45, stagger: .06 }, .32)
        .from(select('.voices-accent'), { scaleX: 0, transformOrigin: 'left', duration: .6 }, .35)
        .from(select('.voices-stage'), { opacity: 0, y: 30, duration: .8, ease: 'power2.out' }, .2);
    }, root);
    return () => media.revert();
  }, []);
  return <section ref={root} id="voices" className="nexus-voices" data-mode={content.mode} data-running="false" data-paused={paused} aria-labelledby="voices-title">
    <div className="voices-layout">
      <div className="voices-editorial">
        <p className="voices-eyebrow"><span />10 / THE COMMUNITY</p>
        <p className="voices-section-name">THE NEXUS VOICES</p>
        <h2 id="voices-title" className="voices-headline"><span>BUILT ON</span><span>REAL</span><span>EXPERIENCES.</span></h2>
        <p className="voices-description">Discover what our members have to say about their fitness journey at NEXUS.</p>
        <span className="voices-accent" aria-hidden />
        {content.mode === 'empty' && <div className="voices-status"><span className="voices-status-dot" aria-hidden /><div><strong>MEMBER STORIES. COMING SOON.</strong><p>We’re making room for authentic voices.<br />Approved member experiences will appear here.</p></div></div>}
        {content.mode === 'demo' && <div className="voices-status voices-demo-notice"><span className="voices-status-dot" aria-hidden /><div><strong>AI-GENERATED DEMO TESTIMONIALS</strong><p>Fictional sample names, placeholder portraits and AI-written text. These are not genuine NEXUS member experiences or verified reviews.</p></div></div>}
        <div className="voices-controls"><button type="button" aria-pressed={paused} aria-controls="voices-marquee" onClick={() => setPaused(value => !value)}>{paused ? <Play size={13} aria-hidden /> : <Pause size={13} aria-hidden />}{paused ? 'Resume motion' : 'Pause motion'}</button>{content.items.length > 0 && <button type="button" aria-expanded={reading} aria-controls="voices-readable" onClick={() => setReading(value => !value)}>{reading ? 'Close stories' : 'Read all stories'}<ArrowDownRight size={14} aria-hidden /></button>}</div>
      </div>
      <div className="voices-visual">
        <div className="voices-stage" id="voices-marquee" aria-hidden="true">
          <div className="voices-plane">{Array.from({ length: 4 }, (_, column) => {
            const assigned = content.items.filter((_, index) => index % 4 === column);
            if (!assigned.length && content.items.length) assigned.push(content.items[column % content.items.length]);
            const items = assigned.length ? Array.from({ length: Math.max(4, assigned.length) }, (_, index) => assigned[index % assigned.length]) : [];
            return <Marquee key={column} reverse={column % 2 === 0} duration={40 + column * 2}>{items.length ? items.map((item, index) => <TestimonialCard key={`${item.id}-${index}`} item={item} preview={content.mode === 'demo'} />) : [0, 1, 2, 3].map(index => <StoryPlaceholder key={index} index={(index + column) % 3} />)}</Marquee>;
          })}</div>
          <div className="voices-fade voices-fade-vertical" /><div className="voices-fade voices-fade-horizontal" />
        </div>
        <div className="voices-visual-caption"><span className="voices-caption-line" /><span>{content.mode === 'empty' ? 'THE NEXT STORY COULD BE YOURS.' : content.mode === 'demo' ? 'DESIGN DEMO / SAMPLE STORIES ONLY.' : 'INDIVIDUAL STORIES. ONE COMMUNITY.'}</span><span className="voices-caption-number">N° 10</span></div>
      </div>
    </div>
    {content.items.length > 0 && <div id="voices-readable" className={`voices-readable${reading ? ' is-open' : ''}`}><h3>{content.mode === 'demo' ? 'AI-generated demo samples — not genuine member feedback' : 'Member experiences'}</h3><div>{content.items.map(item => <TestimonialCard key={item.id} item={item} preview={content.mode === 'demo'} />)}</div></div>}
  </section>;
}
