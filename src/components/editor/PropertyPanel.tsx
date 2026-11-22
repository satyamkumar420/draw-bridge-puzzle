import type React from 'react';
import { useState, useCallback } from 'react';
import type { LevelData, HazardType } from '../../types/level';
import type { EditorTool, SelectedObjectRef } from '../../types/editor';
import { SKY_THEMES, DEFAULT_SKY_THEME_ID } from '../../config/skyThemes';
import { ToolsPanelSection } from './ToolsPanelSection';
import { WallPanelSection } from './WallPanelSection';
import { PenColorSection } from './PenColorSection';
import { HazardMovementControls } from './HazardMovementControls';
import { ArcadeButton } from '../common/ArcadeButton';
import { Palette, Check, Wrench, SlidersHorizontal, Square, Download, Upload, X } from 'lucide-react';
import { useI18n } from '../../i18n';

export interface PropertyPanelProps {
  level: LevelData;
  onUpdateLevel: (updated: LevelData) => void;
  selection: SelectedObjectRef | null;
  onSelect?: (ref: SelectedObjectRef | null) => void;
  activeTool?: EditorTool;
  onSelectTool?: (tool: EditorTool) => void;
  onImportLevel?: (level: LevelData) => void;
}

export type FeatureMode = 'wall' | 'tools' | 'sky';
export type ActiveSubTab = 'feature' | 'settings';

