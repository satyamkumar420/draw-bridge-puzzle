import type { GoalArea, HazardBlock, CoinItem, SkyThemeId, TerrainBlock } from '../types/level';
import { GAME_CONFIG } from '../config/constants.ts';
import { getSkyTheme } from '../config/skyThemes.ts';
import { drawHazardMovementGuides } from './hazardMotionRenderer.ts';

function drawSingleCloud(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  alpha = 0.22
): void {
  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath();
  ctx.arc(cx, cy, 22 * scale, 0, Math.PI * 2);
  ctx.arc(cx + 20 * scale, cy - 9 * scale, 28 * scale, 0, Math.PI * 2);
  ctx.arc(cx + 48 * scale, cy - 5 * scale, 24 * scale, 0, Math.PI * 2);
  ctx.arc(cx + 68 * scale, cy + 4 * scale, 18 * scale, 0, Math.PI * 2);
  ctx.arc(cx + 34 * scale, cy + 10 * scale, 22 * scale, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawAtmosphericClouds(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  width: number,
  skySpan: number
): void {
  const topY = startY + skySpan * 0.25;
  const midY = startY + skySpan * 0.55;
  drawSingleCloud(ctx, startX + width * 0.16, midY, 1.1, 0.16);
  drawSingleCloud(ctx, startX + width * 0.65, topY, 1.25, 0.20);
  drawSingleCloud(ctx, startX + width * 0.42, startY + skySpan * 0.75, 0.85, 0.14);
}

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  skyThemeId?: SkyThemeId,
  startX = 0,
  startY = 0
): void {
  const safeStartX = Number.isFinite(startX) ? startX : 0;
  const safeStartY = Number.isFinite(startY) ? startY : 0;
  const safeWidth = Number.isFinite(width) && width > 0 ? width : GAME_CONFIG.CANVAS_WIDTH;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : GAME_CONFIG.CANVAS_HEIGHT;

  const theme = getSkyTheme(skyThemeId);
  try {
    const skyGrad = ctx.createLinearGradient(0, safeStartY, 0, safeStartY + safeHeight);
    skyGrad.addColorStop(0, theme.skyTop);
    if (theme.skyMiddle) {
      skyGrad.addColorStop(0.5, theme.skyMiddle);
    }
    skyGrad.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = skyGrad;
  } catch {
    ctx.fillStyle = theme.skyTop || '#38bdf8';
  }

  ctx.fillRect(safeStartX, safeStartY, safeWidth, safeHeight);

  // When viewport extends upward in portrait mode, draw subtle soft atmospheric clouds
  if (safeStartY < -40) {
    drawAtmosphericClouds(ctx, safeStartX, safeStartY, safeWidth, -safeStartY);
  }
}

/**
 * Draws the finish line flag standing firmly on top of the road surface
 */
export function renderGoal(
  ctx: CanvasRenderingContext2D,
  goal: GoalArea,
  animTime = 0,
  scale = 1.25,
  isReached = false,
  winTimer = -1
): void {
  if (!goal) return;
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1.0;
  const x = Number.isFinite(goal.x) ? goal.x : 0;
  const y = Number.isFinite(goal.y) ? goal.y : 0;
  // Goal y is the road surface level. The flagpole stands upwards into the sky.
  const poleBaseX = x + 25 * safeScale;
  const poleBaseY = y;
  const poleHeight = 75 * safeScale;
  const poleRadius = Math.max(1.5, 2.25 * safeScale);
  const poleWidth = poleRadius * 2;

  ctx.save();

  // Entire pipe + flag rotates 360 degrees around ground base point (poleBaseX, poleBaseY)
  const flipDuration = 0.55;
  const progress = isReached && winTimer >= 0 ? Math.min(1.0, winTimer / flipDuration) : (isReached ? 1.0 : 0.0);

  let isGreen = false;
  let rotAngle = 0.0;

  if (progress <= 0.0) {
    isGreen = false;
    rotAngle = 0.0;
  } else if (progress >= 1.0) {
    isGreen = true;
    rotAngle = 0.0;
  } else {
    // Smooth 360-degree rotation curve (0 to 2*PI)
    const t = progress;
    const easeProgress = t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;

    rotAngle = easeProgress * Math.PI * 2;

    // As it sweeps through the bottom (180 degrees / progress >= 0.5), it becomes green
    isGreen = progress >= 0.5;

    // Subtle elastic snap at the completion of the 360-degree spin
    if (progress > 0.88) {
      const snapT = (progress - 0.88) / 0.12;
      rotAngle += Math.sin(snapT * Math.PI) * 0.08;
    }
  }

  // Anchor pivot at the ground base
  ctx.translate(poleBaseX, poleBaseY);
  if (typeof ctx.rotate === 'function') ctx.rotate(rotAngle);

  // 1. Pivot Base Mount / Bolt on the ground
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  if (typeof ctx.arc === 'function') {
    ctx.arc(0, 0, poleRadius * 1.5, 0, Math.PI * 2);
  }
  ctx.fill();

  // 2. Vertical Steel Pipe (metallic steel gradient, rotating together with flag)
  try {
    const poleGrad = ctx.createLinearGradient(-poleRadius, 0, poleRadius, 0);
    poleGrad.addColorStop(0, '#64748b');
    poleGrad.addColorStop(0.3, '#f1f5f9');
    poleGrad.addColorStop(0.65, '#94a3b8');
    poleGrad.addColorStop(1, '#475569');
    ctx.fillStyle = poleGrad;
  } catch {
    ctx.fillStyle = '#94a3b8';
  }
  ctx.fillRect(-poleRadius, -poleHeight, poleWidth, poleHeight);

  // Subtle steel pipe border
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = Math.max(0.75, 1 * safeScale);
  ctx.strokeRect(-poleRadius, -poleHeight, poleWidth, poleHeight);

  // 3. Top Finial Cap of the pole
  ctx.fillStyle = isGreen ? '#22c55e' : '#f59e0b';
  ctx.beginPath();
  if (typeof ctx.arc === 'function') {
    ctx.arc(0, -poleHeight, poleRadius * 1.4, 0, Math.PI * 2);
  }
  ctx.fill();

  // 4. Triangular Flag Banner attached to top of the rotating pipe
  const flagW = 46 * safeScale;
  const flagH = 30 * safeScale;
  const flagTopY = -poleHeight + 2 * safeScale;
  const flutter = (progress <= 0.0 || progress >= 1.0) ? Math.sin(animTime * 8) * 2.5 * safeScale : 0;

  ctx.fillStyle = isGreen ? '#22c55e' : GAME_CONFIG.COLORS.FLAG_BANNER;
  ctx.beginPath();
  ctx.moveTo(poleRadius, flagTopY);
  ctx.lineTo(poleRadius + flagW, flagTopY + 12 * safeScale + flutter);
  ctx.lineTo(poleRadius, flagTopY + flagH);
  ctx.closePath();
  ctx.fill();

  // Border of flag
  ctx.strokeStyle = isGreen ? '#15803d' : '#b91c1c';
  ctx.lineWidth = Math.max(1, 1.5 * safeScale);
  ctx.stroke();

  // Inner flag highlight
  ctx.fillStyle = isGreen ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.25)';
  ctx.beginPath();
  ctx.moveTo(poleRadius, flagTopY);
  ctx.lineTo(poleRadius + flagW * 0.5, flagTopY + 7 * safeScale + flutter * 0.5);
  ctx.lineTo(poleRadius, flagTopY + flagH * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export interface TerrainBounds {
  leftWallX: number;
  rightWallX: number;
  floorY: number;
  hasLeftWall: boolean;
  hasRightWall: boolean;
  hasFloor: boolean;
}

export function getSurroundingTerrainBounds(
  hazard: HazardBlock,
  terrains?: TerrainBlock[],
  checkY?: number
): TerrainBounds {
  const hx = Number.isFinite(hazard.x) ? hazard.x : 0;
  const hy = Number.isFinite(hazard.y) ? hazard.y : 0;
  const hw = Number.isFinite(hazard.width) && hazard.width > 0 ? hazard.width : 40;
  const hh = Number.isFinite(hazard.height) && hazard.height > 0 ? hazard.height : 40;
  const cx = hx + hw / 2;
  const cy = hy + hh / 2;
  const yTarget = Number.isFinite(checkY) ? (checkY as number) : cy;

  let leftWallX = hx;
  let rightWallX = hx + hw;
  let floorY = hy + hh + 40;
  let hasLeftWall = false;
  let hasRightWall = false;
  let hasFloor = false;

  if (terrains && terrains.length > 0) {
    let minLeftDist = Infinity;
    let minRightDist = Infinity;
    let minFloorDist = Infinity;

    for (const t of terrains) {
      const tLeft = Number.isFinite(t.x) ? t.x : 0;
      const tRight = tLeft + (Number.isFinite(t.width) ? t.width : 0);
      const tTop = Number.isFinite(t.y) ? t.y : 0;
      const tBottom = tTop + (Number.isFinite(t.height) ? t.height : 0);

      // Check left wall: terrain must physically cover the target Y height
      if (tRight <= cx + 15 && tTop <= yTarget + 15 && tBottom >= yTarget - 15) {
        const dist = cx - tRight;
        if (dist >= 0 && dist < minLeftDist) {
          minLeftDist = dist;
          leftWallX = tRight;
          hasLeftWall = true;
        }
      }

      // Check right wall: terrain must physically cover the target Y height
      if (tLeft >= cx - 15 && tTop <= yTarget + 15 && tBottom >= yTarget - 15) {
        const dist = tLeft - cx;
        if (dist >= 0 && dist < minRightDist) {
          minRightDist = dist;
          rightWallX = tLeft;
          hasRightWall = true;
        }
      }

      // Check bottom floor
      if (tLeft <= cx + hw && tRight >= cx - hw) {
        if (tTop >= cy - 10) {
          const dist = tTop - cy;
          if (dist >= 0 && dist < minFloorDist) {
            minFloorDist = dist;
            floorY = tTop;
            hasFloor = true;
          }
        }
      }
    }
  }

  return { leftWallX, rightWallX, floorY, hasLeftWall, hasRightWall, hasFloor };
}

function drawHazardMountingInfrastructure(
  ctx: CanvasRenderingContext2D,
  bounds: TerrainBounds,
  pipeY: number,
  cx: number,
  drawVerticalPost = true
): void {
  const { floorY, hasFloor } = bounds;

  // 1. Vertical Support Column / Stanchion to the bottom brick floor
  if (drawVerticalPost && hasFloor && floorY > pipeY) {
    const postW = 10;
    const postX = cx - postW / 2;
    const postH = floorY - pipeY;

    // Heavy vertical steel tube
    try {
      const postGrad = ctx.createLinearGradient(postX, 0, postX + postW, 0);
      postGrad.addColorStop(0, '#475569');
      postGrad.addColorStop(0.35, '#94a3b8');
      postGrad.addColorStop(0.7, '#64748b');
      postGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = postGrad;
    } catch {
      ctx.fillStyle = '#64748b';
    }
    ctx.fillRect(postX, pipeY, postW, postH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(postX, pipeY, postW, postH);

    // Welded Base Mounting Flange at the bottom brick floor
    const baseW = 24;
    const baseH = 8;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - baseW / 2, floorY - baseH, baseW, baseH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cx - baseW / 2, floorY - baseH, baseW, baseH);

    // Ground anchor bolts / masonry fasteners
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(cx - 7, floorY - 4, 1.8, 0, Math.PI * 2);
    ctx.arc(cx + 7, floorY - 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderHazard(
  ctx: CanvasRenderingContext2D,
  hazard: HazardBlock,
  animTime: number,
  terrains?: TerrainBlock[]
): void {
  if (hazard.destroyed) return;

  const x = hazard.currentX ?? hazard.x;
  const y = hazard.currentY ?? hazard.y;
  const { width, height, type } = hazard;

  // Draw guide rails and piston tracks if hazard has dynamic movement
  if (hazard.movement) {
    drawHazardMovementGuides(ctx, hazard, x, y, terrains);
  }

  ctx.save();

  if (type === 'spikes') {
    const spikeW = 16;
    const count = Math.floor(width / spikeW);

    for (let i = 0; i < count; i++) {
      const sx = x + i * spikeW;
      ctx.fillStyle = GAME_CONFIG.COLORS.SPIKE_COLOR;
      ctx.beginPath();
      ctx.moveTo(sx, y + height);
      ctx.lineTo(sx + spikeW / 2, y);
      ctx.lineTo(sx + spikeW, y + height);
      ctx.closePath();
      ctx.fill();

      // Metallic highlight
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + spikeW / 2, y);
      ctx.lineTo(sx + spikeW / 2, y + height);
      ctx.stroke();
    }
  } else if (type === 'water' || type === 'pit') {
    const safeY = Number.isFinite(y) ? y : 0;
    const safeH = Number.isFinite(height) && height > 0 ? height : 40;
    try {
      const waterGrad = ctx.createLinearGradient(0, safeY, 0, safeY + safeH);
      waterGrad.addColorStop(0, 'rgba(2, 132, 199, 0.85)');
      waterGrad.addColorStop(1, 'rgba(3, 105, 161, 0.95)');
      ctx.fillStyle = waterGrad;
    } catch {
      ctx.fillStyle = 'rgba(2, 132, 199, 0.85)';
    }

    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x, y + 8);

    const waveCount = 8;
    const waveStep = width / waveCount;
    for (let i = 0; i <= waveCount; i++) {
      const wx = x + i * waveStep;
      const wy = y + Math.sin(animTime * 4 + i) * 4 + 4;
      ctx.lineTo(wx, wy);
    }

    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  } else if (type === 'chakra' || (type as string) === 'circular_saw' || (type as string) === 'spinner') {
    // Rotating Sawblade / Buzzsaw
    const cx = Number.isFinite(x) ? x + (width || 40) / 2 : 0;
    const cy = Number.isFinite(y) ? y + (height || 40) / 2 : 0;
    const rawR = Math.min(width || 40, height || 40) / 2 - 2;
    const r = Math.max(6, Number.isFinite(rawR) ? rawR : 18);
    const bounds = getSurroundingTerrainBounds(hazard, terrains);

    // Draw vertical support stanchion rising from the bottom brick floor if floor exists
    if (bounds.hasFloor && bounds.floorY > cy) {
      const postW = 8;
      const postX = cx - postW / 2;
      const postH = bounds.floorY - cy;
      ctx.fillStyle = '#475569';
      ctx.fillRect(postX, cy, postW, postH);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.strokeRect(postX, cy, postW, postH);

      // Welded base flange
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 10, bounds.floorY - 6, 20, 6);
      ctx.strokeStyle = '#0f172a';
      ctx.strokeRect(cx - 10, bounds.floorY - 6, 20, 6);
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(animTime * 12);

    // Outer serrated saw teeth
    const teethCount = 14;
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    for (let i = 0; i < teethCount; i++) {
      const a1 = (i / teethCount) * Math.PI * 2;
      const a2 = ((i + 0.6) / teethCount) * Math.PI * 2;
      const a3 = ((i + 1) / teethCount) * Math.PI * 2;

      const p1x = Math.cos(a1) * r;
      const p1y = Math.sin(a1) * r;
      const p2x = Math.cos(a2) * (r * 0.76);
      const p2y = Math.sin(a2) * (r * 0.76);
      const p3x = Math.cos(a3) * (r * 0.72);
      const p3y = Math.sin(a3) * (r * 0.72);

      if (i === 0) ctx.moveTo(p1x, p1y);
      else ctx.lineTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Metallic disk body
    try {
      const bodyGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.max(3, r * 0.72));
      bodyGrad.addColorStop(0, '#f8fafc');
      bodyGrad.addColorStop(0.3, '#cbd5e1');
      bodyGrad.addColorStop(0.7, '#64748b');
      bodyGrad.addColorStop(1, '#334155');
      ctx.fillStyle = bodyGrad;
    } catch {
      ctx.fillStyle = '#64748b';
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Concentric machined steel track
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // 4 circular ventilation holes
    for (let h = 0; h < 4; h++) {
      const hAngle = (h * Math.PI) / 2;
      const hx = Math.cos(hAngle) * (r * 0.45);
      const hy = Math.sin(hAngle) * (r * 0.45);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(hx, hy, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central brass axle bolt
    try {
      const boltGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, Math.max(2, r * 0.22));
      boltGrad.addColorStop(0, '#fef08a');
      boltGrad.addColorStop(0.6, '#f59e0b');
      boltGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = boltGrad;
    } catch {
      ctx.fillStyle = '#f59e0b';
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center pin
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  } else if (type === 'fire' || (type as string) === 'lava') {
    // Metal burner nozzle base
    const nozzleH = Math.min(12, height * 0.25);
    const nozzleY = y + height - nozzleH;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 2, nozzleY, width - 4, nozzleH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2, nozzleY, width - 4, nozzleH);

    // Burner slot accents
    ctx.fillStyle = '#0f172a';
    const slotCount = Math.max(2, Math.floor(width / 16));
    const slotW = (width - 12) / slotCount;
    for (let s = 0; s < slotCount; s++) {
      ctx.fillRect(x + 6 + s * slotW, nozzleY + 3, slotW - 4, nozzleH - 6);
    }

    // Animated flame tongues
    const flameH = height - nozzleH;
    const tongueCount = Math.max(3, Math.floor(width / 18));
    const tongueStep = width / tongueCount;

    // Outer flame (dark orange-red)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.beginPath();
    ctx.moveTo(x, nozzleY);
    for (let i = 0; i <= tongueCount; i++) {
      const fx = x + i * tongueStep;
      const wave = Math.sin(animTime * 9 + i * 2.1) * 6;
      const fy = y + (i % 2 === 0 ? 4 : 12) + wave;
      ctx.lineTo(fx, fy);
    }
    ctx.lineTo(x + width, nozzleY);
    ctx.closePath();
    ctx.fill();

    // Mid flame (fiery orange-yellow)
    ctx.fillStyle = 'rgba(249, 115, 22, 0.92)';
    ctx.beginPath();
    ctx.moveTo(x + 4, nozzleY);
    for (let i = 0; i <= tongueCount; i++) {
      const fx = x + 4 + i * (tongueStep * 0.9);
      const wave = Math.cos(animTime * 11 + i * 1.8) * 5;
      const fy = y + flameH * 0.35 + wave;
      ctx.lineTo(fx, fy);
    }
    ctx.lineTo(x + width - 4, nozzleY);
    ctx.closePath();
    ctx.fill();

    // Core flame (bright yellow-white hot)
    ctx.fillStyle = 'rgba(254, 240, 138, 0.95)';
    ctx.beginPath();
    ctx.moveTo(x + 8, nozzleY);
    for (let i = 0; i <= tongueCount; i++) {
      const fx = x + 8 + i * (tongueStep * 0.8);
      const wave = Math.sin(animTime * 13 + i * 2.5) * 4;
      const fy = y + flameH * 0.65 + wave;
      ctx.lineTo(fx, fy);
    }
    ctx.lineTo(x + width - 8, nozzleY);
    ctx.closePath();
    ctx.fill();

    // Floating incandescent embers
    for (let e = 0; e < 4; e++) {
      const emberProgress = ((animTime * 2 + e * 0.3) % 1);
      const ex = x + 8 + ((e * 23) % (width - 16)) + Math.sin(animTime * 6 + e) * 4;
      const ey = nozzleY - emberProgress * (flameH + 10);
      const alpha = 1 - emberProgress;
      ctx.fillStyle = `rgba(253, 224, 71, ${alpha})`;
      ctx.beginPath();
      ctx.arc(ex, ey, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'laser') {
    // Twin metallic vertical emitter posts mounted directly flush against both brick walls
    const bracketW = 4;
    const pylonW = Math.min(16, Math.max(12, width * 0.1));
    const pylonH = height;
    const rx = x + width - pylonW;
    const beamY = y + height / 2;

    // 0. Recessed vertical steel guide tracks on cliff walls for moving lasers
    if (hazard.movement && hazard.movement.axis === 'vertical') {
      const travel = hazard.movement.distance;
      const trackTop = Math.max(0, hazard.y - travel / 2 - 8);
      const trackBottom = hazard.y + pylonH + travel / 2 + 8;
      const trackH = trackBottom - trackTop;
      const trackW = 6;

      // Left wall guide rail channel
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - trackW, trackTop, trackW, trackH);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - trackW, trackTop, trackW, trackH);

      // Right wall guide rail channel
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + width, trackTop, trackW, trackH);
      ctx.strokeRect(x + width, trackTop, trackW, trackH);

      // Heavy anchor bolts
      ctx.fillStyle = '#64748b';
      for (let ty = trackTop + 6; ty < trackBottom; ty += 14) {
        ctx.fillRect(x - trackW + 2, ty, 2, 2);
        ctx.fillRect(x + width + trackW - 4, ty, 2, 2);
      }
    }

    // 1. Industrial wall mounting brackets & masonry bolts (anchored flush to the brick walls)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y + 2, bracketW, pylonH - 4);
    ctx.fillRect(x + width - bracketW, y + 2, bracketW, pylonH - 4);

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    // Left masonry anchor bolts
    ctx.arc(x + 2, y + 8, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 2, y + pylonH - 8, 1.5, 0, Math.PI * 2);
    // Right masonry anchor bolts
    ctx.arc(x + width - 2, y + 8, 1.5, 0, Math.PI * 2);
    ctx.arc(x + width - 2, y + pylonH - 8, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Left Pylon Emitter Body
    const leftBodyW = pylonW - bracketW;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + bracketW, y, leftBodyW, pylonH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + bracketW, y, leftBodyW, pylonH);

    // Left emitter horizontal grooves
    ctx.fillStyle = '#334155';
    ctx.fillRect(x + bracketW + 2, y + 10, leftBodyW - 4, 2);
    ctx.fillRect(x + bracketW + 2, y + pylonH - 12, leftBodyW - 4, 2);

    // Left emitter diode & pulse ring
    const leftDiodeX = x + bracketW + leftBodyW / 2;
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(leftDiodeX, beamY, 4, 0, Math.PI * 2);
    ctx.fill();

    // 3. Right Pylon Receiver Body
    const rightBodyW = pylonW - bracketW;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(rx, y, rightBodyW, pylonH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, y, rightBodyW, pylonH);

    // Right receiver horizontal grooves
    ctx.fillStyle = '#334155';
    ctx.fillRect(rx + 2, y + 10, rightBodyW - 4, 2);
    ctx.fillRect(rx + 2, y + pylonH - 12, rightBodyW - 4, 2);

    // Right receiver diode & pulse ring
    const rightDiodeX = rx + rightBodyW / 2;
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(rightDiodeX, beamY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Diode energetic pulsing rings
    const pulseR = 5 + Math.sin(animTime * 8) * 1.5;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(leftDiodeX, beamY, pulseR, 0, Math.PI * 2);
    ctx.arc(rightDiodeX, beamY, pulseR, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Full-Span Laser Plasma Beam (spanning from left pylon to right pylon across the gap)
    const beamStart = x + pylonW;
    const beamEnd = rx;

    // Wide outer glow
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    ctx.lineWidth = Math.min(18, height * 0.6);
    ctx.beginPath();
    ctx.moveTo(beamStart, beamY);
    ctx.lineTo(beamEnd, beamY);
    ctx.stroke();

    // Mid neon laser beam
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = Math.min(8, height * 0.3);
    ctx.beginPath();
    ctx.moveTo(beamStart, beamY);
    ctx.lineTo(beamEnd, beamY);
    ctx.stroke();

    // High-energy cyan electric core
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(beamStart, beamY);
    ctx.lineTo(beamEnd, beamY);
    ctx.stroke();

    // Core blinding white laser beam
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(beamStart, beamY);
    ctx.lineTo(beamEnd, beamY);
    ctx.stroke();

    // Contact flares at emitter and receiver nozzles
    ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.beginPath();
    ctx.arc(beamStart, beamY, 5, 0, Math.PI * 2);
    ctx.arc(beamEnd, beamY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Animated electric plasma zap sparks
    const zapCount = Math.max(3, Math.floor((beamEnd - beamStart) / 25));
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(beamStart, beamY);
    for (let z = 1; z < zapCount; z++) {
      const zx = beamStart + (z / zapCount) * (beamEnd - beamStart);
      const zy = beamY + Math.sin(animTime * 15 + z * 3) * (height * 0.2);
      ctx.lineTo(zx, zy);
    }
    ctx.lineTo(beamEnd, beamY);
    ctx.stroke();
  } else if (type === 'tnt') {
    // Explosive Barrel / Mine
    const cornerR = 5;
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(x, y + 4, width, height - 4, cornerR);
    ctx.fill();
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top & bottom dark metal barrel hoops
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y + 6, width, 5);
    ctx.fillRect(x, y + height - 9, width, 5);

    // Hazard warning stripes belt in middle
    const bandY = y + height * 0.38;
    const bandH = height * 0.28;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, bandY, width, bandH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, bandY, width, bandH);
    ctx.clip();
    ctx.fillStyle = '#eab308';
    const stripeW = 10;
    for (let s = -stripeW; s < width + stripeW; s += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x + s, bandY + bandH);
      ctx.lineTo(x + s + stripeW, bandY);
      ctx.lineTo(x + s + stripeW * 1.5, bandY);
      ctx.lineTo(x + s + stripeW * 0.5, bandY + bandH);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // TNT Stencil text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(10, Math.floor(height * 0.3))}px "Press Start 2P", monospace, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TNT', x + width / 2, y + height * 0.54);

    // Top fuse with animated sparkling ember
    const fuseStartX = x + width / 2;
    const fuseStartY = y + 4;
    const fuseTipX = fuseStartX - 8;
    const fuseTipY = y - 4;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fuseStartX, fuseStartY);
    ctx.quadraticCurveTo(fuseStartX - 2, y - 2, fuseTipX, fuseTipY);
    ctx.stroke();

    // Burning spark at fuse tip
    const sparkPulse = Math.sin(animTime * 20) * 0.5 + 0.5;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(fuseTipX, fuseTipY, 2.5 + sparkPulse * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(fuseTipX, fuseTipY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'crusher') {
    // Spike Crusher / Ground Stomper (Spikes facing Upwards)
    const pistonH = Math.min(16, height * 0.28);
    const pistonW = 14;
    const hammerH = height * 0.44;
    const spikeH = height - pistonH - hammerH;

    // 1. Hydraulic base mount / piston rod resting at bottom
    const px = x + width / 2 - pistonW / 2;
    const py = y + height - pistonH;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(px, py, pistonW, pistonH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, pistonW, pistonH);

    // 2. Heavy iron hammer block in middle
    const hy = y + spikeH;
    ctx.fillStyle = '#334155';
    ctx.fillRect(x, hy, width, hammerH);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, hy, width, hammerH);

    // Bevel highlight
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2, hy + hammerH - 2);
    ctx.lineTo(x + width - 2, hy + hammerH - 2);
    ctx.stroke();

    // Hazard warning stripe bar
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(x + 6, hy + hammerH * 0.35, width - 12, hammerH * 0.3);
    ctx.fillStyle = '#1e293b';
    for (let s = 8; s < width - 12; s += 12) {
      ctx.fillRect(x + s, hy + hammerH * 0.35, 6, hammerH * 0.3);
    }

    // 3. Upward-facing steel spikes along top face
    const spikeCount = Math.max(3, Math.floor(width / 14));
    const spikeStep = width / spikeCount;
    const sy = hy;

    for (let i = 0; i < spikeCount; i++) {
      const sx = x + i * spikeStep;
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + spikeStep / 2, y);
      ctx.lineTo(sx + spikeStep, sy);
      ctx.closePath();
      ctx.fill();

      // Sharp edge line
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else if (type === 'acid') {
    // Toxic Corrosive Acid Pool
    const safeY = Number.isFinite(y) ? y : 0;
    const safeH = Number.isFinite(height) && height > 0 ? height : 40;
    try {
      const acidGrad = ctx.createLinearGradient(0, safeY, 0, safeY + safeH);
      acidGrad.addColorStop(0, 'rgba(34, 197, 94, 0.9)');
      acidGrad.addColorStop(1, 'rgba(21, 128, 61, 0.95)');
      ctx.fillStyle = acidGrad;
    } catch {
      ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
    }

    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x, y + 8);

    const waveCount = 6;
    const waveStep = width / waveCount;
    for (let i = 0; i <= waveCount; i++) {
      const wx = x + i * waveStep;
      const wy = y + Math.sin(animTime * 6 + i * 1.5) * 3 + 4;
      ctx.lineTo(wx, wy);
    }
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();

    // Glowing surface rim
    ctx.strokeStyle = 'rgba(134, 239, 172, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bubbling toxic spheres
    for (let b = 0; b < 4; b++) {
      const bubbleProgress = ((animTime * 1.5 + b * 0.28) % 1);
      const bx = x + 10 + ((b * 27) % Math.max(10, width - 20));
      const by = y + 8 - bubbleProgress * 12;
      const bRadius = (1 - bubbleProgress) * 4;
      if (bRadius > 0.5) {
        ctx.fillStyle = 'rgba(187, 247, 208, 0.75)';
        ctx.beginPath();
        ctx.arc(bx, by, bRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (type === 'tesla') {
    // Tesla Electric Zap Coil
    const cx = x + width / 2;
    const baseH = Math.min(14, height * 0.22);
    const baseY = y + height - baseH;

    // Metal transformer base
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 4, baseY, width - 8, baseH);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 4, baseY, width - 8, baseH);

    // Copper winding rings
    const ringCount = 4;
    const ringSpacing = (height - baseH - 18) / ringCount;
    for (let r = 0; r < ringCount; r++) {
      const ry = baseY - (r + 1) * ringSpacing;
      const ringW = Math.max(12, width * 0.5 - r * 2);
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(cx - ringW / 2, ry, ringW, 4, 2);
      ctx.fill();
    }

    // Top electrode sphere
    const orbY = y + 10;
    const orbR = Math.min(12, width * 0.25);
    try {
      const orbGrad = ctx.createRadialGradient(cx, orbY, 1, cx, orbY, orbR);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.4, '#60a5fa');
      orbGrad.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = orbGrad;
    } catch {
      ctx.fillStyle = '#3b82f6';
    }
    ctx.beginPath();
    ctx.arc(cx, orbY, orbR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Electric zap discharge sparks
    const sparkAngle = animTime * 8;
    for (let s = 0; s < 3; s++) {
      const a = sparkAngle + (s * Math.PI * 2) / 3;
      const sx = cx + Math.cos(a) * (orbR + 8 + Math.sin(animTime * 15 + s) * 4);
      const sy = orbY + Math.sin(a) * (orbR + 8 + Math.cos(animTime * 15 + s) * 4);
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, orbY);
      ctx.lineTo((cx + sx) / 2 + (Math.random() - 0.5) * 6, (orbY + sy) / 2 + (Math.random() - 0.5) * 6);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }
  } else if (type === 'plasma') {
    // Pulsing Plasma Core
    const cx = x + width / 2;
    const cy = y + height / 2;
    const coreR = Math.min(width, height) * 0.38;
    const pulse = Math.sin(animTime * 8) * 4;
    const outerR = coreR + 10 + pulse;

    // Outer plasma glow corona
    try {
      const glowGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, Math.max(4, outerR));
      glowGrad.addColorStop(0, '#ffffff');
      glowGrad.addColorStop(0.25, '#f472b6');
      glowGrad.addColorStop(0.65, '#db2777');
      glowGrad.addColorStop(1, 'rgba(131, 24, 67, 0)');
      ctx.fillStyle = glowGrad;
    } catch {
      ctx.fillStyle = '#ec4899';
    }
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(4, outerR), 0, Math.PI * 2);
    ctx.fill();

    // Rotating orbital plasma rings (3D gyroscope atom effect)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(animTime * 3.5);
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, coreR * 1.35, coreR * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(Math.PI / 3);
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, coreR * 1.35, coreR * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(Math.PI / 3);
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, coreR * 1.35, coreR * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Intense inner blinding core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(3, coreR * 0.28), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  } else if (type === 'meteor') {
    // Magma Meteorite
    const cx = x + width / 2;
    const cy = y + height / 2;
    const r = Math.min(width, height) * 0.38;

    // Charred volcanic rock with glowing fissures
    try {
      const rockGrad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, r);
      rockGrad.addColorStop(0, '#f97316');
      rockGrad.addColorStop(0.4, '#b45309');
      rockGrad.addColorStop(0.8, '#44403c');
      rockGrad.addColorStop(1, '#1c1917');
      ctx.fillStyle = rockGrad;
    } catch {
      ctx.fillStyle = '#ea580c';
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fiery burning embers
    for (let e = 0; e < 4; e++) {
      const ea = animTime * 5 + (e * Math.PI) / 2;
      const er = r + 4 + Math.sin(animTime * 10 + e) * 3;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ea) * er, cy + Math.sin(ea) * er, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'stalactite') {
    // Razor Stalagmite / Rock Spikes (rising upward from ground base)
    const spikeW = 14;
    const count = Math.max(2, Math.floor(width / spikeW));
    const step = width / count;
    const baseY = y + height;

    // Rocky grounding base bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, baseY - 4, width, 4);

    for (let i = 0; i < count; i++) {
      const sx = x + i * step;
      const sh = height * (0.75 + Math.sin(i * 3.7) * 0.22);
      const tipY = baseY - sh;
      const midX = sx + step / 2;

      // Left facet (medium slate rock)
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(sx, baseY);
      ctx.lineTo(midX, tipY);
      ctx.lineTo(midX, baseY);
      ctx.closePath();
      ctx.fill();

      // Right facet (darker shadowed slate rock)
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(midX, baseY);
      ctx.lineTo(midX, tipY);
      ctx.lineTo(sx + step, baseY);
      ctx.closePath();
      ctx.fill();

      // Sharp central rock ridge & outline
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, baseY);
      ctx.lineTo(midX, tipY);
      ctx.lineTo(sx + step, baseY);
      ctx.moveTo(midX, tipY);
      ctx.lineTo(midX, baseY);
      ctx.stroke();

      // Sharp highlight glint near the apex
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(midX, tipY);
      ctx.lineTo(midX - 2, tipY + Math.min(8, sh * 0.2));
      ctx.lineTo(midX + 2, tipY + Math.min(8, sh * 0.2));
      ctx.closePath();
      ctx.fill();
    }
  } else if (type === 'toxic_barrel') {
    // Biohazard Nuclear Sludge Drum
    const cornerR = Math.max(4, Math.floor(width * 0.07));
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 4, width - 4, height - 8, cornerR);
    ctx.fill();
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Steel bands
    const bandH = Math.max(5, Math.floor(height * 0.08));
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 2, y + 8, width - 4, bandH);
    ctx.fillRect(x + 2, y + height - 8 - bandH, width - 4, bandH);

    // Biohazard Symbol
    ctx.fillStyle = '#facc15';
    ctx.font = `bold ${Math.max(16, Math.floor(height * 0.42))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☣', x + width / 2, y + height / 2);

    // Sludge dripping out
    const dropR = Math.max(3.5, Math.floor(width * 0.05));
    ctx.fillStyle = '#84cc16';
    ctx.beginPath();
    ctx.arc(x + width * 0.75, y + height - 5, dropR, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'guillotine') {
    // 360-Degree Rotating Guillotine Blade Trap on Structural Steel Pipe
    const cx = Number.isFinite(x) ? x + width / 2 : 0;
    const cy = Number.isFinite(y) ? y + height / 2 : 0;
    const rotAngle = animTime * 3.2;
    const bounds = getSurroundingTerrainBounds(hazard, terrains);

    // 1. Structural horizontal pipe connecting brick walls + vertical ground post to bottom floor
    drawHazardMountingInfrastructure(ctx, bounds, cy, cx, true);

    // 2. 360-Degree Rotating Blade Mechanism
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotAngle);

    const armLen = Math.max(16, Math.min(24, height * 0.36));

    // Steel Arm
    ctx.fillStyle = '#475569';
    ctx.fillRect(-3, -armLen * 0.4, 6, armLen * 1.4);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(-3, -armLen * 0.4, 6, armLen * 1.4);

    // Arm metallic highlights & rivets
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, armLen * 0.4, 2, 0, Math.PI * 2);
    ctx.arc(0, -armLen * 0.2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Primary Crescent Execution Blade
    const bladeW = Math.max(26, Math.min(36, width * 0.18));
    const bladeH = bladeW / 2;
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, armLen, bladeH, 0, Math.PI);
    ctx.closePath();
    ctx.fill();

    // Sharp Crimson Blood / Laser Cutting Edge
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Blade inner highlight & slot
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, armLen, bladeH * 0.5, 0, Math.PI);
    ctx.closePath();
    ctx.fill();

    // Counterweight / Rear Balance Spike on opposite side
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(-4, -armLen * 0.35);
    ctx.lineTo(0, -armLen * 0.55);
    ctx.lineTo(4, -armLen * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();

    // 3. Central Axle Hub & Heavy Bearing (drawn on top of the rotating arm)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();

    // Golden Central Pivot Bolt
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'ice_spikes') {
    // Cryo Glacier Spikes
    const spikeW = 16;
    const count = Math.max(2, Math.floor(width / spikeW));
    const step = width / count;

    for (let i = 0; i < count; i++) {
      const sx = x + i * step;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.beginPath();
      ctx.moveTo(sx, y + height);
      ctx.lineTo(sx + step / 2, y);
      ctx.lineTo(sx + step, y + height);
      ctx.closePath();
      ctx.fill();

      // Icy frosty edge
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx + step / 2, y);
      ctx.lineTo(sx + step / 2, y + height);
      ctx.stroke();
    }
  } else if (type === 'blackhole') {
    // Dark Singularity Gravity Void
    const cx = x + width / 2;
    const cy = y + height / 2;
    const r = Math.min(width, height) * 0.36;

    // Violet accretion disk
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-animTime * 6);
    try {
      const diskGrad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.3);
      diskGrad.addColorStop(0, '#8b5cf6');
      diskGrad.addColorStop(0.6, '#4c1d95');
      diskGrad.addColorStop(1, 'rgba(30, 27, 75, 0)');
      ctx.fillStyle = diskGrad;
    } catch {
      ctx.fillStyle = '#8b5cf6';
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Event horizon core (pitch black)
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (type === 'wrecking_ball') {
    // Heavy Industrial Spiked Wrecking Ball suspended from Wall-to-Wall Mounting Pipe
    const cx = Number.isFinite(x) ? x + width / 2 : 0;
    const cy = Number.isFinite(y) ? y + height / 2 : 0;
    const r = Math.max(10, Math.min(22, (width || 56) * 0.32));
    const pipeY = Math.min(cy - r - 12, (Number.isFinite(y) ? y : 0) + 4);
    const bounds = getSurroundingTerrainBounds(hazard, terrains, pipeY);

    // 1. Structural horizontal pipe connecting walls + vertical ground post to bottom brick
    drawHazardMountingInfrastructure(ctx, bounds, pipeY, cx, true);

    // 2. Heavy suspension shackle / bracket hanging from horizontal pipe
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - 5, pipeY, 10, 8);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cx - 5, pipeY, 10, 8);

    // Shackle pivot pin
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(cx, pipeY + 4, 2, 0, Math.PI * 2);
    ctx.fill();

    // 3. Steel chain links hanging down to the ball
    const chainTopY = pipeY + 8;
    const chainBottomY = cy - r;
    const chainSpan = chainBottomY - chainTopY;
    if (chainSpan > 4) {
      const linkCount = Math.max(2, Math.floor(chainSpan / 8));
      const linkStep = chainSpan / linkCount;
      for (let l = 0; l < linkCount; l++) {
        const ly = chainTopY + l * linkStep + linkStep / 2;
        ctx.strokeStyle = l % 2 === 0 ? '#94a3b8' : '#475569';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(cx, ly, 3, linkStep * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, pipeY + 4);
      ctx.lineTo(cx, chainBottomY);
      ctx.stroke();
    }

    // Top Eyelet Ring on the ball
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy - r, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Spiked Cast-Iron Heavy Sphere
    try {
      const ballGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, 1, cx, cy, r);
      ballGrad.addColorStop(0, '#94a3b8');
      ballGrad.addColorStop(0.3, '#475569');
      ballGrad.addColorStop(0.75, '#1e293b');
      ballGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = ballGrad;
    } catch {
      ctx.fillStyle = '#334155';
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Specular metallic sheen rim
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.75, Math.PI * 0.9, Math.PI * 1.6);
    ctx.stroke();

    // Heavy radial 3D conical spikes with silver tip glints
    const spikeCount = 8;
    for (let s = 0; s < spikeCount; s++) {
      const a = (s * Math.PI * 2) / spikeCount;
      const baseA1 = a - 0.2;
      const baseA2 = a + 0.2;
      const spikeLen = r * 0.42;

      const bx1 = cx + Math.cos(baseA1) * r;
      const by1 = cy + Math.sin(baseA1) * r;
      const bx2 = cx + Math.cos(baseA2) * r;
      const by2 = cy + Math.sin(baseA2) * r;
      const tipX = cx + Math.cos(a) * (r + spikeLen);
      const tipY = cy + Math.sin(a) * (r + spikeLen);

      // Spike cone body
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(bx1, by1);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(bx2, by2);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Sharp metallic spike tip highlight
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 'mine') {
    // Naval Proximity Spiked Mine on Ground Stanchion
    const cx = x + width / 2;
    const cy = y + height / 2;
    const r = Math.min(width, height) * 0.35;
    const bounds = getSurroundingTerrainBounds(hazard, terrains);

    // Stanchion post to ground
    if (bounds.hasFloor && bounds.floorY > cy) {
      const postW = 8;
      const postX = cx - postW / 2;
      const postH = bounds.floorY - cy;
      ctx.fillStyle = '#475569';
      ctx.fillRect(postX, cy, postW, postH);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.strokeRect(postX, cy, postW, postH);

      // Welded base flange
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 10, bounds.floorY - 6, 20, 6);
      ctx.strokeStyle = '#0f172a';
      ctx.strokeRect(cx - 10, bounds.floorY - 6, 20, 6);
    }

    // Mine body
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Contact horns
    for (let h = 0; h < 6; h++) {
      const a = (h * Math.PI) / 3;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(a) * (r + 6), cy + Math.sin(a) * (r + 6));
      ctx.stroke();
    }

    // Flashing red LED
    const ledAlpha = Math.sin(animTime * 12) * 0.4 + 0.6;
    ctx.fillStyle = `rgba(239, 68, 68, ${ledAlpha})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Universal fallback: Industrial hazard warning marker
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
  }

  ctx.restore();
}

export function renderCoins(ctx: CanvasRenderingContext2D, coins: CoinItem[], animTime: number): void {
  for (const coin of coins) {
    if (coin.collected) continue;

    ctx.save();
    ctx.translate(coin.x, coin.y);

    const floatY = Math.sin(animTime * 5 + coin.x) * 3;
    ctx.translate(0, floatY);

    ctx.fillStyle = GAME_CONFIG.COLORS.COIN_GOLD;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = GAME_CONFIG.COLORS.COIN_BORDER;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
