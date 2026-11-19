'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export type ArrivalShot = { present: (progress: number) => void };
const landscape = '/models/nexus-gym/arrival-street.webp';
const smooth = (value: number) => value * value * (3 - 2 * value);
const unit = (value: number) => Math.max(0, Math.min(1, value));

const ArrivalPhotograph = forwardRef<ArrivalShot, { interactive: boolean }>(function ArrivalPhotograph({ interactive }, ref) {
  const frame = useRef<HTMLDivElement>(null);
  const picture = useRef<HTMLPictureElement>(null);
  const live = useRef(true);
  const failed = useRef(false);

  useImperativeHandle(ref, () => ({
    present(progress) {
      const element = frame.current;
      if (!element || failed.current) return;
      // Cut directly to the guide on the moving approach. Photo and model have
      // different perspectives, so blending would double the facade at rest.
      const visible = progress < .074;
      if (visible !== live.current) {
        element.style.visibility = visible ? 'visible' : 'hidden';
        live.current = visible;
      }
      if (!visible) return;
      const approach = smooth(unit(progress / .11));
      element.style.transform = `scale(${1 + approach * 1.6})`;
    },
  }), []);

  useEffect(() => {
    const layer = picture.current;
    const stage = frame.current?.closest('.gym-tour-stage');
    if (!layer || !(stage instanceof HTMLElement) || !interactive ||
        !window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
    let pending = 0;
    let x = 0;
    let y = 0;
    function apply() {
      pending = 0;
      layer!.style.transform = `translate3d(${x}px,${y}px,0) scale(1.015)`;
    }
    function move(event: PointerEvent) {
      if (!live.current || event.pointerType === 'touch') return;
      const rect = stage!.getBoundingClientRect();
      x = (0.5 - (event.clientX - rect.left) / rect.width) * 9;
      y = (0.5 - (event.clientY - rect.top) / rect.height) * 5;
      if (!pending) pending = requestAnimationFrame(apply);
    }
    function reset() {
      cancelAnimationFrame(pending);
      pending = 0;
      layer!.style.transform = '';
    }
    stage.addEventListener('pointermove', move, { passive: true });
    stage.addEventListener('pointerleave', reset);
    return () => {
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerleave', reset);
      reset();
    };
  }, [interactive]);

  return <div className="gym-tour-arrival" ref={frame} aria-hidden="true">
    <picture ref={picture}>
      <source media="(max-aspect-ratio: 6/5)" srcSet="/models/nexus-gym/arrival-street-portrait.webp" />
      <img src={landscape} alt="" width={1836} height={856} draggable={false} decoding="async" onError={event => {
        const image = event.currentTarget;
        const source = image.parentElement?.querySelector('source');
        if (source && image.currentSrc.endsWith('arrival-street-portrait.webp')) {
          source.removeAttribute('srcset');
          image.src = landscape;
        } else if (frame.current) {
          failed.current = true;
          frame.current.style.visibility = 'hidden';
        }
      }}/>
    </picture>
  </div>;
});
export default ArrivalPhotograph;
