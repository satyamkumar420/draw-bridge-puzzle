import type { Vehicle, Wheel, SuspensionPoint, Vector2D } from '../types/physics';
import type { HazardBlock, GoalArea, CoinItem, TerrainBlock } from '../types/level';
import type { ParticleSystem } from './particles';
import { pointInAABB, circleAABBCollision, circleSegmentCollision } from './collision.ts';
import { vec } from './vector.ts';
import { getVehicleCollisionSpec } from './vehicleCollision.ts';

export interface AxleMounts {
  rear: { mount: { x: number; y: number }; offset: { x: number; y: number } };
  front: { mount: { x: number; y: number }; offset: { x: number; y: number } };
}

export interface GameEventsContext {
  vehicle: Vehicle;
  scale: number;
  isDriving: boolean;
  onStopDriving: () => void;
  onTriggerDeath: (type: 'blast' | 'drown') => void;
  onImpactCrash?: () => void;
  rightBoundary?: number;
  carId?: string;
  animTime?: number;
}

import { getVehicleSpec } from '../config/vehicleSpecs.ts';

export function createDefaultVehicle(x: number, y: number, s = 1.0, carId = 'smart_car'): Vehicle {
  const spec = getVehicleSpec(carId);
  const rearAxleOffsetX = spec.rearAxle.x * s;
  const frontAxleOffsetX = spec.frontAxle.x * s;
  const rearAxleOffsetY = spec.rearAxle.y * s;
  const frontAxleOffsetY = spec.frontAxle.y * s;
  const wheelRadius = spec.wheelRadius * s;

  const rearWheel: Wheel = {
    position: { x: x + rearAxleOffsetX, y: y + rearAxleOffsetY },
    velocity: { x: 0, y: 0 },
    radius: wheelRadius,
    angle: 0,
    angularVelocity: 0,
    isGrounded: false,
    motorTorque: 0
  };

  const frontWheel: Wheel = {
    position: { x: x + frontAxleOffsetX, y: y + frontAxleOffsetY },
    velocity: { x: 0, y: 0 },
    radius: wheelRadius,
    angle: 0,
    angularVelocity: 0,
    isGrounded: false,
    motorTorque: 0
  };

  const rearSuspension: SuspensionPoint = {
    localMount: { x: rearAxleOffsetX, y: rearAxleOffsetY },
    wheelIndex: 0,
    restLength: wheelRadius,
    stiffness: 450,
    damping: 28
  };

  const frontSuspension: SuspensionPoint = {
    localMount: { x: frontAxleOffsetX, y: frontAxleOffsetY },
    wheelIndex: 1,
    restLength: wheelRadius,
    stiffness: 450,
    damping: 28
  };

  return {
    position: { x, y },
    velocity: { x: 0, y: 0 },
    angle: 0,
    angularVelocity: 0,
    width: spec.baseWidth * s,
    height: spec.baseHeight * s,
    mass: 4.0,
    wheels: [rearWheel, frontWheel],
    suspension: [rearSuspension, frontSuspension],
    isDead: false,
    hasWon: false,
    deathType: null,
    deathTimer: 0
  };
}

