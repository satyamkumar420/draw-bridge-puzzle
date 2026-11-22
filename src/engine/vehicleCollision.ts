import type { Vehicle, LineSegment, Vector2D } from '../types/physics';
import type { TerrainBlock } from '../types/level';
import { circleAABBCollision, circleSegmentCollision } from './collision.ts';
import { vec } from './vector.ts';
import type { ParticleSystem } from './particles';

export interface HullProbe {
  offset: Vector2D;
  radius: number;
  isFront?: boolean;
  isRoof?: boolean;
  isRear?: boolean;
  isBottom?: boolean;
}

export interface VehicleCollisionSpec {
  frontExtent: number;
  rearExtent: number;
  topExtent: number;
  bottomExtent: number;
  probes: HullProbe[];
}

export interface VehicleCollisionContext {
  vehicle: Vehicle;
  scale: number;
  carId: string;
  onTriggerDeath: (type: 'blast' | 'drown') => void;
  onStopDriving: () => void;
  onImpactCrash?: () => void;
  bridgeManager?: {
    push: (delta: Vector2D, velocity?: Vector2D, terrains?: TerrainBlock[]) => void;
    getHasBothWallSupports: () => boolean;
    getIsSettled?: () => boolean;
    getIsSupported?: () => boolean;
  };
}

/**
 * Per-vehicle collision specifications aligned to vehicle PNG contour dimensions (at scale = 1.0)
 */
