import type React from 'react';
import { Gamepad2, Hammer, Settings } from 'lucide-react';
import { ArcadeButton } from './ArcadeButton';
import { useI18n } from '../../i18n';
import { audio } from '../../services/audioService';

export interface HeaderProps {
  mode: 'play' | 'editor';
  onModeChange: (mode: 'play' | 'editor') => void;
  onOpenSettings: () => void;
  currentLevelTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onModeChange,
  onOpenSettings,
  currentLevelTitle
}) => {
  const { t } = useI18n();

  const handleModeChange = (newMode: 'play' | 'editor') => {
    audio.playPop();
    onModeChange(newMode);
  };

  const handleSettingsClick = () => {
    audio.playPop();
    onOpenSettings();
  };

  return (
    <header className="game-header">
      <div className="header-left">
        <div className="logo-badge">
          <span className="logo-icon">🌉</span>
          <span className="logo-text">{t('draw_bridge')}</span>
        </div>
        <span className="current-level-pill">{currentLevelTitle}</span>
      </div>

      <div className="header-center">
        <div className="mode-toggle-group">
          <button
            className={`mode-toggle-btn ${mode === 'play' ? 'active' : ''}`}
            onClick={() => handleModeChange('play')}
          >
            <Gamepad2 size={18} />
            <span>{t('play_game')}</span>
          </button>
          <button
            className={`mode-toggle-btn ${mode === 'editor' ? 'active' : ''}`}
            onClick={() => handleModeChange('editor')}
          >
            <Hammer size={18} />
            <span>{t('level_editor')}</span>
          </button>
        </div>
      </div>

      <div className="header-right">
        <ArcadeButton
          variant="gray"
          size="sm"
          icon={<Settings size={18} />}
          onClick={handleSettingsClick}
          title={t('settings')}
        />
      </div>
    </header>
  );
};
