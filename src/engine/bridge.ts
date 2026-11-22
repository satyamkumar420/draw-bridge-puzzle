import type { Vector2D, LineSegment } from '../types/physics';
import type { TerrainBlock } from '../types/level';
import { GAME_CONFIG } from '../config/constants.ts';
import { vec } from './vector.ts';
import {
  type BridgeRigidBody,
  resolveRigidBodyCollisions,
  validateAndSnapDrawStart,
  validateAndRouteDrawSegment,
  isPointInsideSolidTerrain,
  doesSegmentPenetrateTerrain
} from './bridgeCollision.ts';
import {
  createOrientedSegment,
  rebuildBridgeSegments,
  calculateBoundsAndCenter,
  smoothPolyline,
  isBridgeStandingUpright,
  applyBridgeTopplingTorque,
  type BridgeViewportBounds,
  calculateBridgeScreenBounds,
  evaluateBridgeSupportState
} from './bridgeUtils.ts';

export class BridgeManager {
  private center: Vector2D = { x: 0, y: 0 };
  private angle = 0;
  private currentLength = 0;
  private radius = GAME_CONFIG.STROKE_WIDTH / 2;
  private vx = 0;
  private vy = 0;
  private angularVelocity = 0;
  private mass = 1.0;
  private inertia = 1000;
  private isFalling = false;
  private isSettled = false;
  private hasBothWallSupports = false;
  private hasSinglePlatformSupport = false;
  private settledFrames = 0;
  private fallTime = 0;
  private isDrawing = false;
  private rawPoints: Vector2D[] = [];
  private localOffsets: Vector2D[] = [];
  private segments: LineSegment[] = [];
  private viewportBounds: BridgeViewportBounds = {
    left: 0,
    right: GAME_CONFIG.CANVAS_WIDTH,
    top: 0,
    bottom: GAME_CONFIG.CANVAS_HEIGHT
  };

  public setViewportBounds(bounds: BridgeViewportBounds): void {
    if (bounds.left !== undefined) this.viewportBounds.left = bounds.left;
    if (bounds.right !== undefined) this.viewportBounds.right = bounds.right;
    if (bounds.top !== undefined) this.viewportBounds.top = bounds.top;
    if (bounds.bottom !== undefined) this.viewportBounds.bottom = bounds.bottom;
  }

  public getCurrentLength(): number { return this.currentLength; }
  public getIsSettled(): boolean { return this.isSettled; }
  public getIsFalling(): boolean { return this.isFalling; }
  public getHasBothWallSupports(): boolean { return this.hasBothWallSupports; }
  public getHasSinglePlatformSupport(): boolean { return this.hasSinglePlatformSupport; }
  public getIsSupported(): boolean { return this.hasBothWallSupports || this.hasSinglePlatformSupport; }
  public getBoundsAndCenter() { return calculateBoundsAndCenter(this.rawPoints); }
  public getSegments(): LineSegment[] { return this.segments; }
  public getRawPoints(): Vector2D[] { return this.rawPoints; }
  public hasBridge(): boolean { return this.rawPoints.length >= 2 && this.currentLength >= 15; }

