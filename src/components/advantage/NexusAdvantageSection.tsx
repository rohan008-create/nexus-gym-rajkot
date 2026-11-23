'use client';
import { useRef, useState } from 'react';
import { advantages } from './advantages';
import { useAdvantageAnimation } from './useAdvantageAnimation';
import './advantage-editorial.css';

const stories = [
  { title: 'Premium equipment', photo: 'athlete-transparent.webp', alt: 'Athlete standing with dumbbells, isolated on a transparent background', line: 'Built for your next breakthrough.', tag: 'BETTER TOOLS. BIGGER POSSIBILITIES.' },
  { title: 'Supportive environment', photo: 'coaching-transparent.webp', alt: 'Trainer coaching a woman with a dumbbell, isolated on a transparent background', line: 'A little support. A lot of possibility.', tag: 'YOUR PACE. YOUR PLACE.' },
  { title: 'Goal-focused training', photo: 'athlete-transparent.webp', alt: 'Athlete holding dumbbells, isolated on a transparent background', line: 'Your ambition. A clear direction.', tag: 'EVERY SESSION HAS A PURPOSE.' },
  { title: 'Fitness community', photo: 'community-transparent.webp', alt: 'Two athletes exchanging a fist bump, isolated on a transparent background', line: 'Good people. Great energy.', tag: 'STRONGER, TOGETHER.' },
];

export default function NexusAdvantageSection() {
  const root = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? selected;
  const story = stories[active];
  useAdvantageAnimation(root);
  return <section ref={root} id="advantage" className="advantage-section nexus-standard" aria-labelledby="advantage-title" data-active-feature={advantages[active].id}>
    <div className="ns-topline ns-enter"><span>05 / THE NEXUS ADVANTAGE</span><span>THE DIFFERENCE IS PERSONAL.</span></div>
    <header className="ns-heading ns-enter">
      <h2 id="advantage-title"><span>NOT JUST A GYM.</span>A DIFFERENT<br /><em>STANDARD.</em></h2>
      <p>Better equipment. The right guidance.{' '}<br />People who bring out your best.<br /><span>A space built around your progress.</span></p>
    </header>
    <div className="ns-layout">
      <div className="ns-photo-column ns-enter">
        <div className="ns-photo-frame">
          <span className="ns-backdrop-word" aria-hidden>MORE.</span>
          <div className="ns-ground-shadow" aria-hidden />
          <div key={story.photo} className="ns-photo-picture">
            <img className="ns-photo" src={`/assets/advantage/${story.photo}`} alt={story.alt} width={1024} height={1536} loading="lazy" decoding="async" />
          </div>
          <span className="ns-image-edition" aria-hidden>THE NEXUS STANDARD / 0{active + 1}</span>
        </div>
        <div className="ns-photo-caption"><span>{story.tag}</span><p>{story.line}</p></div>
      </div>
      <div className="ns-detail-column ns-enter">
        <div className="ns-detail-intro"><span className="ns-kicker">FOUR REASONS TO SHOW UP.</span><h3>Made for your<br /><em>next level.</em></h3><p>Your training environment should push you forward. Discover what makes the Nexus experience different.</p></div>
        <div className="ns-features" onPointerLeave={() => setHovered(null)}>
          {advantages.map((item, index) => {
            const expanded = active === index;
            return <article key={item.id} className={`ns-feature${expanded ? ' is-active' : ''}`}>
              <button type="button" className="ns-feature-button" id={`advantage-button-${item.id}`} aria-expanded={expanded} aria-controls={`advantage-panel-${item.id}`}
                onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(index); }}
                onFocus={() => setHovered(null)} onClick={() => { setSelected(index); setHovered(null); }}>
                <span className="ns-feature-number">{item.number}</span><span className="ns-feature-title">{stories[index].title}</span><span className="ns-feature-toggle" aria-hidden>{expanded ? '−' : '+'}</span>
              </button>
              <div className="ns-feature-panel" id={`advantage-panel-${item.id}`} role="region" aria-labelledby={`advantage-button-${item.id}`} aria-hidden={!expanded}>
                <div><p>{item.description}</p></div>
              </div>
            </article>;
          })}
        </div>
        <p className="ns-bottom-note">Your effort. Your pace.<br /><strong>A stronger version of you.</strong></p>
      </div>
    </div>
    <footer className="ns-footer"><span>MORE THAN A MEMBERSHIP. A PLACE TO MOVE FORWARD.</span><span>RAJKOT / NEXUS FITNESS CLUB</span></footer>
  </section>;
}
