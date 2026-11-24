/**
 * Adapted from the Product Shelf component supplied by the user,
 * originally designed and built by Aakash Mehra.
 * Gym catalogue, photographic assets, native modal accessibility and saved-kit flow.
 */
'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Box, LayoutGrid, ShoppingBag } from 'lucide-react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import type { Product, ProductCategory } from '../products/products';
import { usePageScroller } from '../layout/SmoothScroll';
import ProductPreview from '../products/ProductPreview';
import Showroom from '../products/showroom/Showroom';

export type { Product } from '../products/products';
type KitLine = { productId: string; variant: number; qty: number };
const STORE_KEY = 'nexus-product-kit-v1';
const currency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const spring = { type: 'spring' as const, bounce: 0, duration: .5 };

function NativeDialog({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);
  const scroller = usePageScroller();
  const reduce = useReducedMotion();
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || !ref.current) return;
    const dialog = ref.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const wasStopped = scroller?.current?.isStopped;
    scroller?.current?.stop();
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (!wasStopped) scroller?.current?.start();
      requestAnimationFrame(() => {
        if (!document.querySelector('dialog[open]') && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      });
    };
  }, [mounted, scroller]);
  if (!mounted) return null;
  return createPortal(<dialog ref={ref} className="ps-dialog" aria-label={label} data-lenis-prevent
    onKeyDown={event => {
      if (event.key !== 'Tab' || !ref.current) return;
      const focusable = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')).filter(element => element.getClientRects().length && !element.closest('[hidden]'));
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === ref.current) onClose(); }}>
    <motion.div className="ps-modal-shell" initial={{ opacity: 0, y: reduce ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} transition={reduce ? { duration: 0 } : spring}>{children}</motion.div>
  </dialog>, document.body);
}

function ProductImage({ product }: { product: Product }) {
  const reduce = useReducedMotion();
  return <motion.img layoutId={`nexus-product-${product.id}`} transition={reduce ? { duration: 0 } : spring} className="ps-product-image" src={product.image} alt="" width={720} height={720} loading="lazy" decoding="async" draggable={false} />;
}