  public validateStartPoint(rawPoint: Vector2D, terrains: TerrainBlock[]): Vector2D | null {
    const bounds = calculateBridgeScreenBounds(this.viewportBounds, terrains);
    const clampedPoint = {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, rawPoint.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, rawPoint.y))
    };
    return validateAndSnapDrawStart(clampedPoint, terrains, this.radius);
  }

  public startDrawing(point: Vector2D, terrains?: TerrainBlock[]): boolean {
    this.clear();
    const bounds = calculateBridgeScreenBounds(this.viewportBounds, terrains);
    const clampedPoint = {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, point.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, point.y))
    };
    const validatedStart = terrains ? validateAndSnapDrawStart(clampedPoint, terrains, this.radius) : { ...clampedPoint };
    if (!validatedStart) return false;
    this.rawPoints = [{ ...validatedStart }];
    this.isDrawing = true;
    return true;
  }

  /**
   * Adds freehand points to the curve as the pointer moves.
   * Routes cleanly around corners and outer faces while preventing drawing inside solid walls.
   * Clamps points strictly within screen height and width to prevent out-of-screen drawing.
   */
  public addDrawingPoint(rawPoint: Vector2D, terrains: TerrainBlock[]): boolean {
    if (!this.isDrawing || this.rawPoints.length === 0) return false;

    const bounds = calculateBridgeScreenBounds(this.viewportBounds, terrains);
    const clampedPoint = {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, rawPoint.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, rawPoint.y))
    };

    if (this.rawPoints.length === 1 && terrains && terrains.length > 0) {
      const snapped = validateAndSnapDrawStart(this.rawPoints[0], terrains, this.radius);
      if (snapped) {
        this.rawPoints[0] = { ...snapped };
      }
    }

    const lastPt = this.rawPoints[this.rawPoints.length - 1];
    const dist = vec.dist(lastPt, clampedPoint);
    if (dist < GAME_CONFIG.MIN_POINT_DISTANCE) return false;

    const routedPoints = validateAndRouteDrawSegment(lastPt, clampedPoint, terrains, this.radius);
    if (routedPoints.length === 0) return false;

    let addedAny = false;
    for (const pt of routedPoints) {
      const clampedPt = {
        x: Math.max(bounds.minX, Math.min(bounds.maxX, pt.x)),
        y: Math.max(bounds.minY, Math.min(bounds.maxY, pt.y))
      };
      if (isPointInsideSolidTerrain(clampedPt, terrains, 0.5)) continue;
      const prev = this.rawPoints[this.rawPoints.length - 1];
      if (doesSegmentPenetrateTerrain(prev, clampedPt, terrains)) continue;
      const d = vec.dist(prev, clampedPt);
      if (d >= 2) {
        this.rawPoints.push({ ...clampedPt });
        this.currentLength += d;
        const newSeg = createOrientedSegment(prev, clampedPt);
        if (newSeg) this.segments.push(newSeg);
        addedAny = true;
      }
    }
    return addedAny;
  }

  public updateDrawing(rawEnd: Vector2D, terrains: TerrainBlock[]): void {
    this.addDrawingPoint(rawEnd, terrains);
  }

  /**
   * Freezes the drawn freehand curve into a single rigid wooden body.
   */
  public finishDrawing(terrains: TerrainBlock[]): boolean {
    if (!this.isDrawing) return false;
    this.isDrawing = false;

    if (this.rawPoints.length < 2 || this.currentLength < 15) {
      this.clear();
      return false;
    }

    // 1. Smooth the polyline while strictly preventing corner points from penetrating solid terrain
    this.rawPoints = smoothPolyline(this.rawPoints, 2, terrains);

    // 2. Calculate Center of Mass
    let totalLen = 0;
    let sumX = 0;
    let sumY = 0;

    for (let i = 0; i < this.rawPoints.length - 1; i++) {
      const p1 = this.rawPoints[i];
      const p2 = this.rawPoints[i + 1];
      const segLen = vec.dist(p1, p2);
      sumX += ((p1.x + p2.x) / 2) * segLen;
      sumY += ((p1.y + p2.y) / 2) * segLen;
      totalLen += segLen;
    }

    this.center = totalLen > 0
      ? { x: sumX / totalLen, y: sumY / totalLen }
      : { x: this.rawPoints[0].x, y: this.rawPoints[0].y };

    this.angle = 0;

    // 3. Freeze local offsets relative to center of mass
    this.localOffsets = this.rawPoints.map(p => ({
      x: p.x - this.center.x,
      y: p.y - this.center.y
    }));

    // 4. Compute Moment of Inertia of rigid polyline about center of mass
    let I = 0;
    for (let i = 0; i < this.rawPoints.length - 1; i++) {
      const p1 = this.rawPoints[i];
      const p2 = this.rawPoints[i + 1];
      const segLen = vec.dist(p1, p2);
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const d = vec.dist(mid, this.center);
      const segMass = this.mass * (segLen / Math.max(1, totalLen));
      I += segMass * ((1 / 12) * segLen * segLen + d * d + (1 / 4) * this.radius * this.radius);
    }
    this.inertia = Math.max(500, I);

    this.checkSupportState(terrains);
    return true;
  }

  public addPoint(point: Vector2D): boolean {
    if (!this.isDrawing && this.rawPoints.length === 0) {
      return this.startDrawing(point);
    }
    if (this.rawPoints.length > 0) {
      const lastPt = this.rawPoints[this.rawPoints.length - 1];
      const dist = vec.dist(lastPt, point);
      if (dist >= GAME_CONFIG.MIN_POINT_DISTANCE) {
        this.rawPoints.push({ ...point });
        this.currentLength += dist;
        this.segments = rebuildBridgeSegments(this.rawPoints);
        return true;
      }
    }
    return false;
  }

  public startFalling(terrains: TerrainBlock[] = []): void {
    if (this.rawPoints.length < 2 || this.currentLength < 15) return;

    this.vx = 0;
    this.vy = 0;
    this.angularVelocity = 0;
    this.settledFrames = 0;
    this.fallTime = 0;

    if (this.localOffsets.length !== this.rawPoints.length) {
      this.finishDrawing(terrains);
    }

    // Immediately resolve initial contact so bridge never starts inside terrain
    const body: BridgeRigidBody = {
      center: this.center,
      angle: this.angle,
      radius: this.radius,
      vx: 0,
      vy: 0,
      angularVelocity: 0,
      mass: this.mass,
      inertia: this.inertia
    };

    resolveRigidBodyCollisions(body, this.localOffsets, this.rawPoints, terrains, 4);
    this.center = body.center;
    this.angle = body.angle;
    this.segments = rebuildBridgeSegments(this.rawPoints);

    const support = evaluateBridgeSupportState(this.rawPoints, this.radius, terrains);
    this.hasBothWallSupports = support.hasBothWallSupports;
    this.hasSinglePlatformSupport = support.hasSinglePlatformSupport;

    // Settle immediately if already resting flush on platforms without jump
    if (support.isRestingFlush) {
      this.isSettled = true;
      this.isFalling = false;
      this.vx = 0;
      this.vy = 0;
      this.angularVelocity = 0;
    } else {
      this.isSettled = false;
      this.isFalling = true;
    }
  }

  public update(dt: number, terrains: TerrainBlock[]): void {
    if (this.isSettled || !this.isFalling || this.rawPoints.length < 2) return;

    this.fallTime += dt;
    const subSteps = 6;
    const subDt = dt / subSteps;
    const gravity = 820;

    const body: BridgeRigidBody = {
      center: this.center,
      angle: this.angle,
      radius: this.radius,
      vx: this.vx,
      vy: this.vy,
      angularVelocity: this.angularVelocity,
      mass: this.mass,
      inertia: this.inertia
    };

    let hadContactThisFrame = false;

    for (let s = 0; s < subSteps; s++) {
      // 1. Integrate gravity and damping
      body.vy += gravity * subDt;
      body.vx *= Math.pow(0.998, subDt * 60);
      body.vy *= Math.pow(0.999, subDt * 60);
      body.angularVelocity *= Math.pow(0.992, subDt * 60);

      // Check if standing upright on one end and apply natural gravitational toppling torque
      const uprightState = isBridgeStandingUpright(
        this.rawPoints,
        this.currentLength,
        this.hasBothWallSupports,
        terrains,
        this.radius
      );

      if (uprightState.isUpright && uprightState.bottomTouching) {
        applyBridgeTopplingTorque(body, uprightState.pBottom, uprightState.pTop, gravity, subDt, terrains);
      }

      // 2. Integrate motion
      body.center.x += body.vx * subDt;
      body.center.y += body.vy * subDt;
      body.angle += body.angularVelocity * subDt;

      // 3. Collision resolution for polyline rigid body
      const col = resolveRigidBodyCollisions(body, this.localOffsets, this.rawPoints, terrains, 4);
      if (col.hadCollision) {
        hadContactThisFrame = true;
      }
    }

    this.center = body.center;
    this.angle = body.angle;
    this.vx = body.vx;
    this.vy = this.hasBothWallSupports && body.vy < 0 ? 0 : body.vy;
    this.angularVelocity = body.angularVelocity;

    this.segments = rebuildBridgeSegments(this.rawPoints);

    // Check if settled: requires sustained contact and low velocity for 8 full frames (~0.13s)
    // Never settle while standing upright on a single tip
    const finalUpright = isBridgeStandingUpright(
      this.rawPoints,
      this.currentLength,
      this.hasBothWallSupports,
      terrains,
      this.radius
    );

    const linearSpeed = Math.hypot(this.vx, this.vy);
    const rotSpeed = Math.abs(this.angularVelocity);

    const isStationaryOnContact = hadContactThisFrame && linearSpeed < 8 && rotSpeed < 0.20 && !finalUpright.isUpright;
    const isFailsafeGrounded = this.fallTime > 1.8 && hadContactThisFrame;

    if (isStationaryOnContact || isFailsafeGrounded) {
      this.settledFrames++;
      if (this.settledFrames >= 8 || isFailsafeGrounded) {
        this.isSettled = true;
        this.isFalling = false;
        this.vx = 0;
        this.vy = 0;
        this.angularVelocity = 0;
        this.checkSupportState(terrains);
      }
    } else {
      this.settledFrames = 0;
    }

    if (this.fallTime > 2.5) {
      this.isSettled = true;
      this.isFalling = false;
    }

    if (this.center.y > 680) {
      this.clear();
    }
  }

  public push(delta: Vector2D, velocity?: Vector2D, terrains?: TerrainBlock[]): void {
    if (this.hasBothWallSupports || this.isSettled || this.rawPoints.length === 0) return;
    this.isSettled = false;
    this.isFalling = true;
    this.settledFrames = 0;
    this.fallTime = 0;
    this.hasSinglePlatformSupport = false;

    this.center.x += delta.x;
    this.center.y += delta.y;
    if (velocity) {
      this.vx = velocity.x;
      this.vy = velocity.y;
    }

    if (terrains) {
      const body: BridgeRigidBody = {
        center: this.center,
        angle: this.angle,
        radius: this.radius,
        vx: this.vx,
        vy: this.vy,
        angularVelocity: this.angularVelocity,
        mass: this.mass,
        inertia: this.inertia
      };
      resolveRigidBodyCollisions(body, this.localOffsets, this.rawPoints, terrains, 4);
      this.center = body.center;
      this.angle = body.angle;
      this.segments = rebuildBridgeSegments(this.rawPoints);
    }
  }

  public isRestingFlush(terrains: TerrainBlock[]): boolean {
    return evaluateBridgeSupportState(this.rawPoints, this.radius, terrains).isRestingFlush;
  }

  private checkSupportState(terrains: TerrainBlock[]): void {
    const support = evaluateBridgeSupportState(this.rawPoints, this.radius, terrains);
    this.hasBothWallSupports = support.hasBothWallSupports;
    this.hasSinglePlatformSupport = support.hasSinglePlatformSupport;
  }

  public rebuildSegments(): void {
    this.segments = rebuildBridgeSegments(this.rawPoints);
  }

  public clear(): void {
    this.rawPoints = [];
    this.localOffsets = [];
    this.segments = [];
    this.currentLength = 0;
    this.isFalling = false;
    this.isSettled = false;
    this.hasBothWallSupports = false;
    this.hasSinglePlatformSupport = false;
    this.isDrawing = false;
    this.vx = 0;
    this.vy = 0;
    this.angularVelocity = 0;
    this.settledFrames = 0;
    this.fallTime = 0;
  }

  public render(ctx: CanvasRenderingContext2D, scale = 1.0, color?: string): void {
    if (this.rawPoints.length === 0) return;

    ctx.save();
    const strokeColor = color || GAME_CONFIG.COLORS.BRIDGE_LINE;
    const strokeWidth = Math.max(4.5, GAME_CONFIG.STROKE_WIDTH * scale);

    // Immediate visual feedback on initial touch down (before pointer moves)
    if (this.rawPoints.length === 1) {
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.arc(this.rawPoints[0].x, this.rawPoints[0].y, strokeWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(this.rawPoints[0].x, this.rawPoints[0].y);
    for (let i = 1; i < this.rawPoints.length; i++) {
      ctx.lineTo(this.rawPoints[i].x, this.rawPoints[i].y);
    }
    ctx.stroke();

    ctx.restore();
  }
}
