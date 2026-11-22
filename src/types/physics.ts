export interface Vector2D {
  x: number;
  y: number;
}

export interface LineSegment {
  p1: Vector2D;
  p2: Vector2D;
  normal: Vector2D;
  length: number;
}

export interface Wheel {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  angle: number;
  angularVelocity: number;
  isGrounded: boolean;
  motorTorque: number;
}

export interface SuspensionPoint {
  localMount: Vector2D;   // Local offset on chassis
  wheelIndex: number;     // 0 = rear, 1 = front
  restLength: number;
  stiffness: number;
  damping: number;
}

export interface Vehicle {
  position: Vector2D;
  velocity: Vector2D;
  angle: number;          // In radians
  angularVelocity: number;
  width: number;
  height: number;
  mass: number;
  wheels: [Wheel, Wheel]; // Rear wheel, Front wheel
  suspension: [SuspensionPoint, SuspensionPoint];
  isDead: boolean;
  hasWon: boolean;
  winTimer?: number;
  deathType?: 'blast' | 'drown' | null;
  deathTimer?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  lifetime: number;
  maxLifetime: number;
  gravity?: number;
  shape?: 'circle' | 'ring' | 'heart';
  strokeWidth?: number;
}

export interface CollisionInfo {
  collided: boolean;
  penetration: number;
  normal: Vector2D;
  contactPoint: Vector2D;
}