export function checkVehicleGameEvents(
  ctx: GameEventsContext,
  hazards: HazardBlock[],
  goal: GoalArea,
  coins: CoinItem[],
  particles: ParticleSystem,
  terrains: TerrainBlock[]
): void {
  const v = ctx.vehicle;
  if (v.isDead) return;

  // 1. Flip-over detection (car upside-down)
  const normAngle = Math.atan2(Math.sin(v.angle), Math.cos(v.angle));
  if (!v.hasWon && Math.abs(normAngle) > 2.0) {
    ctx.onTriggerDeath('blast');
    return;
  }

  // 2. Goal completion check: triggers when car crosses the flag pole at or above platform ground
  const poleX = goal.x + 25 * ctx.scale;
  const colSpec = getVehicleCollisionSpec(ctx.carId || 'smart_car');
  const frontExtent = colSpec.frontExtent * ctx.scale;
  const isPastFlag = v.position.x >= poleX || (v.position.x + frontExtent * 0.6 >= poleX && v.velocity.x >= 0);
  // Car must be at or above the goal platform surface (not fallen down into chasm/pit)
  const isAboveOrAtGround = v.position.y <= goal.y + 45 * ctx.scale;
  const isUpright = Math.abs(normAngle) < 1.25;

  if (!v.hasWon && isUpright && isPastFlag && isAboveOrAtGround) {
    v.hasWon = true;
    v.winTimer = 0;
  }

  // 3. After crossing flag: stop car when reaching end wall, platform edge, or right screen border
  if (v.hasWon) {
    const syncWheels = () => {
      const mounts = computeAxleMounts(v, ctx.scale, ctx.carId || 'smart_car');
      v.wheels[0].position.x = mounts.rear.mount.x;
      v.wheels[0].position.y = mounts.rear.mount.y;
      v.wheels[1].position.x = mounts.front.mount.x;
      v.wheels[1].position.y = mounts.front.mount.y;
    };

    // Destination screen edge or platform right boundary
    const colSpec = getVehicleCollisionSpec(ctx.carId || 'smart_car');
    const frontExtent = colSpec.frontExtent * ctx.scale;
    const rightLimit = ctx.rightBoundary && Number.isFinite(ctx.rightBoundary)
      ? ctx.rightBoundary
      : 1000;
    const upperTerrains = terrains.filter((t) => !t.id.startsWith('t-bottom'));
    const maxTerrainX = upperTerrains.reduce((max, t) => Math.max(max, t.x + t.width), 1000);
    const effectiveRightLimit = Math.max(rightLimit, maxTerrainX);
    const endBarrierX = Math.max(poleX + 30 * ctx.scale, effectiveRightLimit - frontExtent);

    if (v.position.x >= endBarrierX) {
      v.position.x = endBarrierX;
      if (v.velocity.x > 0) {
        ctx.onImpactCrash?.();
        // Vehicle reaches the end boundary: smoothly stop forward drive without violent backwards jump
        v.velocity.x = 0;
        v.angularVelocity *= 0.2;
        ctx.onStopDriving();
        syncWheels();

        const contactPoint = { x: endBarrierX + frontExtent, y: v.position.y };
        particles.emitSmoke(contactPoint, -15, -8);
      }
    }
  }

  // 4. Hazard checks (only if vehicle has not already won)
  if (v.hasWon) return;

  for (const rawHazard of hazards) {
    if (rawHazard.destroyed) continue;

    const hazard: HazardBlock =
      rawHazard.currentX !== undefined || rawHazard.currentY !== undefined
        ? { ...rawHazard, x: rawHazard.currentX ?? rawHazard.x, y: rawHazard.currentY ?? rawHazard.y }
        : rawHazard;

    if (hazard.type === 'laser') {
      const beamY = hazard.y + hazard.height / 2;
      const beamHalfThick = 10;
      const pylonW = Math.min(14, hazard.width * 0.2);
      const beamStart = hazard.x + pylonW;
      const beamEnd = hazard.x + hazard.width - pylonW;

      const isHit = (pt: Vector2D, extraR = 0) =>
        pt.x >= beamStart &&
        pt.x <= beamEnd &&
        Math.abs(pt.y - beamY) <= beamHalfThick + extraR;

      const minY = Math.min(v.position.y - 10, v.wheels[0].position.y, v.wheels[1].position.y);
      const maxY = Math.max(v.position.y + 10, v.wheels[0].position.y + v.wheels[0].radius * 0.7, v.wheels[1].position.y + v.wheels[1].radius * 0.7);
      const minX = Math.min(v.wheels[0].position.x, v.wheels[1].position.x);
      const maxX = Math.max(v.wheels[0].position.x, v.wheels[1].position.x);

      const bodyCrossesBeam =
        beamY >= minY &&
        beamY <= maxY &&
        maxX >= beamStart &&
        minX <= beamEnd;

      if (
        isHit(v.position, 12) ||
        isHit(v.wheels[0].position, v.wheels[0].radius * 0.7) ||
        isHit(v.wheels[1].position, v.wheels[1].radius * 0.7) ||
        bodyCrossesBeam
      ) {
        ctx.onTriggerDeath('blast');
        return;
      }
    } else if (hazard.type === 'guillotine') {
      const cx = hazard.x + hazard.width / 2;
      const cy = hazard.y + hazard.height / 2;
      const rotAngle = (ctx.animTime ?? 0) * 3.2;
      const armLen = Math.max(16, Math.min(24, hazard.height * 0.36));
      const bladeW = Math.max(26, Math.min(36, hazard.width * 0.18));
      const bladeH = bladeW / 2;

      // 1. Crescent execution blade (red cutting pointer)
      const bladeCenter: Vector2D = {
        x: cx - Math.sin(rotAngle) * armLen,
        y: cy + Math.cos(rotAngle) * armLen
      };
      const bladeRadius = bladeH;

      // 2. Counterweight rear balance spike
      const counterCenter: Vector2D = {
        x: cx + Math.sin(rotAngle) * (armLen * 0.45),
        y: cy - Math.cos(rotAngle) * (armLen * 0.45)
      };
      const counterRadius = 4.5;

      // 3. Central axle hub
      const hubCenter: Vector2D = { x: cx, y: cy };
      const hubRadius = 7.0;

      const circleHitsBladeAssembly = (center: Vector2D, radius: number): boolean => {
        if (vec.dist(center, bladeCenter) < radius + bladeRadius) return true;
        if (vec.dist(center, counterCenter) < radius + counterRadius) return true;
        if (vec.dist(center, hubCenter) < radius + hubRadius) return true;
        if (circleSegmentCollision(center, radius, hubCenter, bladeCenter, 6).collided) return true;
        return false;
      };

      const wheel0Touch = circleHitsBladeAssembly(v.wheels[0].position, v.wheels[0].radius);
      const wheel1Touch = circleHitsBladeAssembly(v.wheels[1].position, v.wheels[1].radius);

      let chassisTouch = false;
      const spec = getVehicleCollisionSpec(ctx.carId || 'smart_car');
      for (const probe of spec.probes) {
        const scaledOffset = { x: probe.offset.x * ctx.scale, y: probe.offset.y * ctx.scale };
        const probeRadius = probe.radius * ctx.scale;
        const probeWorldPos = vec.add(v.position, vec.rotate(scaledOffset, v.angle));
        if (circleHitsBladeAssembly(probeWorldPos, probeRadius)) {
          chassisTouch = true;
          break;
        }
      }

      if (wheel0Touch || wheel1Touch || chassisTouch || circleHitsBladeAssembly(v.position, 10 * ctx.scale)) {
        ctx.onTriggerDeath('blast');
        return;
      }
    } else if (hazard.type === 'chakra') {
      const cx = hazard.x + (hazard.width || 40) / 2;
      const cy = hazard.y + (hazard.height || 40) / 2;
      const chakraCenter: Vector2D = { x: cx, y: cy };
      const chakraRadius = Math.max(6, Math.min(hazard.width || 40, hazard.height || 40) / 2 - 2);

      const circleHitsChakra = (center: Vector2D, radius: number): boolean =>
        vec.dist(center, chakraCenter) < radius + chakraRadius;

      const wheel0Touch = circleHitsChakra(v.wheels[0].position, v.wheels[0].radius);
      const wheel1Touch = circleHitsChakra(v.wheels[1].position, v.wheels[1].radius);

      let chassisTouch = false;
      const spec = getVehicleCollisionSpec(ctx.carId || 'smart_car');
      for (const probe of spec.probes) {
        const scaledOffset = { x: probe.offset.x * ctx.scale, y: probe.offset.y * ctx.scale };
        const probeRadius = probe.radius * ctx.scale;
        const probeWorldPos = vec.add(v.position, vec.rotate(scaledOffset, v.angle));
        if (circleHitsChakra(probeWorldPos, probeRadius)) {
          chassisTouch = true;
          break;
        }
      }

      if (wheel0Touch || wheel1Touch || chassisTouch || circleHitsChakra(v.position, 10 * ctx.scale)) {
        ctx.onTriggerDeath('blast');
        return;
      }
    } else {
      const wheel0Touch = circleAABBCollision(v.wheels[0].position, v.wheels[0].radius, hazard).collided;
      const wheel1Touch = circleAABBCollision(v.wheels[1].position, v.wheels[1].radius, hazard).collided;
      const frontNose: Vector2D = {
        x: v.position.x + Math.cos(v.angle) * (v.width * 0.45),
        y: v.position.y + Math.sin(v.angle) * (v.width * 0.45)
      };
      const rearBumper: Vector2D = {
        x: v.position.x - Math.cos(v.angle) * (v.width * 0.45),
        y: v.position.y - Math.sin(v.angle) * (v.width * 0.45)
      };

      if (
        pointInAABB(v.position, hazard) ||
        pointInAABB(v.wheels[0].position, hazard) ||
        pointInAABB(v.wheels[1].position, hazard) ||
        pointInAABB(frontNose, hazard) ||
        pointInAABB(rearBumper, hazard) ||
        wheel0Touch ||
        wheel1Touch
      ) {
        if (hazard.type === 'tnt' || hazard.type === 'mine') {
          hazard.destroyed = true;
          const tntCenter: Vector2D = {
            x: hazard.x + hazard.width / 2,
            y: hazard.y + hazard.height / 2
          };
          const p = particles as {
            emitTntExplosion?: (pos: Vector2D, count?: number) => void;
            emitExplosion: (pos: Vector2D, count?: number) => void;
          };
          if (typeof p.emitTntExplosion === 'function') {
            p.emitTntExplosion(tntCenter, 36);
          } else {
            p.emitExplosion(tntCenter, 36);
          }
        } else if (hazard.type === 'toxic_barrel') {
          hazard.destroyed = true;
          const barrelCenter: Vector2D = {
            x: hazard.x + hazard.width / 2,
            y: hazard.y + hazard.height / 2
          };
          const p = particles as {
            emitToxicExplosion?: (pos: Vector2D, count?: number) => void;
            emitExplosion: (pos: Vector2D, count?: number) => void;
          };
          if (typeof p.emitToxicExplosion === 'function') {
            p.emitToxicExplosion(barrelCenter, 36);
          } else {
            p.emitExplosion(barrelCenter, 36);
          }
        }
        ctx.onTriggerDeath(hazard.type === 'water' || hazard.type === 'acid' ? 'drown' : 'blast');
        return;
      }
    }
  }

  // 5. Coin collection checks
  for (const coin of coins) {
    if (!coin.collected) {
      if (vec.dist(v.position, coin) < 28 * ctx.scale) {
        coin.collected = true;
        particles.emitSparkle(coin, 10);
      }
    }
  }
}