export const VEHICLE_COLLISION_SPECS: Record<string, VehicleCollisionSpec> = {
  // Army Hauler: 98.42px width x 54.93px height, bodyOffsetX: +1.32px, bodyOffsetY: -9.0px
  // Front bumper extends to +50.53px, rear to -47.89px, roof to -33px
  army_truck: {
    frontExtent: 50.5,
    rearExtent: 48.0,
    topExtent: 33.0,
    bottomExtent: 17.0,
    probes: [
      { offset: { x: 47.0, y: 5.0 }, radius: 3.5, isFront: true },    // Front bumper / bullbar bottom (reaches +50.5)
      { offset: { x: 47.0, y: -2.0 }, radius: 3.5, isFront: true },   // Front grille / bullbar mid (reaches +50.5)
      { offset: { x: 42.0, y: -10.0 }, radius: 4.0, isFront: true },  // Front hood nose (reaches +46.0)
      { offset: { x: 24.0, y: -19.0 }, radius: 4.0, isFront: true },  // Windshield
      { offset: { x: 16.0, y: -29.0 }, radius: 4.0, isRoof: true },   // Cab roof front
      { offset: { x: -12.0, y: -29.5 }, radius: 4.0, isRoof: true },  // Canopy roof center
      { offset: { x: -38.0, y: -29.0 }, radius: 4.0, isRoof: true },  // Canopy roof rear
      { offset: { x: -44.0, y: -11.0 }, radius: 4.0, isRear: true },  // Rear tailgate (reaches -48.0)
      { offset: { x: -44.0, y: 4.0 }, radius: 4.0, isRear: true },    // Rear bumper (reaches -48.0)
      { offset: { x: 0.0, y: 5.0 }, radius: 4.0, isBottom: true }     // Underbody belly between wheels
    ]
  },

  // Mini Hauler: 81.46px width x 45.08px height, bodyOffsetX: -1.0px, bodyOffsetY: -3.8px
  // Front bumper extends to +39.73px, rear to -41.73px, roof to -26.34px
  delivery_truck: {
    frontExtent: 40.0,
    rearExtent: 42.0,
    topExtent: 26.0,
    bottomExtent: 18.0,
    probes: [
      { offset: { x: 36.5, y: 8.0 }, radius: 3.5, isFront: true },    // Front bumper (reaches +40.0)
      { offset: { x: 36.5, y: 0.0 }, radius: 3.5, isFront: true },    // Front grille (reaches +40.0)
      { offset: { x: 30.0, y: -8.0 }, radius: 4.0, isFront: true },   // Front hood
      { offset: { x: 18.0, y: -16.0 }, radius: 4.0, isFront: true },  // Windshield
      { offset: { x: 10.0, y: -22.5 }, radius: 4.0, isRoof: true },   // Cab roof
      { offset: { x: -14.0, y: -22.5 }, radius: 4.0, isRoof: true },  // Cargo box roof center
      { offset: { x: -37.5, y: -22.5 }, radius: 4.0, isRoof: true },  // Cargo box roof rear
      { offset: { x: -38.0, y: -4.0 }, radius: 4.0, isRear: true },   // Rear cargo door (reaches -42.0)
      { offset: { x: -38.0, y: 8.0 }, radius: 4.0, isRear: true },    // Rear bumper (reaches -42.0)
      { offset: { x: 0.0, y: 8.0 }, radius: 4.0, isBottom: true }     // Underbody belly
    ]
  },

  // Smart Hatch & Velocity Coupe: 80px width x 44px height, bodyOffset: (0, 0)
  // Front bumper extends to +40.0px, rear to -40.0px, roof to -22.0px
  smart_car: {
    frontExtent: 40.0,
    rearExtent: 40.0,
    topExtent: 22.0,
    bottomExtent: 18.0,
    probes: [
      { offset: { x: 36.0, y: 8.0 }, radius: 4.0, isFront: true },    // Front bumper (reaches +40.0)
      { offset: { x: 36.0, y: 1.0 }, radius: 4.0, isFront: true },    // Front nose / grille (reaches +40.0)
      { offset: { x: 26.0, y: -6.0 }, radius: 4.0, isFront: true },   // Hood slope
      { offset: { x: 12.0, y: -16.0 }, radius: 4.0, isRoof: true },   // Windshield / roof front
      { offset: { x: -4.0, y: -18.0 }, radius: 4.5, isRoof: true },   // Roof center
      { offset: { x: -20.0, y: -15.0 }, radius: 4.0, isRoof: true },  // Rear roof slope
      { offset: { x: -36.0, y: 8.0 }, radius: 4.0, isRear: true },    // Rear bumper (reaches -40.0)
      { offset: { x: -35.0, y: -2.0 }, radius: 4.0, isRear: true },   // Rear hatch (reaches -39.0)
      { offset: { x: 0.0, y: 8.0 }, radius: 4.0, isBottom: true }     // Underbody belly
    ]
  },
  dirt_bike: {
    frontExtent: 40.5,
    rearExtent: 40.5,
    topExtent: 24.0,
    bottomExtent: 26.5,
    probes: [
      { offset: { x: 38.0, y: -2.0 }, radius: 3.5, isFront: true },   // Front fender
      { offset: { x: 20.0, y: -22.0 }, radius: 4.0, isRoof: true },   // Handlebars / top
      { offset: { x: -8.0, y: -12.0 }, radius: 4.0, isRoof: true },   // Seat
      { offset: { x: -38.0, y: -14.0 }, radius: 3.5, isRoof: true },  // Rear fender tail
      { offset: { x: -32.0, y: 11.5 }, radius: 4.0, isRear: true },   // Rear swingarm
      { offset: { x: 0.0, y: 11.5 }, radius: 4.0, isBottom: true }    // Engine bash plate / belly
    ]
  },
  super_bike: {
    frontExtent: 40.5,
    rearExtent: 40.5,
    topExtent: 24.0,
    bottomExtent: 22.5,
    probes: [
      { offset: { x: 38.0, y: -2.0 }, radius: 3.5, isFront: true },   // Front nose fairing
      { offset: { x: 24.0, y: -20.0 }, radius: 4.0, isRoof: true },   // Windscreen
      { offset: { x: 4.0, y: -17.0 }, radius: 4.0, isRoof: true },    // Tank
      { offset: { x: -36.0, y: -14.0 }, radius: 3.5, isRoof: true },  // Tail cowl
      { offset: { x: -32.0, y: 9.0 }, radius: 4.0, isRear: true },    // Rear swingarm
      { offset: { x: 2.0, y: 9.0 }, radius: 4.0, isBottom: true }     // Lower belly fairing
    ]
  }
};

