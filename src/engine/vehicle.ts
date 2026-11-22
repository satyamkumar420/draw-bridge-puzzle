import type { Vehicle, LineSegment } from '../types/physics';
import type { TerrainBlock, HazardBlock, CoinItem, GoalArea } from '../types/level';
import { vec } from './vector.ts';
import type { ParticleSystem } from './particles';
import {
  createDefaultVehicle,
  checkVehicleGameEvents,
  settleVehicleOnGround,
  computeAxleMounts,
  updateVehiclePostDeath,
  type AxleMounts
} from './vehicleFactory.ts';
import { getVehicleSpec } from '../config/vehicleSpecs.ts';
import {
  resolveVehicleChassisCollision,
  resolveWheelBridgeCollisions,
  resolveWheelTerrainCollisions
} from './vehicleCollision.ts';
import { applyVehicleDrivePropulsion } from './vehiclePropulsion.ts';
import {
  checkIsBridgePinchedAtCeiling,
  applyVehicleScreenBoundaries
} from './vehicleBoundary.ts';
import { audio } from '../services/audioService.ts';
import { GAME_CONFIG } from '../config/constants.ts';

export interface BridgePushManager {
  push: (delta: { x: number; y: number }, velocity?: { x: number; y: number }, terrains?: TerrainBlock[]) => void;
  getHasBothWallSupports: () => boolean;
  getIsSettled?: () => boolean;
  getIsSupported?: () => boolean;
}

export interface ViewportLimits {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export class VehicleSimulation {
  public vehicle: Vehicle;
  private gravity: number;
  private isDriving = false;
  private scale: number;
  private carId: string;
  private animTime = 0;

  constructor(
    spawnX: number,
    spawnY: number,
    gravity = 9.8,
    scale = 1.0,
    terrains?: TerrainBlock[],
    carId = 'smart_car'
  ) {
    this.carId = carId;
    this.gravity = gravity * 85;
    this.scale = scale;
    this.vehicle = createDefaultVehicle(spawnX, spawnY, this.scale, this.carId);
    if (terrains && terrains.length > 0) this.settleOnGround(terrains);
  }

  public settleOnGround(terrains: TerrainBlock[]): void {
    settleVehicleOnGround(this.vehicle, this.scale, this.carId, terrains);
  }

  public triggerDeath(type: 'blast' | 'drown', particles: ParticleSystem): void {
    const v = this.vehicle;
    if (v.isDead) return;
    v.isDead = true;
    v.deathType = type;
    v.deathTimer = 0;

    if (type === 'blast') {
      particles.emitExplosion(v.position);
      audio.playBlast();
    } else {
      particles.emitWaterSplash({ x: v.position.x, y: v.position.y + 10 * this.scale });
      audio.playDrown();
    }
  }

  public setDriving(driving: boolean): void {
    this.isDriving = driving;
  }

  public getIsDriving(): boolean {
    return this.isDriving;
  }

  public setCarId(carId: string, terrains?: TerrainBlock[]): void {
    this.carId = carId;
    const spec = getVehicleSpec(carId);
    const s = this.scale;
    const v = this.vehicle;
    v.width = spec.baseWidth * s;
    v.height = spec.baseHeight * s;
    v.wheels[0].radius = v.wheels[1].radius = spec.wheelRadius * s;
    v.suspension[0].localMount = { x: spec.rearAxle.x * s, y: spec.rearAxle.y * s };
    v.suspension[0].restLength = v.suspension[1].restLength = spec.wheelRadius * s;
    v.suspension[1].localMount = { x: spec.frontAxle.x * s, y: spec.frontAxle.y * s };
    const mounts = this.getAxleMounts();
    v.wheels[0].position = { ...mounts.rear.mount };
    v.wheels[1].position = { ...mounts.front.mount };
    if (terrains && terrains.length > 0 && !this.isDriving) {
      this.settleOnGround(terrains);
    }
  }

  public getCarId(): string {
    return this.carId;
  }

  public reset(
    spawnX: number,
    spawnY: number,
    gravity = 9.8,
    scale = 1.0,
    terrains?: TerrainBlock[],
    carId?: string
  ): void {
    if (carId) this.carId = carId;
    this.gravity = gravity * 85;
    this.scale = scale;
    this.animTime = 0;
    this.vehicle = createDefaultVehicle(spawnX, spawnY, this.scale, this.carId);
    this.isDriving = false;
    if (terrains && terrains.length > 0) this.settleOnGround(terrains);
  }

