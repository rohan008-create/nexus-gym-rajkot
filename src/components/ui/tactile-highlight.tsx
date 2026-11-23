'use client';

import { motion, useReducedMotion } from 'framer-motion';

type Direction = 'left' | 'right' | 'top' | 'bottom';

const closed: Record<Direction, string> = {
  left: 'inset(0 100% 0 0 round .12em)',
  right: 'inset(0 0 0 100% round .12em)',
  top: 'inset(0 0 100% 0 round .12em)',
  bottom: 'inset(100% 0 0 0 round .12em)',
};

export default function TactileHighlight({ children, direction = 'left', delay = .12, animate = true }: {
  children: string;
  direction?: Direction;
  delay?: number;
  animate?: boolean;
}) {
  const reduced = useReducedMotion();

  return <span className="relative inline-block whitespace-nowrap px-[.12em] -mx-[.12em]">
    {children}
    <motion.span aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[var(--tactile-highlight,#d52036)] text-[var(--tactile-ink,#fffdf5)]"
      initial={animate && !reduced ? { clipPath: closed[direction] } : false}
      animate={{ clipPath: 'inset(0 0 0 0 round .12em)' }}
      transition={{ duration: animate && !reduced ? .54 : 0, delay: animate && !reduced ? delay : 0, ease: [.22, 1, .36, 1] }}>
      <span className="block px-[.12em]">{children}</span>
    </motion.span>
  </span>;
}
