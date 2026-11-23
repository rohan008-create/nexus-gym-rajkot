"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type ValueAnimationTransition,
} from "motion/react";
import { Dumbbell } from "lucide-react";
import "./book-page-curl.css";

export interface BookCover {
  title: string;
  tagline: string;
  credit: string;
  genre: string;
  gradient: string;
  excerpt?: string;
  number?: string;
  price?: string;
  duration?: string;
  benefits?: readonly string[];
}

export interface BookCardProps {
  book?: BookCover;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const defaultBook: BookCover = {
  title: "The Glass Horizon",
  tagline: "Every Ending, A Quiet Beginning",
  credit: "BY NADIA FERRO",
  genre: "Literary Fiction",
  gradient: "from-blue-500 to-sky-400",
  excerpt:
    "The sea had been glass for three days when Mara finally opened the letter. Some doors, she knew, only open once.",
};

const W = 224;
const H = 320;
const HIDDEN = "polygon(0px 0px, 0px 0px, 0px 0px)";
const OPEN_THRESHOLD = 0.5;
const HINT: [number, number] = [W - 44, H - 30];

const turnEase = { duration: 1, ease: [0.4, 0, 0.2, 1] } as const;
const hintSpring = { duration: 0.4, ease: [0.4, 0, 0.2, 1] } as const;
const tween = { duration: 0.2, ease: "easeOut" } as const;

type Point = [number, number];

function constrain(rawX: number, rawY: number): Point {
  let x = rawX;
  let y = Math.min(rawY, H);
  let d = Math.hypot(x, y - H);
  if (d > W) {
    x = (x / d) * W;
    y = H + ((y - H) / d) * W;
  }
  const diagonal = Math.hypot(W, H);
  d = Math.hypot(x, y);
  if (d > diagonal) {
    x = (x / d) * diagonal;
    y = (y / d) * diagonal;
  }
  return [x, y];
}

function clipHalf(
  polygon: Point[],
  nx: number,
  ny: number,
  k: number,
  keepCorner: boolean,
) {
  const side = ([x, y]: Point) => x * nx + y * ny - k;
  const inside = (value: number) => (keepCorner ? value > 0 : value <= 0);
  const out: Point[] = [];
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const sa = side(a);
    const sb = side(b);
    if (inside(sa)) out.push(a);
    if (inside(sa) !== inside(sb)) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  });
  return out;
}

function toPolygon(points: Point[]) {
  if (points.length < 3) return HIDDEN;
  return `polygon(${points
    .map(([x, y]) => `${x.toFixed(2)}px ${y.toFixed(2)}px`)
    .join(", ")})`;
}

interface Fold {
  coverClip: string;
  flapClip: string;
  flapTransform: string;
  underShade: string;
  flapShade: string;
}

const CLOSED: Fold = {
  coverClip: "none",
  flapClip: HIDDEN,
  flapTransform: "none",
  underShade: "none",
  flapShade: "none",
};

