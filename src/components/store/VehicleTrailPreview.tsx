import React, { useEffect, useRef } from 'react';

export interface VehicleTrailPreviewProps {
  trailId: string;
  isBike?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  maxSize: number;
  alpha: number;
  color: string;
  rotation?: number;
  vRot?: number;
  life: number;
  maxLife: number;
  type: string;
}

/**
 * Animated real-time trail effect preview rendered directly behind
 * the vehicle on the store ground stage.
 */
export const VehicleTrailPreview: React.FC<VehicleTrailPreviewProps> = ({
  trailId,
  isBike = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!trailId || trailId === 'none') {
      const cvs = canvasRef.current;
      if (cvs) {
        const ctx = cvs.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, cvs.width, cvs.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    let lastSpawnTime = performance.now();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 320;
    const height = rect.height || 140;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Emitter position at vehicle rear exhaust
    const getEmitterPos = () => {
      const centerX = width / 2;
      const centerY = height / 2;
      const xOffset = isBike ? width * 0.22 : width * 0.25;
      const yOffset = isBike ? height * 0.16 : height * 0.14;
      return {
        x: centerX - xOffset,
        y: centerY + yOffset
      };
    };

    const spawnParticles = () => {
      const pos = getEmitterPos();

      if (trailId === 'smoke_puff') {
        const colors = ['#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8'];
        particles.push({
          x: pos.x + (Math.random() - 0.5) * 4,
          y: pos.y + (Math.random() - 0.5) * 4,
          vx: -45 - Math.random() * 35,
          vy: -12 - Math.random() * 20,
          size: 6 + Math.random() * 3,
          maxSize: 22 + Math.random() * 12,
          alpha: 0.85,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0,
          maxLife: 0.8 + Math.random() * 0.3,
          type: 'smoke'
        });
      } else if (trailId === 'fire_boost') {
        const colors = ['#fde047', '#f59e0b', '#f97316', '#ef4444', '#ffffff'];
        for (let i = 0; i < 2; i++) {
          particles.push({
            x: pos.x + (Math.random() - 0.5) * 4,
            y: pos.y + (Math.random() - 0.5) * 3,
            vx: -80 - Math.random() * 60,
            vy: (Math.random() - 0.5) * 22,
            size: 5 + Math.random() * 4,
            maxSize: 16 + Math.random() * 8,
            alpha: 1.0,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 0,
            maxLife: 0.35 + Math.random() * 0.2,
            type: 'fire'
          });
        }
      } else if (trailId === 'spooky_ghost') {
        const colors = ['#5eead4', '#2dd4bf', '#14b8a6', '#0d9488'];
        const isGhost = Math.random() > 0.45;
        particles.push({
          x: pos.x + (Math.random() - 0.5) * 6,
          y: pos.y + (Math.random() - 0.5) * 4,
          vx: -35 - Math.random() * 25,
          vy: -18 - Math.random() * 25,
          size: isGhost ? 10 + Math.random() * 4 : 4 + Math.random() * 3,
          maxSize: isGhost ? 18 + Math.random() * 6 : 8 + Math.random() * 4,
          alpha: 0.9,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: (Math.random() - 0.5) * 0.4,
          vRot: (Math.random() - 0.5) * 0.05,
          life: 0,
          maxLife: 0.9 + Math.random() * 0.3,
          type: isGhost ? 'ghost' : 'spirit_orb'
        });
      } else if (trailId === 'pink_hearts') {
        const colors = ['#f43f5e', '#ec4899', '#fb7185', '#f472b6'];
        particles.push({
          x: pos.x + (Math.random() - 0.5) * 6,
          y: pos.y + (Math.random() - 0.5) * 4,
          vx: -30 - Math.random() * 25,
          vy: -22 - Math.random() * 30,
          size: 6 + Math.random() * 5,
          maxSize: 14 + Math.random() * 6,
          alpha: 1.0,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: (Math.random() - 0.5) * 0.5,
          vRot: (Math.random() - 0.5) * 0.06,
          life: 0,
          maxLife: 0.95 + Math.random() * 0.3,
          type: 'heart'
        });
      } else if (trailId === 'neon_rings') {
        particles.push({
          x: pos.x,
          y: pos.y,
          vx: -28 - Math.random() * 15,
          vy: -4 - Math.random() * 6,
          size: 4,
          maxSize: 24 + Math.random() * 6,
          alpha: 1.0,
          color: '#4ade80',
          life: 0,
          maxLife: 0.75 + Math.random() * 0.2,
          type: 'ring'
        });
      }
    };

    let prevTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - prevTime) / 1000, 0.1);
      prevTime = time;

      // Spawn rate: every 60-80ms
      const spawnInterval = trailId === 'fire_boost' ? 45 : trailId === 'neon_rings' ? 120 : 65;
      if (time - lastSpawnTime > spawnInterval) {
        spawnParticles();
        lastSpawnTime = time;
      }

      ctx.clearRect(0, 0, width, height);

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        const progress = p.life / p.maxLife;

        if (progress >= 1) {
          particles.splice(i, 1);
          continue;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.rotation !== undefined && p.vRot !== undefined) {
          p.rotation += p.vRot;
        }

        const currentSize = p.size + (p.maxSize - p.size) * Math.sin(progress * Math.PI * 0.5);
        const currentAlpha = p.alpha * (1 - progress);

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, currentAlpha));

        if (p.type === 'smoke') {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'fire') {
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize * (1 - progress * 0.4), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'ghost') {
          ctx.translate(p.x, p.y);
          if (p.rotation) ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          // Ghost Head
          ctx.beginPath();
          ctx.ellipse(0, 0, currentSize * 0.9, currentSize * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          // Eyes
          ctx.fillStyle = '#0f172a';
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(-currentSize * 0.3, -currentSize * 0.1, Math.max(1.2, currentSize * 0.18), 0, Math.PI * 2);
          ctx.arc(currentSize * 0.1, -currentSize * 0.1, Math.max(1.2, currentSize * 0.18), 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'spirit_orb') {
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === 'heart') {
          ctx.translate(p.x, p.y);
          if (p.rotation) ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          const s = currentSize * 0.9;
          ctx.beginPath();
          ctx.moveTo(0, -s * 0.2);
          ctx.bezierCurveTo(-s * 0.5, -s * 0.8, -s, -s * 0.2, 0, s * 0.7);
          ctx.bezierCurveTo(s, -s * 0.2, s * 0.5, -s * 0.8, 0, -s * 0.2);
          ctx.fill();
        } else if (p.type === 'ring') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1.8, 3.2 * (1 - progress));
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, currentSize * 0.45, currentSize, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [trailId, isBike]);

  return <canvas ref={canvasRef} className="store-trail-preview-canvas" />;
};
