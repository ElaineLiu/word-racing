/**
 * GameState - Single source of truth for game data
 * Manages persistence and emits changes via EventBus
 */

import { EventBus, Events } from './event-bus.js';

// Default state structure
const DEFAULT_STATE = {
  // Resources
  fuelCoins: 0,
  gearCoins: 0,
  nitroCharges: 0,

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
  version: 4,
};

export class GameState {
  #state;
  #eventBus;
  #userId;
  #storageKey;

  constructor(eventBus, userId = 'default') {
    if (!(eventBus instanceof EventBus)) {
      throw new Error('GameState requires EventBus instance');
    }
    this.#eventBus = eventBus;
    this.#userId = userId;
    this.#storageKey = `wr_game_state_${userId}`;
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
  /**
   * Set nitro charges
   * @param {number} value
   */
  setNitro(value) {
    this.set('nitroCharges', value);
    this.#eventBus.emit(Events.NITRO_CHANGED, { value });
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
      let saved = localStorage.getItem(this.#storageKey);

      // Migration: copy old data to new key (for first user only)
      if (!saved && this.#userId === 'user_001') {
        const oldData = localStorage.getItem('wr_game_state');
        if (oldData) {
          saved = oldData;
          localStorage.setItem(this.#storageKey, saved);
          console.log(`[GameState] Migrated old data to ${this.#storageKey}`);
        }
      }

      if (saved) {
        const parsed = JSON.parse(saved);

        // v3 → v4 迁移：删除燃油和升级系统
        // 处理缺少 version 字段的旧数据（视为 v3 或更早）
        let migrated = false;
        if (!parsed.version || parsed.version < 4) {
          console.log(`[GameState] Migrating data from v${parsed.version || 'unknown'} to v4`);

          // 删除废弃字段
          delete parsed.fuel;
          delete parsed.upgrades;

          // 清理调试数据
          if (parsed.fuelCoins > 1000) parsed.fuelCoins = 100;
          if (parsed.gearCoins > 1000) parsed.gearCoins = 50;
          if (parsed.nitroCharges > 10) parsed.nitroCharges = 0;
          if (parsed.achievements && parsed.achievements.length > 10) parsed.achievements = [];
          if (parsed.unlockedTracks && parsed.unlockedTracks.length > 5) parsed.unlockedTracks = ['shanghai-2d'];

          // 设置新版本号
          parsed.version = 4;
          migrated = true;

          console.log('[GameState] Migration to v4 completed');
        }

        // 兼容性迁移：确保新字段有默认值
        if (!parsed.achievements) parsed.achievements = [];
        if (!parsed.unlockedTracks) parsed.unlockedTracks = ['shanghai-2d'];
        if (!parsed.selectedTrackId) parsed.selectedTrackId = 'shanghai-2d';
        if (!parsed.learning) parsed.learning = {};
        if (parsed.learning.lastPerfectQuiz === undefined) parsed.learning.lastPerfectQuiz = false;

        this.#state = { ...this.#deepClone(DEFAULT_STATE), ...parsed };

        // 如果发生了迁移，立即保存到 localStorage
        if (migrated) {
          this.#save();
        }
      }
    } catch (e) {
      console.warn('Failed to load game state:', e);
    }
  }

  #save() {
    try {
      localStorage.setItem(this.#storageKey, this.serialize());
    } catch (e) {
      console.warn('Failed to save game state:', e);
    }
  }

  #deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}
