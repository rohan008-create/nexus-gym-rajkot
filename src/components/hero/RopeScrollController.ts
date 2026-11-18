'use client';
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { RopeLayout } from './ropeGeometry';

export type RopeMotion = {
  progress: React.MutableRefObject<number>;
  pointer: React.MutableRefObject<{ x: number; y: number }>;
  velocity: React.MutableRefObject<number>;
  layout: React.MutableRefObject<RopeLayout>;
};
export const ROPE_SCROLL = { start: 'top top', end: 'bottom top' };
export function useRopeScrollMotion({ pointer, layout }: RopeMotion, reduced: boolean) {
  const { camera, size } = useThree();
  useFrame((_, delta) => {
    const mobile = size.width < 720;
    const px = !reduced && !mobile ? pointer.current.x * .075 : 0;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, px, 4, Math.min(delta, .05));
    // Document pixels map to world units. Only the camera descends: the rope anchor
    // remains in the Hero's world coordinates, and naturally leaves the viewport.
    const scroll = Math.max(0, window.scrollY - layout.current.rootTop);
    const stickyEnd = Math.max(0, (layout.current.sceneHeight ?? layout.current.heroHeight * 2) - layout.current.viewHeight / layout.current.unit);
    camera.position.y = .1 - Math.min(scroll, stickyEnd) * layout.current.unit;
    camera.lookAt(camera.position.x * .2, camera.position.y, 0);
  });
}
export function useHeroTransition(root: React.RefObject<HTMLElement>, motion: RopeMotion, reduced: boolean, onSection?: (section: 'Home' | 'About' | 'Programs') => void, entranceEnabled = true, gymTour = false) {
  const { progress, velocity, layout } = motion;
  const entrance = useRef<gsap.core.Timeline | null>(null);
  const enabled = useRef(entranceEnabled);
  enabled.current = entranceEnabled;
  // Only play the prepared entrance on impact. Do not rebuild the page's
  // ScrollTriggers, pinning and layout measurements in the middle of a frame.
  useLayoutEffect(() => {
    const element = root.current; if (!element) return;
    const context = gsap.context(() => {
      if (reduced) { gsap.set('[data-reveal], .persistent-scene, .site-nav', { autoAlpha: 1, clearProps: 'transform' }); return; }
      if (gymTour) {
        entrance.current = gsap.timeline({ paused: true }).fromTo('.site-nav', { y: -6, opacity: 0 }, { y: 0, opacity: 1, duration: .55, ease: 'power3.out' });
        if (enabled.current) entrance.current.play();
        return;
      }
      entrance.current = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
        .fromTo('.persistent-scene', { opacity: 0 }, { opacity: 1, duration: .85 })
        .fromTo('.hero-copy .eyebrow', { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: .45 }, .05)
        .fromTo('.headline-line > span', { yPercent: 65, rotate: 0 }, { yPercent: 0, duration: .8, stagger: .065 }, .1)
        .fromTo('.hero-description, .hero-actions', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .06 }, .4)
        .fromTo('.site-nav', { y: -6, opacity: 0 }, { y: 0, opacity: 1, duration: .55 }, .2);
      if (enabled.current) entrance.current.play();
    }, element);
    return () => { context.revert(); entrance.current = null; };
  }, [root, reduced, gymTour]);
  useLayoutEffect(() => {
    if (entranceEnabled) entrance.current?.play();
    else entrance.current?.pause(0);
  }, [entranceEnabled, reduced]);
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const element = root.current; if (!element) return;
    const measure = () => {
      const rootTop = element.getBoundingClientRect().top + window.scrollY;
      const height = element.querySelector('.persistent-scene')?.getBoundingClientRect().height || window.innerHeight;
      const heroHeight = element.querySelector(gymTour ? '#home' : '.hero-section')!.getBoundingClientRect().height;
      const copy = element.querySelector('.about-copy')!.getBoundingClientRect();
      const heading = element.querySelector('#about-title')!.getBoundingClientRect();
      const worldHeight = 2 * Math.tan(35 * Math.PI / 360) * 10.2;
      const changed = Math.abs(layout.current.unit - worldHeight / height) > .000001 || Math.abs(layout.current.heroHeight - heroHeight) > .1;
      const sceneHeight = element.querySelector('.hero-experience')!.getBoundingClientRect().height;
      layout.current = { unit: worldHeight / height, viewHeight: worldHeight, heroHeight, rootTop, sceneHeight,
        aboutStart: copy.top + window.scrollY - rootTop, aboutEnd: copy.bottom + window.scrollY - rootTop,
        headingPageY: heading.top + window.scrollY - rootTop + 65, version: layout.current.version + (changed ? 1 : 0) };
    };
    measure();
    const context = gsap.context(() => {
      const scroll = { value: 0 };
      const timeline = gsap.timeline({ scrollTrigger: { trigger: element.querySelector(gymTour ? '#about' : '.hero-section'), ...(gymTour ? { start: 'top 95%', end: 'top 15%' } : ROPE_SCROLL), scrub: reduced ? true : .35,
        onUpdate: self => { velocity.current = reduced ? 0 : Math.min(1, Math.abs(self.getVelocity()) / 2400); }, onRefresh: measure } });
      timeline.to(scroll, { value: 1, duration: 1, ease: 'none', onUpdate: () => { progress.current = scroll.value; } }, 0)
        .fromTo('.gym-image-reveal', { clipPath: 'inset(12% 0 12% 100%)', opacity: 0 }, { clipPath: 'inset(0% 0 0% 0%)', opacity: 1, duration: .3, ease: 'power2.out' }, .52)
        .fromTo('.gym-photo-group', { xPercent: reduced ? 0 : 3, scale: reduced ? 1 : 1.06 }, { xPercent: 0, scale: 1, duration: .4, ease: 'none' }, .6)
        .fromTo('.about-line > span', reduced ? { opacity: 0 } : { yPercent: 108, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .13, stagger: .06, ease: 'power2.out' }, .58)
        .fromTo('.about-support', { opacity: 0, y: reduced ? 0 : 18 }, { opacity: 1, y: 0, duration: .13, stagger: .035, ease: 'power2.out' }, .74);
      ScrollTrigger.create({ trigger: '#home', start: 'top 45%', end: 'bottom 45%', onEnter: () => onSection?.('Home'), onEnterBack: () => onSection?.('Home') });
      ScrollTrigger.create({ trigger: '#about', start: 'top 45%', end: 'bottom 45%', onEnter: () => onSection?.('About'), onEnterBack: () => onSection?.('About') });
      ScrollTrigger.create({ trigger: '#programs', start: 'top 45%', end: 'bottom bottom', onEnter: () => onSection?.('Programs'), onEnterBack: () => onSection?.('Programs') });
      gsap.timeline({ scrollTrigger: { trigger: '#programs', start: 'top 85%', end: 'top 35%', scrub: reduced ? true : .4 } })
        .fromTo('.programs-light-sweep', { opacity: 0, scaleX: .1 }, { opacity: .7, scaleX: 1, duration: .35 }, 0)
        .fromTo('.programs-heading', { opacity: 0, y: reduced ? 0 : 28 }, { opacity: 1, y: 0, duration: .5 }, .1)
        .fromTo('.program-panel', { opacity: 0, y: reduced ? 0 : 45 }, { opacity: 1, y: 0, duration: .5, stagger: .055 }, .2);
    }, element);
    let disposed = false;
    document.fonts.ready.then(() => { if (!disposed) { measure(); ScrollTrigger.refresh(); } });
    window.addEventListener('resize', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(element.querySelector('.about-copy')!);
    return () => { disposed = true; observer.disconnect(); window.removeEventListener('resize', measure); context.revert(); progress.current = 0; velocity.current = 0; };
  }, [root, progress, velocity, layout, reduced, onSection, gymTour]);
}
