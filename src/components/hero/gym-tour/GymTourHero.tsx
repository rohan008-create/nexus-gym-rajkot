'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import ArrivalPhotograph from './ArrivalPhotograph';
import { usePageScroller } from '../../layout/SmoothScroll';
import TactileHighlight from '../../ui/tactile-highlight';
import TourChapterCopy from './TourChapterCopy';
import { tourBeatAt, tourChapterAt, tourRailProgress, type TourStatus } from './gymTourConfig';
import './gym-tour.css';

const GymTourCanvas = dynamic(() => import('./GymTourCanvas'), { ssr: false });

type Props = { active: boolean; reduced: boolean; onStatus: (status: TourStatus) => void; onTrial: () => void; onExplorePrograms: () => void };
export default function GymTourHero({ active, reduced, onStatus, onTrial, onExplorePrograms }: Props) {
  const root = useRef<HTMLElement>(null), progress = useRef(0), invalidate = useRef<() => void>(() => {});
  const scroller = usePageScroller();
  const [status, setStatus] = useState<TourStatus>('loading');
  const [beat, setBeat] = useState(0), [mobile, setMobile] = useState(false), [inView, setInView] = useState(true), [pageVisible, setPageVisible] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [interiorRequested, setInteriorRequested] = useState(false);
  const [chapter, setChapter] = useState(0);
  const entryFocusDone = useRef(false);
  const lastBeat = useRef(0);
  const lastChapter = useRef(0);
  const staticView = reduced || status === 'error';
  const present = useCallback((value: number) => {
    const position = value.toFixed(4);
    const nextChapter = tourChapterAt(value);
    if (root.current && root.current.dataset.tourProgress !== position) {
      root.current.dataset.tourProgress = position;
      root.current.style.setProperty('--tour-rail-progress', String(tourRailProgress(value, nextChapter)));
    }
    const next = tourBeatAt(value);
    if (lastBeat.current !== next) { lastBeat.current = next; setBeat(next); }
    if (lastChapter.current !== nextChapter) { lastChapter.current = nextChapter; setChapter(nextChapter); }
  }, []);
  const ready = useCallback(() => { setStatus('ready'); onStatus('ready'); }, [onStatus]);
  const fail = useCallback(() => { setStatus('error'); onStatus('error'); }, [onStatus]);
  const retry = () => { setAttempt(value => value + 1); setStatus('loading'); onStatus('loading'); };
  useEffect(() => {
    if (active || reduced) return;
    setStatus('loading');
    onStatus('loading');
    setInteriorRequested(false);
  }, [active, reduced, onStatus]);
  useEffect(() => {
    if (!active || !inView || status !== 'loading' || reduced || !pageVisible) return;
    const timeout = window.setTimeout(fail, 60000);
    return () => window.clearTimeout(timeout);
  }, [active, inView, status, reduced, pageVisible, fail, attempt]);
  useEffect(() => {
    // The shared hook starts conservatively at true during hydration. Only a
    // real reduced-motion preference may bypass the detailed-model gate.
    if (reduced && matchMedia('(prefers-reduced-motion: reduce)').matches) onStatus('ready');
  }, [reduced, onStatus]);
  useEffect(() => {
    if (!active) { entryFocusDone.current = false; return; }
    const element = root.current;
    if (entryFocusDone.current || element?.closest('.nexus-entrance')?.getAttribute('data-entrance') !== 'revealed') return;
    const frame = requestAnimationFrame(() => {
      const heading = element.querySelector<HTMLElement>('#hero-title');
      if (!heading || element.closest('[inert]') || element.closest('.nexus-entrance')?.getAttribute('data-entrance') !== 'revealed') return;
      if (document.activeElement !== document.body && document.activeElement !== heading) return;
      heading.focus({ preventScroll: true }); entryFocusDone.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);
  useEffect(() => {
    const element = root.current!;
    let intersecting = true, top = 0, range = 1;
    // An edge touching the viewport can still be "intersecting" with zero area.
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting && entry.intersectionRatio >= .001;
      setInView(intersecting);
    }, { threshold: .001 });
    observer.observe(element);
    const visible = () => setPageVisible(!document.hidden);
    visible(); document.addEventListener('visibilitychange', visible);
    const media = matchMedia('(max-width: 760px)');
    const measure = () => { top = element.getBoundingClientRect().top + window.scrollY; range = Math.max(1, element.offsetHeight - window.innerHeight); };
    const update = () => {
      const scrollY = window.scrollY;
      const value = staticView ? 0 : Math.max(0, Math.min(1, (scrollY - top) / range));
      // Start the room and host downloads on the stairs, before the room enters view.
      if (!interiorRequested && active && intersecting && value >= .10 && scrollY < top + range + window.innerHeight) setInteriorRequested(true);
      if (value === progress.current) return;
      progress.current = value;
      if (active && intersecting && !document.hidden && !staticView) invalidate.current();
    };
    const resize = () => { setMobile(media.matches); measure(); update(); };
    if (staticView) present(0);
    resize();
    window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', resize, { passive: true });
    const sizeObserver = new ResizeObserver(() => { measure(); update(); }); sizeObserver.observe(element);
    return () => { observer.disconnect(); sizeObserver.disconnect(); document.removeEventListener('visibilitychange', visible); window.removeEventListener('scroll', update); window.removeEventListener('resize', resize); };
  }, [active, staticView, present, interiorRequested]);
  const scrollTo = (top: number) => {
    if (scroller?.current) scroller.current.scrollTo(top, { immediate: reduced });
    else window.scrollTo({ top, behavior: reduced ? 'instant' : 'smooth' });
  };
  const skip = () => {
    const about = document.getElementById('about');
    if (about) scrollTo(about.getBoundingClientRect().top + window.scrollY);
  };
  const begin = () => {
    const element = root.current!;
    // Land slightly past the threshold so rounding to a scroll pixel opens the next chapter.
    scrollTo(element.getBoundingClientRect().top + window.scrollY + (element.offsetHeight - window.innerHeight) * .13);
  };
  return <section ref={root} id="home" className={`gym-tour-hero${staticView ? ' is-static' : ''}`} data-tour-active={active && inView && pageVisible && !staticView ? 'true' : 'false'} data-tour-status={reduced ? 'ready' : status} data-tour-beat={['exterior', 'entry', 'strength', 'cardio'][staticView ? 0 : beat]} data-tour-progress="0.0000" aria-labelledby="hero-title">
    <h1 id="hero-title" tabIndex={-1} className="gym-tour-accessible-title">Welcome to Nexus Fitness Club, Rajkot. Follow Ryan inside.</h1>
    <div className="gym-tour-stage">
      <div className="gym-tour-visual" aria-hidden="true">
        {active && !staticView && <GymTourCanvas key={attempt} progress={progress} active={inView && pageVisible} mobile={mobile} interiorRequested={interiorRequested} onInvalidate={invalidate} onPresent={present} onReady={ready} onFailure={fail} />}
        {(!active || staticView || status === 'loading') && <ArrivalPhotograph />}
      </div>
      {!staticView && <div className="gym-tour-edge-shade" aria-hidden="true" />}
      {!staticView && active && <TourChapterCopy chapterIndex={chapter} />}
      {!staticView && status === 'ready' && beat === 0 && <button className="gym-tour-enter" onClick={begin}><span>FOLLOW RYAN INSIDE</span><ArrowDown size={15} aria-hidden /></button>}
      {!staticView && <button className="gym-tour-skip" onClick={skip}>Skip tour <ArrowUpRight size={13} aria-hidden /></button>}
      {!staticView && beat === 3 && <div className="gym-tour-final-actions"><button data-tour-trial onClick={onTrial}>Book a trial <ArrowUpRight size={16} aria-hidden /></button><button onClick={onExplorePrograms}>Explore programs <ArrowUpRight size={16} aria-hidden /></button></div>}
      {staticView && <div className="gym-tour-static-copy"><p>NEXUS FITNESS CLUB · RAJKOT</p><h2>Welcome to<br /><TactileHighlight animate={false}>Nexus.</TactileHighlight></h2><button data-tour-trial onClick={onTrial}>Book a trial <ArrowUpRight size={16} aria-hidden /></button><button onClick={onExplorePrograms}>Explore programs</button></div>}
      {status === 'loading' && !reduced && <span className="gym-tour-loading" role="status">Opening Nexus…</span>}
      {status === 'error' && <div className="gym-tour-fallback-note"><span role="status">Explore Nexus at your own pace.</span><button type="button" onClick={retry}>Retry tour</button></div>}
    </div>
  </section>;
}