// Aliases for matching vehicle catalog types
VEHICLE_COLLISION_SPECS.sports_coupe = VEHICLE_COLLISION_SPECS.smart_car;

export function getVehicleCollisionSpec(carId: string): VehicleCollisionSpec {
  return VEHICLE_COLLISION_SPECS[carId] || VEHICLE_COLLISION_SPECS.smart_car;
}

/**
 * Tests vehicle chassis contour probes against terrain blocks and bridge lines
 */
export function resolveVehicleChassisCollision(
  ctx: VehicleCollisionContext,
  terrains: TerrainBlock[],
  bridgeSegments: LineSegment[],
  particles: ParticleSystem
): void {
  const v = ctx.vehicle;
  const s = ctx.scale;
  const spec = getVehicleCollisionSpec(ctx.carId);

  for (const probe of spec.probes) {
    const scaledOffset = { x: probe.offset.x * s, y: probe.offset.y * s };
    const probeRadius = probe.radius * s;
    const worldPos = vec.add(v.position, vec.rotate(scaledOffset, v.angle));

    // Test against solid terrain blocks
    for (const terrain of terrains) {
      const col = circleAABBCollision(worldPos, probeRadius, terrain);
      if (col.collided && col.penetration > 0.1) {
        if (probe.isBottom && (v.wheels[0].isGrounded || v.wheels[1].isGrounded) && col.normal.y < -0.6) {
          // Bottom belly probe on road surface is handled smoothly by wheel suspension
          continue;
        }

        // When climbing over a corner onto a platform (worldPos is near the top surface of the terrain)
        const isNearTopSurface = worldPos.y <= terrain.y + 12 * s;
        if (probe.isFront && isNearTopSurface && (v.wheels[0].isGrounded || v.wheels[1].isGrounded)) {
          // Smoothly lift the front bumper over the corner without zeroing forward driving velocity
          if (col.normal.y < -0.1) {
            v.position.y += col.normal.y * col.penetration;
          } else {
            v.position.y -= col.penetration * 0.8;
          }
          continue;
        }

        handleHullHit(ctx, col.normal, col.penetration, probe.isRoof, probe.isFront, particles);
      }
    }

    // Test against bridge segments
    for (const seg of bridgeSegments) {
      const col = circleSegmentCollision(worldPos, probeRadius, seg.p1, seg.p2, 4.0 * s);
      if (!col.collided || col.penetration <= 0.1) continue;

      // 1. Inverted roof crash check against road
      if (probe.isRoof && Math.abs(Math.atan2(Math.sin(v.angle), Math.cos(v.angle))) > 1.5) {
        handleHullHit(ctx, col.normal, col.penetration, true, false, particles);
        continue;
      }

      // Check if probe is on top (road) side or underside / backside of the bridge
      const signedDist = seg.normal ? vec.dot(vec.sub(worldPos, seg.p1), seg.normal) : 0;
      const dotColSeg = seg.normal ? vec.dot(col.normal, seg.normal) : 0;
      const isRoadSide = seg.normal
        ? (signedDist > -2.0 * s && !(dotColSeg < -0.3 && col.normal.y > 0.2))
        : col.normal.y < -0.1;

      // 2. Check if bridge is a near-vertical wall barrier (>85 deg incline, length >= 15px)
      const isSteepWall = seg.normal && seg.normal.y > -0.05 && (seg.length ?? 20) >= 15 * s;
      if (probe.isFront && isSteepWall && col.normal.x < -0.2) {
        handleHullHit(ctx, col.normal, col.penetration, false, true, particles);
        continue;
      }

      // 3. Smooth climbing over gentle/medium ramp, joint crease, or uneven bump for front bumper if wheels are grounded
      // Only climb if actually approaching from the road side (not hitting underside/wall)
      if (probe.isFront && (v.wheels[0].isGrounded || v.wheels[1].isGrounded) && isRoadSide && !isSteepWall) {
        if (col.normal.y < -0.05) {
          v.position.y += col.normal.y * col.penetration;
        } else {
          v.position.y -= col.penetration * 0.8;
        }
        continue;
      }

      if (!isRoadSide) {
        // Probe is on the underside or back side of the bridge (barrier / ceiling hit)
        if (probe.isFront || (col.normal.x < -0.15 && v.velocity.x > 0)) {
          handleHullHit(ctx, col.normal, col.penetration, false, true, particles);
        } else if (probe.isRoof) {
          if (col.normal.x < -0.1 && v.velocity.x > 0) {
            handleHullHit(ctx, col.normal, col.penetration, false, true, particles);
          } else {
            handleHullHit(ctx, col.normal, col.penetration, true, false, particles);
          }
        } else {
          v.position = vec.add(v.position, vec.scale(col.normal, col.penetration));
          const normalVel = vec.dot(v.velocity, col.normal);
          if (normalVel < 0) {
            v.velocity = vec.sub(v.velocity, vec.scale(col.normal, normalVel));
          }
          if (col.normal.x < -0.15 && v.velocity.x > 0) {
            v.velocity.x = 0;
          }
        }
        continue;
      }

      // 4. Belly probe on road surface is handled smoothly by suspension without friction braking
      if (probe.isBottom && (v.wheels[0].isGrounded || v.wheels[1].isGrounded)) {
        if (col.penetration > 2.0 * s) {
          v.position.y -= (col.penetration - 1.0 * s) * 0.5;
        }
        continue;
      }

      // 5. Upward-facing road surface: prevent bottom, rear, or chassis from sinking into bridge
      const roadNormal = (seg.normal && seg.normal.y < 0)
        ? seg.normal
        : col.normal;

      v.position = vec.add(v.position, vec.scale(roadNormal, col.penetration));
      const normalVel = vec.dot(v.velocity, roadNormal);
      if (normalVel < 0) {
        v.velocity = vec.sub(v.velocity, vec.scale(roadNormal, normalVel));
      }
      if (probe.isRear && v.angle < 0) {
        v.angle += 0.35 * col.penetration * (Math.PI / 180);
        v.angularVelocity = 0;
      } else if (probe.isFront && v.angle > 0) {
        v.angle -= 0.35 * col.penetration * (Math.PI / 180);
        v.angularVelocity = 0;
      }
    }
  }
}

