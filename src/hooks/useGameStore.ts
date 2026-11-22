import { useState, useEffect, useCallback } from 'react';
import type { StoreCategory, StoreItem, GameStoreState } from '../types/store';
import { safeStorage } from '../services/storage.ts';

export const STORE_CARS: StoreItem[] = [
  { id: 'smart_car', name: 'Smart Hatch', category: 'cars', price: 0, description: 'Nimble blue coupe' },
  { id: 'delivery_truck', name: 'Mini Hauler', category: 'cars', price: 5000, description: 'Yellow delivery hauler' },
  { id: 'army_truck', name: 'Army Hauler', category: 'cars', price: 6000, description: 'Rugged military transport truck' },
  { id: 'dirt_bike', name: 'Dirt Runner', category: 'cars', price: 7500, description: 'Off-road agile dirt bike' },
  { id: 'sports_coupe', name: 'Velocity Coupe', category: 'cars', price: 8500, description: 'Sleek aerodynamic racer' },
  { id: 'super_bike', name: 'Apex Racer', category: 'cars', price: 10000, description: 'High-speed track motorcycle' }
];

export const STORE_TRAILS: StoreItem[] = [
  { id: 'none', name: 'None', category: 'trails', price: 0, description: 'Standard exhaust' },
  { id: 'smoke_puff', name: 'Cloud Puffs', category: 'trails', price: 1000, description: 'Billowing cartoon smoke' },
  { id: 'spooky_ghost', name: 'Ghost Wisps', category: 'trails', price: 2000, description: 'Mystic phantom energy' },
  { id: 'pink_hearts', name: 'Sweet Hearts', category: 'trails', price: 3000, description: 'Floating sparkling hearts' },
  { id: 'fire_boost', name: 'Flame Burst', category: 'trails', price: 4000, description: 'Blazing rocket booster' },
  { id: 'neon_rings', name: 'Sonic Rings', category: 'trails', price: 5000, description: 'Expanding neon pulses' }
];

export const UNLOCK_PRICE_CARS = 5000;
export const UNLOCK_PRICE_TRAILS = 1000;
export const UNLOCK_PRICE = UNLOCK_PRICE_CARS;
const STORAGE_KEY = 'draw_bridge_game_store_v2';
const STORE_VERSION = 3;
const CARS_TO_RELOCK = new Set(['dirt_bike', 'super_bike']);

const DEFAULT_STORE_STATE: GameStoreState = {
  storeVersion: STORE_VERSION,
  unlockedCars: ['smart_car'],
  selectedCar: 'smart_car',
  unlockedTrails: ['none'],
  selectedTrail: 'none'
};