function computeFold(rawX: number, rawY: number): Fold {
  const [x, y] = constrain(rawX, rawY);
  const vx = W - x;
  const vy = H - y;
  const distance = Math.hypot(vx, vy);
  if (distance < 0.5) return CLOSED;

  const nx = vx / distance;
  const ny = vy / distance;
  const k = ((W + x) / 2) * nx + ((H + y) / 2) * ny;

  const page: Point[] = [
    [0, 0],
    [W, 0],
    [W, H],
    [0, H],
  ];
  const cover = clipHalf(page, nx, ny, k, false);
  const corner = clipHalf(page, nx, ny, k, true);
  const flap = corner.map(([px, py]): Point => {
    const s = px * nx + py * ny - k;
    return [px - 2 * s * nx, py - 2 * s * ny];
  });

  const a = 2 * nx * nx - 1;
  const b = 2 * nx * ny;
  const c = -2 * nx * ny;
  const d = 1 - 2 * ny * ny;
  const e = W * (1 - 2 * nx * nx) + 2 * k * nx;
  const f = -2 * nx * ny * W + 2 * k * ny;

  const angle = (Math.atan2(nx, -ny) * 180) / Math.PI;
  const depth = Math.min(1, distance / 80);
  const underLength = W * Math.abs(nx) + H * Math.abs(ny);
  const underStop = k - ((W / 2) * nx + (H / 2) * ny) + underLength / 2;
  const flapLength = 2 * W * Math.abs(nx) + H * Math.abs(ny);
  const flapStop = -(k - (H / 2) * ny) + flapLength / 2;

  return {
    coverClip: toPolygon(cover),
    flapClip: toPolygon(flap),
    flapTransform: `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`,
    underShade: `linear-gradient(${angle}deg, rgba(0,0,0,${0.3 * depth}) ${underStop}px, rgba(0,0,0,0) ${underStop + 36}px)`,
    flapShade: `linear-gradient(${angle + 180}deg, rgba(0,0,0,${0.35 * depth}) ${flapStop}px, rgba(0,0,0,0) ${flapStop + 72}px)`,
  };
}

function useFoldStyle(fold: MotionValue<Fold>, key: keyof Fold) {
  return useTransform(fold, (value) => value[key]);
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  origin: Point;
  scale: number;
  startOpen: boolean;
}

