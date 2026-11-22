import type React from 'react';
import type { HazardBlock, HazardMovement } from '../../types/level';
import { Move, ArrowLeftRight, ArrowUpDown, Zap, RefreshCw, X, Play } from 'lucide-react';

interface HazardMovementControlsProps {
  hazard: HazardBlock;
  onUpdateMovement: (movement: HazardMovement | undefined) => void;
}

export const HazardMovementControls: React.FC<HazardMovementControlsProps> = ({
  hazard,
  onUpdateMovement
}) => {
  const movement = hazard.movement;
  const isMoving = !!movement;

  const currentAxis = movement?.axis || 'horizontal';
  const currentDistance = movement?.distance ?? 80;
  const currentSpeed = movement?.speed ?? 2.5;
  const currentPhase = movement?.phase ?? 0;

  // Toggle movement on/off
  const handleToggleMoving = (enable: boolean) => {
    if (enable) {
      onUpdateMovement({
        axis: 'horizontal',
        distance: 80,
        speed: 2.5,
        phase: 0
      });
    } else {
      onUpdateMovement(undefined);
    }
  };

  const handleAxisChange = (axis: 'horizontal' | 'vertical') => {
    onUpdateMovement({
      axis,
      distance: currentDistance,
      speed: currentSpeed,
      phase: currentPhase
    });
  };

  const handleDistanceChange = (distance: number) => {
    const valid = Math.max(10, Math.min(400, Math.round(distance)));
    onUpdateMovement({
      axis: currentAxis,
      distance: valid,
      speed: currentSpeed,
      phase: currentPhase
    });
  };

  const handleSpeedChange = (speed: number) => {
    const valid = Math.max(0.2, Math.min(8.0, parseFloat(speed.toFixed(2))));
    onUpdateMovement({
      axis: currentAxis,
      distance: currentDistance,
      speed: valid,
      phase: currentPhase
    });
  };

  const handlePhaseToggle = () => {
    // Flip start direction between 0 (positive direction) and Math.PI (negative direction)
    const newPhase = Math.abs(currentPhase) < 0.1 ? Math.PI : 0;
    onUpdateMovement({
      axis: currentAxis,
      distance: currentDistance,
      speed: currentSpeed,
      phase: newPhase
    });
  };

  const applyPreset = (preset: { axis: 'horizontal' | 'vertical'; distance: number; speed: number; phase: number }) => {
    onUpdateMovement(preset);
  };

  const isReversed = Math.abs(currentPhase - Math.PI) < 0.2;

  return (
    <div className="hazard-movement-section">
      <div className="movement-section-header">
        <div className="movement-title-wrap">
          <Move size={15} className="movement-icon" />
          <span className="movement-title">Movement & Patrol</span>
        </div>
        <span className={`movement-status-badge ${isMoving ? 'active' : 'static'}`}>
          {isMoving ? (currentAxis === 'horizontal' ? '⬌ HORIZONTAL' : '⬍ VERTICAL') : 'STATIC'}
        </span>
      </div>

      {/* Movement Mode Toggle Buttons */}
      <div className="movement-mode-selector">
        <button
          type="button"
          className={`mode-btn ${!isMoving ? 'active' : ''}`}
          onClick={() => handleToggleMoving(false)}
        >
          <X size={13} />
          <span>Static Trap</span>
        </button>
        <button
          type="button"
          className={`mode-btn moving ${isMoving ? 'active' : ''}`}
          onClick={() => handleToggleMoving(true)}
        >
          <Zap size={13} />
          <span>Moving Trap</span>
        </button>
      </div>

      {isMoving && (
        <div className="movement-config-panel">
          {/* Movement Direction / Axis */}
          <div className="movement-field">
            <span className="field-label">Movement Direction</span>
            <div className="axis-btn-group">
              <button
                type="button"
                className={`axis-btn ${currentAxis === 'horizontal' ? 'active' : ''}`}
                onClick={() => handleAxisChange('horizontal')}
                title="Moves Left ↔ Right horizontally"
              >
                <ArrowLeftRight size={14} />
                <span>Horizontal (Left ↔ Right)</span>
              </button>
              <button
                type="button"
                className={`axis-btn ${currentAxis === 'vertical' ? 'active' : ''}`}
                onClick={() => handleAxisChange('vertical')}
                title="Moves Up ↕ Down vertically"
              >
                <ArrowUpDown size={14} />
                <span>Vertical (Up ↕ Down)</span>
              </button>
            </div>
          </div>

          {/* Travel Range / Distance */}
          <div className="movement-field">
            <div className="field-header-row">
              <span className="field-label">Travel Distance</span>
              <span className="field-value-pill">{currentDistance}px</span>
            </div>
            <div className="slider-row">
              <input
                type="range"
                min={20}
                max={260}
                step={5}
                value={currentDistance}
                onChange={(e) => handleDistanceChange(parseFloat(e.target.value))}
                className="movement-slider"
              />
              <input
                type="number"
                min={10}
                max={400}
                step={5}
                value={currentDistance}
                onChange={(e) => handleDistanceChange(parseFloat(e.target.value) || 20)}
                className="movement-num-input"
              />
            </div>
            <div className="quick-chips-row">
              {[40, 80, 130, 200].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`chip-btn ${currentDistance === d ? 'active' : ''}`}
                  onClick={() => handleDistanceChange(d)}
                >
                  {d}px
                </button>
              ))}
            </div>
          </div>

          {/* Movement Speed */}
          <div className="movement-field">
            <div className="field-header-row">
              <span className="field-label">Movement Speed</span>
              <span className="field-value-pill">{currentSpeed}x</span>
            </div>
            <div className="slider-row">
              <input
                type="range"
                min={0.5}
                max={6.0}
                step={0.25}
                value={currentSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="movement-slider"
              />
              <input
                type="number"
                min={0.2}
                max={8.0}
                step={0.25}
                value={currentSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value) || 1.0)}
                className="movement-num-input"
              />
            </div>
            <div className="quick-chips-row">
              {[
                { label: 'Slow (1.2x)', val: 1.2 },
                { label: 'Normal (2.5x)', val: 2.5 },
                { label: 'Fast (4.0x)', val: 4.0 }
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  className={`chip-btn ${Math.abs(currentSpeed - s.val) < 0.1 ? 'active' : ''}`}
                  onClick={() => handleSpeedChange(s.val)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Initial Direction / Flip */}
          <div className="movement-field">
            <span className="field-label">Start Direction</span>
            <button
              type="button"
              className="direction-flip-btn"
              onClick={handlePhaseToggle}
              title="Reverse starting direction of oscillation"
            >
              <RefreshCw size={13} />
              <span>
                {currentAxis === 'horizontal'
                  ? isReversed
                    ? 'Moving Left First ◀'
                    : 'Moving Right First ▶'
                  : isReversed
                  ? 'Moving Down First ▼'
                  : 'Moving Up First ▲'}
              </span>
            </button>
          </div>

          {/* Behavior Presets */}
          <div className="movement-presets-section">
            <span className="field-label">Quick Movement Presets</span>
            <div className="preset-buttons-grid">
              <button
                type="button"
                className="preset-btn"
                onClick={() => applyPreset({ axis: 'horizontal', distance: 90, speed: 2.5, phase: 0 })}
              >
                <Play size={11} />
                <span>Patrol Run</span>
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => applyPreset({ axis: 'vertical', distance: 60, speed: 3.2, phase: 0 })}
              >
                <Zap size={11} />
                <span>Crusher Piston</span>
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => applyPreset({ axis: 'horizontal', distance: 150, speed: 4.0, phase: 0 })}
              >
                <Zap size={11} />
                <span>Fast Sweep</span>
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => applyPreset({ axis: 'vertical', distance: 45, speed: 1.5, phase: 0 })}
              >
                <Move size={11} />
                <span>Slow Float</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
