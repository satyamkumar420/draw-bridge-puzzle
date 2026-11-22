import type React from 'react';
import { useRef, useEffect, useState, useCallback } from 'react';
import type { LevelData, TerrainBlock, HazardBlock, HazardType } from '../../types/level';
import type { EditorTool, SelectedObjectRef } from '../../types/editor';
import type { Vector2D } from '../../types/physics';
import { GAME_CONFIG } from '../../config/constants';
import { getObstacleToolByEditorTool } from '../../config/editorTools';
import { BridgeManager } from '../../engine/bridge';
import { VehicleSimulation } from '../../engine/vehicle';
import { ParticleSystem } from '../../engine/particles';
import { getEffectiveHazards } from '../../engine/hazardMovement';
import { renderBrickTerrain } from '../../graphics/brickRenderer';
import { renderVehicle } from '../../graphics/carRenderer';
import { renderBackground, renderGoal, renderHazard } from '../../graphics/environmentRenderer';
import { getSkyTheme } from '../../config/skyThemes';
import { getPenColor } from '../../config/penColors';
import { findObjectAtPosition, drawEditorGrid, drawSelectionGizmo, drawHazardMovementGizmo } from './editorCanvasUtils';
import { ArcadeButton } from '../common/ArcadeButton';
import { Play, RotateCcw } from 'lucide-react';
import { useI18n } from '../../i18n';

