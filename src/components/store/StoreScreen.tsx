import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Sparkles, Car, Check, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameCashIcon } from '../common/GameCashIcon';
import { GameVideoAdIcon } from '../common/GameIcons';
import { STORE_CARS, STORE_TRAILS } from '../../hooks/useGameStore';
import type { StoreCategory, StoreItem } from '../../types/store';
import { CarThumbnail, TrailThumbnail } from './StoreItemThumbnails';
import { SmartCarGraphic } from './SmartCarGraphic';
import { VehicleTrailPreview } from './VehicleTrailPreview';
import { youtubePlayables } from '../../services/youtubePlayables';
import { audio } from '../../services/audioService';
import { useI18n } from '../../i18n';

export interface StoreScreenProps {
  isOpen: boolean;
  onClose: () => void;
  cash: number;
  unlockedCars: string[];
  selectedCar: string;
  unlockedTrails: string[];
  selectedTrail: string;
  onSelectCar: (id: string) => void;
  onSelectTrail: (id: string) => void;
  onUnlockRandom?: (
    category: StoreCategory,
    cash: number,
    deduct: (amount: number) => void
  ) => { success: boolean; item?: StoreItem; reason?: string };
  onUnlockSpecificItem?: (
    itemId: string,
    cash: number,
    deduct: (amount: number) => void
  ) => { success: boolean; item?: StoreItem; reason?: string };
  onDeductCash: (amount: number) => void;
}

