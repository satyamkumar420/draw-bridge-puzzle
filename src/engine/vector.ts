import type { Vector2D } from '../types/physics';

export const vec = {
  create: (x = 0, y = 0): Vector2D => ({ x, y }),

  add: (a: Vector2D, b: Vector2D): Vector2D => ({ x: a.x + b.x, y: a.y + b.y }),

  sub: (a: Vector2D, b: Vector2D): Vector2D => ({ x: a.x - b.x, y: a.y - b.y }),

  scale: (v: Vector2D, s: number): Vector2D => ({ x: v.x * s, y: v.y * s }),

  dot: (a: Vector2D, b: Vector2D): number => a.x * b.x + a.y * b.y,

  cross: (a: Vector2D, b: Vector2D): number => a.x * b.y - a.y * b.x,

  lenSq: (v: Vector2D): number => v.x * v.x + v.y * v.y,

  len: (v: Vector2D): number => Math.sqrt(v.x * v.x + v.y * v.y),

  dist: (a: Vector2D, b: Vector2D): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  norm: (v: Vector2D): Vector2D => {
    const l = Math.sqrt(v.x * v.x + v.y * v.y);
    if (l === 0) return { x: 0, y: 0 };
    return { x: v.x / l, y: v.y / l };
  },

  perp: (v: Vector2D): Vector2D => ({ x: -v.y, y: v.x }),

  rotate: (v: Vector2D, angleRad: number): Vector2D => {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos
    };
  }
};
