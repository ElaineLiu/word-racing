/**
 * QuizSessionManager - 答题会话管理
 *
 * 职责：
 * - 管理每日答题会话（3套题）
 * - 追踪当前套题进度
 * - 保存答题进度（每题答题后）
 * - 支持断点续答
 * - 结算套题奖励
 */

import { Events } from '../core/event-bus.js';
import { LEARNING, REWARDS } from '../config/learning-config.js';

// 存储键
const SESSION_KEY = LEARNING.STORAGE_KEYS.QUIZ_SESSION;

/**
 * QuizSessionManager - 答题会话管理器
 */
export class QuizSessionManager {
  #eventBus;
  #dailyManager;
  #progressTracker;
  #session = null;

  /**
   * @param {EventBus} eventBus - 事件总线
   * @param {DailyManager} dailyManager - 每日管理器
   * @param {ProgressTracker} progressTracker - 进度追踪器
   */
  constructor(eventBus, dailyManager, progressTracker) {
    this.#eventBus = eventBus;
    this.#dailyManager = dailyManager;
    this.#progressTracker = progressTracker;
    this.#loadSession();
  }

  // ==================== 会话管理 ====================

  /**
   * 开始新的每日学习会话
   * @returns {Object} 会话对象
   */
  startDailySession() {
    const today = this.#getToday();
    const currentQuiz = this.#dailyManager.getTodayProgress().quizzesCompleted + 1;

    // 检查是否已完成今日目标
    if (currentQuiz > LEARNING.DAILY_QUIZ_COUNT) {
      return null;
    }

    this.#session = {
      date: today,
      currentQuiz,
      startTime: new Date().toISOString(),
      questions: [],
      answers: [],
      correctCount: 0,
      wrongCount: 0,
      fuelCoinsEarned: 0,
      gearCoinsEarned: 0,
      combo: 0,
      maxCombo: 0,
      completed: false,
    };

