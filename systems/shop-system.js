/**
 * ShopSystem - Handles all shop purchases and validation
 * Extracted from Game class for separation of concerns
 */

import { ECONOMY, UPGRADES, DISPLAY } from '../config/game-config.js';
import { Events } from '../core/event-bus.js';

export class ShopSystem {
  #eventBus;
  #shopItems;
  #gameState;

  constructor(eventBus, gameState) {
    this.#eventBus = eventBus;
    this.#gameState = gameState;
    this.#shopItems = ECONOMY.SHOP_ITEMS.map(item => ({ ...item }));
  }

  /**
   * Get all shop items
   * @returns {Array}
   */
  getItems() {
    return this.#shopItems;
  }

  /**
   * Check if an item can be purchased
   * @param {string} itemId
   * @param {Object} resources - { fuelCoins, gearCoins, fuel, maxFuel, upgrades }
   * @returns {{ canBuy: boolean, reason?: string }}
   */
  canPurchase(itemId, resources) {
    const item = this.#shopItems.find(it => it.id === itemId);
    if (!item) {
      return { canBuy: false, reason: 'Item not found' };
    }

    // Check currency
    let canAfford = false;
    if (item.currency === 'fuel') {
      canAfford = resources.fuelCoins >= item.cost;
      // For fuel items, check if already full
      if (canAfford && item.effect?.fuel) {
        canAfford = resources.fuel < resources.maxFuel;
        if (!canAfford) {
          return { canBuy: false, reason: 'Fuel tank is full' };
        }
      }
    } else if (item.currency === 'gear') {
      canAfford = resources.gearCoins >= item.cost;
    }

    if (!canAfford) {
      return { canBuy: false, reason: `Need ${item.cost} ${item.currency} coins` };
    }

    // For upgrades, check if already at max level
    if (item.upgrade && resources.upgrades) {
      const currentLevel = resources.upgrades[item.upgrade] || 1;
      if (currentLevel >= UPGRADES.MAX_LEVEL) {
        return { canBuy: false, reason: 'Already at max level' };
      }
    }

    return { canBuy: true };
  }

  /**
   * Execute a shop purchase
   * @param {string} itemId
   * @param {Object} context - { fuelCoins, gearCoins, fuel, maxFuel, nitroCharges, upgrades, car }
   * @returns {{ success: boolean, newState?: string, error?: string }}
   */
  purchase(itemId, context) {
    // Handle non-item actions
    if (itemId === 'back_quiz') {
      return { success: true, newState: 'QUIZ' };
    }
    if (itemId === 'start_race') {
      if (context.fuel > 0) {
        return { success: true, newState: 'COUNTDOWN', countdownFrames: DISPLAY.COUNTDOWN_FRAMES };
      }
      return { success: false, error: 'No fuel' };
    }

    // Find item
    const item = this.#shopItems.find(it => it.id === itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    // Validate purchase
    const validation = this.canPurchase(itemId, context);
    if (!validation.canBuy) {
      this.#eventBus.emit(Events.SHOP_ERROR, { itemId, reason: validation.reason });
      console.warn(`Cannot purchase ${item.label}: ${validation.reason}`);
      return { success: false, error: validation.reason };
    }

    // Deduct currency
    if (item.currency === 'fuel') {
      context.fuelCoins -= item.cost;
    } else if (item.currency === 'gear') {
      context.gearCoins -= item.cost;
    }

    // Apply effect
    if (itemId.startsWith('fuel')) {
      const amount = itemId === 'fuel20' ? 20 : 50;
      context.fuel = Math.min(context.maxFuel, context.fuel + amount);
    } else if (itemId.startsWith('nitro')) {
      const amount = itemId === 'nitro1' ? 1 : 3;
      // 只修改 context；Game 的 setter 会同步到 Car 和 GameState
      context.nitroCharges += amount;
    } else if (item.upgrade) {
      context.upgrades[item.upgrade] = Math.min(UPGRADES.MAX_LEVEL, (context.upgrades[item.upgrade] || 1) + 1);
      if (context.car) {
        context.car.applyUpgrades(context.upgrades);
      }
      console.log(`Upgraded ${item.upgrade} to level ${context.upgrades[item.upgrade]}`);
    }

    // Emit purchase event
    this.#eventBus.emit(Events.SHOP_PURCHASE, {
      itemId,
      item: item.label,
      cost: item.cost,
      currency: item.currency,
    });

    return { success: true };
  }

  /**
   * Get item by ID
   * @param {string} itemId
   * @returns {Object|undefined}
   */
  getItem(itemId) {
    return this.#shopItems.find(it => it.id === itemId);
  }

  /**
   * Calculate upgrade cost
   * @param {string} type - 'engine' | 'tire' | 'body'
   * @param {number} currentLevel
   * @returns {number}
   */
  getUpgradeCost(type, currentLevel) {
    const item = this.#shopItems.find(it => it.upgrade === type);
    return item?.cost || 0;
  }
}
