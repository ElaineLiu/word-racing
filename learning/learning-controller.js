/**
 * LearningController - 学习系统主控制器
 *
 * 职责：
 * - 初始化并协调所有学习模块
 * - 连接 UI 与学习逻辑
 * - 处理答题流程
 *
 * ISSUE_LOG 注意事项：
 * - #005: 集成测试必须验证方法被调用，不能只测功能存在
 * - #007: 所有公开方法（如 getAchievements）必须在设计文档和实现中都存在
 * - 新增公开方法时，务必检查是否被 UI 组件正确调用
 */

import { EventBus, Events } from '../core/event-bus.js';
import { GameState } from '../core/game-state.js';
import { ProgressTracker } from './progress-tracker.js';
import { DailyManager } from './daily-manager.js';
import { QuizSessionManager } from './quiz-session.js';
import { AdaptiveSelector } from './adaptive-selector.js';
import { LearningUI } from '../ui/learning-ui.js';
import { AchievementManager } from '../systems/achievement-manager.js';
import { LEARNING, REWARDS } from '../config/learning-config.js';

export class LearningController {
  #eventBus;
  #userId;
  #gameState;
  #progressTracker;
  #dailyManager;
  #sessionManager;
  #adaptiveSelector;
  #achievementManager;
  #learningUI;
  #wordSet = [];
  #currentQuestions = [];
  #modePreference = LEARNING.MODE_PREFERENCE.AUTO; // 题型偏好

  /**
   * @param {EventBus} eventBus - 可选的事件总线，不传则自建（向后兼容）
   * @param {string} userId - 用户ID
   */
  constructor(eventBus = null, userId = 'default') {
    this.#eventBus = eventBus ?? new EventBus();
    this.#userId = userId;
    this.#gameState = new GameState(this.#eventBus, userId);
    this.#progressTracker = new ProgressTracker(this.#eventBus, 'shanghai-zhongkao', userId);
    this.#dailyManager = new DailyManager(this.#eventBus, this.#gameState, userId);
    this.#sessionManager = new QuizSessionManager(this.#eventBus, this.#dailyManager, this.#progressTracker, userId);
    this.#achievementManager = new AchievementManager(this.#eventBus, this.#gameState);
    this.#adaptiveSelector = null;
    this.#learningUI = null;
  }

  // ==================== 初始化 ====================

  /**
   * 初始化学习系统
   * @param {Array} wordSet - 词库数组
   * @param {Object} options - 配置选项
   * @param {boolean} options.skipUI - 跳过 UI 初始化（用于测试）
   */
  init(wordSet, options = {}) {
    this.#wordSet = wordSet;
    this.#adaptiveSelector = new AdaptiveSelector(
      this.#eventBus,
      this.#progressTracker,
      wordSet,
      LEARNING.MAX_LEVEL,
      LEARNING.MIN_LEVEL
    );

    // 初始化 UI（可选）
    if (!options.skipUI) {
      this.#learningUI = new LearningUI(
        this.#eventBus,
        this.#progressTracker,
        this.#dailyManager,
        this.#sessionManager
      );

      // 创建 UI 面板
      this.#learningUI.createContainer('#learning-panel-container');

