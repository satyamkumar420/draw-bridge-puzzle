import { useState, useEffect, useCallback, useRef } from 'react';
import { GameCanvas } from './components/game/GameCanvas';
import { EditorCanvas } from './components/editor/EditorCanvas';
import { ToolBar } from './components/editor/ToolBar';
import { PropertyPanel } from './components/editor/PropertyPanel';
import { LevelManagerPanel } from './components/editor/LevelManagerPanel';
import { SettingsModal } from './components/common/SettingsModal';
import { LanguageModal } from './components/common/LanguageModal';
import { LevelSelectModal } from './components/game/LevelSelectModal';
import { LoadingScreen } from './components/common/LoadingScreen';
import { youtubePlayables, type PlayerCloudSaveData } from './services/youtubePlayables';
import { safeStorage } from './services/storage';
import { useLevelStorage } from './hooks/useLevelStorage';
import { usePlayerCash } from './hooks/usePlayerCash';
import { useGameStore, UNLOCK_PRICE_CARS, UNLOCK_PRICE_TRAILS } from './hooks/useGameStore';
import { I18nProvider, useI18n, type LanguageCode } from './i18n';
import type { EditorTool, SelectedObjectRef } from './types/editor';
import type { LevelData } from './types/level';
import './styles/app.css';

function AppInner() {
  const { setLanguage } = useI18n();
  const {
    allLevels,
    unlockedIndex,
    unlockNext,
    hydrateUnlockedIndex,
    saveLevel,
    deleteCustomLevel,
    createNewLevelTemplate
  } = useLevelStorage();

  const { cash, addCash, hydrateCash } = usePlayerCash();
  const {
    storeState,
    selectCar,
    selectTrail,
    unlockRandomItem,
    unlockSpecificItem,
    hydrateStoreState
  } = useGameStore();

  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [activePlayLevel, setActivePlayLevel] = useState<LevelData | null>(() => {
    const savedId = safeStorage.getItem('drawbridge_active_level_id');
    if (savedId) {
      const found = allLevels.find((l) => l.id === savedId);
      if (found) return found;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isCloudDataReady, setIsCloudDataReady] = useState(false);

  const allLevelsRef = useRef(allLevels);
  useEffect(() => {
    allLevelsRef.current = allLevels;
  }, [allLevels]);

  // Background Cloud Data Loading on Boot
  useEffect(() => {
    let isMounted = true;
    youtubePlayables
      .loadData(1200)
      .then((cloudData) => {
        if (!isMounted) return;
        if (cloudData) {
          if (typeof cloudData.unlockedIndex === 'number') {
            hydrateUnlockedIndex(cloudData.unlockedIndex);
            // Resume at the player's highest progression or saved level
            const currentLevels = allLevelsRef.current;
            const savedId = safeStorage.getItem('drawbridge_active_level_id');
            const savedIdx = savedId ? currentLevels.findIndex((l) => l.id === savedId) : -1;
            const targetIdx = Math.min(
              Math.max(savedIdx >= 0 ? savedIdx : 0, cloudData.unlockedIndex),
              currentLevels.length - 1
            );
            if (targetIdx >= 0 && targetIdx < currentLevels.length) {
              setCurrentLevelIndex(targetIdx);
              setActivePlayLevel(currentLevels[targetIdx]);
              safeStorage.setItem('drawbridge_active_level_id', currentLevels[targetIdx].id);
            }
          }
          if (typeof cloudData.cash === 'number') {
            hydrateCash(cloudData.cash);
          }
          if (cloudData.storeState) {
            hydrateStoreState(cloudData.storeState);
          }
          if (typeof cloudData.soundEnabled === 'boolean') {
            safeStorage.setItem('game_sound_enabled', String(cloudData.soundEnabled));
          }
          if (typeof cloudData.language === 'string' && cloudData.language.trim().length > 0) {
            setLanguage(cloudData.language as LanguageCode);
          }
        }
        setIsCloudDataReady(true);
      })
      .catch((err) => {
        console.warn('Failed to hydrate cloud data', err);
        if (isMounted) {
          setIsCloudDataReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [hydrateUnlockedIndex, hydrateCash, hydrateStoreState, setLanguage]);

  // Direct helper to sync player progression to YouTube Playables Cloud Storage
  const syncToCloud = useCallback(
    (overrides?: Partial<PlayerCloudSaveData>) => {
      const isSound = safeStorage.getItem('game_sound_enabled') !== 'false';
      const hasManual = safeStorage.getItem('game_language_manual_override');
      const manualLang = hasManual ? (safeStorage.getItem('game_language') as LanguageCode) : undefined;
      const activeLang = overrides?.language !== undefined ? overrides.language : manualLang;

      const payload: PlayerCloudSaveData = {
        unlockedIndex: overrides?.unlockedIndex ?? unlockedIndex,
        cash: overrides?.cash ?? cash,
        storeState: overrides?.storeState ?? storeState,
        soundEnabled: overrides?.soundEnabled ?? isSound,
        ...(activeLang ? { language: activeLang } : {})
      };
      youtubePlayables.saveData(payload);
    },
    [unlockedIndex, cash, storeState]
  );

  // Debounced Cloud Save Progression Sync (excluding editor levels)
  useEffect(() => {
    if (isLoading || !isCloudDataReady) return;

    const timer = setTimeout(() => {
      syncToCloud();
    }, 400);

    return () => clearTimeout(timer);
  }, [unlockedIndex, cash, storeState, isLoading, isCloudDataReady, syncToCloud]);

  // Determine route: '/' = Playable Game, '/editor' = Level Editor
  const [route, setRoute] = useState<'play' | 'editor'>(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (path.includes('editor') || hash.includes('editor') || search.includes('editor')) {
      return 'editor';
    }
    return 'play';
  });

  // Listen for browser navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (path.includes('editor') || hash.includes('editor') || search.includes('editor')) {
        setRoute('editor');
      } else {
        setRoute('play');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (newRoute: 'play' | 'editor') => {
    setRoute(newRoute);
    const newPath = newRoute === 'editor' ? '/editor' : '/';
    window.history.pushState({}, '', newPath);
  };

  // Effective current level: activePlayLevel takes precedence if set, otherwise fallback to index
  const currentLevel = activePlayLevel || allLevels[currentLevelIndex] || allLevels[0];

  // Editor State
  const [editorLevel, setEditorLevel] = useState<LevelData>(() => JSON.parse(JSON.stringify(currentLevel)));
  const [activeTool, setActiveTool] = useState<EditorTool>('terrain');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [selection, setSelection] = useState<SelectedObjectRef | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // History Stacks for Undo / Redo
  const [history, setHistory] = useState<LevelData[]>([]);
  const [future, setFuture] = useState<LevelData[]>([]);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState(false);

  const handleOpenLanguage = useCallback(() => {
    setIsSettingsOpen(false);
    setIsLanguageOpen(true);
  }, []);

  const handleSelectLevelFromModal = useCallback(
    (targetIdx: number) => {
      if (targetIdx >= 0 && targetIdx < allLevels.length) {
        const targetLvl = allLevels[targetIdx];
        setActivePlayLevel(targetLvl);
        setCurrentLevelIndex(targetIdx);
        safeStorage.setItem('drawbridge_active_level_id', targetLvl.id);
      }
    },
    [allLevels]
  );

  const handleLevelComplete = useCallback(
    (idx: number) => {
      const nextIdx = Math.max(unlockedIndex, idx + 1);
      unlockNext(idx);
      syncToCloud({ unlockedIndex: nextIdx });
    },
    [unlockNext, unlockedIndex, syncToCloud]
  );

  const handleNextLevel = () => {
    const currentIndex = allLevels.findIndex((l) => l.id === currentLevel.id);
    let nextIdx = currentIndex + 1;
    if (currentIndex >= 0 && currentIndex < allLevels.length - 1) {
      const nextLvl = allLevels[currentIndex + 1];
      setActivePlayLevel(nextLvl);
      setCurrentLevelIndex(nextIdx);
      safeStorage.setItem('drawbridge_active_level_id', nextLvl.id);
    } else if (currentLevelIndex < allLevels.length - 1) {
      nextIdx = currentLevelIndex + 1;
      const nextLvl = allLevels[nextIdx];
      setActivePlayLevel(nextLvl);
      setCurrentLevelIndex(nextIdx);
      if (nextLvl) {
        safeStorage.setItem('drawbridge_active_level_id', nextLvl.id);
      }
    }
    syncToCloud({ unlockedIndex: Math.max(unlockedIndex, nextIdx) });
  };

  const handleRestartFromLevel1 = useCallback(() => {
    if (allLevels.length > 0) {
      const firstLevel = allLevels[0];
      setActivePlayLevel(firstLevel);
      setCurrentLevelIndex(0);
      safeStorage.setItem('drawbridge_active_level_id', firstLevel.id);
    }
  }, [allLevels]);

  const handleUpdateEditorLevel = useCallback(
    (updated: LevelData) => {
      setHistory((prev) => [...prev.slice(-30), editorLevel]);
      setFuture([]);
      setEditorLevel(updated);
    },
    [editorLevel]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [editorLevel, ...prev]);
    setEditorLevel(previous);
    setSelection(null);
  }, [history, editorLevel]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, editorLevel]);
    setEditorLevel(next);
    setSelection(null);
  }, [future, editorLevel]);

  const handleSelectLevel = (lvl: LevelData) => {
    setEditorLevel(JSON.parse(JSON.stringify(lvl)));
    setSelection(null);
    setHistory([]);
    setFuture([]);
  };

  const handleNewLevel = () => {
    const nextLevelNumber = allLevels.length + 1;
    const template = createNewLevelTemplate(nextLevelNumber);
    saveLevel(template);
    setEditorLevel(template);
    setSelection(null);
    setActiveTool('terrain');
    setHistory([]);
    setFuture([]);
  };

  const handleSaveToPresets = () => {
    const isDefault = editorLevel.id.startsWith('level-');
    const isCustom = editorLevel.id.startsWith('custom-');
    const assignedId = isDefault || isCustom ? editorLevel.id : `custom-${Date.now()}`;
    const levelIdx = allLevels.findIndex((l) => l.id === assignedId);
    const defaultName = levelIdx >= 0 ? `Level ${levelIdx + 1}` : `Level ${allLevels.length + 1}`;

    const savedLevel: LevelData = {
      ...editorLevel,
      id: assignedId,
      name: editorLevel.name || defaultName
    };
    saveLevel(savedLevel);
    setEditorLevel(savedLevel);
  };

  const handlePlayLevel = (targetLevel?: LevelData) => {
    const levelToUse = targetLevel || editorLevel;
    const isDefault = levelToUse.id.startsWith('level-');
    const isCustom = levelToUse.id.startsWith('custom-');
    const assignedId = isDefault || isCustom ? levelToUse.id : `custom-${Date.now()}`;
    const levelIdx = allLevels.findIndex((l) => l.id === assignedId);
    const defaultName = levelIdx >= 0 ? `Level ${levelIdx + 1}` : `Level ${allLevels.length + 1}`;

    const savedLevel: LevelData = {
      ...levelToUse,
      id: assignedId,
      name: levelToUse.name || defaultName
    };

    saveLevel(savedLevel);
    setEditorLevel(savedLevel);
    setActivePlayLevel(savedLevel);
    safeStorage.setItem('drawbridge_active_level_id', savedLevel.id);

    const foundIdx = allLevels.findIndex((l) => l.id === savedLevel.id);
    if (foundIdx >= 0) {
      setCurrentLevelIndex(foundIdx);
    }

    navigate('play');
  };

  const handleImportLevel = useCallback((imported: LevelData) => {
    setEditorLevel(imported);
    setSelection(null);
    setHistory([]);
    setFuture([]);
  }, []);

  const handleDeleteCustomLevel = (levelId: string) => {
    deleteCustomLevel(levelId);
    if (activePlayLevel?.id === levelId) {
      setActivePlayLevel(null);
      safeStorage.removeItem('drawbridge_active_level_id');
    }
    if (editorLevel.id === levelId) {
      setEditorLevel(JSON.parse(JSON.stringify(allLevels[0])));
      setSelection(null);
      setHistory([]);
      setFuture([]);
    }
  };

  const handleDeleteSelected = useCallback(() => {
    if (!selection) return;

    if (selection.type === 'terrain' && selection.id) {
      handleUpdateEditorLevel({
        ...editorLevel,
        terrains: editorLevel.terrains.filter((t) => t.id !== selection.id)
      });
      setSelection(null);
    } else if (selection.type === 'hazard' && selection.id) {
      handleUpdateEditorLevel({
        ...editorLevel,
        hazards: editorLevel.hazards.filter((h) => h.id !== selection.id)
      });
      setSelection(null);
    }
  }, [selection, editorLevel, handleUpdateEditorLevel]);

  // Keyboard Shortcuts for Undo (Ctrl+Z), Redo (Ctrl+Y), Delete
  useEffect(() => {
    if (route !== 'editor') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA');

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        handleDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [route, handleUndo, handleRedo, handleDeleteSelected]);

  return (
    <div className="app-root">
      {route === 'play' ? (
        /* Playable Game View */
        <GameCanvas
          key={currentLevel.id}
          level={currentLevel}
          levelIndex={
            allLevels.findIndex((l) => l.id === currentLevel.id) >= 0
              ? allLevels.findIndex((l) => l.id === currentLevel.id)
              : currentLevelIndex
          }
          totalLevels={allLevels.length}
          cash={cash}
          onAddCash={addCash}
          storeState={storeState}
          onSelectCar={(carId) => {
            selectCar(carId);
            syncToCloud({ storeState: { ...storeState, selectedCar: carId } });
          }}
          onSelectTrail={(trailId) => {
            selectTrail(trailId);
            syncToCloud({ storeState: { ...storeState, selectedTrail: trailId } });
          }}
          onUnlockRandomItem={(category, currentCash, deduct) => {
            const res = unlockRandomItem(category, currentCash, deduct);
            if (res.success && res.item) {
              const updatedStore = {
                ...storeState,
                ...(res.item.category === 'cars'
                  ? {
                      unlockedCars: [...storeState.unlockedCars, res.item.id],
                      selectedCar: res.item.id
                    }
                  : {
                      unlockedTrails: [...storeState.unlockedTrails, res.item.id],
                      selectedTrail: res.item.id
                    })
              };
              const cost = res.item.category === 'cars' ? UNLOCK_PRICE_CARS : UNLOCK_PRICE_TRAILS;
              syncToCloud({
                cash: Math.max(0, cash - cost),
                storeState: updatedStore
              });
            }
            return res;
          }}
          onUnlockSpecificItem={(itemId, currentCash, deduct) => {
            const res = unlockSpecificItem(itemId, currentCash, deduct);
            if (res.success && res.item) {
              const updatedStore = {
                ...storeState,
                ...(res.item.category === 'cars'
                  ? {
                      unlockedCars: [...storeState.unlockedCars, res.item.id],
                      selectedCar: res.item.id
                    }
                  : {
                      unlockedTrails: [...storeState.unlockedTrails, res.item.id],
                      selectedTrail: res.item.id
                    })
              };
              const cost = res.item.price > 0 ? res.item.price : (res.item.category === 'cars' ? UNLOCK_PRICE_CARS : UNLOCK_PRICE_TRAILS);
              syncToCloud({
                cash: Math.max(0, cash - cost),
                storeState: updatedStore
              });
            }
            return res;
          }}
          onNextLevel={handleNextLevel}
          onRestartFromLevel1={handleRestartFromLevel1}
          onLevelComplete={handleLevelComplete}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenEditor={() => navigate('editor')}
          onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
        />
      ) : (
        /* Level Editor View */
        <div className="editor-fullscreen-view">
          <ToolBar
            onBack={() => navigate('play')}
            activeTool={activeTool}
            onSelectTool={(tool) => {
              setActiveTool(tool);
              if (
                tool === 'background' ||
                tool === 'tools' ||
                tool === 'terrain' ||
                tool.startsWith('hazard-')
              ) {
                setShowRightPanel(true);
              }
              if (tool === 'background' || tool === 'tools' || tool === 'terrain') {
                setSelection(null);
              }
            }}
            snapToGrid={snapToGrid}
            onToggleSnap={() => setSnapToGrid(!snapToGrid)}
            hasSelection={!!selection && selection.type !== 'spawn' && selection.type !== 'goal'}
            onDeleteSelected={handleDeleteSelected}
            canUndo={history.length > 0}
            canRedo={future.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
            showLeftPanel={showLeftPanel}
            onToggleLeftPanel={() => setShowLeftPanel(!showLeftPanel)}
            showRightPanel={showRightPanel}
            onToggleRightPanel={() => setShowRightPanel(!showRightPanel)}
          />

          <div
            className={`editor-workspace ${showLeftPanel ? 'with-left-panel' : 'hide-left-panel'} ${
              showRightPanel ? 'with-right-panel' : 'hide-right-panel'
            }`}
          >
            {showLeftPanel && (
              <LevelManagerPanel
                levels={allLevels}
                temporaryLevel={allLevels.some((level) => level.id === editorLevel.id) ? undefined : editorLevel}
                currentLevelId={editorLevel.id}
                onSelectLevel={handleSelectLevel}
                onNewLevel={handleNewLevel}
                onSaveLevel={handleSaveToPresets}
                onPlayLevel={handlePlayLevel}
                onDeleteLevel={handleDeleteCustomLevel}
              />
            )}

            <EditorCanvas
              level={editorLevel}
              onUpdateLevel={handleUpdateEditorLevel}
              activeTool={activeTool}
              snapToGrid={snapToGrid}
              selection={selection}
              onSelect={setSelection}
              isTesting={false}
            />

            {showRightPanel && (
              <PropertyPanel
                level={editorLevel}
                onUpdateLevel={handleUpdateEditorLevel}
                selection={selection}
                onSelect={setSelection}
                activeTool={activeTool}
                onSelectTool={setActiveTool}
                onImportLevel={handleImportLevel}
              />
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenLanguage={handleOpenLanguage}
      />

      {/* Language Selection Modal */}
      <LanguageModal
        isOpen={isLanguageOpen}
        onClose={() => setIsLanguageOpen(false)}
        onLanguageSelected={(newLang) => {
          syncToCloud({ language: newLang });
        }}
      />

      {/* Level Selection Modal (Locked levels unlock as user progresses) */}
      <LevelSelectModal
        isOpen={isLevelSelectOpen}
        currentLevelIndex={currentLevelIndex}
        unlockedIndex={unlockedIndex}
        allLevels={allLevels}
        onSelectLevel={handleSelectLevelFromModal}
        onClose={() => setIsLevelSelectOpen(false)}
      />

      {/* Loading Screen for YouTube Playables firstFrameReady -> gameReady Flow */}
      {isLoading && (
        <LoadingScreen
          onFirstFrame={() => {
            youtubePlayables.firstFrameReady();
          }}
          onComplete={() => {
            setIsLoading(false);
            youtubePlayables.gameReady();
          }}
        />
      )}
    </div>
  );
}

export function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}

export default App;
