/**
 * AchievementToast - 成就解锁提示组件
 *
 * Phase 3.3: 监听 ACHIEVEMENT_UNLOCKED 事件，显示 Toast 通知。
 * 按 design/赛道解锁系统详细设计.md UC-01 实现。
 */

import { Events } from '../core/event-bus.js';

export class AchievementToast {
  #eventBus;
  #container;
  #subscription;
  #toastQueue = [];
  #timers = [];

  constructor(eventBus) {
    this.#eventBus = eventBus;
  }

  /**
   * 初始化：创建容器并订阅事件
   */
  mount() {
    this.#ensureContainer();
    this.#subscription = this.#eventBus.on(Events.ACHIEVEMENT_UNLOCKED, (data) => {
      this.#showToast(data.achievement);
    });
  }

  /**
   * 清理：取消订阅
   */
  unmount() {
    if (this.#subscription) {
      this.#subscription();
      this.#subscription = null;
    }
    // 清除所有定时器
    this.#timers.forEach(timer => clearTimeout(timer));
    this.#timers = [];
  }

  #ensureContainer() {
    this.#container = document.getElementById('toast-container');
    if (!this.#container) {
      this.#container = document.createElement('div');
      this.#container.id = 'toast-container';
      document.body.appendChild(this.#container);
    }
  }

  #showToast(achievement) {
    if (!achievement) return;

    const toast = document.createElement('div');
    toast.className = 'achievement-toast';

    const rewardText = this.#formatReward(achievement.reward);

    toast.innerHTML = `
      <div class="achievement-toast-content">
        <span class="achievement-toast-icon">🏆</span>
        <div class="achievement-toast-text">
          <div class="achievement-toast-title">Achievement unlocked!</div>
          <div class="achievement-toast-name">${achievement.name}</div>
          <div class="achievement-toast-desc">${achievement.description}</div>
          ${rewardText ? `<div class="achievement-toast-reward">${rewardText}</div>` : ''}
        </div>
      </div>
    `;

    this.#container.appendChild(toast);

    // 3秒后自动消失
    const timer = setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 3000);

    this.#timers.push(timer);
  }

  #formatReward(reward) {
    if (!reward) return '';
    const parts = [];
    if (reward.track) parts.push('🏁 Track unlocked');
    if (reward.fuelCoins) parts.push(`🪙 ${reward.fuelCoins} Fuel Coins`);
    return parts.join(' ');
  }
}
