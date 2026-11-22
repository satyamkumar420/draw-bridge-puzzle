import type React from 'react';
import { GameCashIcon } from '../common/GameCashIcon';
import { useI18n } from '../../i18n';

export interface CashBadgeProps {
  cash: number;
  isPulsing?: boolean;
  className?: string;
}

export const CashBadge: React.FC<CashBadgeProps> = ({
  cash,
  isPulsing = false,
  className = ''
}) => {
  const { t } = useI18n();

  return (
    <div
      id="top-right-cash-badge"
      className={`cash-hud-badge ${isPulsing ? 'badge-pulse' : ''} ${className}`}
      title={t('your_cash')}
    >
      <GameCashIcon size={32} className="cash-badge-icon" />
      <span className="cash-badge-value">{cash}</span>
    </div>
  );
};
