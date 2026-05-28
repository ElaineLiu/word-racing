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
    this.setText('#home-coins', this.#game.coins || 0);
    this.setText('#home-fuel', Math.round(this.#game.fuel));
    this.setText('#home-nitro', this.#game.nitroCharges);
    // 学习系统金币优先
    const fuelCoins = this.#learningController?.getTodayEarnings()?.fuel || this.#game.fuelCoins || 0;
    const gearCoins = this.#learningController?.getTodayEarnings()?.gear || this.#game.gearCoins || 0;
    this.setText('#home-fuel-coins', fuelCoins);
    this.setText('#home-gear-coins', gearCoins);
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
      if (confirm('确定要重置每日答题限制吗？\n\n注意：不会清除单词掌握进度。')) {
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

      alert('已重置！可以继续答题。');

      // 关闭下拉菜单
      const dropdown = this.$('#settings-dropdown');
      if (dropdown) dropdown.style.display = 'none';

      // 刷新 UI
      this.updateLearningUI();
    } catch (e) {
      alert('重置失败: ' + e.message);
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
