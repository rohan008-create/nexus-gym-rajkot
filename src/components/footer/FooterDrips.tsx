'use client';

import { useEffect, useRef } from 'react';

/** Small, staggered beads detach from the lower edges of the live wordmark. */
export default function FooterDrips() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      element.dataset.running = String(entry.isIntersecting);
    }, { threshold: .05 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const drops = [
    [13.1, 1.0, 5.1, 1], [20.8, 3.1, 6.2, .8],
    [28.2, .2, 5.8, 1.15], [38.5, 4.4, 6.8, .85],
    [72.8, 1.9, 5.6, 1.1], [78.1, 4.9, 7.2, .8],
    [88.5, .7, 6.1, 1.2], [85.6, 3.6, 7.5, .75],
  ];
  return <div ref={root} className="nexus-drips" data-testid="nexus-drips" data-running="false" aria-hidden="true">
    {drops.map(([x, delay, duration, size], index) => <span key={index} className="nexus-drip-source"
      style={{ left: `${x}%`, '--drip-delay': `${delay}s`, '--drip-duration': `${duration}s`, '--drip-size': size } as React.CSSProperties}>
      <i className="nexus-water-drop" /><i className="nexus-water-splash" />
    </span>)}
  </div>;
}
