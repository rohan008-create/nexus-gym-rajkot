"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ScratchCardProps {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  revealAnnouncement?: string;
  onReveal?: () => void;
  /** Fraction of foil that must be removed before the card reveals (0-1). */
  threshold?: number;
}

/** Scratch-off foil overlay. The content is always in the DOM underneath; the
 * canvas is just a removable cover, so the reveal introduces no new content. */
export function ScratchCard({
  children,
  className,
  ariaLabel = "Scratch to reveal. Press Enter to reveal with the keyboard.",
  revealAnnouncement = "Content revealed",
  onReveal,
  threshold = 0.4,
}: ScratchCardProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const scratching = useRef(false);
  const revealedRef = useRef(false);
  const moves = useRef(0);
  const [revealed, setRevealed] = useState(false);
  const [scratchingUi, setScratchingUi] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const reveal = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    scratching.current = false;
    last.current = null;
    setRevealed(true);
    setScratchingUi(false);
    setAnnouncement(revealAnnouncement);
    onReveal?.();
  }, [onReveal, revealAnnouncement]);

  useEffect(() => {
    if (revealed) return;
    const element = host.current;
    const canvas = canvasRef.current;
    if (!element || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) { reveal(); return; }

    let dpr = 1;
    const paintFoil = () => {
      const rect = element.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.globalCompositeOperation = "source-over";
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#44444b");
      gradient.addColorStop(0.45, "#1b1b1f");
      gradient.addColorStop(1, "#2b2b31");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(255,255,255,.05)";
      ctx.lineWidth = 1 * dpr;
      for (let y = -canvas.height; y < canvas.width; y += 12 * dpr) {
        ctx.beginPath();
        ctx.moveTo(y, 0);
        ctx.lineTo(y + canvas.height, canvas.height);
        ctx.stroke();
      }
    };
    paintFoil();
    const observer = new ResizeObserver(paintFoil);
    observer.observe(element);

    const point = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * (canvas.width / Math.max(1, rect.width)),
        y: (event.clientY - rect.top) * (canvas.height / Math.max(1, rect.height)),
      };
    };
    const erase = (event: PointerEvent) => {
      if (revealedRef.current) return;
      const p = point(event);
      const radius = 15 * dpr;
      // destination-out removes alpha proportional to the source alpha, so the
      // eraser must be fully opaque regardless of the foil pattern's stroke.
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = radius * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (last.current) {
        ctx.beginPath();
        ctx.moveTo(last.current.x, last.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      last.current = p;
      if (++moves.current % 6 === 0) {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let cleared = 0, sampled = 0;
        for (let i = 3; i < data.length; i += 4 * 16) {
          sampled++;
          if (data[i] < 40) cleared++;
        }
        if (sampled && cleared / sampled >= threshold) reveal();
      }
    };
    const down = (event: PointerEvent) => {
      if (revealedRef.current) return;
      scratching.current = true;
      last.current = null;
      setScratchingUi(true);
      try { canvas.setPointerCapture?.(event.pointerId); } catch { /* synthetic or already-released pointer */ }
      erase(event);
    };
    const move = (event: PointerEvent) => {
      if (!scratching.current) return;
      erase(event);
    };
    const up = () => {
      scratching.current = false;
      last.current = null;
      setScratchingUi(false);
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("pointerleave", up);
    return () => {
      observer.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("pointerleave", up);
    };
  }, [revealed, reveal, threshold]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      reveal();
    }
  };

  return (
    <div
      ref={host}
      role="button"
      tabIndex={revealed ? -1 : 0}
      aria-label={revealed ? undefined : ariaLabel}
      aria-disabled={revealed}
      onKeyDown={onKeyDown}
      className={cn("relative isolate overflow-hidden", className)}
    >
      {children}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={cn(
          "absolute inset-0 z-10 h-full w-full touch-none transition-opacity duration-500",
          revealed ? "pointer-events-none opacity-0" : "cursor-crosshair opacity-100",
        )}
      />
      {!revealed && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 text-center transition-opacity duration-300",
            scratchingUi ? "opacity-0" : "opacity-100",
          )}
        >
          <span className="rounded-full border border-white/25 px-3 py-1 text-[9px] font-bold tracking-[0.16em] text-white/90">
            SCRATCH TO REVEAL
          </span>
          <span className="text-[9px] tracking-[0.1em] text-white/55">DRAG OR PRESS ENTER</span>
        </span>
      )}
      <span aria-live="polite" className="sr-only">{announcement}</span>
    </div>
  );
}

export default ScratchCard;
