import type { Vector2D, CollisionInfo } from '../types/physics';
import { vec } from './vector.ts';

export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Projects a point onto a line segment clamped to [0, 1]
 */
export function closestPointOnSegment(p: Vector2D, a: Vector2D, b: Vector2D): { point: Vector2D; t: number } {
  const ab = vec.sub(b, a);
  const abLenSq = vec.lenSq(ab);
  if (abLenSq === 0) return { point: a, t: 0 };

  const ap = vec.sub(p, a);
  const t = Math.max(0, Math.min(1, vec.dot(ap, ab) / abLenSq));
  return {
    point: vec.add(a, vec.scale(ab, t)),
    t
  };
}

/**
 * Checks and calculates collision response between a circular wheel and a line segment
 */
export function circleSegmentCollision(
  center: Vector2D,
  radius: number,
  a: Vector2D,
  b: Vector2D,
  segmentThickness = 5
): CollisionInfo {
  const { point: closest } = closestPointOnSegment(center, a, b);
  const diff = vec.sub(center, closest);
  const dist = vec.len(diff);
  const totalRadius = radius + segmentThickness / 2;

  if (dist < totalRadius) {
    let normal: Vector2D;
    if (dist > 0.0001) {
      normal = vec.scale(diff, 1 / dist);
    } else {
      const segDir = vec.norm(vec.sub(b, a));
      normal = vec.perp(segDir);
    }
    const penetration = totalRadius - dist;
    return {
      collided: true,
      penetration,
      normal,
      contactPoint: closest
    };
  }

  return {
    collided: false,
    penetration: 0,
    normal: { x: 0, y: -1 },
    contactPoint: closest
  };
}

/**
 * Checks collision between a circular wheel and a terrain rectangular box (AABB)
 */
export function circleAABBCollision(
  center: Vector2D,
  radius: number,
  box: AABB
): CollisionInfo {
  const closestX = Math.max(box.x, Math.min(center.x, box.x + box.width));
  const closestY = Math.max(box.y, Math.min(center.y, box.y + box.height));
  const closest: Vector2D = { x: closestX, y: closestY };

  const diff = vec.sub(center, closest);
  const distSq = vec.lenSq(diff);

  if (distSq === 0) {
    const distToLeft = center.x - box.x;
    const distToRight = box.x + box.width - center.x;
    const distToTop = center.y - box.y;
    const distToBottom = box.y + box.height - center.y;

    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
    let normal: Vector2D = { x: 0, y: -1 };
    if (minDist === distToTop) normal = { x: 0, y: -1 };
    else if (minDist === distToBottom) normal = { x: 0, y: 1 };
    else if (minDist === distToLeft) normal = { x: -1, y: 0 };
    else normal = { x: 1, y: 0 };

    return {
      collided: true,
      penetration: radius + minDist,
      normal,
      contactPoint: closest
    };
  }

  if (distSq < radius * radius) {
    const dist = Math.sqrt(distSq);
    const normal = vec.scale(diff, 1 / dist);
    return {
      collided: true,
      penetration: radius - dist,
      normal,
      contactPoint: closest
    };
  }

  return {
    collided: false,
    penetration: 0,
    normal: { x: 0, y: -1 },
    contactPoint: closest
  };
}

export function pointInAABB(p: Vector2D, box: AABB): boolean {
  return p.x >= box.x && p.x <= box.x + box.width && p.y > box.y + 0.01 && p.y <= box.y + box.height;
}

export function pointInTerrains(p: Vector2D, terrains: AABB[]): boolean {
  for (let i = 0; i < terrains.length; i++) {
    if (pointInAABB(p, terrains[i])) return true;
  }
  return false;
}

/**
 * Clamps a point if it lies inside a solid terrain block to the nearest exterior surface/corner.
 */
export function clampPointOutOfTerrains(p: Vector2D, terrains: AABB[]): Vector2D {
  let pt = { ...p };
  for (const t of terrains) {
    if (pointInAABB(pt, t)) {
      const distToTop = pt.y - t.y;
      const distToLeft = pt.x - t.x;
      const distToRight = (t.x + t.width) - pt.x;
      const distToBottom = (t.y + t.height) - pt.y;

      const minDist = Math.min(distToTop, distToLeft, distToRight, distToBottom);
      if (minDist === distToTop) {
        pt.y = t.y;
      } else if (minDist === distToLeft) {
        pt.x = t.x;
      } else if (minDist === distToRight) {
        pt.x = t.x + t.width;
      } else {
        pt.y = t.y + t.height;
      }
    }
  }
  return pt;
}

/**
 * Snaps a drawing coordinate to the top surface of brick terrain
 * if the user touches or draws on the top edge of the brick.
 */
export function snapCoordsToTerrainSurface(
  coords: Vector2D,
  terrains: AABB[],
  snapToleranceAbove = 0
): Vector2D {
  for (let i = 0; i < terrains.length; i++) {
    const t = terrains[i];
    if ((t as { id?: string }).id?.startsWith('t-bottom')) continue;
    if (coords.x >= t.x - 2 && coords.x <= t.x + t.width + 2) {
      if (coords.y >= t.y - snapToleranceAbove && coords.y <= t.y + 16) {
        return { x: coords.x, y: t.y };
      }
    }
  }
  return coords;
}

export interface SegmentAABBHit {
  intersects: boolean;
  tEnter: number;
  tExit: number;
  enterFace: 'left' | 'right' | 'top' | 'bottom' | 'none';
  exitFace: 'left' | 'right' | 'top' | 'bottom' | 'none';
  enterPoint: Vector2D;
  exitPoint: Vector2D;
}

