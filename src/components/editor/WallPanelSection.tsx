import type React from 'react';
import { useState } from 'react';
import type { LevelData, TerrainBlock, WallTheme } from '../../types/level';
import type { EditorTool, SelectedObjectRef } from '../../types/editor';
import { WALL_THEMES, getWallTheme } from '../../graphics/brickRenderer';
import { useI18n } from '../../i18n';
import { Square, Plus, Check, Trash2 } from 'lucide-react';

export interface WallPanelSectionProps {
  level: LevelData;
  onUpdateLevel: (updated: LevelData) => void;
  selectedTerrain?: TerrainBlock | null;
  onSelectTool?: (tool: EditorTool) => void;
  onSelect?: (ref: SelectedObjectRef | null) => void;
}

export const WallPanelSection: React.FC<WallPanelSectionProps> = ({
  level,
  onUpdateLevel,
  selectedTerrain,
  onSelectTool,
  onSelect
}) => {
  const { t } = useI18n();

  const resolveValidTheme = (themeKey?: string): WallTheme => {
    if (themeKey && (themeKey as WallTheme) in WALL_THEMES) {
      return themeKey as WallTheme;
    }
    return 'brick-red';
  };

  const activeLevelTheme: WallTheme = resolveValidTheme(
    selectedTerrain?.theme || level.wallTheme || level.terrains[0]?.theme
  );

  const [selectedPalette, setSelectedPalette] = useState<WallTheme | null>(null);
  const [prevTerrainId, setPrevTerrainId] = useState(selectedTerrain?.id);

  if (selectedTerrain?.id !== prevTerrainId) {
    setPrevTerrainId(selectedTerrain?.id);
    setSelectedPalette(null);
  }

  const currentTheme: WallTheme = resolveValidTheme(
    selectedTerrain?.theme || selectedPalette || activeLevelTheme
  );

  const selectedIndex = selectedTerrain
    ? level.terrains.findIndex((t) => t.id === selectedTerrain.id)
    : -1;

  const handleSelectTheme = (themeKey: WallTheme) => {
    setSelectedPalette(themeKey);
    if (selectedTerrain) {
      onUpdateLevel({
        ...level,
        wallTheme: themeKey,
        terrains: level.terrains.map((t) =>
          t.id === selectedTerrain.id ? { ...t, theme: themeKey } : t
        )
      });
    } else if (level.terrains.length > 0) {
      onUpdateLevel({
        ...level,
        wallTheme: themeKey,
        terrains: level.terrains.map((t) => ({ ...t, theme: themeKey }))
      });
    } else {
      onUpdateLevel({
        ...level,
        wallTheme: themeKey
      });
    }
  };

  const handleAddWall = () => {
    const lastWall = level.terrains[level.terrains.length - 1];
    const newX = lastWall ? Math.min(780, Math.round(lastWall.x + lastWall.width + 40)) : 380;
    const newY = lastWall ? Math.round(lastWall.y) : 320;

    const newTerrain: TerrainBlock = {
      id: `t-${Date.now()}`,
      type: 'brick',
      theme: currentTheme,
      x: newX,
      y: newY,
      width: 140,
      height: 80
    };

    onUpdateLevel({
      ...level,
      terrains: [...level.terrains, newTerrain]
    });

    onSelect?.({ type: 'terrain', id: newTerrain.id });
    onSelectTool?.('select');
  };

  const handleDeleteWall = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (level.terrains.length <= 1) return;
    onUpdateLevel({
      ...level,
      terrains: level.terrains.filter((t) => t.id !== id)
    });
    if (selectedTerrain?.id === id) {
      onSelect?.(null);
    }
  };

  return (
    <div className="panel-section wall-panel-section">
      {/* Header */}
      <div className="sky-theme-header">
        <div className="sky-theme-title-wrap">
          <Square size={16} className="sky-theme-icon" />
          <h4 className="section-title sky-section-title">
            {selectedTerrain ? t('wall_n', { n: selectedIndex + 1 }) : t('brick_wall')}
          </h4>
        </div>
        {selectedTerrain ? (
          <button
            type="button"
            className="deselect-link-btn"
            onClick={() => onSelect?.(null)}
            title="Deselect wall"
          >
            {t('clear')}
          </button>
        ) : (
          <span className="sky-theme-badge">{t('variants_count', { n: Object.keys(WALL_THEMES).length })}</span>
        )}
      </div>

      <p className="obstacle-tools-hint" style={{ marginTop: 10, marginBottom: 14 }}>
        {selectedTerrain
          ? t('wall_hint_selected')
          : t('wall_hint_default')}
      </p>

      {/* Wall Color Variants (Rich 2D Arcade Cards) */}
      <div className="theme-selector-section" style={{ borderBottom: 'none', paddingBottom: 0, marginTop: 4 }}>
        <span className="theme-section-title" style={{ marginBottom: 4 }}>{t('wall_palettes')}</span>
        <div className="wall-theme-grid">
          {(Object.keys(WALL_THEMES) as WallTheme[]).map((themeKey) => {
            const theme = getWallTheme(themeKey);
            const isSelected = currentTheme === themeKey;

            return (
              <button
                key={themeKey}
                type="button"
                className={`wall-theme-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectTheme(themeKey)}
                title={`${theme.name} Palette (${theme.tag})`}
              >
                {/* Visual Mini Brick Pattern Preview */}
                <div className="wall-card-preview" style={{ backgroundColor: theme.brickMortar }}>
                  <div className="wall-card-top-cap" style={{ backgroundColor: theme.roadCap }} />
                  <div className="wall-card-brick-row">
                    <div
                      className="wall-card-brick"
                      style={{ backgroundColor: theme.brickBase, borderColor: theme.brickBorder }}
                    />
                    <div
                      className="wall-card-brick"
                      style={{ backgroundColor: theme.brickBase, borderColor: theme.brickBorder }}
                    />
                  </div>
                  <div className="wall-card-brick-row">
                    <div
                      className="wall-card-brick brick-half"
                      style={{ backgroundColor: theme.brickBase, borderColor: theme.brickBorder }}
                    />
                    <div
                      className="wall-card-brick"
                      style={{ backgroundColor: theme.brickBase, borderColor: theme.brickBorder }}
                    />
                    <div
                      className="wall-card-brick brick-half"
                      style={{ backgroundColor: theme.brickBase, borderColor: theme.brickBorder }}
                    />
                  </div>

                  {isSelected && (
                    <div className="wall-card-active-badge">
                      <Check size={9} strokeWidth={3.5} />
                      <span>{t('active')}</span>
                    </div>
                  )}
                </div>

                {/* Card Typography & Meta */}
                <div className="wall-card-info">
                  <span className="wall-card-name">{theme.name}</span>
                  <div className="wall-card-meta">
                    <span className="wall-card-dot" style={{ backgroundColor: theme.brickBase }} />
                    <span className="wall-card-tag">{theme.tag}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Wall Dimensions & Position (Compact 2x2 grid, NO DUPLICATION) */}
      {selectedTerrain && (
        <div className="wall-coords-section" style={{ marginTop: 8 }}>
          <span className="theme-section-title">{t('position_size')}</span>
          <div className="property-grid-2col" style={{ marginTop: 4 }}>
            <label className="prop-row-compact">
              <span>X</span>
              <input
                type="number"
                value={Math.round(selectedTerrain.x)}
                onChange={(e) => {
                  const x = parseFloat(e.target.value) || 0;
                  onUpdateLevel({
                    ...level,
                    terrains: level.terrains.map((t) =>
                      t.id === selectedTerrain.id ? { ...t, x } : t
                    )
                  });
                }}
              />
            </label>
            <label className="prop-row-compact">
              <span>Y</span>
              <input
                type="number"
                value={Math.round(selectedTerrain.y)}
                onChange={(e) => {
                  const y = parseFloat(e.target.value) || 0;
                  onUpdateLevel({
                    ...level,
                    terrains: level.terrains.map((t) =>
                      t.id === selectedTerrain.id ? { ...t, y } : t
                    )
                  });
                }}
              />
            </label>
            <label className="prop-row-compact">
              <span>W</span>
              <input
                type="number"
                value={Math.round(selectedTerrain.width)}
                onChange={(e) => {
                  const width = Math.max(40, parseFloat(e.target.value) || 40);
                  onUpdateLevel({
                    ...level,
                    terrains: level.terrains.map((t) =>
                      t.id === selectedTerrain.id ? { ...t, width } : t
                    )
                  });
                }}
              />
            </label>
            <label className="prop-row-compact">
              <span>H</span>
              <input
                type="number"
                value={Math.round(selectedTerrain.height)}
                onChange={(e) => {
                  const height = Math.max(20, parseFloat(e.target.value) || 20);
                  onUpdateLevel({
                    ...level,
                    terrains: level.terrains.map((t) =>
                      t.id === selectedTerrain.id ? { ...t, height } : t
                    )
                  });
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* Action to create new wall platform (Single '+' icon) */}
      <div className="wall-action-container" style={{ marginTop: 8 }}>
        <button
          type="button"
          className="obstacle-action-btn near-wall-btn"
          style={{ width: '100%', padding: '9px 12px', fontSize: '11.5px' }}
          onClick={handleAddWall}
          title="Add a new brick wall platform to canvas"
        >
          <Plus size={14} strokeWidth={3} />
          <span>{t('add_wall_platform')}</span>
        </button>
      </div>

      {/* Existing Walls Quick Switcher */}
      {level.terrains.length > 0 && (
        <div className="existing-walls-list" style={{ marginTop: 10 }}>
          <span className="theme-section-title">{t('level_walls', { n: level.terrains.length })}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
            {level.terrains.map((terrain, idx) => {
              const isSelected = selectedTerrain?.id === terrain.id;
              const theme = getWallTheme(terrain.theme);

              return (
                <div
                  key={terrain.id}
                  className={`level-wall-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelect?.({ type: 'terrain', id: terrain.id });
                    onSelectTool?.('select');
                  }}
                  title={`Select Wall #${idx + 1}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span
                      className="level-wall-chip"
                      style={{
                        backgroundColor: theme.brickBase,
                        borderColor: theme.brickBorder
                      }}
                      title={theme.name}
                    />
                    <span className="level-wall-name">{t('wall_n', { n: idx + 1 })}</span>
                    <span className="level-wall-theme-name">({theme.name})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="level-wall-dims">
                      {Math.round(terrain.width)}×{Math.round(terrain.height)}px
                    </span>
                    {level.terrains.length > 1 && (
                      <button
                        type="button"
                        className="level-wall-del-btn"
                        onClick={(e) => handleDeleteWall(terrain.id, e)}
                        title={`Delete Wall #${idx + 1}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
