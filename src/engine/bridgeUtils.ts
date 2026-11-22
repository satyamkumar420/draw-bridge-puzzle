import type { Vector2D, LineSegment } from '../types/physics';
import type { TerrainBlock } from '../types/level';
import { GAME_CONFIG } from '../config/constants.ts';
import type { BridgeRigidBody } from './bridgeCollision.ts';
import { isPointInsideSolidTerrain, doesSegmentPenetrateTerrain } from './bridgeCollision.ts';
import { vec } from './vector.ts';

/**
 * Creates an upward-normal-oriented line segment for vehicle wheel interaction.
 */
export function createOrientedSegment(p1: Vector2D, p2: Vector2D, length?: number): LineSegment | null {
  let sp1 = { ...p1 };
  let sp2 = { ...p2 };
  if (sp1.x > sp2.x) {
    const temp = sp1;
    sp1 = sp2;
    sp2 = temp;
  }
  const diff = vec.sub(sp2, sp1);
  const len = length ?? vec.len(diff);
  if (len <= 0.001) return null;
  const dir = vec.norm(diff);
  let normal = { x: dir.y, y: -dir.x };
  if (normal.y > 0) {
    normal = { x: -normal.x, y: -normal.y };
  } else if (normal.y === 0 && normal.x > 0) {
    normal = { x: -normal.x, y: 0 };
  }
  return { p1: sp1, p2: sp2, normal, length: len };
}

/**
 * Generates an array of collinear points along the straight line from p1 to p2.
 */
export function generateCollinearPoints(p1: Vector2D, p2: Vector2D, maxSpacing = 15): Vector2D[] {
  const dist = vec.dist(p1, p2);
  const count = Math.max(1, Math.ceil(dist / maxSpacing));
  const points: Vector2D[] = [];

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    points.push({
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y)
    });
  }

  return points;
}

/**
 * Rebuilds oriented segments connecting consecutive collinear points.
 */
export function rebuildBridgeSegments(points: Vector2D[]): LineSegment[] {
  const segments: LineSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const seg = createOrientedSegment(points[i], points[i + 1]);
    if (seg) segments.push(seg);
  }
  return segments;
}

/**
 * Calculates bounding box and center for an array of points.
 */
export function calculateBoundsAndCenter(points: Vector2D[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  deltaX: number;
  deltaY: number;
  cx: number;
  cy: number;
} {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, deltaX: 0, deltaY: 0, cx: 0, cy: 0 };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let sumX = 0;
  let sumY = 0;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    sumX += p.x;
    sumY += p.y;
  }

  const n = points.length;
  return {
    minX,
    maxX,
    minY,
    maxY,
    deltaX: maxX - minX,
    deltaY: maxY - minY,
    cx: sumX / n,
    cy: sumY / n
  };
}

/**
 * Smooths a polyline using weighted moving-average (Laplacian smoothing)
 * while preserving endpoints and strictly preventing sharp corners from cutting into solid terrain.
 */
export function smoothPolyline(points: Vector2D[], iterations = 1, terrains: TerrainBlock[] = []): Vector2D[] {
  if (points.length <= 2) return points.map(p => ({ ...p }));
  let pts = points.map(p => ({ ...p }));

  for (let it = 0; it < iterations; it++) {
    const next: Vector2D[] = [{ ...pts[0] }];
    for (let i = 1; i < pts.length - 1; i++) {
      const smoothedPt = {
        x: 0.25 * pts[i - 1].x + 0.5 * pts[i].x + 0.25 * pts[i + 1].x,
        y: 0.25 * pts[i - 1].y + 0.5 * pts[i].y + 0.25 * pts[i + 1].y
      };
      if (
        terrains.length > 0 &&
        (isPointInsideSolidTerrain(smoothedPt, terrains, 0) ||
         doesSegmentPenetrateTerrain(next[next.length - 1], smoothedPt, terrains))
      ) {
        next.push({ ...pts[i] });
      } else {
        next.push(smoothedPt);
      }
    }
    next.push({ ...pts[pts.length - 1] });
    pts = next;
  }
  return pts;
}

/**
 * Checks if a bridge is standing upright on a single contact point/end (unstable inverted pendulum).
 */
export function isBridgeStandingUpright(
  points: Vector2D[],
  length: number,
  hasBothWallSupports: boolean,
  terrains: TerrainBlock[],
  radius: number
): { isUpright: boolean; pBottom: Vector2D; pTop: Vector2D; bottomTouching: boolean } {
  if (hasBothWallSupports || points.length < 2) {
    const dummy = points[0] || { x: 0, y: 0 };
    return { isUpright: false, pBottom: dummy, pTop: dummy, bottomTouching: false };
  }
  const pFirst = points[0];
  const pLast = points[points.length - 1];
  const pBottom = pFirst.y >= pLast.y ? pFirst : pLast;
  const pTop = pFirst.y >= pLast.y ? pLast : pFirst;
  const height = pBottom.y - pTop.y;
  const width = Math.abs(pTop.x - pBottom.x);

  // Must be nearly vertical (steep angle > 65° from horizontal: dy >> dx, height > 82% of length)
  const isNearlyVertical = height > 30 && height > length * 0.82 && width < height * 0.48;
  if (!isNearlyVertical) {
    return { isUpright: false, pBottom, pTop, bottomTouching: false };
  }

  const pad = radius + 4;
  const isNear = (pt: Vector2D) => terrains.some(t =>
    pt.x >= t.x - pad &&
    pt.x <= t.x + t.width + pad &&
    pt.y >= t.y - pad &&
    pt.y <= t.y + t.height + pad
  );

  const topTouching = isNear(pTop);
  const bottomTouching = isNear(pBottom);

  // Check if intermediate points are resting on walls/ledges (away from bottom pivot)
  const minSupportDist = Math.max(25, length * 0.2);
  const otherPointsTouching = points.some(pt => {
    const d = Math.hypot(pt.x - pBottom.x, pt.y - pBottom.y);
    return d >= minSupportDist && isNear(pt);
  });

  const isUpright = isNearlyVertical && bottomTouching && !topTouching && !otherPointsTouching;

  return { isUpright, pBottom, pTop, bottomTouching };
}

