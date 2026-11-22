import type { Vehicle, LineSegment } from '../types/physics';
import type { ParticleSystem } from './particles';
import { getVehicleCollisionSpec } from './vehicleCollision.ts';
import { GAME_CONFIG } from '../config/constants.ts';

export interface CeilingClearanceCheckParams {
  vehicle: Vehicle;
  bridgeSegments: LineSegment[];
  scale: number;
  carId: string;
  topLimit: number;
  hasBridgeContact: boolean;
  groundedCount: number;
}

/**
 * Checks whether the draw bridge ahead or under the vehicle is pinched against
 * the screen top border (ceiling), preventing the vehicle from squeezing through
 * without sinking under or penetrating the bridge.
 */
export function checkIsBridgePinchedAtCeiling(params: CeilingClearanceCheckParams): boolean {
  const { vehicle: v, scale, carId, topLimit, hasBridgeContact, groundedCount } = params;
  if (!hasBridgeContact && groundedCount === 0) return false;

  const colSpec = getVehicleCollisionSpec(carId);
  const cosA = Math.cos(v.angle);
  const sinA = Math.sin(v.angle);
  let minVehicleY = v.position.y - colSpec.topExtent * scale;

  for (const probe of colSpec.probes) {
    const worldY = v.position.y + (probe.offset.x * sinA + probe.offset.y * cosA) * scale - probe.radius * scale;
    if (worldY < minVehicleY) minVehicleY = worldY;
  }

  // Stop vehicle right as it touches / meets the screen top border ("border se sata")
  if (minVehicleY <= topLimit + 2.0 * scale) {
    return true;
  }

  return false;
}

export interface ScreenBoundaryContext {
  vehicle: Vehicle;
  scale: number;
  carId: string;
  viewportBounds?: { left?: number; right?: number; top?: number; bottom?: number };
  particles: ParticleSystem;
  hasBridgeContact: boolean;
  onStopDriving: () => void;
  onImpactCrash?: () => void;
}

/**
 * Applies horizontal screen boundary containment and ceiling containment.
 * Stops vehicle before escaping top/sides, preserving grounded road elevation.
 */
export function applyVehicleScreenBoundaries(ctx: ScreenBoundaryContext): void {
  const { vehicle: v, scale, carId, viewportBounds, particles, hasBridgeContact, onStopDriving } = ctx;
  const colSpec = getVehicleCollisionSpec(carId);
  const frontExtent = colSpec.frontExtent * scale;
  const rearExtent = colSpec.rearExtent * scale;
  const rightLimit = viewportBounds && Number.isFinite(viewportBounds.right) ? viewportBounds.right! : 1000;
  const leftLimit = viewportBounds && Number.isFinite(viewportBounds.left) ? viewportBounds.left! : 0;
  const maxScreenX = rightLimit - frontExtent;
  const minScreenX = leftLimit + rearExtent;

  if (v.position.x >= maxScreenX) {
    const isMovingForward = v.velocity.x > 0;
    v.position.x = maxScreenX;
    if (isMovingForward) {
      ctx.onImpactCrash?.();
    }
    v.velocity.x = 0;
    v.angularVelocity *= 0.2;
    onStopDriving();
    if (v.hasWon) {
      const contactPoint = { x: maxScreenX + frontExtent, y: v.position.y };
      particles.emitSmoke(contactPoint, -15, -8);
    }
  } else if (v.position.x <= minScreenX) {
    v.position.x = minScreenX;
    if (v.velocity.x < 0) v.velocity.x = 0;
  }

  const halfHeight = (GAME_CONFIG.CAR_HEIGHT * scale) / 2;
  const topLimit = viewportBounds && Number.isFinite(viewportBounds.top) ? viewportBounds.top! : 0;
  const minScreenY = topLimit + halfHeight;

  if (v.position.y <= minScreenY) {
    if (hasBridgeContact && v.velocity.y < 0) {
      v.velocity.y = 0;
    } else if (!hasBridgeContact) {
      v.position.y = minScreenY;
      if (v.velocity.y < 0) v.velocity.y = 0;
    }
    v.angularVelocity *= 0.5;
  }
}
