import type React from 'react';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Sparkles } from 'lucide-react';
import { GameButton2D } from '../common/GameButton2D';
import { audio } from '../../services/audioService';
import { useI18n } from '../../i18n';

export interface AllLevelsCompleteModalProps {
  isOpen: boolean;
  onRestartFromLevel1: () => void;
  onClose: () => void;
}

export const AllLevelsCompleteModal: React.FC<AllLevelsCompleteModalProps> = ({
  isOpen,
  onRestartFromLevel1,
  onClose
}) => {
  const { t } = useI18n();

  const [isSmallDevice, setIsSmallDevice] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640 || window.innerHeight < 500;
  });

  // Full-range responsive scaling: scales UP (up to 1.35x) on large screens, scales DOWN proportionally on compact screens
  const [modalScale, setModalScale] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const baseW = 440;
    const baseH = 320;
    const sX = (window.innerWidth * 0.94) / baseW;
    const sY = (window.innerHeight * 0.94) / baseH;
    return Math.min(1.35, Math.max(0.5, Math.min(sX, sY)));
  });

  useEffect(() => {
    const updateSize = () => {
      const isSmall = window.innerWidth < 640 || window.innerHeight < 500;
      setIsSmallDevice(isSmall);

      const baseW = 440;
      const baseH = 320;
      const sX = (window.innerWidth * 0.94) / baseW;
      const sY = (window.innerHeight * 0.94) / baseH;
      setModalScale(Math.min(1.35, Math.max(0.5, Math.min(sX, sY))));
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Handle ESC key to dismiss modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Audio victory fanfare
    audio.stopEngine();
    audio.playVictory();

    // Vibrant celebration confetti explosions (fired once on open)
    try {
      // Center burst
      confetti({
        particleCount: 90,
        spread: 100,
        origin: { y: 0.52 },
        scalar: 1.8,
        ticks: 300,
        colors: ['#facc15', '#f97316', '#38bdf8', '#4ade80', '#ec4899', '#a855f7']
      });
      // Left cannon
      confetti({
        particleCount: 65,
        angle: 60,
        spread: 75,
        origin: { x: 0.05, y: 0.65 },
        scalar: 1.7,
        ticks: 280,
        colors: ['#38bdf8', '#4ade80', '#facc15', '#f43f5e']
      });
      // Right cannon
      confetti({
        particleCount: 65,
        angle: 120,
        spread: 75,
        origin: { x: 0.95, y: 0.65 },
        scalar: 1.7,
        ticks: 280,
        colors: ['#fb923c', '#38bdf8', '#facc15', '#a855f7']
      });
    } catch {
      // Ignore if confetti canvas not available
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      audio.stopVictory();
      try {
        confetti.reset();
      } catch {
        // ignore
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const headerTitle = t('congrats') || 'CONGRATS!';
  const mainTitle = t('all_levels_complete') || 'ALL LEVELS COMPLETE!';
  const subtitle =
    t('all_levels_complete_desc') ||
    "You've conquered all 100 levels! Outstanding work, Bridge Master!";
  const btnLabel = t('start_from_level_1') || 'START FROM LEVEL 1';
  const badgeLabel = t('completed_all_100_levels') || '100 / 100 LEVELS COMPLETED';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="all-levels-scaler"
        style={{
          transform: `scale(${modalScale})`,
          transformOrigin: 'center center'
        }}
      >
        <div
          className="setting-modal-card all-levels-modal-card"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* 2D Header Clamp matching SettingsModal */}
          <div className="setting-clip-wrap">
            <svg
              className="setting-clip-svg"
              viewBox="0 0 230 52"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="allLevelsClipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <clipPath id="allLevelsClipBody">
                  <path d="M 0 10 Q 0 0 12 0 L 218 0 Q 230 0 230 10 L 210 46 Q 206 50 200 50 L 30 50 Q 24 50 20 46 Z" />
                </clipPath>
              </defs>

              {/* Dark Cyan Clip Base Outline */}
              <path
                d="M -1 9 Q -1 -1 12 -1 L 218 -1 Q 231 -1 231 9 L 211 47 Q 207 52 200 52 L 30 52 Q 23 52 19 47 Z"
                fill="#0369a1"
              />

              {/* Clip Main Face */}
              <g clipPath="url(#allLevelsClipBody)">
                <path
                  d="M 0 10 Q 0 0 12 0 L 218 0 Q 230 0 230 10 L 210 46 Q 206 50 200 50 L 30 50 Q 24 50 20 46 Z"
                  fill="url(#allLevelsClipGrad)"
                />
                <rect x="0" y="0" width="230" height="3.5" fill="rgba(255, 255, 255, 0.55)" />
                <rect x="0" y="45" width="230" height="5" fill="#075985" />
                <polygon points="142,50 168,0 178,0 152,50" fill="rgba(255, 255, 255, 0.22)" />
                <polygon points="166,50 192,0 206,0 180,50" fill="rgba(255, 255, 255, 0.40)" />
              </g>

              {/* Bold Cartoon Clip Header Text */}
              <text
                x="115"
                y="32"
                fontFamily="var(--font-game, 'Lilita One', 'Fredoka', 'Titan One', cursive, system-ui, sans-serif)"
                fontWeight="900"
                fontSize="19"
                fill="#ffffff"
                textAnchor="middle"
                letterSpacing="0.06em"
                style={{
                  filter: 'drop-shadow(0 2.5px 0 #0284c7) drop-shadow(0 3px 3px rgba(0,0,0,0.35))'
                }}
              >
                {headerTitle}
              </text>
            </svg>
          </div>

          {/* Circular Red Close Button on Top Right */}
          <button
            type="button"
            className="setting-close-circle"
            onClick={() => {
              audio.playPop();
              onClose();
            }}
            aria-label={t('close')}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="4.5"
              strokeLinecap="round"
            >
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>

          {/* Inner Warm Parchment Panel */}
          <div className="setting-inner-box all-levels-inner-box">
            {/* Animated Glowing Golden Trophy */}
            <div className="all-levels-trophy-container">
              <div className="all-levels-trophy-glow" />
              <div className="all-levels-trophy-circle">
                <Trophy size={34} className="all-levels-trophy-icon" />
                <Sparkles size={18} className="all-levels-sparkle-top-right" />
                <Sparkles size={14} className="all-levels-sparkle-bottom-left" />
              </div>
            </div>

            {/* Congratulations Headline */}
            <div className="all-levels-text-block">
              <h2 className="all-levels-main-title">{mainTitle}</h2>
              <div className="all-levels-badge-pill">
                <span>{badgeLabel}</span>
              </div>
              <p className="all-levels-desc">{subtitle}</p>
            </div>

            {/* Action: Start From Level 1 Button */}
            <div className="all-levels-actions">
              <GameButton2D
                variant="green"
                size={isSmallDevice ? 'sm' : 'lg'}
                className="all-levels-start-btn"
                onClick={() => {
                  audio.playPop();
                  onRestartFromLevel1();
                }}
                icon={<RotateCcw size={isSmallDevice ? 16 : 22} strokeWidth={3.5} />}
              >
                {btnLabel}
              </GameButton2D>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
