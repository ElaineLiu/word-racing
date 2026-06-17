/**
 * LearningUI - 学习系统 UI 管理
 *
 * 职责：
 * - 渲染每日学习进度面板
 * - 显示每日目标状态
 * - 连击动画效果
 * - 学习统计面板
 */

import { Events } from '../core/event-bus.js';
import { LEARNING, REWARDS } from '../config/learning-config.js';

export class LearningUI {
  #eventBus;
  #progressTracker;
  #dailyManager;
  #sessionManager;
  #container = null;
  #comboDisplay = null;
  #animationQueue = [];

  constructor(eventBus, progressTracker, dailyManager, sessionManager) {
    this.#eventBus = eventBus;
    this.#progressTracker = progressTracker;
    this.#dailyManager = dailyManager;
    this.#sessionManager = sessionManager;
    this.#subscribeToEvents();
  }

  // ==================== 初始化 ====================

  /**
   * 创建 UI 容器
   */
  createContainer(parentSelector) {
    const parent = document.querySelector(parentSelector);
    if (!parent) return null;

    // 检查是否已存在
    if (document.getElementById('learning-panel')) {
      return document.getElementById('learning-panel');
    }

    this.#container = document.createElement('div');
    this.#container.id = 'learning-panel';
    this.#container.className = 'learning-panel';
    this.#container.innerHTML = this.#getPanelHTML();

    parent.insertBefore(this.#container, parent.firstChild);

    // 绑定事件
    this.#bindEvents();

    return this.#container;
  }

  /**
   * 获取面板 HTML
   */
  #getPanelHTML() {
    return `
      <div class="learning-header">
        <span class="learning-title">TODAY'S PIT STOPS</span>
        <span class="learning-streak" id="learning-streak"></span>
      </div>
      <div class="learning-progress">
        <div class="quiz-indicators" id="quiz-indicators">
          <div class="quiz-dot" data-quiz="1"></div>
          <div class="quiz-dot" data-quiz="2"></div>
          <div class="quiz-dot" data-quiz="3"></div>
        </div>
        <div class="quiz-progress-text" id="quiz-progress-text"></div>
      </div>
      <div class="learning-goals" id="learning-goals">
        <!-- Goals rendered here -->
      </div>
      <div class="learning-stats" id="learning-stats">
        <!-- Stats rendered here -->
      </div>
    `;
  }

  // ==================== 渲染方法 ====================

  /**
   * 更新全部 UI
   */
  update() {
    this.updateDailyProgress();
    this.updateGoals();
    this.updateStats();
    this.updateStreak();
  }

  /**
   * 更新每日进度
   */
  updateDailyProgress() {
    const progress = this.#dailyManager.getTodayProgress();
    const indicators = document.querySelectorAll('#quiz-indicators .quiz-dot');

    indicators.forEach((dot, idx) => {
      const quizNum = idx + 1;
      dot.classList.remove('completed', 'current', 'locked');

      if (quizNum <= progress.quizzesCompleted) {
        dot.classList.add('completed');
        dot.title = `Quiz ${quizNum} completed`;
      } else if (quizNum === progress.quizzesCompleted + 1) {
        dot.classList.add('current');
        dot.title = `Current quiz`;
      } else {
        dot.classList.add('locked');
        dot.title = `Quiz ${quizNum} (locked)`;
      }
    });

    // 进度文字
    const progressText = document.getElementById('quiz-progress-text');
    if (progressText) {
      const remaining = this.#dailyManager.getRemainingQuizzes();
      if (remaining > 0) {
        progressText.textContent = `${progress.quizzesCompleted}/${LEARNING.DAILY_QUIZ_COUNT} completed, ${remaining} remaining`;
      } else {
        progressText.textContent = 'All quizzes completed!';
      }
    }
  }

  /**
   * 更新目标状态
   */
  updateGoals() {
    const goalsContainer = document.getElementById('learning-goals');
    if (!goalsContainer) return;

    const goals = this.#dailyManager.checkDailyGoals();
    const goalsList = [
      { key: 'accuracy100', name: '100% accuracy', achieved: goals.accuracy100?.achieved || false },
      { key: 'accuracy80', name: '80%+ accuracy', achieved: goals.accuracy80?.achieved || false },
    ];

    goalsContainer.innerHTML = goalsList.map(g => `
      <div class="goal-item ${g.achieved ? 'achieved' : ''}">
        <span class="goal-icon">${g.achieved ? '✓' : '○'}</span>
        <span class="goal-name">${g.name}</span>
      </div>
    `).join('');
  }

  /**
   * 更新统计
   */
  updateStats() {
    const statsContainer = document.getElementById('learning-stats');
    if (!statsContainer) return;

    const progress = this.#dailyManager.getTodayProgress();
    const wordStats = this.#progressTracker.getStats();

    statsContainer.innerHTML = `
      <div class="stat-row">
        <span class="stat-label">Words Learning</span>
        <span class="stat-value">${wordStats.learning}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Words Mastered</span>
        <span class="stat-value">${wordStats.mastered}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Today's Fuel</span>
        <span class="stat-value fuel">${progress.fuelCoinsEarned}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Today's Gear</span>
        <span class="stat-value gear">${progress.gearCoinsEarned}</span>
      </div>
    `;
  }

  /**
   * 更新连续天数
   */
  updateStreak() {
    const streakEl = document.getElementById('learning-streak');
    if (!streakEl) return;

    const streak = this.#dailyManager.getStreak();
    if (streak > 0) {
      streakEl.textContent = `🔥 ${streak} day streak`;
      streakEl.title = `Keep it up! Study daily to maintain your streak.`;
    } else {
      streakEl.textContent = '';
    }
  }

  // ==================== 连击显示 ====================

