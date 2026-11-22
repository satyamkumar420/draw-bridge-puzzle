import type React from 'react';

export type ArcadeButtonVariant = 'green' | 'blue' | 'orange' | 'red' | 'gray';
export type ArcadeButtonSize = 'sm' | 'md' | 'lg';

export interface ArcadeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ArcadeButtonVariant;
  size?: ArcadeButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ArcadeButtonVariant, { bg: string; shadow: string; text: string; border: string }> = {
  green: {
    bg: 'linear-gradient(180deg, #4ade80 0%, #22c55e 60%, #16a34a 100%)',
    shadow: '#15803d',
    text: '#ffffff',
    border: '#166534'
  },
  blue: {
    bg: 'linear-gradient(180deg, #60a5fa 0%, #3b82f6 60%, #2563eb 100%)',
    shadow: '#1d4ed8',
    text: '#ffffff',
    border: '#1e40af'
  },
  orange: {
    bg: 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 60%, #d97706 100%)',
    shadow: '#b45309',
    text: '#ffffff',
    border: '#92400e'
  },
  red: {
    bg: 'linear-gradient(180deg, #f87171 0%, #ef4444 60%, #dc2626 100%)',
    shadow: '#b91c1c',
    text: '#ffffff',
    border: '#991b1b'
  },
  gray: {
    bg: 'linear-gradient(180deg, #9ca3af 0%, #6b7280 60%, #4b5563 100%)',
    shadow: '#374151',
    text: '#ffffff',
    border: '#1f2937'
  }
};

const SIZE_STYLES: Record<ArcadeButtonSize, { padding: string; fontSize: string; iconSize: number; bevel: number }> = {
  sm: { padding: '6px 12px', fontSize: '13px', iconSize: 15, bevel: 3 },
  md: { padding: '10px 20px', fontSize: '15px', iconSize: 18, bevel: 4 },
  lg: { padding: '14px 28px', fontSize: '18px', iconSize: 22, bevel: 6 }
};

export const ArcadeButton: React.FC<ArcadeButtonProps> = ({
  variant = 'green',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  className = '',
  disabled,
  style,
  ...rest
}) => {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];

  return (
    <button
      disabled={disabled}
      className={`arcade-button ${className} ${disabled ? 'arcade-disabled' : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: s.padding,
        fontSize: s.fontSize,
        fontFamily: 'inherit',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: v.text,
        background: disabled ? '#9ca3af' : v.bg,
        border: `1.5px solid ${disabled ? '#6b7280' : v.border}`,
        borderRadius: '12px',
        boxShadow: disabled ? 'none' : `0 ${s.bevel}px 0 ${v.shadow}, 0 ${s.bevel + 3}px 8px rgba(0, 0, 0, 0.25)`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        outline: 'none',
        transition: 'transform 0.08s ease, box-shadow 0.08s ease, filter 0.12s ease',
        width: fullWidth ? '100%' : 'auto',
        ...style
      }}
      {...rest}
    >
      {icon && iconPosition === 'left' && <span className="arcade-btn-icon">{icon}</span>}
      {children && <span>{children}</span>}
      {icon && iconPosition === 'right' && <span className="arcade-btn-icon">{icon}</span>}
    </button>
  );
};