export interface WheelBridgeCollisionResult {
  hadContact: boolean;
  maxPen: number;
  normal: Vector2D;
}

export function resolveWheelBridgeCollisions(
  mount: Vector2D,
  radius: number,
  suspensionRange: number,
  strokeThickness: number,
  bridgeSegments: LineSegment[],
  vehicle: Vehicle
): WheelBridgeCollisionResult {
  let maxBridgePen = -Infinity;
  let bridgeNormal = { x: 0, y: -1 };
  let hadBridgeContact = false;
  const strokeRadius = strokeThickness / 2;

  for (const seg of bridgeSegments) {
    let col = circleSegmentCollision(mount, radius + suspensionRange, seg.p1, seg.p2, strokeThickness);

    // Drivable road surface fallback for high speeds (works for any non-vertical segment)
    if (!col.collided && seg.normal && seg.normal.y < 0) {
      const segDx = seg.p2.x - seg.p1.x;
      if (Math.abs(segDx) > 0.01) {
        const t = (mount.x - seg.p1.x) / segDx;
        if (t >= -0.05 && t <= 1.05) {
          const lineY = seg.p1.y + t * (seg.p2.y - seg.p1.y);
          const topSurfaceY = lineY - strokeRadius;
          const wheelBottomY = mount.y + radius;
          if (mount.y <= lineY + strokeRadius + radius * 0.5 && wheelBottomY >= topSurfaceY) {
            col = {
              collided: true,
              penetration: wheelBottomY - topSurfaceY + suspensionRange,
              normal: seg.normal,
              contactPoint: { x: mount.x, y: topSurfaceY }
            };
          }
        }
      }
    }

    if (!col.collided) continue;

    // Check if wheel is on top road side or underside/backside
    // Upward-facing road segments with vehicle chassis above the road are always treated as top surface
    const segMaxY = Math.max(seg.p1.y, seg.p2.y);
    const isVehicleAboveRoad = seg.normal && seg.normal.y < 0 && vehicle.position.y <= segMaxY + 25;

    const signedDist = seg.normal ? vec.dot(vec.sub(mount, seg.p1), seg.normal) : 0;
    const dotColSeg = seg.normal ? vec.dot(col.normal, seg.normal) : 0;
    const isUnderside = !isVehicleAboveRoad && col.normal.y > 0.1 && (
      (seg.normal && (signedDist < -radius || dotColSeg < -0.3)) ||
      !seg.normal
    );
    const isTopSide = !isUnderside;

    if (!isTopSide) {
      // Hitting bridge from front/back or underneath
      const actualPen = col.penetration - suspensionRange;
      if (actualPen > 0) {
        if (col.normal.x < -0.2) {
          vehicle.position.x += col.normal.x * actualPen;
          if (vehicle.velocity.x > 0) vehicle.velocity.x = 0;
        } else if (col.normal.y > 0.2) {
          vehicle.position.y += col.normal.y * actualPen;
          if (vehicle.velocity.y < 0) vehicle.velocity.y = 0;
        }
      }
      continue;
    }

    // Top side: Check if bridge is a near-vertical wall barrier (>85 deg incline, length >= 15px)
    // Only block as wall when car is approaching head-on from the front (col.normal.x < -0.2)
    const isSteepWall = seg.normal && seg.normal.y > -0.05 && (seg.length ?? 20) >= 15;
    if (isSteepWall && col.normal.x < -0.2) {
      const actualPen = col.penetration - suspensionRange;
      if (actualPen > 0) {
        vehicle.position.x += col.normal.x * actualPen;
        if (vehicle.velocity.x > 0) vehicle.velocity.x = 0;
      }
      continue;
    }

    // Top side drivable road contact: treat any segment with upward-facing normal as drivable
    // This includes steep slopes where the car drives along the surface (not head-on into a wall)
    const hasUpwardNormal = seg.normal && seg.normal.y < 0;
    if (col.normal.y < -0.05 || hasUpwardNormal || (seg.length ?? 20) < 15) {
      hadBridgeContact = true;
      const actualPen = col.penetration - suspensionRange;
      const normal = (seg.normal && seg.normal.y < 0) ? seg.normal : col.normal;
      if (actualPen > maxBridgePen || !hadBridgeContact) {
        maxBridgePen = actualPen;
        bridgeNormal = normal;
      }
    }
  }

  return {
    hadContact: hadBridgeContact,
    maxPen: maxBridgePen,
    normal: bridgeNormal
  };
}