    this.#saveSession();
    this.#eventBus.emit(Events.SESSION_START, {
      quizNumber: currentQuiz,
      totalQuizzes: LEARNING.DAILY_QUIZ_COUNT,
    });

    return this.#session;
  }

  /**
   * 恢复上次未完成的会话
   * @returns {Object|null} 会话对象，无则返回 null
   */
  resumeSession() {
    if (!this.#session) {
      this.#loadSession();
    }

    // 检查会话是否有效
    if (!this.#session) {
      return null;
    }

    // 检查日期是否今天
    if (this.#session.date !== this.#getToday()) {
      this.clearSession();
      return null;
    }

    // 检查是否已完成
    if (this.#session.completed) {
      return null;
    }

    this.#eventBus.emit(Events.SESSION_RESUME, {
      quizNumber: this.#session.currentQuiz,
      answeredCount: this.#session.answers.length,
      totalQuestions: this.#session.questions.length,
    });

    return this.#session;
  }

  /**
   * 检查是否有未完成的会话
   * @returns {boolean}
   */
  hasUnfinishedSession() {
    if (!this.#session) {
      this.#loadSession();
    }

    if (!this.#session) return false;
    if (this.#session.date !== this.#getToday()) return false;
    if (this.#session.completed) return false;

    return this.#session.answers.length < this.#session.questions.length;
  }

  // ==================== 答题进度 ====================

  /**
   * 设置当前套题的题目
   * @param {Array} questions - 题目数组
   */
  setQuestions(questions) {
    if (!this.#session) {
      this.startDailySession();
    }

    this.#session.questions = questions.map(q => ({
      wordId: q.wordId,
      word: q.correctWord || q.word,
      meaning: q.correctMeaning || q.meaning,
      mode: q.mode,
    }));
    this.#saveSession();
  }

  /**
   * 获取当前题目索引
   * @returns {number}
   */
  getCurrentQuestionIndex() {
    if (!this.#session) return 0;
    return this.#session.answers.length;
  }

  /**
   * 获取当前题目
   * @returns {Object|null}
   */
  getCurrentQuestion() {
    if (!this.#session) return null;
    const index = this.getCurrentQuestionIndex();
    return this.#session.questions[index] || null;
  }

  /**
   * 保存答题结果（每题答题后调用）
   * @param {Object} answer - 答题结果
   * @param {number} answer.questionIndex - 题目索引
   * @param {boolean} answer.correct - 是否答对
   * @param {number} answer.selectedIndex - 选择的选项
   * @param {string} answer.mode - 题型
   * @param {number} answer.fuelCoins - 获得的燃油币
   * @param {number} answer.gearCoins - 获得的装备币
   * @returns {Object} 更新后的会话状态
   */
  saveAnswer(answer) {
    if (!this.#session) {
      this.startDailySession();
    }

    // 记录答案
    this.#session.answers.push({
      questionIndex: answer.questionIndex,
      correct: answer.correct,
      selectedIndex: answer.selectedIndex,
      mode: answer.mode,
      timestamp: Date.now(),
    });

    // 更新统计
    if (answer.correct) {
      this.#session.correctCount++;
      this.#session.combo++;
      if (this.#session.combo > this.#session.maxCombo) {
        this.#session.maxCombo = this.#session.combo;
      }
    } else {
      this.#session.wrongCount++;
      this.#session.combo = 0;
    }

    // 累计金币
    this.#session.fuelCoinsEarned += answer.fuelCoins || 0;
    this.#session.gearCoinsEarned += answer.gearCoins || 0;

    // 保存会话
    this.#saveSession();

    // 发送事件
    this.#eventBus.emit(Events.SESSION_SAVE, {
      quizNumber: this.#session.currentQuiz,
      questionIndex: answer.questionIndex,
      totalQuestions: this.#session.questions.length,
    });

    return {
      answeredCount: this.#session.answers.length,
      totalQuestions: this.#session.questions.length,
      combo: this.#session.combo,
      isComplete: this.#session.answers.length >= this.#session.questions.length,
    };
  }

  /**
   * 获取连击奖励
   * @returns {Object} 奖励
   */
  getComboReward() {
    const combo = this.#session?.maxCombo || 0;

    // 检查连击奖励档位
    if (combo >= 10 && REWARDS.combo[10]) {
      return { ...REWARDS.combo[10], combo };
    }
    if (combo >= 7 && REWARDS.combo[7]) {
      return { ...REWARDS.combo[7], combo };
    }
    if (combo >= 5 && REWARDS.combo[5]) {
      return { ...REWARDS.combo[5], combo };
    }
    if (combo >= 3 && REWARDS.combo[3]) {
      return { ...REWARDS.combo[3], combo };
    }

    return { fuel: 0, gear: 0, combo };
  }

  // ==================== 套题完成 ====================

  /**
   * 完成当前套题
   * @returns {Object} 套题结果
   */
  completeQuiz() {
    if (!this.#session) {
      return null;
    }

    this.#session.completed = true;

    // 计算连击奖励
    const comboReward = this.getComboReward();
    const totalFuel = this.#session.fuelCoinsEarned + (comboReward.fuel || 0) + REWARDS.perQuizComplete.fuel;
    const totalGear = this.#session.gearCoinsEarned + (comboReward.gear || 0) + REWARDS.perQuizComplete.gear;

    const result = {
      quizNumber: this.#session.currentQuiz,
      totalQuestions: this.#session.questions.length,
      correctCount: this.#session.correctCount,
      wrongCount: this.#session.wrongCount,
      accuracy: this.#session.questions.length > 0
        ? Math.round((this.#session.correctCount / this.#session.questions.length) * 100)
        : 0,
      fuelCoins: totalFuel,
      gearCoins: totalGear,
      maxCombo: this.#session.maxCombo,
      comboReward,
      duration: this.#calculateDuration(),
    };

    // 通知 DailyManager
    this.#dailyManager.completeQuiz({
      totalQuestions: result.totalQuestions,
      correctCount: result.correctCount,
      fuelCoins: result.fuelCoins,
      gearCoins: result.gearCoins,
    });

    // 发送完成事件
    this.#eventBus.emit(Events.QUIZ_COMPLETE, result);

    return result;
  }

  /**
   * 计算答题时长
   * @returns {number} 秒数
   */
  #calculateDuration() {
    if (!this.#session || this.#session.answers.length === 0) {
      return 0;
    }

    const start = new Date(this.#session.startTime).getTime();
    const end = this.#session.answers[this.#session.answers.length - 1].timestamp;
    return Math.round((end - start) / 1000);
  }

  // ==================== 今日状态 ====================

  /**
   * 获取当前是第几套题（1-3）
   * @returns {number}
   */
  getCurrentQuizNumber() {
    if (this.#session && !this.#session.completed) {
      return this.#session.currentQuiz;
    }
    return this.#dailyManager.getTodayProgress().quizzesCompleted + 1;
  }

  /**
   * 获取今日累计金币
   * @returns {{ fuel: number, gear: number }}
   */
  getTodayEarnings() {
    const progress = this.#dailyManager.getTodayProgress();
    return {
      fuel: progress.fuelCoinsEarned,
      gear: progress.gearCoinsEarned,
    };
  }

  /**
   * 检查是否可以开始下一套题
   * @returns {boolean}
   */
  canStartNextQuiz() {
    return this.#dailyManager.canContinueQuiz();
  }

  /**
   * 获取今日答题统计
   * @returns {Object}
   */
  getTodayStats() {
    const progress = this.#dailyManager.getTodayProgress();
    return {
      quizzesCompleted: progress.quizzesCompleted,
      remainingQuizzes: this.#dailyManager.getRemainingQuizzes(),
      totalFuelCoins: progress.fuelCoinsEarned,
      totalGearCoins: progress.gearCoinsEarned,
    };
  }

  // ==================== 持久化 ====================

  /**
   * 保存会话到存储
   */
  #saveSession() {
    if (!this.#session) return;

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.#session));
    } catch (e) {
      console.warn('[QuizSessionManager] Failed to save session:', e);
    }
  }

  /**
   * 从存储加载会话
   */
  #loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        this.#session = JSON.parse(raw);
      }
    } catch (e) {
      this.#session = null;
    }
  }

  /**
   * 清除会话
   */
  clearSession() {
    this.#session = null;
    localStorage.removeItem(SESSION_KEY);
    this.#eventBus.emit(Events.SESSION_CLEAR, {});
  }

  /**
   * 获取当前会话
   * @returns {Object|null}
   */
  getCurrentSession() {
    return this.#session;
  }

  // ==================== 工具方法 ====================

  /**
   * 获取今日日期
   * @returns {string}
   */
  #getToday() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 检查当前会话是否有效
   * @returns {boolean}
   */
  isSessionValid() {
    if (!this.#session) return false;
    if (this.#session.date !== this.#getToday()) return false;
    if (this.#session.completed) return false;
    return true;
  }

  /**
   * 获取答题进度百分比
   * @returns {number}
   */
  getProgressPercentage() {
    if (!this.#session || this.#session.questions.length === 0) {
      return 0;
    }
    return Math.round((this.#session.answers.length / this.#session.questions.length) * 100);
  }
}