/**
 * Applies gravitational toppling torque about the ground pivot for an upright standing bridge.
 */
export function applyBridgeTopplingTorque(
  body: BridgeRigidBody,
  pBottom: Vector2D,
  pTop: Vector2D,
  gravity: number,
  subDt: number,
  terrains?: TerrainBlock[]
): void {
  let dx = body.center.x - pBottom.x;
  if (Math.abs(dx) < 2.5) {
    const lean = pTop.x - pBottom.x;
    if (Math.abs(lean) >= 0.1) {
      dx = lean < 0 ? -3.0 : 3.0;
    } else if (terrains) {
      let distLeftWall = Infinity;
      let distRightWall = Infinity;
      for (const t of terrains) {
        if (pBottom.y >= t.y - 10 && pBottom.y <= t.y + t.height + 10) {
          if (t.x + t.width <= pBottom.x) {
            distLeftWall = Math.min(distLeftWall, pBottom.x - (t.x + t.width));
          } else if (t.x >= pBottom.x) {
            distRightWall = Math.min(distRightWall, t.x - pBottom.x);
          }
        }
      }
      if (distRightWall < distLeftWall && distRightWall < 120) {
        dx = -3.0;
      } else if (distLeftWall < distRightWall && distLeftWall < 120) {
        dx = 3.0;
      } else {
        dx = pBottom.x > 500 ? -3.0 : 3.0;
      }
    } else {
      dx = pBottom.x > 500 ? -3.0 : 3.0;
    }
  }

  const d = Math.max(10, vec.dist(body.center, pBottom));
  const effectiveInertia = body.inertia + body.mass * d * d;
  const toppleTorque = dx * body.mass * gravity * 1.8;
  const alpha = toppleTorque / effectiveInertia;

  body.angularVelocity += alpha * subDt;
}

export interface BridgeViewportBounds {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

/**
 * Calculates responsive bounding limits for drawing across the entire visible canvas screen.
 */
export function calculateBridgeScreenBounds(
  viewport?: BridgeViewportBounds,
  terrains?: TerrainBlock[]
): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Math.min(0, viewport?.left ?? 0);
  let maxX = Math.max(GAME_CONFIG.CANVAS_WIDTH, viewport?.right ?? GAME_CONFIG.CANVAS_WIDTH);
  let minY = Math.min(0, viewport?.top ?? 0);
  let maxY = Math.max(GAME_CONFIG.CANVAS_HEIGHT, viewport?.bottom ?? GAME_CONFIG.CANVAS_HEIGHT);

  if (terrains && terrains.length > 0) {
    for (const t of terrains) {
      if (t.x < minX) minX = t.x;
      if (t.x + t.width > maxX) maxX = t.x + t.width;
      if (t.y < minY) minY = t.y;
      if (t.y + t.height > maxY) maxY = t.y + t.height;
    }
  }
  return { minX, maxX, minY, maxY };
}

export interface BridgeSupportEvaluation {
  hasBothWallSupports: boolean;
  hasSinglePlatformSupport: boolean;
  isRestingFlush: boolean;
}

/**
 * Evaluates whether a bridge rests stably on platforms without sagging or airborne gaps.
 */
export function evaluateBridgeSupportState(
  points: Vector2D[],
  radius: number,
  terrains: TerrainBlock[]
): BridgeSupportEvaluation {
  if (points.length < 2) {
    return { hasBothWallSupports: false, hasSinglePlatformSupport: false, isRestingFlush: false };
  }
  const upper = terrains.filter(t => !t.id.startsWith('t-bottom'));
  const supportingTerrains = new Set<string>();

  for (const t of upper) {
    const touchesTerrain = points.some(pt =>
      pt.x >= t.x - 8 && pt.x <= t.x + t.width + 8 &&
      Math.abs(pt.y - (t.y - radius)) <= 6.0
    );
    if (touchesTerrain) {
      supportingTerrains.add(t.id);
    }
  }

  const hasBoth = supportingTerrains.size >= 2;
  const hasSingle = supportingTerrains.size === 1;

  if (!hasBoth) {
    return { hasBothWallSupports: false, hasSinglePlatformSupport: hasSingle, isRestingFlush: false };
  }

  // Endpoints over platforms must not hover high in the air
  const pStart = points[0];
  const pEnd = points[points.length - 1];
  for (const t of upper) {
    if (pStart.x >= t.x - 10 && pStart.x <= t.x + t.width + 10 && pStart.y < t.y - radius - 8) {
      return { hasBothWallSupports: hasBoth, hasSinglePlatformSupport: hasSingle, isRestingFlush: false };
    }
    if (pEnd.x >= t.x - 10 && pEnd.x <= t.x + t.width + 10 && pEnd.y < t.y - radius - 8) {
      return { hasBothWallSupports: hasBoth, hasSinglePlatformSupport: hasSingle, isRestingFlush: false };
    }
  }

  // High mid-air loops: curve rising far into the sky above the platforms is not resting flush
  const minPlatformY = Math.min(...upper.map(t => t.y));
  const maxHighRise = 75;
  const hasSkyLoop = points.some(pt => pt.y < minPlatformY - radius - maxHighRise);

  return {
    hasBothWallSupports: hasBoth,
    hasSinglePlatformSupport: hasSingle,
    isRestingFlush: !hasSkyLoop
  };
}

