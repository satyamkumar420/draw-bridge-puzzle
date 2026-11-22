/**
 * Web Audio API based Sound Service for YouTube Playables & Arcade Game Effects.
 * Supports pre-decoded AudioBuffer playback with procedural synthesis fallback,
 * respecting user sound preferences and YouTube Playables audio & pause contracts.
 */
import { youtubePlayables } from './youtubePlayables.ts';
import { safeStorage } from './storage.ts';

export const AUDIO_FILES = [
  'draw',
  'win',
  'blast',
  'drown',
  'button',
  'buy',
  'engine',
  'cash',
  'crash',
  'engine_smart_car',
  'engine_sports_coupe',
  'engine_delivery_truck',
  'engine_army_truck',
  'engine_dirt_bike',
  'engine_super_bike'
] as const;
export type AudioFileKey = (typeof AUDIO_FILES)[number];

export class AudioService {
  private ctx: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private rawBuffers: Map<string, ArrayBuffer> = new Map();
  private loadPromises: Map<string, Promise<AudioBuffer | null>> = new Map();

  private drawingSource: AudioBufferSourceNode | null = null;
  private drawingGain: GainNode | null = null;
  private isDrawingActive = false;

  private engineSource: AudioBufferSourceNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineActive = false;

  private victorySource: AudioBufferSourceNode | null = null;
  private victoryGain: GainNode | null = null;
  private victoryOscillators: OscillatorNode[] = [];
  private victoryGains: GainNode[] = [];
  private lastCashCollectTime = 0;

  constructor() {
    this.setupSdkListeners();
    this.setupAutoplayUnlock();
  }

  public setupSdkListeners(): void {
    youtubePlayables.onAudioEnabledChange((enabled) => {
      if (!enabled) {
        this.stopDrawing();
        this.stopEngine();
        this.stopVictory();
        this.suspend();
      } else if (this.isSoundEnabled()) {
        this.resume();
      }
    });

    youtubePlayables.onPause(() => {
      this.stopDrawing();
      this.stopEngine();
      this.stopVictory();
      this.suspend();
    });

    youtubePlayables.onResume(() => {
      if (this.isSoundEnabled()) {
        this.resume();
      }
    });

    youtubePlayables.onAdStateChange((isAdPlaying) => {
      if (isAdPlaying) {
        this.stopDrawing();
        this.stopEngine();
        this.stopVictory();
        this.suspend();
      } else if (this.isSoundEnabled()) {
        this.resume();
      }
    });
  }

