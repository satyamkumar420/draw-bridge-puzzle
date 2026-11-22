import type React from 'react';

export interface GameCashIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 3D Cartoon Cash Bundle rendering the user-provided high-res asset
 */
export const GameCashIcon: React.FC<GameCashIconProps> = ({
  size = 48,
  className = '',
  style
}) => {
  return (
    <img
      src="./assets/game_cash.png"
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.dataset.failed) {
          img.dataset.failed = 'true';
          img.src = '/assets/game_cash.png';
        }
      }}
      alt="Cash"
      className={`game-cash-icon-img ${className}`}
      width={size}
      height={Math.round(size * (418 / 496))}
      style={{
        width: `${size}px`,
        height: 'auto',
        aspectRatio: '496 / 418',
        display: 'inline-block',
        objectFit: 'contain',
        verticalAlign: 'middle',
        userSelect: 'none',
        pointerEvents: 'none',
        filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35))',
        ...style
      }}
      draggable={false}
    />
  );
};
