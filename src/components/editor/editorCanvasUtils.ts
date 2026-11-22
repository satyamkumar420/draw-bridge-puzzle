import type { LevelData, HazardBlock } from '../../types/level';
import type { SelectedObjectRef } from '../../types/editor';
import type { Vector2D } from '../../types/physics';

export function findObjectAtPosition(
  pos: Vector2D,
  level: LevelData
): { ref: SelectedObjectRef; isResizeHandle?: boolean } | null {
  // 1. Goal Check (Flagpole and Banner standing upwards from road surface goal.y)
  const goalLeft = level.goal.x + 16;
  const goalRight = level.goal.x + 76;
  const goalTop = level.goal.y - 80;
  const goalBottom = level.goal.y + 6;
  if (
    pos.x >= goalLeft &&
    pos.x <= goalRight &&
    pos.y >= goalTop &&
    pos.y <= goalBottom
  ) {
    return { ref: { type: 'goal' } };
  }

  // 2. Spawn Check (Car centered at level.spawn)
  if (
    pos.x >= level.spawn.x - 42 &&
    pos.x <= level.spawn.x + 42 &&
    pos.y >= level.spawn.y - 25 &&
    pos.y <= level.spawn.y + 25
  ) {
    return { ref: { type: 'spawn' } };
  }

  // 3. Coins Check
  for (const coin of level.coins) {
    if (Math.hypot(pos.x - coin.x, pos.y - coin.y) < 18) {
      return { ref: { type: 'coin', id: coin.id } };
    }
  }

  // 4. Hazards Check
  for (const hazard of level.hazards) {
    if (
      pos.x >= hazard.x &&
      pos.x <= hazard.x + hazard.width &&
      pos.y >= hazard.y &&
      pos.y <= hazard.y + hazard.height
    ) {
      const isHandle =
        Math.abs(pos.x - (hazard.x + hazard.width)) < 16 &&
        Math.abs(pos.y - (hazard.y + hazard.height)) < 16;
      return { ref: { type: 'hazard', id: hazard.id }, isResizeHandle: isHandle };
    }
  }

  // 5. Terrains Check
  for (const terrain of level.terrains) {
    if (
      pos.x >= terrain.x &&
      pos.x <= terrain.x + terrain.width &&
      pos.y >= terrain.y &&
      pos.y <= terrain.y + terrain.height
    ) {
      const isHandle =
        Math.abs(pos.x - (terrain.x + terrain.width)) < 16 &&
        Math.abs(pos.y - (terrain.y + terrain.height)) < 16;
      return { ref: { type: 'terrain', id: terrain.id }, isResizeHandle: isHandle };
    }
  }

  return null;
}

export function drawEditorGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gridSize: number
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;

  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawSelectionGizmo(
  ctx: CanvasRenderingContext2D,
  selection: SelectedObjectRef,
  level: LevelData
): void {
  ctx.save();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);

  let box: { x: number; y: number; w: number; h: number } | null = null;
  if (selection.type === 'terrain') {
    const t = level.terrains.find((item) => item.id === selection.id);
    if (t) box = { x: t.x, y: t.y, w: t.width, h: t.height };
  } else if (selection.type === 'hazard') {
    const h = level.hazards.find((item) => item.id === selection.id);
    if (h) box = { x: h.x, y: h.y, w: h.width, h: h.height };
  } else if (selection.type === 'goal') {
    box = {
      x: level.goal.x + 18,
      y: level.goal.y - 78,
      w: 56,
      h: 80
    };
  } else if (selection.type === 'spawn') {
    box = {
      x: level.spawn.x - 40,
      y: level.spawn.y - 22,
      w: 80,
      h: 44
    };
  }

  if (box) {
    ctx.strokeRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);

    // Only resizable objects (terrain and hazard) get the bottom-right handle
    if (selection.type === 'terrain' || selection.type === 'hazard') {
      ctx.setLineDash([]);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(box.x + box.w - 6, box.y + box.h - 6, 12, 12);
    }
  }

  ctx.restore();
}

