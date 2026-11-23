'use client';

import { useEffect, useRef } from 'react';

// Value-noise density, baked once into a small sprite rather than sampled every frame.
function smokeSprite() {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 192;
  const context = sprite.getContext('2d');
  if (!context) return sprite;
  const pixels = context.createImageData(192, 192);
  const hash = (x: number, y: number) => {
    const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return (hash(ix, iy) * (1 - u) + hash(ix + 1, iy) * u) * (1 - v)
      + (hash(ix, iy + 1) * (1 - u) + hash(ix + 1, iy + 1) * u) * v;
  };
  for (let y = 0; y < 192; y++) for (let x = 0; x < 192; x++) {
    const radius = Math.hypot((x - 96) / 96, (y - 96) / 96);
    let density = 0;
    for (let octave = 0; octave < 4; octave++) density += noise(x / 28 * 2 ** octave, y / 28 * 2 ** octave) / 2 ** (octave + 1);
    const i = (y * 192 + x) * 4;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
    pixels.data[i + 3] = Math.max(0, (density - .19) * 1.8) * Math.max(0, 1 - radius) ** 1.5 * 220;
  }
  context.putImageData(pixels, 0, 0);
  return sprite;
}

export default function FooterSmoke({ paused }: { paused: boolean }) {
  const rear = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const backCanvas = rear.current, frontCanvas = front.current;
    if (!backCanvas || !frontCanvas) return;
    const back = backCanvas.getContext('2d'), floor = frontCanvas.getContext('2d');
    if (!back || !floor) return;
    const sprite = smokeSprite();
    const tinted = document.createElement('canvas');
    tinted.width = tinted.height = 192;
    const tint = tinted.getContext('2d');
    if (!tint) return;
    let width = 0, height = 0, frame = 0, last = 0, elapsed = 0, visible = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => {
      const box = backCanvas.getBoundingClientRect();
      width = box.width; height = box.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      for (const canvas of [backCanvas, frontCanvas]) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
      back.setTransform(ratio, 0, 0, ratio, 0, 0);
      floor.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const cloud = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, color: string, alpha: number) => {
      tint.clearRect(0, 0, 192, 192);
      tint.globalCompositeOperation = 'source-over'; tint.drawImage(sprite, 0, 0);
      tint.globalCompositeOperation = 'source-in'; tint.fillStyle = color; tint.fillRect(0, 0, 192, 192);
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rotation);
      ctx.drawImage(tinted, -size / 2, -size / 2, size, size); ctx.restore();
    };
    const paint = () => {
      back.clearRect(0, 0, width, height); floor.clearRect(0, 0, width, height);
      const light = document.documentElement.dataset.theme === 'light';
      for (let i = 0; i < (width < 600 ? 26 : 44); i++) {
        const phase = (elapsed * .045 + i * .618033) % 1;
        const side = i % 2 ? 1 : -1;
        const x = width * (.5 + side * (.16 + (i % 7) * .045) + Math.sin(phase * 5 + i) * .035);
        const y = height * (.87 - phase * .95);
        const size = width * (.17 + phase * .2 + (i % 3) * .035);
        const alpha = Math.sin(phase * Math.PI) * .65;
        cloud(back, x, y, size, i + phase * .8, i % 3 ? '#c20913' : light ? '#2c1518' : '#8b2529', alpha);
      }
      for (let i = 0; i < 16; i++) {
        const phase = (elapsed * .025 + i * .618033) % 1;
        cloud(floor, width * (-.1 + phase * 1.2), height * (.82 + Math.sin(i + phase * 4) * .035), width * (.22 + (i % 3) * .035), i + phase, light ? '#e4dddd' : '#ad8588', .42);
      }
      backCanvas.dataset.frame = String(Math.round(elapsed * 30));
    };
    const tick = (now: number) => {
      if (!visible || paused || reduced.matches || document.hidden) { frame = 0; return; }
      if (now - last >= 33) { elapsed += Math.min((now - last) / 1000, .05); last = now; paint(); }
      frame = requestAnimationFrame(tick);
    };
    const start = () => { if (!frame && visible && !paused && !reduced.matches && !document.hidden) { last = performance.now(); frame = requestAnimationFrame(tick); } };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) { paint(); start(); } }, { threshold: .01 });
    const resizer = new ResizeObserver(() => { resize(); paint(); });
    const change = () => { paint(); start(); };
    const theme = new MutationObserver(() => paint());
    resize(); paint(); observer.observe(backCanvas); resizer.observe(backCanvas);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    reduced.addEventListener('change', change); document.addEventListener('visibilitychange', change);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); resizer.disconnect(); theme.disconnect(); reduced.removeEventListener('change', change); document.removeEventListener('visibilitychange', change); };
  }, [paused]);
  return <><canvas ref={rear} className="nexus-smoke nexus-smoke-rear" data-testid="nexus-smoke" aria-hidden="true" />
    <canvas ref={front} className="nexus-smoke nexus-smoke-floor" aria-hidden="true" /></>;
}
