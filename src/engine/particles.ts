import type { Particle, Vector2D } from '../types/physics';

export class ParticleSystem {
  private particles: Particle[] = [];

  public emitSmoke(pos: Vector2D, baseVx = -10, baseVy = -5): void {
    const spreadX = (Math.random() - 0.5) * 8;
    const spreadY = (Math.random() - 0.5) * 6;
    const initialRadius = 6 + Math.random() * 4;

    this.particles.push({
      x: pos.x + (Math.random() - 0.5) * 4,
      y: pos.y + (Math.random() - 0.5) * 4,
      vx: baseVx + spreadX,
      vy: baseVy + spreadY,
      radius: initialRadius,
      alpha: 0.85,
      color: '#f8fafc',
      lifetime: 0,
      maxLifetime: 0.6 + Math.random() * 0.3
    });
  }

  public emitSparkle(pos: Vector2D, count = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 40 + Math.random() * 60;
      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 3,
        alpha: 1.0,
        color: '#fbbf24',
        lifetime: 0,
        maxLifetime: 0.5
      });
    }
  }

  public emitImpactSparks(pos: Vector2D, count = 10, normalX = -1): void {
    const colors = ['#fef08a', '#fde047', '#f97316', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const baseAngle = normalX < 0 ? Math.PI : 0;
      const angle = baseAngle + (Math.random() - 0.5) * 1.5;
      const speed = 50 + Math.random() * 110;
      this.particles.push({
        x: pos.x,
        y: pos.y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        radius: 2 + Math.random() * 2.5,
        alpha: 1.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        lifetime: 0,
        maxLifetime: 0.35 + Math.random() * 0.2,
        gravity: 360
      });
    }
  }

  public emitExplosion(pos: Vector2D, count = 28): void {
    // 1. Fiery explosion blast & shrapnel
    const colors = ['#fef08a', '#fde047', '#f97316', '#ef4444', '#dc2626', '#b91c1c'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 200;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 10,
        y: pos.y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 6 + Math.random() * 8,
        alpha: 1.0,
        color,
        lifetime: 0,
        maxLifetime: 0.6 + Math.random() * 0.4
      });
    }

    // 2. Thick black & grey smoke billowing outward
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 12,
        y: pos.y + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        radius: 10 + Math.random() * 10,
        alpha: 0.7,
        color: Math.random() > 0.5 ? '#334155' : '#475569',
        lifetime: 0,
        maxLifetime: 0.8 + Math.random() * 0.4
      });
    }
  }

  public emitTntExplosion(pos: Vector2D, count = 36): void {
    // 1. Fiery explosion core blast and smoke
    this.emitExplosion(pos, count);

    // 2. Flying TNT barrel shrapnel (red wooden staves, yellow hazard stripes, dark metal hoops)
    const fragmentColors = ['#dc2626', '#b91c1c', '#eab308', '#1e293b', '#f97316'];
    for (let i = 0; i < 18; i++) {
      const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
      const speed = 90 + Math.random() * 220;
      const color = fragmentColors[Math.floor(Math.random() * fragmentColors.length)];
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 16,
        y: pos.y + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 4,
        alpha: 1.0,
        color,
        lifetime: 0,
        maxLifetime: 0.7 + Math.random() * 0.4,
        gravity: 420
      });
    }

    // 3. Shockwave ring expanding outward
    this.particles.push({
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      radius: 8,
      alpha: 1.0,
      color: '#fbbf24',
      lifetime: 0,
      maxLifetime: 0.4,
      shape: 'ring',
      strokeWidth: 3
    });
  }

  public emitToxicExplosion(pos: Vector2D, count = 36): void {
    // 1. Toxic fluorescent acid burst droplets & high-velocity sludge
    const acidColors = ['#84cc16', '#a3e635', '#4ade80', '#22c55e', '#65a30d', '#facc15'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 210;
      const color = acidColors[Math.floor(Math.random() * acidColors.length)];
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 14,
        y: pos.y + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        radius: 4 + Math.random() * 5,
        alpha: 1.0,
        color,
        lifetime: 0,
        maxLifetime: 0.65 + Math.random() * 0.35,
        gravity: 360
      });
    }

    // 2. Toxic billowing vapor & radioactive chemical fumes
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 65;
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 16,
        y: pos.y + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 25,
        radius: 10 + Math.random() * 12,
        alpha: 0.75,
        color: Math.random() > 0.4 ? '#166534' : '#14532d',
        lifetime: 0,
        maxLifetime: 0.8 + Math.random() * 0.4
      });
    }

    // 3. Flying drum metal pieces (dark green barrel staves & yellow biohazard fragment)
    const drumColors = ['#15803d', '#14532d', '#0f172a', '#facc15'];
    for (let i = 0; i < 16; i++) {
      const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
      const speed = 100 + Math.random() * 200;
      const color = drumColors[Math.floor(Math.random() * drumColors.length)];
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 16,
        y: pos.y + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 4,
        alpha: 1.0,
        color,
        lifetime: 0,
        maxLifetime: 0.7 + Math.random() * 0.4,
        gravity: 420
      });
    }

    // 4. Expanding radioactive toxic shockwave ring
    this.particles.push({
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      radius: 8,
      alpha: 1.0,
      color: '#a3e635',
      lifetime: 0,
      maxLifetime: 0.45,
      shape: 'ring',
      strokeWidth: 3.5
    });
  }

  public emitWaterSplash(pos: Vector2D, count = 24): void {
    const colors = ['#ffffff', '#e0f2fe', '#7dd3fc', '#0284c7'];
    for (let i = 0; i < count; i++) {
      // Upward spraying fan
      const angle = -Math.PI * 0.15 - Math.random() * Math.PI * 0.7;
      const speed = 80 + Math.random() * 180;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 30,
        y: pos.y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 3.5,
        alpha: 0.9,
        color,
        lifetime: 0,
        maxLifetime: 0.7 + Math.random() * 0.3,
        gravity: 420
      });
    }
  }

  public emitBubbles(pos: Vector2D, count = 3): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 20,
        y: pos.y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 15,
        vy: -35 - Math.random() * 35,
        radius: 2 + Math.random() * 3,
        alpha: 0.8,
        color: Math.random() > 0.5 ? '#ffffff' : '#bae6fd',
        lifetime: 0,
        maxLifetime: 0.6 + Math.random() * 0.4
      });
    }
  }

  public emitTrail(trailType: string, pos: Vector2D, baseVx = -35, baseVy = -5): void {
    if (!trailType || trailType === 'none') return;

    if (trailType === 'smoke_puff') {
      this.emitSmoke(pos, baseVx * 0.6, baseVy);
      return;
    }

    if (trailType === 'fire_boost') {
      const colors = ['#fde047', '#f97316', '#ef4444'];
      const spreadX = (Math.random() - 0.5) * 12;
      const spreadY = (Math.random() - 0.5) * 8;
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 6,
        y: pos.y + (Math.random() - 0.5) * 4,
        vx: baseVx + spreadX,
        vy: baseVy + spreadY,
        radius: 4 + Math.random() * 4,
        alpha: 1.0,
        color: colors[Math.floor(Math.random() * colors.length)],
        lifetime: 0,
        maxLifetime: 0.35 + Math.random() * 0.2
      });
      return;
    }

    if (trailType === 'spooky_ghost') {
      const colors = ['#2dd4bf', '#14b8a6', '#5eead4'];
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 6,
        y: pos.y + (Math.random() - 0.5) * 6,
        vx: baseVx * 0.4 + (Math.random() - 0.5) * 10,
        vy: -15 - Math.random() * 20,
        radius: 4 + Math.random() * 5,
        alpha: 0.85,
        color: colors[Math.floor(Math.random() * colors.length)],
        lifetime: 0,
        maxLifetime: 0.55 + Math.random() * 0.25
      });
      return;
    }

    if (trailType === 'pink_hearts') {
      const colors = ['#f43f5e', '#ec4899', '#fb7185'];
      this.particles.push({
        x: pos.x + (Math.random() - 0.5) * 6,
        y: pos.y + (Math.random() - 0.5) * 6,
        vx: baseVx * 0.35 + (Math.random() - 0.5) * 12,
        vy: -20 - Math.random() * 25,
        radius: 5 + Math.random() * 4,
        alpha: 0.95,
        color: colors[Math.floor(Math.random() * colors.length)],
        lifetime: 0,
        maxLifetime: 0.6 + Math.random() * 0.2,
        shape: 'heart'
      });
      return;
    }

    if (trailType === 'neon_rings') {
      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: baseVx * 0.2,
        vy: baseVy * 0.2,
        radius: 3,
        alpha: 1.0,
        color: '#4ade80',
        lifetime: 0,
        maxLifetime: 0.45,
        shape: 'ring',
        strokeWidth: 2.5
      });
      return;
    }
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.lifetime += dt;

      if (p.lifetime >= p.maxLifetime) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.gravity) {
        p.vy += p.gravity * dt;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.radius += (p.shape === 'ring' ? 24 : 6) * dt;
      p.alpha = Math.max(0, 1 - p.lifetime / p.maxLifetime);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;

      if (p.shape === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.strokeWidth || 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.shape === 'heart') {
        ctx.fillStyle = p.color;
        const s = p.radius * 0.5;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.beginPath();
        ctx.moveTo(0, s * 0.4);
        ctx.bezierCurveTo(-s, -s * 0.8, -s * 1.6, s * 0.4, 0, s * 1.6);
        ctx.bezierCurveTo(s * 1.6, s * 0.4, s, -s * 0.8, 0, s * 0.4);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  public clear(): void {
    this.particles = [];
  }
}
