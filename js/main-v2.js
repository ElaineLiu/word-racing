/**
 * Main Entry Point for Word Racing (v2 - View Architecture)
 * Uses the new ViewManager for UI coordination
 *
 * Phase 3 of Refactoring Plan
 * Phase 5 - Learning System Integration
 */

import { Game } from './game.js';
import { EventBus, Events } from '../core/event-bus.js';
import { ViewManager } from '../views/view-manager.js';
import { LearningController } from '../learning/learning-controller.js';

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Error handler
  window.addEventListener('error', (e) => {
    const msg = 'JS ERROR: ' + (e.message || 'unknown') + ' at ' + (e.filename || '') + ':' + (e.lineno || '');
    document.body.style.background = '#300';
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c00;color:#fff;padding:12px;z-index:99999;font-size:14px;';
    d.textContent = msg;
    document.body.appendChild(d);
  });

  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);
  window.game = game;

  game.init().then(() => {
    // Create shared EventBus
    const eventBus = new EventBus();

    // Initialize Learning Controller with loaded wordset
    const learningController = new LearningController();
    learningController.init(game.quiz.words || []);
    window.learningController = learningController;

    // Update wordset when quiz loads new words
    game.quiz.onWordsLoaded = (words) => {
      learningController.setWordSet(words);
    };

    // Create ViewManager with Learning Controller
    const viewManager = new ViewManager(eventBus, game, learningController);
    window.viewManager = viewManager;

    // Set up callbacks (now that viewManager exists)
    game.onExitRace = () => {
      viewManager.switchTo('home');
    };
    game.onResultsContinueCb = () => {
      viewManager.switchTo('home');
    };

    // Initial stats update
    viewManager.updateHomeStats();

    // Debug reset button
    const resetBtn = document.getElementById('debug-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all learning progress? This is for testing only.')) {
          localStorage.removeItem('wr_word_progress');
          localStorage.removeItem('wr_quiz_session');
          localStorage.removeItem('wr_daily_progress');
          localStorage.removeItem('wr_game_state');
          localStorage.removeItem('wr_wrongWords');
          // 给测试用户一些初始资源
          const testState = {
            version: 3,
            fuel: 50,
            fuelCoins: 100,
            gearCoins: 50,
            nitroCharges: 3,
            upgrades: { engine: 1, tire: 1, body: 1 },
          };
          localStorage.setItem('wr_game_state', JSON.stringify(testState));
          // 同步到 Game 对象
          game.fuel = testState.fuel;
          game.fuelCoins = testState.fuelCoins;
          game.gearCoins = testState.gearCoins;
          game.nitroCharges = testState.nitroCharges;
          game.upgrades = testState.upgrades;
          game.car?.applyUpgrades?.(testState.upgrades);
          // 重置学习控制器
          if (learningController) {
            learningController.progressTracker?.clear?.();
            learningController.dailyManager?.reset?.();
            learningController.sessionManager?.clearSession?.();
          }
          alert('Progress reset with test resources!');
          viewManager.switchTo('home');
        }
      });
    }
  }).catch(err => {
    const d = document.createElement('div');
    d.style.cssText = 'color:#fff;background:#c00;padding:16px;font-size:14px;position:fixed;top:0;left:0;right:0;z-index:99999;';
    d.textContent = 'INIT ERROR: ' + err.message + ' | ' + (err.stack || '');
    document.body.appendChild(d);
  });
});
