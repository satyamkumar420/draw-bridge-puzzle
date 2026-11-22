import type React from 'react';

export interface StoreBuildingIconProps {
  width?: number;
  height?: number;
  showBadge?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * 2D Cartoon Store Building SVG matching reference image:
 * Features "STORE" sign, exclamation badge, scalloped red/white awning,
 * door with gold knob, and reflective shop window.
 */
export const StoreBuildingIcon: React.FC<StoreBuildingIconProps> = ({
  width = 84,
  height = 96,
  showBadge = true,
  className = '',
  onClick
}) => {
  return (
    <button
      type="button"
      className={`store-building-btn ${className}`}
      onClick={onClick}
      title="Store"
      style={{
        appearance: 'none',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        outline: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        transition: 'transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.15s ease'
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 115"
        width={width}
        height={height}
        style={{
          filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
          overflow: 'visible'
        }}
      >
        {/* Outer White Sticker Silhouette Glow/Border */}
        <g fill="#ffffff">
          <rect x="12" y="96" width="76" height="9" rx="3" />
          <rect x="15" y="37" width="70" height="62" rx="3" />
          <rect x="9" y="27" width="82" height="26" rx="4" />
          <rect x="23" y="3" width="54" height="24" rx="7" />
          {showBadge && <circle cx="86" cy="26" r="13" />}
        </g>

        {/* Foundation Base */}
        <rect x="14" y="97" width="72" height="7" rx="2" fill="#334155" />
        <rect x="15" y="98" width="70" height="2" fill="#475569" />

        {/* Store Front Wall */}
        <rect x="17" y="38" width="66" height="59" fill="#fef3c7" />

        {/* Shop Door (Left) */}
        <rect x="22" y="55" width="23" height="42" rx="2" fill="#ef4444" />
        <rect x="24.5" y="57.5" width="18" height="18" rx="1" fill="#7dd3fc" />
        <polygon points="25.5,74.5 35,58.5 39,58.5 29.5,74.5" fill="rgba(255,255,255,0.65)" />
        <rect x="24.5" y="78.5" width="18" height="15.5" rx="1" fill="#b91c1c" />
        <rect x="40" y="73" width="3.5" height="5" rx="1" fill="#fbbf24" />
        <circle cx="41.7" cy="75.5" r="1.2" fill="#d97706" />

        {/* Shop Display Window (Right) */}
        <rect x="49" y="55" width="31" height="27" rx="2" fill="#ef4444" />
        <rect x="51.5" y="57.5" width="26" height="22" rx="1" fill="#a7f3d0" />
        <polygon points="53,78 68,58.5 73,58.5 58,78" fill="rgba(255,255,255,0.6)" />
        <line x1="64.5" y1="57.5" x2="64.5" y2="79.5" stroke="#ef4444" strokeWidth="2" />
        <line x1="51.5" y1="68.5" x2="77.5" y2="68.5" stroke="#ef4444" strokeWidth="2" />
        <rect x="48" y="81.5" width="33" height="3" rx="1" fill="#fed7aa" />

        {/* Mint Roof Trim */}
        <rect x="12" y="27" width="76" height="5" rx="2" fill="#2dd4bf" />

        {/* Awning Stripes with Scalloped Arcs */}
        <path d="M 12 31 L 22 31 L 22 47 C 22 51.5 12 51.5 12 47 Z" fill="#dc2626" />
        <path d="M 22 31 L 34 31 L 34 47 C 34 51.5 22 51.5 22 47 Z" fill="#ffffff" />
        <path d="M 34 31 L 46 31 L 46 47 C 46 51.5 34 51.5 34 47 Z" fill="#dc2626" />
        <path d="M 46 31 L 58 31 L 58 47 C 58 51.5 46 51.5 46 47 Z" fill="#ffffff" />
        <path d="M 58 31 L 70 31 L 70 47 C 70 51.5 58 51.5 58 47 Z" fill="#dc2626" />
        <path d="M 70 31 L 82 31 L 82 47 C 82 51.5 70 51.5 70 47 Z" fill="#ffffff" />
        <path d="M 82 31 L 88 31 L 88 47 C 88 51.5 82 51.5 82 47 Z" fill="#dc2626" />

        {/* Roof Sign Connectors */}
        <rect x="42" y="16" width="3" height="12" rx="1" fill="#475569" />
        <rect x="55" y="16" width="3" height="12" rx="1" fill="#475569" />

        {/* "STORE" Sign Board */}
        <rect x="25" y="5" width="50" height="20" rx="5" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.6" />
        <rect x="27" y="7" width="46" height="16" rx="3.5" fill="#fef2f2" />
        <text
          x="50"
          y="19.5"
          fontFamily="'Fredoka', 'Lilita One', system-ui, sans-serif"
          fontWeight="900"
          fontSize="13"
          fill="#dc2626"
          textAnchor="middle"
          letterSpacing="0.8"
        >
          STORE
        </text>

        {/* Red Exclamation Badge (!) on top-right */}
        {showBadge && (
          <g transform="translate(86, 26)">
            <circle cx="0" cy="0" r="10.5" fill="#ef4444" stroke="#ffffff" strokeWidth="2.5" />
            <path d="M 0 -5.5 L 0 1.5" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="0" cy="5" r="1.3" fill="#ffffff" />
          </g>
        )}
      </svg>
    </button>
  );
};
