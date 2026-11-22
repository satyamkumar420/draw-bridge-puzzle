import type { Vector2D } from '../types/physics';
import type { TerrainBlock } from '../types/level';
import { type AABB, closestPointOnSegment, getSegmentAABBIntersection } from './collision.ts';
import { vec } from './vector.ts';

export interface BridgeRigidBody {
  center: Vector2D;
  angle: number;
  radius: number;
  vx: number;
  vy: number;
  angularVelocity: number;
  mass: number;
  inertia: number;
}

export interface BridgeContact {
  point: Vector2D;
  normal: Vector2D;
  penetration: number;
  terrainId?: string;
}

/**
 * Calculates collision contacts between a capsule segment (p1 -> p2 with thickness radius) and an AABB box.
 * Handles endpoints, corners (critical area), and deep intersections.
 */
export function testCapsuleAABB(
  p1: Vector2D,
  p2: Vector2D,
  radius: number,
  box: TerrainBlock | AABB
): BridgeContact[] {
  const contacts: BridgeContact[] = [];
  const terrainId = 'id' in box ? (box as TerrainBlock).id : undefined;

  const xMin = box.x;
  const xMax = box.x + box.width;
  const yMin = box.y;
  const yMax = box.y + box.height;

  // 1. Endpoint collisions (round caps)
  const testEndpoint = (pt: Vector2D) => {
    const cx = Math.max(xMin, Math.min(pt.x, xMax));
    const cy = Math.max(yMin, Math.min(pt.y, yMax));
    const dx = pt.x - cx;
    const dy = pt.y - cy;
    const distSq = dx * dx + dy * dy;

    if (distSq === 0) {
      // Endpoint is inside the box
      const dTop = pt.y - yMin;
      const dBottom = yMax - pt.y;
      const dLeft = pt.x - xMin;
      const dRight = xMax - pt.x;
      const minDist = Math.min(dTop, dBottom, dLeft, dRight);
      let normal: Vector2D = { x: 0, y: -1 };
      if (minDist === dTop) normal = { x: 0, y: -1 };
      else if (minDist === dBottom) normal = { x: 0, y: 1 };
      else if (minDist === dLeft) normal = { x: -1, y: 0 };
      else normal = { x: 1, y: 0 };

      contacts.push({
        point: { ...pt },
        normal,
        penetration: radius + minDist,
        terrainId
      });
    } else if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      const normal = dist > 1e-4 ? { x: dx / dist, y: dy / dist } : { x: 0, y: -1 };
      contacts.push({
        point: { ...pt },
        normal,
        penetration: radius - dist,
        terrainId
      });
    }
  };

  testEndpoint(p1);
  testEndpoint(p2);

  // 2. Corner collisions against the segment body (critical corner edge contact)
  const corners: Vector2D[] = [
    { x: xMin, y: yMin },
    { x: xMax, y: yMin },
    { x: xMin, y: yMax },
    { x: xMax, y: yMax }
  ];

  for (const corner of corners) {
    const { point: q, t } = closestPointOnSegment(corner, p1, p2);
    // Ignore corners that are closest to the endpoints (already handled by endpoint test)
    if (t > 0.02 && t < 0.98) {
      const dx = q.x - corner.x;
      const dy = q.y - corner.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        let normal: Vector2D;
        if (dist > 1e-4) {
          normal = { x: dx / dist, y: dy / dist };
        } else {
          // Corner lies directly on the central axis; push away from box center
          const boxCenter = { x: (xMin + xMax) / 2, y: (yMin + yMax) / 2 };
          const fromCenter = vec.sub(q, boxCenter);
          normal = vec.len(fromCenter) > 0.01 ? vec.norm(fromCenter) : { x: 0, y: -1 };
        }

        contacts.push({
          point: { ...q },
          normal,
          penetration: radius - dist,
          terrainId
        });
      }
    }
  }

  // 3. Deep penetration test (segment intersecting box)
  const hit = getSegmentAABBIntersection(p1, p2, box);
  if (hit.intersects) {
    const midX = (hit.enterPoint.x + hit.exitPoint.x) / 2;
    const midY = (hit.enterPoint.y + hit.exitPoint.y) / 2;
    const dTop = midY - yMin;
    const dBottom = yMax - midY;
    const dLeft = midX - xMin;
    const dRight = xMax - midX;
    const minDist = Math.min(dTop, dBottom, dLeft, dRight);
    let normal: Vector2D = { x: 0, y: -1 };
    if (minDist === dTop) normal = { x: 0, y: -1 };
    else if (minDist === dBottom) normal = { x: 0, y: 1 };
    else if (minDist === dLeft) normal = { x: -1, y: 0 };
    else normal = { x: 1, y: 0 };

    contacts.push({
      point: { x: midX, y: midY },
      normal,
      penetration: Math.min(15, radius + minDist),
      terrainId
    });
  }

  return contacts;
}

/**
 * Resolves rigid body collisions for a polyline (straight or curved) against static terrain boxes
 * using iterative impulse & position projection.
 */
