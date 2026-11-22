import type React from 'react';
import { useEffect } from 'react';
import { GameButton2D } from './GameButton2D';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../i18n';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  levelName: string;
  title?: string;
  message?: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  levelName,
  title,
  message,
  onClose,
  onConfirm,
  confirmText,
  cancelText
}) => {
  const { t } = useI18n();
  const modalTitle = title || t('delete_level');
  const modalMessage = message || t('delete_confirm_msg');
  const modalConfirmText = confirmText || t('delete');
  const modalCancelText = cancelText || t('cancel');

  // Handle ESC key to dismiss modal
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="setting-modal-card"
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
              <linearGradient id="deleteClipGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
              <clipPath id="deleteClipBody">
                <path d="M 0 10 Q 0 0 12 0 L 218 0 Q 230 0 230 10 L 210 46 Q 206 50 200 50 L 30 50 Q 24 50 20 46 Z" />
              </clipPath>
            </defs>

            {/* Dark Red Base Outline */}
            <path
              d="M -1 9 Q -1 -1 12 -1 L 218 -1 Q 231 -1 231 9 L 211 47 Q 207 52 200 52 L 30 52 Q 23 52 19 47 Z"
              fill="#991b1b"
            />

            {/* Clip Main Face */}
            <g clipPath="url(#deleteClipBody)">
              <path
                d="M 0 10 Q 0 0 12 0 L 218 0 Q 230 0 230 10 L 210 46 Q 206 50 200 50 L 30 50 Q 24 50 20 46 Z"
                fill="url(#deleteClipGrad)"
              />

              {/* Top Bevel Highlight Rim */}
              <rect x="0" y="0" width="230" height="3.5" fill="rgba(255, 255, 255, 0.55)" />

              {/* Bottom 3D Dark Bevel */}
              <rect x="0" y="45" width="230" height="5" fill="#7f1d1d" />

              {/* Diagonal Glass Sheen Reflections */}
              <polygon points="142,50 168,0 178,0 152,50" fill="rgba(255, 255, 255, 0.22)" />
              <polygon points="166,50 192,0 206,0 180,50" fill="rgba(255, 255, 255, 0.40)" />
            </g>

            {/* Bold Cartoon Font */}
            <text
              x="115"
              y="32"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="900"
              fontSize="21"
              fill="#ffffff"
              textAnchor="middle"
              letterSpacing="0.06em"
              style={{ filter: 'drop-shadow(0 2.5px 0 #991b1b) drop-shadow(0 3px 3px rgba(0,0,0,0.35))' }}
            >
              {modalTitle}
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

        {/* Inner Warm Parchment Panel */}
        <div className="setting-inner-box delete-inner-box">
          <div className="delete-modal-icon-badge">
            <AlertTriangle size={30} strokeWidth={2.5} />
          </div>

          <div className="delete-modal-level-badge" title={levelName}>
            <span className="delete-modal-level-name">"{levelName}"</span>
          </div>

          <p className="delete-modal-message">{modalMessage}</p>

          <div className="delete-modal-btn-row">
            <GameButton2D
              variant="gray"
              size="md"
              onClick={onClose}
              style={{ minWidth: '105px' }}
            >
              {modalCancelText}
            </GameButton2D>

            <GameButton2D
              variant="red"
              size="md"
              icon={<Trash2 size={16} />}
              onClick={() => {
                onConfirm();
                onClose();
              }}
              style={{ minWidth: '115px' }}
            >
              {modalConfirmText}
            </GameButton2D>
          </div>
        </div>
      </div>
    </div>
  );
};
