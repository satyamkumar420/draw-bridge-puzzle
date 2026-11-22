import type React from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../../i18n';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  headerColor?: 'blue' | 'yellow' | 'green';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  headerColor = 'blue'
}) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  const headerBg =
    headerColor === 'blue'
      ? 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)'
      : headerColor === 'green'
      ? 'linear-gradient(180deg, #4ade80 0%, #16a34a 100%)'
      : 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)';

  return (
    <div className="modal-backdrop">
      <div className="cartoon-modal-card">
        <div className="cartoon-modal-tab" style={{ background: headerBg }}>
          <span className="modal-tab-text">{title}</span>
        </div>

        <button className="cartoon-close-btn" onClick={onClose} aria-label={t('close')}>
          <X size={18} strokeWidth={3} />
        </button>

        <div className="cartoon-modal-body">{children}</div>
      </div>
    </div>
  );
};