  public update(
    dt: number,
    terrains: TerrainBlock[],
    bridgeSegments: LineSegment[],
    hazards: HazardBlock[],
    goal: GoalArea,
    coins: CoinItem[],
    particles: ParticleSystem,
    bridgeManager?: BridgePushManager,
    viewportBounds?: ViewportLimits,
    animTime?: number
  ): void {
    this.animTime = animTime !== undefined ? animTime : (this.animTime + dt);
    const v = this.vehicle;
    if (v.hasWon) v.winTimer = (v.winTimer || 0) + dt;
    const isAtRest =
      v.hasWon &&
      !this.isDriving &&
      (v.wheels[0].isGrounded || v.wheels[1].isGrounded) &&
      Math.abs(v.velocity.x) < 2 &&
      Math.abs(v.velocity.y) < 2 &&
      Math.abs(v.angularVelocity) < 0.1;
    if (isAtRest) return;

    if (v.isDead) {
      updateVehiclePostDeath(v, dt, this.scale, this.carId, particles);
      return;
    }

    const steps = 8;
    const subDt = dt / steps;
    for (let s = 0; s < steps; s++) {
      this.step(subDt, terrains, bridgeSegments, hazards, goal, coins, particles, bridgeManager, viewportBounds);
      const isSettled =
        v.hasWon &&
        !this.isDriving &&
        (v.wheels[0].isGrounded || v.wheels[1].isGrounded) &&
        Math.abs(v.velocity.x) < 2 &&
        Math.abs(v.velocity.y) < 2 &&
        Math.abs(v.angularVelocity) < 0.1;
      if (v.isDead || isSettled) break;
    }

    const bottomLimit = viewportBounds && Number.isFinite(viewportBounds.bottom) ? viewportBounds.bottom! : 600;
    if (v.position.y > bottomLimit + 60) {
      this.triggerDeath('blast', particles);
    }
  }

  public getAxleMounts(): AxleMounts {
    return computeAxleMounts(this.vehicle, this.scale, this.carId);
  }

