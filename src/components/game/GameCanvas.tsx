import type React from 'react';
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { LevelData } from '../../types/level';
import type { Vector2D } from '../../types/physics';
import { getRandomRewardAmount, GAME_CONFIG } from '../../config/constants';
import { BridgeManager } from '../../engine/bridge';
import { VehicleSimulation } from '../../engine/vehicle';
import { ParticleSystem } from '../../engine/particles';
import { getEffectiveHazards } from '../../engine/hazardMovement';
import { renderGameScene } from '../../graphics/sceneRenderer';
import { calculateViewportMetrics, calculateEffectiveTerrains } from '../../utils/viewport';
import { GameHUD } from './GameHUD';
import { VictoryModal } from './VictoryModal';
import { AllLevelsCompleteModal } from './AllLevelsCompleteModal';
import { StoreScreen } from '../store/StoreScreen';
import { usePlayerCash } from '../../hooks/usePlayerCash';
import { useGameStore } from '../../hooks/useGameStore';
import { safeStorage } from '../../services/storage';
import { youtubePlayables } from '../../services/youtubePlayables';
import { audio } from '../../services/audioService';
import confetti from 'canvas-confetti';

import type { GameStoreState, StoreCategory, StoreItem } from '../../types/store';

export interface GameCanvasProps {
  level: LevelData;
  levelIndex: number;
  totalLevels: number;
  cash?: number;
  onAddCash?: (amount: number) => void;
  storeState?: GameStoreState;
  onSelectCar?: (carId: string) => void;
  onSelectTrail?: (trailId: string) => void;
  onUnlockRandomItem?: (
    currentTab: StoreCategory,
    playerCash: number,
    onDeductCash: (amount: number) => void
  ) => { success: boolean; item?: StoreItem; reason?: string };
  onUnlockSpecificItem?: (
    itemId: string,
    playerCash: number,
    onDeductCash: (amount: number) => void
  ) => { success: boolean; item?: StoreItem; reason?: string };
  onNextLevel: () => void;
  onRestartFromLevel1?: () => void;
  onLevelComplete?: (levelIndex: number) => void;
  onOpenSettings?: () => void;
  onOpenEditor?: () => void;
  onOpenLevelSelect?: () => void;
  showEditor?: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  levelIndex,
  totalLevels,
  cash: propCash,
  onAddCash,
  storeState: propStoreState,
  onSelectCar,
  onSelectTrail,
  onUnlockRandomItem,
  onUnlockSpecificItem,
  onNextLevel,
  onRestartFromLevel1,
  onLevelComplete,
  onOpenSettings,
  onOpenEditor,
  onOpenLevelSelect,
  showEditor
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fallbackCash = usePlayerCash();
  const fallbackStore = useGameStore();

  const cash = propCash ?? fallbackCash.cash;
  const addCash = onAddCash ?? fallbackCash.addCash;

  const storeState = propStoreState ?? fallbackStore.storeState;
  const selectCar = onSelectCar ?? fallbackStore.selectCar;
  const selectTrail = onSelectTrail ?? fallbackStore.selectTrail;
  const unlockRandomItem = onUnlockRandomItem ?? fallbackStore.unlockRandomItem;
  const unlockSpecificItem = onUnlockSpecificItem ?? fallbackStore.unlockSpecificItem;

  const selectedCarRef = useRef(storeState.selectedCar);
  useEffect(() => {
    selectedCarRef.current = storeState.selectedCar;
    simRef.current.setCarId(storeState.selectedCar, level.terrains);
  }, [storeState.selectedCar, level.terrains]);

  const selectedTrailRef = useRef(storeState.selectedTrail);
  useEffect(() => {
    selectedTrailRef.current = storeState.selectedTrail;
  }, [storeState.selectedTrail]);
  const cashRef = useRef(cash);
  useEffect(() => {
    cashRef.current = cash;
  }, [cash]);
  const [isCashPulsing, setIsCashPulsing] = useState(false);
  const cashPulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Multi-Device Fullscreen Scaling-Based Resolution State
  const [viewport, setViewport] = useState(() => {
    const rawW = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 1000;
    const rawH = typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 600;
    const w = rawW > 0 ? rawW : 1000;
    const h = rawH > 0 ? rawH : 600;
    return calculateViewportMetrics(w, h, level);
  });

