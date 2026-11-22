import type React from 'react';

export interface GameIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

/**
 * Bold, solid 6-toothed gear icon matching reference cartoon game UI
 */
export const GameSettingsIcon: React.FC<GameIconProps> = ({
  size = 28,
  color = '#ffffff',
  className = ''
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    className={className}
    style={{ overflow: 'visible', filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.25))' }}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.2 2.5a1.5 1.5 0 0 1 1.4-1h1.8a1.5 1.5 0 0 1 1.4 1l.3 1.2a8.6 8.6 0 0 0 1.5.6l1.1-.6a1.5 1.5 0 0 1 1.7.2l1.3 1.3a1.5 1.5 0 0 1 .2 1.7l-.6 1.1c.3.5.5 1 .6 1.5l1.2.3a1.5 1.5 0 0 1 1 1.4v1.8a1.5 1.5 0 0 1-1 1.4l-1.2.3a8.6 8.6 0 0 0-.6 1.5l.6 1.1a1.5 1.5 0 0 1-.2 1.7l-1.3 1.3a1.5 1.5 0 0 1-1.7.2l-1.1-.6a8.6 8.6 0 0 0-1.5.6l-.3 1.2a1.5 1.5 0 0 1-1.4 1h-1.8a1.5 1.5 0 0 1-1.4-1l-.3-1.2a8.6 8.6 0 0 0-1.5-.6l-1.1.6a1.5 1.5 0 0 1-1.7-.2l-1.3-1.3a1.5 1.5 0 0 1-.2-1.7l.6-1.1a8.6 8.6 0 0 0-.6-1.5l-1.2-.3a1.5 1.5 0 0 1-1-1.4v-1.8a1.5 1.5 0 0 1 1-1.4l1.2-.3a8.6 8.6 0 0 0 .6-1.5l-.6-1.1a1.5 1.5 0 0 1 .2-1.7l1.3-1.3a1.5 1.5 0 0 1 1.7-.2l1.1.6c.5-.3 1-.5 1.5-.6l.3-1.2ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
    />
  </svg>
);

/**
 * Bold, thick circular reset arrow matching reference cartoon game UI
 */
export const GameResetIcon: React.FC<GameIconProps> = ({
  size = 28,
  color = '#ffffff',
  strokeWidth = 3.5,
  className = ''
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ overflow: 'visible', filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.25))' }}
  >
    <path d="M 5.5 17 A 8.5 8.5 0 1 0 4 8.5" />
    <polyline points="3.5 3.5 3.5 8.5 8.5 8.5" />
  </svg>
);

/**
 * Bold speaker icon with sound waves matching reference Image 2
 */
export const GameSoundOnIcon: React.FC<GameIconProps> = ({
  size = 42,
  color = '#ffffff',
  className = ''
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ overflow: 'visible', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.28))' }}
  >
    <path d="M 2.5 8.5 L 6.8 8.5 L 13 3.8 L 13 20.2 L 6.8 15.5 L 2.5 15.5 Z" fill={color} />
    <path
      d="M 16 8.8 C 17.4 10.2 17.8 11.1 17.8 12 C 17.8 12.9 17.4 13.8 16 15.2"
      stroke={color}
      strokeWidth={2.8}
      strokeLinecap="round"
    />
    <path
      d="M 19.5 6.2 C 21.8 8.5 22.2 10.2 22.2 12 C 22.2 13.8 21.8 15.5 19.5 17.8"
      stroke={color}
      strokeWidth={2.8}
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Bold speaker icon with diagonal slash matching reference Image 3 (disabled state)
 */
export const GameSoundOffIcon: React.FC<GameIconProps> = ({
  size = 42,
  color = '#ffffff',
  className = ''
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ overflow: 'visible', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.28))' }}
  >
    <path d="M 2.5 8.5 L 6.8 8.5 L 13 3.8 L 13 20.2 L 6.8 15.5 L 2.5 15.5 Z" fill={color} />
    <path
      d="M 16 8.8 C 17.4 10.2 17.8 11.1 17.8 12 C 17.8 12.9 17.4 13.8 16 15.2"
      stroke={color}
      strokeWidth={2.8}
      strokeLinecap="round"
    />
    <line
      x1="3.5"
      y1="3.5"
      x2="21"
      y2="21"
      stroke={color}
      strokeWidth={3.0}
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Bold translate / languages icon matching reference cartoon game UI
 */
export const GameTranslateIcon: React.FC<GameIconProps> = ({
  size = 42,
  color = '#ffffff',
  className = ''
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ overflow: 'visible', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.28))' }}
  >
    <path d="m5 8 6 6" />
    <path d="m4 14 6-6 2-3" />
    <path d="M2 5h12" />
    <path d="M7 2h1" />
    <path d="m22 22-5-10-5 10" />
    <path d="M14 18h6" />
  </svg>
);

/**
 * Bold movie clapperboard / video ad icon matching 2D arcade button style
 */
export const GameVideoAdIcon: React.FC<GameIconProps> = ({
  size = 24,
  color = '#ffffff',
  strokeWidth = 2,
  className = ''
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ overflow: 'visible', filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.3))' }}
  >
    <path
      d="M19 4H5C3.89543 4 3 4.89543 3 6V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V6C21 4.89543 20.1046 4 19 4Z"
      fill={color}
      stroke="#0f172a"
      strokeWidth={strokeWidth}
    />
    <path d="M3 9H21" stroke="#0f172a" strokeWidth={strokeWidth} />
    <path d="M7 4L5 9M11 4L9 9M15 4L13 9M19 4L17 9" stroke="#0f172a" strokeWidth={strokeWidth} />
  </svg>
);


