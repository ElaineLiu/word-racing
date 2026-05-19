/**
 * UpgradeSystem - Manages car upgrades and their effects
 * Data-driven upgrade calculations
 */

import { UPGRADES } from '../config/game-config.js';
import { Events } from '../core/event-bus.js';

// Upgrade type definitions (can be extended)
export const UpgradeTypes = {
  engine: {
    name: 'Engine',
    description: 'Speed bonus',
    effects: {
      maxSpeed: { type: 'multiply', base: 'BASE_MAX_SPEED', bonus: 'ENGINE_SPEED_BONUS' },
      nitroMaxSpeed: { type: 'multiply', base: 'NITRO_MAX_SPEED', bonus: 'ENGINE_SPEED_BONUS' },
      nitroAccel: { type: 'multiply', base: 'NITRO_ACCEL', bonus: 'ENGINE_SPEED_BONUS' },
    },
  },
  tire: {
    name: 'Tire',
    description: 'Grip bonus',
    effects: {
      turnSpeed: { type: 'multiply', base: 'BASE_TURN_SPEED', bonus: 'TIRE_GRIP_BONUS' },
    },
  },
  body: {
    name: 'Body',
    description: 'Weight reduction',
    effects: {
      acceleration: { type: 'multiply', base: 'BASE_ACCELERATION', bonus: 'BODY_WEIGHT_BONUS' },
      brakeForce: { type: 'multiply', base: 'BASE_BRAKE_FORCE', bonus: 'BODY_WEIGHT_BONUS' },
    },
  },
};

export class UpgradeSystem {
  #eventBus;
  #levels = { engine: 1, tire: 1, body: 1 };
  #maxLevel = UPGRADES.MAX_LEVEL;

  constructor(eventBus) {
    this.#eventBus = eventBus;
  }

  /**
   * Get current upgrade levels
   * @returns {{ engine: number, tire: number, body: number }}
   */
  getLevels() {
    return { ...this.#levels };
  }

  /**
   * Set upgrade levels (e.g., from saved state)
   * @param {{ engine: number, tire: number, body: number }} levels
   */
  setLevels(levels) {
    this.#levels = {
      engine: this.#clampLevel(levels.engine),
      tire: this.#clampLevel(levels.tire),
      body: this.#clampLevel(levels.body),
    };
  }

  /**
   * Upgrade a component
   * @param {string} type - 'engine' | 'tire' | 'body'
   * @returns {{ success: boolean, newLevel: number }}
   */
  upgrade(type) {
    if (!UpgradeTypes[type]) {
      return { success: false, newLevel: this.#levels[type] };
    }

    if (this.#levels[type] >= this.#maxLevel) {
      return { success: false, newLevel: this.#levels[type] };
    }

    this.#levels[type]++;
    this.#eventBus?.emit(Events.UPGRADE_CHANGED, { type, level: this.#levels[type] });

    return { success: true, newLevel: this.#levels[type] };
  }

  /**
   * Get the current level of a specific upgrade
   * @param {string} type
   * @returns {number}
   */
  getLevel(type) {
    return this.#levels[type] || UPGRADES.MIN_LEVEL;
  }

  /**
   * Check if an upgrade can be applied
   * @param {string} type
   * @returns {boolean}
   */
  canUpgrade(type) {
    return UpgradeTypes[type] && this.#levels[type] < this.#maxLevel;
  }

  /**
   * Calculate the multiplier for an upgrade type at a given level
   * @param {string} type
   * @param {number} level
   * @returns {number}
   */
  getMultiplier(type, level) {
    const config = UpgradeTypes[type];
    if (!config) return 1;

    const bonusKey = Object.values(config.effects)[0]?.bonus;
    if (!bonusKey) return 1;

    const bonusPerLevel = UPGRADES[bonusKey] || 0;
    return 1 + (level - 1) * bonusPerLevel;
  }

  /**
   * Calculate all physics modifiers based on current upgrades
   * @returns {Object} Modifiers to apply to car physics
   */
  calculateModifiers() {
    const engineMult = this.getMultiplier('engine', this.#levels.engine);
    const tireMult = this.getMultiplier('tire', this.#levels.tire);
    const bodyMult = this.getMultiplier('body', this.#levels.body);

    return {
      maxSpeed: engineMult,
      nitroMaxSpeed: engineMult,
      nitroAccel: engineMult,
      turnSpeed: tireMult,
      acceleration: bodyMult,
      brakeForce: bodyMult,
    };
  }

  /**
   * Apply upgrade effects to a car object
   * @param {Car} car - Car instance with base physics values
   */
  applyToCar(car) {
    const mods = this.calculateModifiers();

    // Apply multipliers to car's base values
    if (car._baseMaxSpeed !== undefined) {
      car.maxSpeed = car._baseMaxSpeed * mods.maxSpeed;
      car.nitroMaxSpeed = car._baseNitroMaxSpeed * mods.nitroMaxSpeed;
      car.nitroAccel = car._baseNitroAccel * mods.nitroAccel;
      car.turnSpeed = car._baseTurnSpeed * mods.turnSpeed;
      car.acceleration = car._baseAcceleration * mods.acceleration;
      car.brakeForce = car._baseBrakeForce * mods.brakeForce;
    }
  }

  /**
   * Get upgrade cost for the next level
   * @param {string} type
   * @param {ECONOMY.SHOP_ITEMS} shopItems
   * @returns {number|null}
   */
  getUpgradeCost(type, shopItems) {
    const item = shopItems.find(it => it.upgrade === type);
    return item?.cost || null;
  }

  #clampLevel(level) {
    return Math.max(UPGRADES.MIN_LEVEL, Math.min(this.#maxLevel, level || UPGRADES.MIN_LEVEL));
  }
}
