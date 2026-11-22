import { useRef, useCallback, useEffect } from 'react';
import { youtubePlayables } from '../services/youtubePlayables';

// Configurable ad frequency caps
const LEVELS_PER_INTERSTITIAL = 3;
const MIN_INTERSTITIAL_COOLDOWN_MS = 25000; // Minimum 25s between any interstitials

export function useAdManager() {
  const levelsCompletedCountRef = useRef(0);
  const lastInterstitialTimeRef = useRef(0);

  // Synchronize cooldown timer when any ad (interstitial or rewarded) starts playing
  useEffect(() => {
    return youtubePlayables.onAdStateChange((isPlaying) => {
      if (isPlaying) {
        lastInterstitialTimeRef.current = Date.now();
      }
    });
  }, []);

  /**
   * Safe helper to request an interstitial with cooldown protection.
   */
  const triggerInterstitial = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    if (now - lastInterstitialTimeRef.current < MIN_INTERSTITIAL_COOLDOWN_MS) {
      return false;
    }
    const shown = await youtubePlayables.requestInterstitialAd();
    if (shown) {
      lastInterstitialTimeRef.current = Date.now();
    }
    return shown;
  }, []);

  /**
   * Called when a level is completed and player transitions to the next level.
   * Shows an interstitial every N levels.
   */
  const handleLevelProgressionAd = useCallback(async (): Promise<boolean> => {
    levelsCompletedCountRef.current += 1;

    if (levelsCompletedCountRef.current >= LEVELS_PER_INTERSTITIAL) {
      levelsCompletedCountRef.current = 0;
      return triggerInterstitial();
    }
    return false;
  }, [triggerInterstitial]);

  /**
   * Helper to request rewarded ad for specific reward identifier.
   */
  const triggerRewardedAd = useCallback(async (rewardId: string): Promise<boolean> => {
    return youtubePlayables.requestRewardedAd(rewardId);
  }, []);

  return {
    handleLevelProgressionAd,
    triggerInterstitial,
    triggerRewardedAd
  };
}

