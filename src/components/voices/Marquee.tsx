import type { CSSProperties, ReactNode } from 'react';

export default function Marquee({ children, reverse = false, duration = 42 }: { children: ReactNode; reverse?: boolean; duration?: number }) {
  return <div className="voices-column" data-direction={reverse ? 'down' : 'up'} style={{ '--voices-duration': `${duration}s` } as CSSProperties}>
    <div className="voices-track">
      {[0, 1].map(copy => <div className="voices-copy" key={copy} aria-hidden="true">{children}</div>)}
    </div>
  </div>;
}
