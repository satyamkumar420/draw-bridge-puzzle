import { useMemo, useEffect, useRef } from 'react';
import { GameCashIcon } from '../common/GameCashIcon';
import { audio } from '../../services/audioService';

export interface FlyingCashOverlayProps {
  isActive: boolean;
  rewardAmount: number;
  onCashDeparted?: (increment: number, index: number) => void;
  onCashArrived?: (increment: number, index: number) => void;
  onAllCompleted: () => void;
}

interface Particle {
  id: number;
  burstAngle: number;
  burstDist: number;
  delay: number;
  duration: number;
  rotation: number;
  scale: number;
}

function deterministicNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function getExactChunks(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  let remainder = total % count;
  const chunks: number[] = [];
  for (let i = 0; i < count; i++) {
    const val = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    chunks.push(val);
  }
  return chunks;
}

export const FlyingCashOverlay: React.FC<FlyingCashOverlayProps> = ({
  isActive,
  rewardAmount,
  onCashDeparted,
  onCashArrived,
  onAllCompleted
}) => {
  const particleCount = useMemo(
    () => Math.max(1, Math.min(rewardAmount, 12)),
    [rewardAmount]
  );

  const particles = useMemo<Particle[]>(() => {
    if (!isActive) return [];
    const list: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const delay = i * 65;
      const noise1 = deterministicNoise(i + 1);
      const noise2 = deterministicNoise(i + 10);
      const noise3 = deterministicNoise(i + 20);
      const noise4 = deterministicNoise(i + 30);
      const noise5 = deterministicNoise(i + 40);

      const burstAngle = (Math.PI * 2 * (i / particleCount)) + (noise1 * 0.4 - 0.2);
      const burstDist = 35 + noise2 * 45;
      list.push({
        id: i,
        burstAngle,
        burstDist,
        delay,
        duration: 440 + noise3 * 30,
        rotation: noise4 * 360,
        scale: 0.85 + noise5 * 0.35
      });
    }
    return list;
  }, [isActive, particleCount]);

  const exactChunks = useMemo(
    () => getExactChunks(rewardAmount, particles.length || 1),
    [rewardAmount, particles.length]
  );

  const animRef = useRef<number | null>(null);
  const particleRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const onCashDepartedRef = useRef(onCashDeparted);
  const onCashArrivedRef = useRef(onCashArrived);
  const onAllCompletedRef = useRef(onAllCompleted);

  useEffect(() => {
    onCashDepartedRef.current = onCashDeparted;
    onCashArrivedRef.current = onCashArrived;
    onAllCompletedRef.current = onAllCompleted;
  }, [onCashDeparted, onCashArrived, onAllCompleted]);

  useEffect(() => {
    if (!isActive || particles.length === 0) return;

    // Determine start coordinate (center reward element or screen center)
    const rewardEl = document.getElementById('level-complete-reward-cash');
    const badgeEl = document.getElementById('top-right-cash-badge');

    let sX = window.innerWidth / 2;
    let sY = window.innerHeight / 2;
    if (rewardEl) {
      const rect = rewardEl.getBoundingClientRect();
      sX = rect.left + rect.width / 2;
      sY = rect.top + rect.height / 2;
    }

    let tX = window.innerWidth - 60;
    let tY = 30;
    if (badgeEl) {
      const rect = badgeEl.getBoundingClientRect();
      tX = rect.left + 20;
      tY = rect.top + rect.height / 2;
    }

    const now = performance.now();
    const departedSet = new Set<number>();
    const arrivedSet = new Set<number>();
    let hasCompleted = false;

    const loop = (time: number) => {
      for (const p of particles) {
        const el = particleRefs.current.get(p.id);
        if (!el) continue;

        const startTime = now + p.delay;
        if (time < startTime) {
          el.style.opacity = '0';
          continue;
        }

        // Trigger cash departure on the exact frame the note starts flying out
        if (!departedSet.has(p.id)) {
          departedSet.add(p.id);
          const chunkValue = exactChunks[p.id] || 1;
          onCashDepartedRef.current?.(chunkValue, p.id);
        }

        const elapsed = time - startTime;
        const progress = Math.min(1, elapsed / p.duration);

        if (progress >= 1) {
          el.style.opacity = '0';
          if (!arrivedSet.has(p.id)) {
            arrivedSet.add(p.id);
            const chunkValue = exactChunks[p.id] || 1;
            onCashArrivedRef.current?.(chunkValue, p.id);
            const pitch = 1 + (p.id * 0.035);
            audio.playCashCollect(pitch);
          }
        } else {
          // Quadratic bezier interpolation
          const easeT = progress * progress * (3 - 2 * progress);
          const midX = sX + Math.cos(p.burstAngle) * p.burstDist;
          const midY = sY + Math.sin(p.burstAngle) * p.burstDist - 30;
          const x = (1 - easeT) * (1 - easeT) * sX + 2 * (1 - easeT) * easeT * midX + easeT * easeT * tX;
          const y = (1 - easeT) * (1 - easeT) * sY + 2 * (1 - easeT) * easeT * midY + easeT * easeT * tY;
          const currentScale = p.scale * (1 - easeT * 0.35);
          const currentRot = p.rotation + easeT * 180;

          el.style.opacity = '1';
          el.style.transform = `translate3d(${x - 20}px, ${y - 15}px, 0) scale(${currentScale}) rotate(${currentRot}deg)`;
        }
      }

      if (arrivedSet.size >= particles.length) {
        if (!hasCompleted) {
          hasCompleted = true;
          setTimeout(() => {
            onAllCompletedRef.current();
          }, 320);
        }
      } else {
        animRef.current = requestAnimationFrame(loop);
      }
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isActive, particles, exactChunks]);

  if (!isActive || particles.length === 0) return null;

  return (
    <div className="flying-cash-container">
      {particles.map((p) => (
        <div
          key={p.id}
          ref={(node) => {
            if (node) particleRefs.current.set(p.id, node);
            else particleRefs.current.delete(p.id);
          }}
          className="flying-cash-node"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 9999
          }}
        >
          <GameCashIcon size={36} />
        </div>
      ))}
    </div>
  );
};
