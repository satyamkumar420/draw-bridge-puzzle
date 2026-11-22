import type { LevelData, TerrainBlock } from '../types/level';
import type { ViewportMetrics } from '../utils/viewport.ts';
import { GAME_CONFIG } from '../config/constants.ts';
import { renderBackground, renderGoal, renderHazard } from './environmentRenderer.ts';
import { renderBrickTerrain } from './brickRenderer.ts';
import { renderVehicle } from './carRenderer.ts';
import { getPenColor } from '../config/penColors.ts';
import type { BridgeManager } from '../engine/bridge';
import type { VehicleSimulation } from '../engine/vehicle';
import type { ParticleSystem } from '../engine/particles';

export interface SceneRenderParams {
  viewport: ViewportMetrics;
  level: LevelData;
  effectiveTerrains: TerrainBlock[];
  isVictory: boolean;
  animClock: number;
  bridge: BridgeManager;
  sim: VehicleSimulation;
  particles: ParticleSystem;
  selectedCar: string;
}

export function renderGameScene(
  ctx: CanvasRenderingContext2D,
  params: SceneRenderParams
): void {
  const {
    viewport,
    level,
    effectiveTerrains,
    isVictory,
    animClock,
    bridge,
    sim,
    particles,
    selectedCar
  } = params;

  const scale = viewport.scale > 0 && Number.isFinite(viewport.scale) ? viewport.scale : 1;
  const offsetX = Number.isFinite(viewport.offsetX) ? viewport.offsetX : 0;
  const offsetY = Number.isFinite(viewport.offsetY) ? viewport.offsetY : 0;

  const leftVirtual = -offsetX / scale;
  const topVirtual = -offsetY / scale;
  const widthVirtual = (Number.isFinite(viewport.w) && viewport.w > 0 ? viewport.w : GAME_CONFIG.CANVAS_WIDTH) / scale;
  const heightVirtual = (Number.isFinite(viewport.h) && viewport.h > 0 ? viewport.h : GAME_CONFIG.CANVAS_HEIGHT) / scale;

  ctx.clearRect(leftVirtual, topVirtual, widthVirtual, heightVirtual);

  renderBackground(
    ctx,
    widthVirtual,
    heightVirtual,
    level.skyTheme,
    leftVirtual,
    topVirtual
  );

  for (const terrain of effectiveTerrains) {
    renderBrickTerrain(ctx, terrain, { defaultTheme: level.wallTheme });
  }

  for (const hazard of level.hazards) {
    if (hazard.destroyed) continue;
    renderHazard(ctx, hazard, animClock, effectiveTerrains);
  }

  const isGoalReached = sim.vehicle.hasWon || isVictory;
  const winTimer = sim.vehicle.winTimer ?? (isGoalReached ? 1.0 : -1);
  renderGoal(ctx, level.goal, animClock, 1.25, isGoalReached, winTimer);

  const penStrokeColor = getPenColor(level.penColor);
  bridge.render(ctx, 1.0, penStrokeColor);

  renderVehicle(ctx, sim.vehicle, selectedCar, 1.20);

  // Particles (smoke, explosion fire, splash droplets, bubbles) render on top
  particles.render(ctx);
}
