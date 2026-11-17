'use client';
import { useRef, useState } from 'react';
import { ArrowRight, Crosshair, Cpu } from 'lucide-react';
import { armoryStages } from './armoryStages';
import { useArmoryScroll } from './useArmoryScroll';
import ArmoryParticles from './ArmoryParticles';

export default function ArmorySection({ onExplorePrograms }: { onExplorePrograms: () => void }) {
  const root = useRef<HTMLElement>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [active, setActive] = useState(0);
  const [activePin, setActivePin] = useState<number | null>(null);

  useArmoryScroll(root, setEnhanced, setActive);

  return (
    <section
      ref={root}
      className="armory-section"
      id="armory"
      aria-labelledby="armory-title"
      data-armory-stage={armoryStages[active].id}
    >
      <header className="armory-intro">
        <div className="armory-intro-header">
          <div className="armory-eyebrow-container">
            <p className="eyebrow">
              <span aria-hidden />04 / THE NEXUS ARMORY
            </p>
            <span className="armory-hud-chip" aria-hidden="true">
              <span className="armory-live-indicator" />
              SYSTEM 04 // 3D ARSENAL
            </span>
          </div>

          <h2 id="armory-title" className="armory-title-3d">
            <span className="armory-title-text">ENGINEERED</span>
            <br />
            <em className="armory-title-highlight">FOR STRENGTH.</em>
          </h2>

          <div className="armory-meta-pills" aria-hidden="true">
            <div className="armory-pill">
              <Cpu size={12} className="text-red-500" />
              <span>AERO-GRADE HIGH TENSILE</span>
            </div>
            <div className="armory-pill">
              <Crosshair size={12} className="text-red-500" />
              <span>±0.05% ISO CALIBRATION</span>
            </div>
          </div>
        </div>

        <div className="armory-intro-side">
          <p>
            Discover the equipment that powers every rep, every challenge, and every breakthrough.
          </p>
          <div className="armory-spec-coords" aria-hidden="true">
            <span>SECTOR: 04-ARSENAL</span>
            <span>SPEC: 3D BIOMECHANICS</span>
          </div>
        </div>
      </header>

      <a className="armory-skip" href="#armory-end">
        Skip equipment showcase
      </a>

      <div className="armory-showcase" aria-label="Cinematic equipment showcase">
        <ArmoryParticles />

        {armoryStages.map((stage, index) => (
          <article
            key={stage.id}
            className="armory-stage"
            data-stage={stage.id}
            aria-hidden={enhanced ? active !== index : undefined}
            aria-labelledby={`armory-${stage.id}`}
          >
            <div className="armory-stage-copy">
              <div className="armory-stage-header">
                <p className="armory-stage-number">
                  {stage.number}
                  <span>/ 03</span>
                </p>
                <span className="armory-category-tag" aria-hidden="true">
                  {stage.category}
                </span>
              </div>

              <h3 id={`armory-${stage.id}`}>
                <span className="armory-title-line">
                  <span>THE</span>
                </span>
                <span className="armory-title-line accent">
                  <span>{stage.title}</span>
                </span>
              </h3>

              <p className="armory-stage-description">{stage.description}</p>

              <div className="armory-telemetry-specs" aria-label="Equipment specifications">
                {stage.specs.map(spec => (
                  <div key={spec.label} className="armory-spec-item">
                    <span className="armory-spec-label">{spec.label}</span>
                    <span className="armory-spec-val">{spec.value}</span>
                  </div>
                ))}
              </div>

              <span
                className="armory-stage-rule"
                style={{ width: '125px', transform: `scaleX(${(index + 1) / 3})` }}
                aria-hidden
              />

              {index === 2 && (
                <button
                  className="armory-programs-cta"
                  tabIndex={enhanced && active !== 2 ? -1 : 0}
                  onClick={event => {
                    event.currentTarget.blur();
                    onExplorePrograms();
                  }}
                >
                  EXPLORE OUR PROGRAMS <ArrowRight size={16} aria-hidden />
                </button>
              )}
            </div>

            <div className="armory-visual">
              <div className="armory-parallax">
                <div className="armory-3d-stage">
                  <div className="armory-grid-backing" aria-hidden="true" />
                  <img
                    className="armory-equipment"
                    src={stage.image}
                    alt={stage.imageAlt}
                    width="1600"
                    height="900"
                    loading="lazy"
                    decoding="async"
                  />

                  {/* 3D Holographic Callout Nodes */}
                  <div className="armory-callouts-layer" aria-hidden="true">
                    {stage.callouts.map((pin, pIdx) => {
                      const isOpen = activePin === pIdx;
                      return (
                        <div
                          key={pin.label}
                          className={`armory-pin-node ${isOpen ? 'is-active' : ''}`}
                          style={{ top: pin.top, left: pin.left }}
                          onMouseEnter={() => setActivePin(pIdx)}
                          onMouseLeave={() => setActivePin(null)}
                        >
                          <span className="armory-pin-ring" />
                          <span className="armory-pin-dot" />
                          <div className="armory-pin-card">
                            <span className="armory-pin-tag">3D SPEC</span>
                            <strong className="armory-pin-title">{pin.label}</strong>
                            <p className="armory-pin-detail">{pin.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="armory-visual-shade" aria-hidden />
            </div>
          </article>
        ))}

        <div className="armory-scanner" aria-hidden />

        <div
          className="armory-progress"
          role="progressbar"
          aria-label="Equipment showcase stage"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={active + 1}
          aria-valuetext={`${armoryStages[active].number} of 03: ${armoryStages[active].label}`}
        >
          <div className="armory-progress-top">
            <span aria-live="polite">
              {armoryStages[active].number}
              <i>/ 03</i>
            </span>
            <div>
              {armoryStages.map((stage, index) => (
                <span key={stage.id} className={active === index ? 'is-active' : ''}>
                  {stage.label}
                </span>
              ))}
            </div>
          </div>
          <div className="armory-progress-track">
            <span className="armory-progress-fill" />
          </div>
        </div>

        <p className="armory-concept">ILLUSTRATIVE EQUIPMENT CONCEPTS // 3D SPECIFICATION</p>
      </div>

      <div id="armory-end" tabIndex={-1} className="armory-end" aria-label="End of equipment showcase" />
    </section>
  );
}
