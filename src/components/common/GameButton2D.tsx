import type React from 'react';

export type Button2DVariant = 'green' | 'yellow' | 'blue' | 'red' | 'gray';
export type Button2DSize = 'sm' | 'md' | 'lg' | 'xl';

export interface GameButton2DProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Button2DVariant;
  size?: Button2DSize;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  fullWidth?: boolean;
  radius?: number;
}

const VARIANT_MAP: Record<Button2DVariant, { bg: string; insetShadow: string }> = {
  green: {
    bg: 'linear-gradient(180deg, #4ade80 0%, #22c55e 55%, #16a34a 100%)',
    insetShadow: 'inset 0 -3.5px 0 #15803d, inset 0 1px 0 rgba(255, 255, 255, 0.4)'
  },
  yellow: {
    bg: 'linear-gradient(180deg, #fde047 0%, #f59e0b 55%, #eab308 100%)',
    insetShadow: 'inset 0 -3.5px 0 #d97706, inset 0 1px 0 rgba(255, 255, 255, 0.5)'
  },
  blue: {
    bg: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 55%, #2563eb 100%)',
    insetShadow: 'inset 0 -3.5px 0 #1d4ed8, inset 0 1px 0 rgba(255, 255, 255, 0.4)'
  },
  red: {
    bg: 'linear-gradient(180deg, #f87171 0%, #ef4444 55%, #dc2626 100%)',
    insetShadow: 'inset 0 -3.5px 0 #b91c1c, inset 0 1px 0 rgba(255, 255, 255, 0.4)'
  },
  gray: {
    bg: 'linear-gradient(180deg, #9ca3af 0%, #6b7280 55%, #4b5563 100%)',
    insetShadow: 'inset 0 -3.5px 0 #374151, inset 0 1px 0 rgba(255, 255, 255, 0.3)'
  }
};

const SIZE_MAP: Record<Button2DSize, { faceSize: number; padding: string; fontSize: string; radius: number }> = {
  sm: { faceSize: 40, padding: '3px 3px 5.5px 3px', fontSize: '13px', radius: 9 },
  md: { faceSize: 48, padding: '3.5px 3.5px 6.5px 3.5px', fontSize: '15px', radius: 11 },
  lg: { faceSize: 56, padding: '4px 4px 7.5px 4px', fontSize: '17px', radius: 11 },
  xl: { faceSize: 76, padding: '5px 5px 9px 5px', fontSize: '20px', radius: 15 }
};

/**
 * Reusable 2D Arcade Game Button:
 * Features a pure white outer rounded bezel with bottom 3D shelf,
 * vibrant inner colored face with inset bevel, and bold white icon.
 */
export const GameButton2D: React.FC<GameButton2DProps> = ({
  variant = 'green',
  size = 'md',
  icon,
  badge,
  fullWidth = false,
  radius,
  children,
  className = '',
  disabled,
  style,
  ...rest
}) => {
  const v = VARIANT_MAP[variant] || VARIANT_MAP.green;
  const s = SIZE_MAP[size] || SIZE_MAP.md;
  const effectiveRadius = radius !== undefined ? radius : s.radius;
  const innerRadius = Math.max(4, effectiveRadius - 3.5);
  const isIconOnly = !children;

  return (
    <button
      type="button"
      disabled={disabled}
      className={`game-btn-2d game-btn-2d-${variant} ${disabled ? 'btn-2d-disabled' : ''} ${className}`}
      style={{
        appearance: 'none',
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        userSelect: 'none',
        display: 'inline-flex',
        position: 'relative',
        filter: disabled ? 'grayscale(0.8)' : 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.25))',
        width: fullWidth ? '100%' : 'auto',
        ...style
      }}
      {...rest}
    >
      <span
        className="game-btn-2d-bezel"
        style={{
          background: '#ffffff',
          borderRadius: `${effectiveRadius}px`,
          padding: s.padding,
          boxShadow: 'inset 0 -2.5px 0 #cbd5e1',
          display: 'flex',
          width: '100%'
        }}
      >
        <span
          className="game-btn-2d-face"
          style={{
            width: isIconOnly ? `${s.faceSize}px` : '100%',
            height: `${s.faceSize}px`,
            minWidth: `${s.faceSize}px`,
            borderRadius: `${innerRadius}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: isIconOnly ? '0' : '0 18px',
            background: disabled ? '#9ca3af' : v.bg,
            boxShadow: disabled ? 'none' : v.insetShadow,
            color: '#ffffff',
            fontFamily: 'var(--font-game)',
            fontWeight: 800,
            fontSize: s.fontSize,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            boxSizing: 'border-box',
            whiteSpace: 'nowrap'
          }}
        >
          {icon && (
            <span
              className="game-btn-2d-icon"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'visible',
                flexShrink: 0
              }}
            >
              {icon}
            </span>
          )}
          {children && (
            <span
              className="game-btn-2d-label"
              style={{
                whiteSpace: 'nowrap',
                display: 'inline-block'
              }}
            >
              {children}
            </span>
          )}
        </span>
      </span>

      {badge && <span className="game-btn-2d-badge">{badge}</span>}
    </button>
  );
};