  /**
   * 显示连击动画
   */
  showCombo(combo) {
    // 移除旧的连击显示
    if (this.#comboDisplay) {
      this.#comboDisplay.remove();
    }

    // 只在 3+ 连击时显示
    if (combo < 3) return;

    this.#comboDisplay = document.createElement('div');
    this.#comboDisplay.className = 'combo-display';
    this.#comboDisplay.textContent = `${combo}x COMBO!`;

    // 添加到页面
    const quizArea = document.getElementById('quiz-question-area');
    if (quizArea) {
      quizArea.appendChild(this.#comboDisplay);
    }

    // 动画结束后移除
    setTimeout(() => {
      if (this.#comboDisplay) {
        this.#comboDisplay.classList.add('fade-out');
        setTimeout(() => {
          this.#comboDisplay?.remove();
          this.#comboDisplay = null;
        }, 300);
      }
    }, 1500);
  }

  /**
   * 显示奖励动画
   */
  showReward(fuel, gear) {
    if (fuel === 0 && gear === 0) return;

    const rewardEl = document.createElement('div');
    rewardEl.className = 'reward-popup';
    rewardEl.innerHTML = `
      ${fuel > 0 ? `<span class="fuel-reward">+${fuel} Fuel</span>` : ''}
      ${gear > 0 ? `<span class="gear-reward">+${gear} Gear</span>` : ''}
    `;

    const quizArea = document.getElementById('quiz-question-area');
    if (quizArea) {
      quizArea.appendChild(rewardEl);
      setTimeout(() => {
        rewardEl.classList.add('fade-out');
        setTimeout(() => rewardEl.remove(), 300);
      }, 1000);
    }
  }

  // ==================== 套题完成界面 ====================

  /**
   * 显示套题完成结果
   */
  showQuizComplete(result) {
    const container = document.getElementById('quiz-complete');
    if (!container) return;

    // 更新结果显示
    const accuracyEl = document.getElementById('quiz-result-accuracy');
    const fuelEl = document.getElementById('quiz-result-fuel');
    const gearEl = document.getElementById('quiz-result-gear');

    if (accuracyEl) {
      accuracyEl.textContent = `Accuracy: ${result.accuracy}% (${result.correctCount}/${result.totalQuestions})`;
    }
    if (fuelEl) {
      fuelEl.textContent = `Fuel Coins: +${result.fuelCoins}`;
    }
    if (gearEl) {
      gearEl.textContent = `Gear Coins: +${result.gearCoins}`;
    }

    // 显示连击奖励
    if (result.maxCombo >= 3) {
      const comboRewardEl = document.getElementById('quiz-result-combo');
      if (comboRewardEl) {
        comboRewardEl.textContent = `Max Combo: ${result.maxCombo}x (+${result.comboReward?.gear || 0} Gear)`;
        comboRewardEl.style.display = 'block';
      }
    }

    // 检查是否完成今日目标
    const goals = this.#dailyManager.checkDailyGoals();
    if (goals.accuracy100?.achieved || goals.accuracy80?.achieved) {
      this.#showGoalCompleteMessage(goals);
    }
  }

  /**
   * 显示目标完成消息
   */
  #showGoalCompleteMessage(goals) {
    const messages = [];
    if (goals.accuracy100?.achieved) messages.push('100% accuracy achieved!');
    if (goals.accuracy80?.achieved) messages.push('80%+ accuracy achieved!');

    // 在完成界面显示
    const completePanel = document.getElementById('quiz-complete');
    if (!completePanel) return;

    const msgEl = document.createElement('div');
    msgEl.className = 'goal-complete-message';
    msgEl.innerHTML = messages.map(m => `<span>🎯 ${m}</span>`).join('');

    completePanel.insertBefore(msgEl, completePanel.firstChild);
  }

  // ==================== 断点续答提示 ====================

  /**
   * 显示断点续答提示
   */
  showResumePrompt(callbacks) {
    const overlay = document.createElement('div');
    overlay.className = 'resume-overlay';
    overlay.innerHTML = `
      <div class="resume-dialog">
        <h3>Continue where you left off?</h3>
        <p>You have an incomplete quiz from today.</p>
        <div class="resume-buttons">
          <button class="resume-btn continue">Continue Quiz</button>
          <button class="resume-btn restart">Start New Quiz</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 绑定按钮事件
    overlay.querySelector('.continue').addEventListener('click', () => {
      overlay.remove();
      callbacks.onContinue?.();
    });

    overlay.querySelector('.restart').addEventListener('click', () => {
      overlay.remove();
      callbacks.onRestart?.();
    });
  }

  // ==================== 事件订阅 ====================

  #subscribeToEvents() {
    // 连击更新
    this.#eventBus.on(Events.SESSION_SAVE, ({ combo }) => {
      if (combo >= 3) {
        this.showCombo(combo);
      }
    });

    // 套题完成
    this.#eventBus.on(Events.QUIZ_COMPLETE, (result) => {
      this.update();
    });

    // 每日进度更新
    this.#eventBus.on(Events.DAILY_PROGRESS, () => {
      this.update();
    });
  }

  // ==================== 事件绑定 ====================

  #bindEvents() {
    // 点击面板可以展开/收起
    if (this.#container) {
      const header = this.#container.querySelector('.learning-header');
      if (header) {
        header.addEventListener('click', () => {
          this.#container.classList.toggle('collapsed');
        });
      }
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 获取容器元素
   */
  getContainer() {
    return this.#container;
  }

  /**
   * 销毁 UI
   */
  destroy() {
    if (this.#container) {
      this.#container.remove();
      this.#container = null;
    }
    if (this.#comboDisplay) {
      this.#comboDisplay.remove();
      this.#comboDisplay = null;
    }
  }
}
