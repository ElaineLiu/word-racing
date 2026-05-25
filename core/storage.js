/**
 * Storage - Versioned localStorage management with migration support
 * Ensures backward compatibility when data structure changes
 */

import { sanitizeGameState } from './validators.js';

// Current storage version - increment when structure changes
const STORAGE_VERSION = 3;

// Storage keys
const KEYS = {
  STATE: 'wr_game_state',
  WRONG_WORDS: 'wr_wrong_words',
  LEADERBOARD: 'wr_leaderboard',
  VERSION: 'wr_storage_version',
};

// Default state for new players
const DEFAULT_STATE = {
  version: STORAGE_VERSION,
  fuel: 0,
  fuelCoins: 0,
  gearCoins: 0,
  nitroCharges: 0,
  upgrades: { engine: 1, tire: 1, body: 1 },
  wrongWords: [],
  leaderboard: [],
  quizMode: 'basic',
  maxLevel: 3,
  currentWordSetId: 'shanghai-zhongkao',
  // 每日进度
  daily: {
    lastActiveDate: null,
    streakDays: 0,
    todayQuizzes: 0,
    todayFuelCoins: 0,
    todayGearCoins: 0,
  },
  // 学习统计
  learning: {
    totalWordsSeen: 0,
    totalWordsMastered: 0,
    totalQuizzes: 0,
    totalQuestions: 0,
    totalCorrect: 0,
  },
};

/**
 * Storage manager with migration support
 */
export class Storage {
  /**
   * Load game state with migration
   * @returns {Object} Game state
   */
  static loadState() {
    try {
      const storedVersion = localStorage.getItem(KEYS.VERSION);
      const version = storedVersion ? parseInt(storedVersion, 10) : 0;

      let state;

      if (version === 0) {
        // No version - fresh start or legacy data
        state = Storage.migrateFromLegacy();
      } else if (version < STORAGE_VERSION) {
        // Old version - run migrations
        state = Storage.runMigrations(version);
      } else {
        // Current version - load directly
        const raw = localStorage.getItem(KEYS.STATE);
        state = raw ? JSON.parse(raw) : null;
      }

      // Validate and sanitize
      if (state) {
        return sanitizeGameState(state, DEFAULT_STATE);
      }
    } catch (e) {
      console.warn('[Storage] Failed to load state:', e);
    }

    return { ...DEFAULT_STATE };
  }

  /**
   * Save game state
   * @param {Object} state
   */
  static saveState(state) {
    try {
      const toSave = {
        ...state,
        version: STORAGE_VERSION,
      };
      localStorage.setItem(KEYS.STATE, JSON.stringify(toSave));
      localStorage.setItem(KEYS.VERSION, String(STORAGE_VERSION));
    } catch (e) {
      console.warn('[Storage] Failed to save state:', e);
    }
  }

  /**
   * Clear all stored data
   */
  static clear() {
    Object.values(KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Export all data as JSON string (for backup/debug)
   * @returns {string}
   */
  static export() {
    const data = {};
    Object.entries(KEYS).forEach(([name, key]) => {
      const value = localStorage.getItem(key);
      if (value) data[name] = JSON.parse(value);
    });
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from JSON string
   * @param {string} json
   */
  static import(json) {
    try {
      const data = JSON.parse(json);
      Object.entries(KEYS).forEach(([name, key]) => {
        if (data[name]) {
          localStorage.setItem(key, JSON.stringify(data[name]));
        }
      });
      return true;
    } catch (e) {
      console.error('[Storage] Import failed:', e);
      return false;
    }
  }

  // ==================== Migrations ====================

  /**
   * Migrate from legacy storage (before versioning)
   */
  static migrateFromLegacy() {
    console.log('[Storage] Migrating from legacy format...');

    const state = { ...DEFAULT_STATE };

    // Try to load old wrong words
    try {
      const wrongWords = localStorage.getItem(KEYS.WRONG_WORDS);
      if (wrongWords) {
        state.wrongWords = JSON.parse(wrongWords);
      }
    } catch (e) {}

    // Try to load old leaderboard
    try {
      const leaderboard = localStorage.getItem(KEYS.LEADERBOARD);
      if (leaderboard) {
        state.leaderboard = JSON.parse(leaderboard);
      }
    } catch (e) {}

    // Mark as migrated
    state.version = STORAGE_VERSION;

    // Save in new format
    Storage.saveState(state);

    return state;
  }

  /**
   * Run all migrations from old version to current
   * @param {number} fromVersion
   * @returns {Object}
   */
  static runMigrations(fromVersion) {
    console.log(`[Storage] Running migrations from v${fromVersion} to v${STORAGE_VERSION}...`);

    let state;

    try {
      const raw = localStorage.getItem(KEYS.STATE);
      state = raw ? JSON.parse(raw) : { ...DEFAULT_STATE };
    } catch (e) {
      return { ...DEFAULT_STATE };
    }

    // Run each migration in sequence
    for (let v = fromVersion; v < STORAGE_VERSION; v++) {
      const migrator = MIGRATIONS[v];
      if (migrator) {
        state = migrator(state);
      }
    }

    state.version = STORAGE_VERSION;
    Storage.saveState(state);

    return state;
  }
}

/**
 * Migration functions (indexed by "from" version)
 */
const MIGRATIONS = {
  // v0 → v1: Initial versioning, no structure change
  0: (state) => {
    return { ...state, version: 1 };
  },

  // v1 → v2: Add nitroCharges field
  1: (state) => {
    return {
      ...state,
      nitroCharges: state.nitroCharges || 0,
      version: 2,
    };
  },

  // v2 → v3: Add daily, learning, currentWordSetId fields
  2: (state) => {
    return {
      ...state,
      currentWordSetId: state.currentWordSetId || 'shanghai-zhongkao',
      daily: state.daily || {
        lastActiveDate: null,
        streakDays: 0,
        todayQuizzes: 0,
        todayFuelCoins: 0,
        todayGearCoins: 0,
      },
      learning: state.learning || {
        totalWordsSeen: 0,
        totalWordsMastered: 0,
        totalQuizzes: 0,
        totalQuestions: 0,
        totalCorrect: 0,
      },
      version: 3,
    };
  },
};

/**
 * Quick access helpers
 */
export function getStorageVersion() {
  const v = localStorage.getItem(KEYS.VERSION);
  return v ? parseInt(v, 10) : 0;
}

export function isStorageCurrent() {
  return getStorageVersion() === STORAGE_VERSION;
}
