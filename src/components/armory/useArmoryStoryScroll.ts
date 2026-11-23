'use client';

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePageScroller } from '../layout/SmoothScroll';

const stops = [0, 0.5, 0.94];
const transitions = [
  { start: .06, switchAt: .23 },
  { start: .47, switchAt: .64 },
];

export function useArmoryStoryScroll(
  runwayRef: RefObject<HTMLDivElement | null>,
  sectionRef: RefObject<HTMLElement | null>,
  revealed: boolean,
  onStage: (index: number) => void,
) {
  const [enhanced, setEnhanced] = useState(false);
  const trigger = useRef<ScrollTrigger | null>(null);
  const scroller = usePageScroller();

  useLayoutEffect(() => {
    if (!revealed) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add('(min-height: 620px) and (prefers-reduced-motion: no-preference)', () => {
      setEnhanced(true);
      return () => setEnhanced(false);
    });
    return () => media.revert();
  }, [revealed]);

  useLayoutEffect(() => {
    const runway = runwayRef.current;
    const section = sectionRef.current;
    if (!enhanced || !runway || !section) return;
    const context = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>('.ag-story-panel', section);
      const timeline = gsap.timeline({
        onUpdate() {
          const time = this.time();
          onStage(time < transitions[0].switchAt ? 0 : time < transitions[1].switchAt ? 1 : 2);
        },
        scrollTrigger: {
          trigger: runway,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
      });
      transitions.forEach(({ start }, index) => {
        timeline.fromTo(
          panels[index + 1],
          { yPercent: 48, rotation: 6, autoAlpha: 0 },
          { yPercent: 0, rotation: 0, autoAlpha: 1, duration: .28, ease: 'power2.inOut' },
          start,
        );
        timeline.to(panels[index], { yPercent: -5, duration: .28, ease: 'power2.inOut' }, start);
      });
      // Hold Precision in view before the sticky section releases.
      timeline.to({}, { duration: .25 }, .75);
      trigger.current = timeline.scrollTrigger ?? null;
    }, section);
    const observer = new ResizeObserver(() => trigger.current?.refresh());
    observer.observe(runway);
    return () => {
      observer.disconnect();
      trigger.current = null;
      context.revert();
    };
  }, [enhanced, onStage, runwayRef, sectionRef]);

  return {
    enhanced,
    jumpToStage(index: number) {
      const current = trigger.current;
      if (!current) return;
      const top = current.start + (current.end - current.start) * stops[index];
      if (scroller?.current) scroller.current.scrollTo(top, { immediate: true });
      else window.scrollTo({ top, behavior: 'instant' });
      current.update();
    },
  };
}
