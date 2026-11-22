import type React from 'react';
import { SmartCarGraphic } from './SmartCarGraphic';

export interface ThumbnailProps {
  itemId: string;
  isUnlocked: boolean;
}

export const CarThumbnail: React.FC<ThumbnailProps> = ({ itemId }) => {
  return (
    <div className="store-thumb-wrapper">
      <SmartCarGraphic
        carId={itemId}
        className="store-thumb-smart-car"
        style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.4))' }}
      />
    </div>
  );
};

export const TrailThumbnail: React.FC<ThumbnailProps> = ({ itemId }) => {
  switch (itemId) {
    case 'none':
      return (
        <div className="store-thumb-default-label">
          DEFAULT
        </div>
      );

    case 'smoke_puff':
      return (
        <svg viewBox="0 0 120 70" className="store-thumb-svg">
          {/* Billowing cloud puffs */}
          <circle cx="35" cy="46" r="10" fill="#64748b" opacity={0.6} />
          <circle cx="50" cy="38" r="14" fill="#94a3b8" />
          <circle cx="68" cy="42" r="12" fill="#cbd5e1" />
          <circle cx="85" cy="34" r="16" fill="#f8fafc" />
          <circle cx="95" cy="42" r="11" fill="#e2e8f0" />
        </svg>
      );

    case 'fire_boost':
      return (
        <svg viewBox="0 0 120 70" className="store-thumb-svg">
          {/* Fiery booster flame */}
          <path d="M 20 40 C 35 30, 50 25, 75 22 L 105 35 L 75 48 C 50 45, 35 42, 20 40 Z" fill="#ef4444" />
          <path d="M 38 40 C 50 32, 65 28, 85 26 L 105 35 L 85 44 C 65 42, 50 40, 38 40 Z" fill="#f97316" />
          <polygon points="60,35 105,35 78,28 92,35 78,42" fill="#fde047" />
          <circle cx="108" cy="35" r="4" fill="#ffffff" />
        </svg>
      );

    case 'spooky_ghost':
      return (
        <svg viewBox="0 0 120 70" className="store-thumb-svg">
          {/* Spooky teal spirit / skull wisps */}
          <path d="M 25 45 C 40 48, 60 50, 75 42 C 90 32, 105 36, 105 36 C 100 46, 80 54, 60 52 C 40 50, 25 45, 25 45 Z" fill="#0d9488" opacity={0.5} />
          <ellipse cx="85" cy="35" rx="14" ry="12" fill="#2dd4bf" />
          <circle cx="80" cy="33" r="3" fill="#0f172a" />
          <circle cx="90" cy="33" r="3" fill="#0f172a" />
          {/* Bat silhouette */}
          <path d="M 45 28 C 42 24, 34 24, 30 28 C 36 30, 38 34, 40 36 C 42 34, 44 30, 50 28 C 46 24, 42 24, 45 28 Z" fill="#14b8a6" />
        </svg>
      );

    case 'pink_hearts':
      return (
        <svg viewBox="0 0 120 70" className="store-thumb-svg">
          {/* Sparkling pink hearts */}
          <g transform="translate(75, 20) scale(0.9)" fill="#ec4899">
            <path d="M 12 7 C 8 0, 0 3, 0 10 C 0 16, 12 24, 12 24 C 12 24, 24 16, 24 10 C 24 3, 16 0, 12 7 Z" />
          </g>
          <g transform="translate(45, 28) scale(0.65)" fill="#f43f5e">
            <path d="M 12 7 C 8 0, 0 3, 0 10 C 0 16, 12 24, 12 24 C 12 24, 24 16, 24 10 C 24 3, 16 0, 12 7 Z" />
          </g>
          <g transform="translate(25, 36) scale(0.45)" fill="#fb7185">
            <path d="M 12 7 C 8 0, 0 3, 0 10 C 0 16, 12 24, 12 24 C 12 24, 24 16, 24 10 C 24 3, 16 0, 12 7 Z" />
          </g>
          <circle cx="102" cy="24" r="2.5" fill="#fdf2f8" />
          <circle cx="68" cy="46" r="2" fill="#fdf2f8" />
        </svg>
      );

    case 'neon_rings':
      return (
        <svg viewBox="0 0 120 70" className="store-thumb-svg">
          {/* Sonic / energy expanding neon rings */}
          <ellipse cx="90" cy="35" rx="9" ry="18" fill="none" stroke="#22c55e" strokeWidth="3" opacity={0.9} />
          <ellipse cx="72" cy="35" rx="8" ry="15" fill="none" stroke="#4ade80" strokeWidth="2.8" opacity={0.75} />
          <ellipse cx="54" cy="35" rx="7" ry="12" fill="none" stroke="#86efac" strokeWidth="2.5" opacity={0.6} />
          <ellipse cx="38" cy="35" rx="6" ry="9" fill="none" stroke="#bbf7d0" strokeWidth="2" opacity={0.45} />
        </svg>
      );

    default:
      return null;
  }
};
