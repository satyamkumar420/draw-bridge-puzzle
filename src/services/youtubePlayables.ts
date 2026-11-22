import { safeStorage } from './storage';
import { getUrlLanguageParam } from '../i18n/languages';

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

export type SdkCallback = () => void;
export type AudioCallback = (enabled: boolean) => void;

class GameLifecycleService {
  private isPlatformPaused = false;
  private isPlatformAudioEnabled = true;
  private pauseListeners: Set<SdkCallback> = new Set();
  private resumeListeners: Set<SdkCallback> = new Set();
  private audioListeners: Set<AudioCallback> = new Set();
  private languageListeners: Set<(locale: string) => void> = new Set();
  private adStateListeners: Set<(isPlaying: boolean) => void> = new Set();
  private cachedCloudData: PlayerCloudSaveData | null = null;
  private isDataLoaded = false;

  constructor() {
    this.init();
  }

  public init(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.isPlatformPaused = true;
          this.pauseListeners.forEach((cb) => {
            try { cb(); } catch (err) { console.error('Error in onPause listener', err); }
          });
        } else {
          this.isPlatformPaused = false;
          this.resumeListeners.forEach((cb) => {
            try { cb(); } catch (err) { console.error('Error in onResume listener', err); }
          });
        }
      });
    }
  }

  public firstFrameReady(): void {}
  public gameReady(): void {}

  public getIsPaused(): boolean {
    return this.isPlatformPaused;
  }

  public isAudioEnabled(): boolean {
    return this.isPlatformAudioEnabled;
  }

  public getIsAdPlaying(): boolean {
    return false;
  }

  public onPause(callback: SdkCallback): () => void {
    this.pauseListeners.add(callback);
    return () => this.pauseListeners.delete(callback);
  }

  public onResume(callback: SdkCallback): () => void {
    this.resumeListeners.add(callback);
    return () => this.resumeListeners.delete(callback);
  }

  public onAudioEnabledChange(callback: AudioCallback): () => void {
    this.audioListeners.add(callback);
    return () => this.audioListeners.delete(callback);
  }

  public onLanguageChange(callback: (locale: string) => void): () => void {
    this.languageListeners.add(callback);
    return () => this.languageListeners.delete(callback);
  }

  public onAdStateChange(callback: (isPlaying: boolean) => void): () => void {
    this.adStateListeners.add(callback);
    return () => this.adStateListeners.delete(callback);
  }

  public async sendScore(score: number): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('score_sent', { detail: { score } }));
      } catch {
        // ignore
      }
    }
  }

  public async getLanguage(): Promise<string> {
    const urlLang = getUrlLanguageParam();
    if (urlLang) return urlLang;

    if (typeof window !== 'undefined') {
      const saved = safeStorage.getItem('game_language');
      if (saved && saved.trim().length > 0) return saved.trim();
    }

    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language;
    }
    return 'en';
  }

  public async saveData(data: PlayerCloudSaveData): Promise<void> {
    this.cachedCloudData = {
      ...this.cachedCloudData,
      ...data,
      updatedAt: Date.now()
    };
    try {
      safeStorage.setItem('drawbridge_cloud_save', JSON.stringify(this.cachedCloudData));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }

  public async loadData(_timeoutMs?: number): Promise<PlayerCloudSaveData | null> {
    if (this.cachedCloudData && this.isDataLoaded) {
      return this.cachedCloudData;
    }

    try {
      const raw = safeStorage.getItem('drawbridge_cloud_save');
      if (raw) {
        this.cachedCloudData = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load from localStorage', e);
    }

    this.isDataLoaded = true;
    return this.cachedCloudData;
  }

  public logError(): void {}
  public logWarning(): void {}

  public async requestInterstitialAd(): Promise<boolean> {
    this.refocusGame();
    return true;
  }

  public async requestRewardedAd(_rewardId = 'reward'): Promise<boolean> {
    this.refocusGame();
    return true;
  }

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
      // ignore
    }
  }
}

export const youtubePlayables = new GameLifecycleService();
