/**
 * DailyManager - 每日学习管理
 *
 * 职责：
 * - 管理每日学习进度（套数、答题数、金币）
 * - 追踪连续学习天数（连击）
 * - 检查每日目标完成情况
 * - 结算每日奖励
 * - 跨日重置
 */

import { Events } from '../core/event-bus.js';
import { LEARNING, REWARDS } from '../config/learning-config.js';

/**
 * DailyManager - 每日学习管理器
 */
export class DailyManager {
  #eventBus;
  #gameState;
  #userId;
  #storageKey;
  #todayStats = null;
  #historyStats = null;

  /**
   * @param {EventBus} eventBus - 事件总线
   * @param {GameState} gameState - 游戏状态管理器
   * @param {string} [userId] - 用户ID
   */
  constructor(eventBus, gameState, userId = 'default') {
    this.#eventBus = eventBus;
    this.#gameState = gameState;
    this.#userId = userId;
    this.#storageKey = `wr_daily_stats_${userId}`;
    this.#loadHistory();
    this.#checkDayChange();
  }

  // ==================== 日期工具 ====================

  /**
   * 获取今日日期（YYYY-MM-DD）
   * @returns {string}
   */
  getToday() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 检查是否新的一天
   * @returns {boolean}
   */
  isNewDay() {
    const lastDate = this.#gameState.get('daily.lastActiveDate');
    return lastDate !== this.getToday();
  }

  // ==================== 每日进度 ====================

  /**
   * 检查日期变化并重置
   */
  #checkDayChange() {
    const today = this.getToday();
    const lastDate = this.#gameState.get('daily.lastActiveDate');