function handleHullHit(
  ctx: VehicleCollisionContext,
  normal: Vector2D,
  penetration: number,
  isRoof: boolean | undefined,
  isFront: boolean | undefined,
  particles: ParticleSystem
): void {
  const v = ctx.vehicle;

  // Push chassis cleanly out of barrier with 100% resolution to prevent wall penetration
  if (isFront && (normal.x < -0.15 || (normal.x < 0 && Math.abs(normal.y) < 0.7))) {
    v.position.x += (normal.x < 0 ? normal.x : -0.8) * penetration;
    if (normal.y !== 0) {
      v.position.y += normal.y * penetration * 0.5;
    }
    if (v.hasWon && v.velocity.x > 0) {
      ctx.onImpactCrash?.();
      v.velocity.x = 0;
      v.angularVelocity *= 0.2;
      ctx.onStopDriving();
      const contactPoint = { x: v.position.x + 38 * ctx.scale, y: v.position.y };
      particles.emitSmoke(contactPoint, -15, -8);
    } else {
      if (v.velocity.x > 15) {
        ctx.onImpactCrash?.();
      }
      if (v.velocity.x > 0) v.velocity.x = 0;
      v.angularVelocity = 0;
    }
  } else if (normal.x > 0.5) {
    v.position.x += normal.x * penetration;
    if (v.velocity.x < 0) v.velocity.x = 0;
  } else {
    v.position = vec.add(v.position, vec.scale(normal, penetration));
    const normalVel = vec.dot(v.velocity, normal);
    if (normalVel < 0) {
      v.velocity = vec.sub(v.velocity, vec.scale(normal, normalVel));
    }
    if (normal.x < -0.15 && v.velocity.x > 0) {
      v.velocity.x = 0;
    }
  }
  v.angularVelocity *= 0.5;

  // High-impact roof crash triggers explosion only when inverted / upside-down
  const isUpsideDown = Math.abs(Math.atan2(Math.sin(v.angle), Math.cos(v.angle))) > 1.5;
  if (isRoof && normal.y > 0.4 && isUpsideDown) {
    ctx.onTriggerDeath('blast');
  }
}

