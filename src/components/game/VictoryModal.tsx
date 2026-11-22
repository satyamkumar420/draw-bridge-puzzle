import type React from 'react';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { LevelCompleteRibbon } from './LevelCompleteRibbon';
import { SunburstRays } from './SunburstRays';
import { CashRewardTied } from './CashRewardTied';
import { GameButton2D } from '../common/GameButton2D';
import { CashBadge } from './CashBadge';
import { FlyingCashOverlay } from './FlyingCashOverlay';
import { GameVideoAdIcon } from '../common/GameIcons';
import { youtubePlayables } from '../../services/youtubePlayables';
import { audio } from '../../services/audioService';
import { useI18n } from '../../i18n';

export interface VictoryModalProps {
  isOpen: boolean;
  levelIndex: number;
  cash: number;
  isCashPulsing?: boolean;
  rewardAmount?: number;
  onClaim: (amount: number) => void;
  onNextLevel: () => void;
  onReplay: () => void;
  onCashArriveTick: (chunk: number) => void;
  onCashCollectCompleted?: (totalReward: number) => void;
  hasNextLevel: boolean;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  levelIndex,
  cash,
  isCashPulsing = false,
  rewardAmount = 13,
  onClaim,
  onNextLevel,
  onCashArriveTick,
  onCashCollectCompleted
}) => {
  const { t } = useI18n();
  const [isBreakingRibbon, setIsBreakingRibbon] = useState(false);
  const [claimingLevel, setClaimingLevel] = useState<number | null>(null);
  const [currentReward, setCurrentReward] = useState(rewardAmount);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [hasWatchedRewardedAd, setHasWatchedRewardedAd] = useState(false);
  const [isShowingClaimAd, setIsShowingClaimAd] = useState(false);
  const isClaiming = claimingLevel === levelIndex;

  // Reset ribbon, reward and claiming state whenever modal opens or levelIndex changes
  const [prevProps, setPrevProps] = useState({ isOpen, levelIndex });
  if (prevProps.isOpen !== isOpen || prevProps.levelIndex !== levelIndex) {
    setPrevProps({ isOpen, levelIndex });
    if (isOpen) {
      setIsBreakingRibbon(false);
      setClaimingLevel(null);
      setCurrentReward(rewardAmount);
      setIsWatchingAd(false);
      setHasWatchedRewardedAd(false);
      setIsShowingClaimAd(false);
    }
  }

  // Responsive scale: scales up to 1.35x on large screens, scales down on compact/landscape screens
  const [modalScale, setModalScale] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const sX = window.innerWidth / 500;
    const sY = window.innerHeight / 460;
    return Math.min(1.35, Math.max(0.5, Math.min(sX, sY) * 0.92));
  });

  useEffect(() => {
    const updateScale = () => {
      const sX = window.innerWidth / 500;
      const sY = window.innerHeight / 460;
      const calculated = Math.min(1.35, Math.max(0.5, Math.min(sX, sY) * 0.92));
      setModalScale(calculated);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Stop vehicle engine and play celebratory victory sound
      audio.stopEngine();
      audio.playVictory();

      // Fire huge, vibrant cartoon confetti bursts from multiple angles
      try {
        confetti({
          particleCount: 80,
          spread: 90,
          origin: { y: 0.55 },
          scalar: 2.0,
          ticks: 280,
          colors: ['#38bdf8', '#fb923c', '#4ade80', '#f43f5e', '#facc15', '#a855f7']
        });
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 65,
          origin: { x: 0.05, y: 0.65 },
          scalar: 1.9,
          ticks: 280,
          colors: ['#38bdf8', '#4ade80', '#f43f5e', '#facc15']
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 65,
          origin: { x: 0.95, y: 0.65 },
          scalar: 1.9,
          ticks: 280,
          colors: ['#fb923c', '#38bdf8', '#facc15', '#a855f7']
        });
      } catch {
        // ignore if canvas-confetti is not loaded
      }
    }

    return () => {
      // Immediately stop celebratory sound and clear all confetti particles
      audio.stopVictory();
      try {
        confetti.reset();
      } catch {
        // ignore
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClaimClick = () => {
    if (isClaiming || isBreakingRibbon || isWatchingAd || isShowingClaimAd) return;
    setIsBreakingRibbon(true);
    audio.playPop();

    // Snap the cash ribbon first, then release the flying cash notes
    setTimeout(() => {
      setClaimingLevel(levelIndex);
      onClaim(currentReward);
    }, 180);
  };

  const handleClaim2XClick = async () => {
    if (isClaiming || isBreakingRibbon || isWatchingAd || isShowingClaimAd) return;
    audio.playPop();
    setIsWatchingAd(true);

    const rewarded = await youtubePlayables.requestRewardedAd('victory_2x_multiplier');
    setIsWatchingAd(false);

    if (rewarded) {
      setHasWatchedRewardedAd(true);
      const doubled = rewardAmount * 2;
      setCurrentReward(doubled);
      setIsBreakingRibbon(true);

      try {
        confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#fde047', '#f59e0b', '#38bdf8', '#4ade80']
        });
      } catch {
        // ignore
      }

      setTimeout(() => {
        setClaimingLevel(levelIndex);
        onClaim(doubled);
      }, 180);
    }
  };

  const handleCashArrive = (chunk: number) => {
    onCashArriveTick(chunk);
  };

  const handleCashCollectCompleted = async () => {
    // Notify completion now that all cash has been collected
    onCashCollectCompleted?.(currentReward);

    // If the player did not watch a rewarded ad (i.e. used regular Claim),
    // show the interstitial ad now that cash has been collected and animation finished.
    if (!hasWatchedRewardedAd) {
      setIsShowingClaimAd(true);
      try {
        await youtubePlayables.requestInterstitialAd();
      } catch (err) {
        console.warn('Failed to display claim interstitial ad', err);
      } finally {
        setIsShowingClaimAd(false);
      }
    }
    onNextLevel();
  };

  return (
    <div className="level-complete-fullscreen-overlay">
      {/* Background Soft Dark Vignette */}
      <div className="level-complete-backdrop" />

      {/* Top Right Corner Player Cash Badge (Appears ONLY on Level Complete) */}
      <div className="level-complete-top-right">
        <CashBadge cash={cash} isPulsing={isCashPulsing} />
      </div>

      {/* Main Centered Victory Modal Content with Dynamic Viewport-Fit Scale */}
      <div
        className="level-complete-scaler"
        style={{
          transform: `scale(${modalScale})`,
          transformOrigin: 'center center'
        }}
      >
        <div className="level-complete-content">
          {/* Top Level Watermark / Header */}
          <div className="level-complete-level-num">
            {t('level_n', { n: levelIndex + 1 })}
          </div>

          {/* 3D Pink / Magenta Ribbon Banner */}
          <div className="level-complete-ribbon-container">
            <LevelCompleteRibbon />
          </div>

          {/* "YOUR REWARD" Headline */}
          <div className="level-complete-reward-title">
            {t('your_reward')}
          </div>

          {/* Sunburst Rays & Center Cash Stack Reward Area */}
          <div className="level-complete-reward-stage">
            {/* Rotating Sunburst Light Beams */}
            <SunburstRays size={560} className="level-complete-sunburst" />

            {/* Reward Number and 3D Ribbon-Tied Cash Bundle */}
            <div
              className="level-complete-reward-badge"
              id="level-complete-reward-cash"
            >
              <span className="level-complete-reward-number">
                {currentReward}
              </span>
              <CashRewardTied isBreaking={isBreakingRibbon} className="level-complete-reward-tied" />
            </div>
          </div>

          {/* 2D Arcade Actions: 2X CLAIM (Rewarded Ad) + Regular CLAIM */}
          <div className="level-complete-actions">
            {/* 2X Multiplier Rewarded Video Button */}
            <GameButton2D
              variant="yellow"
              size="lg"
              className="level-complete-claim-2x-btn"
              onClick={handleClaim2XClick}
              disabled={isClaiming || isBreakingRibbon || isWatchingAd || isShowingClaimAd}
              icon={<GameVideoAdIcon size={22} />}
            >
              {t('claim_2x')}
            </GameButton2D>

            {/* Regular Claim Button */}
            <GameButton2D
              variant="green"
              size="lg"
              className="level-complete-claim-game-btn"
              onClick={handleClaimClick}
              disabled={isClaiming || isBreakingRibbon || isWatchingAd || isShowingClaimAd}
            >
              {t('claim')}
            </GameButton2D>
          </div>
        </div>
      </div>

      {/* Parabolic Flying Cash Particles Animation */}
      <FlyingCashOverlay
        isActive={isClaiming}
        rewardAmount={currentReward}
        onCashArrived={handleCashArrive}
        onAllCompleted={handleCashCollectCompleted}
      />
    </div>
  );
};
