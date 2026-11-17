'use client';
import { useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { advantages } from './advantages';
import { useAdvantageAnimation } from './useAdvantageAnimation';

function AdvantageList() {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? selected;
  return <div className="advantage-list" onPointerLeave={() => setHovered(null)}>
    {advantages.map((item, index) => {
      const Icon = item.icon;
      const expanded = active === index;
      return <article className={`advantage-item${expanded ? ' is-active' : ''}`} key={item.id}>
        <button type="button" className="advantage-button" id={`advantage-button-${item.id}`} aria-expanded={expanded} aria-controls={`advantage-panel-${item.id}`}
          onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(index); }}
          onFocus={() => setHovered(null)}
          onClick={() => { setSelected(index); setHovered(null); }}>
          <span className="advantage-number">{item.number}</span><Icon className="advantage-icon" size={19} strokeWidth={1.5} aria-hidden />
          <span className="advantage-feature-title">{item.title}</span><ArrowUpRight className="advantage-arrow" size={18} aria-hidden />
        </button>
        <div className="advantage-panel" id={`advantage-panel-${item.id}`} role="region" aria-labelledby={`advantage-button-${item.id}`} aria-hidden={!expanded}>
          <div><p>{item.description}</p></div>
        </div>
      </article>;
    })}
  </div>;
}

export default function NexusAdvantageSection() {
  const root = useRef<HTMLElement>(null);
  useAdvantageAnimation(root);
  return <section ref={root} id="advantage" className="advantage-section" aria-labelledby="advantage-title">
    <div className="advantage-boundary" aria-hidden />
    <div className="advantage-composition">
      <div className="advantage-visual">
        <div className="advantage-scroll-visual"><div className="advantage-pointer-visual">
          <picture><source media="(max-width: 719px)" srcSet="/assets/photography/nexus-advantage-athlete-mobile.webp" /><img className="advantage-athlete" src="/assets/photography/nexus-advantage-athlete.webp" alt="Athlete in black training apparel performing a barbell deadlift in a dark gym with crimson rim lighting" width={1600} height={900} loading="lazy" decoding="async" /></picture>
        </div></div>
        <div className="advantage-haze" aria-hidden /><div className="advantage-darkness" aria-hidden /><div className="advantage-scanner" aria-hidden /><div className="advantage-vignette" aria-hidden /><div className="advantage-grain" aria-hidden />
        <span className="advantage-image-caption">BUILT AROUND YOUR NEXT REP.</span>
      </div>
      <div className="advantage-content">
        <p className="eyebrow advantage-eyebrow"><span aria-hidden />05 / THE NEXUS ADVANTAGE</p>
        <h2 id="advantage-title"><span className="advantage-heading-line"><span>NOT JUST A GYM.</span></span><span className="advantage-heading-line accent"><span>A DIFFERENT<br />STANDARD.</span></span></h2>
        <p className="advantage-introduction">Your training environment should push you forward. Discover what makes the Nexus experience different.</p>
        <AdvantageList />
      </div>
    </div>
    <div className="advantage-exit-light" aria-hidden />
  </section>;
}
