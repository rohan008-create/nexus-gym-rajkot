'use client';
import { useEffect } from 'react';

/** One entrance per section; no pinning or animation work after the reveal. */
export function useAdvantageAnimation(root: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const section = root.current;
    if (!section) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;
    const reveal = () => { section.dataset.visible = 'true'; observer?.disconnect(); };
    if (media.matches || !('IntersectionObserver' in window)) reveal();
    else {
      section.dataset.visible = 'false';
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) reveal();
      }, { threshold: .08 });
      observer.observe(section);
    }
    const change = () => { if (media.matches) reveal(); };
    media.addEventListener('change', change);
    return () => { observer?.disconnect(); media.removeEventListener('change', change); };
  }, [root]);
}