  // Seamless edge terrain extension so wide/tall screens have edge-to-edge visuals without altering gap physics
  const effectiveTerrains = useMemo(() => {
    return calculateEffectiveTerrains(level.terrains, viewport);
  }, [level.terrains, viewport]);

  const viewportRef = useRef(viewport);
  useEffect(() => {
    viewportRef.current = viewport;
    const safeScale = viewport.scale > 0 && Number.isFinite(viewport.scale) ? viewport.scale : 1;
    const safeOffsetX = Number.isFinite(viewport.offsetX) ? viewport.offsetX : 0;
    const safeOffsetY = Number.isFinite(viewport.offsetY) ? viewport.offsetY : 0;
    const leftVirtual = -safeOffsetX / safeScale;
    const rightVirtual = (viewport.w - safeOffsetX) / safeScale;
    const topVirtual = -safeOffsetY / safeScale;
    const bottomVirtual = (viewport.h - safeOffsetY) / safeScale;
    bridgeRef.current.setViewportBounds({
      left: leftVirtual,
      right: rightVirtual,
      top: topVirtual,
      bottom: bottomVirtual
    });
  }, [viewport]);

  const effectiveTerrainsRef = useRef(effectiveTerrains);
  useEffect(() => {
    effectiveTerrainsRef.current = effectiveTerrains;
  }, [effectiveTerrains]);

  const levelRef = useRef(level);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  const levelIndexRef = useRef(levelIndex);
  useEffect(() => {
    levelIndexRef.current = levelIndex;
  }, [levelIndex]);

  const totalLevelsRef = useRef(totalLevels);
  useEffect(() => {
    totalLevelsRef.current = totalLevels;
  }, [totalLevels]);

  const onLevelCompleteRef = useRef(onLevelComplete);
  useEffect(() => {
    onLevelCompleteRef.current = onLevelComplete;
  }, [onLevelComplete]);

  const addCashRef = useRef(addCash);
  useEffect(() => {
    addCashRef.current = addCash;
  }, [addCash]);

  const handleResetRef = useRef<() => void>(() => {});

  const bridgeRef = useRef<BridgeManager>(new BridgeManager());
  const simRef = useRef<VehicleSimulation>(
    new VehicleSimulation(
      level.spawn.x,
      level.spawn.y,
      level.gravity,
      GAME_CONFIG.VEHICLE_SCALE,
      level.terrains,
      storeState.selectedCar
    )
  );
  const particlesRef = useRef<ParticleSystem>(new ParticleSystem());
  const animClockRef = useRef(0);

  useEffect(() => {
    animClockRef.current = 0;
  }, [level.id]);

  const [isDriving, setIsDriving] = useState(false);
  const isDrivingRef = useRef(false);
  const [isFallingBridge, setIsFallingBridge] = useState(false);
  const isFallingBridgeRef = useRef(false);
  const fallingBridgeTimerRef = useRef(0);
  const stoppedAtEndTimerRef = useRef(0);
  const isDrawingRef = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const isVictoryRef = useRef(false);
  const [isAllLevelsComplete, setIsAllLevelsComplete] = useState(false);
  const isAllLevelsCompleteRef = useRef(false);
  const [_isDead, setIsDead] = useState(false);
  const isDeadRef = useRef(false);
  const [rewardAmount, setRewardAmount] = useState(0);

  // YouTube Playables System Pause/Resume state
  const isPausedRef = useRef(false);
  useEffect(() => {
    const unbindPause = youtubePlayables.onPause(() => {
      isPausedRef.current = true;
      audio.stopDrawing();
      audio.stopEngine();
      audio.stopVictory();
      try {
        confetti.reset();
      } catch {
        // Ignore
      }
    });
    const unbindResume = youtubePlayables.onResume(() => {
      isPausedRef.current = false;
    });
    return () => {
      unbindPause();
      unbindResume();
      audio.stopDrawing();
      audio.stopEngine();
      audio.stopVictory();
      try {
        confetti.reset();
      } catch {
        // Ignore
      }
    };
  }, []);

