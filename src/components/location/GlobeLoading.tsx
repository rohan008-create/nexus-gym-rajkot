'use client';
import { Globe2 } from 'lucide-react';

export default function GlobeLoading({ message = 'INITIALIZING NEXUS WORLD' }: { message?: string }) {
  return (
    <div className="globe-loading-overlay" role="status" aria-live="polite">
      <div className="globe-loading-box">
        <div className="globe-loading-rings" aria-hidden>
          <div className="globe-ring ring-1" />
          <div className="globe-ring ring-2" />
          <div className="globe-ring ring-3" />
          <Globe2 className="globe-loading-icon" size={28} />
        </div>
        <p className="globe-loading-text">{message}</p>
        <span className="globe-loading-sub">ONE WORLD. ONE DESTINATION.</span>
      </div>
    </div>
  );
}

