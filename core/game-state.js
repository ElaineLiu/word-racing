/**
 * GameState - Single source of truth for game data
 * Manages persistence and emits changes via EventBus
 */

import { EventBus, Events } from './event-bus.js';

// Default state structure
const DEFAULT_STATE = {
  // Resources
  fuel: 100,
  fuelCoins: 0,
  gearCoins: 0,
  nitroCharges: 0,

  // Upgrades
  upgrades: {
    engine: 1,
    tire: 1,
    body: 1,
  },

  // Quiz state
  quizMode: 'basic',
  wrongWords: [],

  // Leaderboard
  leaderboard: [],

  // Settings
  maxLevel: 3,
  currentWordSetId: 'shanghai-zhongkao',

  // Daily progress
  daily: {
    lastActiveDate: null,
    streakDays: 0,
    todayQuizzes: 0,
    todayFuelCoins: 0,
    todayGearCoins: 0,
  },

  // Learning statistics
  learning: {
    totalWordsSeen: 0,
    totalWordsMastered: 0,
    totalQuizzes: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    lastPerfectQuiz: false,  // 上次是否全对
  },

  // Achievement system
  achievements: [],           // 已解锁的成就ID列表
  unlockedTracks: ['shanghai-2d'],  // 已解锁的赛道ID列表
  selectedTrackId: 'shanghai-2d',   // 当前选择的赛道ID

  // Meta
  version: 3,
};

// Storage key
const STORAGE_KEY = 'wr_game_state';

export class GameState {
  #state;
  #eventBus;

  constructor(eventBus) {
    if (!(eventBus instanceof EventBus)) {
      throw new Error('GameState requires EventBus instance');
    }
    this.#eventBus = eventBus;
    this.#state = this.#deepClone(DEFAULT_STATE);
    this.#load();
  }

  // ==================== Public API ====================

  /**
   * Get a value by dot-notation path
   * @param {string} path - e.g., 'fuel' or 'upgrades.engine'
   * @returns {*} value
   */
  get(path) {
    const keys = path.split('.');
    let value = this.#state;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }

  /**
   * Set a value by dot-notation path
   * @param {string} path - e.g., 'fuel' or 'upgrades.engine'
   * @param {*} value
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.#state;
    for (const key of keys) {
      target = target[key];
    }
    target[lastKey] = value;
    this.#save();
    this.#emitChange(path, value);
  }

  /**
   * Modify a numeric value (add/subtract)
   * @param {string} path - e.g., 'fuel'
   * @param {number} delta - amount to add (negative to subtract)
   * @returns {number} new value
   */
  modify(path, delta) {
    const current = this.get(path) || 0;
    const newValue = current + delta;
    this.set(path, newValue);
    return newValue;
  }

  /**
   * Get entire state (for debugging/serialization)
   * @returns {Object}
   */
  getAll() {
    return this.#deepClone(this.#state);
  }

  /**
   * Replace entire state (for loading saves)
   * @param {Object} newState
   */
  replace(newState) {
    this.#state = { ...this.#deepClone(DEFAULT_STATE), ...this.#deepClone(newState) };
    this.#save();
    this.#eventBus.emit(Events.STATE_CHANGED, this.#state);
  }

  /**
   * Reset to defaults
   */
  reset() {
    this.#state = this.#deepClone(DEFAULT_STATE);
    this.#save();
    this.#eventBus.emit(Events.STATE_CHANGED, this.#state);
  }

  /**
   * Serialize to JSON string
   * @returns {string}
   */
  serialize() {
    return JSON.stringify(this.#state);
  }

  /**
   * Deserialize from JSON string
   * @param {string} data
   */
  deserialize(data) {
    try {
      const parsed = JSON.parse(data);
      this.replace(parsed);
    } catch (e) {
      console.warn('Failed to deserialize game state:', e);
    }
  }

  // ==================== Convenience Methods ====================

  /**
   * Add to fuel coins
   * @param {number} amount
   */
  addFuelCoins(amount) {
    this.modify('fuelCoins', amount);
    this.#eventBus.emit(Events.COINS_CHANGED, {
      type: 'fuel',
      value: this.get('fuelCoins'),
    });
  }