/** Minimal validation: checks if parsed JSON has required LevelData fields */
function isValidLevelData(data: unknown): data is LevelData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.gravity === 'number' &&
    obj.spawn != null && typeof obj.spawn === 'object' &&
    obj.goal != null && typeof obj.goal === 'object' &&
    Array.isArray(obj.terrains) &&
    Array.isArray(obj.hazards)
  );
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  level,
  onUpdateLevel,
  selection,
  onSelect,
  activeTool,
  onSelectTool,
  onImportLevel
}) => {
  const { t } = useI18n();

  const [featureMode, setFeatureMode] = useState<FeatureMode>(() => {
    if (activeTool === 'background') return 'sky';
    if (activeTool === 'tools' || activeTool?.startsWith('hazard-')) return 'tools';
    return 'wall';
  });

  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('feature');

  // JSON Import/Export state
  const [justExported, setJustExported] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');

  const [prevActiveTool, setPrevActiveTool] = useState(activeTool);
  const [prevSelection, setPrevSelection] = useState(selection);

  if (activeTool !== prevActiveTool) {
    setPrevActiveTool(activeTool);
    if (activeTool === 'background') {
      setFeatureMode('sky');
      setActiveSubTab('feature');
    } else if (activeTool === 'terrain') {
      setFeatureMode('wall');
      setActiveSubTab('feature');
    } else if (activeTool === 'tools' || activeTool?.startsWith('hazard-')) {
      setFeatureMode('tools');
      setActiveSubTab('feature');
    }
  }

  if (selection !== prevSelection) {
    setPrevSelection(selection);
    if (selection?.type === 'terrain') {
      setFeatureMode('wall');
      setActiveSubTab('feature');
    } else if (selection?.type === 'hazard') {
      setFeatureMode('tools');
      setActiveSubTab('feature');
    }
  }

  const handleNameChange = (name: string) => {
    onUpdateLevel({ ...level, name });
  };

  const handleGravityChange = (gravity: number) => {
    onUpdateLevel({ ...level, gravity });
  };

  /** Export: download as .json file + copy to clipboard */
  const handleExportJson = useCallback(() => {
    const json = JSON.stringify(level, null, 2);
    const fileName = `${level.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase() || 'level'}.json`;

    // Download as file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);

    // Also copy to clipboard
    navigator.clipboard.writeText(json).catch(() => { /* ignore */ });

    setJustExported(true);
    setTimeout(() => setJustExported(false), 1500);
  }, [level]);

  /** Import: validate JSON and load as level */
  const handleImportSubmit = useCallback(() => {
    const trimmed = importJson.trim();
    if (!trimmed) {
      setImportError(t('json_paste_required'));
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!isValidLevelData(parsed)) {
        setImportError(t('json_invalid_structure'));
        return;
      }

      const imported: LevelData = {
        ...parsed,
        id: `custom-${Date.now()}`,
        coins: Array.isArray(parsed.coins) ? parsed.coins : []
      };

      onImportLevel?.(imported);
      setShowImportModal(false);
      setImportJson('');
      setImportError('');
    } catch {
      setImportError(t('json_invalid_syntax'));
    }
  }, [importJson, onImportLevel, t]);

  const selectedTerrain =
    selection?.type === 'terrain' ? level.terrains.find((t) => t.id === selection.id) : null;
  const selectedHazard =
    selection?.type === 'hazard' ? level.hazards.find((h) => h.id === selection.id) : null;

  const renderSkyThemeSection = () => (
    <div className="panel-section sky-theme-section">
      <div className="sky-theme-header">
        <div className="sky-theme-title-wrap">
          <Palette size={16} className="sky-theme-icon" />
          <h4 className="section-title sky-section-title">{t('sky_background')}</h4>
        </div>
        <span className="sky-theme-badge">{t('themes_count', { n: Object.keys(SKY_THEMES).length })}</span>
      </div>

      <div className="sky-theme-grid">
        {Object.values(SKY_THEMES).map((theme) => {
          const isSelected = (level.skyTheme || DEFAULT_SKY_THEME_ID) === theme.id;
          const gradientStyle = `linear-gradient(180deg, ${theme.skyTop} 0%, ${
            theme.skyMiddle ? `${theme.skyMiddle} 50%, ` : ''
          }${theme.skyBottom} 100%)`;

          return (
            <button
              key={theme.id}
              type="button"
              className={`sky-theme-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onUpdateLevel({ ...level, skyTheme: theme.id })}
              title={`${theme.name} — ${theme.description}`}
            >
              {/* Visual preview */}
              <div className="sky-card-preview" style={{ background: gradientStyle }}>
                <div
                  className="sky-preview-sun"
                  style={{ backgroundColor: theme.accentColor }}
                />
                {isSelected && (
                  <div className="sky-card-active-badge">
                    <Check size={11} strokeWidth={3} />
                    <span>{t('active')}</span>
                  </div>
                )}
              </div>

              {/* Card info */}
              <div className="sky-card-info">
                <span className="sky-card-name">{theme.name}</span>
                <div className="sky-color-chips">
                  <span
                    className="color-dot"
                    style={{ backgroundColor: theme.skyTop }}
                    title={`Top: ${theme.skyTop}`}
                  />
                  {theme.skyMiddle && (
                    <span
                      className="color-dot"
                      style={{ backgroundColor: theme.skyMiddle }}
                      title={`Mid: ${theme.skyMiddle}`}
                    />
                  )}
                  <span
                    className="color-dot"
                    style={{ backgroundColor: theme.skyBottom }}
                    title={`Bottom: ${theme.skyBottom}`}
                  />
                  <span className="sky-category-tag" style={{ color: theme.accentColor }}>
                    {theme.badge}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="property-panel">
      {/* 2D Arcade Navigation Tab Bar: Exactly 2 tabs (Selected feature tab + Permanent Settings tab) */}
      <div className="prop-tabs-nav">
        {featureMode === 'wall' && (
          <button
            type="button"
            className={`prop-tab-btn ${activeSubTab === 'feature' ? 'active' : ''}`}
            onClick={() => {
              setActiveSubTab('feature');
              onSelectTool?.('terrain');
            }}
            title={t('brick_wall')}
          >
            <Square size={14} />
            <span>{t('brick_wall')}</span>
          </button>
        )}

        {featureMode === 'tools' && (
          <button
            type="button"
            className={`prop-tab-btn ${activeSubTab === 'feature' ? 'active' : ''}`}
            onClick={() => {
              setActiveSubTab('feature');
              onSelectTool?.('tools');
            }}
            title={t('tools')}
          >
            <Wrench size={14} />
            <span>{t('tools')}</span>
          </button>
        )}

        {featureMode === 'sky' && (
          <button
            type="button"
            className={`prop-tab-btn ${activeSubTab === 'feature' ? 'active' : ''}`}
            onClick={() => {
              setActiveSubTab('feature');
              onSelectTool?.('background');
            }}
            title={t('sky_bg')}
          >
            <Palette size={14} />
            <span>{t('sky_bg')}</span>
          </button>
        )}

        <button
          type="button"
          className={`prop-tab-btn ${activeSubTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('settings')}
          title={t('level_settings')}
        >
          <SlidersHorizontal size={14} />
          <span>{t('setting')}</span>
        </button>
      </div>

      <div className="panel-body">
        {/* Settings Tab: Level title, gravity and world stats */}
        {activeSubTab === 'settings' && (
          <div className="panel-section">
            <h4 className="section-title">{t('level_settings')}</h4>
            <div className="property-grid">
              <label className="prop-row">
                <span>{t('title')}</span>
                <input
                  type="text"
                  value={level.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </label>
              <label className="prop-row">
                <span>{t('gravity')}</span>
                <input
                  type="number"
                  step={0.5}
                  value={level.gravity}
                  onChange={(e) => handleGravityChange(parseFloat(e.target.value) || 9.8)}
                />
              </label>
            </div>

            <PenColorSection
              selectedColor={level.penColor}
              onSelectColor={(colorId) => onUpdateLevel({ ...level, penColor: colorId })}
            />

            <div className="level-stats-card">
              <span className="stat-label">{t('walls')}:</span>
              <span className="stat-value">{level.terrains.length} {t('walls')}</span>
            </div>
            <div className="level-stats-card">
              <span className="stat-label">{t('hazards')}:</span>
              <span className="stat-value">{level.hazards.length} {t('hazards')}</span>
            </div>

            {/* JSON Export & Import — column layout */}
            <div className="json-io-section">
              <h4 className="section-title">{t('level_json')}</h4>
              <div className="json-io-buttons">
                <ArcadeButton
                  variant={justExported ? 'green' : 'orange'}
                  size="sm"
                  icon={<Download size={14} />}
                  onClick={handleExportJson}
                  title={t('export_json')}
                  fullWidth
                >
                  {justExported ? t('downloaded') : t('export_json')}
                </ArcadeButton>

                <ArcadeButton
                  variant="gray"
                  size="sm"
                  icon={<Upload size={14} />}
                  onClick={() => {
                    setShowImportModal(true);
                    setImportJson('');
                    setImportError('');
                  }}
                  title={t('import_json')}
                  fullWidth
                >
                  {t('import_json')}
                </ArcadeButton>
              </div>
            </div>
          </div>
        )}

        {/* Feature Tab: Selected object inspector + Tools or Sky BG */}
        {activeSubTab === 'feature' && (
          <>
            {selection && selection.type !== 'terrain' && (
              <div className="panel-section selected-object-section">
            <div className="selected-object-header">
              <h4 className="section-title">
                {t('selected_object')} <span className="highlight-text">{selection.type.toUpperCase()}</span>
              </h4>
              <button
                type="button"
                className="deselect-link-btn"
                onClick={() => onSelect?.(null)}
                title={t('clear')}
              >
                {t('clear')}
              </button>
            </div>

            {selectedHazard && (
              <div className="property-grid">
                <label className="prop-row">
                  <span>{t('type')}</span>
                  <select
                    value={selectedHazard.type}
                    onChange={(e) => {
                      const type = e.target.value as HazardType;
                      onUpdateLevel({
                        ...level,
                        hazards: level.hazards.map((h) =>
                          h.id === selectedHazard.id ? { ...h, type } : h
                        )
                      });
                    }}
                  >
                    <option value="chakra">Chakra (Sawblade)</option>
                    <option value="fire">Fire Flame</option>
                    <option value="laser">Laser Beam</option>
                    <option value="tnt">TNT Barrel</option>
                    <option value="crusher">Spike Crusher</option>
                    <option value="spikes">Ground Spikes</option>
                    <option value="water">Water Pit</option>
                    <option value="acid">Acid Cauldron</option>
                    <option value="tesla">Tesla Zap Coil</option>
                    <option value="plasma">Plasma Core</option>
                    <option value="meteor">Magma Meteor</option>
                    <option value="stalactite">Rock Stalagmite Spikes</option>
                    <option value="toxic_barrel">Biohazard Drum</option>
                    <option value="guillotine">Pendulum Blade</option>
                    <option value="ice_spikes">Cryo Glacier Spikes</option>
                    <option value="blackhole">Dark Singularity</option>
                    <option value="wrecking_ball">Wrecking Ball</option>
                    <option value="mine">Naval Proximity Mine</option>
                  </select>
                </label>
                <label className="prop-row">
                  <span>X</span>
                  <input
                    type="number"
                    value={Math.round(selectedHazard.x)}
                    onChange={(e) => {
                      const x = parseFloat(e.target.value) || 0;
                      onUpdateLevel({
                        ...level,
                        hazards: level.hazards.map((h) =>
                          h.id === selectedHazard.id ? { ...h, x } : h
                        )
                      });
                    }}
                  />
                </label>
                <label className="prop-row">
                  <span>Y</span>
                  <input
                    type="number"
                    value={Math.round(selectedHazard.y)}
                    onChange={(e) => {
                      const y = parseFloat(e.target.value) || 0;
                      onUpdateLevel({
                        ...level,
                        hazards: level.hazards.map((h) =>
                          h.id === selectedHazard.id ? { ...h, y } : h
                        )
                      });
                    }}
                  />
                </label>
                <label className="prop-row">
                  <span>Width</span>
                  <input
                    type="number"
                    value={Math.round(selectedHazard.width)}
                    onChange={(e) => {
                      const width = Math.max(30, parseFloat(e.target.value) || 30);
                      onUpdateLevel({
                        ...level,
                        hazards: level.hazards.map((h) =>
                          h.id === selectedHazard.id ? { ...h, width } : h
                        )
                      });
                    }}
                  />
                </label>
                <label className="prop-row">
                  <span>Height</span>
                  <input
                    type="number"
                    value={Math.round(selectedHazard.height)}
                    onChange={(e) => {
                      const height = Math.max(20, parseFloat(e.target.value) || 20);
                      onUpdateLevel({
                        ...level,
                        hazards: level.hazards.map((h) =>
                          h.id === selectedHazard.id ? { ...h, height } : h
                        )
                      });
                    }}
                  />
                </label>
              </div>
            )}

            {selectedHazard && (
              <HazardMovementControls
                hazard={selectedHazard}
                onUpdateMovement={(movement) => {
                  onUpdateLevel({
                    ...level,
                    hazards: level.hazards.map((h) =>
                      h.id === selectedHazard.id ? { ...h, movement } : h
                    )
                  });
                }}
              />
            )}

            {selection.type === 'spawn' && (
              <div className="property-grid">
                <label className="prop-row">
                  <span>Spawn X</span>
                  <input
                    type="number"
                    value={Math.round(level.spawn.x)}
                    onChange={(e) =>
                      onUpdateLevel({
                        ...level,
                        spawn: { ...level.spawn, x: parseFloat(e.target.value) || 0 }
                      })
                    }
                  />
                </label>
                <label className="prop-row">
                  <span>Spawn Y</span>
                  <input
                    type="number"
                    value={Math.round(level.spawn.y)}
                    onChange={(e) =>
                      onUpdateLevel({
                        ...level,
                        spawn: { ...level.spawn, y: parseFloat(e.target.value) || 0 }
                      })
                    }
                  />
                </label>
              </div>
            )}

            {selection.type === 'goal' && (
              <div className="property-grid">
                <label className="prop-row">
                  <span>Goal X</span>
                  <input
                    type="number"
                    value={Math.round(level.goal.x)}
                    onChange={(e) =>
                      onUpdateLevel({
                        ...level,
                        goal: { ...level.goal, x: parseFloat(e.target.value) || 0 }
                      })
                    }
                  />
                </label>
                <label className="prop-row">
                  <span>Goal Y</span>
                  <input
                    type="number"
                    value={Math.round(level.goal.y)}
                    onChange={(e) =>
                      onUpdateLevel({
                        ...level,
                        goal: { ...level.goal, y: parseFloat(e.target.value) || 0 }
                      })
                    }
                  />
                </label>
              </div>
            )}
          </div>
        )}

            {featureMode === 'wall' && (
              <WallPanelSection
                level={level}
                onUpdateLevel={onUpdateLevel}
                selectedTerrain={selectedTerrain}
                onSelectTool={onSelectTool}
                onSelect={onSelect}
              />
            )}

            {featureMode === 'tools' && (
              <ToolsPanelSection
                level={level}
                onUpdateLevel={onUpdateLevel}
                selectedTerrainId={selectedTerrain?.id}
                activeTool={activeTool}
                onSelectTool={onSelectTool}
                onSelect={onSelect}
              />
            )}

            {featureMode === 'sky' && renderSkyThemeSection()}
          </>
        )}
      </div>

      {/* Import JSON Modal */}
      {showImportModal && (
        <div className="json-import-overlay" onClick={() => setShowImportModal(false)}>
          <div className="json-import-modal" onClick={(e) => e.stopPropagation()}>
            <div className="json-import-header">
              <h3>{t('import_level_json')}</h3>
              <button
                type="button"
                className="json-import-close"
                onClick={() => setShowImportModal(false)}
                aria-label={t('close')}
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              className="json-import-textarea"
              placeholder={t('paste_json_placeholder')}
              value={importJson}
              onChange={(e) => {
                setImportJson(e.target.value);
                setImportError('');
              }}
              spellCheck={false}
              autoFocus
            />

            {importError && (
              <div className="json-import-error">{importError}</div>
            )}

            <div className="json-import-actions">
              <ArcadeButton
                variant="green"
                size="sm"
                icon={<Upload size={14} />}
                onClick={handleImportSubmit}
                fullWidth
              >
                {t('load_level')}
              </ArcadeButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
