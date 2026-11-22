/**
 * Asset Manager Service for Preloading & Caching Images, Audio, and Fonts.
 * Ensures zero-latency rendering, eliminates pop-in, and optimizes 60fps performance.
 */
import { audio, AUDIO_FILES } from './audioService.ts';

export interface VehicleSkinAssets {
  body: HTMLImageElement;
  wheel: HTMLImageElement;
}

export const VEHICLE_IMAGE_PATHS: Record<string, { body: string; wheel: string }> = {
  smart_car: {
    body: './vehicles/blue_coupe_body.png',
    wheel: './vehicles/blue_coupe_wheel.png'
  },
  sports_coupe: {
    body: './vehicles/sports_coupe_body.png',
    wheel: './vehicles/sports_coupe_wheel.png'
  },
  delivery_truck: {
    body: './vehicles/delivery_truck_body.png',
    wheel: './vehicles/delivery_truck_wheel.png'
  },
  army_truck: {
    body: './vehicles/army_truck_body.png',
    wheel: './vehicles/army_truck_wheel.png'
  },
  dirt_bike: {
    body: './vehicles/dirt_bike_body.png',
    wheel: './vehicles/dirt_bike_wheel.png'
  },
  super_bike: {
    body: './vehicles/super_bike_body.png',
    wheel: './vehicles/super_bike_wheel.png'
  }
};

export const UI_IMAGE_PATHS: Record<string, string> = {
  cash: './assets/game_cash.png',
  level_complete: './assets/level_complete.png',
  logo: './logo.webp',
  favicon: './favicon.svg'
};

export const FONT_FAMILIES = ['Lilita One', 'Fredoka', 'Titan One'] as const;

class AssetManager {
  private images = new Map<string, HTMLImageElement>();
  private isPreloading = false;
  private isPreloaded = false;
  private preloadProgress = 0;

  /**
   * Preload a single image with GPU decode acceleration and fallbacks
   */
  public async preloadImage(url: string, key?: string): Promise<HTMLImageElement | null> {
    if (typeof window === 'undefined') return null;

    const cacheKey = key || url;
    if (this.images.has(cacheKey)) {
      return this.images.get(cacheKey)!;
    }

    return new Promise((resolve) => {
      const img = new Image();
      let isSettled = false;

      const finish = () => {
        if (isSettled) return;
        isSettled = true;
        this.images.set(cacheKey, img);
        resolve(img);
      };

      const fail = () => {
        if (isSettled) return;
        isSettled = true;
        // Even on fail, store img object to prevent re-fetching loops
        this.images.set(cacheKey, img);
        resolve(img);
      };

      img.src = url;

      if (img.complete && img.naturalWidth > 0) {
        finish();
        return;
      }

      // img.decode() forces asynchronous decompression into GPU memory
      if (typeof img.decode === 'function') {
        img.decode().then(finish).catch(finish);
      } else {
        img.onload = finish;
        img.onerror = fail;
      }

      // Safety timeout per image (1.5s)
      setTimeout(finish, 1500);
    });
  }

  /**
   * Preload all vehicle body and wheel images
   */
  public async preloadVehicleImages(onItemLoaded?: () => void): Promise<void> {
    if (typeof window === 'undefined') return;

    const promises: Promise<HTMLImageElement | null>[] = [];

    for (const [carId, paths] of Object.entries(VEHICLE_IMAGE_PATHS)) {
      promises.push(
        this.preloadImage(paths.body, `${carId}_body`).then((res) => {
          onItemLoaded?.();
          return res;
        })
      );
      promises.push(
        this.preloadImage(paths.wheel, `${carId}_wheel`).then((res) => {
          onItemLoaded?.();
          return res;
        })
      );
    }

    await Promise.allSettled(promises);
  }

  /**
   * Preload all UI images (logo, badges, icons)
   */
  public async preloadUiImages(onItemLoaded?: () => void): Promise<void> {
    if (typeof window === 'undefined') return;

    const promises = Object.entries(UI_IMAGE_PATHS).map(([key, url]) =>
      this.preloadImage(url, key).then((res) => {
        onItemLoaded?.();
        return res;
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Preload critical game typography into font cache
   */
  public async preloadFonts(onItemLoaded?: () => void): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const fontSet = document.fonts;
    if (!fontSet) {
      onItemLoaded?.();
      return;
    }

    try {
      const fontPromises = FONT_FAMILIES.map(async (family) => {
        try {
          await fontSet.load(`16px "${family}"`);
        } catch {
          // Ignore individual font failure
        } finally {
          onItemLoaded?.();
        }
      });

      await Promise.allSettled(fontPromises);
      await fontSet.ready;
    } catch {
      // Gracefully continue
    }
  }

  /**
   * Preload all audio effects and vehicle sounds via AudioService
   */
  public async preloadAudio(onItemLoaded?: () => void): Promise<void> {
    if (typeof window === 'undefined') return;
    await audio.preloadAll(onItemLoaded);
  }

  /**
   * Master Preload Method: Preloads Images, Audio, and Fonts simultaneously.
   * Tracks holistic progress from 0.0 to 1.0 (0% to 100%).
   */
  public async preloadAll(onProgress?: (progress: number) => void): Promise<void> {
    if (typeof window === 'undefined') {
      this.isPreloaded = true;
      this.preloadProgress = 1.0;
      onProgress?.(1.0);
      return;
    }

    if (this.isPreloaded) {
      onProgress?.(1.0);
      return;
    }

    if (this.isPreloading) {
      return;
    }

    this.isPreloading = true;

    // Total asset count: 12 vehicle images + 4 UI images + 14 audio files + 3 fonts = 33 assets
    const vehicleCount = Object.keys(VEHICLE_IMAGE_PATHS).length * 2;
    const uiCount = Object.keys(UI_IMAGE_PATHS).length;
    const audioCount = AUDIO_FILES.length;
    const fontCount = FONT_FAMILIES.length;
    const totalAssets = vehicleCount + uiCount + audioCount + fontCount;

    let loadedCount = 0;
    const stepProgress = () => {
      loadedCount++;
      const ratio = Math.min(1.0, loadedCount / totalAssets);
      this.preloadProgress = ratio;
      onProgress?.(ratio);
    };

    // Fail-safe timeout: never block player loading for more than 2.5s
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2500);
    });

    const loadWork = Promise.allSettled([
      this.preloadVehicleImages(stepProgress),
      this.preloadUiImages(stepProgress),
      this.preloadAudio(stepProgress),
      this.preloadFonts(stepProgress)
    ]);

    await Promise.race([loadWork, timeoutPromise]);

    this.isPreloaded = true;
    this.isPreloading = false;
    this.preloadProgress = 1.0;
    onProgress?.(1.0);
  }

  /**
   * Retrieve cached HTMLImageElement
   */
  public getImage(keyOrUrl: string): HTMLImageElement | null {
    return this.images.get(keyOrUrl) || null;
  }

  /**
   * Retrieve vehicle body and wheel skin image assets
   */
  public getVehicleSkin(carId: string): VehicleSkinAssets | null {
    const key = VEHICLE_IMAGE_PATHS[carId] ? carId : 'smart_car';
    const body = this.images.get(`${key}_body`);
    const wheel = this.images.get(`${key}_wheel`);

    if (body && wheel) {
      return { body, wheel };
    }
    return null;
  }

  public isReady(): boolean {
    return this.isPreloaded;
  }

  public getProgress(): number {
    return this.preloadProgress;
  }
}

export const assetManager = new AssetManager();
