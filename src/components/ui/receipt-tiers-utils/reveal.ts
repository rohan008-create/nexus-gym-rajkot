import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

export const REVEAL_KEYFRAMES = `@keyframes receipt-tier-in{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}`;

export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShown(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, shown };
}

export function revealClass(shown: boolean) {
  return shown ? "animate-[receipt-tier-in_.6s_ease_forwards] opacity-0" : "opacity-0";
}

export function revealDelay(shown: boolean, position: number): CSSProperties {
  return shown
    ? { animation: `receipt-tier-in .6s ease ${position * 0.12}s forwards`, opacity: 0 }
    : { opacity: 0 };
}