  private setupAutoplayUnlock(): void {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (this.isSoundEnabled()) {
        this.initCtx();
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
  }

  public isSoundEnabled(): boolean {
    if (youtubePlayables.getIsPaused() || youtubePlayables.getIsAdPlaying()) return false;
    if (!youtubePlayables.isAudioEnabled()) return false;
    try {
      return safeStorage.getItem('game_sound_enabled') !== 'false';
    } catch {
      return true;
    }
  }

  public setSoundEnabled(enabled: boolean): void {
    try {
      safeStorage.setItem('game_sound_enabled', String(enabled));
    } catch {
      // ignore
    }
    if (!enabled) {
      this.stopDrawing();
      this.stopEngine();
      this.stopVictory();
      this.suspend();
    } else if (this.isSoundEnabled()) {
      this.resume();
    }
  }

  public suspend(): void {
    if (this.ctx && this.ctx.state === 'running') {
      try {
        this.ctx.suspend();
      } catch {
        // ignore
      }
    }
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        this.ctx.resume();
      } catch {
        // ignore
      }
    }
  }

  private isDecodingRaw = false;

  public initCtx(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
        this.preloadAllBuffers();
      }
    }
    if (this.ctx && this.rawBuffers.size > 0 && !this.isDecodingRaw) {
      this.isDecodingRaw = true;
      // Decode raw buffers asynchronously in background so we never block user touch/drawing response
      setTimeout(async () => {
        for (const [name, raw] of this.rawBuffers.entries()) {
          if (!this.buffers.has(name) && this.ctx) {
            try {
              const buf = await this.ctx.decodeAudioData(raw.slice(0));
              this.buffers.set(name, buf);
            } catch {
              // Ignore
            }
          }
        }
        this.isDecodingRaw = false;
      }, 60);
    }
    if (this.ctx && this.ctx.state === 'suspended' && this.isSoundEnabled()) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Preload all sound effects for zero-latency instant playback
   */
  public preloadAllBuffers(): void {
    AUDIO_FILES.forEach((name) => this.loadBuffer(name));
  }

  /**
   * Preload all audio assets asynchronously with progress reporting
   */
  public async preloadAll(onItemLoaded?: (name: string) => void): Promise<void> {
    if (typeof window === 'undefined') return;
    this.initCtx();
    const promises = AUDIO_FILES.map(async (name) => {
      try {
        await this.loadBuffer(name);
      } catch {
        // Continue gracefully
      } finally {
        onItemLoaded?.(name);
      }
    });
    await Promise.allSettled(promises);
  }

  public async loadBuffer(name: AudioFileKey | string): Promise<AudioBuffer | null> {
    if (this.buffers.has(name)) {
      return this.buffers.get(name)!;
    }
    if (this.loadPromises.has(name)) {
      return this.loadPromises.get(name)!;
    }

    const promise = (async () => {
      if (typeof window === 'undefined' || typeof fetch === 'undefined') return null;
      const ctx = this.initCtx();

      if (this.rawBuffers.has(name) && ctx) {
        try {
          const raw = this.rawBuffers.get(name)!;
          const audioBuf = await ctx.decodeAudioData(raw.slice(0));
          this.buffers.set(name, audioBuf);
          return audioBuf;
        } catch {
          // Fall through to fetch
        }
      }

      const baseUrls = [
        `./audio/${name}.ogg`,
        `/audio/${name}.ogg`,
        `./audio/${name}.mp3`,
        `/audio/${name}.mp3`
      ];

      for (const url of baseUrls) {
        try {
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const arrayBuf = await resp.arrayBuffer();
          this.rawBuffers.set(name, arrayBuf.slice(0));
          if (ctx) {
            try {
              const audioBuf = await ctx.decodeAudioData(arrayBuf);
              this.buffers.set(name, audioBuf);
              return audioBuf;
            } catch {
              // Could fail if ctx state restricts
            }
          }
          return null;
        } catch {
          // Try next path
        }
      }
      return null;
    })();

    this.loadPromises.set(name, promise);
    return promise;
  }

  private playBuffer(
    name: AudioFileKey | string,
    volume = 1.0,
    loop = false,
    playbackRate = 1.0
  ): AudioBufferSourceNode | null {
    if (!this.isSoundEnabled()) return null;
    const ctx = this.initCtx();
    if (!ctx) return null;

    const buffer = this.buffers.get(name);
    if (!buffer) {
      this.loadBuffer(name);
      return null;
    }

    try {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();

      source.buffer = buffer;
      source.loop = loop;
      source.playbackRate.value = playbackRate;
      gain.gain.setValueAtTime(Math.max(0, Math.min(volume, 1.0)), ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);

      source.start();
      return source;
    } catch {
      return null;
    }
  }

  // ==========================================
  // 1. DRAW BRIDGE SOUND (Motion-Responsive Loop)
  // ==========================================
  private isDrawingMuted = false;

  public startDrawing(): void {
    if (!this.isSoundEnabled()) return;
    if (this.isDrawingActive) {
      this.resumeDrawing();
      return;
    }
    const ctx = this.initCtx();
    if (!ctx) return;

    this.isDrawingActive = true;
    this.isDrawingMuted = false;
    const buffer = this.buffers.get('draw');

    if (buffer) {
      try {
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();

        source.buffer = buffer;
        source.loop = true;
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.04);

        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();

        this.drawingSource = source;
        this.drawingGain = gain;
        return;
      } catch {
        // Fallback to synth below
      }
    }

    this.startSyntheticDrawing(ctx);
  }

  private startSyntheticDrawing(ctx: AudioContext): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      this.drawingSource = osc as unknown as AudioBufferSourceNode;
      this.drawingGain = gain;
    } catch {
      // Ignore
    }
  }

  /**
   * Pauses/mutes the drawing sound when user halts pointer movement while still holding down.
   */
  public pauseDrawing(): void {
    if (!this.isDrawingActive || this.isDrawingMuted) return;
    this.isDrawingMuted = true;
    if (this.drawingGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.drawingGain.gain.setValueAtTime(this.drawingGain.gain.value, now);
        this.drawingGain.gain.linearRampToValueAtTime(0.0001, now + 0.04);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Un-mutes/resumes the drawing sound immediately when movement resumes.
   */
  public resumeDrawing(): void {
    if (!this.isSoundEnabled()) return;
    if (!this.isDrawingActive) {
      this.startDrawing();
      return;
    }
    if (this.isDrawingMuted && this.drawingGain && this.ctx) {
      this.isDrawingMuted = false;
      try {
        const now = this.ctx.currentTime;
        const targetVol = this.drawingSource instanceof OscillatorNode ? 0.08 : 0.35;
        this.drawingGain.gain.setValueAtTime(this.drawingGain.gain.value, now);
        this.drawingGain.gain.linearRampToValueAtTime(targetVol, now + 0.03);
      } catch {
        // Ignore
      }
    }
  }

  public updateDrawing(): void {
    this.resumeDrawing();
  }

  public stopDrawing(): void {
    this.isDrawingActive = false;
    this.isDrawingMuted = false;
    if (this.drawingSource && this.drawingGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.drawingGain.gain.setValueAtTime(this.drawingGain.gain.value, now);
        this.drawingGain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
        const src = this.drawingSource;
        setTimeout(() => {
          try {
            src.stop();
            src.disconnect();
          } catch {
            // Ignore
          }
        }, 60);
      } catch {
        // Ignore
      }
      this.drawingSource = null;
      this.drawingGain = null;
    }
  }

  // ==========================================
  // 2. VEHICLE ENGINE SOUND (Driving Loop)
  // ==========================================
  private activeCarId = 'smart_car';

  public startEngine(carId = 'smart_car'): void {
    if (!this.isSoundEnabled()) return;
    if (this.isEngineActive && this.activeCarId === carId) return;

    if (this.isEngineActive) {
      this.stopEngine();
    }

    const ctx = this.initCtx();
    if (!ctx) return;

    this.isEngineActive = true;
    this.activeCarId = carId;

    const targetKey = `engine_${carId}`;
    const buffer = this.buffers.get(targetKey) || this.buffers.get('engine') || this.buffers.get('engine_smart_car');

    if (buffer) {
      try {
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();

        source.buffer = buffer;
        source.loop = true;
        source.playbackRate.setValueAtTime(1.0, ctx.currentTime);

        const volume = 1.0;
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.1);

        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();

        this.engineSource = source;
        this.engineGain = gain;
        return;
      } catch {
        // Fallback to synth below
      }
    }

    this.startSyntheticEngine(ctx, carId);
  }

  private startSyntheticEngine(ctx: AudioContext, carId = 'smart_car'): void {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      const isBike = carId === 'dirt_bike' || carId === 'super_bike';
      const isTruck = carId === 'army_truck' || carId === 'delivery_truck';
      
      osc.type = isBike ? 'sawtooth' : isTruck ? 'square' : 'sawtooth';
      const baseFreq = isBike ? 130 : isTruck ? 52 : 75;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      this.engineSource = osc as unknown as AudioBufferSourceNode;
      this.engineGain = gain;
    } catch {
      // Ignore
    }
  }

  public updateEngine(speedRatio = 0.5, carId = 'smart_car'): void {
    if ((!this.isEngineActive || this.activeCarId !== carId) && this.isSoundEnabled()) {
      this.startEngine(carId);
    }
    if (this.engineSource && this.ctx) {
      try {
        const clampedRatio = Math.max(0, Math.min(1.5, speedRatio));
        const isBike = carId === 'dirt_bike' || carId === 'super_bike';
        const isSports = carId === 'sports_coupe';
        const isSmart = carId === 'smart_car';
        
        let rate = 0.88 + clampedRatio * 0.52;
        if (isBike) {
          rate = 0.95 + clampedRatio * 0.65;
        } else if (isSports || isSmart) {
          rate = 0.92 + clampedRatio * 0.55;
        }
        this.engineSource.playbackRate.setValueAtTime(rate, this.ctx.currentTime);
      } catch {
        // Ignore
      }
    }
  }

  public stopEngine(): void {
    this.isEngineActive = false;
    if (this.engineSource && this.engineGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.engineGain.gain.setValueAtTime(this.engineGain.gain.value, now);
        this.engineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        const src = this.engineSource;
        setTimeout(() => {
          try {
            src.stop();
            src.disconnect();
          } catch {
            // Ignore
          }
        }, 90);
      } catch {
        // Ignore
      }
      this.engineSource = null;
      this.engineGain = null;
    }
  }

  // ==========================================
  // 3. WINNING SOUND
  // ==========================================
  public playVictory(): void {
    if (!this.isSoundEnabled()) return;
    this.stopVictory();

    const ctx = this.initCtx();
    if (!ctx) return;

    const buffer = this.buffers.get('win');
    if (buffer) {
      try {
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();

        source.buffer = buffer;
        source.loop = false;
        gain.gain.setValueAtTime(0.75, ctx.currentTime);

        source.connect(gain);
        gain.connect(ctx.destination);

        source.onended = () => {
          if (this.victorySource === source) {
            this.victorySource = null;
            this.victoryGain = null;
          }
        };

        source.start();
        this.victorySource = source;
        this.victoryGain = gain;
        return;
      } catch {
        // Fallback to synth below
      }
    } else {
      this.loadBuffer('win');
    }

    this.synthesizeVictory(ctx);
  }

  public playWin(): void {
    this.playVictory();
  }

  private synthesizeVictory(ctx: AudioContext): void {
    // Rich celebratory major arpeggio + resolution chord (C4, E4, G4, C5, E5, C6)
    const melody = [
      { f: 261.63, t: 0.0, d: 0.18, vol: 0.22 },
      { f: 329.63, t: 0.12, d: 0.18, vol: 0.22 },
      { f: 392.00, t: 0.24, d: 0.20, vol: 0.24 },
      { f: 523.25, t: 0.38, d: 0.75, vol: 0.28 },
      { f: 659.25, t: 0.40, d: 0.70, vol: 0.20 },
      { f: 1046.5, t: 0.42, d: 0.60, vol: 0.12 }
    ];

    melody.forEach(({ f, t, d, vol }) => {
      try {
        const now = ctx.currentTime + t;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + d);

        this.victoryOscillators.push(osc);
        this.victoryGains.push(gain);

        osc.onended = () => {
          this.victoryOscillators = this.victoryOscillators.filter((o) => o !== osc);
          this.victoryGains = this.victoryGains.filter((g) => g !== gain);
        };
      } catch {
        // Ignore
      }
    });
  }

  public stopVictory(): void {
    if (this.victorySource && this.victoryGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.victoryGain.gain.setValueAtTime(this.victoryGain.gain.value, now);
        this.victoryGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        const src = this.victorySource;
        setTimeout(() => {
          try {
            src.stop();
            src.disconnect();
          } catch {
            // Ignore
          }
        }, 60);
      } catch {
        // Ignore
      }
      this.victorySource = null;
      this.victoryGain = null;
    }

    if (this.victoryOscillators.length > 0) {
      this.victoryOscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // Ignore
        }
      });
      this.victoryOscillators = [];
    }

    if (this.victoryGains.length > 0) {
      this.victoryGains.forEach((gain) => {
        try {
          gain.disconnect();
        } catch {
          // Ignore
        }
      });
      this.victoryGains = [];
    }
  }

  public stopWin(): void {
    this.stopVictory();
  }

  // ==========================================
  // 4. BLAST / EXPLOSION SOUND
  // ==========================================
  public playBlast(): void {
    if (!this.isSoundEnabled()) return;
    const played = this.playBuffer('blast', 0.9);
    if (!played) {
      this.synthesizeBlast();
    }
  }

  private synthesizeBlast(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.35);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  // ==========================================
  // 5. WATER DROWNING / SPLASH SOUND
  // ==========================================
  public playDrown(): void {
    if (!this.isSoundEnabled()) return;
    const played = this.playBuffer('drown', 0.9);
    if (!played) {
      this.synthesizeDrown();
    }
  }

  private synthesizeDrown(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(480, now);
    osc1.frequency.exponentialRampToValueAtTime(140, now + 0.25);

    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    [0.1, 0.22, 0.38].forEach((offset, idx) => {
      const bNow = now + offset;
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(320 + idx * 80, bNow);
      bOsc.frequency.exponentialRampToValueAtTime(540 + idx * 90, bNow + 0.1);

      bGain.gain.setValueAtTime(0.18, bNow);
      bGain.gain.exponentialRampToValueAtTime(0.001, bNow + 0.1);

      bOsc.connect(bGain);
      bGain.connect(ctx.destination);
      bOsc.start(bNow);
      bOsc.stop(bNow + 0.1);
    });
  }

  // ==========================================
  // 6. BUTTON POP & BUY SOUNDS
  // ==========================================
  public playPop(): void {
    if (!this.isSoundEnabled()) return;
    const played = this.playBuffer('button', 0.6);
    if (!played) {
      this.synthesizePop();
    }
  }

  public playBuy(): void {
    if (!this.isSoundEnabled()) return;
    const played = this.playBuffer('buy', 0.7);
    if (!played) {
      this.playCashCollect(1.2);
    }
  }

  private synthesizePop(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playCashCollect(pitchMultiplier = 1.0): void {
    if (!this.isSoundEnabled()) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Micro-guard to avoid exact-same-millisecond duplicate phasing
    if (now - this.lastCashCollectTime < 25) {
      return;
    }
    this.lastCashCollectTime = now;

    const played = this.playBuffer('cash', 0.7, false, pitchMultiplier);
    if (!played) {
      this.synthesizeCashCollect(pitchMultiplier);
    }
  }

  private synthesizeCashCollect(pitchMultiplier = 1.0): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    const baseFreq = 987.77 * pitchMultiplier; // B5
    osc1.frequency.setValueAtTime(baseFreq, now);
    osc2.frequency.setValueAtTime(baseFreq * 1.334, now); // E6

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  // ==========================================
  // 7. CAR CRASH / END LINE IMPACT SOUND
  // ==========================================
  private lastCrashTime = 0;

  public playCrash(volume = 0.9): void {
    if (!this.isSoundEnabled()) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Micro-guard to avoid multiple triggers on multi-step impact frames
    if (now - this.lastCrashTime < 300) {
      return;
    }
    this.lastCrashTime = now;

    const played = this.playBuffer('crash', volume);
    if (!played) {
      this.synthesizeCrash();
    }
  }

  private synthesizeCrash(): void {
    const ctx = this.initCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.28);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }
}

export const audio = new AudioService();
