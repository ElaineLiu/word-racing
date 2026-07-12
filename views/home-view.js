/**
 * HomeView - Home page with stats, leaderboard, and start button
 */

import { BaseView } from './base-view.js';
import { Events } from '../core/event-bus.js';
import { LEARNING } from '../config/learning-config.js';

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
    const maxQuizzes = LEARNING.DAILY_QUIZ_COUNT;
    this.setText('#home-quizzes-today', `${todayQuizzes}/${maxQuizzes}`);

    // 已掌握单词数
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

    // Settings dropdown (button is outside container, use document.querySelector)
    const settingsBtn = document.querySelector('#top-settings-btn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.querySelector('#settings-dropdown');
        if (!dropdown) return;

        if (dropdown.style.display === 'none') {
          const rect = settingsBtn.getBoundingClientRect();
          dropdown.style.top = rect.bottom + 8 + 'px';
          dropdown.style.right = (window.innerWidth - rect.right) + 'px';
          dropdown.style.display = 'block';
        } else {
          dropdown.style.display = 'none';
        }
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const dropdown = document.querySelector('#settings-dropdown');
      const btn = document.querySelector('#top-settings-btn');
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

    // Reset all data
    this.onClick('#reset-all-btn', () => {
      if (confirm('Confirm reset all data?\n\nThis will clear all your learning progress, coins, achievements, and unlocked tracks.\nThis action cannot be undone.')) {
        this.#resetAllData();
      }
    });

    // Reset this week's history
    this.onClick('#reset-week-btn', () => {
      if (confirm('Reset this week\'s history?\n\nThis will clear the last 7 days of practice history. Your coins and word progress will be kept.')) {
        this.#resetWeekHistory();
      }
    });
  }

  #resetDailyLimit() {
    try {
      const state = JSON.parse(localStorage.getItem('wr_game_state') || '{}');
      state.daily = {
        lastActiveDate: null,
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

  #resetAllData() {
    try {
      // Reset GameState (coins, achievements, unlocked tracks)
      if (this.#game?.gameState) {
        this.#game.gameState.reset();
      }

      // Clear word progress
      if (this.#learningController?.progressTracker) {
        this.#learningController.progressTracker.clear();
      }

      // Clear daily history
      if (this.#learningController?.dailyManager) {
        this.#learningController.dailyManager.reset();
        this.#learningController.dailyManager.clearHistory(30);
      }

      // Clear quiz session
      if (this.#learningController?.sessionManager) {
        this.#learningController.sessionManager.clearSession?.();
      }

      alert('All data has been reset. The page will now refresh.');

      // Refresh the page
      window.location.reload();
    } catch (e) {
      alert('Reset failed: ' + e.message);
    }
  }

  #resetWeekHistory() {
    try {
      this.#learningController?.dailyManager?.clearHistory(7);

      alert('This week\'s history has been cleared.');

      const dropdown = this.$('#settings-dropdown');
      if (dropdown) dropdown.style.display = 'none';

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
