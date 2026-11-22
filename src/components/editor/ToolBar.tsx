import type React from 'react';
import {
  ArrowLeft,
  MousePointer,
  Square,
  Car,
  Flag,
  Grid,
  Trash2,
  Undo2,
  Redo2,
  Layers,
  SlidersHorizontal,
  Palette,
  Wrench
} from 'lucide-react';
import type { EditorTool } from '../../types/editor';
import { useI18n } from '../../i18n';

export interface ToolBarProps {
  onBack?: () => void;
  activeTool: EditorTool;
  onSelectTool: (tool: EditorTool) => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  hasSelection: boolean;
  onDeleteSelected: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showLeftPanel?: boolean;
  onToggleLeftPanel?: () => void;
  showRightPanel?: boolean;
  onToggleRightPanel?: () => void;
}

export const ToolBar: React.FC<ToolBarProps> = ({
  onBack,
  activeTool,
  onSelectTool,
  snapToGrid,
  onToggleSnap,
  hasSelection,
  onDeleteSelected,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showLeftPanel = true,
  onToggleLeftPanel,
  showRightPanel = true,
  onToggleRightPanel
}) => {
  const { t } = useI18n();

  return (
    <div className="editor-toolbar">
      {/* Left: Back button & object creation tools */}
      <div className="toolbar-section toolbar-left-section">
        {onBack && (
          <button
            type="button"
            className="editor-back-btn"
            onClick={onBack}
            title={t('back_to_game')}
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <div className="tool-btn-group">
          <button
            type="button"
            className={`editor-tool-btn ${activeTool === 'select' ? 'active' : ''}`}
            onClick={() => onSelectTool('select')}
            title={t('select')}
          >
            <MousePointer size={18} />
            <span className="tool-btn-text">{t('select')}</span>
          </button>

          <button
            type="button"
            className={`editor-tool-btn ${activeTool === 'terrain' ? 'active' : ''}`}
            onClick={() => onSelectTool('terrain')}
            title={t('brick_wall')}
          >
            <Square size={18} />
            <span className="tool-btn-text">{t('brick_wall')}</span>
          </button>

          <button
            type="button"
            className={`editor-tool-btn ${activeTool === 'tools' || activeTool.startsWith('hazard-') ? 'active' : ''}`}
            onClick={() => onSelectTool('tools')}
            title={t('tools')}
          >
            <Wrench size={18} />
            <span className="tool-btn-text">{t('tools')}</span>
          </button>

          <button
            type="button"
            className={`editor-tool-btn ${activeTool === 'spawn' ? 'active' : ''}`}
            onClick={() => onSelectTool('spawn')}
            title={t('car_spawn')}
          >
            <Car size={18} />
            <span className="tool-btn-text">{t('car_spawn')}</span>
          </button>

          <button
            type="button"
            className={`editor-tool-btn ${activeTool === 'goal' ? 'active' : ''}`}
            onClick={() => onSelectTool('goal')}
            title={t('goal_flag')}
          >
            <Flag size={18} />
            <span className="tool-btn-text">{t('goal_flag')}</span>
          </button>

          <button
            type="button"
            className={`editor-tool-btn ${activeTool === 'background' ? 'active' : ''}`}
            onClick={() => onSelectTool('background')}
            title={t('sky_bg')}
          >
            <Palette size={18} />
            <span className="tool-btn-text">{t('sky_bg')}</span>
          </button>
        </div>
      </div>

      {/* Right: History, Snapping, Delete & Sidebar Toggles */}
      <div className="toolbar-section toolbar-right-section">
        <div className="tool-btn-group">
          <button
            type="button"
            className="editor-tool-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title={`${t('undo')} (Ctrl + Z)`}
          >
            <Undo2 size={18} />
            <span className="tool-btn-text">{t('undo')}</span>
          </button>

          <button
            type="button"
            className="editor-tool-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title={`${t('redo')} (Ctrl + Y)`}
          >
            <Redo2 size={18} />
            <span className="tool-btn-text">{t('redo')}</span>
          </button>

          <button
            type="button"
            className={`editor-tool-btn ${snapToGrid ? 'active-toggle' : ''}`}
            onClick={onToggleSnap}
            title={snapToGrid ? t('snap_on') : t('snap_off')}
          >
            <Grid size={18} />
            <span className="tool-btn-text">{snapToGrid ? t('snap_on') : t('snap_off')}</span>
          </button>

          <button
            type="button"
            className="editor-tool-btn btn-danger"
            onClick={onDeleteSelected}
            disabled={!hasSelection}
            title={t('delete')}
          >
            <Trash2 size={18} />
            <span className="tool-btn-text">{t('delete')}</span>
          </button>
        </div>

        {/* Responsive Side Panel Toggle Buttons */}
        {(onToggleLeftPanel || onToggleRightPanel) && (
          <div className="tool-btn-group panel-toggle-group">
            {onToggleLeftPanel && (
              <button
                type="button"
                className={`editor-tool-btn panel-toggle-btn ${showLeftPanel ? 'active-panel-btn' : ''}`}
                onClick={onToggleLeftPanel}
                title={t('levels')}
              >
                <Layers size={17} />
                <span className="tool-btn-text">{t('levels')}</span>
              </button>
            )}

            {onToggleRightPanel && (
              <button
                type="button"
                className={`editor-tool-btn panel-toggle-btn ${showRightPanel ? 'active-panel-btn' : ''}`}
                onClick={onToggleRightPanel}
                title={t('props')}
              >
                <SlidersHorizontal size={17} />
                <span className="tool-btn-text">{t('props')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
