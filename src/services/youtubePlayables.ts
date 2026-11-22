import type { YouTubePlayablesSDK, YtGameAudioCallback, YtGameSdkCallback } from '../types/ytgame';
import { safeStorage } from './storage.ts';
import { getUrlLanguageParam } from '../i18n/languages.ts';

export interface PlayerCloudSaveData {
  unlockedIndex: number;
  cash: number;
  storeState?: {
    storeVersion?: number;
    unlockedCars: string[];
    selectedCar: string;
    unlockedTrails: string[];
    selectedTrail: string;
  };
  soundEnabled?: boolean;
  language?: string;
  updatedAt?: number;
}

class YouTubePlayablesService {
  private isFirstFrameReadySent = false;
  private isGameReadySent = false;
  private isPlatformAudioEnabled = true;
  private isPlatformPaused = false;

  private pauseListeners: Set<YtGameSdkCallback> = new Set();
  private resumeListeners: Set<YtGameSdkCallback> = new Set();
  private audioListeners: Set<YtGameAudioCallback> = new Set();
  private languageListeners: Set<(locale: string) => void> = new Set();

  private sdkRef: YouTubePlayablesSDK | null = null;
  private initialized = false;
  private cachedCloudData: PlayerCloudSaveData | null = null;
  private lastSentScore: number | null = null;
  private lastSentScoreTime = 0;

  constructor() {
    this.init();
  }

  /**
   * Initializes SDK listeners and hooks.
   */
  public init(): void {
    if (this.initialized) return;

    const sdk = this.sdkRef || (typeof window !== 'undefined' ? window.ytgame : null);
    if (sdk) {
      this.sdkRef = sdk;
      this.initialized = true;

      // Read initial audio state
      try {
        if (typeof this.sdkRef.system?.isAudioEnabled === 'function') {
          this.isPlatformAudioEnabled = this.sdkRef.system.isAudioEnabled();
        }
      } catch (e) {
        console.warn('Failed to query initial audio state from YouTube SDK', e);
      }

      // Register system pause listener
      try {
        this.sdkRef.system?.onPause(() => {
          this.isPlatformPaused = true;
          this.pauseListeners.forEach((cb) => {
            try {
              cb();
            } catch (err) {
              console.error('Error in onPause listener', err);
            }
          });
        });
      } catch (e) {
        console.warn('Failed to bind onPause in YouTube SDK', e);
      }

      // Register system resume listener
      try {
        this.sdkRef.system?.onResume(() => {
          this.isPlatformPaused = false;
          this.resumeListeners.forEach((cb) => {
            try {
              cb();
            } catch (err) {
              console.error('Error in onResume listener', err);
            }
          });
        });
      } catch (e) {
        console.warn('Failed to bind onResume in YouTube SDK', e);
      }

      // Register system audio state change listener
      try {
        this.sdkRef.system?.onAudioEnabledChange((enabled: boolean) => {
          this.isPlatformAudioEnabled = enabled;
          this.audioListeners.forEach((cb) => {
            try {
              cb(enabled);
            } catch (err) {
              console.error('Error in onAudioEnabledChange listener', err);
            }
          });
        });
      } catch (e) {
        console.warn('Failed to bind onAudioEnabledChange in YouTube SDK', e);
      }

      // Register system language change listener if available
      try {
        const sys = this.sdkRef.system as any;
        if (typeof sys?.onLanguageChange === 'function') {
          sys.onLanguageChange((locale: string) => {
            if (locale) {
              this.languageListeners.forEach((cb) => {
                try {
                  cb(locale);
                } catch (err) {
                  console.error('Error in onLanguageChange listener', err);
                }
              });
            }
          });
        }
      } catch (e) {
        console.warn('Failed to bind onLanguageChange in YouTube SDK', e);
      }
    }
  }

  /**
   * Check if running in active YouTube Playables environment
   */
  public isLoaded(): boolean {
    const sdk = this.getSdk();
    return Boolean(sdk && sdk.IN_PLAYABLES_ENV);
  }

  /**
   * Called as soon as the first frame (loading screen) begins rendering.
   */
  public firstFrameReady(): void {
    if (this.isFirstFrameReadySent) return;

    this.isFirstFrameReadySent = true;
    const sdk = this.getSdk();
    if (sdk?.game?.firstFrameReady) {
      try {
        sdk.game.firstFrameReady();
      } catch (e) {
        console.error('Failed to signal firstFrameReady to YouTube SDK', e);
      }
    }
  }

