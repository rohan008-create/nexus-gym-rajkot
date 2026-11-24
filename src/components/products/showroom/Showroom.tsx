'use client';

import dynamic from 'next/dynamic';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass, Maximize, Minimize, Minus, Plus, RotateCcw, ShoppingBag } from 'lucide-react';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import type { Product } from '../products';
import { TOUR_STOPS } from './navigation';
import type { CameraCommand } from './VirtualShowroom';
import './showroom.css';

const VirtualShowroom = dynamic(() => import('./VirtualShowroom'), { ssr: false });
const formatPrice = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const defaultStop = 1;
const stopNames = ['Entrance', 'Display', 'Supplements', 'Nutrition', 'Gear'];

class RoomBoundary extends Component<{ children: ReactNode; onFailure: () => void }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

type Props = {
  products: Product[];
  onAdd: (product: Product, variant: number, quantity: number) => void;
  onFailure: () => void;
};

export default function Showroom({ products, onAdd, onFailure }: Props) {
  const reduced = useReducedMotion();
  const [lightweight] = useState(() => matchMedia('(max-width: 767px), (pointer: coarse)').matches);
  const [ready, setReady] = useState(false);
  const [free, setFree] = useState(false);
  const [stop, setStop] = useState(defaultStop);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState(products[0]?.id);
  const [inspecting, setInspecting] = useState(false);
  const [variant, setVariant] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState('');
  const roomRef = useRef<HTMLDivElement>(null);
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [inlineHeight, setInlineHeight] = useState<number | null>(null);
  const fullscreen = nativeFullscreen || inlineHeight !== null;
  const [command, setCommand] = useState<CameraCommand>({ serial: 0, stop: defaultStop });
  const product = products.find(item => item.id === selected);
  const option = product?.variants[variant];
  const added = product && notice === `${product.name} added to Your Kit.`;
  const display = products.filter(item => {
    const category = TOUR_STOPS[stop].label;
    return category === 'Supplements' || category === 'Nutrition' || category === 'Accessories'
      ? item.category === category
      : ['whey', 'isolate', 'creatine', 'electrolytes'].includes(item.id);
  });

  const issue = (next: Omit<CameraCommand, 'serial'>) => setCommand(current => ({ ...next, serial: current.serial + 1 }));
  const go = (next: number) => { setInspecting(false); setHover(null); setStop(next); issue({ stop: next }); };
  const select = (id: string, position?: [number, number, number]) => {
    setSelected(id); setInspecting(true); setVariant(0); setQuantity(1); setNotice('');
    issue({ productId: id, productPosition: position });
  };
  const closeProduct = () => { setInspecting(false); issue({ restore: true }); };
  const enterRoom = () => {
    setFree(true);
    setHover(null);
    if (stop === 0) go(defaultStop);
    else issue({ move: 1.4 });
  };
  const exitFullscreen = () => {
    if (document.fullscreenElement === roomRef.current) {
      void document.exitFullscreen().catch(() => {});
    } else {
      setInlineHeight(null);
      fullscreenButton.current?.focus({ preventScroll: true });
    }
  };
  const enterFullscreen = async () => {
    const room = roomRef.current;
    if (!room) return;
    if (document.fullscreenEnabled && room.requestFullscreen) {
      try {
        await room.requestFullscreen();
        return;
      } catch { /* Use the viewport layout when fullscreen permission is unavailable. */ }
    }
    if (room.isConnected) setInlineHeight(room.offsetHeight);
  };

  useEffect(() => {
    const syncFullscreen = () => {
      const active = document.fullscreenElement === roomRef.current;
      setNativeFullscreen(active);
      if (active || roomRef.current?.contains(document.activeElement)) {
        fullscreenButton.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    if (inlineHeight === null) return;
    const siblings: HTMLElement[] = [];
    for (let node: HTMLElement | null = roomRef.current; node?.parentElement && node !== document.body; node = node.parentElement) {
      for (const sibling of node.parentElement.children) {
        if (sibling instanceof HTMLElement && sibling !== node && !sibling.inert) {
          sibling.inert = true;
          siblings.push(sibling);
        }
      }
    }
    fullscreenButton.current?.focus({ preventScroll: true });
    return () => { siblings.forEach(sibling => { sibling.inert = false; }); };
  }, [inlineHeight]);
  const add = (item: Product, option: number, amount: number) => {
    onAdd(item, option, amount);
    setNotice(`${item.name} added to Your Kit.`);
  };

  return <>
  {inlineHeight !== null && <div aria-hidden style={{ height: inlineHeight }} />}
  <div ref={roomRef} className="nexus-room" data-room-ready={ready} data-fullscreen={fullscreen}
    data-viewport-mode={inlineHeight !== null} data-inspecting={inspecting}
    role={fullscreen ? 'dialog' : undefined} aria-modal={fullscreen || undefined}
    aria-label={fullscreen ? '3D product studio' : undefined} data-lenis-prevent={fullscreen ? '' : undefined}
    onKeyDown={event => {
    if (event.key !== 'Escape') return;
    if (inlineHeight !== null) {
      event.stopPropagation();
      exitFullscreen();
    } else if (!nativeFullscreen && inspecting) closeProduct();
  }}>
    <div className="nexus-studio-viewer">
      <div className="nexus-room-main">
        {!ready && <>
          <img className="nexus-room-poster" src="/assets/products/nexus-showroom.webp" alt="" width={1280} height={720} />
          <p className="nexus-room-loading" role="status">Loading 3D studio…</p>
        </>}
        <div className="nexus-room-live" data-ready={ready}>
          <RoomBoundary onFailure={onFailure}>
            <VirtualShowroom command={command} free={free && !inspecting} reduced={reduced} lowQuality={lightweight}
              fullscreen={fullscreen} onReady={() => setReady(true)} onFailure={onFailure} onTourStop={go} onHover={setHover} onSelect={select}
              onAdd={id => { const item = products.find(entry => entry.id === id); if (item) add(item, 0, 1); }} />
          </RoomBoundary>
        </div>
        {ready && hover && !inspecting && <p className="nexus-room-hover">{products.find(item => item.id === hover)?.name}</p>}
        {ready && <button type="button" className="nexus-room-fullscreen"
          aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          ref={fullscreenButton} onClick={fullscreen ? exitFullscreen : enterFullscreen}>
          {fullscreen ? <Minimize size={19} aria-hidden /> : <Maximize size={19} aria-hidden />}
        </button>}
        {ready && !inspecting && (free
          ? <div className="nexus-room-wayfinding">Swipe to look · Tap the floor to walk</div>
          : <button type="button" className="nexus-room-enter" onClick={enterRoom}>
            <span className="nexus-room-beacon"><Compass size={18} aria-hidden /></span> Enter room
          </button>)}
        {ready && inspecting && <button type="button" className="nexus-room-return nexus-glass-control" onClick={closeProduct}>
          <ArrowLeft size={16} aria-hidden /> Back to room
        </button>}
        <div className="nexus-room-camera" role="group" aria-label="Camera" hidden={!ready}>
          <button type="button" aria-label="Zoom out" onClick={() => issue({ zoom: 8 })}><Minus size={17} aria-hidden /></button>
          <button type="button" aria-label="Zoom in" onClick={() => issue({ zoom: -8 })}><Plus size={17} aria-hidden /></button>
          <button type="button" aria-label="Reset camera" onClick={() => go(defaultStop)}><RotateCcw size={16} aria-hidden /></button>
        </div>
      </div>
      <nav className="nexus-room-route" aria-label="Studio views">
        <div className="nexus-room-stops" role="group" aria-label="Showroom stops">
          {TOUR_STOPS.map((item, index) => <button type="button" key={item.label} aria-pressed={stop === index}
            disabled={!ready} onClick={() => go(index)}>{stopNames[index]}</button>)}
        </div>
        <button type="button" className="nexus-room-explore" aria-pressed={free} disabled={!ready} onClick={() => {
          if (inspecting) closeProduct();
          setFree(value => !value);
        }}><Compass size={17} aria-hidden /> Free Explore</button>
      </nav>
      {free && !inspecting && <div className="nexus-room-motion" role="group" aria-label="Move around showroom">
        <button type="button" aria-label="Turn left" onClick={() => issue({ turn: .35 })}><ArrowLeft size={17} aria-hidden /></button>
        <button type="button" aria-label="Move forward" onClick={() => issue({ move: 1 })}><ArrowUp size={17} aria-hidden /></button>
        <button type="button" aria-label="Move backward" onClick={() => issue({ move: -1 })}><ArrowDown size={17} aria-hidden /></button>
        <button type="button" aria-label="Turn right" onClick={() => issue({ turn: -.35 })}><ArrowRight size={17} aria-hidden /></button>
      </div>}
    </div>

    {product && option && <section className="nexus-room-product" aria-label={product.name}>
      <div className="nexus-room-packshot">
        <img key={product.id} src={product.image} alt={`Example photo of ${product.name}`} width={720} height={720} decoding="async" />
      </div>
      <div className="nexus-room-info">
        <div className="nexus-room-product-head">
          <h3>{product.name}</h3>
          <span>{formatPrice(option.price)}<small>Indicative</small></span>
        </div>
        <label className="ps-sr-only" htmlFor="nexus-room-variant">Choose an option</label>
        <select id="nexus-room-variant" value={variant} onChange={event => { setVariant(Number(event.target.value)); setNotice(''); }}>
          {product.variants.map((item, index) => <option key={item.label} value={index}>{item.label}</option>)}
        </select>
        <div className="nexus-room-add">
          <div className="nexus-room-quantity" role="group" aria-label="Quantity">
            <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => { setQuantity(value => value - 1); setNotice(''); }}><Minus size={15} aria-hidden /></button>
            <output aria-live="polite">{quantity}</output>
            <button type="button" aria-label="Increase quantity" disabled={quantity >= 9} onClick={() => { setQuantity(value => value + 1); setNotice(''); }}><Plus size={15} aria-hidden /></button>
          </div>
          <button type="button" onClick={() => add(product, variant, quantity)}><ShoppingBag size={16} aria-hidden /> {added ? 'Added to Your Kit' : 'Add to Your Kit'}</button>
        </div>
      </div>
      <div className="nexus-room-products" role="group" aria-label="Products at this stop">
        {display.map(item => <button type="button" key={item.id} aria-label={`Inspect ${item.name}`} title={item.name}
          aria-pressed={item.id === product.id} disabled={!ready} onClick={() => select(item.id)}>
          <img src={item.image} alt="" width={48} height={48} loading="lazy" />
        </button>)}
      </div>
    </section>}
    <p className="nexus-room-notice ps-sr-only" role="status">{notice}</p>
  </div></>;
}
