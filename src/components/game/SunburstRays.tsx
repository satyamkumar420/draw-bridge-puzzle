import type React from 'react';

export interface SunburstRaysProps {
  className?: string;
  size?: number;
  color?: string;
  secondaryColor?: string;
}

export const SunburstRays: React.FC<SunburstRaysProps> = ({
  className = '',
  size = 560,
  color = '#fde047',
  secondaryColor = '#f59e0b'
}) => {
  const numRays = 20;
  const rayAngle = 360 / numRays;

  return (
    <div
      className={`sunburst-rays-container ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`
      }}
    >
      <svg
        viewBox="0 0 200 200"
        className="sunburst-rays-svg"
        fill="none"
      >
        <defs>
          <radialGradient id="sunburstFade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="80%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sunburstCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#fde047" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <mask id="sunburstMask">
            <rect width="200" height="200" fill="url(#sunburstFade)" />
          </mask>
        </defs>

        {/* Soft golden core shine behind rays */}
        <circle cx="100" cy="100" r="85" fill="url(#sunburstCoreGlow)" />

        <g mask="url(#sunburstMask)">
          {Array.from({ length: numRays }).map((_, i) => {
            const startAngle = (i * rayAngle * Math.PI) / 180;
            const endAngle = ((i * rayAngle + rayAngle / 2) * Math.PI) / 180;
            const r = 135;
            const x1 = 100 + r * Math.cos(startAngle);
            const y1 = 100 + r * Math.sin(startAngle);
            const x2 = 100 + r * Math.cos(endAngle);
            const y2 = 100 + r * Math.sin(endAngle);

            const rayColor = i % 2 === 0 ? color : secondaryColor;
            return (
              <polygon
                key={i}
                points={`100,100 ${x1.toFixed(2)},${y1.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`}
                fill={rayColor}
                opacity={0.68}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};
