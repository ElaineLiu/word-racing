/**
 * HomeView - Home page with stats, leaderboard, and start button
 */

import { BaseView } from './base-view.js';
import { Events } from '../core/event-bus.js';
import { LEARNING } from '../config/learning-config.js';
import { DataManager } from '../core/data-manager.js';

export class HomeView extends BaseView {
  #game;
  #learningController;

  constructor(eventBus, game, learningController = null) {
    super('page-home', eventBus);
    this.#game = game;
    this.#learningController = learningController;
  }

  mount() {
    super.mount();
    this.#setupEventListeners();
    this.#subscribeToEvents();
    this.renderLeaderboard();
    this.updateLearningUI();
    this.#promptAutoSaveIfNeeded();
  }

  render() {
    this.updateStats();
  }

  update(data) {
    this.updateStats();
    if (data?.leaderboard) {
      this.renderLeaderboard();
    }
  }

  updateStats() {
    this.setText('#home-nitro', this.#game.nitroCharges);

    const fuelCoins = this.#learningController?.getTodayEarnings()?.fuel || this.#game.fuelCoins || 0;
    const gearCoins = this.#learningController?.getTodayEarnings()?.gear || this.#game.gearCoins || 0;
    this.setText('#home-fuel-coins', fuelCoins);
    this.setText('#home-gear-coins', gearCoins);

    this.#updateLearningProgress();
  }

  #updateLearningProgress() {
    if (!this.#game.gameState) return;

    const state = this.#game.gameState.getAll();
    const daily = state.daily || {};
    const learning = state.learning || {};

    const todayQuizzes = daily.todayQuizzes || 0;
    const maxQuizzes = LEARNING.DAILY_QUIZ_COUNT;
    this.setText('#home-quizzes-today', `${todayQuizzes}/${maxQuizzes}`);

    const mastered = learning.totalWordsMastered || 0;
    this.setText('#home-words-mastered', `${mastered} words`);
  }

  updateLearningUI() {
    if (this.#learningController) {
      this.#learningController.learningUI?.update();
    }
  }

  renderLeaderboard() {
    const container = this.$('#home-leaderboard');
    if (!container) return;

    const leaderboard = this.#game.getLeaderboard(5);

    if (leaderboard.length === 0) {
      container.innerHTML = '<div class="leaderboard-empty">No records yet</div>';
      return;
    }

    const html = leaderboard.map((entry, i) => `
      <div class="leaderboard-entry ${i === 0 ? 'first' : ''}">
        <span class="rank">${i + 1}.</span>
        <span class="time">${this.#formatTime(entry.time)}</span>
        <span class="laps">(${entry.lapCount}-lap)</span>
      </div>
    `).join('');

    container.innerHTML = `<div class="leaderboard-title">FASTEST LAPS</div>${html}`;
  }

  #setupEventListeners() {
    this.onClick('#home-start-btn', () => {
      this.emit(Events.QUIZ_START, { source: 'home' });
    });
  }

  #subscribeToEvents() {
    this.subscribe(Events.RESOURCE_CHANGED, () => {
      if (this.isMounted()) this.updateStats();
      window.dataManager?.scheduleSave();
    });

    this.subscribe(Events.LEADERBOARD_UPDATE, () => {
      if (this.isMounted()) this.renderLeaderboard();
    });

    this.subscribe(Events.DAILY_PROGRESS, () => {
      if (this.isMounted()) {
        this.updateLearningUI();
        this.updateStats();
      }
      window.dataManager?.scheduleSave();
    });

    this.subscribe(Events.QUIZ_COMPLETE, () => {
      if (this.isMounted()) this.updateStats();
      window.dataManager?.scheduleSave();
    });
  }

  #promptAutoSaveIfNeeded() {
    const dm = window.dataManager;
    if (!dm) return;
    if (dm.isFileSystemMode) return;
    if (!DataManager.isFileSystemAPISupported()) return;

    if (localStorage.getItem('wr_autosave_prompted')) return;
    localStorage.setItem('wr_autosave_prompted', '1');

    setTimeout(async () => {
      const ok = await dm.requestAutoSaveSetup();
      if (ok) {
        const btn = document.querySelector('#auto-save-btn');
        if (btn) btn.textContent = 'Auto-Save: ON';
      }
    }, 500);
  }

  #formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${min}:${sec.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  }
}
