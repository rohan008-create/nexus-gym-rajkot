'use client';
import { useNightScene } from './useNightScene';

// A still is reserved for reduced motion or a failed WebGL context.
export default function ArrivalPhotograph() {
  const night = useNightScene();
  const name = night ? 'arrival-night' : 'arrival-street';
  return <div className="gym-tour-arrival" aria-hidden="true">
    <picture>
      <source media="(max-aspect-ratio: 6/5)" srcSet={`/models/nexus-gym/${name}-portrait.webp`} />
      <img src={`/models/nexus-gym/${name}.webp`} alt="" width={1836} height={856} draggable={false} decoding="async" />
    </picture>
  </div>;
}
