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
  }).catch(err => {
    const d = document.createElement('div');
    d.style.cssText = 'color:#fff;background:#c00;padding:16px;font-size:14px;position:fixed;top:0;left:0;right:0;z-index:99999;';
    d.textContent = 'INIT ERROR: ' + err.message + ' | ' + (err.stack || '');
    document.body.appendChild(d);
  });
});
