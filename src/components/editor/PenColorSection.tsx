import type React from 'react';
import type { PenColorId } from '../../types/level';
import { PEN_COLORS, DEFAULT_PEN_COLOR_ID } from '../../config/penColors';
import { useI18n } from '../../i18n';
import { PenTool, Check } from 'lucide-react';

export interface PenColorSectionProps {
  selectedColor?: PenColorId;
  onSelectColor: (colorId: PenColorId) => void;
}

export const PenColorSection: React.FC<PenColorSectionProps> = ({
  selectedColor = DEFAULT_PEN_COLOR_ID,
  onSelectColor
}) => {
  const { t } = useI18n();
  const currentSelected = selectedColor || DEFAULT_PEN_COLOR_ID;

  return (
    <div className="pen-color-section">
      <div className="pen-section-header">
        <div className="pen-section-title-wrap">
          <PenTool size={14} className="pen-section-icon" />
          <h4 className="section-title pen-section-title">{t('drawing_pen_color')}</h4>
        </div>
        <span className="pen-count-badge">{t('colors_count', { n: 6 })}</span>
      </div>

      <p className="pen-section-description">
        {t('select_pen_color_desc')}
      </p>

      <div className="pen-color-grid">
        {Object.values(PEN_COLORS).map((variant) => {
          const isSelected = currentSelected === variant.id;

          return (
            <button
              key={variant.id}
              type="button"
              className={`pen-color-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectColor(variant.id)}
              title={`${variant.name} — ${variant.description}`}
            >
              <div className="pen-card-preview">
                {/* Mini drawing preview line */}
                <svg
                  className="pen-card-svg"
                  viewBox="0 0 60 26"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Subtle faint dotted guide */}
                  <path
                    d="M 6 18 Q 30 6 54 18"
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  {/* Bridge stroke in variant color */}
                  <path
                    d="M 6 18 Q 30 6 54 18"
                    stroke={variant.color}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>

                {isSelected && (
                  <div className="pen-card-active-badge">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
              </div>

              <div className="pen-card-info">
                <span
                  className="pen-dot"
                  style={{
                    backgroundColor: variant.color,
                    border: `1px solid ${variant.border}`
                  }}
                />
                <span className="pen-card-name">{variant.name}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
