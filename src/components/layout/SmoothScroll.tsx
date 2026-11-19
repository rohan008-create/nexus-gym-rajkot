'use client';
import { createContext, useContext, useEffect, useRef, type MutableRefObject } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const ScrollContext = createContext<MutableRefObject<Lenis | null> | null>(null);
export function usePageScroller() {
  return useContext(ScrollContext);
}

/**
 * Global Lenis Smooth Scroll Provider
 * Integrates with GSAP ScrollTrigger for buttery smooth 60/120fps scrolling.
 */
export default function SmoothScroll({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
    });

    lenisRef.current = lenis;

    // Sync Lenis scroll events with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  return <ScrollContext.Provider value={lenisRef}>{children}</ScrollContext.Provider>;
}
