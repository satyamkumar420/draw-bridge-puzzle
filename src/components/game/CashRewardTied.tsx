import type React from 'react';
import { GameCashIcon } from '../common/GameCashIcon';

export interface CashRewardTiedProps {
  isBreaking: boolean;
  className?: string;
}

export const CashRewardTied: React.FC<CashRewardTiedProps> = ({
  isBreaking,
  className = ''
}) => {
  return (
    <div className={`cash-reward-tied-wrap ${className}`}>
      {/* Base 3D Cartoon Cash Bundle */}
      <GameCashIcon size={96} className="cash-reward-base-icon" />

      {/* Ribbon & Bow Wrapped Around the Cash */}
      <svg
        viewBox="0 0 100 84"
        className={`cash-ribbon-svg ${isBreaking ? 'ribbon-broken' : ''}`}
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="redRibbonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff4d4d" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="goldRibbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="60%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
        </defs>

        {/* Vertical/Diagonal Wrapping Band Around the Cash Bundle */}
        <polygon
          className="cash-ribbon-strap"
          points="54,23 66,30 51,57 39,50"
          fill="url(#redRibbonGrad)"
          stroke="#991b1b"
          strokeWidth="1"
        />

        {/* Left Bow Loop & Ribbon Tail */}
        <g className="cash-ribbon-left">
          {/* Left Loop */}
          <path
            d="M 52 41 C 40 29 28 35 36 45 C 42 50 50 45 52 42 Z"
            fill="url(#redRibbonGrad)"
            stroke="#991b1b"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Left Loop Highlight */}
          <path
            d="M 37 33 C 32 37 36 43 42 45"
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Left Ribbon Tail */}
          <path
            d="M 48 45 L 30 57 L 36 61 L 50 48 Z"
            fill="#dc2626"
            stroke="#991b1b"
            strokeWidth="1"
          />
        </g>

        {/* Right Bow Loop & Ribbon Tail */}
        <g className="cash-ribbon-right">
          {/* Right Loop */}
          <path
            d="M 56 41 C 68 29 80 35 72 45 C 66 50 58 45 56 42 Z"
            fill="url(#redRibbonGrad)"
            stroke="#991b1b"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Right Loop Highlight */}
          <path
            d="M 71 33 C 76 37 72 43 66 45"
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Right Ribbon Tail */}
          <path
            d="M 60 45 L 78 57 L 72 61 L 58 48 Z"
            fill="#dc2626"
            stroke="#991b1b"
            strokeWidth="1"
          />
        </g>

        {/* Center Golden/Red Ribbon Knot */}
        <ellipse
          className="cash-ribbon-knot"
          cx="54"
          cy="42"
          rx="5.5"
          ry="5.5"
          fill="url(#goldRibbonGrad)"
          stroke="#a16207"
          strokeWidth="1.2"
        />
        {/* Knot Inner Glow */}
        <circle cx="52.5" cy="40.5" r="1.8" fill="#ffffff" opacity={0.7} />
      </svg>

      {/* Ribbon Snap Sparkles */}
      {isBreaking && (
        <div className="ribbon-break-sparkles">
          <span className="sparkle sp-1">✨</span>
          <span className="sparkle sp-2">⭐</span>
          <span className="sparkle sp-3">✨</span>
          <span className="sparkle sp-4">⭐</span>
        </div>
      )}
    </div>
  );
};
