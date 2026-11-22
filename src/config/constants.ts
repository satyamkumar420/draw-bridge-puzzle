export const GAME_CONFIG = {
  CANVAS_WIDTH: 1000,
  CANVAS_HEIGHT: 600,
  PHYSICS_SUBSTEPS: 8,
  TIME_STEP: 1 / 60,
  REWARD_MIN: 10,
  REWARD_MAX: 50,

  // Vehicle Parameters
  VEHICLE_SCALE: 1.22,
  CAR_WIDTH: 74,
  CAR_HEIGHT: 38,
  CAR_MASS: 4.0,
  WHEEL_RADIUS: 14,
  WHEEL_BASE: 44,       // Distance between wheels
  SUSPENSION_REST: 14,
  SUSPENSION_STIFFNESS: 420,
  SUSPENSION_DAMPING: 26,
  MOTOR_TORQUE: 800,
  MAX_FORWARD_SPEED: 330,
  ENGINE_FORCE: 480,                // Drive force along slope surface (pixel-scaled)
  TIRE_FRICTION_COEFF: 0.75,        // Rubber-on-rough traction coefficient (μ)
  MAX_CLIMB_ANGLE_DEG: 65,          // Traction limit: tires slip above this slope angle
  BRAKE_TORQUE: 400,

  // Developer Features
  ENABLE_LEVEL_EDITOR: false, // Set to true to show Level Editor button in HUD (or add ?editor=1 to URL)

  // Drawing & Bridge
  STROKE_WIDTH: 8,
  MIN_POINT_DISTANCE: 6,
  BRIDGE_FRICTION: 0.85,
  BRIDGE_RESTITUTION: 0.1,

  // Visual Colors (matching Image 1 & Reference UI)
  COLORS: {
    SKY_TOP: '#22a2f2',
    SKY_BOTTOM: '#68cbf8',
    BRICK_BASE: '#f25713',
    BRICK_BORDER: '#6e2707',
    BRICK_MORTAR: '#461407',
    ROAD_CAP: '#f4ece2',
    ROAD_CAP_SHADOW: '#d4c5b5',
    BRIDGE_LINE: '#111827',
    FLAG_POLE: '#94a3b8',
    FLAG_BANNER: '#ef4444',
    SPIKE_COLOR: '#e11d48',
    WATER_COLOR: '#0284c7',
    COIN_GOLD: '#fbbf24',
    COIN_BORDER: '#d97706',
    CAR_BODY_RED: '#dc2626',
    CAR_ACCENT: '#991b1b',
    ALLOY_RIM: '#e5e7eb',
    TIRE_RUBBER: '#1f2937',
  }
} as const;

export function isLevelEditorEnabled(): boolean {
  if (GAME_CONFIG.ENABLE_LEVEL_EDITOR) return true;
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('editor') === '1' || params.get('editor') === 'true' || params.get('dev') === '1') {
        return true;
      }
    } catch {
      // Ignore if URLSearchParams not supported
    }
  }
  return false;
}

export function getRandomRewardAmount(randomValue = Math.random()): number {
  const range = GAME_CONFIG.REWARD_MAX - GAME_CONFIG.REWARD_MIN + 1;
  return Math.floor(randomValue * range) + GAME_CONFIG.REWARD_MIN;
}
