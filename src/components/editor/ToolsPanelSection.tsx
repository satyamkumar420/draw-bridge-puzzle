import type React from 'react';
import type { LevelData, HazardBlock } from '../../types/level';
import type { EditorTool, SelectedObjectRef } from '../../types/editor';
import { OBSTACLE_TOOLS, type ObstacleToolDef } from '../../config/editorTools';
import { ObstacleToolPreviewCanvas } from './ObstacleToolPreviewCanvas';
import { useI18n } from '../../i18n';
import { Wrench, Plus, Check, Move } from 'lucide-react';

export interface ToolsPanelSectionProps {
  level: LevelData;
  onUpdateLevel: (updated: LevelData) => void;
  selectedTerrainId?: string;
  activeTool?: EditorTool;
  onSelectTool?: (tool: EditorTool) => void;
  onSelect?: (ref: SelectedObjectRef | null) => void;
}

export const ToolsPanelSection: React.FC<ToolsPanelSectionProps> = ({
  level,
  onUpdateLevel,
  selectedTerrainId,
  activeTool,
  onSelectTool,
  onSelect
}) => {
  const { t } = useI18n();

  const handleSelectTool = (tool: ObstacleToolDef) => {
    onSelectTool?.(tool.editorTool);
    onSelect?.(null);
  };

  const handlePlaceNearWall = (tool: ObstacleToolDef, e: React.MouseEvent, withMovement = false) => {
    e.stopPropagation();

    // Determine target wall: currently selected wall, or first wall on level
    const targetWall =
      level.terrains.find((t) => t.id === selectedTerrainId) ||
      level.terrains.find((t) => level.spawn.x >= t.x && level.spawn.x <= t.x + t.width) ||
      level.terrains[0];

    let newX = 420;
    let newY = 320;

    if (targetWall) {
      if (
        tool.hazardType === 'chakra' ||
        tool.hazardType === 'laser' ||
        tool.hazardType === 'crusher'
      ) {
        // Place just above the top surface of the wall
        newX = Math.round(targetWall.x + targetWall.width / 2 - tool.defaultWidth / 2);
        newY = Math.max(10, Math.round(targetWall.y - tool.defaultHeight - 8));
      } else if (
        tool.hazardType === 'fire' ||
        tool.hazardType === 'spikes' ||
        tool.hazardType === 'tnt'
      ) {
        // Mount directly flush on top of the wall surface
        newX = Math.round(targetWall.x + targetWall.width / 2 - tool.defaultWidth / 2);
        newY = Math.round(targetWall.y - tool.defaultHeight);
      } else {
        // Water / pit: place adjacent to right wall edge in the gap
        newX = Math.round(targetWall.x + targetWall.width + 12);
        newY = Math.round(targetWall.y + 30);
      }
    }

    const isVertical = tool.hazardType === 'crusher' || tool.hazardType === 'guillotine' || tool.hazardType === 'stalactite';

    const newHazard: HazardBlock = {
      id: `h-${Date.now()}`,
      type: tool.hazardType,
      x: newX,
      y: newY,
      width: tool.defaultWidth,
      height: tool.defaultHeight,
      movement: withMovement
        ? {
            axis: isVertical ? 'vertical' : 'horizontal',
            distance: isVertical ? 60 : 80,
            speed: 2.5,
            phase: 0
          }
        : undefined
    };

    onUpdateLevel({
      ...level,
      hazards: [...level.hazards, newHazard]
    });

    onSelect?.({ type: 'hazard', id: newHazard.id });
    onSelectTool?.('select');
  };

  return (
    <div className="panel-section obstacle-tools-section">
      <div className="sky-theme-header">
        <div className="sky-theme-title-wrap">
          <Wrench size={16} className="sky-theme-icon" />
          <h4 className="section-title sky-section-title">{t('obstacle_traps')}</h4>
        </div>
        <span className="sky-theme-badge">{t('tools_count', { n: OBSTACLE_TOOLS.length })}</span>
      </div>

      <p className="obstacle-tools-hint">
        {t('obstacle_hint')}
      </p>

      <div className="obstacle-tools-grid">
        {OBSTACLE_TOOLS.map((tool) => {
          const isActive = activeTool === tool.editorTool;

          return (
            <div
              key={tool.id}
              className={`obstacle-tool-card ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectTool(tool)}
            >
              {/* Real WYSIWYG Animated Canvas Preview */}
              <div className="obstacle-card-preview">
                <ObstacleToolPreviewCanvas tool={tool} />
                {isActive && (
                  <div className="obstacle-card-active-badge">
                    <Check size={11} strokeWidth={3} />
                    <span>{t('active')}</span>
                  </div>
                )}
              </div>

              {/* Card info */}
              <div className="obstacle-card-info">
                <div className="obstacle-card-top-line">
                  <span className="obstacle-card-name">{tool.name}</span>
                  <span className="obstacle-card-badge" style={{ borderColor: tool.accentColor, color: tool.accentColor }}>
                    {tool.badge}
                  </span>
                </div>

                <p className="obstacle-card-desc">{tool.description}</p>

                <div className="obstacle-card-dim">
                  <span>{t('size_label', { w: tool.defaultWidth, h: tool.defaultHeight })}</span>
                </div>

                {/* 2D Action buttons */}
                <div className="obstacle-card-actions">
                  <button
                    type="button"
                    className={`obstacle-action-btn select-btn ${isActive ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTool(tool);
                    }}
                    title={`Select ${tool.name} to draw anywhere`}
                  >
                    {isActive ? t('active') : t('use_tool')}
                  </button>

                  <button
                    type="button"
                    className="obstacle-action-btn near-wall-btn"
                    onClick={(e) => handlePlaceNearWall(tool, e, false)}
                    title={`Place static ${tool.name} near wall`}
                  >
                    <Plus size={12} strokeWidth={3} />
                    <span>{t('near_wall')}</span>
                  </button>

                  <button
                    type="button"
                    className="obstacle-action-btn motion-wall-btn"
                    onClick={(e) => handlePlaceNearWall(tool, e, true)}
                    title={`Place moving ${tool.name} with patrol`}
                  >
                    <Move size={12} strokeWidth={2.5} />
                    <span>+ Patrol</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