export default function BookPageCurl({ book = defaultBook, open, onOpenChange }: BookCardProps) {
  const reduce = useReducedMotion() ?? false;
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const animatedOpen = useRef(false);
  const [localOpen, setIsOpen] = useState(false);
  const isOpen = open ?? localOpen;

  const px = useMotionValue(W);
  const py = useMotionValue(H);
  const shift = useMotionValue(-W / 2);

  const fold = useTransform([px, py], ([x, y]: number[]) => computeFold(x, y));
  const coverClip = useFoldStyle(fold, "coverClip");
  const flapClip = useFoldStyle(fold, "flapClip");
  const flapTransform = useFoldStyle(fold, "flapTransform");
  const underShade = useFoldStyle(fold, "underShade");
  const flapShade = useFoldStyle(fold, "flapShade");

  const moveCorner = (
    target: Point,
    transition: ValueAnimationTransition<number>,
    liftY?: number,
  ) => {
    const [x, y] = constrain(px.get(), py.get());
    px.set(x);
    py.set(y);
    animate(px, target[0], transition);
    animate(
      py,
      liftY === undefined ? [y, target[1]] : [y, liftY, target[1]],
      transition,
    );
  };

  const settle = (open: boolean, lift = false) => {
    animatedOpen.current = open;
    setIsOpen(open);
    onOpenChange?.(open);
    moveCorner(
      open ? [-W, H] : [W, H],
      reduce ? tween : turnEase,
      lift && !reduce ? H * 0.72 : undefined,
    );
    animate(shift, open ? 0 : -W / 2, reduce ? tween : turnEase);
  };

  useEffect(() => {
    if (open === undefined || open === animatedOpen.current) return;
    animatedOpen.current = open;
    px.stop(); py.stop();
    animate(px, open ? -W : W, reduce ? tween : turnEase);
    animate(py, H, reduce ? tween : turnEase);
    animate(shift, open ? 0 : -W / 2, reduce ? tween : turnEase);
  }, [open, reduce, px, py, shift]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    const stage = stageRef.current;
    if (!stage) return;
    stage.setPointerCapture(event.pointerId);
    const [x, y] = constrain(px.get(), py.get());
    px.stop();
    py.stop();
    px.set(x);
    py.set(y);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: [x, y],
      scale: stage.getBoundingClientRect().width / (W * 2),
      startOpen: isOpen,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    px.set(state.origin[0] + (event.clientX - state.startX) / state.scale);
    py.set(state.origin[1] + (event.clientY - state.startY) / state.scale);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    if (stageRef.current?.hasPointerCapture(event.pointerId)) stageRef.current.releasePointerCapture(event.pointerId);
    const [x] = constrain(px.get(), py.get());
    const tapped = Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < 6;
    const open = tapped ? !state.startOpen : state.startOpen
      ? x < -W * OPEN_THRESHOLD
      : x < W * OPEN_THRESHOLD;
    settle(open, tapped);
  };

  const handleHover = (
    event: PointerEvent<HTMLDivElement>,
    entering: boolean,
  ) => {
    if (event.pointerType !== "mouse" || drag.current || isOpen) return;
    moveCorner(entering ? HINT : [W, H], reduce ? tween : hintSpring);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") settle(!isOpen, true);
    else if (event.key === "ArrowLeft" && !isOpen) settle(true, true);
    else if (event.key === "ArrowRight" && isOpen) settle(false, true);
    else return;
    event.preventDefault();
  };

  return <div className="curl-book">
    <div className={`curl-book-window${isOpen ? ' is-open' : ''}`}>
      <div ref={stageRef} role="button" tabIndex={0} aria-pressed={isOpen}
        aria-label={`${book.title} plan details. ${isOpen ? 'Close' : 'Open'} cover.`}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
        onPointerCancel={() => { drag.current = null; settle(isOpen); }}
        onLostPointerCapture={() => { if (drag.current) { drag.current = null; settle(isOpen); } }}
        onPointerEnter={event => handleHover(event, true)} onPointerLeave={event => handleHover(event, false)}
        onKeyDown={handleKeyDown} className="curl-book-stage">
        <motion.div style={{ x: shift }} className="curl-book-spread">
          <div className="curl-book-page-position">
            <div className="curl-book-page-edge" />
            <div className="curl-book-page">
              <span className="curl-book-kicker">{book.genre}</span>
              <h4>{book.title}</h4>
              <p className="curl-book-excerpt">{book.excerpt}</p>
              <ul>{book.benefits?.map(benefit => <li key={benefit}><span aria-hidden="true">+</span>{benefit}</li>)}</ul>
              <div className="curl-book-price"><span>PRICING</span><strong>{book.price ?? 'On request'}</strong></div>
              <div className="curl-book-duration"><span>DURATION</span><span>{book.duration ?? 'Ask Nexus'}</span></div>
              <div className="curl-book-page-footer"><span>NEXUS / RAJKOT</span><span>{book.number ?? '01'}</span></div>
            </div>
            <motion.div aria-hidden="true" style={{ backgroundImage: underShade }} className="curl-book-shade" />
            <motion.div style={{ clipPath: coverClip, background: book.gradient }} className="curl-book-cover">
              <div className="curl-book-spine" />
              <div className="curl-book-cover-top"><span>NEXUS<br />FITNESS CLUB</span><span>VOL. {book.number ?? '01'}</span></div>
              <span className="curl-book-edition">{book.genre}</span>
              <Dumbbell className="curl-book-art" size={125} strokeWidth={.7} aria-hidden="true" />
              <div className="curl-book-cover-bottom"><span className="curl-book-rule" />
                <h3>{book.title}<span>MEMBERSHIP</span></h3><p>{book.tagline}</p>
                <span className="curl-book-credit">{book.credit}</span>
              </div>
              <span className="curl-book-corner" aria-hidden="true">↗</span>
            </motion.div>
            <motion.div aria-hidden="true" style={{ clipPath: flapClip }} className="curl-book-flap">
              <motion.div style={{ transform: flapTransform, transformOrigin: '0 0', background: book.gradient }} className="curl-book-flap-inside">
                <Dumbbell size={36} strokeWidth={1} /><span>{book.tagline}</span>
              </motion.div>
              <motion.div style={{ backgroundImage: flapShade }} className="curl-book-flap-shade" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
    <p className="curl-book-hint" aria-live="polite">{isOpen ? 'Tap or drag back to close' : 'Tap or drag the corner to explore'}</p>
  </div>;
}

