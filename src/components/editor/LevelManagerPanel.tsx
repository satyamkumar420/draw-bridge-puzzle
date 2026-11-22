import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { LevelData } from '../../types/level';
import { ArcadeButton } from '../common/ArcadeButton';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { Plus, Play, Trash2, CheckCircle2, Layers } from 'lucide-react';
import { useI18n } from '../../i18n';

export interface LevelManagerPanelProps {
  levels: LevelData[];
  temporaryLevel?: LevelData;
  currentLevelId: string;
  onSelectLevel: (level: LevelData) => void;
  onNewLevel: () => void;
  onSaveLevel: () => void;
  onPlayLevel: (level?: LevelData) => void;
  onDeleteLevel: (levelId: string) => void;
  isDirty?: boolean;
}

export const LevelManagerPanel: React.FC<LevelManagerPanelProps> = ({
  levels,
  temporaryLevel,
  currentLevelId,
  onSelectLevel,
  onNewLevel,
  onSaveLevel,
  onPlayLevel,
  onDeleteLevel,
  isDirty = false
}) => {
  const { t } = useI18n();
  const [deletingLevel, setDeletingLevel] = useState<LevelData | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  const bundledLevels = levels.filter((level) => level.id.startsWith('level-'));
  const visibleLevels = temporaryLevel && !levels.some((level) => level.id === temporaryLevel.id)
    ? [...levels, temporaryLevel]
    : levels;

  // Active level calculation
  const activeIndex = visibleLevels.findIndex((lvl) => lvl.id === currentLevelId);
  const activeLevel = activeIndex !== -1 ? visibleLevels[activeIndex] : visibleLevels[0];

  const activeIsBundled = activeLevel ? bundledLevels.some((level) => level.id === activeLevel.id) : false;
  const activeIsTemporary = activeLevel ? temporaryLevel?.id === activeLevel.id && !activeIsBundled : false;
  const activeIsDefault = activeLevel
    ? (!activeLevel.name || /^Level\s+\d+$/i.test(activeLevel.name.trim()) || /^level[_-]?\d+$/i.test(activeLevel.name.trim()))
    : false;
  const activeNameDisplay = activeLevel
    ? (activeIsDefault ? t('level_n', { n: (activeIndex >= 0 ? activeIndex : 0) + 1 }) : activeLevel.name)
    : '';

  // Auto-scroll the list to active item
  const handleScrollToActive = useCallback(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, []);

  useEffect(() => {
    handleScrollToActive();
  }, [currentLevelId, handleScrollToActive]);

  const handleSaveClick = () => {
    onSaveLevel();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  return (
    <div className="level-manager-panel">
      <div className="lm-header">
        <div className="lm-title-wrap">
          <Layers size={16} className="lm-icon" />
          <span className="lm-title">{t('levels')} ({visibleLevels.length})</span>
        </div>
      </div>

      {/* Pinned Active Level Section at the Top */}
      {activeLevel && (
        <div className="lm-active-pin-section">
          <div className="lm-active-pin-header">
            <div className="lm-active-title-group">
              <span className="lm-pulse-dot" />
              <span className="lm-active-label">{t('active_level') || 'ACTIVE LEVEL'}</span>
            </div>
            <span className="lm-active-status-badge">{t('editing') || 'EDITING'}</span>
          </div>

          <div
            className="lm-level-card lm-active-card selected"
            onClick={handleScrollToActive}
            title={t('active_level_hint') || 'Active Level in Editor'}
          >
            <div className="lm-level-info">
              <div className="lm-card-top">
                <span className="lm-level-number">#{activeIndex >= 0 ? activeIndex + 1 : 1}</span>
                {activeIsBundled && <span className="lm-badge badge-default">{t('default_badge')}</span>}
                {!activeIsBundled && !activeIsTemporary && <span className="lm-badge badge-custom">{t('custom_badge')}</span>}
                {activeIsTemporary && <span className="lm-badge badge-custom">{t('draft') || 'DRAFT'}</span>}
                {isDirty && <span className="lm-dirty-indicator" title={t('unsaved_changes') || 'Unsaved changes'}>• {t('modified') || 'Modified'}</span>}
              </div>
              <div className="lm-level-name" title={activeNameDisplay}>
                {activeNameDisplay}
              </div>
              <div className="lm-level-meta">
                <span>{activeLevel.terrains.length} {t('walls')}</span>
                <span>•</span>
                <span>{activeLevel.hazards.length} {t('hazards')}</span>
              </div>
            </div>

            <div className="lm-card-actions">
              <button
                type="button"
                className="lm-card-play-btn"
                title={`${t('play_game')}: ${activeLevel.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayLevel(activeLevel);
                }}
              >
                <Play size={13} fill="currentColor" />
              </button>
              {!activeIsBundled && !activeIsTemporary && (
                <button
                  type="button"
                  className="lm-delete-btn"
                  title={t('delete_level')}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingLevel(activeLevel);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All Levels List Header */}
      <div className="lm-all-header">
        <span className="lm-all-title">{t('all_levels')} ({visibleLevels.length})</span>
        <button
          type="button"
          className="lm-locate-btn"
          onClick={handleScrollToActive}
          title={t('locate_active') || 'Scroll to active level in list'}
        >
          {t('locate') || 'Locate'} #{activeIndex >= 0 ? activeIndex + 1 : 1}
        </button>
      </div>

      {/* Scrollable list of all levels */}
      <div className="lm-level-list">
        {visibleLevels.map((lvl, index) => {
          const isSelected = lvl.id === currentLevelId;
          const isBundled = bundledLevels.some((level) => level.id === lvl.id);
          const isTemporary = temporaryLevel?.id === lvl.id && !isBundled;

          const isDefault = !lvl.name || /^Level\s+\d+$/i.test(lvl.name.trim()) || /^level[_-]?\d+$/i.test(lvl.name.trim());
          const nameDisplay = isDefault ? t('level_n', { n: index + 1 }) : lvl.name;

          return (
            <div
              key={lvl.id}
              ref={isSelected ? activeItemRef : null}
              className={`lm-level-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectLevel(lvl)}
            >
              <div className="lm-level-info">
                <div className="lm-card-top">
                  <span className="lm-level-number">#{index + 1}</span>
                  {isBundled && <span className="lm-badge badge-default">{t('default_badge')}</span>}
                  {!isBundled && !isTemporary && <span className="lm-badge badge-custom">{t('custom_badge')}</span>}
                </div>
                <div className="lm-level-name" title={nameDisplay}>
                  {nameDisplay}
                </div>
                <div className="lm-level-meta">
                  <span>{lvl.terrains.length} {t('walls')}</span>
                  <span>•</span>
                  <span>{lvl.hazards.length} {t('hazards')}</span>
                </div>
              </div>

              <div className="lm-card-actions">
                <button
                  type="button"
                  className="lm-card-play-btn"
                  title={`${t('play_game')}: ${lvl.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayLevel(lvl);
                  }}
                >
                  <Play size={13} fill="currentColor" />
                </button>
                {!isBundled && !isTemporary && (
                  <button
                    type="button"
                    className="lm-delete-btn"
                    title={t('delete_level')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingLevel(lvl);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="lm-footer">
        <ArcadeButton
          variant={justSaved ? 'green' : 'blue'}
          size="sm"
          icon={<CheckCircle2 size={16} />}
          onClick={handleSaveClick}
          title={t('save_level')}
          fullWidth
        >
          {justSaved ? t('saved') : isDirty ? `${t('save_level')} *` : t('save_level')}
        </ArcadeButton>

        <ArcadeButton
          variant="green"
          size="sm"
          icon={<Plus size={16} />}
          onClick={onNewLevel}
          title={t('new_level')}
          fullWidth
        >
          {t('new_level')}
        </ArcadeButton>
      </div>

      <DeleteConfirmModal
        isOpen={!!deletingLevel}
        levelName={deletingLevel?.name || ''}
        onClose={() => setDeletingLevel(null)}
        onConfirm={() => {
          if (deletingLevel) {
            onDeleteLevel(deletingLevel.id);
            setDeletingLevel(null);
          }
        }}
      />
    </div>
  );
};
