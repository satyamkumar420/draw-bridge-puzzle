/**
 * Safe Storage wrapper with in-memory fallback.
 * Prevents "TypeError: Cannot read properties of null (reading 'getItem')"
 * in sandboxed iframes (such as YouTube Playables, private browsing, or restrictive webviews).
 */
class SafeStorage {
  private memoryStore = new Map<string, string>();
  private storageAvailable: boolean | null = null;

  private checkAvailability(): boolean {
    if (this.storageAvailable !== null) {
      return this.storageAvailable;
    }

    try {
      if (typeof window === 'undefined') {
        this.storageAvailable = false;
        return false;
      }
      if (!window.localStorage) {
        this.storageAvailable = false;
        return false;
      }
      const testKey = '__storage_probe__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      this.storageAvailable = true;
      return true;
    } catch {
      this.storageAvailable = false;
      return false;
    }
  }

  public getItem(key: string): string | null {
    try {
      if (this.checkAvailability()) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fallback to memory
    }
    return this.memoryStore.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    const stringVal = String(value);
    this.memoryStore.set(key, stringVal);

    try {
      if (this.checkAvailability()) {
        window.localStorage.setItem(key, stringVal);
      }
    } catch {
      // Memory store is already updated
    }
  }

  public removeItem(key: string): void {
    this.memoryStore.delete(key);

    try {
      if (this.checkAvailability()) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Memory store is already updated
    }
  }

  public clear(): void {
    this.memoryStore.clear();

    try {
      if (this.checkAvailability()) {
        window.localStorage.clear();
      }
    } catch {
      // Memory store is already cleared
    }
  }
}

export const safeStorage = new SafeStorage();
