'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, RotateCcw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ArrivalPhotograph from './ArrivalPhotograph';
import { usePageScroller } from '../../layout/SmoothScroll';
import TourChapterCopy, { ArrivalWordmark } from './TourChapterCopy';
import { TOUR_ENTRY_PROGRESS, tourBeatAt, tourChapterAt, tourRailProgress, tourScrollCeiling, type TourStatus } from './gymTourConfig';

const GymTourCanvas = dynamic(() => import('./GymTourCanvas'), { ssr: false });
const SCROLL_MOMENTUM_WINDOW = 1500;
const TOUR_START_TIMEOUT = 12_000;

type Props = { openingFinished: boolean; reduced: boolean; onStatus: (status: TourStatus) => void; onTrial: () => void; onExplorePrograms: () => void };
export default function GymTourHero({ openingFinished, reduced, onStatus, onTrial, onExplorePrograms }: Props) {
  const root = useRef<HTMLElement>(null), progress = useRef(0), invalidate = useRef<() => void>(() => {});
  const scroller = usePageScroller();
  const [status, setStatus] = useState<TourStatus>('loading');
  const [beat, setBeat] = useState(0), [mobile, setMobile] = useState(false), [inView, setInView] = useState(true), [pageVisible, setPageVisible] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [interiorRequested, setInteriorRequested] = useState(false);
  const interiorRequestedRef = useRef(false);
  const [chapter, setChapter] = useState(0);
  const [tourComplete, setTourComplete] = useState(false);
  const [tourPreview, setTourPreview] = useState(false);
  const layoutChange = useRef<{ anchor: HTMLElement; viewportTop: number } | null>(null);
  const displayedProgress = useRef(0);
  const scrollGestureUntil = useRef(0);
  const lastBeat = useRef(0);
  const lastChapter = useRef(0);
  const staticView = reduced || status === 'error' || tourPreview;
  const present = useCallback((value: number) => {
    if ((value === 1) !== (displayedProgress.current === 1)) setTourComplete(value === 1);
    displayedProgress.current = value;
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
  const showPreview = useCallback((anchor: HTMLElement, viewportTop: number) => {
    if (layoutChange.current) return;
    layoutChange.current = { anchor, viewportTop };
    scrollGestureUntil.current = 0;
    ready();
    setTourPreview(true);
  }, [ready]);
  useLayoutEffect(() => {
    const change = layoutChange.current;
    if (!change) return;
    layoutChange.current = null;
    const { anchor, viewportTop } = change;
    // Keep the section below in the same viewport position when the tour shrinks.
    const target = window.scrollY + anchor.getBoundingClientRect().top - viewportTop;
    const lenis = scroller?.current;
    if (lenis?.isScrolling === 'smooth') {
      lenis.stop();
      lenis.start();
    }
    lenis?.resize();
    if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
    else window.scrollTo({ top: target, behavior: 'instant' });
    ScrollTrigger.refresh();
  }, [scroller, tourPreview]);
  useEffect(() => {
    if (!openingFinished || !inView || status !== 'loading' || staticView || !pageVisible) return;
    const timeout = window.setTimeout(fail, TOUR_START_TIMEOUT);
    return () => window.clearTimeout(timeout);
  }, [openingFinished, inView, status, staticView, pageVisible, fail, attempt]);
  useEffect(() => {
    // The shared hook starts conservatively at true during hydration. Only a
    // real reduced-motion preference can make the static view the final view.
    if (reduced && matchMedia('(prefers-reduced-motion: reduce)').matches) onStatus('ready');
  }, [reduced, onStatus]);
  useEffect(() => {
    const element = root.current!;
    const stage = element.querySelector<HTMLElement>('.gym-tour-stage')!;
    let intersecting = true, top = 0, range = 1, previousScrollY = window.scrollY;
    const stickyEnd = () => Math.floor(top + range);
    const isAtStage = () => window.scrollY >= top && window.scrollY <= stickyEnd();
    // Keep the scroll limit until the stage has committed its completed state.
    const tourPending = () => !staticView &&
      (displayedProgress.current < 1 || stage.hasAttribute('data-tour-pending'));
    const scrollCeiling = () => Math.floor(top + range * tourScrollCeiling(displayedProgress.current));
    let stageTouch: { id: number; x: number; y: number; axis: 'horizontal' | 'vertical' | null } | null = null;
    // An edge touching the viewport can still be "intersecting" with zero area.
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = isAtStage() || (entry.isIntersecting && entry.intersectionRatio >= .001);
      setInView(intersecting);
    }, { threshold: .001 });
    observer.observe(element);
    const visible = () => setPageVisible(!document.hidden);
    visible(); document.addEventListener('visibilitychange', visible);
    const media = matchMedia('(max-width: 760px)');
    const measure = () => {
      top = element.getBoundingClientRect().top + window.scrollY;
      range = Math.max(1, element.offsetHeight - stage.offsetHeight);
    };
    const clearScrollGesture = () => { scrollGestureUntil.current = 0; };
    const rememberScrollGesture = () => {
      if (tourPending() && isAtStage()) scrollGestureUntil.current = performance.now() + SCROLL_MOMENTUM_WINDOW;
    };
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.deltaY <= 0) return;
      if (event.target instanceof Element && event.target.closest('[data-lenis-prevent]')) return;
      rememberScrollGesture();
      const lenis = scroller?.current;
      if (!lenis || lenis.isStopped || lenis.isLocked || !event.cancelable || !isAtStage() || !tourPending()) return;
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? innerHeight : event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 100 / 6 : 1;
      const ceiling = Math.max(window.scrollY, scrollCeiling());
      if (Math.max(window.scrollY, lenis.targetScroll) + event.deltaY * unit <= ceiling) return;
      event.preventDefault();
      event.stopPropagation();
      lenis.scrollTo(ceiling, {
        programmatic: false,
        duration: lenis.options.duration,
        easing: lenis.options.easing,
        lerp: lenis.options.lerp,
      });
    };
    const onNativeTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1) rememberScrollGesture();
    };
    const onStageTouchStart = (event: TouchEvent) => {
      const finger = event.touches[0];
      stageTouch = tourPending() && event.touches.length === 1
        ? { id: finger.identifier, x: finger.clientX, y: finger.clientY, axis: null }
        : null;
    };
    const onStageTouchMove = (event: TouchEvent) => {
      const finger = event.touches[0];
      if (!stageTouch || event.touches.length !== 1 || finger.identifier !== stageTouch.id) return;
      const delta = stageTouch.y - finger.clientY;
      if (!stageTouch.axis) {
        const horizontal = Math.abs(stageTouch.x - finger.clientX);
        if (Math.max(horizontal, Math.abs(delta)) < 5) return;
        stageTouch.axis = horizontal > Math.abs(delta) ? 'horizontal' : 'vertical';
      }
      if (stageTouch.axis !== 'vertical') return;
      stageTouch.y = finger.clientY;
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      const lenis = scroller?.current;
      if (lenis?.isStopped || lenis?.isLocked) return;
      // Limit the swipe before the browser can briefly paint past the sticky stage.
      const current = window.scrollY;
      const target = delta > 0 && isAtStage() && tourPending()
        ? Math.min(current + delta, Math.max(current, scrollCeiling()))
        : current + delta;
      if (target === current) return;
      if (lenis) lenis.scrollTo(target, { immediate: true });
      else window.scrollTo({ top: target, behavior: 'instant' });
    };
    const onStageTouchEnd = () => { stageTouch = null; };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (!['ArrowDown', 'PageDown', 'End', ' '].includes(event.key)) return;
      if (event.target instanceof HTMLElement) {
        if (event.target.closest('dialog, [role="dialog"], input, select, textarea, [contenteditable]')) return;
        if (event.key === ' ' && event.target.closest('button, a, [role="button"]')) return;
      }
      if (!isAtStage() || !tourPending()) return;
      const lenis = scroller?.current;
      if (lenis?.isStopped || lenis?.isLocked) return;
      event.preventDefault();
      const ceiling = Math.max(window.scrollY, scrollCeiling());
      const distance = event.key === 'ArrowDown' ? 40 : stage.clientHeight * .875;
      const target = event.key === 'End'
        ? ceiling
        : Math.min(ceiling, Math.max(window.scrollY, lenis?.targetScroll ?? 0) + distance);
      if (lenis) lenis.scrollTo(target, { programmatic: false, duration: lenis.options.duration, easing: lenis.options.easing });
      else window.scrollTo({ top: target, behavior: 'smooth' });
    };
    const update = () => {
      let scrollY = window.scrollY;
      const now = performance.now();
      if (scrollY > previousScrollY && now <= scrollGestureUntil.current) {
        scrollGestureUntil.current = now + SCROLL_MOMENTUM_WINDOW;
        const ceiling = Math.max(previousScrollY, scrollCeiling());
        // Clamp native touch momentum and browser scrolling to the same limit as Lenis.
        if (tourPending() && scrollY > ceiling) {
          scroller?.current?.scrollTo(ceiling, { immediate: true });
          if (window.scrollY > ceiling) window.scrollTo({ top: ceiling, behavior: 'instant' });
          scrollY = ceiling;
        }
      }
      previousScrollY = scrollY;
      if (!staticView && scrollY >= Math.floor(top + element.offsetHeight)) {
        const about = document.getElementById('about');
        if (about) showPreview(about, about.getBoundingClientRect().top);
        return;
      }
      // The browser scrolls to whole CSS pixels, even when the sticky end is fractional.
      const value = staticView ? 0 : scrollY >= stickyEnd() ? 1 : Math.max(0, (scrollY - top) / range);
      // Start the room and host downloads on the stairs, before the room enters view.
      if (!interiorRequestedRef.current && intersecting && value >= .10 && scrollY < top + range + window.innerHeight) {
        interiorRequestedRef.current = true;
        setInteriorRequested(true);
      }
      if (value === progress.current) return;
      progress.current = value;
      if (intersecting && !document.hidden && !staticView) invalidate.current();
    };
    const resize = () => { setMobile(media.matches); measure(); update(); };
    if (staticView) present(0);
    resize();
    window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('touchmove', onNativeTouchMove, { passive: true });
    stage.addEventListener('touchstart', onStageTouchStart, { passive: true });
    stage.addEventListener('touchmove', onStageTouchMove, { passive: false });
    stage.addEventListener('touchend', onStageTouchEnd, { passive: true });
    stage.addEventListener('touchcancel', onStageTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('click', clearScrollGesture, true);
    const sizeObserver = new ResizeObserver(() => { measure(); update(); });
    sizeObserver.observe(element);
    sizeObserver.observe(stage);
    return () => {
      observer.disconnect(); sizeObserver.disconnect(); document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('scroll', update); window.removeEventListener('resize', resize);
      window.removeEventListener('wheel', onWheel, true); window.removeEventListener('touchmove', onNativeTouchMove);
      stage.removeEventListener('touchstart', onStageTouchStart);
      stage.removeEventListener('touchmove', onStageTouchMove);
      stage.removeEventListener('touchend', onStageTouchEnd);
      stage.removeEventListener('touchcancel', onStageTouchEnd);
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('click', clearScrollGesture, true);
    };
  }, [staticView, present, scroller, showPreview]);
  const scrollTo = (top: number) => {
    if (scroller?.current) scroller.current.scrollTo(top, { immediate: reduced });
    else window.scrollTo({ top, behavior: reduced ? 'instant' : 'smooth' });
  };
  const skip = () => {
    const about = document.getElementById('about');
    if (about) showPreview(about, 0);
  };
  const explorePrograms = () => {
    const programs = document.getElementById('programs');
    if (programs) showPreview(programs, 0);
  };
  const replay = () => {
    const element = root.current;
    if (!element) return;
    layoutChange.current = { anchor: element, viewportTop: 0 };
    progress.current = 0;
    present(0);
    retry();
    setTourPreview(false);
    element.querySelector<HTMLElement>('#hero-title')?.focus({ preventScroll: true });
  };
  const begin = () => {
    const element = root.current!;
    const stage = element.querySelector<HTMLElement>('.gym-tour-stage')!;
    scrollTo(element.getBoundingClientRect().top + window.scrollY + (element.offsetHeight - stage.offsetHeight) * TOUR_ENTRY_PROGRESS);
  };
  return <section ref={root} id="home" className={`gym-tour-hero${staticView ? ' is-static' : ''}`} data-tour-active={inView && pageVisible && !staticView ? 'true' : 'false'} data-tour-status={reduced ? 'ready' : status} data-tour-beat={['exterior', 'entry', 'strength', 'cardio'][staticView ? 0 : beat]} data-tour-progress="0.0000" aria-labelledby="hero-title">
    <h1 id="hero-title" className="gym-tour-accessible-title">Nexus Fitness Club, Rajkot</h1>
    <div className="gym-tour-stage" data-tour-pending={!staticView && !tourComplete ? true : undefined} onContextMenu={event => event.preventDefault()}>
      <div className="gym-tour-visual" aria-hidden="true">
        {openingFinished && !staticView && <GymTourCanvas key={attempt} progress={progress} active={inView && pageVisible} mobile={mobile} interiorRequested={interiorRequested} onInvalidate={invalidate} onPresent={present} onReady={ready} onFailure={fail} />}
        <ArrivalPhotograph />
      </div>
      {!staticView && <div className="gym-tour-edge-shade" aria-hidden="true" />}
      {!staticView && <TourChapterCopy chapterIndex={chapter} />}
      {!staticView && status === 'ready' && beat === 0 && <button className="gym-tour-enter" onClick={begin}><span>FOLLOW RYAN INSIDE</span><ArrowDown size={15} aria-hidden /></button>}
      {!staticView && <button className="gym-tour-skip" onClick={skip}>Skip tour <ArrowUpRight size={13} aria-hidden /></button>}
      {!staticView && beat === 3 && <div className="gym-tour-final-actions"><button data-tour-trial onClick={onTrial}>Book a trial <ArrowUpRight size={16} aria-hidden /></button><button onClick={explorePrograms}>Explore programs <ArrowUpRight size={16} aria-hidden /></button></div>}
      {staticView && <div className="gym-tour-static-copy">
        <p>RAJKOT</p><h2 className="gym-tour-arrival-title"><ArrivalWordmark /></h2>
        <button data-tour-trial onClick={onTrial}>Book a trial <ArrowUpRight size={16} aria-hidden /></button>
        <button onClick={onExplorePrograms}>Explore programs</button>
        {tourPreview && !reduced && <button onClick={replay}>Replay tour <RotateCcw size={16} aria-hidden /></button>}
      </div>}
      {status === 'loading' && !reduced && <span className="gym-tour-loading" role="status">Opening the gym tour…</span>}
      {status === 'error' && <div className="gym-tour-fallback-note"><span role="status">Explore Nexus at your own pace.</span><button type="button" onClick={retry}>Retry tour</button></div>}
    </div>
  </section>;
}
