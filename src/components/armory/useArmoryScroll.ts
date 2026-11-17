'use client';
import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function useArmoryScroll(root: React.RefObject<HTMLElement>, onEnhanced: (value: boolean) => void, onStage: (value: number) => void) {
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const element = root.current; if (!element) return;
    const media = gsap.matchMedia();
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      // Warm all three small assets before entering the pinned sequence, so a
      // fast scroll cannot reveal an image that is still waiting to load.
      element.querySelectorAll<HTMLImageElement>('.armory-equipment').forEach(image => {
        image.loading = 'eager';
        void image.decode().catch(() => {});
      });
      observer.disconnect();
    }, { rootMargin: '650px' });
    observer.observe(element);
    media.add({ desktop: '(min-width: 1024px) and (min-height: 650px) and (hover: hover) and (pointer: fine)', reduce: '(prefers-reduced-motion: reduce)', pointer: '(hover: hover) and (pointer: fine)' }, context => {
      const { desktop, reduce, pointer } = context.conditions!;
      onStage(0);
      if (!desktop || reduce) {
        gsap.set(element.querySelectorAll('.armory-stage, .armory-title-line > span, .armory-stage-description, .armory-programs-cta, .armory-equipment, .armory-parallax'), { clearProps: 'opacity,visibility,transform' });
        onEnhanced(false); element.classList.remove('armory-is-pinned');
        return;
      }
      const showcase = element.querySelector<HTMLElement>('.armory-showcase')!;
      const stages = gsap.utils.toArray<HTMLElement>('.armory-stage', element);
      const photos = gsap.utils.toArray<HTMLElement>('.armory-equipment', element);
      const scanner = element.querySelector('.armory-scanner')!;
      element.classList.add('armory-is-pinned'); onEnhanced(true);
      gsap.set(stages, { autoAlpha: 0 }); gsap.set(stages[0], { autoAlpha: 1 });
      gsap.set(scanner, { xPercent: -120, opacity: 0 });
      let last = -1;
      const timeline = gsap.timeline({ defaults: { ease: 'power2.inOut' },
        // Follow the scrubbed animation, including reverse scroll, rather than
        // jumping the accessible state ahead to the raw scroll position.
        onUpdate: () => {
          const time = timeline.time();
          const stage = time < 1.07 ? 0 : time < 2.12 ? 1 : 2;
          if (stage !== last) { last = stage; onStage(stage); }
        }, scrollTrigger: {
        id: 'nexus-armory', trigger: showcase, start: 'top 84px', end: () => `+=${Math.round(window.innerHeight * 1.65)}`,
        pin: true, pinSpacing: true, scrub: .45, anticipatePin: 1, invalidateOnRefresh: true,
      } });
      timeline.fromTo(photos[0], { scale: 1.035 }, { scale: 1, duration: .68 }, 0)
        .fromTo(stages[0].querySelectorAll('.armory-title-line > span'), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .24, stagger: .05 }, 0)
        .fromTo(stages[0].querySelector('.armory-stage-description'), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .25 }, .18)
        .to(stages[0], { autoAlpha: 0, x: -14, duration: .21 }, .83)
        .fromTo(scanner, { xPercent: -120, opacity: 0 }, { xPercent: 120, opacity: .35, duration: .43 }, .9)
        .to(scanner, { opacity: 0, duration: .12 }, 1.25)
        .fromTo(stages[1], { autoAlpha: 0, x: 14 }, { autoAlpha: 1, x: 0, duration: .25 }, 1.07)
        .fromTo(photos[1], { scale: 1.035 }, { scale: 1, duration: .65 }, 1.07)
        .fromTo(stages[1].querySelectorAll('.armory-title-line > span'), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .23, stagger: .05 }, 1.07)
        .fromTo(stages[1].querySelector('.armory-stage-description'), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .22 }, 1.25)
        .to(stages[1], { autoAlpha: 0, x: -14, duration: .21 }, 1.88)
        .fromTo(scanner, { xPercent: -120, opacity: 0 }, { xPercent: 120, opacity: .35, duration: .43 }, 1.95)
        .to(scanner, { opacity: 0, duration: .12 }, 2.3)
        .fromTo(stages[2], { autoAlpha: 0, x: 14 }, { autoAlpha: 1, x: 0, duration: .25 }, 2.12)
        .fromTo(photos[2], { scale: 1.035 }, { scale: 1, duration: .7 }, 2.12)
        .fromTo(stages[2].querySelectorAll('.armory-title-line > span'), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .23, stagger: .05 }, 2.12)
        .fromTo(stages[2].querySelector('.armory-stage-description'), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .23 }, 2.3)
        .fromTo(stages[2].querySelector('.armory-programs-cta'), { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: .22 }, 2.5)
        .fromTo(element.querySelector('.armory-progress-fill'), { scaleX: 0 }, { scaleX: 1, duration: 3.15, ease: 'none' }, 0);
      const parallax = gsap.utils.toArray<HTMLElement>('.armory-parallax', element);
      const x = parallax.map(node => gsap.quickTo(node, 'x', { duration: .7, ease: 'power3.out' }));
      const y = parallax.map(node => gsap.quickTo(node, 'y', { duration: .7, ease: 'power3.out' }));
      let bounds = showcase.getBoundingClientRect();
      const enter = () => { bounds = showcase.getBoundingClientRect(); };
      const move = (event: PointerEvent) => { const px = ((event.clientX - bounds.left) / bounds.width - .5) * 16, py = ((event.clientY - bounds.top) / bounds.height - .5) * 10; x.forEach(to => to(px)); y.forEach(to => to(py)); };
      const leave = () => { x.forEach(to => to(0)); y.forEach(to => to(0)); };
      if (pointer) { showcase.addEventListener('pointerenter', enter); showcase.addEventListener('pointermove', move); showcase.addEventListener('pointerleave', leave); }
      return () => {
        // matchMedia reverts its timeline, inline styles and pin spacer together.
        element.classList.remove('armory-is-pinned');
        showcase.removeEventListener('pointerenter', enter); showcase.removeEventListener('pointermove', move); showcase.removeEventListener('pointerleave', leave);
      };
    }, element);
    return () => { observer.disconnect(); media.revert(); };
  }, [root, onEnhanced, onStage]);
}
