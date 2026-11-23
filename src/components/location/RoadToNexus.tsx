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
  const headerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<CesiumGlobeHandle>(null);

  const [hasError, setHasError] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [controller, setController] = useState<CesiumGlobeHandle | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearViewport(true); observer.disconnect(); }
    }, { rootMargin: '600px' });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleGlobeReady = useCallback(() => {
    setIsReady(true);
  }, []);

  const handleGlobeError = useCallback((err: Error) => {
    console.error('Cesium Globe failed:', err);
    setHasError(true);
  }, []);

  const handleControllerReady = useCallback((ctrl: CesiumGlobeHandle) => {
    globeRef.current = ctrl;
    setController(ctrl);
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
      gsap.from('.globe-controls', {
        opacity: 0,
        x: 20,
        duration: 0.8,
        delay: 0.5,
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
      <header ref={headerRef} className="globe-header">
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
      {!hasError ? (
        <>
          {nearViewport ? <CesiumGlobe
            controllerRef={globeRef}
            onControllerReady={handleControllerReady}
            onReady={handleGlobeReady}
            onError={handleGlobeError}
          /> : <GlobeLoading message="EXPLORE YOUR DESTINATION" />}

          {/* Floating Navigation Controls (Zoom In, Zoom Out, Reset) */}
          <div className="globe-controls" role="toolbar" aria-label="Globe navigation controls">
            <button
              type="button"
              onClick={() => (controller || globeRef.current)?.zoomIn()}
              className="globe-ctrl-btn"
              aria-label="Zoom in"
              title="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => (controller || globeRef.current)?.zoomOut()}
              className="globe-ctrl-btn"
              aria-label="Zoom out"
              title="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => (controller || globeRef.current)?.resetGlobe()}
              className="globe-ctrl-btn"
              aria-label="Reset to Earth view"
              title="Reset Earth view"
            >
              ⟲
            </button>
          </div>

          {/* Explore Nexus Primary Floating Shelf */}
          <div className="globe-action-shelf">
            <button
              type="button"
              onClick={() => (controller || globeRef.current)?.flyToNexus()}
              className="globe-explore-btn"
              aria-label="Explore Nexus Fitness Club in Rajkot, Gujarat"
            >
              <span className="globe-explore-dot" aria-hidden />
              <span>EXPLORE NEXUS</span>
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
