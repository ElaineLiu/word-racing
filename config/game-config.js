/**
 * Game Configuration - All game constants in one place
 * This is the single source of truth for all tunable values.
 *
 * Phase 1.1 of Refactoring Plan
 */

// ============================================================================
// PHYSICS - Car movement and handling
// ============================================================================

export const PHYSICS = {
  // Base physics (before upgrades)
  BASE_MAX_SPEED: 4.0,           // pixels/frame - normal max speed
  BASE_ACCELERATION: 0.08,       // pixels/frame² - acceleration rate
  BASE_BRAKE_FORCE: 0.15,        // pixels/frame² - braking deceleration
  BASE_FRICTION: 0.988,          // multiplier/frame - on-track friction
  BASE_OFF_TRACK_FRICTION: 0.96, // multiplier/frame - off-track friction
  BASE_TURN_SPEED: 0.045,        // radians/frame - turning rate

  // Speed limits
  REVERSE_MAX_SPEED: -1.5,       // pixels/frame - max reverse speed
  STOP_THRESHOLD: 0.05,          // pixels/frame - speed below this = 0
  IDLE_FRICTION: 0.72,           // multiplier - when no input (quick stop)
  OFF_TRACK_EXTRA_FRICTION: 0.75, // multiplier - additional friction off-track

  // Steering
  TURN_FACTOR_DIVISOR: 1.2,      // lower = more responsive at low speeds
  TURN_MIN_SPEED: 1.0,           // minimum speed for full turn rate

  // Nitro system
  NITRO_DURATION: 180,           // frames (~3 seconds at 60fps)
  NITRO_MAX_SPEED: 8.0,          // pixels/frame - max speed with nitro
  NITRO_ACCEL: 0.2,              // pixels/frame² - nitro acceleration
  NITRO_MIN_SPEED: 0.5,          // minimum speed to activate nitro

  // Off-track rescue
  OFF_TRACK_RESCUE_THRESHOLD: 180, // frames (~3 seconds) before auto-rescue
  OFF_TRACK_MAX_DISTANCE: 30,    // pixels beyond track edge = instant rescue

  // 3D Weight Feel (for Car3D)
  WEIGHT_FACTOR: {
    accelerationRamp: 120,        // frames to reach max speed (~2s @ 60fps)
    turnResponseAtMaxSpeed: 0.6   // turning reduced to 60% at max speed
  }
};

// ============================================================================
// ECONOMY - Coins, shop
// ============================================================================

export const ECONOMY = {
  // Shop items
  SHOP_ITEMS: [
    {
      id: 'nitro1',
      label: 'Nitro x1',
      cost: 20,
      currency: 'gear',
      effect: { nitro: 1 },
      description: '1 Nitro boost',
    },
    {
      id: 'nitro3',
      label: 'Nitro x3',
      cost: 50,
      currency: 'gear',
      effect: { nitro: 3 },
      description: '3 Nitro boosts',
    },
    {
      id: 'engine1',
      label: 'Engine Lv.2',
      cost: 100,
      currency: 'gear',
      upgrade: 'engine',
      description: 'Upgrade engine (speed +10%)',
    },
    {
      id: 'tire1',
      label: 'Tire Lv.2',
      cost: 80,
      currency: 'gear',
      upgrade: 'tire',
      description: 'Upgrade tire (grip +10%)',
    },
    {
      id: 'body1',
      label: 'Body Lv.2',
      cost: 120,
      currency: 'gear',
      upgrade: 'body',
      description: 'Upgrade body (weight -5%)',
    },
  ],

  // Question mode rewards
  REWARDS: {
    PIT_BOARD: { fuel: 10, gear: 0 },
    RADIO_MSG: { fuel: 10, gear: 0 },
    STRATEGY: { fuel: 15, gear: 0 },
    QUALIFYING: { fuel: 0, gear: 15 },
    LAP_REVIEW: { fuel: 0, gear: 5 },
    COMBO_BONUS: { gear: 5 },
    COMBO_THRESHOLD: 3,           // every 3 consecutive correct
    QUIZ_SCORE_BASE: 50,          // points per correct answer
  },
};

// ============================================================================
// TRACK - Track geometry and rendering
// ============================================================================