export const StoreScreen: React.FC<StoreScreenProps> = ({
  isOpen,
  onClose,
  cash,
  unlockedCars,
  selectedCar,
  unlockedTrails,
  selectedTrail,
  onSelectCar,
  onSelectTrail,
  onUnlockSpecificItem,
  onDeductCash
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<StoreCategory>('cars');
  const [previewedCarOverride, setPreviewedCarOverride] = useState<string | null>(null);
  const [previewedTrailOverride, setPreviewedTrailOverride] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  const previewedCar = previewedCarOverride ?? selectedCar;
  const previewedTrail = previewedTrailOverride ?? selectedTrail;

  // Clear any lingering confetti when store modal closes or unmounts
  useEffect(() => {
    return () => {
      try {
        confetti.reset();
      } catch {
        // ignore
      }
    };
  }, [isOpen]);

  const items = activeTab === 'cars' ? STORE_CARS : STORE_TRAILS;
  const unlockedList = activeTab === 'cars' ? unlockedCars : unlockedTrails;
  const selectedId = activeTab === 'cars' ? selectedCar : selectedTrail;
  const previewedId = activeTab === 'cars' ? previewedCar : previewedTrail;
  const activeItem = items.find((i) => i.id === previewedId) || items[0];

  const isItemUnlocked = unlockedList.includes(activeItem.id);
  const isItemEquipped = selectedId === activeItem.id;

  const getItemName = useCallback(
    (item: StoreItem) => {
      const key = item.category === 'cars' ? `car_${item.id}` : `trail_${item.id}`;
      const translated = t(key as any);
      return translated && translated !== key ? translated : item.name;
    },
    [t]
  );

  const handleTabChange = useCallback((tab: StoreCategory) => {
    audio.playPop();
    setActiveTab(tab);
    setFeedbackMsg(null);
  }, []);

  const handleItemClick = useCallback(
    (id: string) => {
      audio.playPop();
      if (activeTab === 'cars') {
        setPreviewedCarOverride(id);
        if (unlockedCars.includes(id)) {
          onSelectCar(id);
        }
      } else {
        setPreviewedTrailOverride(id);
        if (unlockedTrails.includes(id)) {
          onSelectTrail(id);
        }
      }
    },
    [activeTab, unlockedCars, unlockedTrails, onSelectCar, onSelectTrail]
  );

  const handleActionButtonClick = useCallback(() => {
    if (!isItemUnlocked) {
      if (onUnlockSpecificItem) {
        const res = onUnlockSpecificItem(activeItem.id, cash, onDeductCash);
        if (res.success && res.item) {
          audio.playBuy();
          try {
            confetti({
              particleCount: 50,
              spread: 70,
              origin: { y: 0.7 }
            });
          } catch {
            // ignore
          }
          if (activeTab === 'cars') {
            onSelectCar(activeItem.id);
            setPreviewedCarOverride(activeItem.id);
          } else {
            onSelectTrail(activeItem.id);
            setPreviewedTrailOverride(activeItem.id);
          }
          const name = getItemName(res.item);
          setFeedbackMsg(t('unlocked_msg', { name }));
          setTimeout(() => setFeedbackMsg(null), 2500);
        } else if (res.reason === 'insufficient_funds') {
          audio.playPop();
          setIsShaking(true);
          setFeedbackMsg(t('need_cash_msg', { amount: activeItem.price }));
          setTimeout(() => {
            setIsShaking(false);
            setFeedbackMsg(null);
          }, 1500);
        }
      }
    } else if (!isItemEquipped) {
      audio.playPop();
      if (activeTab === 'cars') {
        onSelectCar(activeItem.id);
      } else {
        onSelectTrail(activeItem.id);
      }
    }
  }, [
    isItemUnlocked,
    isItemEquipped,
    onUnlockSpecificItem,
    activeItem,
    cash,
    onDeductCash,
    activeTab,
    onSelectCar,
    onSelectTrail,
    getItemName,
    t
  ]);

  const handleFreeCashClick = useCallback(async () => {
    if (isWatchingAd) return;
    audio.playPop();
    setIsWatchingAd(true);

    const rewarded = await youtubePlayables.requestRewardedAd('store_free_cash');
    setIsWatchingAd(false);

    if (rewarded) {
      audio.playCashCollect();
      const bonus = 50;
      onDeductCash(bonus); // addCash(50)
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.25 }
        });
      } catch {
        // ignore
      }
      setFeedbackMsg(t('free_cash_rewarded', { amount: bonus }));
      setTimeout(() => setFeedbackMsg(null), 2500);
    }
  }, [isWatchingAd, onDeductCash, t]);

  if (!isOpen) return null;

  return (
    <div className="store-fullscreen-view">
      {/* 1. Header Bar: Back Button (Green), Connected Tabs, Compact Cash */}
      <div className="store-header-bar">
        {/* Left: Green Back Button */}
        <button
          type="button"
          onClick={() => {
            audio.playPop();
            onClose();
          }}
          className="store-back-btn"
          title={t('back_to_game')}
        >
          <ArrowLeft strokeWidth={3.4} color="#ffffff" className="store-back-icon" />
        </button>

        {/* Center: Connected Segmented Tabs with Increased Width (Dead Centered) */}
        <div className="store-tabs-wrapper">
          <div className="store-segmented-pill">
            <button
              type="button"
              className={`store-tab-btn tab-left ${activeTab === 'cars' ? 'active' : ''}`}
              onClick={() => handleTabChange('cars')}
              title={t('cars')}
            >
              <Car strokeWidth={2.8} className="store-tab-icon" />
            </button>
            <button
              type="button"
              className={`store-tab-btn tab-right ${activeTab === 'trails' ? 'active' : ''}`}
              onClick={() => handleTabChange('trails')}
              title={t('trails')}
            >
              <Sparkles strokeWidth={2.8} className="store-tab-icon" />
            </button>
          </div>
        </div>

        {/* Right: Cash Badge + Free Cash Rewarded Button */}
        <div className="store-cash-container">
          <button
            type="button"
            onClick={handleFreeCashClick}
            disabled={isWatchingAd}
            className="store-free-cash-btn"
            title={t('free_cash_ad', { amount: 50 })}
          >
            <GameVideoAdIcon strokeWidth={2.4} color="#ffffff" className="store-free-cash-ad-icon" />
            <span className="store-free-cash-text">+50</span>
            <GameCashIcon className="store-free-cash-icon" />
          </button>

          <div className="store-compact-cash" title={t('your_cash')}>
            <GameCashIcon className="store-compact-cash-icon" />
            <span className="store-compact-cash-value">{cash}</span>
          </div>
        </div>
      </div>

      {/* 2. Middle: 6-Slot Grid (2 rows x 3 cols) */}
      <div className="store-grid-container">
        <div className="store-grid">
          {items.map((item) => {
            const isUnlocked = unlockedList.includes(item.id);
            const isSelected = selectedId === item.id;
            const isPreviewed = previewedId === item.id;

            return (
              <div
                key={item.id}
                className={`store-card ${isPreviewed ? 'preview-active' : ''} ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`}
                onClick={() => handleItemClick(item.id)}
              >
                {/* Status Badges */}
                {isSelected && (
                  <div className="store-badge-check">
                    <Check strokeWidth={4.2} color="#ffffff" className="store-badge-icon" />
                  </div>
                )}
                {!isUnlocked && (
                  <div className="store-badge-lock">
                    <Lock strokeWidth={3.8} color="#ffffff" className="store-badge-icon" />
                  </div>
                )}

                {/* Card Thumbnail */}
                <div className="store-card-content">
                  {item.category === 'cars' ? (
                    <CarThumbnail itemId={item.id} isUnlocked={isUnlocked} />
                  ) : (
                    <TrailThumbnail itemId={item.id} isUnlocked={isUnlocked} />
                  )}
                </div>

                {/* Price Tag for Locked Paid Items */}
                {!isUnlocked && item.price > 0 && (
                  <div className="store-card-price-tag">
                    <GameCashIcon className="store-card-price-icon" />
                    <span>{item.price.toLocaleString()}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Vertical Scrollbar Accent: only shown if items exceed 6 */}
        {items.length > 6 && (
          <div className="store-scroll-track">
            <div className="store-scroll-thumb" />
          </div>
        )}
      </div>

      {/* 3. Lower Section: Horizon Wave, Car Preview & 2D Enhanced Action Button */}
      <div className="store-ground-section">
        {/* Organic Wave Horizon dividing sky & ground */}
        <svg
          className="store-wave-divider"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
        >
          <path
            d="M 0 45 Q 360 20 620 50 T 1100 35 Q 1280 20 1440 40 L 1440 100 L 0 100 Z"
            fill="#f59e0b"
          />
        </svg>

        <div className="store-ground-content">
          {/* Car Preview Resting on Ground with real-time Trail effect preview */}
          <div className="store-car-preview-stage">
            <VehicleTrailPreview
              trailId={previewedTrail}
              isBike={previewedCar === 'dirt_bike' || previewedCar === 'super_bike'}
            />
            <SmartCarGraphic carId={previewedCar} className="preview-smart-car" />
            {/* Ground Shadow */}
            <div className="store-car-ground-shadow" />
          </div>

          {/* 2D Arcade Enhanced Action Button & Feedback Notification */}
          <div className="store-unlock-wrapper">
            {feedbackMsg && (
              <div className="store-feedback-bubble">{feedbackMsg}</div>
            )}

            <button
              type="button"
              className={`store-action-btn-2d ${isShaking ? 'shake-anim' : ''} ${
                isItemEquipped ? 'btn-2d-equipped' : !isItemUnlocked ? 'btn-2d-buy' : 'btn-2d-select'
              }`}
              onClick={handleActionButtonClick}
              disabled={isItemEquipped}
            >
              <div className="btn-2d-outer-bezel">
                {!isItemUnlocked ? (
                  /* Locked state: Price on left + Unlock action on right */
                  <div className="btn-2d-split-face">
                    <div className="btn-2d-price-section">
                      <span className="btn-2d-price-text">{activeItem.price.toLocaleString()}</span>
                      <GameCashIcon size={24} className="btn-2d-cash-icon" />
                    </div>
                    <div className="btn-2d-action-section">
                      <span className="btn-2d-label-text">{t('unlock')}</span>
                    </div>
                  </div>
                ) : isItemEquipped ? (
                  /* Equipped state: Selected badge */
                  <div className="btn-2d-single-face face-equipped">
                    <Check size={22} strokeWidth={4} className="btn-2d-check-icon" />
                    <span className="btn-2d-label-text">{t('equipped')}</span>
                  </div>
                ) : (
                  /* Unlocked but unequipped state: Select button */
                  <div className="btn-2d-single-face face-select">
                    <span className="btn-2d-label-text">{t('select')}</span>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