/**
 * Calculates parametric intersection between a line segment (p1 -> p2) and an AABB using the slab method
 */
export function getSegmentAABBIntersection(p1: Vector2D, p2: Vector2D, box: AABB): SegmentAABBHit {
  const noHit: SegmentAABBHit = {
    intersects: false,
    tEnter: 0,
    tExit: 1,
    enterFace: 'none',
    exitFace: 'none',
    enterPoint: p1,
    exitPoint: p2
  };

  const xMin = box.x;
  const xMax = box.x + box.width;
  const yMin = box.y;
  const yMax = box.y + box.height;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  let tEnter = 0;
  let tExit = 1;
  let enterFace: 'left' | 'right' | 'top' | 'bottom' | 'none' = 'none';
  let exitFace: 'left' | 'right' | 'top' | 'bottom' | 'none' = 'none';

  // Check X slab
  if (Math.abs(dx) < 1e-9) {
    if (p1.x < xMin || p1.x > xMax) return noHit;
  } else {
    const tx1 = (xMin - p1.x) / dx;
    const tx2 = (xMax - p1.x) / dx;
    const [txNear, txFar, faceNear, faceFar] =
      tx1 < tx2
        ? [tx1, tx2, 'left' as const, 'right' as const]
        : [tx2, tx1, 'right' as const, 'left' as const];

    if (txNear > tEnter) {
      tEnter = txNear;
      enterFace = faceNear;
    }
    if (txFar <= tExit) {
      tExit = txFar;
      exitFace = faceFar;
    }
    if (tEnter > tExit) return noHit;
  }

  // Check Y slab: a line lying on the top surface (y <= yMin) does not penetrate into the interior
  if (Math.abs(dy) < 1e-9) {
    if (p1.y <= yMin || p1.y >= yMax) return noHit;
  } else {
    const ty1 = (yMin - p1.y) / dy;
    const ty2 = (yMax - p1.y) / dy;
    const [tyNear, tyFar, faceNear, faceFar] =
      ty1 < ty2
        ? [ty1, ty2, 'top' as const, 'bottom' as const]
        : [ty2, ty1, 'bottom' as const, 'top' as const];

    if (tyNear > tEnter) {
      tEnter = tyNear;
      enterFace = faceNear;
    }
    if (tyFar <= tExit) {
      tExit = tyFar;
      exitFace = faceFar;
    }
    if (tEnter > tExit) return noHit;
  }

  // If the segment overlaps the box
  if (tEnter < tExit && tEnter < 1 && tExit > 0) {
    if (Math.abs(tEnter - 1) < 1e-6) return noHit;
    const enterPoint = {
      x: p1.x + tEnter * dx,
      y: p1.y + tEnter * dy
    };
    const exitPoint = {
      x: p1.x + tExit * dx,
      y: p1.y + tExit * dy
    };
    return {
      intersects: true,
      tEnter: Math.max(0, tEnter),
      tExit: Math.min(1, tExit),
      enterFace,
      exitFace,
      enterPoint,
      exitPoint
    };
  }

  return noHit;
}

/**
 * Resolves drawing segment (p1 -> p2) against terrain blocks.
 * Clips into corners without penetrating solid brick bodies.
 */
export function resolveSegmentAgainstTerrains(
  p1: Vector2D,
  p2: Vector2D,
  terrains: AABB[]
): Vector2D[] {
  // If destination is directly inside any terrain, reject drawing into solid brick
  if (pointInTerrains(p2, terrains)) {
    return [];
  }

  // Find the earliest intersecting terrain
  let earliestHit: SegmentAABBHit | null = null;
  let hitBox: AABB | null = null;

  for (const box of terrains) {
    const hit = getSegmentAABBIntersection(p1, p2, box);
    if (hit.intersects) {
      if (!earliestHit || hit.tEnter < earliestHit.tEnter) {
        earliestHit = hit;
        hitBox = box;
      }
    }
  }

  // If no intersection with any terrain, p2 is safe
  if (!earliestHit || !hitBox) {
    return [p2];
  }

  const { enterFace, exitFace, tEnter, enterPoint } = earliestHit;

  // Case 1: Cuts across a corner between two adjacent faces
  const xMin = hitBox.x;
  const xMax = hitBox.x + hitBox.width;
  const yMin = hitBox.y;
  const yMax = hitBox.y + hitBox.height;

  let corner: Vector2D | null = null;

  if (
    (enterFace === 'left' && exitFace === 'top') ||
    (enterFace === 'top' && exitFace === 'left')
  ) {
    corner = { x: xMin, y: yMin };
  } else if (
    (enterFace === 'right' && exitFace === 'top') ||
    (enterFace === 'top' && exitFace === 'right')
  ) {
    corner = { x: xMax, y: yMin };
  } else if (
    (enterFace === 'left' && exitFace === 'bottom') ||
    (enterFace === 'bottom' && exitFace === 'left')
  ) {
    corner = { x: xMin, y: yMax };
  } else if (
    (enterFace === 'right' && exitFace === 'bottom') ||
    (enterFace === 'bottom' && exitFace === 'right')
  ) {
    corner = { x: xMax, y: yMax };
  }

  if (corner) {
    const result: Vector2D[] = [];
    if (vec.dist(p1, corner) > 1.0) {
      result.push(corner);
    }
    if (vec.dist(corner, p2) > 1.0) {
      result.push(p2);
    }
    return result.length > 0 ? result : [corner];
  }

  // Case 2: Pierces into or through solid terrain without turning a corner
  if (tEnter > 1e-6 && vec.dist(p1, enterPoint) > 1.0) {
    return [enterPoint];
  }
  return [p2];
}