export function drawHazardMovementGizmo(
  ctx: CanvasRenderingContext2D,
  hazard: HazardBlock,
  animClock: number,
  isSelected: boolean
): void {
  if (!hazard.movement) return;

  const { axis, distance, speed, phase = 0 } = hazard.movement;
  const halfDist = distance / 2;
  const cx = hazard.x + hazard.width / 2;
  const cy = hazard.y + hazard.height / 2;

  ctx.save();

  const accentColor = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.45)';
  const glowColor = isSelected ? 'rgba(56, 189, 248, 0.35)' : 'transparent';
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = isSelected ? 2 : 1.2;

  if (isSelected) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
  }

  // Current dynamic offset for oscillating indicator
  const currentOffset = Math.sin(animClock * speed + phase) * halfDist;

  if (axis === 'horizontal') {
    const x1 = cx - halfDist;
    const x2 = cx + halfDist;

    // Movement guide track
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(x1, cy);
    ctx.lineTo(x2, cy);
    ctx.stroke();

    // End caps
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x1, cy - 8);
    ctx.lineTo(x1, cy + 8);
    ctx.moveTo(x2, cy - 8);
    ctx.lineTo(x2, cy + 8);
    ctx.stroke();

    // Direction arrows: Left arrow at x1
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(x1 + 7, cy - 5);
    ctx.lineTo(x1, cy);
    ctx.lineTo(x1 + 7, cy + 5);
    ctx.closePath();
    ctx.fill();

    // Right arrow at x2
    ctx.beginPath();
    ctx.moveTo(x2 - 7, cy - 5);
    ctx.lineTo(x2, cy);
    ctx.lineTo(x2 - 7, cy + 5);
    ctx.closePath();
    ctx.fill();

    // Oscillating indicator dot
    const currX = cx + currentOffset;
    ctx.fillStyle = isSelected ? '#f59e0b' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(currX, cy, isSelected ? 4.5 : 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Range & Direction Label
    if (isSelected) {
      ctx.shadowBlur = 0;
      const label = `⬌ HORIZONTAL · ${Math.round(distance)}px (${speed}x)`;
      ctx.font = 'bold 10px monospace, sans-serif';
      const textMetrics = ctx.measureText(label);
      const pad = 5;
      const lx = cx - textMetrics.width / 2 - pad;
      const ly = hazard.y - 18;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(lx, ly, textMetrics.width + pad * 2, 15);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx, ly, textMetrics.width + pad * 2, 15);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(label, cx - textMetrics.width / 2, ly + 11);
    }
  } else {
    // Vertical axis
    const y1 = cy - halfDist;
    const y2 = cy + halfDist;

    // Movement guide track
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, y1);
    ctx.lineTo(cx, y2);
    ctx.stroke();

    // End caps
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx - 8, y1);
    ctx.lineTo(cx + 8, y1);
    ctx.moveTo(cx - 8, y2);
    ctx.lineTo(cx + 8, y2);
    ctx.stroke();

    // Up arrow at y1
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(cx - 5, y1 + 7);
    ctx.lineTo(cx, y1);
    ctx.lineTo(cx + 5, y1 + 7);
    ctx.closePath();
    ctx.fill();

    // Down arrow at y2
    ctx.beginPath();
    ctx.moveTo(cx - 5, y2 - 7);
    ctx.lineTo(cx, y2);
    ctx.lineTo(cx + 5, y2 - 7);
    ctx.closePath();
    ctx.fill();

    // Oscillating indicator dot
    const currY = cy + currentOffset;
    ctx.fillStyle = isSelected ? '#f59e0b' : '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, currY, isSelected ? 4.5 : 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Range & Direction Label
    if (isSelected) {
      ctx.shadowBlur = 0;
      const label = `⬍ VERTICAL · ${Math.round(distance)}px (${speed}x)`;
      ctx.font = 'bold 10px monospace, sans-serif';
      const textMetrics = ctx.measureText(label);
      const pad = 5;
      const lx = hazard.x + hazard.width + 6;
      const ly = cy - 7.5;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(lx, ly, textMetrics.width + pad * 2, 15);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx, ly, textMetrics.width + pad * 2, 15);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(label, lx + pad, ly + 11);
    }
  }

  ctx.restore();
}
