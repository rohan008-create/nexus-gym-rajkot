'use client';

import dynamic from 'next/dynamic';
import { RotateCcw, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Product } from './products';

const ProductScene = dynamic(() => import('./ProductScene'), { ssr: false });
const increment = Math.PI / 6;
const initialAngle = .22;

export default function ProductPreview({ product, enabled = true }: { product: Product; enabled?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; angle: number } | null>(null);
  const [near, setNear] = useState(false);
  const [rotation, setRotation] = useState({ productId: product.id, angle: initialAngle });
  const [photo, setPhoto] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const showScene = near && enabled && !photo && !failed;
  const interactive = showScene && ready;
  const angle = rotation.productId === product.id ? rotation.angle : initialAngle;
  const rotate = (amount: number) => setRotation(current => ({
    productId: product.id,
    angle: (current.productId === product.id ? current.angle : initialAngle) + amount,
  }));

  useEffect(() => {
    if (!frame.current || !('IntersectionObserver' in window)) {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNear(true);
        observer.disconnect();
      }
    }, { rootMargin: '240px' });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  const start = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive || !event.isPrimary || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, angle };
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x;
    if (event.pointerType === 'touch' && Math.abs(dx) < Math.abs(event.clientY - gesture.y)) return;
    setRotation({ productId: product.id, angle: gesture.angle + dx * .016 });
  };

  return <div className="ps-preview">
    <div ref={frame} className="ps-preview-frame" data-model={product.id}
      data-preview={interactive ? '3d' : 'photo'}
      onPointerDown={start} onPointerMove={move}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onLostPointerCapture={() => { drag.current = null; }}>
      <img className="ps-preview-photo" src={product.image} alt={interactive ? '' : `Example photo of ${product.name}`}
        width={720} height={720} loading="lazy" draggable={false} aria-hidden={interactive || undefined} />
      {showScene && <ProductScene product={product} angle={angle} onReady={() => setReady(true)} onFailure={() => setFailed(true)} />}
    </div>
    <div className="ps-preview-controls">
      <span>{failed ? 'Product photo' : interactive ? 'Drag to rotate' : photo ? 'Product photo' : 'Opening product preview…'}</span>
      {interactive && <>
        <button type="button" aria-label="Rotate product left" onClick={() => rotate(-increment)}><RotateCcw size={17} aria-hidden /></button>
        <button type="button" aria-label="Rotate product right" onClick={() => rotate(increment)}><RotateCw size={17} aria-hidden /></button>
      </>}
      {!failed && <button type="button" onClick={() => { setReady(false); setPhoto(value => !value); }}>
        {photo ? 'Rotate product' : 'View photo'}
      </button>}
    </div>
  </div>;
}
