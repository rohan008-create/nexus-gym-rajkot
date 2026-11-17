'use client';
import { useMemo } from 'react';

export default function ArmoryParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const size = 2 + (i % 4) * 1.5;
      const left = ((i * 13.7) % 96) + 2;
      const top = ((i * 17.3) % 94) + 3;
      const duration = 6 + (i % 5) * 2;
      const delay = -(i * 0.7);
      const blur = i % 2 === 0 ? 3 : 1.5;
      const opacity = 0.25 + ((i % 5) / 10);

      return {
        id: i,
        style: {
          left: `${left}%`,
          top: `${top}%`,
          width: `${size}px`,
          height: `${size}px`,
          filter: `blur(${blur}px)`,
          opacity,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
        },
      };
    });
  }, []);

  return (
    <div className="armory-particles-layer" aria-hidden="true">
      {particles.map(p => (
        <span key={p.id} className="armory-particle" style={p.style} />
      ))}
    </div>
  );
}
