/**
 * SettingsView - Settings page with reset options
 *
 * Phase 4.2: 实现全部重置功能
 */

import { BaseView } from './base-view.js';
import { Events } from '../core/event-bus.js';

export class SettingsView extends BaseView {
  #game;
  #learningController;

  constructor(eventBus, game, learningController) {
    super('page-settings', eventBus);
    this.#game = game;
    this.#learningController = learningController;
  }

  mount() {
    super.mount();
    this.#setupEventListeners();
  }

  #setupEventListeners() {
    this.onClick('#settings-back-btn', () => {
      this.emit(Events.VIEW_CHANGE, { view: 'home' });
    });

    this.onClick('#reset-all-btn', () => {
      this.#handleResetAll();
    });
  }

  #handleResetAll() {
    const confirmed = confirm(
      'Confirm reset all data?\n\n' +
      'This will clear all your learning progress, coins, achievements, and unlocked tracks.\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      // Reset GameState (including coins, achievements, unlocked tracks)
      if (this.#game.gameState && typeof this.#game.gameState.reset === 'function') {
        this.#game.gameState.reset();
      }

      // Clear word progress
      if (this.#learningController && this.#learningController.progressTracker) {
        this.#learningController.progressTracker.clear();
      }

      // Clear daily history
      if (this.#learningController && this.#learningController.dailyManager) {
        this.#learningController.dailyManager.reset();
        // Clear history by clearing all days
        this.#learningController.dailyManager.clearHistory(30);
      }

      // Clear quiz session
      if (this.#learningController && this.#learningController.sessionManager) {
        this.#learningController.sessionManager.clearSession?.();
      }

      alert('All data has been reset. The page will now refresh.');

      // Refresh the page
      window.location.reload();
    } catch (err) {
      console.error('Reset failed:', err);
      alert('Reset failed: ' + err.message);
    }
  }
}