  /**
   * Called when game is fully loaded, assets ready, and user can interact.
   */
  public gameReady(): void {
    if (this.isGameReadySent) return;

    if (!this.isFirstFrameReadySent) {
      console.warn('gameReady called before firstFrameReady; triggering firstFrameReady now');
      this.firstFrameReady();
    }

    this.isGameReadySent = true;
    const sdk = this.getSdk();
    if (sdk?.game?.gameReady) {
      try {
        sdk.game.gameReady();
      } catch (e) {
        console.error('Failed to signal gameReady to YouTube SDK', e);
      }
    }
  }

  public getIsFirstFrameReady(): boolean {
    return this.isFirstFrameReadySent;
  }

  public getIsGameReady(): boolean {
    return this.isGameReadySent;
  }

  /**
   * Returns current audio state. Uses cached value seeded once on boot
   * and synchronized via onAudioEnabledChange listener to prevent repeated SDK polling.
   */
  public isAudioEnabled(): boolean {
    return this.isPlatformAudioEnabled;
  }

  public getIsPaused(): boolean {
    return this.isPlatformPaused;
  }

  public onPause(callback: YtGameSdkCallback): () => void {
    this.pauseListeners.add(callback);
    return () => this.pauseListeners.delete(callback);
  }

  public onResume(callback: YtGameSdkCallback): () => void {
    this.resumeListeners.add(callback);
    return () => this.resumeListeners.delete(callback);
  }

  public onAudioEnabledChange(callback: YtGameAudioCallback): () => void {
    this.audioListeners.add(callback);
    return () => this.audioListeners.delete(callback);
  }

  public onLanguageChange(callback: (locale: string) => void): () => void {
    this.languageListeners.add(callback);
    return () => this.languageListeners.delete(callback);
  }

