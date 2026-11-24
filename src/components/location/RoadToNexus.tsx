'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Compass, MapPin, Navigation } from 'lucide-react';
import gsap from 'gsap';
import { directionsUrl, nexusLocation } from './globeConfig';
import type { CesiumGlobeHandle } from './CesiumGlobe';
import GlobeLoading from './GlobeLoading';
import './nexusGlobe.css';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// Lazy-load CesiumGlobe on client-side only
const CesiumGlobe = dynamic(() => import('./CesiumGlobe'), {
  ssr: false,
  loading: () => <GlobeLoading message="INITIALIZING 3D EARTH GLOBE" />,
});

export default function RoadToNexus() {
  const sectionRef = useRef<HTMLElement>(null);
  const globeRef = useRef<CesiumGlobeHandle>(null);

  const [globeState, setGlobeState] = useState<'preview' | 'loading' | 'ready' | 'error'>('preview');

  const handleGlobeReady = useCallback(() => {
    setGlobeState('ready');
  }, []);

  const handleGlobeError = useCallback((err: Error) => {
    console.error('Cesium Globe failed:', err);
    setGlobeState('error');
  }, []);

  // GSAP Entrance Animation
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.from('.globe-eyebrow', {
        opacity: 0,
        y: -15,
        duration: 0.8,
        ease: 'power2.out',
      });
      gsap.from('.globe-title', {
        opacity: 0,
        y: 20,
        duration: 1.0,
        delay: 0.15,
        ease: 'power3.out',
      });
      gsap.from('.globe-subtitle', {
        opacity: 0,
        y: 15,
        duration: 0.8,
        delay: 0.3,
        ease: 'power2.out',
      });
      gsap.from('.globe-coords-hud', {
        opacity: 0,
        x: 20,
        duration: 0.9,
        delay: 0.4,
        ease: 'power2.out',
      });
      gsap.from('.globe-action-shelf', {
        opacity: 0,
        y: 25,
        duration: 0.9,
        delay: 0.6,
        ease: 'power3.out',
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="location"
      className="nexus-globe-section"
      aria-labelledby="globe-section-title"
    >

      {/* Section Header */}
      <header className="globe-header">
        <p className="globe-eyebrow">
          <span className="globe-eyebrow-dot" aria-hidden />
          <span>11 / GLOBAL DESTINATION</span>
        </p>
        <h2 id="globe-section-title" className="globe-title">
          FIND YOUR <span>NEXUS.</span>
        </h2>
        <p className="globe-subtitle">ONE WORLD. ONE DESTINATION.</p>
      </header>

      {/* Top-Right HUD Coordinates */}
      <div className="globe-coords-hud" aria-hidden>
        <span>22°16′46.74″ N · 70°48′00.39″ E</span>
        <span className="globe-hud-accent">RAJKOT, GUJARAT, INDIA</span>
        <span>ELEVATION: 138M</span>
      </div>

      {/* 3D Earth Globe with CesiumJS */}
      {globeState !== 'error' ? (
        <>
          {globeState === 'preview' ? (
            <img className="globe-preview" src="/assets/nexus-earth-preview.webp" alt="" loading="lazy" decoding="async" />
          ) : <CesiumGlobe
            controllerRef={globeRef}
            onReady={handleGlobeReady}
            onError={handleGlobeError}
          />}

          {/* Floating Navigation Controls (Zoom In, Zoom Out, Reset) */}
          {globeState === 'ready' && <div className="globe-controls" role="toolbar" aria-label="Globe navigation controls">
            <button
              type="button"
              onClick={() => globeRef.current?.zoomIn()}
              className="globe-ctrl-btn"
              aria-label="Zoom in"
              title="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => globeRef.current?.zoomOut()}
              className="globe-ctrl-btn"
              aria-label="Zoom out"
              title="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => globeRef.current?.resetGlobe()}
              className="globe-ctrl-btn"
              aria-label="Reset to Earth view"
              title="Reset Earth view"
            >
              ⟲
            </button>
          </div>}

          <div className={`globe-action-shelf${globeState === 'loading' ? ' is-loading' : ''}`}>
            <a className="globe-directions-btn" href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin size={16} aria-hidden />
              Get Directions
            </a>
            <button
              type="button"
              onClick={() => {
                if (globeState === 'preview') setGlobeState('loading');
                if (globeState === 'ready') globeRef.current?.flyToNexus();
              }}
              className="globe-explore-btn"
              aria-disabled={globeState === 'loading'}
              aria-label={globeState === 'ready' ? 'Explore Nexus Fitness Club in Rajkot, Gujarat' : undefined}
            >
              <span className="globe-explore-dot" aria-hidden />
              <span>{globeState === 'preview' ? 'EXPLORE IN 3D' : globeState === 'loading' ? 'LOADING 3D' : 'EXPLORE NEXUS'}</span>
              <span className="globe-explore-arrow"><Navigation size={18} strokeWidth={1.7} aria-hidden /></span>
            </button>
          </div>
        </>
      ) : (
        /* Accessible Fallback State */
        <div className="globe-fallback-view" role="region" aria-label="Location Information">
          <div className="globe-fallback-box">
            <Compass className="text-red-500 mx-auto mb-4" size={40} />
            <h3 className="text-xl font-black text-white mb-2">{nexusLocation.name}</h3>
            <p className="text-xs text-red-500 font-mono tracking-widest mb-3">
              AVADH COMPLEX · DHEBAR ROAD · RAJKOT
            </p>
            <p className="text-zinc-400 text-xs leading-relaxed mb-6">
              {nexusLocation.address}
            </p>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold tracking-wider rounded transition"
            >
              <MapPin size={14} />
              <span>GET DIRECTIONS ON GOOGLE MAPS</span>
              <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