export const TRACK = {
  // Track dimensions
  WIDTH: 90,                     // track width in pixels (default: Shanghai v2)
  SAMPLES_PER_SEGMENT: 200,      // spline interpolation samples

  // Waypoints for default circuit (Shanghai v2, 20 control points)
  // Mirrors track-registry.js shanghai-2d. Update both together.
  WAYPOINTS: [
    { x: 120, y: 120 },
    { x: 300, y: 115 },
    { x: 500, y: 110 },
    { x: 700, y: 110 },
    { x: 900, y: 115 },
    { x: 1100, y: 130 },
    { x: 1240, y: 200 },
    { x: 1300, y: 340 },
    { x: 1230, y: 480 },
    { x: 1050, y: 560 },
    { x: 780, y: 575 },
    { x: 500, y: 575 },
    { x: 280, y: 580 },
    { x: 180, y: 660 },
    { x: 280, y: 740 },
    { x: 420, y: 730 },
    { x: 560, y: 700 },
    { x: 680, y: 620 },
    { x: 780, y: 480 },
    { x: 600, y: 350 },
    { x: 350, y: 260 },
  ],

  // Kerb rendering
  KERB_ANGLE_THRESHOLD: 0.26,    // radians - angle change triggers kerbs
  KERB_WIDTH: 6,
};

// ============================================================================
// DISPLAY - Canvas and UI
// ============================================================================

export const DISPLAY = {
  // Canvas dimensions
  CANVAS_WIDTH: 1400,
  CANVAS_HEIGHT: 800,

  // Speed display
  SPEED_DISPLAY_MULTIPLIER: 50,  // speed * 50 = km/h display

  // Mini-map
  MINIMAP_WIDTH: 160,
  MINIMAP_HEIGHT: 120,
  MINIMAP_MARGIN: 10,

  // Countdown
  COUNTDOWN_FRAMES: 240,         // 4 seconds at 60fps
  COUNTDOWN_PHASES: {
    THREE: 180,                  // frames remaining
    TWO: 120,
    ONE: 60,
    GO: 0,
  },

  // Skid marks
  MAX_SKID_MARKS: 100,
  SKID_FADE_RATE: 0.003,
  SKID_MIN_SPEED: 2.5,

  // Particles (nitro flame)
  PARTICLE_MAX_LIFE: 35,
};

// ============================================================================
// QUIZ - Question system
// ============================================================================

export const QUIZ = {
  // Default quiz settings
  DEFAULT_QUESTION_COUNT: 5,
  DEFAULT_MAX_LEVEL: 3,

  // Wrong word persistence
  MAX_WRONG_WORDS: 50,
  CORRECT_STREAK_TO_REMOVE: 2,

  // Distractor scoring
  DISTRACTOR_SAME_CATEGORY_BONUS: 10,
  DISTRACTOR_SAME_LEVEL_BONUS: 5,
  DISTRACTOR_ADJACENT_LEVEL_BONUS: 2,
  DISTRACTOR_FORM_SIMILAR_WEIGHT: 3,
  DISTRACTOR_RANDOM_BONUS_MAX: 3,

  // Fill-in-blank suffixes
  BLANK_SUFFIXES: ['s', 'es', 'ed', 'ing', 'er', 'est', 'tion', 'ment', 'ly', 'ful', 'ness', 'ous', 'ive', 'al', 'ity'],
};

// ============================================================================
// GAME - Game state and limits
// ============================================================================

export const GAME = {
  // Lap limits
  MIN_LAPS: 1,
  MAX_LAPS: 5,

  // Leaderboard
  MAX_LEADERBOARD_ENTRIES: 20,

  // State names
  STATES: {
    MENU: 'MENU',
    QUIZ: 'QUIZ',
    SHOP: 'SHOP',
    COUNTDOWN: 'COUNTDOWN',
    RACING: 'RACING',
    RESULTS: 'RESULTS',
  },

  // Boundaries (匹配 DISPLAY.CANVAS_WIDTH/HEIGHT 1400×800，留 20px 边距)
  WORLD_MIN_X: 20,
  WORLD_MAX_X: 1380,
  WORLD_MIN_Y: 20,
  WORLD_MAX_Y: 780,
};

// ============================================================================
// CAR - Car visual properties
// ============================================================================

export const CAR = {
  // Dimensions
  WIDTH: 34,
  HEIGHT: 18,

  // Colors
  COLOR_BODY: '#E53935',
  COLOR_DARK: '#B71C1C',
  COLOR_COCKPIT: '#222222',
  COLOR_NUMBER: '#FFFFFF',
  COLOR_WHEEL: '#1A1A1A',
};
