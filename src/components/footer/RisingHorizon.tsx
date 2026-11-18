'use client';

import { useEffect, useRef } from 'react';

/** Original canvas effect: light rises from a crimson horizon. No Pro source is used. */
export default function RisingHorizon() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current!, canvas = element.querySelector('canvas')!, parent = element.parentElement!;
    const context = canvas.getContext('2d');
    if (!context) { element.dataset.mode = 'fallback'; return; }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = matchMedia('(pointer: coarse)');
    const count = coarse.matches ? 42 : 78;
    let seed = 9081;
    const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
    const lines = Array.from({ length: count }, () => ({ x: random(), phase: random(), depth: .2 + random() * .8, speed: .035 + random() * .045, length: .1 + random() * .15 }));
    const volleys = Array.from({ length: 24 }, () => ({ x: 0, phase: 2, speed: 0, length: 0 }));
    let width = 1, height = 1, horizon = 1, raf = 0, last = 0, time = 0, visible = false, disposed = false, frame = 0, report = 0;
    let pointerX = .5, smoothX = .5, pointerInside = false, volleyCursor = 0;
    let pressed: { x: number; y: number } | undefined;

    const streak = (x: number, progress: number, depth: number, length: number, strength: number) => {
      const envelope = Math.sin(Math.min(1, progress) * Math.PI);
      if (envelope < .01) return;
      const travel = height * (.38 + depth * .48);
      const headY = horizon - progress * travel;
      const tailY = Math.min(horizon, headY + height * length * (.4 + depth * .6));
      const headX = x * width + (x - .5) * progress * width * .025 + Math.sin(time * .4 + x * 40) * progress * 2;
      const tailX = headX - (x - .5) * length * width * .025;
      const alpha = Math.min(.85, envelope * (.18 + depth * .52) * strength);
      const gradient = context.createLinearGradient(headX, headY, headX, tailY + 1);
      gradient.addColorStop(0, `rgba(255,211,197,${alpha})`);
      gradient.addColorStop(.13, `rgba(255,70,65,${alpha * .9})`);
      gradient.addColorStop(.65, `rgba(176,13,25,${alpha * .55})`);
      gradient.addColorStop(1, 'rgba(120,5,15,0)');
      context.strokeStyle = gradient; context.lineWidth = .55 + depth * .65;
      context.beginPath(); context.moveTo(headX, headY);
      context.quadraticCurveTo((headX + tailX) / 2 + Math.sin(x * 25) * 1.2, (headY + tailY) / 2, tailX, tailY); context.stroke();
      if (depth > .65) { context.fillStyle = `rgba(255,159,139,${alpha * .65})`; context.fillRect(headX - .5, headY, 1, 1.7); }
    };
    const paint = (dt: number) => {
      context.clearRect(0, 0, width, height);
      time += dt;
      smoothX += (pointerX - smoothX) * (1 - Math.exp(-dt * 9));
      for (const line of lines) {
        const lift = pointerInside ? Math.exp(-Math.pow((line.x - smoothX) * 8, 2)) : 0;
        line.phase = (line.phase + dt * line.speed * (1 + lift * 1.8)) % 1;
        streak(line.x, line.phase, line.depth, line.length, 1 + lift * .8);
      }
      let active = 0;
      for (const volley of volleys) {
        if (volley.phase >= 1) continue;
        active++; volley.phase += dt * volley.speed;
        streak(volley.x, volley.phase, .85, volley.length, 1.3);
      }
      frame++; report += dt;
      if (report > .2 || dt === 0) { element.dataset.frame = String(frame); element.dataset.volleys = String(active); element.dataset.pointer = String(pointerInside); report = 0; }
    };
    const draw = (now: number) => {
      raf = 0; if (disposed || !visible || document.hidden || reduced.matches) return;
      const elapsed = last ? (now - last) / 1000 : .016;
      if (last && !pointerInside && elapsed < .03) { raf = requestAnimationFrame(draw); return; }
      last = now; paint(Math.min(elapsed, .05)); raf = requestAnimationFrame(draw);
    };
    const sync = () => {
      cancelAnimationFrame(raf); raf = 0; last = 0;
      element.dataset.mode = reduced.matches ? 'still' : 'animated';
      if (reduced.matches) { pointerInside = false; paint(0); }
      else if (visible && !document.hidden) raf = requestAnimationFrame(draw);
    };
    const resize = () => {
      width = element.clientWidth; height = element.clientHeight; horizon = height * .91;
      const ratio = Math.min(devicePixelRatio || 1, coarse.matches ? 1 : 1.25);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0); paint(0);
    };
    const ignore = (target: EventTarget | null) => target instanceof Element && !!target.closest('a, button, input');
    const move = (event: PointerEvent) => {
      if (reduced.matches || ignore(event.target)) { pointerInside = false; return; }
      const rect = element.getBoundingClientRect(); pointerX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)); pointerInside = event.pointerType !== 'touch';
    };
    const leave = () => { pointerInside = false; pressed = undefined; };
    const down = (event: PointerEvent) => { if (!ignore(event.target)) pressed = { x: event.clientX, y: event.clientY }; };
    const up = (event: PointerEvent) => {
      if (!pressed || ignore(event.target) || reduced.matches) { pressed = undefined; return; }
      const distance = Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y); pressed = undefined;
      if (distance > 8) return;
      const rect = element.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width;
      for (let i = 0; i < (coarse.matches ? 8 : 12); i++) {
        const volley = volleys[volleyCursor++ % volleys.length];
        volley.x = Math.max(.02, Math.min(.98, x + (random() - .5) * .13));
        volley.phase = random() * .06; volley.speed = .28 + random() * .2; volley.length = .15 + random() * .12;
      }
      element.dataset.launches = String(Number(element.dataset.launches || 0) + 1);
    };
    parent.addEventListener('pointermove', move, { passive: true }); parent.addEventListener('pointerleave', leave);
    parent.addEventListener('pointerdown', down, { passive: true }); parent.addEventListener('pointerup', up, { passive: true }); parent.addEventListener('pointercancel', leave);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; element.dataset.visible = String(visible); if (!visible) pointerInside = false; sync(); }, { threshold: .01 });
    const resizer = new ResizeObserver(resize); resizer.observe(element); resize(); observer.observe(element); sync();
    reduced.addEventListener('change', sync); document.addEventListener('visibilitychange', sync);
    return () => {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect(); resizer.disconnect();
      reduced.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync);
      parent.removeEventListener('pointermove', move); parent.removeEventListener('pointerleave', leave); parent.removeEventListener('pointerdown', down); parent.removeEventListener('pointerup', up); parent.removeEventListener('pointercancel', leave);
      context.clearRect(0, 0, width, height);
    };
  }, []);
  return <div ref={root} className="rising-horizon" aria-hidden="true"><canvas /></div>;
}
