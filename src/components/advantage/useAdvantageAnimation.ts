'use client';
import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function useAdvantageAnimation(root: React.RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = root.current;
    if (!section) return;
    const media = gsap.matchMedia();
    media.add({ reduce: '(prefers-reduced-motion: reduce)', pointer: '(hover: hover) and (pointer: fine)', mobile: '(max-width: 719px)' }, context => {
      const { reduce, pointer, mobile } = context.conditions!;
      if (reduce) return;
      const find = gsap.utils.selector(section);
      const entrance = gsap.timeline({ scrollTrigger: {
        id: 'nexus-advantage-entrance', trigger: section, start: 'top 85%', end: mobile ? 'top 5%' : 'top 12%', scrub: .5,
      } });
      entrance.fromTo(find('.advantage-boundary'), { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: .65, duration: .5 }, 0)
        .fromTo(find('.advantage-darkness'), { opacity: .9 }, { opacity: 0, duration: 1 }, .05)
        .fromTo(find('.advantage-scanner'), { xPercent: -120, opacity: 0 }, { xPercent: 120, opacity: .55, duration: .7 }, .05)
        .to(find('.advantage-scanner'), { opacity: 0, duration: .25 }, .65)
        .fromTo(find('.advantage-eyebrow'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .35 }, .1)
        .fromTo(find('.advantage-heading-line > span'), { yPercent: 105, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: .12, duration: .5 }, .17)
        .fromTo(find('.advantage-introduction'), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .35 }, .42)
        .fromTo(find('.advantage-item'), { y: 16, opacity: 0 }, { y: 0, opacity: 1, stagger: .08, duration: .4 }, .5);
      gsap.fromTo(find('.advantage-scroll-visual'), { y: mobile ? 8 : 24 }, { y: mobile ? -8 : -24, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: .6 } });
      const exit = gsap.timeline({ scrollTrigger: { id: 'nexus-advantage-exit', trigger: section, start: 'bottom 72%', end: 'bottom 15%', scrub: .5 } });
      exit.to(find('.advantage-scroll-visual'), { opacity: .2, duration: 1 }, 0)
        .fromTo(find('.advantage-exit-light'), { xPercent: -100, opacity: 0 }, { xPercent: 100, opacity: .7, duration: .8 }, 0)
        .to(find('.advantage-exit-light'), { opacity: 0, duration: .2 }, .8);
      // Fade the released Armory naturally as the athlete enters. No new pin.
      const armoryVisual = section.previousElementSibling?.querySelector('[data-stage="precision"] .armory-visual');
      if (armoryVisual) gsap.fromTo(armoryVisual, { opacity: 1 }, { opacity: 0, scrollTrigger: { trigger: section, start: 'top 95%', end: 'top 55%', scrub: true } });
      const visual = section.querySelector<HTMLElement>('.advantage-pointer-visual')!;
      const haze = section.querySelector<HTMLElement>('.advantage-haze')!;
      const x = gsap.quickTo(visual, 'x', { duration: .8, ease: 'power3.out' });
      const y = gsap.quickTo(visual, 'y', { duration: .8, ease: 'power3.out' });
      const glow = gsap.quickTo(haze, 'x', { duration: 1, ease: 'power3.out' });
      let bounds = section.getBoundingClientRect();
      const enter = () => { bounds = section.getBoundingClientRect(); };
      const move = (event: PointerEvent) => { x(((event.clientX - bounds.left) / bounds.width - .5) * 16); y(((event.clientY - bounds.top) / bounds.height - .5) * 12); glow(((event.clientX - bounds.left) / bounds.width - .5) * 10); };
      const leave = () => { x(0); y(0); glow(0); };
      if (pointer) { section.addEventListener('pointerenter', enter); section.addEventListener('pointermove', move); section.addEventListener('pointerleave', leave); }
      return () => { section.removeEventListener('pointerenter', enter); section.removeEventListener('pointermove', move); section.removeEventListener('pointerleave', leave); };
    }, section);
    return () => media.revert();
  }, [root]);
}
