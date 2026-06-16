/**
 * HomeView - Home page with stats, leaderboard, and start button
 */

import { BaseView } from './base-view.js';
import { Events } from '../core/event-bus.js';
import { GAME } from '../config/game-config.js';

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
    this.renderLapSelector();
    this.updateLearningUI();
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
    // 比赛资源
    this.setText('#home-nitro', this.#game.nitroCharges);

    // 货币资源
    const fuelCoins = this.#learningController?.getTodayEarnings()?.fuel || this.#game.fuelCoins || 0;
    const gearCoins = this.#learningController?.getTodayEarnings()?.gear || this.#game.gearCoins || 0;
    this.setText('#home-fuel-coins', fuelCoins);
    this.setText('#home-gear-coins', gearCoins);

    // 学习进度
    this.#updateLearningProgress();
  }

  #updateLearningProgress() {
    if (!this.#game.gameState) return;

    const state = this.#game.gameState.getAll();
    const daily = state.daily || {};
    const learning = state.learning || {};

    // 今日答题数
    const todayQuizzes = daily.todayQuizzes || 0;
    const maxQuizzes = 3; // LEARNING.DAILY_QUIZ_COUNT
    this.setText('#home-quizzes-today', `${todayQuizzes}/${maxQuizzes}`);

    // 已掌握单词数
    const mastered = learning.totalWordsMastered || 0;
    this.setText('#home-words-mastered', `${mastered} words`);

    // 连续学习天数
    const streak = daily.streakDays || 0;
    this.setText('#home-streak', `${streak} days`);
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

  renderLapSelector() {
    const container = this.$('#home-lap-select');
    if (!container) return;

    container.innerHTML = '';

    const label = document.createElement('span');
    label.textContent = 'Laps: ';
    label.className = 'lap-label';
    container.appendChild(label);

    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = 'lap-btn' + (i === this.#game.selectedLaps ? ' active' : '');
      btn.addEventListener('click', () => {
        this.#game.setLapCount(i);
        this.renderLapSelector();
      });
      container.appendChild(btn);
    }
  }

  #setupEventListeners() {
    this.onClick('#home-start-btn', () => {
      this.emit(Events.QUIZ_START, { source: 'home' });
    });

    // Navigate to Garage
    this.onClick('#home-garage-btn', () => {
      this.emit(Events.VIEW_CHANGE, { view: 'shop' });
    });

    // Settings dropdown
    this.onClick('#home-settings-btn', (e) => {
      e.stopPropagation();
      const dropdown = this.$('#settings-dropdown');
      if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const dropdown = this.$('#settings-dropdown');
      const btn = this.$('#home-settings-btn');
      if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    // Reset daily limit
    this.onClick('#reset-daily-btn', () => {
      if (confirm('Reset daily practice limit?\n\nYour word mastery progress will stay unchanged.')) {
        this.#resetDailyLimit();
      }
    });
  }

  #resetDailyLimit() {
    try {
      const state = JSON.parse(localStorage.getItem('wr_game_state') || '{}');
      state.daily = {
        lastActiveDate: null,
        streakDays: 0,
        todayQuizzes: 0,
        todayFuelCoins: 0,
        todayGearCoins: 0,
      };
      localStorage.setItem('wr_game_state', JSON.stringify(state));
      localStorage.removeItem('wr_quiz_session');

      // 更新内存状态
      if (this.#learningController) {
        this.#learningController.dailyManager?.reset?.();
        this.#learningController.sessionManager?.clearSession?.();
      }

      alert('Daily practice limit reset. You can continue.');

      // 关闭下拉菜单
      const dropdown = this.$('#settings-dropdown');
      if (dropdown) dropdown.style.display = 'none';

      // 刷新 UI
      this.updateLearningUI();
    } catch (e) {
      alert('Reset failed: ' + e.message);
    }
  }

  #subscribeToEvents() {
    this.subscribe(Events.RESOURCE_CHANGED, () => {
      if (this.isMounted()) {
        this.updateStats();
      }
    });

    this.subscribe(Events.LEADERBOARD_UPDATE, () => {
      if (this.isMounted()) {
        this.renderLeaderboard();
      }
    });

    this.subscribe(Events.DAILY_PROGRESS, () => {
      if (this.isMounted()) {
        this.updateLearningUI();
        this.updateStats();
      }
    });

    this.subscribe(Events.QUIZ_COMPLETE, () => {
      if (this.isMounted()) {
        this.updateStats();
      }
    });
  }

  #formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${min}:${sec.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  }
}
