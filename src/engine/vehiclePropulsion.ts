import type { Vehicle, Vector2D } from '../types/physics';
import { vec } from './vector.ts';
import type { ParticleSystem } from './particles';

export const MAX_CLIMB_ANGLE_DEG = 65.0;

export interface VehiclePropulsionContext {
  vehicle: Vehicle;
  isDriving: boolean;
  scale: number;
  gravity: number;
  dt: number;
  groundedCount: number;
  groundNormal: Vector2D;
  particles: ParticleSystem;
  maxSlopeDeg?: number;
}

export function applyVehicleDrivePropulsion(ctx: VehiclePropulsionContext): void {
  const { vehicle: v, isDriving, scale, gravity, dt, groundedCount, groundNormal, particles, maxSlopeDeg } = ctx;

  if (isDriving && groundedCount > 0) {
    const upwardness = -groundNormal.y;
    const speed = Math.hypot(v.velocity.x, v.velocity.y);
    const isStuck = !v.hasWon && Math.abs(v.velocity.x) < 35 * scale;

    if (upwardness > 0.05) {
      // Road surface tangent pointing rightward
      let tangent = { x: -groundNormal.y, y: groundNormal.x };
      if (tangent.x < 0) tangent = vec.scale(tangent, -1);

      // Slope angle from ground normal (θ = angle between normal and vertical)
      const slopeAngle = Math.acos(Math.max(-1, Math.min(1, upwardness)));
      const baseSlopeDeg = slopeAngle * (180 / Math.PI);
      const slopeDeg = maxSlopeDeg !== undefined ? Math.max(baseSlopeDeg, maxSlopeDeg) : baseSlopeDeg;
      const sinSlope = Math.sin(slopeAngle);
      const cosSlope = Math.cos(slopeAngle);

      const targetSpeed = 330 * scale;
      const frictionCoeff = 1.75;

      // Gravity component along slope:
      // tangent.y > 0 means downhill (gravity accelerates forward down the slope)
      // tangent.y < 0 means uphill (gravity opposes climbing)
      const isDownhill = tangent.y > 0.05;
      const gravityAlongSlope = gravity * sinSlope;

      // Maximum climb limit: uphill slopes steeper than 65° cannot be climbed
      const isTooSteep = !isDownhill && slopeDeg > MAX_CLIMB_ANGLE_DEG;
      const isTiresSlipping = isTooSteep;

      // Traction limit: maximum force tires can transmit before slipping
      const lowSpeedBoost = (!v.hasWon && speed < 100 * scale) ? 1.4 : 1.0;
      const minTractionFloor = 1600 * scale;
      const maxTraction = Math.max(minTractionFloor, frictionCoeff * gravity * cosSlope * lowSpeedBoost);

      const rawEngineForce = 1800 * scale * lowSpeedBoost;

      // Engine efficiency: full power for slopes up to 50°, smoothly tapering to 0.70 at 65°, and 0 above 65°
      let engineEfficiency = 0;
      if (!isTooSteep) {
        if (slopeDeg <= 50) {
          engineEfficiency = 1.0;
        } else {
          engineEfficiency = 1.0 - 0.30 * ((slopeDeg - 50) / 15);
        }
      }

      // Clamp engine force to traction limit (strictly 0 when slope > 65°)
      const engineForce = isTooSteep
        ? 0
        : Math.min(rawEngineForce * engineEfficiency, maxTraction);

      // Net acceleration:
      // Downhill: engine + gravity assist
      // Too steep uphill (> 65°): strong downhill gravity opposes climbing
      // Normal uphill (<= 65°): engine overcomes gravity
      const netAcc = isDownhill
        ? engineForce + gravityAlongSlope * 0.85
        : isTooSteep
          ? -gravityAlongSlope * 1.5
          : engineForce - gravityAlongSlope * 0.65;

      if (netAcc > 0 && v.velocity.x < targetSpeed) {
        // Engine overpowers gravity: car accelerates uphill or downhill
        v.velocity.x += tangent.x * netAcc * dt;
        v.velocity.y += tangent.y * netAcc * dt;
      } else if (netAcc <= 0) {
        // Decelerate along tangent
        v.velocity.x += tangent.x * netAcc * dt;
        v.velocity.y += tangent.y * netAcc * dt;

        if (isTooSteep) {
          // On slopes > 65°, tires completely slip and gravity pulls the car down the slope
          const maxSlide = 90 * scale;
          if (v.velocity.x < -maxSlide) {
            v.velocity.x = -maxSlide;
          }
        } else {
          // Anti-rollback / Hill-hold: on climbable slopes (<= 65°), prevent sliding backwards
          if (v.velocity.x < 0) {
            v.velocity.x = 0;
            v.velocity.y = 0;
          }
        }
      }

      // Hill-hold: active on climbable slopes
      if (!isTooSteep && v.velocity.x < 0) {
        v.velocity.x *= 0.5;
        if (Math.abs(v.velocity.x) < 2 * scale) v.velocity.x = 0;
      }

      // Wheel rotation: spin when driving or slipping
      const isSlipping = isTiresSlipping || engineEfficiency < 0.1 || isStuck;
      const spinSpeed = isSlipping ? 350 * scale : Math.max(speed, 180 * scale);
      for (const wheel of v.wheels) {
        wheel.angle += (spinSpeed / wheel.radius) * dt;
      }

      // Emit tire friction smoke when stuck or slipping
      if (isSlipping && (isTooSteep || Math.random() < 0.25)) {
        const rearWheel = v.wheels[0];
        particles.emitTrail('smoke', { x: rearWheel.position.x, y: rearWheel.position.y + 4 * scale });
      }
    } else {
      // Near-vertical wall barrier: wheels spin and apply forward pressure smoothly
      for (const wheel of v.wheels) {
        wheel.angle += (290 * scale / wheel.radius) * dt;
      }
      if (Math.random() < 0.25) {
        const rearWheel = v.wheels[0];
        particles.emitTrail('smoke', { x: rearWheel.position.x, y: rearWheel.position.y + 4 * scale });
      }
    }
  }
}
