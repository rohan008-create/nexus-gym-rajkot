'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import './nexus-opening.css';

const LETTERS = ['N', 'E', 'X', 'U', 'S'] as const;
const DISCIPLINES = ['STRENGTH', 'POWER', 'ENDURANCE', 'RECOVERY'] as const;
const BLADE_COUNT = 5;

/**
 * Physiological P-Q-R-S-T athletic ECG pulse impulse evaluated along phase u in [0, 1].
 */
function evalEcgImpulse(u: number): number {
  const gauss = (center: number, width: number, amp: number) => {
    const d = (u - center) / width;
    return amp * Math.exp(-d * d);
  };
  return (
    gauss(0.24, 0.032, 0.14) + // P wave
    gauss(0.36, 0.014, -0.22) + // Q dip
    gauss(0.41, 0.015, 1.0) + // R spike (main peak)
    gauss(0.46, 0.015, -0.34) + // S dip
    gauss(0.62, 0.048, 0.24) // T wave
  );
}

export default function NexusOpening({ onFinish }: { onFinish: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const counterElRef = useRef<HTMLSpanElement>(null);
  const barFillRef = useRef<HTMLDivElement>(null);
  const calibrationHudRef = useRef<HTMLDivElement>(null);
  const lockupRef = useRef<HTMLDivElement>(null);
  const subLabelRef = useRef<HTMLDivElement>(null);
  const ruleLeftRef = useRef<HTMLDivElement>(null);
  const ruleRightRef = useRef<HTMLDivElement>(null);
  const letterWrapRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const letterFillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const bladeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bladeSeamRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [disciplineIdx, setDisciplineIdx] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const isReload = navigation?.type === 'reload';
    if (preference.matches || location.hash || (!isReload && window.scrollY > 0) ||
        root.getAnimations().some(animation => animation.playState === 'finished')) {
      onFinish();
      return;
    }

    root.dataset.active = 'true';
    const skipAfterScroll = () => { if (!isReload && window.scrollY > 0) onFinish(); };
    const skipOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onFinish(); };
    const skipOnOutsideFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !root.contains(event.target)) onFinish();
    };
    preference.addEventListener('change', onFinish);
    window.addEventListener('wheel', onFinish, { capture: true, passive: true });
    window.addEventListener('scroll', skipAfterScroll, { passive: true });
    window.addEventListener('keydown', skipOnEscape);
    window.addEventListener('focusin', skipOnOutsideFocus);

    const ctx2d = canvas.getContext('2d');
    const waveState = {
      progress: 0, // 0..100 calibrated load progress
      waveAlpha: 1,
      waveFlatness: 0, // 0 = live ECG pulse, 1 = snaps taut to laser line
      pulseBoost: 0,
    };

    let rafId = 0;
    let dpr = 1;

    const sizeCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(root.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(root.clientHeight * dpr));
    };

    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);

    // Real-time 60 FPS Canvas: live athletic ECG laser pulse + precision barbell caliper ruler
    const drawWaveform = () => {
      if (!ctx2d) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);

      if (waveState.waveAlpha <= 0.005) return;
      rafId = window.requestAnimationFrame(drawWaveform);

      const p = waveState.progress / 100;
      const cy = h * 0.5;
      const margin = w * 0.08;
      const span = w - margin * 2;
      const headX = margin + span * p;

      ctx2d.save();
      ctx2d.globalAlpha = waveState.waveAlpha;

      // 1. Sliding precision barbell calibration ticks along center axis
      const tickSpacing = Math.max(14, Math.round(22 * dpr));
      const tickShift = (p * span * 0.35) % tickSpacing;
      ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx2d.lineWidth = Math.max(1, dpr);
      ctx2d.beginPath();
      for (let x = margin - tickShift; x <= w - margin; x += tickSpacing) {
        if (x < margin) continue;
        const idx = Math.round((x + tickShift) / tickSpacing);
        const major = idx % 5 === 0;
        const tickH = (major ? 14 : 6) * dpr;
        ctx2d.moveTo(x, cy - tickH * 0.5);
        ctx2d.lineTo(x, cy + tickH * 0.5);
      }
      ctx2d.stroke();

      // Subtle full-span baseline track
      ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx2d.beginPath();
      ctx2d.moveTo(margin, cy);
      ctx2d.lineTo(w - margin, cy);
      ctx2d.stroke();

      // 2. Live crimson ECG pulse trace sweeping from margin to headX
      const amp =
        Math.min(h * 0.14, 105 * dpr) *
        (1 - waveState.waveFlatness) *
        (1 + waveState.pulseBoost * 0.28);

      const samples = 220;
      const drawStroke = (lineWidth: number, color: string) => {
        ctx2d.beginPath();
        for (let i = 0; i <= samples; i++) {
          const frac = i / samples;
          const x = margin + (headX - margin) * frac;
          const normSpan = (x - margin) / Math.max(span, 1);

          // Place two distinct physiological heartbeat spikes along the track (~0.32 and ~0.72)
          let yOff = 0;
          const b1 = (normSpan - 0.16) / 0.24;
          if (b1 > 0 && b1 < 1) {
            yOff -= evalEcgImpulse(b1) * amp * 0.85;
          }
          const b2 = (normSpan - 0.56) / 0.26;
          if (b2 > 0 && b2 < 1) {
            yOff -= evalEcgImpulse(b2) * amp * 1.05;
          }
          // Subtle high-frequency athletic micro-tension
          yOff += Math.sin(normSpan * 52) * 1.1 * dpr * (1 - waveState.waveFlatness);

          const y = cy + yOff;
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
        ctx2d.strokeStyle = color;
        ctx2d.lineWidth = lineWidth;
        ctx2d.lineCap = 'round';
        ctx2d.lineJoin = 'round';
        ctx2d.stroke();
      };

      if (p > 0.002) {
        // Outer soft crimson glow pass + razor crisp core pass
        drawStroke(6.5 * dpr, 'rgba(255, 30, 60, 0.24)');
        drawStroke(2.2 * dpr, '#ff1e3c');

        // Incandescent leading spark point
        const sparkR = (3.4 + waveState.pulseBoost * 2.5) * dpr;
        const grad = ctx2d.createRadialGradient(
          headX,
          cy,
          0,
          headX,
          cy,
          sparkR * 5
        );
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.25, 'rgba(255, 30, 60, 0.85)');
        grad.addColorStop(1, 'rgba(255, 30, 60, 0)');
        ctx2d.fillStyle = grad;
        ctx2d.beginPath();
        ctx2d.arc(headX, cy, sparkR * 5, 0, Math.PI * 2);
        ctx2d.fill();
      }

      ctx2d.restore();
    };

    if (ctx2d) rafId = window.requestAnimationFrame(drawWaveform);

    const gsapCtx = gsap.context(() => {
      const letters = letterWrapRefs.current.filter(Boolean) as HTMLSpanElement[];
      const fills = letterFillRefs.current.filter(Boolean) as HTMLSpanElement[];
      const blades = bladeRefs.current.filter(Boolean) as HTMLDivElement[];
      const seams = bladeSeamRefs.current.filter(Boolean) as HTMLDivElement[];

      const tl = gsap.timeline({ onComplete: onFinish });

      // Initial hidden choreography states
      gsap.set(letters, { yPercent: 115, opacity: 1 });
      gsap.set(fills, { clipPath: 'inset(100% 0% 0% 0%)' });
      gsap.set(subLabelRef.current, { opacity: 0, y: 12, letterSpacing: '0.18em' });
      gsap.set([ruleLeftRef.current, ruleRightRef.current], { scaleX: 0 });
      gsap.set(seams, { opacity: 0 });

      const syncCounter = () => {
        const val = Math.round(waveState.progress);
        if (counterElRef.current) {
          counterElRef.current.textContent = String(val).padStart(2, '0');
        }
        if (barFillRef.current) {
          barFillRef.current.style.transform = `scaleX(${waveState.progress / 100})`;
        }
        const nextIdx = Math.min(
          DISCIPLINES.length - 1,
          Math.floor((waveState.progress / 100) * DISCIPLINES.length)
        );
        setDisciplineIdx(nextIdx);
      };

      // --- ACT 1: Athletic Heartbeat Surges & Calibrated 00 -> 100 Load ---
      tl.to(waveState, {
        progress: 38,
        duration: 0.46,
        ease: 'power2.out',
        onUpdate: syncCounter,
      })
        .to(
          waveState,
          { pulseBoost: 1, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.inOut' },
          0.26
        )
        .to(waveState, {
          progress: 74,
          duration: 0.44,
          ease: 'power3.inOut',
          onUpdate: syncCounter,
        })
        .to(
          waveState,
          { pulseBoost: 1.2, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.inOut' },
          0.74
        )
        .to(waveState, {
          progress: 100,
          duration: 0.42,
          ease: 'expo.out',
          onUpdate: syncCounter,
        })
        // Snap ECG taut into laser line and fade calibration HUD cleanly
        .to(
          waveState,
          {
            waveFlatness: 1,
            duration: 0.24,
            ease: 'expo.out',
          },
          '+=0.04'
        )
        .to(
          calibrationHudRef.current,
          {
            opacity: 0,
            y: -14,
            duration: 0.28,
            ease: 'power3.in',
          },
          '<'
        )
        .to(
          waveState,
          {
            waveAlpha: 0,
            duration: 0.28,
            ease: 'power2.in',
          },
          '-=0.06'
        )

        // --- ACT 2: Monumental NEXUS Typography Slam & Molten Fill ---
        .to(
          letters,
          {
            yPercent: 0,
            duration: 0.62,
            stagger: 0.055,
            ease: 'expo.out',
          },
          '-=0.16'
        )
        .to(
          fills,
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 0.68,
            stagger: 0.048,
            ease: 'power4.inOut',
          },
          '-=0.34'
        )
        .to(
          subLabelRef.current,
          {
            opacity: 1,
            y: 0,
            letterSpacing: '0.44em',
            duration: 0.52,
            ease: 'power3.out',
          },
          '-=0.42'
        )
        .to(
          [ruleLeftRef.current, ruleRightRef.current],
          {
            scaleX: 1,
            duration: 0.48,
            ease: 'expo.out',
          },
          '<'
        )

        // --- ACT 3: Kinetic Forward Punch & Alternating 5-Blade Shutter Cleave ---
        .to(
          lockupRef.current,
          {
            scale: 1.07,
            opacity: 0,
            duration: 0.42,
            ease: 'power3.in',
          },
          '+=0.34'
        )
        .to(
          seams,
          {
            opacity: 1,
            duration: 0.14,
            ease: 'power2.out',
          },
          '-=0.22'
        )
        .to(
          blades,
          {
            yPercent: (i: number) => (i % 2 === 0 ? -104 : 104),
            duration: 0.86,
            stagger: {
              amount: 0.22,
              from: 'center',
            },
            ease: 'expo.inOut',
          },
          '-=0.06'
        );
    }, root);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', sizeCanvas);
      preference.removeEventListener('change', onFinish);
      window.removeEventListener('wheel', onFinish, true);
      window.removeEventListener('scroll', skipAfterScroll);
      window.removeEventListener('keydown', skipOnEscape);
      window.removeEventListener('focusin', skipOnOutsideFocus);
      gsapCtx.revert();
      delete root.dataset.active;
    };
  }, [onFinish]);

  return (
    <div
      ref={rootRef}
      className="nexus-opening select-none"
      data-enter
      onClick={event => { if (event.target === event.currentTarget) onFinish(); }}
    >
      <span role="status" className="sr-only">Loading NEXUS Fitness Club</span>

      {/* 5 Interlocking Architectural Shutter Blades */}
      <div aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid grid-cols-5">
        {Array.from({ length: BLADE_COUNT }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              bladeRefs.current[i] = el;
            }}
            className="nexus-opening-blade relative h-full will-change-transform"
          >
            {/* Leading crimson laser edge that ignites right as the blades cleave open */}
            <div
              ref={(el) => {
                bladeSeamRefs.current[i] = el;
              }}
              className={`absolute left-0 right-0 opacity-0 h-[2px] bg-[#ff1e3c] shadow-[0_0_16px_rgba(255,30,60,0.8)] ${
                i % 2 === 0 ? 'bottom-0' : 'top-0'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Live 60 FPS Athletic ECG Pulse & Caliper Gauge Canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Act 1: Minimal Kinetic Calibration HUD */}
      <div
        ref={calibrationHudRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between px-6 py-7 sm:px-12 sm:py-10"
      >
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.26em] text-zinc-400">
          <span className="font-semibold text-zinc-200">NEXUS Fitness Club</span>
          <span className="nexus-opening-mono text-zinc-400">
            {DISCIPLINES[disciplineIdx]}
          </span>
        </div>

        {/* Center counter positioned cleanly just beneath the live ECG waveform */}
        <div className="flex flex-col items-center translate-y-16 sm:translate-y-20">
          <div className="flex items-baseline gap-1 nexus-opening-display font-extrabold tracking-tight text-white">
            <span
              ref={counterElRef}
              className="nexus-opening-counter nexus-opening-mono text-4xl sm:text-5xl font-semibold tracking-tight text-white"
            >
              00
            </span>
            <span className="nexus-opening-mono text-sm text-[#ff1e3c]">%</span>
          </div>
          <div className="mt-3 h-[2px] w-36 sm:w-48 overflow-hidden bg-white/10">
            <div
              ref={barFillRef}
              className="h-full w-full origin-left scale-x-0 bg-[#ff1e3c]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Strength · Conditioning · Recovery</span>
        </div>
      </div>

      {/* Act 2: Monumental NEXUS Typography Lockup with Rising Molten Fill */}
      <div
        ref={lockupRef}
        aria-hidden="true"
        className="nexus-opening-lockup pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-4 will-change-transform"
      >
        <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-3">
          {LETTERS.map((char, idx) => {
            const isCenterX = char === 'X';
            return (
              <span
                key={idx}
                className="relative inline-block overflow-hidden py-1"
              >
                <span
                  ref={(el) => {
                    letterWrapRefs.current[idx] = el;
                  }}
                  className="relative inline-block nexus-opening-display text-[22vw] sm:text-[18vw] lg:text-[15.5vw] font-black leading-[0.84] tracking-[-0.03em] will-change-transform"
                >
                  {/* Hairline architectural outline base */}
                  <span className="nexus-opening-stroke block" aria-hidden="true">
                    {char}
                  </span>
                  {/* Rising solid chalk-white / crimson molten fill */}
                  <span
                    ref={(el) => {
                      letterFillRefs.current[idx] = el;
                    }}
                    className={`nexus-opening-fill absolute inset-0 block will-change-[clip-path] ${
                      isCenterX ? 'text-[#ff1e3c]' : 'text-zinc-50'
                    }`}
                  >
                    {char}
                  </span>
                </span>
              </span>
            );
          })}
        </div>

        {/* Sub-brand lockup framed by twin crimson hairline rules */}
        <div className="mt-5 sm:mt-6 flex items-center gap-4 sm:gap-6">
          <div
            ref={ruleLeftRef}
            className="h-[1px] w-8 sm:w-16 origin-right bg-[#ff1e3c]"
          />
          <div
            ref={subLabelRef}
            className="font-sans text-[11px] sm:text-xs font-semibold uppercase text-zinc-300 whitespace-nowrap"
          >
            Fitness Club
          </div>
          <div
            ref={ruleRightRef}
            className="h-[1px] w-8 sm:w-16 origin-left bg-[#ff1e3c]"
          />
        </div>
      </div>

      {/* Accessible Skip control */}
      <button
        type="button"
        aria-label="Skip intro"
        onClick={onFinish}
        className="nexus-opening-skip absolute z-20 inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff1e3c]"
      >
        Skip
      </button>
    </div>
  );
}
