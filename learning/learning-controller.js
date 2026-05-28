/**
 * LearningController - 学习系统主控制器
 *
 * 职责：
 * - 初始化并协调所有学习模块
 * - 连接 UI 与学习逻辑
 * - 处理答题流程
 */

import { EventBus, Events } from '../core/event-bus.js';
import { GameState } from '../core/game-state.js';
import { ProgressTracker } from './progress-tracker.js';
import { DailyManager } from './daily-manager.js';
import { QuizSessionManager } from './quiz-session.js';
import { AdaptiveSelector } from './adaptive-selector.js';
import { LearningUI } from '../ui/learning-ui.js';
import { LEARNING, REWARDS } from '../config/learning-config.js';

export class LearningController {
  #eventBus;
  #gameState;
  #progressTracker;
  #dailyManager;
  #sessionManager;
  #adaptiveSelector;
  #learningUI;
  #wordSet = [];
  #currentQuestions = [];
  #modePreference = LEARNING.MODE_PREFERENCE.AUTO; // 题型偏好

  constructor() {
    this.#eventBus = new EventBus();
    this.#gameState = new GameState(this.#eventBus);
    this.#progressTracker = new ProgressTracker(this.#eventBus);
    this.#dailyManager = new DailyManager(this.#eventBus, this.#gameState);
    this.#sessionManager = new QuizSessionManager(this.#eventBus, this.#dailyManager, this.#progressTracker);
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

      // 检查是否有未完成的会话
      this.#checkResumeSession();

      // 更新 UI
      this.#learningUI.update();
    }

    return this;
  }

  /**
   * 检查是否有未完成的会话
   */
  #checkResumeSession() {
    if (this.#sessionManager.hasUnfinishedSession() && this.#learningUI) {
      // 显示断点续答提示
      this.#learningUI.showResumePrompt({
        onContinue: () => this.resumeSession(),
        onRestart: () => this.startNewQuiz(),
      });
    }
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
    if (!session) {
      return this.startNewQuiz();
    }

    // 会话恢复成功，但需要重新生成完整的题目（包含选项）
    // 因为存储的只有 wordId 和 mode，没有 options 和 correctIndex
    // 为了简化，直接开始新的一套题
    this.#sessionManager.clearSession();
    return this.startNewQuiz();
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
    if (!question) return null;

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

    // 显示连击动画
    if (correct && result.combo >= 3) {
      this.#learningUI?.showCombo(result.combo);
    }

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

    // 更新 UI（可选）
    this.#learningUI?.update();
    this.#learningUI?.showQuizComplete(result);

    return result;
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

  get learningUI() {
    return this.#learningUI;
  }
}
