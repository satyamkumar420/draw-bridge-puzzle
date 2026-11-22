import type React from 'react';
import { useState, useEffect } from 'react';
import { GameButton2D } from './GameButton2D';
import { GameSoundOnIcon, GameSoundOffIcon, GameTranslateIcon } from './GameIcons';
import { LanguageModal } from './LanguageModal';
import { safeStorage } from '../../services/storage';
import { audio } from '../../services/audioService';
import { useI18n } from '../../i18n';
import type { LanguageCode } from '../../i18n/types';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLanguage?: () => void;
  onLanguageSelected?: (lang: LanguageCode) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenLanguage,
  onLanguageSelected
}) => {
  const { t } = useI18n();
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return safeStorage.getItem('game_sound_enabled') !== 'false';
  });
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);

  useEffect(() => {
    audio.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="setting-modal-card"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Real 2D Header Clip / Clamp matching Reference Image */}
          <div className="setting-clip-wrap">
            <svg
              className="setting-clip-svg"
              viewBox="0 0 230 52"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="clipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <clipPath id="clipBody">
                  <path d="M 0 10 Q 0 0 12 0 L 218 0 Q 230 0 230 10 L 210 46 Q 206 50 200 50 L 30 50 Q 24 50 20 46 Z" />
                </clipPath>
              </defs>

              {/* Dark Cyan Clip Base Outline */}
              <path
                d="M -1 9 Q -1 -1 12 -1 L 218 -1 Q 231 -1 231 9 L 211 47 Q 207 52 200 52 L 30 52 Q 23 52 19 47 Z"
                fill="#0369a1"
              />

              {/* Clip Main Face */}
              <g clipPath="url(#clipBody)">
                <path
                  d="M 0 10 Q 0 0 12 0 L 218 0 Q 230 0 230 10 L 210 46 Q 206 50 200 50 L 30 50 Q 24 50 20 46 Z"
                  fill="url(#clipGrad)"
                />

                {/* Top Bevel Highlight Rim */}
                <rect x="0" y="0" width="230" height="3.5" fill="rgba(255, 255, 255, 0.55)" />

                {/* Bottom 3D Dark Bevel */}
                <rect x="0" y="45" width="230" height="5" fill="#075985" />

                {/* Diagonal Glass Sheen Reflections */}
                <polygon points="142,50 168,0 178,0 152,50" fill="rgba(255, 255, 255, 0.22)" />
                <polygon points="166,50 192,0 206,0 180,50" fill="rgba(255, 255, 255, 0.40)" />
              </g>

              {/* Translated "SETTING" Bold Cartoon Font */}
              <text
                x="115"
                y="32"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="900"
                fontSize="21"
                fill="#ffffff"
                textAnchor="middle"
                letterSpacing="0.06em"
                style={{ filter: 'drop-shadow(0 2.5px 0 #0284c7) drop-shadow(0 3px 3px rgba(0,0,0,0.35))' }}
              >
                {t('setting')}
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round">
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>

          {/* Inner Warm Parchment Panel */}
          <div className="setting-inner-box">
            <div className="setting-options-row">
              {/* Sound Option Column */}
              <div className="setting-option-col">
                <div className="setting-sound-label">{t('sound')}</div>
                <GameButton2D
                  variant="green"
                  size="xl"
                  className="setting-sound-btn"
                  onClick={() => {
                    audio.playPop();
                    setSoundEnabled(!soundEnabled);
                  }}
                  title={soundEnabled ? t('disable_sound') : t('enable_sound')}
                  icon={
                    soundEnabled ? (
                      <GameSoundOnIcon size={46} className="setting-sound-icon" />
                    ) : (
                      <GameSoundOffIcon size={46} className="setting-sound-icon" />
                    )
                  }
                />
              </div>

              {/* Language Option Column */}
              <div className="setting-option-col">
                <div className="setting-sound-label">{t('language')}</div>
                <GameButton2D
                  variant="green"
                  size="xl"
                  className="setting-sound-btn"
                  onClick={() => {
                    audio.playPop();
                    if (onOpenLanguage) {
                      onOpenLanguage();
                    } else {
                      setIsLanguageModalOpen(true);
                    }
                  }}
                  title={t('select_language')}
                  icon={<GameTranslateIcon size={44} className="setting-sound-icon" />}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Standalone Fallback Language Selection Modal if no external controller */}
      {!onOpenLanguage && isLanguageModalOpen && (
        <LanguageModal
          isOpen={isLanguageModalOpen}
          onClose={() => setIsLanguageModalOpen(false)}
          onLanguageSelected={(lang) => {
            onLanguageSelected?.(lang);
          }}
        />
      )}
    </>
  );
};
