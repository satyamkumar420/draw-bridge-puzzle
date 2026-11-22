import type React from 'react';
import { useEffect } from 'react';
import { useI18n } from '../../i18n';
import type { LanguageCode } from '../../i18n/types';
import { audio } from '../../services/audioService';
import { Check } from 'lucide-react';

export interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLanguageSelected?: (lang: LanguageCode) => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({
  isOpen,
  onClose,
  onLanguageSelected
}) => {
  const { language, setLanguage, languages, t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (code: LanguageCode) => {
    audio.playPop();
    setLanguage(code);
    onLanguageSelected?.(code);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="setting-modal-card language-modal-card"
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
              <linearGradient id="langClipGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <clipPath id="langClipBody">
                <path d="M 0 10 Q 0 0 12 0 L 218 0 Q 230 0 230 10 L 210 46 Q 206 50 200 50 L 30 50 Q 24 50 20 46 Z" />
              </clipPath>
            </defs>

            {/* Dark Cyan Clip Base Outline */}
            <path
              d="M -1 9 Q -1 -1 12 -1 L 218 -1 Q 231 -1 231 9 L 211 47 Q 207 52 200 52 L 30 52 Q 23 52 19 47 Z"
              fill="#0369a1"
            />

            {/* Clip Main Face */}
            <g clipPath="url(#langClipBody)">
              <path
                d="M 0 10 Q 0 0 12 0 L 218 0 Q 230 0 230 10 L 210 46 Q 206 50 200 50 L 30 50 Q 24 50 20 46 Z"
                fill="url(#langClipGrad)"
              />

              {/* Top Bevel Highlight Rim */}
              <rect x="0" y="0" width="230" height="3.5" fill="rgba(255, 255, 255, 0.55)" />

              {/* Bottom 3D Dark Bevel */}
              <rect x="0" y="45" width="230" height="5" fill="#075985" />

              {/* Diagonal Glass Sheen Reflections */}
              <polygon points="142,50 168,0 178,0 152,50" fill="rgba(255, 255, 255, 0.22)" />
              <polygon points="166,50 192,0 206,0 180,50" fill="rgba(255, 255, 255, 0.40)" />
            </g>

            {/* Bold Cartoon Font Header */}
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
              {t('language')}
            </text>
          </svg>
        </div>

        {/* Circular Red Close Button on Top Right */}
        <button
          type="button"
          className="setting-close-circle"
          onClick={onClose}
          aria-label={t('close')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round">
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>

        {/* Inner Parchment Panel with 21 Languages Grid */}
        <div className="setting-inner-box language-inner-box">
          <div className="language-grid-scroll">
            <div className="language-grid">
              {languages.map((langItem) => {
                const isSelected = langItem.code === language;

                return (
                  <button
                    key={langItem.code}
                    type="button"
                    className={`lang-card-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(langItem.code)}
                  >
                    <div className="lang-card-content">
                      <span className="lang-native-text">{langItem.nativeName}</span>
                      {langItem.name !== langItem.nativeName && (
                        <span className="lang-english-text">{langItem.name}</span>
                      )}
                    </div>

                    {isSelected && (
                      <div className="lang-active-check">
                        <Check size={14} strokeWidth={3.5} color="#ffffff" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