  // Dynamic High-DPI Responsive Resize Observer for edge-to-edge fullscreen
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rawW = container && container.clientWidth > 0 ? container.clientWidth : window.innerWidth;
      const rawH = container && container.clientHeight > 0 ? container.clientHeight : window.innerHeight;
      const w = rawW > 0 ? rawW : 1000;
      const h = rawH > 0 ? rawH : 600;

      const nextViewport = calculateViewportMetrics(w, h, levelRef.current);
      viewportRef.current = nextViewport;

      const safeScale = nextViewport.scale > 0 && Number.isFinite(nextViewport.scale) ? nextViewport.scale : 1;
      const safeOffsetX = Number.isFinite(nextViewport.offsetX) ? nextViewport.offsetX : 0;
      const safeOffsetY = Number.isFinite(nextViewport.offsetY) ? nextViewport.offsetY : 0;
      const leftVirtual = -safeOffsetX / safeScale;
      const rightVirtual = (nextViewport.w - safeOffsetX) / safeScale;
      const topVirtual = -safeOffsetY / safeScale;
      const bottomVirtual = (nextViewport.h - safeOffsetY) / safeScale;
      bridgeRef.current.setViewportBounds({
        left: leftVirtual,
        right: rightVirtual,
        top: topVirtual,
        bottom: bottomVirtual
      });

      canvas.width = Math.floor(w * nextViewport.dpr);
      canvas.height = Math.floor(h * nextViewport.dpr);

