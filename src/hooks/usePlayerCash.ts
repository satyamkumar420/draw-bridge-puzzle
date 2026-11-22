import { useState, useEffect, useCallback } from "react";
import { safeStorage } from "../services/storage.ts";
import { youtubePlayables } from "../services/youtubePlayables.ts";

const STORAGE_KEY = "game_player_cash";
const DEFAULT_CASH = 0;
const SET_50K_MIGRATION_KEY = "game_cash_set_50000_v3";

export function usePlayerCash() {
  const [cash, setCash] = useState<number>(() => {
    try {
      const isSetDone = safeStorage.getItem(SET_50K_MIGRATION_KEY);
      if (!isSetDone) {
        safeStorage.setItem(SET_50K_MIGRATION_KEY, "true");
        safeStorage.setItem(STORAGE_KEY, String(DEFAULT_CASH));
        return DEFAULT_CASH;
      }

      const saved = safeStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return Math.max(parsed, DEFAULT_CASH);
      }
    } catch {
      // ignore
    }
    return DEFAULT_CASH;
  });

  useEffect(() => {
    try {
      safeStorage.setItem(STORAGE_KEY, String(cash));
    } catch {
      // ignore
    }
  }, [cash]);

  // Listen for storage events in case of multiple instances
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        const val = parseInt(e.newValue, 10);
        if (!isNaN(val)) setCash(val);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    }
  }, []);

  const addCash = useCallback((amount: number, syncScore = false) => {
    setCash((prev) => {
      const next = prev + amount;
      try {
        safeStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      if (syncScore && next > prev) {
        youtubePlayables.sendScore(next);
      }
      return next;
    });
  }, []);

  const hydrateCash = useCallback((cloudCash: number) => {
    if (typeof cloudCash !== "number" || isNaN(cloudCash)) return;
    setCash((prev) => {
      const next = Math.max(prev, cloudCash, DEFAULT_CASH);
      try {
        safeStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      youtubePlayables.sendScore(next);
      return next;
    });
  }, []);

  const syncScore = useCallback((scoreOverride?: number) => {
    if (typeof scoreOverride === 'number' && !isNaN(scoreOverride)) {
      youtubePlayables.sendScore(scoreOverride);
      return;
    }
    const saved = safeStorage.getItem(STORAGE_KEY);
    const val = saved !== null ? parseInt(saved, 10) : cash;
    if (!isNaN(val)) {
      youtubePlayables.sendScore(val);
    }
  }, [cash]);

  return { cash, setCash, addCash, hydrateCash, syncScore };
}