  private step(
    dt: number,
    terrains: TerrainBlock[],
    bridgeSegments: LineSegment[],
    hazards: HazardBlock[],
    goal: GoalArea,
    coins: CoinItem[],
    particles: ParticleSystem,
    bridgeManager?: BridgePushManager,
    viewportBounds?: ViewportLimits
  ): void {
    const v = this.vehicle;

    // 1. Integrate chassis gravity and atmospheric damping
    v.velocity.y += this.gravity * dt;
    v.velocity.x *= Math.pow(0.998, dt * 60);
    v.angularVelocity *= Math.pow(0.92, dt * 60);
    if (v.hasWon && !this.isDriving) {
      v.velocity.x *= Math.pow(0.85, dt * 60);
      if (Math.abs(v.velocity.x) < 2) {
        v.velocity.x = 0;
      }
      if (v.wheels[0].isGrounded || v.wheels[1].isGrounded) {
        v.angularVelocity *= Math.pow(0.8, dt * 60);
        if (Math.abs(v.angularVelocity) < 0.05) v.angularVelocity = 0;
      }
    }

    const mounts = this.getAxleMounts();
    const axleData = [mounts.rear, mounts.front];

    let groundedCount = 0;
    let groundNormal = { x: 0, y: -1 };
    const wheelPen = [0, 0];
    const wheelNormal = [{ x: 0, y: -1 }, { x: 0, y: -1 }];
    let hasBridgeContact = false;

    // 2. Wheel ground detection against solid terrains & bridge segments
    const suspensionRange = 1.8 * this.scale;
    const strokeThickness = (GAME_CONFIG.STROKE_WIDTH || 8) * this.scale;

    for (let i = 0; i < 2; i++) {
      const wheel = v.wheels[i];
      const { mount } = axleData[i];
      wheel.position.x = mount.x;
      wheel.position.y = mount.y;
      wheel.isGrounded = false;

      const terrainResult = resolveWheelTerrainCollisions(
        mount,
        wheel.radius,
        suspensionRange,
        terrains,
        v
      );
      const hadTerrainContact = terrainResult.hadContact;
      const maxTerrainPen = terrainResult.maxPen;
      const terrainNormal = terrainResult.normal;

      const bridgeResult = resolveWheelBridgeCollisions(
        mount,
        wheel.radius,
        suspensionRange,
        strokeThickness,
        bridgeSegments,
        v
      );
      const hadBridgeContact = bridgeResult.hadContact;
      const maxBridgePen = bridgeResult.maxPen;
      const bridgeNormal = bridgeResult.normal;

      if (hadTerrainContact || hadBridgeContact) {
        const isBridge = hadBridgeContact && maxBridgePen >= maxTerrainPen;
        const bestPen = isBridge ? maxBridgePen : maxTerrainPen;
        const bestNormal = isBridge ? bridgeNormal : terrainNormal;
        if (isBridge) hasBridgeContact = true;

        wheelPen[i] = bestPen;
        wheelNormal[i] = bestNormal;
        wheel.isGrounded = true;
        groundNormal = bestNormal;
        groundedCount++;
      }
    }

    if (groundedCount === 2) {
      groundNormal = vec.norm(vec.add(wheelNormal[0], wheelNormal[1]));
    }

    // Apply push only to loose unanchored bridge when touched by car (never push a settled bridge on a brick)
    const isSettled = bridgeManager?.getIsSettled ? bridgeManager.getIsSettled() : false;
    const isSupported = bridgeManager?.getIsSupported ? bridgeManager.getIsSupported() : bridgeManager?.getHasBothWallSupports?.();
    if (hasBridgeContact && bridgeManager && !isSettled && !isSupported) {
      bridgeManager.push(
        { x: v.velocity.x * dt, y: Math.max(0, v.velocity.y * dt) },
        { x: v.velocity.x * 0.4, y: 0 },
        terrains
      );
    }

    // Helper for elevation adjustment preventing penetration into road surface
const adjustElevation = (expectedY: number, smoothRate: number) => {
      const diffY = expectedY - v.position.y;
      if (groundedCount === 2) {
        v.position.y = expectedY;
        if (v.velocity.y > 0) v.velocity.y = 0;
      } else {
        v.position.y += diffY * (1 - Math.exp(-smoothRate * dt));
      }
    };

    // 3. Chassis suspension elevation & pitch dynamics
    const spec = getVehicleSpec(this.carId);
    if (groundedCount === 2) {
      const s0 = vec.add(axleData[0].mount, vec.scale(wheelNormal[0], wheelPen[0]));
      const s1 = vec.add(axleData[1].mount, vec.scale(wheelNormal[1], wheelPen[1]));
      const dx = s1.x - s0.x;
      const dy = s1.y - s0.y;
      const targetAngle = Math.atan2(dy, dx);
      
      v.angle += (targetAngle - v.angle) * (1 - Math.exp(-24 * dt));
      v.angularVelocity *= Math.pow(0.2, dt * 60);

      const avgSurfaceY = (s0.y + s1.y) / 2;
      const avgAxleY = ((spec.rearAxle.y + spec.frontAxle.y) / 2) * this.scale;
      adjustElevation(avgSurfaceY - avgAxleY * Math.cos(v.angle), 50);

      if (this.isDriving && Math.abs(dx) > 0.001) {
        v.velocity.y = v.velocity.x * Math.tan(targetAngle);
      } else {
        v.velocity.y = 0;
        v.angularVelocity = 0;
      }
    } else if (!v.wheels[0].isGrounded && v.wheels[1].isGrounded) {
      const s1 = vec.add(axleData[1].mount, vec.scale(wheelNormal[1], wheelPen[1]));
      const frontOffset = vec.rotate({ x: spec.frontAxle.x * this.scale, y: spec.frontAxle.y * this.scale }, v.angle);
      adjustElevation(s1.y - frontOffset.y, 60);

      const slopeAngle = Math.atan2(wheelNormal[1].x, -wheelNormal[1].y);
      v.angle += (slopeAngle - v.angle) * (1 - Math.exp(-22 * dt));
      v.angularVelocity *= Math.pow(0.5, dt * 60);
      // Do not cancel downward velocity on front-only air touch
    } else if (v.wheels[0].isGrounded && !v.wheels[1].isGrounded) {
      const s0 = vec.add(axleData[0].mount, vec.scale(wheelNormal[0], wheelPen[0]));
      const rearOffset = vec.rotate({ x: spec.rearAxle.x * this.scale, y: spec.rearAxle.y * this.scale }, v.angle);
      adjustElevation(s0.y - rearOffset.y, 60);

      const rearSlopeAngle = Math.atan2(wheelNormal[0].x, -wheelNormal[0].y);
      const targetSlope = Math.max(-0.95, Math.min(0.8, rearSlopeAngle));
      if (targetSlope < -0.05) {
        v.angle += (targetSlope - v.angle) * (1 - Math.exp(-22 * dt));
        v.angularVelocity *= Math.pow(0.5, dt * 60);
      } else {
        if (targetSlope > v.angle) v.angle += (targetSlope - v.angle) * (1 - Math.exp(-25 * dt));
        v.angularVelocity = (v.angularVelocity + 22.0 * dt) * Math.pow(0.94, dt * 60);
      }

      if (this.isDriving && Math.abs(wheelNormal[0].y) > 0.05) {
        const tangentY = wheelNormal[0].x;
        const tangentX = -wheelNormal[0].y;
        if (tangentX > 0.05 && v.velocity.x > 10 * this.scale) {
          v.velocity.y = (v.velocity.x * tangentY) / tangentX;
        }
      }
    } else {
      const flightAngle = Math.atan2(v.velocity.y, Math.max(40 * this.scale, Math.abs(v.velocity.x)));
      const targetAirAngle = Math.min(1.1, Math.max(-0.6, flightAngle));
      v.angle += (targetAirAngle - v.angle) * (1 - Math.exp(-4.0 * dt));
      v.angularVelocity = (v.angularVelocity + 8.0 * dt) * Math.pow(0.95, dt * 60);
    }

    // 4. Drive propulsion and slope resistance
    let maxUphillSlopeDeg = 0;
    for (let i = 0; i < 2; i++) {
      const norm = wheelNormal[i];
      if (norm && norm.y < 0) {
        let tangent = { x: -norm.y, y: norm.x };
        if (tangent.x < 0) tangent = vec.scale(tangent, -1);
        if (tangent.y < -0.05) {
          const deg = Math.acos(Math.max(-1, Math.min(1, -norm.y))) * (180 / Math.PI);
          if (deg > maxUphillSlopeDeg) maxUphillSlopeDeg = deg;
        }
      }
    }
    if (groundedCount === 2) {
      const s0 = vec.add(axleData[0].mount, vec.scale(wheelNormal[0], wheelPen[0]));
      const s1 = vec.add(axleData[1].mount, vec.scale(wheelNormal[1], wheelPen[1]));
      const dx = s1.x - s0.x;
      const dy = s1.y - s0.y;
      if (dx > 0 && dy < -0.05) {
        const chassisDeg = Math.atan2(-dy, dx) * (180 / Math.PI);
        if (chassisDeg > maxUphillSlopeDeg) maxUphillSlopeDeg = chassisDeg;
      }
    }

    applyVehicleDrivePropulsion({
      vehicle: v,
      isDriving: this.isDriving,
      scale: this.scale,
      gravity: this.gravity,
      dt,
      groundedCount,
      groundNormal,
      particles,
      maxSlopeDeg: maxUphillSlopeDeg
    });

    // 5. Chassis hull & bumper collision with bridge segments and terrains
    resolveVehicleChassisCollision(
      {
        vehicle: v,
        scale: this.scale,
        carId: this.carId,
        onTriggerDeath: (type) => this.triggerDeath(type, particles),
        onStopDriving: () => {
          this.isDriving = false;
        },
        onImpactCrash: () => {
          audio.playCrash();
        },
        bridgeManager
      },
      terrains,
      bridgeSegments,
      particles
    );

    // 5.5 Check if bridge is pinched against upper border ceiling ("chipka hai")
    const topLimit = viewportBounds && Number.isFinite(viewportBounds.top) ? viewportBounds.top! : 0;
    const rightLimit = viewportBounds && Number.isFinite(viewportBounds.right) ? viewportBounds.right! : 1000;
    const isBridgePinchedAtCeiling = checkIsBridgePinchedAtCeiling({
      vehicle: v,
      bridgeSegments,
      scale: this.scale,
      carId: this.carId,
      topLimit,
      hasBridgeContact,
      groundedCount
    });

    if (isBridgePinchedAtCeiling) {
      this.isDriving = false;
      if (v.velocity.x > 0) v.velocity.x = 0;
      if (v.velocity.y < 0) v.velocity.y = 0;
      v.angularVelocity *= 0.2;
    }

    // 6. Integrate chassis position and orientation
    v.position.x += v.velocity.x * dt;
    v.position.y += v.velocity.y * dt;
    v.angle += v.angularVelocity * dt;

    // Screen border boundary and ceiling containment
    applyVehicleScreenBoundaries({
      vehicle: v,
      scale: this.scale,
      carId: this.carId,
      viewportBounds,
      particles,
      hasBridgeContact,
      onStopDriving: () => {
        this.isDriving = false;
      },
      onImpactCrash: () => {
        audio.playCrash();
      }
    });

    // 7. Lock wheels to updated chassis axle mounts
    const updatedMounts = this.getAxleMounts();
    v.wheels[0].position.x = updatedMounts.rear.mount.x;
    v.wheels[0].position.y = updatedMounts.rear.mount.y;
    v.wheels[1].position.x = updatedMounts.front.mount.x;
    v.wheels[1].position.y = updatedMounts.front.mount.y;

    // Check goal, hazards, coins, and flips
    checkVehicleGameEvents(
      {
        vehicle: v,
        scale: this.scale,
        isDriving: this.isDriving,
        onStopDriving: () => {
          this.isDriving = false;
        },
        onTriggerDeath: (type) => {
          this.triggerDeath(type, particles);
        },
        onImpactCrash: () => {
          audio.playCrash();
        },
        rightBoundary: rightLimit,
        carId: this.carId,
        animTime: this.animTime
      },
      hazards,
      goal,
      coins,
      particles,
      terrains
    );
  }
}