      setViewport((prev) => {
        if (
          prev.w === nextViewport.w &&
          prev.h === nextViewport.h &&
          prev.scale === nextViewport.scale &&
          prev.offsetX === nextViewport.offsetX &&
          prev.offsetY === nextViewport.offsetY &&
          prev.dpr === nextViewport.dpr
        ) {
          return prev;
        }
        return nextViewport;
      });
    };

    handleResize();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(() => handleResize());
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [level]);

  const getCanvasCoords = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent | React.TouchEvent): Vector2D | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;

      if ('clientX' in e && typeof e.clientX === 'number') {
        clientX = e.clientX;
        clientY = e.clientY;
      } else if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        return null;
      }

      // Restrict client coordinates strictly within canvas element boundaries
      const clampedClientX = Math.max(rect.left, Math.min(rect.right, clientX));
      const clampedClientY = Math.max(rect.top, Math.min(rect.bottom, clientY));

      const vp = viewportRef.current;
      const scale = vp.scale > 0 && Number.isFinite(vp.scale) ? vp.scale : 1;
      const offsetX = Number.isFinite(vp.offsetX) ? vp.offsetX : 0;
      const offsetY = Number.isFinite(vp.offsetY) ? vp.offsetY : 0;

      const rawX = (clampedClientX - rect.left - offsetX) / scale;
      const rawY = (clampedClientY - rect.top - offsetY) / scale;

      const leftVirtual = -offsetX / scale;
      const rightVirtual = (rect.width - offsetX) / scale;
      const topVirtual = -offsetY / scale;
      const bottomVirtual = (rect.height - offsetY) / scale;

      const minX = Math.min(0, leftVirtual);
      const maxX = Math.max(GAME_CONFIG.CANVAS_WIDTH, rightVirtual);
      const minY = Math.min(0, topVirtual);
      const maxY = Math.max(GAME_CONFIG.CANVAS_HEIGHT, bottomVirtual);

      return {
        x: Math.max(minX, Math.min(maxX, rawX)),
        y: Math.max(minY, Math.min(maxY, rawY))
      };
    },
    []
  );

  const handleReset = useCallback(() => {
    level.hazards.forEach((h) => {
      delete h.destroyed;
    });
    level.coins?.forEach((c) => {
      c.collected = false;
    });
    simRef.current.reset(
      level.spawn.x,
      level.spawn.y,
      level.gravity,
      GAME_CONFIG.VEHICLE_SCALE,
      level.terrains,
      selectedCarRef.current
    );
    bridgeRef.current.clear();
    particlesRef.current.clear();
    audio.stopDrawing();
    audio.stopEngine();
    audio.stopVictory();
    try {
      confetti.reset();
    } catch {
      // Ignore
    }
    isDrawingRef.current = false;
    setIsDrawing(false);
    isFallingBridgeRef.current = false;
    setIsFallingBridge(false);
    fallingBridgeTimerRef.current = 0;
    stoppedAtEndTimerRef.current = 0;
    isDrivingRef.current = false;
    setIsDriving(false);
    isDeadRef.current = false;
    setIsDead(false);
    isVictoryRef.current = false;
    setIsVictory(false);
    isAllLevelsCompleteRef.current = false;
    setIsAllLevelsComplete(false);
    setRewardAmount(0);
    animClockRef.current = 0;
  }, [level]);

  useEffect(() => {
    handleResetRef.current = handleReset;
  }, [handleReset]);

  const drawingIdleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetDrawingIdleTimer = useCallback(() => {
    if (drawingIdleTimeoutRef.current) {
      clearTimeout(drawingIdleTimeoutRef.current);
    }
    drawingIdleTimeoutRef.current = setTimeout(() => {
      audio.pauseDrawing();
    }, 110);
  }, []);

  const clearDrawingIdleTimer = useCallback(() => {
    if (drawingIdleTimeoutRef.current) {
      clearTimeout(drawingIdleTimeoutRef.current);
      drawingIdleTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearDrawingIdleTimer();
      audio.stopDrawing();
    };
  }, [clearDrawingIdleTimer]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isVictoryRef.current || isAllLevelsCompleteRef.current || isPausedRef.current || youtubePlayables.getIsPaused()) return;

    // Do not reset or draw during driving or falling - reset is strictly via HUD Reset button
    if (isDrivingRef.current || isDeadRef.current || isFallingBridgeRef.current) {
      return;
    }

    const rawCoords = getCanvasCoords(e);
    if (!rawCoords) return;

    const coords = bridgeRef.current.validateStartPoint(rawCoords, effectiveTerrainsRef.current);
    if (!coords) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture unsupported
    }

    clearDrawingIdleTimer();
    isDrawingRef.current = true;
    setIsDrawing(true);
    bridgeRef.current.clear();
    bridgeRef.current.startDrawing(coords);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isDrivingRef.current || isFallingBridgeRef.current || isPausedRef.current || youtubePlayables.getIsPaused()) return;
    const rawCoords = getCanvasCoords(e);
    if (!rawCoords) return;

    const added = bridgeRef.current.addDrawingPoint(rawCoords, effectiveTerrainsRef.current);
    if (added) {
      audio.resumeDrawing();
      resetDrawingIdleTimer();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore if already released
    }

    clearDrawingIdleTimer();
    audio.stopDrawing();
    isDrawingRef.current = false;
    setIsDrawing(false);

    const hasValidBridge = bridgeRef.current.finishDrawing(effectiveTerrainsRef.current);

    if (hasValidBridge) {
      bridgeRef.current.startFalling(effectiveTerrainsRef.current);
      if (bridgeRef.current.getIsSettled()) {
        isFallingBridgeRef.current = false;
        setIsFallingBridge(false);
        isDrivingRef.current = true;
        setIsDriving(true);
        simRef.current.setDriving(true);
      } else {
        // Wait until bridge falls and lands on brick terrain before car drives
        fallingBridgeTimerRef.current = 0;
        isFallingBridgeRef.current = true;
        setIsFallingBridge(true);
        isDrivingRef.current = false;
        setIsDriving(false);
        simRef.current.setDriving(false);
      }
    } else {
      // Empty or too short stroke: drive forward
      isFallingBridgeRef.current = false;
      setIsFallingBridge(false);
      isDrivingRef.current = true;
      setIsDriving(true);
      simRef.current.setDriving(true);
    }
  };

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      if (isPausedRef.current || youtubePlayables.getIsPaused()) {
        lastTime = currentTime;
        animId = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;
      animClockRef.current += dt;
      const animClock = animClockRef.current;

      const currentLevel = levelRef.current;
      const effectiveTerrains = effectiveTerrainsRef.current;
      const effectiveHazards = getEffectiveHazards(currentLevel.hazards, animClock);
      const vp = viewportRef.current;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Native Device Pixel Ratio & Responsive Scaling transform
          const scale = vp.scale > 0 && Number.isFinite(vp.scale) ? vp.scale : 1;
          const dpr = vp.dpr > 0 && Number.isFinite(vp.dpr) ? vp.dpr : 1;
          const offsetX = Number.isFinite(vp.offsetX) ? vp.offsetX : 0;
          const offsetY = Number.isFinite(vp.offsetY) ? vp.offsetY : 0;
          const currentScale = scale * dpr;
          ctx.setTransform(
            currentScale,
            0,
            0,
            currentScale,
            offsetX * dpr,
            offsetY * dpr
          );
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Bridge / object falls down onto walls before car starts driving
          if (isFallingBridgeRef.current) {
            fallingBridgeTimerRef.current += dt;
            bridgeRef.current.update(dt, effectiveTerrains);
            // When points land on walls, bridge is settled, or safety timeout reached -> car starts
            if (bridgeRef.current.getIsSettled() || !bridgeRef.current.getIsFalling() || fallingBridgeTimerRef.current >= 0.8) {
              isFallingBridgeRef.current = false;
              setIsFallingBridge(false);
              isDrivingRef.current = true;
              setIsDriving(true);
              simRef.current.setDriving(true);
            }
          }

          if (isDrivingRef.current) {
            // Unanchored loose bridge/rod continues to simulate dynamic physics & gravity until fully settled
            if (!bridgeRef.current.getIsSettled() && bridgeRef.current.hasBridge()) {
              bridgeRef.current.update(dt, effectiveTerrains);
            }

            const leftVirtual = -offsetX / scale;
            const rightVirtual = (vp.w - offsetX) / scale;
            const topVirtual = -offsetY / scale;
            const bottomVirtual = (vp.h - offsetY) / scale;
            simRef.current.update(
              dt,
              effectiveTerrains,
              bridgeRef.current.getSegments(),
              effectiveHazards,
              currentLevel.goal,
              currentLevel.coins || [],
              particlesRef.current,
              bridgeRef.current,
              { left: leftVirtual, right: rightVirtual, top: topVirtual, bottom: bottomVirtual },
              animClock
            );

            if (simRef.current.vehicle.hasWon && !isVictoryRef.current && !isAllLevelsCompleteRef.current) {
              const winTimer = simRef.current.vehicle.winTimer ?? 0;
              const v = simRef.current.vehicle;
              const speed = Math.hypot(v.velocity.x, v.velocity.y);
              const isPhysicallyStopped = speed < 12;
              const isDrivingStopped = !simRef.current.getIsDriving();
              const isGrounded = v.wheels[0].isGrounded || v.wheels[1].isGrounded;
              const isSettledAtEnd = isDrivingStopped && isPhysicallyStopped && isGrounded;

              if (isSettledAtEnd) {
                stoppedAtEndTimerRef.current += dt;
              } else {
                stoppedAtEndTimerRef.current = 0;
              }

              // Win modal opens after reaching end and settling stably on wheels (or 3.5s failsafe if grounded)
              const isSettledEnough = stoppedAtEndTimerRef.current >= 0.35 || (winTimer >= 3.5 && isGrounded && speed < 15);
              if (isSettledEnough) {
                audio.stopEngine();
                onLevelCompleteRef.current?.(levelIndexRef.current);

                const isFinalLevel = levelIndexRef.current >= totalLevelsRef.current - 1 || levelIndexRef.current >= 99;
                if (isFinalLevel) {
                  addCashRef.current(50);
                  const saved = safeStorage.getItem('game_player_cash');
                  const finalScore = saved !== null ? parseInt(saved, 10) : cashRef.current + 50;
                  youtubePlayables.sendScore(isNaN(finalScore) ? cashRef.current + 50 : finalScore);
                  isAllLevelsCompleteRef.current = true;
                  setIsAllLevelsComplete(true);
                } else {
                  setRewardAmount(getRandomRewardAmount());
                  isVictoryRef.current = true;
                  setIsVictory(true);
                }
              }
            }

            if (!simRef.current.vehicle.isDead && !isVictoryRef.current && !isAllLevelsCompleteRef.current) {
              if (simRef.current.getIsDriving()) {
                const speed = Math.hypot(simRef.current.vehicle.velocity.x, simRef.current.vehicle.velocity.y);
                audio.updateEngine(speed / 300, selectedCarRef.current);
              } else {
                audio.stopEngine();
              }

              const rearWheel = simRef.current.vehicle.wheels[0];
              const angle = simRef.current.vehicle.angle;
              const exhaustPos = {
                x: rearWheel.position.x - 10 * Math.cos(angle),
                y: rearWheel.position.y - 10 * Math.sin(angle)
              };
              particlesRef.current.emitTrail(selectedTrailRef.current, exhaustPos);
            }

            // Automatic restart when blast or drown animation completes
            if (simRef.current.vehicle.isDead) {
              audio.stopEngine();
              if (!isDeadRef.current) {
                isDeadRef.current = true;
                setIsDead(true);
              }
              const timer = simRef.current.vehicle.deathTimer || 0;
              const maxDelay = simRef.current.vehicle.deathType === 'drown' ? 1.35 : 0.85;
              if (timer >= maxDelay) {
                handleResetRef.current();
              }
            }
          }

          particlesRef.current.update(dt);

          renderGameScene(ctx, {
            viewport: vp,
            level: { ...currentLevel, hazards: effectiveHazards },
            effectiveTerrains,
            isVictory: isVictoryRef.current,
            animClock,
            bridge: bridgeRef.current,
            sim: simRef.current,
            particles: particlesRef.current,
            selectedCar: selectedCarRef.current
          });
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      ref={containerRef}
      className="playable-viewport"
    >
      <GameHUD
        levelIndex={levelIndex}
        levelName={level.name}
        onReset={handleReset}
        onOpenSettings={onOpenSettings}
        onOpenStore={() => setIsStoreOpen(true)}
        onOpenEditor={onOpenEditor}
        onOpenLevelSelect={onOpenLevelSelect}
        isActionActive={isDrawing || isDriving || isFallingBridge}
        showEditor={showEditor}
      />

      <canvas
        ref={canvasRef}
        className="playable-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      <VictoryModal
        isOpen={isVictory}
        levelIndex={levelIndex}
        cash={cash}
        isCashPulsing={isCashPulsing}
        rewardAmount={rewardAmount}
        onClaim={(_amount) => {
          // Claim started
        }}
        onCashArriveTick={(chunk) => {
          addCash(chunk);
          setIsCashPulsing(true);
          if (cashPulseTimeoutRef.current) clearTimeout(cashPulseTimeoutRef.current);
          cashPulseTimeoutRef.current = setTimeout(() => setIsCashPulsing(false), 150);
        }}
        onCashCollectCompleted={() => {
          // Send score to YouTube Playables only once all flying cash particles have been collected!
          const saved = safeStorage.getItem('game_player_cash');
          const finalScore = saved !== null ? parseInt(saved, 10) : cashRef.current;
          youtubePlayables.sendScore(isNaN(finalScore) ? cashRef.current : finalScore);
        }}
        onNextLevel={() => {
          setIsVictory(false);
          if (levelIndex < totalLevels - 1) {
            onNextLevel();
          } else {
            setIsAllLevelsComplete(true);
          }
        }}
        onReplay={() => {
          setIsVictory(false);
          handleReset();
        }}
        hasNextLevel={levelIndex < totalLevels - 1}
      />

      <AllLevelsCompleteModal
        isOpen={isAllLevelsComplete}
        onRestartFromLevel1={() => {
          setIsAllLevelsComplete(false);
          handleReset();
          onRestartFromLevel1?.();
        }}
        onClose={() => {
          setIsAllLevelsComplete(false);
          handleReset();
        }}
      />

      <StoreScreen
        isOpen={isStoreOpen}
        onClose={() => setIsStoreOpen(false)}
        cash={cash}
        unlockedCars={storeState.unlockedCars}
        selectedCar={storeState.selectedCar}
        unlockedTrails={storeState.unlockedTrails}
        selectedTrail={storeState.selectedTrail}
        onSelectCar={selectCar}
        onSelectTrail={selectTrail}
        onUnlockRandom={unlockRandomItem}
        onUnlockSpecificItem={unlockSpecificItem}
        onDeductCash={addCash}
      />
    </div>
  );
};
