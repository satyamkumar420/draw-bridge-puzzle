import type React from 'react';
import { GameButton2D } from '../common/GameButton2D';
import { GameSettingsIcon, GameResetIcon } from '../common/GameIcons';
import { StoreBuildingIcon } from '../common/StoreBuildingIcon';
import { isLevelEditorEnabled } from '../../config/constants';
import { useI18n } from '../../i18n';
import { audio } from '../../services/audioService';

export interface GameHUDProps {
  levelIndex: number;
  levelName?: string;
  onReset: () => void;
  onOpenSettings?: () => void;
  onOpenStore?: () => void;
  onOpenEditor?: () => void;
  onOpenLevelSelect?: () => void;
  isActionActive?: boolean;
  showEditor?: boolean;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  levelIndex,
  levelName,
  onReset,
  onOpenSettings,
  onOpenStore,
  onOpenEditor,
  onOpenLevelSelect,
  isActionActive = false,
  showEditor
}) => {
  const { t } = useI18n();

  // Developer control: shows editor if enabled via config flag, URL param, or prop
  const isEditorVisible = (showEditor ?? isLevelEditorEnabled()) && Boolean(onOpenEditor);

  // If levelName is default (e.g. "Level 1", "level_1", or empty), localize it dynamically with t('level_n')
  const isDefaultLevelName =
    !levelName ||
    /^Level\s+\d+$/i.test(levelName.trim()) ||
    /^level[_-]?\d+$/i.test(levelName.trim());

  const displayTitle = isDefaultLevelName
    ? t('level_n', { n: levelIndex + 1 })
    : levelName.toUpperCase();

  const handleSettingsClick = () => {
    audio.playPop();
    onOpenSettings?.();
  };

  const handleLevelSelectClick = () => {
    audio.playPop();
    onOpenLevelSelect?.();
  };

  const handleResetClick = () => {
    audio.playPop();
    onReset();
  };

  const handleStoreClick = () => {
    audio.playPop();
    onOpenStore?.();
  };

  const handleEditorClick = () => {
    audio.playPop();
    onOpenEditor?.();
  };

  return (
    <div className="playable-hud">
      {/* Top Left Settings, Levels Map & Editor Buttons (Hides when drawing or driving) */}
      <div className={`playable-top-left ${isActionActive ? 'hud-hidden' : ''}`}>
        <GameButton2D
          variant="green"
          size="lg"
          radius={10}
          icon={<GameSettingsIcon size={30} />}
          onClick={handleSettingsClick}
          title={t('settings')}
        />
        {onOpenLevelSelect && (
          <GameButton2D
            variant="yellow"
            size="lg"
            radius={10}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
            }
            onClick={handleLevelSelectClick}
            title={t('select_level')}
          />
        )}
        {/* Developer Editable Feature Toggle (Default: false) */}
        {isEditorVisible && (
          <GameButton2D
            variant="blue"
            size="lg"
            radius={10}
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            }
            onClick={handleEditorClick}
            title={t('open_level_editor')}
          />
        )}
      </div>

      {/* Top Center Level Title (Clickable to open Level Selection Modal) */}
      <div
        className={`playable-level-title ${onOpenLevelSelect ? 'clickable-title' : ''}`}
        onClick={onOpenLevelSelect ? handleLevelSelectClick : undefined}
        title={onOpenLevelSelect ? t('select_level') : undefined}
      >
        <span>{displayTitle}</span>
        {onOpenLevelSelect && (
          <span className="level-title-icon">▼</span>
        )}
      </div>

      {/* Top Right Container: Reset Button & Store Building Icon */}
      <div className="playable-top-right">
        {/* Reset / Reload Button (always visible so user can restart anytime) */}
        <GameButton2D
          variant="green"
          size="lg"
          radius={10}
          icon={<GameResetIcon size={30} strokeWidth={3.5} />}
          onClick={handleResetClick}
          title={t('reset_level')}
        />

        {/* Store Icon (Hides when drawing or driving) */}
        <div className={`playable-store-wrap ${isActionActive ? 'hud-hidden' : ''}`}>
          <StoreBuildingIcon onClick={handleStoreClick} />
        </div>
      </div>
    </div>
  );
};