      // 更新 UI
      this.#learningUI.update();
    }

    return this;
  }

  /**
   * 检查是否有未完成的会话，并显示续答提示（方案 B：只在进入 Quiz 页时调用）
   */
  promptResumeQuiz(callbacks = {}) {
    if (!this.#learningUI || !this.#sessionManager.hasUnfinishedSession()) {
      return false;
    }

    this.#learningUI.showResumePrompt({
      onContinue: () => {
        const result = this.resumeSession();
        if (result) callbacks.onContinue?.(result);
        return result;
      },
      onRestart: () => {
        const result = this.startNewQuiz();
        if (result) callbacks.onRestart?.(result);
        return result;
      },
    });

    return true;
  }

  /**
   * 检查是否有未完成的会话（用于外部判断）
   */
  hasUnfinishedSession() {
    return this.#sessionManager.hasUnfinishedSession();
  }

  // ==================== 答题流程 ====================

  /**
   * 开始新的套题
   * @param {Object} options - 选项
   * @returns {Array} 题目数组
   */
  startNewQuiz(options = {}) {
    // 清除旧会话
    this.#sessionManager.clearSession();

    // 开始新会话
    const session = this.#sessionManager.startDailySession();
    if (!session) {
      console.log('[LearningController] Daily quota reached');
      return null;
    }

    // 检查词库是否为空
    if (!this.#wordSet || this.#wordSet.length === 0) {
      console.error('[LearningController] wordSet is empty');
      return [];
    }

    // 生成题目（传递题型偏好）
    this.#currentQuestions = this.#adaptiveSelector.buildQuiz({
      ...options,
      modePreference: this.#modePreference,
    });

    // 设置会话题目
    this.#sessionManager.setQuestions(this.#currentQuestions);

    // 更新 UI（可选）
    this.#learningUI?.update();

    return this.#currentQuestions;
  }

  /**
   * 恢复未完成的会话
   */
  resumeSession() {
    const session = this.#sessionManager.resumeSession();
    if (!session) return null;

    this.#currentQuestions = session.questions;
    return this.#currentQuestions;
  }

  /**
   * 获取当前题目
   */
  getCurrentQuestion() {
    const index = this.#sessionManager.getCurrentQuestionIndex();
    return this.#currentQuestions[index] || null;
  }

  /**
   * 提交答案
   * @param {number} selectedIndex - 选择的选项索引
   * @returns {Object} 答题结果
   */
  submitAnswer(selectedIndex) {
    const question = this.getCurrentQuestion();

    // Debug logging
    console.log('[LearningController] submitAnswer called', {
      selectedIndex,
      hasQuestion: !!question,
      answered: question?.answered,
      correctIndex: question?.correctIndex,
      timestamp: Date.now()
    });

    if (!question) return null;

    // Check if already answered (prevent duplicate submission)
    if (question.answered) {
      console.warn('[LearningController] Question already answered, ignoring duplicate submission');
      return null;
    }

    const correct = selectedIndex === question.correctIndex;
    const currentQuiz = this.#sessionManager.getCurrentSession();

    // 计算奖励
    let fuelCoins = 0;
    let gearCoins = 0;
    if (correct) {
      if (question.mode === 'PIT_BOARD' || question.mode === 'STRATEGY') {
        fuelCoins = REWARDS.perCorrectSimple.fuel;
        gearCoins = REWARDS.perCorrectSimple.gear;
      } else {
        fuelCoins = REWARDS.perCorrectComplex.fuel;
        gearCoins = REWARDS.perCorrectComplex.gear;
      }
    }

    // 保存答案
    const result = this.#sessionManager.saveAnswer({
      questionIndex: currentQuiz.answers.length,
      correct,
      selectedIndex,
      mode: question.mode,
      fuelCoins,
      gearCoins,
    });

    // Mark question as answered
    question.answered = true;
    question.selected = selectedIndex;
    question.correct = correct;

    // 更新单词进度
    const wordText = question.correctWord || question.word;
    const prevStatus = this.#progressTracker.getStatus(wordText)?.status;
    const newProgress = this.#progressTracker.updateStatus(wordText, question.mode, correct, question.wordId);

    // 持久化单词进度
    this.#progressTracker.save();

    // 更新统计：是否首次见到这个单词
    const isNewlySeen = !prevStatus || prevStatus === 'unlearned';
    if (isNewlySeen) {
      this.#gameState.modify('learning.totalWordsSeen', 1);
    }

    // 更新统计：是否新掌握这个单词
    const isNowMastered = newProgress.status === 'mastered' && prevStatus !== 'mastered';
    if (isNowMastered) {
      this.#gameState.modify('learning.totalWordsMastered', 1);
    }

    // 更新每日进度
    const isNewWord = correct && isNewlySeen;
    const isReview = question.isReview;

    this.#dailyManager.updateProgress({
      correct,
      mode: question.mode,
      fuelCoins,
      gearCoins,
      combo: result.combo,
      isNewWord,
      isReview,
    });

    // 显示奖励动画
    if (correct) {
      this.#learningUI?.showReward(fuelCoins, gearCoins);
    }

    return {
      correct,
      correctIndex: question.correctIndex,
      selectedIndex,
      combo: result.combo,
      isComplete: result.isComplete,
      fuelCoins,
      gearCoins,
    };
  }

  /**
   * 完成当前套题
   */
  completeQuiz() {
    const result = this.#sessionManager.completeQuiz();
    if (!result) return null;

    // DailyManager.completeQuiz 已更新 learning.totalQuizzes/totalQuestions/totalCorrect
    // 这里只更新 lastPerfectQuiz（DailyManager 不负责此字段）
    const isPerfect = result.correctCount === result.totalQuestions && result.totalQuestions > 0;
    this.#gameState.set('learning.lastPerfectQuiz', isPerfect);

    // 正确率奖励（装备币）
    const accuracy = result.totalQuestions > 0
      ? result.correctCount / result.totalQuestions
      : 0;
    let accuracyBonus = { gear: 0 };
    if (accuracy >= 1.0) {
      accuracyBonus = REWARDS.accuracyBonus[100];
    } else if (accuracy >= 0.8) {
      accuracyBonus = REWARDS.accuracyBonus[80];
    } else if (accuracy >= 0.6) {
      accuracyBonus = REWARDS.accuracyBonus[60];
    }
    if (accuracyBonus.gear > 0) {
      this.#gameState.modify('gearCoins', accuracyBonus.gear);
    }

    // 触发成就检查（解锁条件满足时会自动发放奖励）
    this.#achievementManager.checkAll();

    // 更新 UI（可选）
    this.#learningUI?.update();
    this.#learningUI?.showQuizComplete({ ...result, accuracyBonus });

    return { ...result, accuracyBonus };
  }

  /**
   * 检查套题是否完成
   */
  isQuizComplete() {
    const session = this.#sessionManager.getCurrentSession();
    if (!session) return true;
    return session.answers.length >= session.questions.length;
  }

  // ==================== 查询方法 ====================

  /**
   * 获取当前题目索引
   */
  getCurrentQuestionIndex() {
    return this.#sessionManager.getCurrentQuestionIndex();
  }

  /**
   * 获取当前套题状态
   */
  getSessionStatus() {
    const session = this.#sessionManager.getCurrentSession();
    if (!session) return null;

    return {
      currentQuiz: session.currentQuiz,
      totalQuizzes: LEARNING.DAILY_QUIZ_COUNT,
      answeredCount: session.answers.length,
      totalQuestions: session.questions.length,
      correctCount: session.correctCount,
      wrongCount: session.wrongCount,
      combo: session.combo,
      maxCombo: session.maxCombo,
    };
  }

  /**
   * 获取每日进度
   */
  getDailyProgress() {
    return this.#dailyManager.getTodayProgress();
  }

  /**
   * 获取单词统计
   */
  getWordStats() {
    return this.#progressTracker.getStats();
  }

  /**
   * 获取选题统计
   */
  getSelectionStats() {
    return this.#adaptiveSelector?.getSelectionStats() || null;
  }

  /**
   * 预览下一套题
   */
  previewNextQuiz() {
    return this.#adaptiveSelector?.previewNextQuiz() || null;
  }

  /**
   * 获取当前会话
   */
  getCurrentSession() {
    return this.#sessionManager.getCurrentSession();
  }

  /**
   * 检查是否可以开始新套题
   */
  canStartNewQuiz() {
    return this.#dailyManager.canContinueQuiz();
  }

  /**
   * 获取今日收益
   */
  getTodayEarnings() {
    return this.#sessionManager.getTodayEarnings();
  }

  // ==================== 设置方法 ====================

  /**
   * 更新词库
   */
  setWordSet(wordSet) {
    this.#wordSet = wordSet;
    this.#adaptiveSelector?.setWordSet(wordSet);
  }

  /**
   * 更新最小难度
   */
  setMinLevel(minLevel) {
    this.#adaptiveSelector?.setMinLevel(minLevel);
  }

  /**
   * 更新最大难度
   */
  setMaxLevel(maxLevel) {
    this.#adaptiveSelector?.setMaxLevel(maxLevel);
  }

  /**
   * 设置题型偏好
   * @param {string} preference - 'auto' | 'simple' | 'complex'
   */
  setModePreference(preference) {
    this.#modePreference = preference;
  }

  /**
   * 获取题型偏好
   * @returns {string}
   */
  getModePreference() {
    return this.#modePreference;
  }

  /**
   * 更新难度范围
   */
  setLevelRange(minLevel, maxLevel) {
    this.#adaptiveSelector?.setLevelRange(minLevel, maxLevel);
  }

  // ==================== 模块访问器 ====================

  get eventBus() {
    return this.#eventBus;
  }

  get gameState() {
    return this.#gameState;
  }

  get progressTracker() {
    return this.#progressTracker;
  }

  get dailyManager() {
    return this.#dailyManager;
  }

  get sessionManager() {
    return this.#sessionManager;
  }

  get adaptiveSelector() {
    return this.#adaptiveSelector;
  }

  get achievementManager() {
    return this.#achievementManager;
  }

  /**
   * 获取所有成就状态（供 UI 显示）
   * @returns {Array<Object>}
   */
  getAchievements() {
    return this.#achievementManager.getAllStatus();
  }

  get learningUI() {
    return this.#learningUI;
  }
}