export function resolveWheelTerrainCollisions(
  mount: Vector2D,
  radius: number,
  suspensionRange: number,
  terrains: TerrainBlock[],
  vehicle: Vehicle
): { hadContact: boolean; maxPen: number; normal: Vector2D } {
  let maxTerrainPen = -Infinity;
  let terrainNormal = { x: 0, y: -1 };
  let hadTerrainContact = false;

  for (const terrain of terrains) {
    const col = circleAABBCollision(mount, radius + suspensionRange, terrain);
    if (!col.collided) continue;

    const isNearTopCorner =
      mount.y <= terrain.y + radius * 0.85 &&
      (mount.x <= terrain.x + 8 || mount.x >= terrain.x + terrain.width - 8);

    if (isNearTopCorner) {
      hadTerrainContact = true;
      const cornerPoint = {
        x: mount.x < terrain.x + terrain.width / 2 ? terrain.x : terrain.x + terrain.width,
        y: terrain.y
      };
      const diff = vec.sub(mount, cornerPoint);
      const dist = vec.len(diff);
      let cornerNormal: Vector2D = dist > 0.001 ? vec.norm(diff) : { x: -0.3, y: -0.95 };
      if (dist > 0.001 && cornerNormal.y > -0.3) {
        cornerNormal.y = -0.7;
        cornerNormal = vec.norm(cornerNormal);
      }
      const actualPen = radius - dist;
      if (actualPen > maxTerrainPen || !hadTerrainContact) {
        maxTerrainPen = actualPen;
        terrainNormal = cornerNormal;
      }
    } else if (Math.abs(col.normal.x) > 0.7 && Math.abs(col.normal.y) <= 0.7) {
      const actualPen = col.penetration - suspensionRange;
      if (actualPen > 0) {
        vehicle.position.x += col.normal.x * actualPen;
        if (col.normal.x < 0 && vehicle.velocity.x > 0) vehicle.velocity.x = 0;
        if (col.normal.x > 0 && vehicle.velocity.x < 0) vehicle.velocity.x = 0;
      }
    } else if (col.normal.y < -0.2) {
      hadTerrainContact = true;
      const actualPen = col.penetration - suspensionRange;
      if (actualPen > maxTerrainPen || !hadTerrainContact) {
        maxTerrainPen = actualPen;
        terrainNormal = col.normal;
      }
    }
  }

  return {
    hadContact: hadTerrainContact,
    maxPen: maxTerrainPen,
    normal: terrainNormal
  };
}
