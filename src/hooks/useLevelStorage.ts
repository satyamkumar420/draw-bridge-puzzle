import { useState, useCallback, useMemo } from 'react';
import type { LevelData } from '../types/level';
import { DEFAULT_LEVELS } from '../config/defaultLevels.ts';
import { safeStorage } from '../services/storage.ts';

const STORAGE_KEYS = {
  UNLOCKED_INDEX: 'drawbridge_unlocked_level',
  DEFAULT_LEVELS: 'drawbridge_default_levels',
  CUSTOM_LEVELS: 'drawbridge_custom_levels'
};

export function createNewLevelTemplate(levelNumber = 5): LevelData {
  return {
    id: `custom-${Date.now()}`,
    name: `Level ${levelNumber}`,
    description: 'Draw a bridge to reach the flag!',
    gravity: 9.8,
    spawn: { x: 55, y: 377.5 },
    goal: { x: 860, y: 400, width: 60, height: 80 },
    terrains: [
      { id: 'left-cliff', type: 'brick', theme: 'brick-red', x: 0, y: 400, width: 240, height: 200 },
      { id: 'right-cliff', type: 'brick', theme: 'brick-red', x: 760, y: 400, width: 240, height: 200 }
    ],
    hazards: [
      { id: 'hazard-1', type: 'spikes', x: 340, y: 560, width: 320, height: 40 }
    ],
    coins: []
  };
}

export function useLevelStorage() {
  const [unlockedIndex, setUnlockedIndex] = useState<number>(() => {
    try {
      const savedUnlocked = safeStorage.getItem(STORAGE_KEYS.UNLOCKED_INDEX);
      if (savedUnlocked !== null) {
        return parseInt(savedUnlocked, 10) || 0;
      }
    } catch (e) {
      console.error('Failed to read unlocked level', e);
    }
    return 0;
  });

  const [defaultLevels, setDefaultLevels] = useState<LevelData[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.DEFAULT_LEVELS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return DEFAULT_LEVELS.map((base, idx) => {
            const override = parsed.find((p: LevelData) => p.id === base.id);
            if (override) {
              const cleanName = override.name && !override.name.includes(':') ? override.name : `Level ${idx + 1}`;
              return { ...base, ...override, name: cleanName };
            }
            return { ...base, name: `Level ${idx + 1}` };
          });
        }
      }
    } catch (e) {
      console.error('Failed to read default level overrides', e);
    }
    return DEFAULT_LEVELS;
  });

  const [customLevels, setCustomLevels] = useState<LevelData[]>(() => {
    try {
      const savedCustom = safeStorage.getItem(STORAGE_KEYS.CUSTOM_LEVELS);
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed)) {
          return parsed.map((lvl: LevelData, idx: number) => {
            const cleanName =
              lvl.name && !lvl.name.startsWith('Custom Level') ? lvl.name : `Level ${DEFAULT_LEVELS.length + idx + 1}`;
            return { ...lvl, name: cleanName };
          });
        }
      }
    } catch (e) {
      console.error('Failed to read custom levels', e);
    }
    return [];
  });

  // Bundled JSON levels are always available, while saved custom levels are
  // restored from storage and shown after a refresh.
  const allLevels: LevelData[] = useMemo(
    () => [...defaultLevels, ...customLevels],
    [defaultLevels, customLevels]
  );

  const unlockNext = useCallback((currentIdx: number) => {
    setUnlockedIndex((prev) => {
      const next = Math.max(prev, currentIdx + 1);
      safeStorage.setItem(STORAGE_KEYS.UNLOCKED_INDEX, next.toString());
      return next;
    });
  }, []);

  const saveLevel = useCallback((level: LevelData) => {
    if (level.id.startsWith('level-')) {
      // Direct update to default level in defaultLevels
      setDefaultLevels((prev) => {
        const updated = prev.map((l) => (l.id === level.id ? level : l));
        safeStorage.setItem(STORAGE_KEYS.DEFAULT_LEVELS, JSON.stringify(updated));
        return updated;
      });
    } else {
      // Custom level update
      setCustomLevels((prev) => {
        const filtered = prev.filter((l) => l.id !== level.id);
        const updated = [...filtered, level];
        safeStorage.setItem(STORAGE_KEYS.CUSTOM_LEVELS, JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  const deleteCustomLevel = useCallback((id: string) => {
    setCustomLevels((prev) => {
      const updated = prev.filter((l) => l.id !== id);
      safeStorage.setItem(STORAGE_KEYS.CUSTOM_LEVELS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const hydrateUnlockedIndex = useCallback((cloudIndex: number) => {
    if (typeof cloudIndex !== 'number' || isNaN(cloudIndex)) return;
    setUnlockedIndex((prev) => {
      const next = Math.max(prev, cloudIndex);
      try {
        safeStorage.setItem(STORAGE_KEYS.UNLOCKED_INDEX, next.toString());
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return {
    allLevels,
    defaultLevels,
    customLevels,
    unlockedIndex,
    unlockNext,
    hydrateUnlockedIndex,
    saveLevel,
    saveCustomLevel: saveLevel,
    deleteCustomLevel,
    createNewLevelTemplate
  };
}