export function ProductShelf({ products }: { products: Product[] }) {
  const [studio, setStudio] = useState(true);
  const [studioFailed, setStudioFailed] = useState(false);
  const [studioNear, setStudioNear] = useState(false);
  const studioRegion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = studioRegion.current;
    if (!element || !('IntersectionObserver' in window)) { setStudioNear(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setStudioNear(true);
        observer.disconnect();
      }
    }, { rootMargin: '240px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const [filter, setFilter] = useState<'All' | ProductCategory>('All');
  const [view, setView] = useState<string | null>(null);
  const [kit, setKit] = useState<KitLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const reduce = useReducedMotion();
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      if (Array.isArray(saved)) setKit(saved.filter(line => {
        if (!line || typeof line !== 'object') return false;
        const product = products.find(item => item.id === line.productId);
        return product && Number.isInteger(line.variant) && line.variant >= 0 && line.variant < product.variants.length && Number.isInteger(line.qty) && line.qty > 0 && line.qty <= 9;
      }).slice(0, 40));
    } catch { /* A private browser or invalid old kit must not block the shelf. */ }
    setLoaded(true);
  }, [products]);
  useEffect(() => { if (loaded) { try { localStorage.setItem(STORE_KEY, JSON.stringify(kit)); } catch { /* The session kit still works without storage. */ } } }, [kit, loaded]);
  const filtered = filter === 'All' ? products : products.filter(product => product.category === filter);
  const rows = Array.from({ length: Math.ceil(filtered.length / 4) }, (_, i) => filtered.slice(i * 4, i * 4 + 4));
  const selected = products.find(product => product.id === view);
  const totalQty = kit.reduce((total, line) => total + line.qty, 0);
  const add = (product: Product, variant: number, qty: number) => {
    setKit(current => {
      const existing = current.find(line => line.productId === product.id && line.variant === variant);
      return existing ? current.map(line => line === existing ? { ...line, qty: Math.min(9, line.qty + qty) } : line) : [...current, { productId: product.id, variant, qty }];
    });
    setNotice(`${product.name} added to your kit.`);
  };
  const changeQty = (index: number, qty: number) => setKit(current => qty <= 0 ? current.filter((_, i) => i !== index) : current.map((line, i) => i === index ? { ...line, qty: Math.min(9, qty) } : line));
  return <LayoutGroup id="nexus-products">
    <header className="ps-studio-heading">
      <h2 id="products-title">Training <em>essentials.</em></h2>
    </header>
    <div ref={studioRegion} className="ps-studio">
      <div className="ps-studio-bar">
        <div className="ps-studio-views" role="group" aria-label="Product view">
          <button type="button" aria-pressed={studio} aria-controls="nexus-studio-view" onClick={() => { setStudioFailed(false); setStudio(true); }}><Box size={16} aria-hidden /> {studioFailed ? 'Retry studio' : 'Product Studio'}</button>
          <button type="button" aria-pressed={!studio} aria-controls="nexus-product-catalogue" onClick={() => setStudio(false)}><LayoutGrid size={16} aria-hidden /> Products</button>
        </div>
        <button type="button" className="ps-studio-kit" onClick={() => setView('kit')} aria-label={`View kit, ${totalQty} items`}>
          <ShoppingBag size={16} aria-hidden /> Your Kit <span aria-hidden>{totalQty}</span>
        </button>
      </div>
      <div id="nexus-studio-view" hidden={!studio}>
        {studio && (studioNear ? <Showroom products={products} onAdd={add}
          onFailure={() => { setStudioFailed(true); setStudio(false); }} /> :
          <div className="nexus-room nexus-room-placeholder"><div className="nexus-room-main"><img className="nexus-room-poster" src="/assets/products/nexus-showroom.webp" alt="" width={1280} height={720} loading="lazy" /></div></div>)}
      </div>
      <div id="nexus-product-catalogue" hidden={studio}>
        {studioFailed && <p className="ps-studio-status" role="status">The studio couldn’t open. You can browse the product photos below.</p>}
        <div className="ps-toolbar"><div className="ps-filters" role="group" aria-label="Filter products">{(['All', 'Supplements', 'Nutrition', 'Accessories'] as const).map(category => <button key={category} aria-pressed={filter === category} onClick={() => setFilter(category)}>{category}<span>{category === 'All' ? products.length : products.filter(product => product.category === category).length}</span></button>)}</div><span className="ps-catalogue-note">ILLUSTRATIVE COLLECTION / INDICATIVE PRICES</span></div>
        <div className="ps-shelves" aria-label="Gym product shelves">
          {rows.map((row, index) => <div className="ps-shelf-row" key={`${filter}-${index}`}>
            {row.map(product => <article className="ps-product" key={product.id} data-product={product.id}>
              <motion.button className="ps-product-stage" onClick={() => setView(product.id)} aria-label={`View ${product.name}`} whileHover={reduce ? undefined : { scale: 1.015 }} transition={spring}>
                <ProductImage product={product} /><span className="ps-view-label" aria-hidden>EXPLORE PRODUCT</span>
              </motion.button>
              <div className="ps-shelf-edge" aria-hidden />
              <button className="ps-product-caption" onClick={() => setView(product.id)} aria-label={`Details for ${product.name}`}><span className="ps-product-category">{product.category}</span><h3>{product.name}</h3><span className="ps-product-option">{product.variants[0].label}</span><span className="ps-product-price">{currency(product.variants[0].price)}<small>indicative</small></span></button>
            </article>)}
          </div>)}
        </div>
      </div>
    </div>
    <footer className="ps-footer"><p>Photos show example products. Ask Nexus to confirm brands, pack sizes, prices and availability.</p></footer>
    <span className="ps-sr-only" role="status">{notice}</span>
    {selected && <ProductPage key={selected.id} product={selected} onClose={() => setView(null)} onAdd={add} onKit={() => setView('kit')} kitCount={totalQty} />}
    {view === 'kit' && <KitPage products={products} kit={kit} onClose={() => setView(null)} onQuantity={changeQty} />}
  </LayoutGroup>;
}

