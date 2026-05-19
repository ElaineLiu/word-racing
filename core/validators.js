/**
 * Validators - Input validation for system boundaries
 * Validates user input, API data, and config values
 */

// ============================================================================
// Type Validators
// ============================================================================

export function isNumber(value) {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isInteger(value) {
  return isNumber(value) && Number.isInteger(value);
}

export function isPositiveNumber(value) {
  return isNumber(value) && value > 0;
}

export function isNonNegativeNumber(value) {
  return isNumber(value) && value >= 0;
}

export function isString(value) {
  return typeof value === 'string';
}

export function isNonEmptyString(value) {
  return isString(value) && value.trim().length > 0;
}

export function isArray(value) {
  return Array.isArray(value);
}

export function isNonEmptyArray(value) {
  return isArray(value) && value.length > 0;
}

export function isObject(value) {
  return typeof value === 'object' && value !== null && !isArray(value);
}

export function isFunction(value) {
  return typeof value === 'function';
}

// ============================================================================
// Range Validators
// ============================================================================

export function inRange(value, min, max) {
  return isNumber(value) && value >= min && value <= max;
}

export function isPositiveInteger(value, max = Infinity) {
  return isInteger(value) && value > 0 && value <= max;
}

export function isValidLevel(value, min = 1, max = 4) {
  return isInteger(value) && value >= min && value <= max;
}

// ============================================================================
// Game-Specific Validators
// ============================================================================

/**
 * Validate lap count (1-5)
 */
export function isValidLapCount(value) {
  return isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Validate fuel value (0-100)
 */
export function isValidFuel(value) {
  return isNonNegativeNumber(value) && value <= 100;
}

/**
 * Validate coin amount (non-negative integer)
 */
export function isValidCoins(value) {
  return isInteger(value) && value >= 0;
}

/**
 * Validate upgrade levels
 */
export function isValidUpgrades(upgrades) {
  if (!isObject(upgrades)) return false;
  const { engine, tire, body } = upgrades;
  return isValidLevel(engine) && isValidLevel(tire) && isValidLevel(body);
}

/**
 * Validate quiz mode
 */
export function isValidQuizMode(mode) {
  const validModes = ['basic', 'challenge'];
  return validModes.includes(mode);
}

/**
 * Validate question mode key
 */
export function isValidQuestionMode(mode) {
  const validModes = ['PIT_BOARD', 'RADIO_MSG', 'STRATEGY', 'QUALIFYING', 'LAP_REVIEW'];
  return validModes.includes(mode);
}

/**
 * Validate game state
 */
export function isValidGameState(state) {
  const validStates = ['MENU', 'QUIZ', 'SHOP', 'COUNTDOWN', 'RACING', 'RESULTS'];
  return validStates.includes(state);
}

/**
 * Validate shop item ID
 */
export function isValidShopItemId(id) {
  if (!isString(id)) return false;
  return /^(fuel\d+|nitro\d+|(engine|tire|body)\d+|back_quiz|start_race)$/.test(id);
}

// ============================================================================
// Data Validators
// ============================================================================

/**
 * Validate word object from words.json
 */
export function isValidWord(word) {
  if (!isObject(word)) return false;
  return (
    isNonEmptyString(word.word) &&
    isNonEmptyString(word.meaning_cn) &&
    isInteger(word.id) &&
    isValidLevel(word.level, 1, 5)
  );
}

/**
 * Validate track data from tracks.json
 */
export function isValidTrack(track) {
  if (!isObject(track)) return false;
  if (!isNonEmptyString(track.id)) return false;
  if (!isNonEmptyString(track.name)) return false;
  if (!isNonEmptyArray(track.waypoints)) return false;
  if (!isNonEmptyArray(track.waypoints.every(wp =>
    isObject(wp) && isNumber(wp.x) && isNumber(wp.y)
  ))) return false;
  return true;
}

/**
 * Validate leaderboard entry
 */
export function isValidLeaderboardEntry(entry) {
  if (!isObject(entry)) return false;
  return (
    isPositiveNumber(entry.time) &&
    isPositiveInteger(entry.lapCount) &&
    isString(entry.date)
  );
}

// ============================================================================
// Validation Result
// ============================================================================

/**
 * Create a validation result object
 */
export function valid(value) {
  return { valid: true, value, error: null };
}

export function invalid(error, value = null) {
  return { valid: false, value, error };
}

/**
 * Validate and return value or default
 */
export function validateOr(value, validator, defaultValue) {
  return validator(value) ? value : defaultValue;
}

/**
 * Validate with detailed result
 */
export function validate(value, validator, errorMsg = 'Invalid value') {
  if (validator(value)) {
    return valid(value);
  }
  return invalid(errorMsg, value);
}

// ============================================================================
// Composite Validators
// ============================================================================

/**
 * Validate game state object
 */
export function validateGameStateObject(state) {
  const errors = [];

  if (!isValidFuel(state.fuel)) {
    errors.push('Invalid fuel value');
  }
  if (!isValidCoins(state.fuelCoins)) {
    errors.push('Invalid fuelCoins value');
  }
  if (!isValidCoins(state.gearCoins)) {
    errors.push('Invalid gearCoins value');
  }
  if (!isValidUpgrades(state.upgrades)) {
    errors.push('Invalid upgrades');
  }
  if (!isArray(state.wrongWords)) {
    errors.push('Invalid wrongWords');
  }
  if (!isArray(state.leaderboard)) {
    errors.push('Invalid leaderboard');
  }

  return errors.length === 0
    ? valid(state)
    : invalid(errors.join('; '), state);
}

/**
 * Sanitize game state (remove invalid fields, apply defaults)
 */
export function sanitizeGameState(state, defaults) {
  const sanitized = { ...defaults };

  if (isValidFuel(state.fuel)) sanitized.fuel = state.fuel;
  if (isValidCoins(state.fuelCoins)) sanitized.fuelCoins = state.fuelCoins;
  if (isValidCoins(state.gearCoins)) sanitized.gearCoins = state.gearCoins;
  if (isValidUpgrades(state.upgrades)) sanitized.upgrades = { ...state.upgrades };
  if (isArray(state.wrongWords)) sanitized.wrongWords = state.wrongWords.slice(0, 50);
  if (isArray(state.leaderboard)) {
    sanitized.leaderboard = state.leaderboard
      .filter(isValidLeaderboardEntry)
      .slice(0, 20);
  }

  return sanitized;
}
