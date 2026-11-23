'use client';

import { useRef, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, MoveUpRight } from 'lucide-react';
import ClothPeelReveal from '../ui/cloth-peel-reveal';
import { armoryStages } from './armoryStages';
import './armory-gallery.css';

const equipmentNames = ['Olympic barbell', 'Curved treadmill', 'Functional trainer'];
const equipmentNotes = ['Built to carry your ambition.', 'Find your next gear.', 'Every angle. Every muscle.'];

export default function ArmorySection({ onExplorePrograms }: { onExplorePrograms: () => void }) {
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const stage = armoryStages[active];

  const select = (index: number, focus = false) => {
    setActive(index);
    if (focus) tabs.current[index]?.focus();
  };

  return (
    <section id="armory" className="armory-section armory-gallery" aria-labelledby="armory-title" data-armory-stage={stage.id} data-revealed={revealed}>
      <ClothPeelReveal
        sheetText={'ENGINEERED\nFOR STRENGTH.'}
        sheetColor="#eeece5"
        textColor="#20221f"
        durationMs={1850}
        delayMs={450}
        angleDeg={198}
        foldAmplitude={0.16}
        foldFrequency={3.4}
        tilt={0.95}
        height="var(--armory-height)"
        onReveal={() => setRevealed(true)}
        className="armory-peel"
      >
        <div className="ag-content">
          <header className="ag-header">
            <p className="ag-eyebrow"><span />04 / THE NEXUS ARMORY</p>
            <span className="ag-edition">THE TOOLS. THE WORK. THE TRANSFORMATION.</span>
            <ArrowDownRight size={22} strokeWidth={1.3} aria-hidden />
          </header>
          <div className="ag-intro">
            <h2 id="armory-title">ENGINEERED<br /><em>FOR STRENGTH.</em></h2>
            <p>Exceptional equipment.{' '}<br />Extraordinary possibilities.<br /><span>Your next breakthrough starts here.</span></p>
          </div>
          <div className="ag-product" role="tabpanel" id="armory-equipment-panel" aria-labelledby={`armory-tab-${stage.id}`} tabIndex={0}>
            <div className="ag-product-meta"><span>THE COLLECTION / {stage.number}</span><span>NEXUS FITNESS CLUB <MoveUpRight size={12} aria-hidden /></span></div>
            <span className="ag-watermark" aria-hidden>{stage.label}</span>
            <div key={stage.id} className={`ag-equipment-scene ag-equipment-${stage.id}`}>
              <div className="ag-ground" aria-hidden />
              <img className="ag-equipment" src={stage.image} alt={stage.imageAlt} width={1536} height={1024} decoding="async" />
            </div>
            <div className="ag-product-caption" key={`${stage.id}-caption`}>
              <span className="ag-caption-line" aria-hidden />
              <div><span className="ag-micro">{stage.number} / {equipmentNames[active]}</span><h3>{equipmentNotes[active]}</h3></div>
              <span className="ag-caption-arrow" aria-hidden><ArrowUpRight size={24} strokeWidth={1.2} /></span>
            </div>
          </div>
          <div className="ag-selector" role="tablist" aria-label="Equipment collection">
            {armoryStages.map((item, index) => (
              <button key={item.id} ref={node => { tabs.current[index] = node; }} role="tab" id={`armory-tab-${item.id}`}
                aria-selected={active === index} aria-controls="armory-equipment-panel" tabIndex={active === index ? 0 : -1}
                onClick={() => select(index)}
                onKeyDown={event => {
                  let next = active;
                  if (event.key === 'ArrowRight') next = (active + 1) % 3;
                  else if (event.key === 'ArrowLeft') next = (active + 2) % 3;
                  else if (event.key === 'Home') next = 0;
                  else if (event.key === 'End') next = 2;
                  else return;
                  event.preventDefault(); select(next, true);
                }}>
                <span className="ag-tab-number">{item.number}</span>
                <span className="ag-tab-copy"><strong>{item.label}</strong><span>{equipmentNames[index]}</span></span>
                <ArrowUpRight size={20} strokeWidth={1.5} aria-hidden />
              </button>
            ))}
          </div>
          <footer className="ag-footer">
            <p className="ag-description" aria-live="polite">{stage.description}</p>
            <button className="ag-cta" onClick={onExplorePrograms}>FIND YOUR PROGRAM <ArrowRight size={17} aria-hidden /></button>
          </footer>
          <p className="ag-disclaimer">EQUIPMENT CONCEPTS / BUILT FOR EVERY KIND OF STRONG.</p>
        </div>
      </ClothPeelReveal>
      <div id="armory-end" />
    </section>
  );
}
