import type { Vector2D } from '../types/physics';
import type { TerrainBlock } from '../types/level';
import { type AABB, getSegmentAABBIntersection, pointInAABB } from './collision.ts';
import { vec } from './vector.ts';

/**
 * Checks if a coordinate is strictly inside the solid body of any terrain block.
 */
export function isPointInsideSolidTerrain(
  point: Vector2D,
  terrains: TerrainBlock[],
  topTolerance = 0.5
): boolean {
  for (const t of terrains) {
    if (
      point.x >= t.x &&
      point.x <= t.x + t.width &&
      point.y > t.y + topTolerance &&
      point.y <= t.y + t.height
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a line segment strictly penetrates the interior body of any solid terrain block.
 */
export function doesSegmentPenetrateTerrain(
  p1: Vector2D,
  p2: Vector2D,
  terrains: TerrainBlock[]
): boolean {
  for (const t of terrains) {
    if (t.height <= 1) continue;
    const solidBox: AABB = {
      x: t.x + 0.1,
      y: t.y + 0.5,
      width: Math.max(0.1, t.width - 0.2),
      height: Math.max(0.1, t.height - 0.6)
    };
    if (pointInAABB(p1, solidBox) || pointInAABB(p2, solidBox)) {
      return true;
    }
    const hit = getSegmentAABBIntersection(p1, p2, solidBox);
    if (hit.intersects) {
      return true;
    }
  }
  return false;
}

/**
 * Validates and snaps draw start position:
 * 1. Snaps to platform corner or top surface if clicked near edges / corners.
 * 2. Rejects clicks deep inside solid walls (returns null).
 * 3. Preserves clicks in open air.
 */
export function validateAndSnapDrawStart(
  point: Vector2D,
  terrains: TerrainBlock[],
  radius: number
): Vector2D | null {
  const pt = { ...point };

  // 1. Snap to corner or surface if clicked near any platform / obstacle edges or corners
  for (const t of terrains) {
    if (t.id.startsWith('t-bottom')) continue;
    const margin = radius + 0.5;

    // Corners (TR, TL, BR, BL)
    if (Math.hypot(pt.x - (t.x + t.width), pt.y - t.y) <= 16) {
      const snap = { x: t.x + t.width, y: t.y - radius };
      if (!isPointInsideSolidTerrain(snap, terrains, 0.5)) return snap;
    }
    if (Math.hypot(pt.x - t.x, pt.y - t.y) <= 16) {
      const snap = { x: t.x, y: t.y - radius };
      if (!isPointInsideSolidTerrain(snap, terrains, 0.5)) return snap;
    }
    if (Math.hypot(pt.x - (t.x + t.width), pt.y - (t.y + t.height)) <= 16) {
      const snap = { x: t.x + t.width, y: t.y + t.height + radius };
      if (!isPointInsideSolidTerrain(snap, terrains, 0.5)) return snap;
    }
    if (Math.hypot(pt.x - t.x, pt.y - (t.y + t.height)) <= 16) {
      const snap = { x: t.x, y: t.y + t.height + radius };
      if (!isPointInsideSolidTerrain(snap, terrains, 0.5)) return snap;
    }

    // Top surface
    if (pt.x >= t.x - 8 && pt.x <= t.x + t.width + 8) {
      if (pt.y >= t.y - 16 && pt.y <= t.y + 12) {
        const snap = { x: pt.x, y: t.y - radius };
        if (!isPointInsideSolidTerrain(snap, terrains, 0.5)) return snap;
      }
    }
    // Bottom surface
    if (pt.x >= t.x - 8 && pt.x <= t.x + t.width + 8) {
      if (pt.y >= t.y + t.height - 12 && pt.y <= t.y + t.height + 16) {
        const snap = { x: pt.x, y: t.y + t.height + radius };
        if (!isPointInsideSolidTerrain(snap, terrains, 0.5)) return snap;
      }
    }
    // Left vertical face
    if (pt.y >= t.y && pt.y <= t.y + t.height) {
      if (pt.x >= t.x - 14 && pt.x <= t.x + 10) {
        const snap = { x: t.x - margin, y: pt.y };
        if (!isPointInsideSolidTerrain(snap, terrains, 0.5)) return snap;
      }
    }
    // Right vertical face
    if (pt.y >= t.y && pt.y <= t.y + t.height) {
      if (pt.x >= t.x + t.width - 10 && pt.x <= t.x + t.width + 14) {
        const snap = { x: t.x + t.width + margin, y: pt.y };
        if (!isPointInsideSolidTerrain(snap, terrains, 0.5)) return snap;
      }
    }
  }

  // 2. Reject if clicked inside the solid body of any wall/pillar
  if (isPointInsideSolidTerrain(pt, terrains, 0.5)) {
    return null;
  }

  return pt;
}

/**
 * Checks if a drawing step wraps around a terrain block corner or moves along an outer face.
 * Routes smoothly around all 4 corners (TR, TL, BR, BL) in all directions (up, down, left, right).
 */
function tryRouteCorner(
  start: Vector2D,
  rawEnd: Vector2D,
  t: TerrainBlock,
  radius: number,
  margin: number,
  allTerrains: TerrainBlock[]
): Vector2D[] | null {
  const xMin = t.x;
  const xMax = t.x + t.width;
  const yMin = t.y;
  const yMax = t.y + t.height;
  const topInset = 6;
  const maxStep = 35;

  // 1. Top-Right: Top face -> Down/Right off corner
  if (start.y <= yMin + topInset + 2 && start.y >= yMin - 10 &&
      start.x >= xMax - 60 && start.x <= xMax &&
      rawEnd.y > yMin + 4 && rawEnd.x >= xMax - 40) {
    const corner = { x: xMax, y: yMin - radius };
    if (isPointInsideSolidTerrain(corner, allTerrains, 0.5)) return null;
    const next = { x: Math.max(xMax + margin, Math.min(rawEnd.x, xMax + maxStep)), y: Math.max(rawEnd.y, yMin) };
    return vec.dist(start, corner) < 2 ? [next] : [corner, next];
  }
  // 2. Top-Right: Right face -> Up/Left over corner
  if (start.x >= xMax && start.x <= xMax + 20 &&
      start.y >= yMin && start.y <= yMin + 60 &&
      rawEnd.y < yMin + 4 && rawEnd.x <= xMax + 30) {
    const corner = { x: xMax + margin, y: yMin };
    if (isPointInsideSolidTerrain(corner, allTerrains, 0.5)) return null;
    const next = { x: Math.min(xMax, Math.max(rawEnd.x, xMax - maxStep)), y: Math.min(rawEnd.y, yMin - radius) };
    return vec.dist(start, corner) < 2 ? [next] : [corner, next];
  }

  // 3. Top-Left: Top face -> Down/Left off corner
  if (start.y <= yMin + topInset + 2 && start.y >= yMin - 10 &&
      start.x >= xMin && start.x <= xMin + 60 &&
      rawEnd.y > yMin + 4 && rawEnd.x <= xMin + 40) {
    const corner = { x: xMin, y: yMin - radius };
    if (isPointInsideSolidTerrain(corner, allTerrains, 0.5)) return null;
    const next = { x: Math.min(xMin - margin, Math.max(rawEnd.x, xMin - maxStep)), y: Math.max(rawEnd.y, yMin) };
    return vec.dist(start, corner) < 2 ? [next] : [corner, next];
  }
  // 4. Top-Left: Left face -> Up/Right over corner
  if (start.x >= xMin - 20 && start.x <= xMin &&
      start.y >= yMin && start.y <= yMin + 60 &&
      rawEnd.y < yMin + 4 && rawEnd.x >= xMin - 30) {
    const corner = { x: xMin - margin, y: yMin };
    if (isPointInsideSolidTerrain(corner, allTerrains, 0.5)) return null;
    const next = { x: Math.max(xMin, Math.min(rawEnd.x, xMin + maxStep)), y: Math.min(rawEnd.y, yMin - radius) };
    return vec.dist(start, corner) < 2 ? [next] : [corner, next];
  }

  // 5. Bottom-Right: Bottom face -> Up/Right around corner
  if (start.y >= yMax - 12 && start.y <= yMax + 20 &&
      start.x >= xMax - 60 && start.x <= xMax + 15 &&
      rawEnd.y < yMax - 4 && rawEnd.x >= xMax - 40) {
    const corner = { x: xMax, y: yMax + radius };
    if (isPointInsideSolidTerrain(corner, allTerrains, 0.5)) return null;
    const next = { x: Math.max(xMax + margin, Math.min(rawEnd.x, xMax + maxStep)), y: Math.min(rawEnd.y, yMax) };
    return vec.dist(start, corner) < 2 ? [next] : [corner, next];
  }
  // 6. Bottom-Right: Right face -> Down/Left under corner
  if (start.x >= xMax - 6 && start.x <= xMax + 30 &&
      start.y >= yMax - 60 && start.y <= yMax + 10 &&
      rawEnd.y > yMax - 4 && rawEnd.x <= xMax + 30) {
    const corner = { x: xMax + margin, y: yMax };
    if (isPointInsideSolidTerrain(corner, allTerrains, 0.5)) return null;
    const next = { x: Math.min(xMax, Math.max(rawEnd.x, xMax - maxStep)), y: Math.max(rawEnd.y, yMax + radius) };
    return vec.dist(start, corner) < 2 ? [next] : [corner, next];
  }

  // 7. Bottom-Left: Bottom face -> Up/Left around corner
  if (start.y >= yMax - 12 && start.y <= yMax + 20 &&
      start.x >= xMin - 15 && start.x <= xMin + 60 &&
      rawEnd.y < yMax - 4 && rawEnd.x <= xMin + 40) {
    const corner = { x: xMin, y: yMax + radius };
    if (isPointInsideSolidTerrain(corner, allTerrains, 0.5)) return null;
    const next = { x: Math.min(xMin - margin, Math.max(rawEnd.x, xMin - maxStep)), y: Math.min(rawEnd.y, yMax) };
    return vec.dist(start, corner) < 2 ? [next] : [corner, next];
  }
  // 8. Bottom-Left: Left face -> Down/Right under corner
  if (start.x >= xMin - 30 && start.x <= xMin + 6 &&
      start.y >= yMax - 60 && start.y <= yMax + 10 &&
      rawEnd.y > yMax - 4 && rawEnd.x <= xMin - 30) {
    const corner = { x: xMin - margin, y: yMax };
    if (isPointInsideSolidTerrain(corner, allTerrains, 0.5)) return null;
    const next = { x: Math.max(xMin, Math.min(rawEnd.x, xMin + maxStep)), y: Math.max(rawEnd.y, yMax + radius) };
    return vec.dist(start, corner) < 2 ? [next] : [corner, next];
  }

  // 9. Side vertical faces (moving along edge outside wall)
  if (start.x >= xMax && start.x <= xMax + margin + 8 && start.y >= yMin && start.y <= yMax) {
    if (rawEnd.x < xMax + margin && rawEnd.x >= xMax - 40 && rawEnd.y >= yMin && rawEnd.y <= yMax) {
      return [{ x: xMax + margin, y: rawEnd.y }];
    }
  }
  if (start.x <= xMin && start.x >= xMin - margin - 8 && start.y >= yMin && start.y <= yMax) {
    if (rawEnd.x > xMin - margin && rawEnd.x <= xMin + 40 && rawEnd.y >= yMin && rawEnd.y <= yMax) {
      return [{ x: xMin - margin, y: rawEnd.y }];
    }
  }

  return null;
}

/**
 * Validates and routes a drawing step so the stroke wraps cleanly around corners
 * and never penetrates solid walls or freezes when turning around edges.
 */
export function validateAndRouteDrawSegment(
  start: Vector2D,
  rawEnd: Vector2D,
  terrains: TerrainBlock[],
  radius: number
): Vector2D[] {
  // If stroke does not penetrate solid terrain and rawEnd is in open air,
  // preserve freehand stroke directly without any corner warping or crooked artifacts.
  const penetrates = doesSegmentPenetrateTerrain(start, rawEnd, terrains);
  const insideSolid = isPointInsideSolidTerrain(rawEnd, terrains, 0.5);

  if (!penetrates && !insideSolid) {
    const clipped = validateAndClipDrawSegment(start, rawEnd, terrains, radius);
    const dist = vec.dist(start, clipped);
    if (dist < 2) return [];
    return [clipped];
  }

  // Only route around corners if the stroke cuts into solid terrain
  const margin = radius + 0.5;
  for (const t of terrains) {
    if (t.height <= 6) continue;
    const routed = tryRouteCorner(start, rawEnd, t, radius, margin, terrains);
    if (routed) {
      // Validate all candidate routed points against all terrains
      const validated: Vector2D[] = [];
      let valid = true;
      let prev = start;
      for (const p of routed) {
        if (
          isPointInsideSolidTerrain(p, terrains, 0.5) ||
          doesSegmentPenetrateTerrain(prev, p, terrains)
        ) {
          valid = false;
          break;
        }
        validated.push(p);
        prev = p;
      }
      if (valid && validated.length > 0) {
        return validated;
      }
    }
  }

  const clipped = validateAndClipDrawSegment(start, rawEnd, terrains, radius);
  const dist = vec.dist(start, clipped);
  if (
    dist < 2 ||
    isPointInsideSolidTerrain(clipped, terrains, 0.5) ||
    doesSegmentPenetrateTerrain(start, clipped, terrains)
  ) {
    return [];
  }
  return [clipped];
}

/**
 * Validates and clips a segment step [start -> rawEnd] so drawing never penetrates through or into solid walls.
 * Drawing from a corner or platform surface into open air is always smoothly preserved.
 */
export function validateAndClipDrawSegment(
  start: Vector2D,
  rawEnd: Vector2D,
  terrains: TerrainBlock[],
  radius: number
): Vector2D {
  let end = { ...rawEnd };
  const upperTerrains = terrains.filter(t => !t.id.startsWith('t-bottom'));

  for (const t of upperTerrains) {
    // Strictly snap ONLY if x is within the platform top face, never in mid-air outside
    if (end.x >= t.x && end.x <= t.x + t.width) {
      // Strictly snap ONLY if y is slightly dipped into or right at the resting surface
      if (end.y >= t.y - radius && end.y <= t.y + 6) {
        const candidate = { x: end.x, y: t.y - radius };
        if (!isPointInsideSolidTerrain(candidate, terrains, 0.5)) {
          end.y = t.y - radius;
          break;
        }
      }
    }
  }

  const dir = vec.sub(end, start);
  const totalLen = vec.len(dir);
  if (totalLen < 1) return end;

  let minT = 1.0;

  for (const t of terrains) {
    if (t.height <= 1) continue;

    const solidBox: AABB = {
      x: t.x + 0.1,
      y: t.y,
      width: Math.max(0.1, t.width - 0.2),
      height: t.height
    };

    if (pointInAABB(start, solidBox)) {
      return { ...start };
    }

    const hit = getSegmentAABBIntersection(start, end, solidBox);
    if (hit.intersects && hit.tEnter > 1e-4 && hit.tEnter < minT) {
      let offsetT = radius / totalLen;
      if (hit.enterFace === 'left' || hit.enterFace === 'right') {
        offsetT = Math.abs(dir.x) > 1e-4 ? (radius + 0.2) / Math.abs(dir.x) : offsetT;
      } else if (hit.enterFace === 'top' || hit.enterFace === 'bottom') {
        offsetT = Math.abs(dir.y) > 1e-4 ? (radius + 0.2) / Math.abs(dir.y) : offsetT;
      }
      minT = Math.max(0, hit.tEnter - offsetT);
    }
  }

  if (minT < 1.0) {
    end = {
      x: start.x + minT * dir.x,
      y: start.y + minT * dir.y
    };
  }

  return end;
}