    if (lastDate !== today) {
      // 保存昨天的统计到历史
      if (lastDate && this.#todayStats) {
        this.#saveToHistory(lastDate, this.#todayStats);
      }

      // 检查连击
      const yesterday = this.#getYesterday();
      if (lastDate === yesterday) {
        // 连续学习，保持连击
      } else if (lastDate && lastDate !== yesterday) {
        // 断了连击，重置
        this.#gameState.set('daily.streakDays', 0);
      }

      // 重置今日进度
      this.#todayStats = this.#createEmptyStats();
      this.#gameState.set('daily.lastActiveDate', today);
      this.#gameState.set('daily.todayQuizzes', 0);
      this.#gameState.set('daily.todayFuelCoins', 0);
      this.#gameState.set('daily.todayGearCoins', 0);

      this.#eventBus.emit(Events.DAILY_RESET, { date: today });
    } else {
      // 同一天，加载今日进度
      this.#todayStats = this.#loadTodayStats();
    }
  }

  /**
   * 获取昨天的日期
   * @returns {string}
   */
  #getYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  /**
   * 创建空的每日统计
   * @returns {Object}
   */
  #createEmptyStats() {
    return {
      quizzesCompleted: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      newWordsLearned: 0,
      wordsReviewed: 0,
      fuelCoinsEarned: 0,
      gearCoinsEarned: 0,
      maxCombo: 0,
      completed: false,
    };
  }

  /**
   * 获取今日进度
   * @returns {Object}
   */
  getTodayProgress() {
    if (!this.#todayStats) {
      this.#todayStats = this.#loadTodayStats();
    }
    return { ...this.#todayStats };
  }

  /**
   * 从 gameState 加载今日进度
   * @returns {Object}
   */
  #loadTodayStats() {
    return {
      quizzesCompleted: this.#gameState.get('daily.todayQuizzes') || 0,
      totalQuestions: 0, // 运行时计算
      correctAnswers: 0,
      newWordsLearned: 0,
      wordsReviewed: 0,
      fuelCoinsEarned: this.#gameState.get('daily.todayFuelCoins') || 0,
      gearCoinsEarned: this.#gameState.get('daily.todayGearCoins') || 0,
      maxCombo: 0,
      completed: false,
    };
  }

  // ==================== 进度更新 ====================

  /**
   * 更新进度（答题后调用）
   * @param {Object} result - 答题结果
   * @param {boolean} result.correct - 是否答对
   * @param {string} result.mode - 题型
   * @param {number} result.fuelCoins - 获得的燃油币
   * @param {number} result.gearCoins - 获得的装备币
   * @param {number} result.combo - 当前连击数
   * @param {boolean} result.isNewWord - 是否新词
   * @param {boolean} result.isReview - 是否复习
   */
  updateProgress(result) {
    if (!this.#todayStats) {
      this.#todayStats = this.#createEmptyStats();
    }

    this.#todayStats.totalQuestions++;

    if (result.correct) {
      this.#todayStats.correctAnswers++;
    }

    if (result.fuelCoins) {
      this.#todayStats.fuelCoinsEarned += result.fuelCoins;
      this.#gameState.modify('daily.todayFuelCoins', result.fuelCoins);
    }

    if (result.gearCoins) {
      this.#todayStats.gearCoinsEarned += result.gearCoins;
      this.#gameState.modify('daily.todayGearCoins', result.gearCoins);
    }

    if (result.combo && result.combo > this.#todayStats.maxCombo) {
      this.#todayStats.maxCombo = result.combo;
    }

    if (result.isNewWord) {
      this.#todayStats.newWordsLearned++;
    }

    if (result.isReview) {
      this.#todayStats.wordsReviewed++;
    }

    this.#eventBus.emit(Events.DAILY_PROGRESS, this.getTodayProgress());
  }

  /**
   * 完成一套题
   * @param {Object} quizResults - 套题结果
   * @returns {Object} 更新后的进度
   */
  completeQuiz(quizResults) {
    if (!this.#todayStats) {
      this.#todayStats = this.#createEmptyStats();
    }

    this.#todayStats.quizzesCompleted++;
    this.#gameState.modify('daily.todayQuizzes', 1);

    // 更新今日答题统计
    const questions = quizResults.totalQuestions || 0;
    const correct = quizResults.correctCount || 0;
    this.#todayStats.totalQuestions += questions;
    this.#todayStats.correctAnswers += correct;

    // 累加金币
    if (quizResults.fuelCoins) {
      this.#todayStats.fuelCoinsEarned += quizResults.fuelCoins;
      this.#gameState.modify('daily.todayFuelCoins', quizResults.fuelCoins);
    }
    if (quizResults.gearCoins) {
      this.#todayStats.gearCoinsEarned += quizResults.gearCoins;
      this.#gameState.modify('daily.todayGearCoins', quizResults.gearCoins);
    }

    // 更新学习统计
    this.#gameState.modify('learning.totalQuizzes', 1);
    this.#gameState.modify('learning.totalQuestions', questions);
    this.#gameState.modify('learning.totalCorrect', correct);

    // 检查是否完成今日目标
    const goalResult = this.checkDailyGoals();

    return {
      progress: this.getTodayProgress(),
      goals: goalResult,
    };
  }

  // ==================== 每日目标 ====================

  /**
   * 检查每日目标
   * @returns {Object} 目标完成情况
   */
  checkDailyGoals() {
    const progress = this.getTodayProgress();

    const goals = {
      accuracy100: {
        achieved: progress.totalQuestions > 0 &&
          (progress.correctAnswers / progress.totalQuestions) >= 1.0,
        progress: progress.totalQuestions > 0
          ? Math.round((progress.correctAnswers / progress.totalQuestions) * 100)
          : 0,
        target: 100,
        reward: REWARDS.dailyGoals.accuracy100,
      },
      accuracy80: {
        achieved: progress.totalQuestions > 0 &&
          (progress.correctAnswers / progress.totalQuestions) >= 0.8,
        progress: progress.totalQuestions > 0
          ? Math.round((progress.correctAnswers / progress.totalQuestions) * 100)
          : 0,
        target: 80,
        reward: REWARDS.dailyGoals.accuracy80,
      },
    };

    return goals;
  }

  /**
   * 结算每日奖励
   * @returns {Object} 奖励结果
   */
  settleDailyRewards() {
    const goals = this.checkDailyGoals();
    const rewards = { fuel: 0, gear: 0 };
    const achieved = [];

    // 取最高奖励（不叠加）
    if (goals.accuracy100.achieved) {
      rewards.fuel += goals.accuracy100.reward.fuel || 0;
      rewards.gear += goals.accuracy100.reward.gear || 0;
      achieved.push('accuracy100');
    } else if (goals.accuracy80.achieved) {
      rewards.fuel += goals.accuracy80.reward.fuel || 0;
      rewards.gear += goals.accuracy80.reward.gear || 0;
      achieved.push('accuracy80');
    }

    // 标记今日完成
    if (this.#todayStats) {
      this.#todayStats.completed = true;
    }

    // 发送目标完成事件
    if (achieved.length > 0) {
      this.#eventBus.emit(Events.DAILY_GOAL_COMPLETE, {
        goals: achieved,
        rewards,
      });
    }

    // 保存到历史
    const today = this.getToday();
    this.#saveToHistory(today, this.#todayStats);

    return {
      rewards,
      achieved,
      streak: this.#gameState.get('daily.streakDays') || 0,
    };
  }

  // ==================== 连击天数 ====================

  /**
   * 获取连续学习天数
   * @returns {number}
   */
  getStreak() {
    return this.#gameState.get('daily.streakDays') || 0;
  }

  /**
   * 重置连击天数
   */
  resetStreak() {
    this.#gameState.set('daily.streakDays', 0);
  }

  // ==================== 历史统计 ====================

  /**
   * 加载历史统计
   */
  #loadHistory() {
    try {
      let raw = localStorage.getItem(this.#storageKey);

      // Migration: copy old data to new key (for first user only)
      if (!raw && this.#userId === 'user_001') {
        const oldData = localStorage.getItem('wr_daily_stats');
        if (oldData) {
          raw = oldData;
          localStorage.setItem(this.#storageKey, raw);
          console.log(`[DailyManager] Migrated old data to ${this.#storageKey}`);
        }
      }

      this.#historyStats = raw ? JSON.parse(raw) : {};
    } catch (e) {
      this.#historyStats = {};
    }
  }

  /**
   * 保存到历史
   * @param {string} date - 日期
   * @param {Object} stats - 统计数据
   */
  #saveToHistory(date, stats) {
    if (!this.#historyStats) {
      this.#historyStats = {};
    }
    this.#historyStats[date] = { ...stats };
    this.#saveHistory();
  }

  /**
   * 保存历史到存储
   */
  #saveHistory() {
    try {
      // 只保留最近 30 天
      const dates = Object.keys(this.#historyStats).sort().reverse();
      const toKeep = dates.slice(0, 30);
      const trimmed = {};
      for (const date of toKeep) {
        trimmed[date] = this.#historyStats[date];
      }
      this.#historyStats = trimmed;
      localStorage.setItem(this.#storageKey, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[DailyManager] Failed to save history:', e);
    }
  }

  /**
   * 获取历史统计
   * @param {number} days - 天数
   * @returns {Object[]}
   */
  getHistory(days = 7) {
    if (!this.#historyStats) {
      this.#loadHistory();
    }

    const dates = Object.keys(this.#historyStats).sort().reverse();
    const result = [];

    for (let i = 0; i < Math.min(days, dates.length); i++) {
      const date = dates[i];
      result.push({
        date,
        ...this.#historyStats[date],
      });
    }

    return result;
  }

  /**
   * 获取总统计
   * @returns {Object}
   */
  getTotalStats() {
    return {
      totalQuizzes: this.#gameState.get('learning.totalQuizzes') || 0,
      totalQuestions: this.#gameState.get('learning.totalQuestions') || 0,
      totalCorrect: this.#gameState.get('learning.totalCorrect') || 0,
      totalWordsSeen: this.#gameState.get('learning.totalWordsSeen') || 0,
      totalWordsMastered: this.#gameState.get('learning.totalWordsMastered') || 0,
      streak: this.getStreak(),
    };
  }

  // ==================== 工具方法 ====================

  /**
   * 检查今日是否已完成所有目标
   * @returns {boolean}
   */
  isTodayComplete() {
    return this.#todayStats?.completed === true;
  }

  /**
   * 获取今日剩余套数
   * @returns {number}
   */
  getRemainingQuizzes() {
    const completed = this.#todayStats?.quizzesCompleted || 0;
    return Math.max(0, LEARNING.DAILY_QUIZ_COUNT - completed);
  }

  /**
   * 检查是否可以继续答题
   * @returns {boolean}
   */
  canContinueQuiz() {
    return this.getRemainingQuizzes() > 0;
  }

  /**
   * 重置每日进度（用于测试）
   */
  reset() {
    this.#todayStats = null;
    this.#gameState.set('daily', {
      lastActiveDate: null,
      streakDays: 0,
      todayQuizzes: 0,
      todayFuelCoins: 0,
      todayGearCoins: 0,
    });
    this.#eventBus.emit(Events.DAILY_RESET, {});
  }
}
