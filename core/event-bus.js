/**
 * EventBus - Central publish/subscribe system
 * Enables loose coupling between game subsystems
 */

export class EventBus {
  #listeners = new Map();

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, []);
    }
    this.#listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event (fires once then auto-unsubscribes)
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    return this.on(event, wrapper);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler to remove
   */
  off(event, callback) {
    const callbacks = this.#listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event - Event name
   * @param {*} data - Event payload
   */
  emit(event, data) {
    const callbacks = this.#listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in event handler for "${event}":`, e);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event (or all events)
   * @param {string} [event] - Event name (omit to clear all)
   */
  clear(event) {
    if (event) {
      this.#listeners.delete(event);
    } else {
      this.#listeners.clear();
    }
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number}
   */
  listenerCount(event) {
    return this.#listeners.get(event)?.length || 0;
  }
}

/**
 * Event type constants
 * Using namespaced format: domain:action
 */
export const Events = {
  // Resource changes
  RESOURCE_CHANGED: 'resource:changed',
  FUEL_CHANGED: 'fuel:changed',
  COINS_CHANGED: 'coins:changed',
  NITRO_CHANGED: 'nitro:changed',

  // Upgrade system
  UPGRADE_CHANGED: 'upgrade:changed',

  // Quiz system
  QUIZ_START: 'quiz:start',
  QUIZ_ANSWER: 'quiz:answer',
  QUIZ_COMPLETE: 'quiz:complete',

  // Race system
  RACE_START: 'race:start',
  RACE_FINISH: 'race:finish',
  RACE_EXIT: 'race:exit',
  LAP_COMPLETE: 'lap:complete',
  COUNTDOWN_START: 'countdown:start',
  COUNTDOWN_TICK: 'countdown:tick',
  COUNTDOWN_END: 'countdown:end',

  // Shop system
  SHOP_PURCHASE: 'shop:purchase',
  SHOP_ERROR: 'shop:error',

  // State machine
  STATE_CHANGED: 'state:changed',

  // Leaderboard
  LEADERBOARD_UPDATE: 'leaderboard:update',

  // UI events
  VIEW_CHANGE: 'view:change',
  HUD_UPDATE: 'hud:update',
};
