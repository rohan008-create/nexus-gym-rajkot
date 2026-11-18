'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, MapPin } from 'lucide-react';
import GymTourCanvas from './GymTourCanvas';
import { TOUR_BEATS, tourBeatAt, tourCutOpacity, type TourStatus } from './gymTourConfig';
import './gym-tour.css';

type Props = { active: boolean; reduced: boolean; onStatus: (status: TourStatus) => void; onTrial: () => void; onExplorePrograms: () => void };
export default function GymTourHero({ active, reduced, onStatus, onTrial, onExplorePrograms }: Props) {
  const root = useRef<HTMLElement>(null), progress = useRef(0), beatRef = useRef(0), invalidate = useRef<() => void>(() => {});
  const [status, setStatus] = useState<TourStatus>('loading'), [beat, setBeat] = useState(0), [mobile, setMobile] = useState(false), [inView, setInView] = useState(true), [pageVisible, setPageVisible] = useState(true);
  const entryFocusDone = useRef(false);
  const staticView = reduced || status === 'error';
  const ready = useCallback(() => { setStatus('ready'); onStatus('ready'); }, [onStatus]);
  const fail = useCallback(() => { setStatus('error'); onStatus('error'); }, [onStatus]);
  useEffect(() => { if (reduced) { setStatus('ready'); onStatus('ready'); } }, [reduced, onStatus]);
  useEffect(() => {
    if (!active) { entryFocusDone.current = false; return; }
    const element = root.current;
    // Page's entry callback can run before the inert landing has committed.
    // Hand focus over once after this hero actually becomes interactive. The
    // standalone preview and later scroll/dialog updates must never take focus.
    if (entryFocusDone.current || element?.closest('.nexus-entrance')?.getAttribute('data-entrance') !== 'revealed') return;
    const frame = requestAnimationFrame(() => {
      const heading = element.querySelector<HTMLElement>('#hero-title');
      if (!heading || element.closest('[inert]') || element.closest('.nexus-entrance')?.getAttribute('data-entrance') !== 'revealed') return;
      if (document.activeElement !== document.body && document.activeElement !== heading) return;
      if (document.activeElement !== heading) heading.focus({ preventScroll: true });
      entryFocusDone.current = document.activeElement === heading;
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);

  useEffect(() => {
    const element = root.current!;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting)); observer.observe(element);
    const visible = () => setPageVisible(!document.hidden); document.addEventListener('visibilitychange', visible);
    const media = matchMedia('(max-width: 760px)'); const resize = () => { setMobile(media.matches); measure(); update(); };
    let top = 0, range = 1;
    const measure = () => { top = element.getBoundingClientRect().top + window.scrollY; range = Math.max(1, element.offsetHeight - window.innerHeight); };
    const update = () => {
      const value = staticView ? 0 : Math.max(0, Math.min(1, (window.scrollY - top) / range));
      progress.current = value; const nextBeat = tourBeatAt(value); if (nextBeat !== beatRef.current) { beatRef.current = nextBeat; setBeat(nextBeat); }
      element.dataset.tourProgress = value.toFixed(4);
      element.style.setProperty('--tour-progress', String(value));
      element.style.setProperty('--tour-cut', String(tourCutOpacity(value)));
      if (active && !document.hidden && element.getBoundingClientRect().bottom > 0 && element.getBoundingClientRect().top < window.innerHeight) invalidate.current();
    };
    resize();
    window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', resize, { passive: true });
    const sizeObserver = new ResizeObserver(() => { measure(); update(); }); sizeObserver.observe(element);
    return () => { observer.disconnect(); sizeObserver.disconnect(); document.removeEventListener('visibilitychange', visible); window.removeEventListener('scroll', update); window.removeEventListener('resize', resize); };
  }, [active, staticView]);
  const goToBeat = (index: number) => {
    const element = root.current!;
    const stops = [0, .28, .64, 1];
    window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY + (element.offsetHeight - window.innerHeight) * stops[index], behavior: reduced ? 'instant' : 'smooth' });
  };
  const current = TOUR_BEATS[staticView ? 0 : beat];
  return <section ref={root} id="home" className={`gym-tour-hero${staticView ? ' is-static' : ''}`} data-tour-status={status} data-tour-beat={current.id} data-tour-progress={progress.current.toFixed(4)} aria-labelledby="hero-title">
    <div className="gym-tour-stage">
      <div className="gym-tour-visual" aria-hidden="true">
        <img className={`gym-tour-poster${staticView ? ' is-visible' : ''}`} src="/assets/photography/nexus-real-building.webp" alt="" />
        {!staticView && <GymTourCanvas progress={progress} active={active && inView && pageVisible} mobile={mobile} onInvalidate={invalidate} onReady={ready} onFailure={fail} />}
      </div>
      <div className="gym-tour-shade" aria-hidden="true" />
      <div className="gym-tour-cut" aria-hidden="true" />
      <div className="gym-tour-location"><MapPin size={13} aria-hidden />RAJKOT, GUJARAT</div>
      <div className={`gym-tour-copy${beat === 2 ? ' is-right' : ''}`}>
        <p className="gym-tour-eyebrow"><span />{current.label}</p>
        <p className="gym-tour-brand">NEXUS FITNESS CLUB</p>
        <h1 id="hero-title" tabIndex={-1}><span>{current.title[0]}</span><em>{current.title[1]}</em></h1>
        <p className="gym-tour-description">{current.description}</p>
        <div className="gym-tour-actions"><button className="gym-tour-trial" data-tour-trial onClick={onTrial}>Book a Trial<ArrowUpRight size={18} aria-hidden /></button><button className="gym-tour-programs" onClick={onExplorePrograms}>Explore Programs<ArrowUpRight size={16} aria-hidden /></button></div>
      </div>
      <div className="gym-tour-footer">
        <div className="gym-tour-caption"><span>{String((staticView ? 0 : beat) + 1).padStart(2, '0')} / THE NEXUS EXPERIENCE</span><strong>{current.detail}</strong></div>
        {!staticView && <nav className="gym-tour-stops" aria-label="Gym tour views">{TOUR_BEATS.map((item, i) => <button key={item.id} onClick={() => goToBeat(i)} aria-label={`View ${item.id === 'entry' ? 'entrance' : item.id}`} aria-current={beat === i ? 'step' : undefined}><span>{String(i + 1).padStart(2, '0')}</span><i /></button>)}</nav>}
        {!staticView && <button className="gym-tour-scroll" onClick={() => beat < 3 ? goToBeat(beat + 1) : document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}>{beat < 3 ? (mobile ? 'NEXT VIEW' : 'SCROLL TO STEP INSIDE') : 'DISCOVER MORE'}<ArrowDown size={16} aria-hidden /></button>}
      </div>
      {status === 'loading' && !reduced && <span className="gym-tour-loading" role="status">Opening Nexus…</span>}
      {status === 'error' && <span className="gym-tour-fallback-note" role="status">Explore Nexus. Your next chapter starts here.</span>}
    </div>
  </section>;
}
