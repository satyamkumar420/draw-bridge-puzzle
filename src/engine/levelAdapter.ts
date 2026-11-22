import type { LevelData } from '../types/level';

export const VIRTUAL_HEIGHT = 600;
export const WALL_SURFACE_Y = 300;

/**
 * Returns object scale for vehicle, flag, and stroke width based on viewport width
 */
export function getObjectScale(vWidth?: number): number {
  if (!vWidth) return 1.0;
  return Math.max(0.75, Math.min(1.25, vWidth / 1000));
}

/**
 * Proportionally adapts level geometry to fill 100% full screen width (edge-to-edge)
 * preserving all relative distances, wall positions, and gap sizes without distortion or side gaps.
 */
export function adaptLevelToViewport(baseLevel: LevelData, vWidth?: number): LevelData {
  if (!vWidth || vWidth === 1000) {
    return {
      ...baseLevel,
      coins: baseLevel.coins || []
    };
  }

  const ratioX = vWidth / 1000;

  const adaptedTerrains = baseLevel.terrains.map((t) => ({
    ...t,
    x: Math.round(t.x * ratioX),
    width: Math.round(t.width * ratioX)
  }));

  const adaptedHazards = baseLevel.hazards.map((h) => ({
    ...h,
    x: Math.round(h.x * ratioX),
    width: Math.round(h.width * ratioX),
    movement: h.movement
      ? {
          ...h.movement,
          distance:
            h.movement.axis === 'horizontal'
              ? Math.round(h.movement.distance * ratioX)
              : h.movement.distance
        }
      : undefined
  }));

  const adaptedCoins = (baseLevel.coins || []).map((c) => ({
    ...c,
    x: Math.round(c.x * ratioX)
  }));

  return {
    ...baseLevel,
    spawn: {
      ...baseLevel.spawn,
      x: Math.round(baseLevel.spawn.x * ratioX)
    },
    goal: {
      ...baseLevel.goal,
      x: Math.round(baseLevel.goal.x * ratioX)
    },
    terrains: adaptedTerrains,
    hazards: adaptedHazards,
    coins: adaptedCoins
  };
}