function ProductPage({ product, onClose, onAdd, onKit, kitCount }: { product: Product; onClose: () => void; onAdd: (product: Product, variant: number, qty: number) => void; onKit: () => void; kitCount: number }) {
  const [variant, setVariant] = useState(0), [qty, setQty] = useState(1), [added, setAdded] = useState(false);
  const [expanded, setExpanded] = useState<string | null>('Product details');
  const selected = product.variants[variant];
  return <NativeDialog label={product.name} onClose={onClose}>
    <div className="ps-modal-top"><button onClick={onClose} autoFocus>BACK TO SHELF</button><span>NEXUS / THE ESSENTIALS</span><button onClick={onKit}>YOUR KIT ({kitCount})</button></div>
    <div className="ps-detail-grid">
      <div className="ps-detail-stage">
        <span className="ps-detail-edition">THE COLLECTION / {product.category.toUpperCase()}</span>
        <ProductPreview product={product} />
      </div>
      <div className="ps-detail-copy">
        <span className="ps-eyebrow">{product.category.toUpperCase()}</span><h2>{product.name}</h2><p className="ps-tagline">{product.tagline}</p>
        <p className="ps-detail-price">{currency(selected.price)}<span>Indicative price</span></p><p className="ps-description">{product.description}</p>
        <fieldset className="ps-options"><legend>Choose your option</legend>{product.variants.map((option, index) => <label key={option.label} className={variant === index ? 'is-selected' : ''}><input type="radio" name={`variant-${product.id}`} value={index} checked={variant === index} onChange={() => { setVariant(index); setAdded(false); }} /><span>{option.label}</span><span>{currency(option.price)}</span></label>)}</fieldset>
        <div className="ps-add-row"><div className="ps-quantity"><button aria-label="Decrease quantity" disabled={qty === 1} onClick={() => { setQty(value => value - 1); setAdded(false); }}>−</button><span aria-live="polite">{qty}</span><button aria-label="Increase quantity" disabled={qty === 9} onClick={() => { setQty(value => value + 1); setAdded(false); }}>+</button></div><button className="ps-add-button" onClick={() => { onAdd(product, variant, qty); setAdded(true); }}><span aria-live="polite">{added ? 'ADDED TO YOUR KIT' : 'ADD TO YOUR KIT'}</span></button></div>
        <p className="ps-purchase-note">Save your favourites. Final products, pricing and availability are confirmed by the club.</p>
        <div className="ps-information">{['Product details', 'Product information'].map(title => <div key={title}><button aria-expanded={expanded === title} aria-controls={`ps-info-${product.id}-${title.replace(/ /g, '-')}`} onClick={() => setExpanded(expanded === title ? null : title)}>{title}<span aria-hidden>{expanded === title ? '−' : '+'}</span></button><div id={`ps-info-${product.id}-${title.replace(/ /g, '-')}`} hidden={expanded !== title}>{title === 'Product details' ? <ul>{product.details.map(detail => <li key={detail}>{detail}</li>)}</ul> : <p>{product.information}</p>}</div></div>)}</div>
      </div>
    </div>
  </NativeDialog>;
}

function KitPage({ products, kit, onClose, onQuantity }: { products: Product[]; kit: KitLine[]; onClose: () => void; onQuantity: (index: number, qty: number) => void }) {
  const [copied, setCopied] = useState(false), [copyFallback, setCopyFallback] = useState(false);
  const total = kit.reduce((sum, line) => sum + products.find(product => product.id === line.productId)!.variants[line.variant].price * line.qty, 0);
  const enquiry = ['Hello Nexus, I would like to ask about these products:', ...kit.map(line => { const product = products.find(item => item.id === line.productId)!; return `${line.qty} x ${product.name} — ${product.variants[line.variant].label}`; }), 'Please confirm the available brands, final prices and availability.'].join('\n');
  const copy = async () => { try { await navigator.clipboard.writeText(enquiry); setCopied(true); } catch { setCopyFallback(true); } };
  return <NativeDialog label="Your product kit" onClose={onClose}>
    <div className="ps-modal-top"><button onClick={onClose} autoFocus>BACK TO SHELF</button><span>NEXUS / YOUR KIT</span></div>
    <div className="ps-kit-content"><p className="ps-eyebrow">YOUR NEXT ROUTINE</p><h2>Your essentials,<br /><em>together.</em></h2><p className="ps-kit-introduction">Saved on this device. Review your favourites and copy a list to share with the club.</p>
      {!kit.length ? <div className="ps-empty-kit"><p>Your kit is waiting for its first essential.</p><button className="ps-add-button" onClick={onClose}>EXPLORE THE SHELF</button></div> : <>
        <div className="ps-kit-lines">{kit.map((line, index) => { const product = products.find(item => item.id === line.productId)!; const variant = product.variants[line.variant]; return <article className="ps-kit-line" key={`${product.id}-${line.variant}`}><img src={product.image} alt="" width={100} height={120} /><div className="ps-kit-line-copy"><h3>{product.name}</h3><p>{variant.label}</p><button onClick={() => onQuantity(index, 0)} aria-label={`Remove ${product.name}`}>Remove</button></div><div className="ps-quantity"><button aria-label={`Decrease ${product.name} quantity`} onClick={() => onQuantity(index, line.qty - 1)}>−</button><span>{line.qty}</span><button aria-label={`Increase ${product.name} quantity`} disabled={line.qty === 9} onClick={() => onQuantity(index, line.qty + 1)}>+</button></div><strong>{currency(variant.price * line.qty)}</strong></article>; })}</div>
        <div className="ps-kit-total"><span>Indicative total</span><strong>{currency(total)}</strong></div><p className="ps-purchase-note">This is a saved list. Confirm the final products, prices and availability with Nexus before purchase.</p>
        <button className="ps-add-button ps-copy-button" onClick={copy}>{copied ? 'PRODUCT LIST COPIED' : 'COPY PRODUCT ENQUIRY'}</button><p role="status" className="ps-copy-status">{copied ? 'Your enquiry is ready to paste into a conversation with the club.' : ''}</p>
        {copyFallback && <label className="ps-copy-fallback">Copy your enquiry below<textarea readOnly value={enquiry} onFocus={event => event.currentTarget.select()} /></label>}
      </>}
    </div>
  </NativeDialog>;
}
