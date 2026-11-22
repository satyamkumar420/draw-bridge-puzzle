import type React from 'react';
import { useState } from 'react';
import type { LevelData } from '../../types/level';
import { getWallTheme } from '../../graphics/brickRenderer';
import { audio } from '../../services/audioService';
import { useI18n } from '../../i18n';

export interface LevelSelectModalProps {
  isOpen: boolean;
  currentLevelIndex: number;
  unlockedIndex: number;
  allLevels: LevelData[];
  onSelectLevel: (index: number) => void;
  onClose: () => void;
}

const CHAPTER_SIZE = 25;

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  isOpen,
  currentLevelIndex,
  unlockedIndex,
  allLevels,
  onSelectLevel,
  onClose
}) => {
  const { t } = useI18n();
  const defaultChapter = Math.floor(currentLevelIndex / CHAPTER_SIZE);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeChapter = selectedChapter ?? defaultChapter;
  const totalChapters = Math.ceil(allLevels.length / CHAPTER_SIZE);
  const startIdx = activeChapter * CHAPTER_SIZE;
  const endIdx = Math.min(startIdx + CHAPTER_SIZE, allLevels.length);
  const chapterLevels = allLevels.slice(startIdx, endIdx);

  const handleLevelClick = (index: number) => {
    const isUnlocked = index <= unlockedIndex;
    if (isUnlocked) {
      audio.playPop();
      onSelectLevel(index);
      onClose();
    } else {
      audio.playPop();
      setLockedNotice(t('complete_previous_first', { n: index }));
      setTimeout(() => setLockedNotice(null), 2000);
    }
  };

  const handleChapterClick = (chap: number) => {
    audio.playPop();
    setSelectedChapter(chap);
    setLockedNotice(null);
  };

  const handleClose = () => {
    audio.playPop();
    setSelectedChapter(null);
    onClose();
  };

  return (
    <div className="level-select-modal-overlay" onClick={handleClose}>
      <div
        className="level-select-modal-window"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* 2D Header Clamp / Clip */}
        <div className="level-select-clip-wrap">
          <svg
            className="level-select-clip-svg"
            viewBox="0 0 250 54"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="levelClipGradLarge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <clipPath id="levelClipBodyLarge">
                <path d="M 0 10 Q 0 0 12 0 L 238 0 Q 250 0 250 10 L 228 48 Q 224 52 216 52 L 34 52 Q 26 52 22 48 Z" />
              </clipPath>
            </defs>

            {/* Dark Base Outline */}
            <path
              d="M -1 9 Q -1 -1 12 -1 L 238 -1 Q 251 -1 251 9 L 229 49 Q 225 54 216 54 L 34 54 Q 25 54 21 49 Z"
              fill="#0369a1"
            />

            {/* Clip Body */}
            <g clipPath="url(#levelClipBodyLarge)">
              <path
                d="M 0 10 Q 0 0 12 0 L 238 0 Q 250 0 250 10 L 228 48 Q 224 52 216 52 L 34 52 Q 26 52 22 48 Z"
                fill="url(#levelClipGradLarge)"
              />
              <rect x="0" y="0" width="250" height="4" fill="rgba(255, 255, 255, 0.6)" />
              <rect x="0" y="47" width="250" height="5" fill="#075985" />
              <polygon points="152,52 180,0 190,0 162,52" fill="rgba(255, 255, 255, 0.25)" />
              <polygon points="178,52 206,0 220,0 192,52" fill="rgba(255, 255, 255, 0.42)" />
            </g>

            {/* Header Text */}
            <text
              x="125"
              y="33"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="900"
              fontSize="20"
              fill="#ffffff"
              textAnchor="middle"
              letterSpacing="0.05em"
              style={{ filter: 'drop-shadow(0 2.5px 0 #0284c7) drop-shadow(0 3px 3px rgba(0,0,0,0.35))' }}
            >
              {t('select_level')}
            </text>
          </svg>
        </div>

        {/* Circular Red 3D Close Button */}
        <button
          type="button"
          className="level-select-close-circle"
          onClick={handleClose}
          aria-label={t('close')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round">
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>

        {/* Inner Parchment Box */}
        <div className="level-select-parchment-box">
          {/* Chapter Navigation Tabs */}
          <div className="level-select-tabs-row">
            {Array.from({ length: totalChapters }).map((_, cIdx) => {
              const cStart = cIdx * CHAPTER_SIZE + 1;
              const cEnd = Math.min((cIdx + 1) * CHAPTER_SIZE, allLevels.length);
              const isSelected = activeChapter === cIdx;

              return (
                <button
                  key={cIdx}
                  type="button"
                  className={`level-select-nav-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => handleChapterClick(cIdx)}
                >
                  <span>{cStart} – {cEnd}</span>
                </button>
              );
            })}
          </div>

          {/* Locked Notice Banner */}
          {lockedNotice && (
            <div className="level-select-locked-popup">
              {lockedNotice}
            </div>
          )}

          {/* 5x5 Level Cards Grid */}
          <div className="level-select-cards-grid">
            {chapterLevels.map((lvl, localIdx) => {
              const globalIdx = startIdx + localIdx;
              const isUnlocked = globalIdx <= unlockedIndex;
              const isCurrent = globalIdx === currentLevelIndex;
              const theme = getWallTheme(lvl.wallTheme || lvl.terrains?.[0]?.theme);

              return (
                <button
                  key={lvl.id || globalIdx}
                  type="button"
                  className={`level-card-button ${isUnlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}`}
                  style={
                    isUnlocked
                      ? {
                          backgroundColor: theme.brickMortar,
                          borderColor: isCurrent ? '#f59e0b' : theme.brickBorder,
                          boxShadow: isCurrent
                            ? '0 0 0 3.5px #f59e0b, 0 4px 0 #78350f, 0 8px 16px rgba(245, 158, 11, 0.45)'
                            : `0 4px 0 ${theme.brickBorder}, 0 6px 12px rgba(0, 0, 0, 0.25)`
                        }
                      : undefined
                  }
                  onClick={() => handleLevelClick(globalIdx)}
                >
                  {isUnlocked ? (
                    <>
                      {/* Dynamic In-Game Road Cap */}
                      <div
                        className="level-card-top-cap"
                        style={{ backgroundColor: theme.roadCap }}
                      />

                      {/* Dynamic 2D Running-Bond Brick Wall matching renderBrickTerrain in-game */}
                      <svg
                        className="level-card-brick-svg"
                        viewBox="0 0 100 80"
                        preserveAspectRatio="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        {/* Row 1 */}
                        <rect x="2" y="5" width="46" height="21" rx="2" fill={theme.brickBase} stroke={theme.brickBorder} strokeWidth="1" />
                        <line x1="3" y1="6" x2="47" y2="6" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
                        <line x1="3" y1="6" x2="3" y2="25" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
                        <line x1="3" y1="25.5" x2="47" y2="25.5" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />
                        <line x1="47.5" y1="6" x2="47.5" y2="25.5" stroke="rgba(0,0,0,0.45)" strokeWidth="1.5" />

                        <rect x="52" y="5" width="46" height="21" rx="2" fill={theme.brickBase} stroke={theme.brickBorder} strokeWidth="1" />
                        <line x1="53" y1="6" x2="97" y2="6" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
                        <line x1="53" y1="6" x2="53" y2="25" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
                        <line x1="53" y1="25.5" x2="97" y2="25.5" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />
                        <line x1="97.5" y1="6" x2="97.5" y2="25.5" stroke="rgba(0,0,0,0.45)" strokeWidth="1.5" />

                        {/* Row 2 (Staggered) */}
                        <rect x="2" y="30" width="21" height="21" rx="2" fill={theme.brickBase} stroke={theme.brickBorder} strokeWidth="1" />
                        <line x1="3" y1="31" x2="22" y2="31" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
                        <line x1="3" y1="31" x2="3" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
                        <line x1="3" y1="50.5" x2="22" y2="50.5" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />
                        <line x1="22.5" y1="31" x2="22.5" y2="50.5" stroke="rgba(0,0,0,0.45)" strokeWidth="1.5" />

                        <rect x="27" y="30" width="46" height="21" rx="2" fill={theme.brickBase} stroke={theme.brickBorder} strokeWidth="1" />
                        <line x1="28" y1="31" x2="72" y2="31" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
                        <line x1="28" y1="31" x2="28" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
                        <line x1="28" y1="50.5" x2="72" y2="50.5" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />
                        <line x1="72.5" y1="31" x2="72.5" y2="50.5" stroke="rgba(0,0,0,0.45)" strokeWidth="1.5" />

                        <rect x="77" y="30" width="21" height="21" rx="2" fill={theme.brickBase} stroke={theme.brickBorder} strokeWidth="1" />
                        <line x1="78" y1="31" x2="97" y2="31" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
                        <line x1="78" y1="31" x2="78" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
                        <line x1="78" y1="50.5" x2="97" y2="50.5" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />
                        <line x1="97.5" y1="31" x2="97.5" y2="50.5" stroke="rgba(0,0,0,0.45)" strokeWidth="1.5" />

                        {/* Row 3 */}
                        <rect x="2" y="55" width="46" height="22" rx="2" fill={theme.brickBase} stroke={theme.brickBorder} strokeWidth="1" />
                        <line x1="3" y1="56" x2="47" y2="56" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
                        <line x1="3" y1="56" x2="3" y2="76" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
                        <line x1="3" y1="76.5" x2="47" y2="76.5" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />
                        <line x1="47.5" y1="56" x2="47.5" y2="76.5" stroke="rgba(0,0,0,0.45)" strokeWidth="1.5" />

                        <rect x="52" y="55" width="46" height="22" rx="2" fill={theme.brickBase} stroke={theme.brickBorder} strokeWidth="1" />
                        <line x1="53" y1="56" x2="97" y2="56" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
                        <line x1="53" y1="56" x2="53" y2="76" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" />
                        <line x1="53" y1="76.5" x2="97" y2="76.5" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" />
                        <line x1="97.5" y1="56" x2="97.5" y2="76.5" stroke="rgba(0,0,0,0.45)" strokeWidth="1.5" />
                      </svg>

                      {/* Large Bold Level Number */}
                      <span className="level-card-bold-number">{globalIdx + 1}</span>
                    </>
                  ) : (
                    /* Premium Metallic Locked Vault Tile */
                    <div className="level-card-locked-inner">
                      <div className="level-card-lock-sheen" />
                      <svg
                        className="level-card-lock-icon"
                        viewBox="0 0 24 24"
                        width="30"
                        height="30"
                        fill="none"
                      >
                        {/* Shackle */}
                        <path
                          d="M7 10V7a5 5 0 0 1 10 0v3"
                          stroke="#cbd5e1"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                        />
                        {/* Body with Gold Metallic Gradient */}
                        <rect
                          x="3.5"
                          y="10"
                          width="17"
                          height="11.5"
                          rx="2.5"
                          fill="url(#goldLockGrad)"
                          stroke="#78350f"
                          strokeWidth="1.5"
                        />
                        {/* Keyhole */}
                        <circle cx="12" cy="14.5" r="1.4" fill="#451a03" />
                        <path d="M11.3 15.5 L12.7 15.5 L12.3 18.5 L11.7 18.5 Z" fill="#451a03" />
                        <defs>
                          <linearGradient id="goldLockGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fef08a" />
                            <stop offset="50%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#b45309" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
