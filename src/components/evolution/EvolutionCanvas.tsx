'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ImageSequence } from './SequenceCache';
import { anatomyCallouts } from './evolutionChapters';

type Bounds = { x: number; y: number; width: number; height: number };
export type EvolutionManifest = { frameCount: number; frameRate: number; packs?: { framesPerPack: number }; subjectBounds: Bounds; desktop: { width: number; height: number }; mobile: { width: number; height: number }; sourceOverlays: (Bounds & { id: string })[] };
export type CanvasHandle = { seek: (frame: number) => void; pause: (value: boolean) => void };
type Layout = Bounds & { areaWidth: number; areaHeight: number };

const EvolutionCanvas = forwardRef<CanvasHandle, { manifest: EvolutionManifest; onReady: () => void; onError: () => void }>(function EvolutionCanvas({ manifest, onReady, onError }, forwarded) {
  const area = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const loader = useRef<ImageSequence | null>(null);
  const wanted = useRef(0);
  const redraw = useRef<() => void>(() => {});
  const [layout, setLayout] = useState<Layout | null>(null);
  const [time, setTime] = useState(0);
  useImperativeHandle(forwarded, () => ({ seek(frame) { wanted.current = frame; loader.current?.request(frame); redraw.current(); }, pause(value) { loader.current?.setPaused(value); } }), []);
  useEffect(() => {
    const container = area.current!, element = canvas.current!, context = element.getContext('2d', { alpha: true });
    if (!context) { onError(); return; }
    let sequence: ImageSequence | null = null, alive = true, scheduled = 0, width = 0, height = 0, previous = -1, ready = false;
    let variant = '', sourceWidth = 0, sourceHeight = 0, lastCallouts = '';
    let placement: Layout;
    const draw = () => {
      scheduled = 0;
      if (!alive || !sequence || !width || !height) return;
      const frame = sequence.sample(wanted.current);
      if (!frame || Math.abs(frame.index - previous) < .005) return;
      previous = frame.index;
      context.clearRect(0, 0, width, height);
      const b = manifest.subjectBounds;
      context.globalAlpha = 1 - frame.mix;
      context.drawImage(frame.lower, b.x * sourceWidth, b.y * sourceHeight, b.width * sourceWidth, b.height * sourceHeight, placement.x, placement.y, placement.width, placement.height);
      if (frame.mix > 0) {
        // Add premultiplied contributions on the transparent canvas. Ordinary
        // source-over blending would darken translucent edges and double skin.
        context.globalCompositeOperation = 'lighter'; context.globalAlpha = frame.mix;
        context.drawImage(frame.upper, b.x * sourceWidth, b.y * sourceHeight, b.width * sourceWidth, b.height * sourceHeight, placement.x, placement.y, placement.width, placement.height);
      }
      context.globalCompositeOperation = 'source-over'; context.globalAlpha = 1;
      element.dataset.frame = String(Math.round(frame.index) + 1); element.dataset.position = frame.index.toFixed(3); element.dataset.cacheSize = String(sequence.size); element.dataset.encodedBytes = String(sequence.encodedBytes);
      const sourceTime = frame.index / manifest.frameRate;
      const labels = anatomyCallouts.filter(item => sourceTime >= item.from && sourceTime < item.to).map(item => item.id).join(',');
      if (labels !== lastCallouts) { lastCallouts = labels; setTime(sourceTime); }
      if (!ready) { ready = true; onReady(); }
    };
    const schedule = () => { if (!scheduled && alive) scheduled = requestAnimationFrame(draw); };
    redraw.current = schedule;
    const resize = () => {
      const nextWidth = container.clientWidth, nextHeight = container.clientHeight;
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth; height = nextHeight;
      if (!width || !height) return;
      const nextVariant = matchMedia('(max-width: 719px)').matches ? 'mobile' : 'desktop';
      const config = manifest[nextVariant];
      sourceWidth = config.width; sourceHeight = config.height;
      const pixelRatio = Math.min(devicePixelRatio || 1, nextVariant === 'mobile' ? 1.25 : 1.5);
      element.width = Math.round(width * pixelRatio); element.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const aspect = manifest.subjectBounds.width * sourceWidth / (manifest.subjectBounds.height * sourceHeight);
      const drawHeight = Math.min(height - 14, (width - 30) / aspect);
      placement = { x: (width - drawHeight * aspect) / 2, y: (height - drawHeight) / 2, width: drawHeight * aspect, height: drawHeight, areaWidth: width, areaHeight: height };
      setLayout(placement);
      previous = -1;
      if (variant !== nextVariant) {
        sequence?.destroy(); variant = nextVariant;
        sequence = new ImageSequence(`/animations/nexus-evolution/${variant}`, manifest.frameCount, variant === 'mobile' ? 14 : 12, schedule, onError, (variant === 'mobile' ? 8 : 20) * 1024 * 1024, manifest.packs?.framesPerPack || 0);
        loader.current = sequence; element.dataset.variant = variant; sequence.request(wanted.current);
      }
      schedule();
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    return () => { alive = false; cancelAnimationFrame(scheduled); observer.disconnect(); sequence?.destroy(); loader.current = null; redraw.current = () => {}; };
  }, [manifest, onReady, onError]);
  const callouts = anatomyCallouts.filter(item => time >= item.from && time < item.to);
  return <div ref={area} className="evolution-visual"><canvas ref={canvas} aria-hidden="true" className="evolution-canvas" />
    {layout && <svg className="evolution-callouts" viewBox={`0 0 ${layout.areaWidth} ${layout.areaHeight}`} role="img" aria-label={callouts.map(item => item.label).join(', ') || 'Human transformation'}>{callouts.map(item => {
      const x = layout.x + item.x * layout.width, y = layout.y + item.y * layout.height;
      const end = Math.max(6, Math.min(layout.areaWidth - 6, x + item.side * 95));
      return <g key={item.id} className="evolution-callout"><circle cx={x} cy={y} r={3} /><path d={`M${x},${y} L${x + item.side * 26},${y - 20} H${end}`} /><text x={end} y={y - 29} textAnchor={item.side > 0 ? 'end' : 'start'}>{item.label}</text></g>;
    })}</svg>}
  </div>;
});
export default EvolutionCanvas;
