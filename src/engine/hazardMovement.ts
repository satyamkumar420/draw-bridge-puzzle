import type { HazardBlock } from '../types/level';

/**
 * Computes dynamic coordinates for an oscillating or sliding hazard at a given animation time.
 */
export function computeHazardPosition(
  hazard: HazardBlock,
  animTime: number
): { x: number; y: number } {
  if (!hazard.movement) {
    return { x: hazard.x, y: hazard.y };
  }

  const { axis, distance, speed, phase = 0 } = hazard.movement;
  const halfRange = distance / 2;
  const offset = Math.sin(animTime * speed + phase) * halfRange;

  return {
    x: axis === 'horizontal' ? hazard.x + offset : hazard.x,
    y: axis === 'vertical' ? hazard.y + offset : hazard.y
  };
}

/**
 * Transforms an array of hazards with their real-time dynamic positions based on current time.
 */
export function getEffectiveHazards(
  hazards: HazardBlock[],
  animTime: number
): HazardBlock[] {
  return hazards.map((h) => {
    if (!h.movement) return h;
    const pos = computeHazardPosition(h, animTime);
    return {
      ...h,
      currentX: pos.x,
      currentY: pos.y
    };
  });
}
