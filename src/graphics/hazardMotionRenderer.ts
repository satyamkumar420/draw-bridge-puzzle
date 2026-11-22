import type { HazardBlock, TerrainBlock } from '../types/level';

/**
 * Draws realistic, properly anchored guides (hydraulic pistons or wall gantry) for moving hazards.
 * Avoids drawing floating detached rods in mid-air.
 */
export function drawHazardMovementGuides(
  ctx: CanvasRenderingContext2D,
  hazard: HazardBlock,
  currentX: number,
  currentY: number,
  terrains?: TerrainBlock[]
): void {
  if (!hazard.movement) return;

  // Energy/cosmic anomalies and energy beams float/glow freely without mechanical rods
  if (
    hazard.type === 'plasma' ||
    hazard.type === 'blackhole' ||
    hazard.type === 'meteor' ||
    hazard.type === 'laser' ||
    hazard.type === 'fire' ||
    hazard.type === 'tnt' ||
    hazard.type === 'mine' ||
    hazard.type === 'water' ||
    hazard.type === 'acid' ||
    hazard.type === 'spikes' ||
    hazard.type === 'ice_spikes' ||
    hazard.type === 'stalactite' ||
    hazard.type === 'toxic_barrel'
  ) {
    return;
  }

  const { axis } = hazard.movement;
  const cx = currentX + hazard.width / 2;
  const cy = currentY + hazard.height / 2;

  ctx.save();

  if (axis === 'vertical' && hazard.type === 'crusher') {
    // Telescoping hydraulic cylinder for vertical spike crusher
    // Anchor to ground beneath the crusher if terrain exists
    let floorY = 510;
    if (terrains && terrains.length > 0) {
      for (const t of terrains) {
        if (t.x <= cx + 30 && t.x + t.width >= cx - 30 && t.y >= cy) {
          floorY = Math.min(floorY, t.y);
        }
      }
    }

    const pistonTop = cy + hazard.height / 2 - 10;
    const pistonH = Math.max(0, floorY - pistonTop);

    if (pistonH > 4) {
      const pW = 10;
      const px = cx - pW / 2;

      // Heavy hydraulic cylinder casing
      try {
        const pGrad = ctx.createLinearGradient(px, 0, px + pW, 0);
        pGrad.addColorStop(0, '#475569');
        pGrad.addColorStop(0.35, '#94a3b8');
        pGrad.addColorStop(0.7, '#64748b');
        pGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = pGrad;
      } catch {
        ctx.fillStyle = '#64748b';
      }
      ctx.fillRect(px, pistonTop, pW, pistonH);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(px, pistonTop, pW, pistonH);

      // Floor mounting bracket
      const bW = 22;
      const bH = 6;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - bW / 2, floorY - bH, bW, bH);
      ctx.strokeStyle = '#0f172a';
      ctx.strokeRect(cx - bW / 2, floorY - bH, bW, bH);
    }
  }

  ctx.restore();
}