export interface EditorCanvasProps {
  level: LevelData;
  onUpdateLevel: (updated: LevelData) => void;
  activeTool: EditorTool;
  snapToGrid: boolean;
  gridSize?: number;
  selection: SelectedObjectRef | null;
  onSelect: (ref: SelectedObjectRef | null) => void;
  isTesting: boolean;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  level,
  onUpdateLevel,
  activeTool,
  snapToGrid,
  gridSize = 20,
  selection,
  onSelect,
  isTesting
}) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const testBridgeRef = useRef<BridgeManager>(new BridgeManager());
  const testSimRef = useRef<VehicleSimulation>(new VehicleSimulation(level.spawn.x, level.spawn.y, level.gravity, GAME_CONFIG.VEHICLE_SCALE, level.terrains));
  const testParticlesRef = useRef<ParticleSystem>(new ParticleSystem());

  const [isTestDriving, setIsTestDriving] = useState(false);
  const [hasTestBridge, setHasTestBridge] = useState(false);

  const [isInteracting, setIsInteracting] = useState(false);
  const [dragStart, setDragStart] = useState<Vector2D>({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState<Vector2D>({ x: 0, y: 0 });
  const [dragMode, setDragMode] = useState<'move' | 'resize' | 'create'>('create');
  const [hoverCoords, setHoverCoords] = useState<Vector2D | null>(null);
  const initialObjectRef = useRef<{ x: number; y: number; width?: number; height?: number } | null>(null);

  const [viewport, setViewport] = useState({ scale: 1, dpr: 1 });

  // High-DPI Responsive Canvas Resize Observer
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const scale = Math.max(0.001, Math.min(w / GAME_CONFIG.CANVAS_WIDTH, h / GAME_CONFIG.CANVAS_HEIGHT));

      canvas.width = Math.floor(GAME_CONFIG.CANVAS_WIDTH * scale * dpr);
      canvas.height = Math.floor(GAME_CONFIG.CANVAS_HEIGHT * scale * dpr);
      canvas.style.width = `${Math.floor(GAME_CONFIG.CANVAS_WIDTH * scale)}px`;
      canvas.style.height = `${Math.floor(GAME_CONFIG.CANVAS_HEIGHT * scale)}px`;

      setViewport({ scale, dpr });
    };

    handleResize();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(() => handleResize());
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const snap = useCallback(
    (v: number) => (snapToGrid ? Math.round(v / gridSize) * gridSize : Math.round(v)),
    [snapToGrid, gridSize]
  );

  const getCanvasCoords = useCallback((e: React.MouseEvent): Vector2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const clientX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const clientY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    return {
      x: (clientX / rect.width) * GAME_CONFIG.CANVAS_WIDTH,
      y: (clientY / rect.height) * GAME_CONFIG.CANVAS_HEIGHT
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (isTesting) {
      if (!isTestDriving) {
        const testCoords = testBridgeRef.current.validateStartPoint(coords, level.terrains);
        if (!testCoords) return;
        testBridgeRef.current.clear();
        testBridgeRef.current.startDrawing(testCoords);
        setHasTestBridge(false);
      }
      return;
    }

    setIsInteracting(true);
    setDragStart(coords);
    setCurrentPos(coords);

    if (activeTool === 'select') {
      const hit = findObjectAtPosition(coords, level);
      if (hit) {
        onSelect(hit.ref);
        setDragMode(hit.isResizeHandle ? 'resize' : 'move');

        if (hit.ref.type === 'terrain') {
          const t = level.terrains.find((item) => item.id === hit.ref.id);
          if (t) initialObjectRef.current = { x: t.x, y: t.y, width: t.width, height: t.height };
        } else if (hit.ref.type === 'hazard') {
          const h = level.hazards.find((item) => item.id === hit.ref.id);
          if (h) initialObjectRef.current = { x: h.x, y: h.y, width: h.width, height: h.height };
        } else if (hit.ref.type === 'spawn') {
          initialObjectRef.current = { x: level.spawn.x, y: level.spawn.y };
        } else if (hit.ref.type === 'goal') {
          initialObjectRef.current = { x: level.goal.x, y: level.goal.y };
        }
      } else {
        onSelect(null);
        initialObjectRef.current = null;
      }
    } else if (activeTool === 'spawn') {
      const snapX = snap(coords.x);
      const underTerrain = level.terrains.find((t) => snapX >= t.x && snapX <= t.x + t.width);
      const snapY = underTerrain ? underTerrain.y - 22.5 : snap(coords.y);
      onUpdateLevel({ ...level, spawn: { ...level.spawn, x: snapX, y: snapY } });
      onSelect({ type: 'spawn' });
      setIsInteracting(false);
    } else if (activeTool === 'goal') {
      onUpdateLevel({ ...level, goal: { ...level.goal, x: snap(coords.x - 25), y: snap(coords.y) } });
      onSelect({ type: 'goal' });
      setIsInteracting(false);
    } else {
      setDragMode('create');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;
    setHoverCoords(coords);

    if (isTesting) {
      if (!isTestDriving && e.buttons === 1) {
        testBridgeRef.current.addDrawingPoint(coords, level.terrains);
        setHasTestBridge(testBridgeRef.current.hasBridge());
      }
      return;
    }

    if (!isInteracting) return;
    setCurrentPos(coords);

    if (activeTool === 'select' && selection && initialObjectRef.current) {
      const init = initialObjectRef.current;
      const totalDx = coords.x - dragStart.x;
      const totalDy = coords.y - dragStart.y;

      if (dragMode === 'move') {
        const targetX = snap(init.x + totalDx);
        const targetY = snap(init.y + totalDy);

        if (selection.type === 'terrain') {
          const prevT = level.terrains.find((t) => t.id === selection.id);
          const wasSpawnOnThis = prevT && level.spawn.x >= prevT.x && level.spawn.x <= prevT.x + prevT.width && Math.abs(level.spawn.y - (prevT.y - 22.5)) < 8;

          onUpdateLevel({
            ...level,
            spawn: wasSpawnOnThis ? { ...level.spawn, y: targetY - 22.5 } : level.spawn,
            terrains: level.terrains.map((t) =>
              t.id === selection.id ? { ...t, x: targetX, y: targetY } : t
            )
          });
        } else if (selection.type === 'hazard') {
          onUpdateLevel({
            ...level,
            hazards: level.hazards.map((h) =>
              h.id === selection.id ? { ...h, x: targetX, y: targetY } : h
            )
          });
        } else if (selection.type === 'goal') {
          onUpdateLevel({
            ...level,
            goal: { ...level.goal, x: targetX, y: targetY }
          });
        } else if (selection.type === 'spawn') {
          const underTerrain = level.terrains.find((t) => targetX >= t.x && targetX <= t.x + t.width);
          let finalSpawnY = targetY;
          if (underTerrain && (targetY >= underTerrain.y - 80 && targetY <= underTerrain.y + 40)) {
            finalSpawnY = underTerrain.y - 22.5;
          }
          onUpdateLevel({
            ...level,
            spawn: { ...level.spawn, x: targetX, y: finalSpawnY }
          });
        }
      } else if (dragMode === 'resize' && init.width && init.height) {
        const targetW = Math.max(40, snap(init.width + totalDx));
        const targetH = Math.max(20, snap(init.height + totalDy));

        if (selection.type === 'terrain') {
          onUpdateLevel({
            ...level,
            terrains: level.terrains.map((t) =>
              t.id === selection.id ? { ...t, width: targetW, height: targetH } : t
            )
          });
        } else if (selection.type === 'hazard') {
          onUpdateLevel({
            ...level,
            hazards: level.hazards.map((h) =>
              h.id === selection.id ? { ...h, width: targetW, height: targetH } : h
            )
          });
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (isTesting) {
      if (!isTestDriving) {
        testBridgeRef.current.finishDrawing(level.terrains);
        setHasTestBridge(testBridgeRef.current.hasBridge());
      }
      return;
    }
    if (!isInteracting) return;
    setIsInteracting(false);
    initialObjectRef.current = null;

    if (dragMode === 'create') {
      const minX = snap(Math.min(dragStart.x, currentPos.x));
      const minY = snap(Math.min(dragStart.y, currentPos.y));
      const w = Math.max(40, snap(Math.abs(currentPos.x - dragStart.x)));
      const h = Math.max(20, snap(Math.abs(currentPos.y - dragStart.y)));

      if (activeTool === 'terrain') {
        const isClickOnly = Math.abs(currentPos.x - dragStart.x) < 8 && Math.abs(currentPos.y - dragStart.y) < 8;
        const finalW = isClickOnly ? 120 : w;
        const finalH = isClickOnly ? 60 : h;
        const newTerrain: TerrainBlock = {
          id: `t-${Date.now()}`,
          type: 'brick',
          theme: level.wallTheme || level.terrains[0]?.theme || 'brick-red',
          x: minX,
          y: minY,
          width: finalW,
          height: finalH
        };
        onUpdateLevel({ ...level, terrains: [...level.terrains, newTerrain] });
        onSelect({ type: 'terrain', id: newTerrain.id });
      } else if (activeTool.startsWith('hazard-')) {
        const toolDef = getObstacleToolByEditorTool(activeTool);
        const hazardType: HazardType = toolDef ? toolDef.hazardType : (activeTool.replace('hazard-', '') as HazardType);
        const isClickOnly = Math.abs(currentPos.x - dragStart.x) < 8 && Math.abs(currentPos.y - dragStart.y) < 8;
        const finalW = isClickOnly && toolDef ? toolDef.defaultWidth : Math.max(30, w);
        const finalH = isClickOnly && toolDef ? toolDef.defaultHeight : Math.max(20, h);

        const newHazard: HazardBlock = {
          id: `h-${Date.now()}`,
          type: hazardType,
          x: minX,
          y: minY,
          width: finalW,
          height: finalH
        };
        onUpdateLevel({ ...level, hazards: [...level.hazards, newHazard] });
        onSelect({ type: 'hazard', id: newHazard.id });
      }
    }
  };

  const handleResetTest = () => {
    level.hazards.forEach((h) => {
      delete h.destroyed;
    });
    testSimRef.current.reset(level.spawn.x, level.spawn.y, level.gravity, 1.0, level.terrains);
    testBridgeRef.current.clear();
    testParticlesRef.current.clear();
    setHasTestBridge(false);
    setIsTestDriving(false);
  };

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let animClock = 0;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      animClock += dt;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const currentScale = viewport.scale * viewport.dpr;
          ctx.setTransform(currentScale, 0, 0, currentScale, 0, 0);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

          renderBackground(ctx, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT, level.skyTheme);

          drawEditorGrid(ctx, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT, gridSize);

          for (const terrain of level.terrains) {
            renderBrickTerrain(ctx, terrain, { isEditor: true });
          }

          const effectiveHazards = getEffectiveHazards(level.hazards, animClock);

          // Draw visual movement tracks, endpoint limits, and direction arrows
          for (const hazard of level.hazards) {
            if (hazard.movement) {
              const isSelected = selection?.type === 'hazard' && selection.id === hazard.id;
              drawHazardMovementGizmo(ctx, hazard, animClock, isSelected);
            }
          }

          // Render base hazard obstacles
          for (const hazard of level.hazards) {
            renderHazard(ctx, hazard, animClock, level.terrains);
          }

          // In editor idle mode, render subtle animated ghost showing active patrol path
          if (!isTesting) {
            for (const effH of effectiveHazards) {
              if (effH.movement) {
                ctx.save();
                ctx.globalAlpha = 0.45;
                renderHazard(ctx, effH, animClock, level.terrains);
                ctx.restore();
              }
            }
          }

          const isTestGoalReached = isTesting && testSimRef.current.vehicle.hasWon;
          renderGoal(ctx, level.goal, animClock, 1.0, isTestGoalReached);

          if (isTesting) {
            if (isTestDriving) {
              testBridgeRef.current.update(dt, level.terrains);
              testSimRef.current.update(
                dt,
                level.terrains,
                testBridgeRef.current.getSegments(),
                effectiveHazards,
                level.goal,
                [],
                testParticlesRef.current
              );
            }
            testParticlesRef.current.update(dt);
            testBridgeRef.current.render(ctx, 1.0, getPenColor(level.penColor));
            testParticlesRef.current.render(ctx);
            renderVehicle(ctx, testSimRef.current.vehicle);
          } else {
            const previewSim = new VehicleSimulation(level.spawn.x, level.spawn.y, level.gravity, GAME_CONFIG.VEHICLE_SCALE, level.terrains);
            renderVehicle(ctx, previewSim.vehicle);
          }

          if (!isTesting && selection) {
            drawSelectionGizmo(ctx, selection, level);
          }

          // Live hover cursor preview before clicking
          if (!isTesting && !isInteracting && hoverCoords && (activeTool === 'terrain' || activeTool.startsWith('hazard-'))) {
            const toolDef = activeTool.startsWith('hazard-') ? getObstacleToolByEditorTool(activeTool) : null;
            const gw = toolDef ? toolDef.defaultWidth : 120;
            const gh = toolDef ? toolDef.defaultHeight : 60;
            const gx = snap(hoverCoords.x - gw / 2);
            const gy = snap(hoverCoords.y - gh / 2);

            ctx.save();
            ctx.globalAlpha = 0.45;
            if (activeTool === 'terrain') {
              renderBrickTerrain(
                ctx,
                {
                  id: 'ghost-hover-terrain',
                  type: 'brick',
                  theme: level.wallTheme || level.terrains[0]?.theme || 'brick-red',
                  x: gx,
                  y: gy,
                  width: gw,
                  height: gh
                },
                { isEditor: true }
              );
            } else if (toolDef) {
              renderHazard(
                ctx,
                {
                  id: 'ghost-hover-hazard',
                  type: toolDef.hazardType,
                  x: gx,
                  y: gy,
                  width: gw,
                  height: gh
                },
                animClock,
                level.terrains
              );
            }
            ctx.restore();

            ctx.save();
            ctx.strokeStyle = toolDef?.accentColor || '#22c55e';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(gx, gy, gw, gh);
            ctx.restore();
          }

          // Live drag creation preview showing the actual tool graphic
          if (!isTesting && isInteracting && dragMode === 'create') {
            const x = snap(Math.min(dragStart.x, currentPos.x));
            const y = snap(Math.min(dragStart.y, currentPos.y));
            const w = Math.max(40, snap(Math.abs(currentPos.x - dragStart.x)));
            const h = Math.max(20, snap(Math.abs(currentPos.y - dragStart.y)));

            // Ghost of actual object being placed
            ctx.save();
            ctx.globalAlpha = 0.65;
            if (activeTool === 'terrain') {
              renderBrickTerrain(
                ctx,
                {
                  id: 'drag-terrain',
                  type: 'brick',
                  theme: level.wallTheme || level.terrains[0]?.theme || 'brick-red',
                  x,
                  y,
                  width: w,
                  height: h
                },
                { isEditor: true }
              );
            } else if (activeTool.startsWith('hazard-')) {
              const toolDef = getObstacleToolByEditorTool(activeTool);
              const hazardType: HazardType = toolDef ? toolDef.hazardType : (activeTool.replace('hazard-', '') as HazardType);
              renderHazard(
                ctx,
                {
                  id: 'drag-hazard',
                  type: hazardType,
                  x,
                  y,
                  width: w,
                  height: h
                },
                animClock,
                level.terrains
              );
            }
            ctx.restore();

            // Dashed outline
            ctx.save();
            const accent =
              activeTool === 'terrain'
                ? '#22c55e'
                : (activeTool.startsWith('hazard-') && getObstacleToolByEditorTool(activeTool)?.accentColor) || '#ef4444';
            ctx.strokeStyle = accent;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 4]);
            ctx.strokeRect(x, y, w, h);

            // Dimensions badge
            const dimText = `${w} × ${h}`;
            ctx.font = 'bold 11px monospace, sans-serif';
            const tm = ctx.measureText(dimText);
            const pad = 5;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(x, y - 20, tm.width + pad * 2, 16);
            ctx.strokeStyle = accent;
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.strokeRect(x, y - 20, tm.width + pad * 2, 16);
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(dimText, x + pad, y - 8);
            ctx.restore();
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    level,
    gridSize,
    selection,
    isTesting,
    isTestDriving,
    isInteracting,
    dragMode,
    dragStart,
    currentPos,
    hoverCoords,
    activeTool,
    viewport,
    snap
  ]);

  const currentSkyTheme = getSkyTheme(level.skyTheme);

  return (
    <div
      ref={containerRef}
      className="editor-canvas-wrapper"
      style={{
        '--sky-ambient-glow': currentSkyTheme.ambientGlow,
        '--sky-ambient-light': currentSkyTheme.ambientLight,
        '--sky-ambient-bottom': currentSkyTheme.ambientBottom,
        '--sky-ambient-dark': currentSkyTheme.ambientDark
      } as React.CSSProperties}
    >
      <div className="canvas-ambient-backdrop" />
      {isTesting && (
        <div className="editor-test-overlay">
          <div className="test-overlay-badge">
            <span className="live-dot" />
            <span>{t('playtest_mode') || 'PLAYTEST MODE'}</span>
          </div>

          <div className="test-overlay-controls">
            <ArcadeButton variant="orange" size="sm" icon={<RotateCcw size={16} />} onClick={handleResetTest}>
              {t('reset') || 'Reset'}
            </ArcadeButton>

            <ArcadeButton
              variant="green"
              size="sm"
              icon={<Play size={16} />}
              disabled={isTestDriving || !hasTestBridge}
              onClick={() => {
                testBridgeRef.current.startFalling(level.terrains);
                setIsTestDriving(true);
                testSimRef.current.setDriving(true);
              }}
            >
              {isTestDriving ? (t('driving') || 'Driving...') : (t('test_drive') || 'Test Drive!')}
            </ArcadeButton>
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="editor-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setHoverCoords(null)}
      />
    </div>
  );
};