export function useGameStore() {
  const [storeState, setStoreState] = useState<GameStoreState>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedCars = Array.isArray(parsed.unlockedCars) ? parsed.unlockedCars : ['smart_car'];
        const unlockedCars = parsed.storeVersion === STORE_VERSION
          ? savedCars
          : savedCars.filter((carId: string) => !CARS_TO_RELOCK.has(carId));
        const selectedCar =
          typeof parsed.selectedCar === 'string' && unlockedCars.includes(parsed.selectedCar)
            ? parsed.selectedCar
            : 'smart_car';
        return {
          storeVersion: STORE_VERSION,
          unlockedCars: Array.from(new Set(unlockedCars)),
          selectedCar,
          unlockedTrails: Array.isArray(parsed.unlockedTrails) ? parsed.unlockedTrails : ['none'],
          selectedTrail: typeof parsed.selectedTrail === 'string' ? parsed.selectedTrail : 'none'
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_STORE_STATE;
  });

  useEffect(() => {
    try {
      safeStorage.setItem(STORAGE_KEY, JSON.stringify(storeState));
    } catch {
      // ignore
    }
  }, [storeState]);

  const selectCar = useCallback((carId: string) => {
    setStoreState((prev) => {
      if (!prev.unlockedCars.includes(carId)) return prev;
      return { ...prev, selectedCar: carId };
    });
  }, []);

  const selectTrail = useCallback((trailId: string) => {
    setStoreState((prev) => {
      if (!prev.unlockedTrails.includes(trailId)) return prev;
      return { ...prev, selectedTrail: trailId };
    });
  }, []);

  const unlockRandomItem = useCallback(
    (
      currentTab: StoreCategory,
      playerCash: number,
      onDeductCash: (amount: number) => void
    ): { success: boolean; item?: StoreItem; reason?: 'insufficient_funds' | 'all_unlocked' } => {
      const unlockCost = currentTab === 'cars' ? UNLOCK_PRICE_CARS : UNLOCK_PRICE_TRAILS;
      if (playerCash < unlockCost) {
        return { success: false, reason: 'insufficient_funds' };
      }

      // Priority 1: Locked items in active tab
      const lockedInActiveTab = (currentTab === 'cars' ? STORE_CARS : STORE_TRAILS).filter((item) =>
        currentTab === 'cars'
          ? !storeState.unlockedCars.includes(item.id)
          : !storeState.unlockedTrails.includes(item.id)
      );

      let targetItem: StoreItem | undefined;

      if (lockedInActiveTab.length > 0) {
        const randomIndex = Math.floor(Math.random() * lockedInActiveTab.length);
        targetItem = lockedInActiveTab[randomIndex];
      } else {
        // Priority 2: Other tab's locked items if active tab is complete
        const otherCategory: StoreCategory = currentTab === 'cars' ? 'trails' : 'cars';
        const otherCost = otherCategory === 'cars' ? UNLOCK_PRICE_CARS : UNLOCK_PRICE_TRAILS;
        if (playerCash < otherCost) {
          return { success: false, reason: 'insufficient_funds' };
        }
        const lockedInOtherTab = (otherCategory === 'cars' ? STORE_CARS : STORE_TRAILS).filter((item) =>
          otherCategory === 'cars'
            ? !storeState.unlockedCars.includes(item.id)
            : !storeState.unlockedTrails.includes(item.id)
        );

        if (lockedInOtherTab.length > 0) {
          const randomIndex = Math.floor(Math.random() * lockedInOtherTab.length);
          targetItem = lockedInOtherTab[randomIndex];
        }
      }

      if (!targetItem) {
        return { success: false, reason: 'all_unlocked' };
      }

      const finalCost = targetItem.category === 'cars' ? UNLOCK_PRICE_CARS : UNLOCK_PRICE_TRAILS;
      onDeductCash(-finalCost);

      const itemToUnlock = targetItem;
      setStoreState((prev) => {
        if (itemToUnlock.category === 'cars') {
          return {
            ...prev,
            unlockedCars: [...prev.unlockedCars, itemToUnlock.id],
            selectedCar: itemToUnlock.id
          };
        } else {
          return {
            ...prev,
            unlockedTrails: [...prev.unlockedTrails, itemToUnlock.id],
            selectedTrail: itemToUnlock.id
          };
        }
      });

      return { success: true, item: itemToUnlock };
    },
    [storeState]
  );

  const unlockSpecificItem = useCallback(
    (
      itemId: string,
      playerCash: number,
      onDeductCash: (amount: number) => void
    ): { success: boolean; item?: StoreItem; reason?: 'insufficient_funds' | 'already_unlocked' | 'not_found' } => {
      const allItems = [...STORE_CARS, ...STORE_TRAILS];
      const item = allItems.find((i) => i.id === itemId);
      if (!item) return { success: false, reason: 'not_found' };

      const isUnlocked =
        item.category === 'cars'
          ? storeState.unlockedCars.includes(itemId)
          : storeState.unlockedTrails.includes(itemId);

      if (isUnlocked) return { success: false, reason: 'already_unlocked' };

      const price = item.price > 0 ? item.price : (item.category === 'cars' ? UNLOCK_PRICE_CARS : UNLOCK_PRICE_TRAILS);
      if (playerCash < price) {
        return { success: false, reason: 'insufficient_funds' };
      }

      onDeductCash(-price);

      setStoreState((prev) => {
        if (item.category === 'cars') {
          return {
            ...prev,
            unlockedCars: [...prev.unlockedCars, item.id],
            selectedCar: item.id
          };
        } else {
          return {
            ...prev,
            unlockedTrails: [...prev.unlockedTrails, item.id],
            selectedTrail: item.id
          };
        }
      });

      return { success: true, item };
    },
    [storeState]
  );

  const hydrateStoreState = useCallback((cloudStore: Partial<GameStoreState>) => {
    if (!cloudStore || typeof cloudStore !== 'object') return;
    setStoreState((prev) => {
      const cloudCars = Array.isArray(cloudStore.unlockedCars)
        ? cloudStore.storeVersion === STORE_VERSION
          ? cloudStore.unlockedCars
          : cloudStore.unlockedCars.filter((carId) => !CARS_TO_RELOCK.has(carId))
        : [];
      const mergedCars = Array.from(new Set([...prev.unlockedCars, ...cloudCars]));
      const mergedTrails = Array.from(new Set([...prev.unlockedTrails, ...(cloudStore.unlockedTrails || [])]));
      const selectedCar =
        cloudStore.selectedCar && mergedCars.includes(cloudStore.selectedCar)
          ? cloudStore.selectedCar
          : prev.selectedCar;
      const selectedTrail =
        cloudStore.selectedTrail && mergedTrails.includes(cloudStore.selectedTrail)
          ? cloudStore.selectedTrail
          : prev.selectedTrail;

      const next: GameStoreState = {
        storeVersion: STORE_VERSION,
        unlockedCars: mergedCars.length > 0 ? mergedCars : prev.unlockedCars,
        selectedCar,
        unlockedTrails: mergedTrails.length > 0 ? mergedTrails : prev.unlockedTrails,
        selectedTrail
      };
      try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return {
    storeState,
    selectCar,
    selectTrail,
    unlockRandomItem,
    unlockSpecificItem,
    hydrateStoreState
  };
}