  /**
   * Send the player's best score / progression to YouTube.
   */
  public async sendScore(score: number): Promise<void> {
    if (typeof score !== 'number' || isNaN(score) || !isFinite(score)) {
      console.warn('Invalid score value passed to sendScore', score);
      return;
    }

    const rounded = Math.round(score);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Prevent duplicate rapid submissions of identical score within 1s
    if (this.lastSentScore === rounded && now - this.lastSentScoreTime < 1000) {
      return;
    }

    this.lastSentScore = rounded;
    this.lastSentScoreTime = now;

    const sdk = this.getSdk();
    if (sdk?.engagement?.sendScore) {
      try {
        await sdk.engagement.sendScore({ value: rounded });
      } catch (err) {
        console.error('Failed to submit score to YouTube Playables', err);
        this.logError();
      }
    }

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('score_sent', { detail: { score: rounded } }));
      } catch {
        // ignore
      }
    }
  }

  /**
   * Get user's preferred YouTube Playables language via URL parameter, ytgame.system.getLanguage(), or navigator
   * Returns BCP-47 tag string (e.g. 'en-US', 'hi-IN', 'zh-Hans', 'ja-JP', etc.)
   */
  public async getLanguage(): Promise<string> {
    // 1. Check URL parameters first (?lang=, ?locale=, ?hl=, ?language=)
    const urlLang = getUrlLanguageParam();
    if (urlLang) {
      return urlLang;
    }

    // 2. Query YouTube Playables SDK system language
    const sdk = this.getSdk();
    if (sdk?.system?.getLanguage) {
      try {
        const lang = await sdk.system.getLanguage();
        if (typeof lang === 'string' && lang.trim().length > 0) {
          return lang.trim();
        }
      } catch (e) {
        console.warn('Failed to query language from YouTube SDK', e);
      }
    }

    // 3. Fallback to navigator.language
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language;
    }

    return 'en';
  }

  private isDataLoaded = false;
  private loadDataPromise: Promise<PlayerCloudSaveData | null> | null = null;

  /**
   * Sanitizes string to ensure valid UTF-16 encoding without lone surrogates.
   */
  public sanitizeUtf16(jsonString: string): string {
    const loneHighSurrogate = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g;
    const loneLowSurrogate = /(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
    return jsonString.replace(loneHighSurrogate, '').replace(loneLowSurrogate, '');
  }

  /**
   * Saves game progress to YouTube Cloud Storage.
   * Strips any editor / developer configs to strictly preserve player data only.
   * NOTE: Language is only saved if explicitly changed by user or previously saved in cloud data.
   */
  public async saveData(data: PlayerCloudSaveData): Promise<void> {
    const sdk = this.getSdk();
    if (!sdk?.game?.saveData) return;

    // Strict YouTube Playables requirement: Must await loadData() completion before calling saveData()
    if (!this.isDataLoaded) {
      if (this.loadDataPromise) {
        await this.loadDataPromise;
      } else {
        await this.loadData();
      }
    }

    // Determine language: Only persist language if user has manually changed/overridden it
    let resolvedLanguage: string | undefined = undefined;
    if (typeof data.language === 'string' && data.language.trim().length > 0) {
      resolvedLanguage = data.language.trim();
    } else if (typeof this.cachedCloudData?.language === 'string' && this.cachedCloudData.language.trim().length > 0) {
      resolvedLanguage = this.cachedCloudData.language.trim();
    } else if (typeof window !== 'undefined') {
      const hasManual = safeStorage.getItem('game_language_manual_override');
      if (hasManual) {
        const saved = safeStorage.getItem('game_language');
        if (saved && saved.trim().length > 0) {
          resolvedLanguage = saved.trim();
        }
      }
    }

    // Filter out developer editor configurations
    const sanitizedData: PlayerCloudSaveData = {
      unlockedIndex: typeof data.unlockedIndex === 'number' ? data.unlockedIndex : (this.cachedCloudData?.unlockedIndex ?? 0),
      cash: typeof data.cash === 'number' ? data.cash : (this.cachedCloudData?.cash ?? 0),
      storeState: data.storeState
        ? {
            storeVersion: typeof data.storeState.storeVersion === 'number' ? data.storeState.storeVersion : 0,
            unlockedCars: Array.isArray(data.storeState.unlockedCars) ? data.storeState.unlockedCars : ['smart_car'],
            selectedCar: typeof data.storeState.selectedCar === 'string' ? data.storeState.selectedCar : 'smart_car',
            unlockedTrails: Array.isArray(data.storeState.unlockedTrails) ? data.storeState.unlockedTrails : ['none'],
            selectedTrail: typeof data.storeState.selectedTrail === 'string' ? data.storeState.selectedTrail : 'none'
          }
        : (this.cachedCloudData?.storeState ?? undefined),
      soundEnabled: typeof data.soundEnabled === 'boolean' ? data.soundEnabled : (this.cachedCloudData?.soundEnabled ?? true),
      ...(resolvedLanguage ? { language: resolvedLanguage } : {}),
      updatedAt: Date.now()
    };

    this.cachedCloudData = sanitizedData;

    try {
      const rawJson = JSON.stringify(sanitizedData);
      const cleanUtf16 = this.sanitizeUtf16(rawJson);

      // YouTube Playables 3 MiB data ceiling check
      const byteLength = new TextEncoder().encode(cleanUtf16).length;
      if (byteLength > 3 * 1024 * 1024) {
        console.error('Save data exceeds 3 MiB YouTube limit');
        this.logError();
        return;
      }

      await sdk.game.saveData(cleanUtf16);
    } catch (e) {
      console.error('Failed to save data to YouTube Playables cloud', e);
      this.logError();
    }
  }

  /**
   * Loads game progress from YouTube Cloud Storage with timeout safety.
   */
  public async loadData(timeoutMs = 1200): Promise<PlayerCloudSaveData | null> {
    if (this.loadDataPromise) {
      return this.loadDataPromise;
    }

    const sdk = this.getSdk();
    if (!sdk?.game?.loadData) {
      this.isDataLoaded = true;
      return null;
    }

    this.loadDataPromise = (async () => {
      let loadPromise: Promise<string | null>;
      try {
        loadPromise = Promise.resolve(sdk.game.loadData());
      } catch (e) {
        console.warn('sdk.game.loadData() call failed synchronously', e);
        this.isDataLoaded = true;
        return null;
      }
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));

      try {
        const raw = await Promise.race([loadPromise, timeoutPromise]);
        if (typeof raw === 'string' && raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            const result: PlayerCloudSaveData = {
              unlockedIndex: typeof parsed.unlockedIndex === 'number' ? parsed.unlockedIndex : 0,
              cash: typeof parsed.cash === 'number' ? parsed.cash : 0,
              storeState: parsed.storeState,
              soundEnabled: parsed.soundEnabled,
              language: typeof parsed.language === 'string' && parsed.language.trim().length > 0 ? parsed.language.trim() : undefined,
              updatedAt: parsed.updatedAt
            };
            this.cachedCloudData = result;
            return result;
          }
        }
      } catch (e) {
        console.error('Failed to load data from YouTube Playables', e);
        this.logError();
      } finally {
        this.isDataLoaded = true;
      }
      return null;
    })();

    return this.loadDataPromise;
  }

  public logError(): void {
    const sdk = this.getSdk();
    try {
      sdk?.health?.logError();
    } catch {
      // ignore
    }
  }

  public logWarning(): void {
    const sdk = this.getSdk();
    try {
      sdk?.health?.logWarning();
    } catch {
      // ignore
    }
  }

  // ============================================================
  // Ads (Interstitial & Rewarded Video)
  // ============================================================

  private adStateListeners: Set<(isPlaying: boolean) => void> = new Set();
  private isAdPlaying = false;

  public getIsAdPlaying(): boolean {
    return this.isAdPlaying;
  }

  public onAdStateChange(callback: (isPlaying: boolean) => void): () => void {
    this.adStateListeners.add(callback);
    return () => this.adStateListeners.delete(callback);
  }

  public notifyAdState(isPlaying: boolean): void {
    this.isAdPlaying = isPlaying;
    this.adStateListeners.forEach((cb) => {
      try {
        cb(isPlaying);
      } catch (err) {
        console.error('Error in onAdStateChange listener', err);
      }
    });
  }

  /**
   * Request an interstitial ad between level changes or natural game breaks.
   */
  public async requestInterstitialAd(): Promise<boolean> {
    this.notifyAdState(true);
    const sdk = this.getSdk();
    try {
      if (sdk?.ads?.requestInterstitialAd) {
        await sdk.ads.requestInterstitialAd();
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Interstitial ad failed or unavailable', e);
      return false;
    } finally {
      this.notifyAdState(false);
      this.scheduleRefocus();
    }
  }

  /**
   * Request a rewarded video ad for in-game rewards (e.g. 2x cash multiplier, free cash).
   * Returns true if the user watched the ad and earned the reward.
   */
  public async requestRewardedAd(rewardId = 'reward'): Promise<boolean> {
    this.notifyAdState(true);
    const sdk = this.getSdk();
    try {
      if (!sdk?.ads?.requestRewardedAd) {
        // Standalone fallback: grant reward during local development/testing outside YouTube iframe
        return true;
      }
      const result: unknown = await sdk.ads.requestRewardedAd(rewardId);
      if (result === false) {
        return false;
      }
      if (typeof result === 'object' && result !== null && 'hasReward' in result) {
        return Boolean((result as { hasReward: boolean }).hasReward);
      }
      if (typeof result === 'boolean') {
        return result;
      }
      return true;
    } catch (e) {
      console.warn('Rewarded ad failed or closed without reward', e);
      return false;
    } finally {
      this.notifyAdState(false);
      this.scheduleRefocus();
    }
  }

  // ============================================================
  // Canvas Focus & Input Restoration Helper
  // ============================================================

  public refocusGame(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    try {
      if (!document.hasFocus()) {
        window.focus();
      }

      const canvas = document.querySelector('canvas.playable-canvas') || document.querySelector('canvas');
      if (canvas instanceof HTMLElement) {
        if (!canvas.hasAttribute('tabindex')) {
          canvas.setAttribute('tabindex', '0');
        }
        canvas.style.outline = 'none';
        canvas.focus({ preventScroll: true });
      } else if (document.body) {
        document.body.focus({ preventScroll: true });
      }
    } catch {
      // Silently ignore in restricted iframe environments
    }
  }

  public scheduleRefocus(): void {
    this.refocusGame();
    if (typeof window !== 'undefined') {
      setTimeout(() => this.refocusGame(), 50);
      setTimeout(() => this.refocusGame(), 150);
      setTimeout(() => this.refocusGame(), 300);
      setTimeout(() => this.refocusGame(), 600);
    }
  }

  /**
   * Helper for tests or late initialization
   */
  public setSdk(sdk: YouTubePlayablesSDK | null): void {
    this.sdkRef = sdk;
    this.initialized = false;
    this.init();
  }

  public resetStateForTesting(keepListeners = true): void {
    this.isFirstFrameReadySent = false;
    this.isGameReadySent = false;
    this.isPlatformAudioEnabled = true;
    this.isPlatformPaused = false;
    this.isDataLoaded = false;
    this.loadDataPromise = null;
    this.cachedCloudData = null;
    this.isAdPlaying = false;
    if (!keepListeners) {
      this.pauseListeners.clear();
      this.resumeListeners.clear();
      this.audioListeners.clear();
      this.languageListeners.clear();
      this.adStateListeners.clear();
    }
    this.initialized = false;
    this.sdkRef = null;
  }

  private getSdk(): YouTubePlayablesSDK | null {
    if (!this.sdkRef && typeof window !== 'undefined' && window.ytgame) {
      this.sdkRef = window.ytgame;
      this.init();
    }
    return this.sdkRef;
  }
}

export const youtubePlayables = new YouTubePlayablesService();
