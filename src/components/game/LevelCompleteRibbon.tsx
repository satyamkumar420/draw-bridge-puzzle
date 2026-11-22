import type React from 'react';
import { useI18n } from '../../i18n';

export interface LevelCompleteRibbonProps {
  className?: string;
  text?: string;
}

export const LevelCompleteRibbon: React.FC<LevelCompleteRibbonProps> = ({
  className = '',
  text
}) => {
  const { t } = useI18n();
  const ribbonText = text || t('level_complete');

  return (
    <div className={`level-complete-ribbon-wrap ${className}`}>
      <img
        src="./assets/level_complete.png"
        onError={(e) => {
          const img = e.currentTarget;
          if (!img.dataset.failed) {
            img.dataset.failed = 'true';
            img.src = '/assets/level_complete.png';
          }
        }}
        alt={ribbonText}
        className="level-complete-ribbon-img"
        draggable={false}
      />
      <svg
        viewBox="0 0 2172 724"
        className="level-complete-ribbon-svg-overlay"
        aria-hidden="true"
      >
        <defs>
          <path id="ribbonTextCurve" d="M 400,375 Q 1086,245 1772,375" />
        </defs>
        <text className="level-complete-curved-text">
          <textPath href="#ribbonTextCurve" startOffset="50%" textAnchor="middle">
            {ribbonText}
          </textPath>
        </text>
      </svg>
    </div>
  );
};