export function computeAxleMounts(v: Vehicle, scale: number, carId: string): AxleMounts {
  const spec = getVehicleSpec(carId);
  const rearOffset = vec.rotate({ x: spec.rearAxle.x * scale, y: spec.rearAxle.y * scale }, v.angle);
  const frontOffset = vec.rotate({ x: spec.frontAxle.x * scale, y: spec.frontAxle.y * scale }, v.angle);

  return {
    rear: { mount: vec.add(v.position, rearOffset), offset: rearOffset },
    front: { mount: vec.add(v.position, frontOffset), offset: frontOffset }
  };
}

export function settleVehicleOnGround(v: Vehicle, scale: number, carId: string, terrains: TerrainBlock[]): void {
  if (!terrains || terrains.length === 0) return;
  const spec = getVehicleSpec(carId);
  const rearX = v.position.x + spec.rearAxle.x * scale;
  const frontX = v.position.x + spec.frontAxle.x * scale;

  let groundY: number | null = null;
  for (const t of terrains) {
    const minX = t.x;
    const maxX = t.x + t.width;
    const inX = (rearX >= minX && rearX <= maxX) || (frontX >= minX && frontX <= maxX) || (v.position.x >= minX && v.position.x <= maxX);
    if (inX && t.y >= v.position.y - spec.rearAxle.y * scale) {
      if (groundY === null || t.y < groundY) groundY = t.y;
    }
  }

  if (groundY !== null) {
    const restY = groundY - spec.restYOffset * scale;
    v.position.y = restY;
    v.velocity = { x: 0, y: 0 };
    v.angle = 0;
    v.angularVelocity = 0;

    const mounts = computeAxleMounts(v, scale, carId);
    v.wheels[0].position.x = mounts.rear.mount.x;
    v.wheels[0].position.y = restY + spec.rearAxle.y * scale;
    v.wheels[0].isGrounded = true;

    v.wheels[1].position.x = mounts.front.mount.x;
    v.wheels[1].position.y = restY + spec.frontAxle.y * scale;
    v.wheels[1].isGrounded = true;
  }
}

export function updateVehiclePostDeath(
  v: Vehicle,
  dt: number,
  scale: number,
  carId: string,
  particles: ParticleSystem
): void {
  v.deathTimer = (v.deathTimer || 0) + dt;
  if (v.deathType === 'drown') {
    v.velocity.x *= Math.pow(0.3, dt * 60);
    v.velocity.y = 85 * scale;
    v.position.x += v.velocity.x * dt;
    v.position.y += v.velocity.y * dt;
    v.angle += 0.35 * dt;

    const mounts = computeAxleMounts(v, scale, carId);
    v.wheels[0].position = mounts.rear.mount;
    v.wheels[1].position = mounts.front.mount;

    if (Math.random() < 0.35) particles.emitBubbles(v.position);
  }
}