export function resolveRigidBodyCollisions(
  body: BridgeRigidBody,
  localOffsets: Vector2D[],
  points: Vector2D[],
  terrains: TerrainBlock[],
  maxIterations = 4
): { hadCollision: boolean; contactCount: number; touchingTerrainIds: Set<string> } {
  const { mass, inertia, radius } = body;
  let hadCollision = false;
  let totalContacts = 0;
  const touchingTerrainIds = new Set<string>();

  for (let iter = 0; iter < maxIterations; iter++) {
    // 1. Update world points from current center and angle
    const cos = Math.cos(body.angle);
    const sin = Math.sin(body.angle);
    for (let i = 0; i < points.length; i++) {
      const off = localOffsets[i];
      points[i].x = body.center.x + off.x * cos - off.y * sin;
      points[i].y = body.center.y + off.x * sin + off.y * cos;
    }

    // 2. Collect contacts across all segments of the polyline
    const contacts: BridgeContact[] = [];
    for (const terrain of terrains) {
      for (let s = 0; s < points.length - 1; s++) {
        const segContacts = testCapsuleAABB(points[s], points[s + 1], radius, terrain);
        for (const c of segContacts) {
          contacts.push(c);
          if (c.terrainId) touchingTerrainIds.add(c.terrainId);
        }
      }
    }

    if (contacts.length === 0) break;
    hadCollision = true;
    totalContacts += contacts.length;

    // Collect distinct platforms providing upward ground support (normal pointing up)
    const upwardPlatformIds = new Set<string>();
    for (const c of contacts) {
      if (c.normal.y < -0.7 && c.terrainId && !c.terrainId.startsWith('t-bottom')) {
        upwardPlatformIds.add(c.terrainId);
      }
    }
    const isMultiPlatformSupported = upwardPlatformIds.size >= 2;
    if (isMultiPlatformSupported) {
      body.angularVelocity = 0;
    }

    // 3. Resolve impulses and position separation
    let netSepX = 0;
    let netSepY = 0;
    let maxPen = 0;

    for (const c of contacts) {
      const r = vec.sub(c.point, body.center);
      const rCrossN = r.x * c.normal.y - r.y * c.normal.x;
      const invMass = 1 / mass;
      const invInertia = isMultiPlatformSupported ? 0 : 1 / inertia;
      const K = invMass + rCrossN * rCrossN * invInertia;
      if (K <= 1e-6) continue;

      // Position separation to completely eliminate penetration
      if (c.penetration > 0.001) {
        const effectivePen = Math.min(2.5, c.penetration);
        if (effectivePen > maxPen) maxPen = effectivePen;
        const deltaLambda = effectivePen / K;
        netSepX += deltaLambda * invMass * c.normal.x;
        netSepY += deltaLambda * invMass * c.normal.y;
        if (!isMultiPlatformSupported) {
          const maxAngleDelta = 0.035;
          const deltaAngle = Math.max(-maxAngleDelta, Math.min(maxAngleDelta, (deltaLambda / Math.max(1, contacts.length)) * invInertia * rCrossN));
          body.angle += deltaAngle;
        }
      }

      // Normal velocity impulse
      const vcX = body.vx - body.angularVelocity * r.y;
      const vcY = body.vy + body.angularVelocity * r.x;
      const vn = vcX * c.normal.x + vcY * c.normal.y;

      if (vn < 0) {
        // Zero restitution for multi-platform supported bridges to prevent any jump/bounce
        const restitution = isMultiPlatformSupported ? 0 : (Math.abs(vn) > 30 ? 0.05 : 0);
        const jn = -((1 + restitution) * vn) / K;
        body.vx += jn * invMass * c.normal.x;
        body.vy += jn * invMass * c.normal.y;
        if (!isMultiPlatformSupported) {
          body.angularVelocity += jn * invInertia * rCrossN;
        } else {
          body.angularVelocity = 0;
        }

        // Tangential friction impulse
        const tx = -c.normal.y;
        const ty = c.normal.x;
        const vt = vcX * tx + vcY * ty;
        const rCrossT = r.x * ty - r.y * tx;
        const Kt = invMass + rCrossT * rCrossT * invInertia;
        if (Kt > 1e-6) {
          const mu = 0.65;
          const jtMax = mu * jn;
          const jt = Math.max(-jtMax, Math.min(jtMax, -vt / Kt));
          body.vx += jt * invMass * tx;
          body.vy += jt * invMass * ty;
          if (!isMultiPlatformSupported) {
            body.angularVelocity += jt * invInertia * rCrossT;
          }
        }
      }
    }

    // Apply normalized position separation: cannot exceed max penetration to avoid explosive jumps
    const netSepLen = Math.hypot(netSepX, netSepY);
    if (netSepLen > 0 && maxPen > 0) {
      const allowedLen = Math.min(netSepLen, maxPen);
      body.center.x += (netSepX / netSepLen) * allowedLen;
      body.center.y += (netSepY / netSepLen) * allowedLen;
    }

    // Dual platform supported bridges must never bounce upward into the air
    if (isMultiPlatformSupported && body.vy < 0) {
      body.vy = 0;
    }
  }

  // Final sync of world points
  const finalCos = Math.cos(body.angle);
  const finalSin = Math.sin(body.angle);
  for (let i = 0; i < points.length; i++) {
    const off = localOffsets[i];
    points[i].x = body.center.x + off.x * finalCos - off.y * finalSin;
    points[i].y = body.center.y + off.x * finalSin + off.y * finalCos;
  }

  return { hadCollision, contactCount: totalContacts, touchingTerrainIds };
}

export * from './drawRouting.ts';