  /**
   * Add to gear coins
   * @param {number} amount
   */
  addGearCoins(amount) {
    this.modify('gearCoins', amount);
    this.#eventBus.emit(Events.COINS_CHANGED, {
      type: 'gear',
      value: this.get('gearCoins'),
    });
  }

  /**
   * Set fuel level
   * @param {number} value
   */
  setFuel(value) {
    this.set('fuel', value);
    this.#eventBus.emit(Events.FUEL_CHANGED, { value });
  }

  /**
   * Set nitro charges
   * @param {number} value
   */
  setNitro(value) {
    this.set('nitroCharges', value);
    this.#eventBus.emit(Events.NITRO_CHANGED, { value });
  }

  /**
   * Upgrade a component
   * @param {string} component - 'engine' | 'tire' | 'body'
   * @param {number} maxLevel - maximum allowed level
   * @returns {number} new level (0 if already maxed)
   */
  upgrade(component, maxLevel = 4) {
    const current = this.get(`upgrades.${component}`);
    if (current >= maxLevel) return 0;
    const newLevel = current + 1;
    this.set(`upgrades.${component}`, newLevel);
    this.#eventBus.emit(Events.UPGRADE_CHANGED, { component, level: newLevel });
    return newLevel;
  }

  /**
   * Add wrong word for review
   * @param {Object} word - { word, meaning, correct }
   */
  addWrongWord(word) {
    const wrongWords = this.get('wrongWords') || [];
    // Avoid duplicates
    if (!wrongWords.some(w => w.word === word.word)) {
      wrongWords.push(word);
      this.set('wrongWords', wrongWords);
    }
  }

  /**
   * Clear wrong words (after review)
   */
  clearWrongWords() {
    this.set('wrongWords', []);
  }

  /**
   * Add leaderboard entry
   * @param {Object} entry - { time, lapCount, date }
   * @param {number} maxEntries - maximum entries to keep
   */
  addLeaderboardEntry(entry, maxEntries = 20) {
    const leaderboard = this.get('leaderboard') || [];
    leaderboard.push(entry);
    leaderboard.sort((a, b) => a.time - b.time);
    const trimmed = leaderboard.slice(0, maxEntries);
    this.set('leaderboard', trimmed);
    this.#eventBus.emit(Events.LEADERBOARD_UPDATE, { entries: trimmed });
  }

  // ==================== Private Methods ====================

  #emitChange(path, value) {
    // Map paths to specific events
    const eventMap = {
      'fuel': Events.FUEL_CHANGED,
      'fuelCoins': Events.COINS_CHANGED,
      'gearCoins': Events.COINS_CHANGED,
      'nitroCharges': Events.NITRO_CHANGED,
    };

    const event = eventMap[path];
    if (event) {
      this.#eventBus.emit(event, { path, value });
    }
    this.#eventBus.emit(Events.RESOURCE_CHANGED, { path, value });
  }

  #load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);

        // 兼容性迁移：确保新字段有默认值
        if (!parsed.achievements) parsed.achievements = [];
        if (!parsed.unlockedTracks) parsed.unlockedTracks = ['shanghai-2d'];
        if (!parsed.selectedTrackId) parsed.selectedTrackId = 'shanghai-2d';
        if (!parsed.learning) parsed.learning = {};
        if (parsed.learning.lastPerfectQuiz === undefined) parsed.learning.lastPerfectQuiz = false;

        this.#state = { ...this.#deepClone(DEFAULT_STATE), ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load game state:', e);
    }
  }

  #save() {
    try {
      localStorage.setItem(STORAGE_KEY, this.serialize());
    } catch (e) {
      console.warn('Failed to save game state:', e);
    }
  }

  #deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}
