'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export type AboutPanel = 'About' | 'Programs' | 'Plans' | 'Location';

const pillars = [
  { title: 'Strength', headline: 'Make the next rep count.', copy: 'Build from the basics and work toward your next personal best.', photo: 'program-strength.webp' },
  { title: 'Endurance', headline: 'Go a little further.', copy: 'Find a pace you can keep and build the stamina to go further next time.', photo: 'program-cardio.webp' },
  { title: 'Confidence', headline: 'Train with confidence.', copy: 'Get to know the floor and build a routine you can make your own.', photo: 'program-personal.webp' },
];
const detail: Partial<Record<AboutPanel, string>> = {
  Programs: 'Explore your next training direction with the Nexus team.',
  Plans: 'Ask about membership options during your trial enquiry.',
  Location: 'Find your Nexus in Rajkot. Contact the team for directions.',
};

export default function AboutNexus({ panel, onTrial }: { panel: AboutPanel; onTrial: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.from('.bd-heading-line > span', {
          yPercent: 102, stagger: .09, duration: .75, ease: 'power3.out',
          scrollTrigger: { trigger: root.current, start: 'top 82%', once: true },
        });
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, []);

  const pillar = pillars[selected];
  return <div ref={root} className="about-copy nexus-story built-different" data-about-motion={reduced ? 'reduced' : 'animated'} data-selected-pillar={pillar.title.toLowerCase()}>
    <div className="bd-studio">
      <div className="bd-stage">
        <div className="bd-room" aria-hidden="true">
          {pillars.map(item => <img key={item.title} src={`/assets/photography/${item.photo}`} alt="" loading="lazy" decoding="async" data-current={item === pillar} />)}
        </div>
        <header className="bd-header">
          <h2 id="about-title" className="bd-heading">
            <span className="bd-heading-line"><span>BUILT</span></span>{' '}
            <span className="bd-heading-line bd-heading-second"><span>DIFFERENT<span className="bd-period">.</span></span></span>
          </h2>
        </header>
      </div>
      <div className="bd-floor">
        <div className="bd-features" role="group" aria-label="Explore your training pillars">
          {pillars.map((item, index) => <button type="button" key={item.title} className="bd-feature"
            aria-pressed={selected === index} aria-label={`Explore ${item.title}`} onClick={() => setSelected(index)}>
            {item.title}<span aria-hidden="true" />
          </button>)}
        </div>
        <div className="bd-story" aria-live="polite">
          <div className="bd-chapter" key={pillar.title}><h3>{pillar.headline}</h3><p>{pillar.copy}</p></div>
          {detail[panel] && <p className="bd-panel-note">{detail[panel]}</p>}
        </div>
        <button type="button" className="bd-cta" onClick={onTrial}>Book a trial <ArrowUpRight size={18} aria-hidden /></button>
      </div>
    </div>
  </div>;
}
