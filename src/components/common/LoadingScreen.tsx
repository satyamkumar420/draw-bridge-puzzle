import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../i18n';
import { assetManager } from '../../services/assetManager.ts';

export interface LoadingScreenProps {
  onFirstFrame?: () => void;
  onComplete?: () => void;
  title?: string;
  subtitle?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onFirstFrame,
  onComplete,
  title,
  subtitle
}) => {
  const { t } = useI18n();
  const displayTitle = title || t('draw_bridge');
  const displaySubtitle = subtitle || t('loading_game');

  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const hasSignaledFirstFrame = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Signal first visual frame immediately on mount to YouTube Playables SDK
  useEffect(() => {
    if (!hasSignaledFirstFrame.current) {
      hasSignaledFirstFrame.current = true;
      onFirstFrame?.();
    }
  }, [onFirstFrame]);

  // Real Asset Preload + Smooth Responsive Progress Bar
  useEffect(() => {
    let isCancelled = false;
    let targetProgress = 10;
    let currentDisplay = 0;
    let preloadFinished = false;
    const startTime = Date.now();
    const MIN_DISPLAY_MS = 500;

    // Trigger preloading all assets (images, audio, fonts)
    assetManager
      .preloadAll((ratio) => {
        if (isCancelled) return;
        targetProgress = Math.max(targetProgress, Math.floor(ratio * 100));
      })
      .then(() => {
        if (isCancelled) return;
        preloadFinished = true;
        targetProgress = 100;
      })
      .catch(() => {
        if (isCancelled) return;
        preloadFinished = true;
        targetProgress = 100;
      });

    const interval = 25;
    const timer = setInterval(() => {
      if (isCancelled) return;

      const elapsed = Date.now() - startTime;
      const timeDrivenRatio = Math.min(85, Math.floor((elapsed / 600) * 85));
      const effectiveTarget = Math.max(targetProgress, timeDrivenRatio);

      if (currentDisplay < effectiveTarget) {
        const step = Math.max(1, Math.ceil((effectiveTarget - currentDisplay) * 0.25));
        currentDisplay = Math.min(effectiveTarget, currentDisplay + step);
        setProgress(currentDisplay);
      }

      // Complete when assets are preloaded and minimum display duration is met
      if ((preloadFinished || elapsed >= 2200) && currentDisplay >= 98 && elapsed >= MIN_DISPLAY_MS) {
        setProgress(100);
        clearInterval(timer);
        setFadeOut(true);
        setTimeout(() => {
          onCompleteRef.current?.();
        }, 220);
      }
    }, interval);

    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <>
      <style>
        {`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulseGlow {
          0%, 100% {
            filter: drop-shadow(0 0 14px rgba(255, 140, 0, 0.45));
          }
          50% {
            filter: drop-shadow(0 0 22px rgba(255, 140, 0, 0.75));
          }
        }
      `}
      </style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#0a0a1a',
          backgroundImage: 'radial-gradient(ellipse at 50% 35%, #181432 0%, #0a0a1a 80%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          overflow: 'hidden',
          userSelect: 'none',
          transition: 'opacity 0.25s ease-out',
          opacity: fadeOut ? 0 : 1,
          pointerEvents: fadeOut ? 'none' : 'auto',
          padding: '16px',
          fontFamily: 'var(--font-game, "Lilita One", "Fredoka", cursive, system-ui, sans-serif)'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            width: '100%',
            maxWidth: '380px',
            gap: '14px',
            animation: 'fadeUp 0.6s ease'
          }}
        >

          {/* Game Title */}
          <div style={{ textAlign: 'center' }}>
            <h2
              style={{
                color: '#ffffff',
                fontSize: 'clamp(22px, 6vw, 28px)',
                fontWeight: 900,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                margin: 0,
                lineHeight: 1.15,
                fontFamily: 'var(--font-game, "Lilita One", "Fredoka", cursive, system-ui, sans-serif)',
                textShadow: '0 4px 14px rgba(0, 0, 0, 0.65), 0 2px 0 #7c3aed'
              }}
            >
              {displayTitle}
            </h2>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.72)',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginTop: '4px',
                marginBottom: 0,
                fontFamily: 'var(--font-game, "Lilita One", "Fredoka", cursive, system-ui, sans-serif)'
              }}
            >
              {displaySubtitle}
            </p>
          </div>

          {/* Spinner */}
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '3.5px solid rgba(255, 255, 255, 0.15)',
              borderTopColor: '#c084fc',
              borderRadius: '50%',
              animation: 'spin 0.85s linear infinite',
              margin: '4px 0',
              flexShrink: 0,
              boxShadow: '0 0 12px rgba(192, 132, 252, 0.35)'
            }}
          />

          {/* Progress Bar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%'
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '280px',
                height: '9px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderRadius: '9999px',
                overflow: 'hidden',
                padding: '2px',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #9333ea 0%, #a855f7 50%, #38bdf8 100%)',
                  borderRadius: '9999px',
                  transition: 'width 0.15s ease-out',
                  width: `${progress}%`,
                  boxShadow: '0 0 10px rgba(168, 85, 247, 0.75)'
                }}
              />
            </div>

            <p
              style={{
                color: 'rgba(255, 255, 255, 0.72)',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '0.1em',
                marginTop: '6px',
                marginBottom: 0,
                fontFamily: 'var(--font-game, "Lilita One", "Fredoka", cursive, system-ui, sans-serif)'
              }}
            >
              {progress}%
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoadingScreen;
