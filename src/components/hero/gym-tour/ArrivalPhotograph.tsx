'use client';
import { useNightScene } from './useNightScene';

// Show the same arrival while the scene loads and when WebGL is unavailable.
export default function ArrivalPhotograph() {
  const night = useNightScene();
  const name = night ? 'arrival-night' : 'arrival-street';
  return <div className="gym-tour-arrival" aria-hidden="true">
    <picture>
      <source media="(max-aspect-ratio: 6/5)" srcSet={`/models/nexus-gym/${name}-portrait.webp`} />
      <img src={`/models/nexus-gym/${name}.webp`} alt="" width={1836} height={856} draggable={false} decoding="async" fetchPriority="high" />
    </picture>
  </div>;
}
