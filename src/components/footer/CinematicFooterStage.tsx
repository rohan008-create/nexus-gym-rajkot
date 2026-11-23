'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import FooterDrips from './FooterDrips';
import FooterSmoke from './FooterSmoke';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { NEXUS_BRAND_LETTERS, normalizePointerPosition } from './nexusMotion';

gsap.registerPlugin(ScrollTrigger);

const debris = [
  [13, 5, -11, -19, -105], [24, 3, -13, -28, 96], [37, 4, -15, -14, 155],
  [43, 2, -20, -32, -152], [54, 3, 19, -30, -110], [64, 5, 13, -16, 160],
  [74, 3, 16, -22, 135], [84, 4, 10, -17, -160], [90, 2, 12, -25, 105],
];


/** The athlete and held wordmark share every transform, including their entrance. */
export default function CinematicFooterStage({ className = '' }: { className?: string }) {
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const assembly = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = gsap.matchMedia();
    let impacted = false;
    let shake: Animation | undefined;
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        element.dataset.animationPhase = 'revealing';
        gsap.fromTo(assembly.current, { opacity: 0, y: 28 }, {
          opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 92%', once: true },
          onComplete: () => {
            element.dataset.animationPhase = 'complete';
            if (impacted) return;
            impacted = true;
            element.dataset.impact = 'landed';
            const page = element.closest('.site-shell, main');
            if (page?.animate) {
              shake = page.animate([
                { translate: '0 0' },
                { translate: '-5px 3px', offset: .13 },
                { translate: '4px -3px', offset: .26 },
                { translate: '-3px 2px', offset: .42 },
                { translate: '2px -1px', offset: .6 },
                { translate: '-1px 1px', offset: .78 },
                { translate: '0 0' },
              ], { duration: 430, easing: 'linear' });
            }
          },
        });
        // Only the shared parent moves. Fingers cannot drift away from the letters.
        const x = gsap.quickTo(assembly.current, 'x', { duration: .65, ease: 'power3.out' });
        const move = (event: PointerEvent) => {
          if (event.pointerType === 'touch') return;
          const pointer = normalizePointerPosition(event.clientX, event.clientY, element.getBoundingClientRect());
          x(pointer.x * 6);
        };
        const leave = () => { x(0); element.dataset.athleteHover = 'false'; };
        element.addEventListener('pointermove', move, { passive: true });
        element.addEventListener('pointerleave', leave);
        return () => {
          element.removeEventListener('pointermove', move);
          element.removeEventListener('pointerleave', leave);
        };
      }, element);
      return () => {
        shake?.cancel();
        context.revert();
      };
    });
    media.add('(prefers-reduced-motion: reduce)', () => {
      element.dataset.animationPhase = 'complete';
      element.dataset.impact = 'landed';
    });
    return () => media.revert();
  }, []);

  return <div ref={root} data-testid="nexus-footer" data-animation-phase="idle" data-athlete-hover="false" data-effects-paused={paused}
    aria-label="NEXUS Fitness Club" className={`nexus-cinematic-stage relative w-full overflow-hidden select-none ${className}`}>
    <div className="nexus-footer-stage nexus-held-stage relative mx-auto w-full max-w-[1680px] aspect-[2/1]">
      <FooterSmoke paused={paused} />
      <div className="nexus-energy-ring" aria-hidden="true" />
      <div className="nexus-floor-light" aria-hidden="true" />
      <div className="nexus-impact-ground" aria-hidden="true" />
      <div className="nexus-impact-flash" aria-hidden="true" />
      <div ref={assembly} data-testid="nexus-held-assembly" className="nexus-held-assembly absolute inset-0">
        <div className="nexus-held-glow" aria-hidden="true" />
        <h2 data-testid="nexus-wordmark" aria-label="NEXUS" className="nexus-display-font nexus-held-wordmark">
          {NEXUS_BRAND_LETTERS.map(letter => <span key={letter} aria-hidden="true" data-nexus-letter={letter} className="nexus-letter-surface">{letter}</span>)}
        </h2>
        <div data-testid="nexus-athlete" className="nexus-held-athlete"
          onPointerEnter={() => { if (root.current) root.current.dataset.athleteHover = 'true'; }}
          onPointerLeave={() => { if (root.current) root.current.dataset.athleteHover = 'false'; }}>
          <Image src="/assets/nexus-athlete-grip.png" alt="Athlete gripping the outer N and S of the Nexus wordmark"
            width={1860} height={846} quality={90} loading="lazy" sizes="(max-width:1680px) 90vw, 1512px"
            draggable={false} className="h-full w-full object-contain object-bottom" />
          <div className="nexus-athlete-look" aria-hidden="true" />
        </div>
        {/* Letter faces cover the inner palms/wrists; the curled fingertips stay in front.
            Both occlusion patches live inside the same moving assembly. */}
        {(['left', 'right'] as const).map(side => <div key={side} aria-hidden="true" className={`nexus-grip-occlusion nexus-grip-occlusion-${side}`}>
          <div className="nexus-display-font nexus-held-wordmark">
            {NEXUS_BRAND_LETTERS.map(letter => <span key={letter} className="nexus-letter-surface">{letter}</span>)}
          </div>
        </div>)}
        <FooterDrips />
        {/* Restore the rounded finger pads over the S face, while its wrist stays behind. */}
        <div className="nexus-grip-fingers-right" aria-hidden="true">
          <div className="nexus-held-athlete">
            <Image src="/assets/nexus-athlete-grip.png" alt="" width={1860} height={846}
              quality={90} loading="lazy" sizes="(max-width:1680px) 90vw, 1512px"
              draggable={false} className="h-full w-full object-contain object-bottom" />
          </div>
        </div>
      </div>
      <div className="nexus-impact-debris" aria-hidden="true">
        {debris.map(([left, size, x, y, spin], index) => <span key={left} style={{
          left: `${left}%`, width: `${size}cqw`,
          '--debris-x': `${x}cqw`, '--debris-y': `${y}cqw`,
          '--debris-spin': `${spin}deg`, '--debris-delay': `${index % 4 * 35}ms`,
        } as React.CSSProperties} />)}
      </div>
      <p data-testid="nexus-subtitle" aria-label="FITNESS CLUB" className="nexus-subtitle-font nexus-held-subtitle">
        <span><i data-testid="nexus-line-left" className="nexus-accent-bar nexus-bar-left" aria-hidden="true" />FITNESS</span>
        <span>CLUB<i data-testid="nexus-line-right" className="nexus-accent-bar nexus-bar-right" aria-hidden="true" /></span>
      </p>
      <button className="nexus-effects-toggle" aria-label={paused ? 'Resume footer animation' : 'Pause footer animation'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? '▶' : 'Ⅱ'}</button>
    </div>
  </div>;
}
