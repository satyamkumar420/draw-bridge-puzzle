import type { LevelData, TerrainBlock } from '../types/level';
import { GAME_CONFIG } from '../config/constants.ts';

export interface ViewportMetrics {
  w: number;
  h: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  dpr: number;
}

/**
 * Calculates responsive viewport scale and offsets.
 * On mobile/portrait screens, zooms in on the active gameplay section (car, gap, flag)
 * so elements are comfortably large while keeping the HUD pinned to the screen edges.
 */
export function calculateViewportMetrics(
  w: number,
  h: number,
  level?: LevelData
): ViewportMetrics {
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 1;
  const isPortrait = w / h < 1.25;

  let scale: number;
  let offsetX: number;
  let offsetY: number;

  if (isPortrait && level?.spawn && level?.goal) {
    // Account for scaled vehicles and trucks extending up to ~72px behind spawn.x
    const carLeftX = level.spawn.x - 72;
    // Account for goal flag banner and post extending up to ~75px beyond goal.x
    const flagRightX = level.goal.x + 75;
    const requiredSpan = Math.max(300, flagRightX - carLeftX);

    // Generous breathing margins so vehicle rear and flag never touch screen edges
    const leftMargin = 30;
    const rightMargin = 32;

    // Zoom in on the active playable area on mobile portrait
    const targetVWidth = Math.min(GAME_CONFIG.CANVAS_WIDTH, Math.max(680, requiredSpan + 40));
    const maxFittingScale = (w - (leftMargin + rightMargin)) / requiredSpan;
    scale = Math.max(0.001, Math.min(w / targetVWidth, h / 540, maxFittingScale));

    // Center horizontally around the active play area
    const midPlayX = (carLeftX + flagRightX) / 2;
    const idealOffsetX = (w / 2) - midPlayX * scale;

    // Boundary constraints: ensure vehicle rear has >= leftMargin and flag has >= rightMargin
    const minAllowedOffsetX = leftMargin - carLeftX * scale;
    const maxAllowedOffsetX = (w - rightMargin) - flagRightX * scale;

    if (minAllowedOffsetX <= maxAllowedOffsetX) {
      offsetX = Math.max(minAllowedOffsetX, Math.min(maxAllowedOffsetX, idealOffsetX));
    } else {
      offsetX = minAllowedOffsetX;
    }

    offsetY = (h - GAME_CONFIG.CANVAS_HEIGHT * scale) / 2;
  } else {
    // Landscape / widescreen standard fit
    scale = Math.max(0.001, Math.min(w / GAME_CONFIG.CANVAS_WIDTH, h / GAME_CONFIG.CANVAS_HEIGHT));
    offsetX = (w - GAME_CONFIG.CANVAS_WIDTH * scale) / 2;
    offsetY = (h - GAME_CONFIG.CANVAS_HEIGHT * scale) / 2;

    // Safety check for landscape on narrower screens: ensure vehicle rear never clips left border
    if (level?.spawn) {
      const carLeftX = level.spawn.x - 72;
      const flagRightX = (level.goal?.x ?? 850) + 75;
      const minAllowedOffsetX = 24 - carLeftX * scale;
      const maxAllowedOffsetX = (w - 20) - flagRightX * scale;

      if (offsetX < minAllowedOffsetX) {
        if (minAllowedOffsetX <= maxAllowedOffsetX) {
          offsetX = minAllowedOffsetX;
        } else {
          // Adjust scale slightly if required on ultra-narrow landscape screens
          const span = flagRightX - carLeftX;
          scale = (w - 44) / span;
          offsetX = 24 - carLeftX * scale;
        }
      }
    }
  }

  return { w, h, scale, offsetX, offsetY, dpr };
}

/**
 * Seamlessly extends boundary terrain blocks to the screen edges so wide/tall screens
 * have edge-to-edge visuals without altering gap physics.
 */
export function calculateEffectiveTerrains(
  terrains: TerrainBlock[] | undefined,
  viewport: ViewportMetrics
): TerrainBlock[] {
  if (!terrains || terrains.length === 0) return terrains || [];

  const safeScale = viewport.scale > 0 && Number.isFinite(viewport.scale) ? viewport.scale : 1;
  const safeOffsetX = Number.isFinite(viewport.offsetX) ? viewport.offsetX : 0;
  const safeOffsetY = Number.isFinite(viewport.offsetY) ? viewport.offsetY : 0;

  const leftVirtual = -safeOffsetX / safeScale;
  const rightVirtual = (viewport.w - safeOffsetX) / safeScale;
  const topVirtual = -safeOffsetY / safeScale;
  const bottomVirtual = (viewport.h - safeOffsetY) / safeScale;

  const leftExtra = Math.max(0, -leftVirtual);
  const rightExtra = Math.max(0, rightVirtual - GAME_CONFIG.CANVAS_WIDTH);
  const topExtra = Math.max(0, -topVirtual);
  const bottomExtra = Math.max(0, bottomVirtual - GAME_CONFIG.CANVAS_HEIGHT);

  return terrains.map((t) => {
    let newX = t.x;
    let newY = t.y;
    let newW = t.width;
    let newH = t.height;

    // 1. Extend left boundary terrains to the left screen edge
    if (t.x <= 4 && leftExtra > 0) {
      newX = -leftExtra;
      newW = t.width + (t.x - newX);
    }

    // 2. Extend right boundary terrains to the right screen edge
    if (t.x + t.width >= GAME_CONFIG.CANVAS_WIDTH - 4 && rightExtra > 0) {
      newW = (GAME_CONFIG.CANVAS_WIDTH + rightExtra) - newX;
    }

    // 3. Extend top boundary terrains upwards to the top screen edge
    if (t.y <= 4 && topExtra > 0) {
      newY = -topExtra;
      newH = t.height + (t.y - newY);
    }

    // 4. Extend bottom ground terrains downwards to the bottom screen edge (only if they touch the bottom!)
    if (t.y + t.height >= GAME_CONFIG.CANVAS_HEIGHT - 4 && bottomExtra > 0) {
      newH = (GAME_CONFIG.CANVAS_HEIGHT + bottomExtra) - newY;
    }

    return { ...t, x: newX, y: newY, width: newW, height: newH };
  });
}
