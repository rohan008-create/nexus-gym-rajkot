'use client';
import { useState } from 'react';
import { ArrowUpRight, Check, Copy, MapPin, Navigation, Phone, RotateCcw, X } from 'lucide-react';
import { directionsUrl, nexusLocation } from './globeConfig';

interface GlobeLocationCardProps {
  onClose?: () => void;
  onResetGlobe: () => void;
}

export default function GlobeLocationCard({ onClose, onResetGlobe }: GlobeLocationCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(nexusLocation.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="globe-info-card" role="region" aria-label="Nexus Fitness Club Location Details">
      {onClose && (
        <button
          className="globe-card-close"
          onClick={onClose}
          aria-label="Close location card"
        >
          <X size={15} />
        </button>
      )}

      <div className="globe-card-header">
        <span className="globe-card-badge">
          <MapPin size={11} aria-hidden /> VERIFIED DESTINATION
        </span>
        <h3 className="globe-card-title">{nexusLocation.name}</h3>
        <p className="globe-card-sub">
          {nexusLocation.building.toUpperCase()} · {nexusLocation.street.toUpperCase()}<br />
          <span>{nexusLocation.city.toUpperCase()}, {nexusLocation.state.toUpperCase()}</span>
        </p>
      </div>

      <p className="globe-card-address">{nexusLocation.address}</p>

      <div className="globe-card-coordinates" aria-label="Geographic Coordinates">
        <span>LAT: 22°16′46.74″ N</span>
        <span>LON: 70°48′00.39″ E</span>
      </div>

      <div className="globe-card-facilities">
        <span className="globe-pill globe-pill-red">⏱ 06:00 AM – 10:00 PM</span>
        <span className="globe-pill">🅿 Free Parking</span>
        <span className="globe-pill">🛗 Elevator</span>
        <span className="globe-pill">⚡ 1st Floor</span>
      </div>

      <div className="globe-card-actions">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="globe-btn-primary"
          aria-label="Get directions to Nexus Fitness Club on Google Maps"
        >
          <Navigation size={14} aria-hidden />
          <span>GET DIRECTIONS</span>
          <ArrowUpRight size={14} aria-hidden />
        </a>

        <button
          type="button"
          onClick={handleCopy}
          className="globe-btn-secondary"
          aria-label="Copy full address"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" aria-hidden />
              <span className="text-emerald-300">COPIED</span>
            </>
          ) : (
            <>
              <Copy size={13} aria-hidden />
              <span>COPY ADDRESS</span>
            </>
          )}
        </button>

        <a
          href={`tel:${nexusLocation.phone}`}
          className="globe-btn-call"
          aria-label={`Call Nexus at ${nexusLocation.phoneDisplay}`}
        >
          <Phone size={13} aria-hidden />
          <span>CALL NEXUS</span>
        </a>

        <button
          type="button"
          onClick={onResetGlobe}
          className="globe-btn-reset"
          aria-label="Reset globe to Earth view"
        >
          <RotateCcw size={13} aria-hidden />
          <span>RESET GLOBE</span>
        </button>
      </div>
    </div>
  );
}

