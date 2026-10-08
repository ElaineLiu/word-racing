/**
 * AdaptiveSelector - 自适应选题算法
 *
 * 职责：
 * - 根据单词掌握状态智能选题
 * - 错词优先复习
 * - 单题型通过后出另一题型检查
 * - 新词填充
 * - 确保题型分布合理
 */

import { Events } from '../core/event-bus.js';
import { MASTERY_STATUS, LEARNING, DEFAULT_QUESTION_MODES } from '../config/learning-config.js';
import { QuestionFactory } from '../js/question-factory.js';
import { getMasteryGroup } from '../config/reward-policy.js';
import { localDate } from './assessment-policy.js';

/**
 * AdaptiveSelector - 自适应选题器
 */
export class AdaptiveSelector {
  #eventBus;
  #progressTracker;
  #wordSet;
  #minLevel;
  #maxLevel;

  /**
   * @param {EventBus} eventBus - 事件总线
   * @param {ProgressTracker} progressTracker - 进度追踪器
   * @param {Array} wordSet - 词库数组
   * @param {number} maxLevel - 最大难度级别
   * @param {number} minLevel - 最小难度级别
   */
  constructor(eventBus, progressTracker, wordSet, maxLevel = LEARNING.MAX_LEVEL, minLevel = LEARNING.MIN_LEVEL) {
    this.#eventBus = eventBus;
    this.#progressTracker = progressTracker;
    this.#wordSet = wordSet;
    this.#maxLevel = maxLevel;
    this.#minLevel = minLevel;
  }

  // ==================== 主选题方法 ====================

  /**
   * 构建一套题
   * @param {Object} options - 选项
   * @param {number} options.count - 题目数量（默认10）
   * @param {boolean} options.useChinese - 是否使用中文选项
   * @param {string} options.preferredMode - 默认题型偏好
   * @param {string} options.modePreference - 题型偏好模式：'auto' | 'simple' | 'complex'
   * @returns {Array} 题目数组
   */
  buildQuiz(options = {}) {
    const count = options.count || LEARNING.QUIZ_QUESTION_COUNT;
    const useChinese = options.useChinese !== false;
    const preferredMode = options.preferredMode || 'PIT_BOARD';
    const modePreference = options.modePreference || LEARNING.MODE_PREFERENCE.AUTO;
    const verificationOnly = options.verificationOnly === true;

    const questions = [];
    const usedWordIds = new Set();
    const eligibleWords = this.#getEligibleWords();

    // 检查是否有足够的词
    if (eligibleWords.length === 0) {
      console.error('[AdaptiveSelector] No eligible words available');
      return [];
    }

    // 1. 错词复习（最多 MAX_REVIEW_PER_QUIZ 题）
    const reviewQuestions = this.#selectReviewWords(
      verificationOnly ? 0 : Math.min(LEARNING.MAX_REVIEW_PER_QUIZ, count),
      eligibleWords,
      usedWordIds,
      useChinese,
      modePreference
    );
    questions.push(...reviewQuestions);

    // 2. 检查词（单题型通过，需另一题型验证）
    const remainingAfterReview = count - questions.length;
    const checkQuestions = this.#selectCheckWords(
      verificationOnly ? remainingAfterReview : Math.min(LEARNING.MAX_CHECK_WORDS_PER_QUIZ * 2, remainingAfterReview),
      eligibleWords,
      usedWordIds,
      useChinese,
      modePreference
    );
    questions.push(...checkQuestions);

    // 3. 新词填充到指定数量
    const remainingCount = verificationOnly ? 0 : count - questions.length;
    const newQuestions = this.#selectNewWords(
      remainingCount,
      eligibleWords,
      usedWordIds,
      useChinese,
      preferredMode,
      modePreference
    );
    questions.push(...newQuestions);

    // 过滤掉 null/undefined
    const validQuestions = questions.filter(q => q && q.options);

    // 打乱顺序（但保持复习题不会连续太多）
    const shuffled = this.#shuffleQuestions(validQuestions);

    // 发送事件
    this.#eventBus.emit(Events.QUIZ_BUILT, {
      total: shuffled.length,
      reviewCount: reviewQuestions.length,
      checkCount: checkQuestions.length,
      newCount: newQuestions.length,
    });

    return shuffled;
  }

  // ==================== 错词复习 ====================

  /**
   * 选择需要复习的错词
   */
  #selectReviewWords(maxCount, eligibleWords, usedWordIds, useChinese, modePreference) {
    const questions = [];
    const wrongWords = this.#progressTracker.getWrongWords();

    if (wrongWords.length === 0) return questions;

    // 按错误次数排序，多的优先
    const sorted = [...wrongWords].sort((a, b) => {
      const aErrors = a.simpleWrongCount + a.complexWrongCount;
      const bErrors = b.simpleWrongCount + b.complexWrongCount;
      return bErrors - aErrors;
    });

    for (let i = 0; i < sorted.length && questions.length < maxCount; i++) {
      const progress = sorted[i];
      const wordData = this.#findWordData(progress.word, progress.wordId);

      if (!wordData || usedWordIds.has(wordData.id)) continue;

      // 选择题型：根据用户偏好
      const mode = this.#selectModeForWrongWord(progress, modePreference);

      const question = this.#createQuestion(wordData, mode, eligibleWords, useChinese, true);
      if (question) {
        questions.push(question);
        usedWordIds.add(wordData.id);
      }
    }

    // 发送复习选题事件
    if (questions.length > 0) {
      this.#eventBus.emit(Events.REVIEW_WORDS_SELECTED, {
        count: questions.length,
        words: questions.map(q => q.correctWord || q.word),
      });
    }

    return questions;
  }

  /**
   * 为错词选择合适的题型
   */
  #selectModeForWrongWord(progress, modePreference) {
    // 如果用户明确选择了简单题或复杂题，按用户选择
    if (modePreference === LEARNING.MODE_PREFERENCE.SIMPLE) {
      return this.#getRandomMode(DEFAULT_QUESTION_MODES.SIMPLE);
    }
    if (modePreference === LEARNING.MODE_PREFERENCE.COMPLEX) {
      return this.#getRandomMode(DEFAULT_QUESTION_MODES.COMPLEX);
    }

    // AUTO 模式：优先选择答错过的题型
    if (progress.complexWrongCount > progress.simpleWrongCount) {
      return this.#getRandomMode(DEFAULT_QUESTION_MODES.COMPLEX);
    } else if (progress.simpleWrongCount > 0) {
      return this.#getRandomMode(DEFAULT_QUESTION_MODES.SIMPLE);
    }
    // 都没错过或都错过，随机
    return this.#getRandomMode([...DEFAULT_QUESTION_MODES.SIMPLE, ...DEFAULT_QUESTION_MODES.COMPLEX]);
  }

  // ==================== 检查词 ====================

  /**
   * 选择需要检查的词（单题型通过）
   */
  #selectCheckWords(maxCount, eligibleWords, usedWordIds, useChinese, modePreference) {
    const questions = [];
    const { needSimpleCheck, needComplexCheck } = this.#progressTracker.getCheckWords();

    // Respect the preferred ability while still verifying previously learned words.
    const allCheckWords = [
      ...needSimpleCheck.map(w => ({ ...w, needMode: 'simple' })),
      ...needComplexCheck.map(w => ({ ...w, needMode: 'complex' })),
    ].filter(p => modePreference === 'auto' || p.needMode === modePreference)
    .sort((a, b) => Number(!!b.legacyEvidence?.complexCorrect) - Number(!!a.legacyEvidence?.complexCorrect) ||
      Number(!!b.pendingVerification) - Number(!!a.pendingVerification) ||
      String(a.lastSeenDate || '').localeCompare(String(b.lastSeenDate || '')));

    for (let i = 0; i < allCheckWords.length && questions.length < maxCount; i++) {
      const progress = allCheckWords[i];
      const wordData = this.#findWordData(progress.word, progress.wordId);

      if (!wordData || progress.available === false || usedWordIds.has(wordData.id)) continue;

      // 根据需要检查的题型选择
      const mode = progress.needMode === 'simple'
        ? this.#getRandomMode(DEFAULT_QUESTION_MODES.SIMPLE)
        : this.#getRandomMode(DEFAULT_QUESTION_MODES.COMPLEX);

      const question = this.#createQuestion(wordData, mode, eligibleWords, useChinese, false);
      if (question && getMasteryGroup(question.mode) === progress.needMode) {
        question.isCheck = true;
        questions.push(question);
        usedWordIds.add(wordData.id);
      }
    }

    return questions;
  }

  // ==================== 新词选择 ====================

  /**
   * 选择新词
   */
  #selectNewWords(count, eligibleWords, usedWordIds, useChinese, preferredMode, modePreference) {
    const questions = [];

    // 过滤出未学过的词
    const unlearnedWords = eligibleWords.filter(word => {
      if (usedWordIds.has(word.id)) return false;
      const progress = this.#progressTracker.getStatus(word.word);
      return !progress || progress.status === MASTERY_STATUS.UNLEARNED;
    });

    // 按难度排序，优先低难度
    const sorted = [...unlearnedWords].sort((a, b) => a.level - b.level);

    for (let i = 0; i < sorted.length && questions.length < count; i++) {
      const wordData = sorted[i];

      // 根据偏好选择题型
      let mode;
      if (modePreference === LEARNING.MODE_PREFERENCE.SIMPLE) {
        mode = this.#getRandomMode(DEFAULT_QUESTION_MODES.SIMPLE);
      } else if (modePreference === LEARNING.MODE_PREFERENCE.COMPLEX) {
        mode = this.#getRandomMode(DEFAULT_QUESTION_MODES.COMPLEX);
      } else {
        // AUTO: 新词先出简单题
        mode = this.#getRandomMode(DEFAULT_QUESTION_MODES.SIMPLE);
      }

      const question = this.#createQuestion(wordData, mode, eligibleWords, useChinese, false);
      if (question) {
        question.isNew = true;
        questions.push(question);
        usedWordIds.add(wordData.id);
      }
    }

    return questions;
  }

  // ==================== 工具方法 ====================

  /**
   * 获取符合难度要求的词
   */
  #getEligibleWords() {
    return this.#wordSet.filter(w => w.level >= this.#minLevel && w.level <= this.#maxLevel);
  }

  /**
   * 查找单词数据
   */
  #findWordData(wordText, wordId) {
    return this.#wordSet.find(w => w.word === wordText);
  }

  /**
   * 创建题目
   */
  #createQuestion(wordData, mode, eligibleWords, useChinese, isReview) {
    try {
      const question = QuestionFactory.createQuestion(
        wordData,
        mode,
        this.#maxLevel,
        eligibleWords,
        useChinese
      );

      if (question && this.#progressTracker.getStatus(wordData.word)?.lastAssistedDate === localDate()) question.assisted = true;
      if (question && isReview) {
        question.isReview = true;
        question.originalMode = question.mode;
      }

      return question;
    } catch (e) {
      console.warn('[AdaptiveSelector] Failed to create question:', e);
      return null;
    }
  }

  /**
   * 从数组中随机选择一个题型
   */
  #getRandomMode(modes) {
    return modes[Math.floor(Math.random() * modes.length)];
  }

  /**
   * 打乱题目顺序（确保复习题不会连续太多）
   */
  #shuffleQuestions(questions) {
    if (questions.length <= 1) return questions;

    // 分离复习题和新题/检查题
    const reviewQuestions = questions.filter(q => q.isReview);
    const otherQuestions = questions.filter(q => !q.isReview);

    // 打乱其他题
    otherQuestions.sort(() => Math.random() - 0.5);

    // 如果没有复习题，直接返回
    if (reviewQuestions.length === 0) {
      return otherQuestions;
    }

    // 将复习题分散插入
    const result = [];
    const spacing = Math.ceil(otherQuestions.length / (reviewQuestions.length + 1)) || 1;

    let otherIndex = 0;
    let reviewIndex = 0;

    while (otherIndex < otherQuestions.length || reviewIndex < reviewQuestions.length) {
      // 先插入若干其他题
      for (let i = 0; i < spacing && otherIndex < otherQuestions.length; i++) {
        result.push(otherQuestions[otherIndex++]);
      }

      // 再插入一个复习题
      if (reviewIndex < reviewQuestions.length) {
        result.push(reviewQuestions[reviewIndex++]);
      }
    }

    return result;
  }

  // ==================== 统计方法 ====================

  /**
   * 获取选题统计信息
   * @returns {Object}
   */
  getSelectionStats() {
    const wrongWords = this.#progressTracker.getWrongWords();
    const { needSimpleCheck, needComplexCheck } = this.#progressTracker.getCheckWords();
    const mastered = this.#progressTracker.getMasteredWords();

    const eligibleWords = this.#getEligibleWords();
    const unlearned = eligibleWords.filter(w => {
      const progress = this.#progressTracker.getStatus(w.word);
      return !progress || progress.status === MASTERY_STATUS.UNLEARNED;
    });

    return {
      totalEligible: eligibleWords.length,
      wrongCount: wrongWords.length,
      checkSimpleCount: needSimpleCheck.length,
      checkComplexCount: needComplexCheck.length,
      masteredCount: mastered.length,
      unlearnedCount: unlearned.length,
    };
  }

  /**
   * 预览下一套题的构成
   * @returns {Object}
   */
  previewNextQuiz() {
    const stats = this.getSelectionStats();

    const reviewCount = Math.min(LEARNING.MAX_REVIEW_PER_QUIZ, stats.wrongCount);
    const remaining = LEARNING.QUIZ_QUESTION_COUNT - reviewCount;

    const checkCount = Math.min(
      LEARNING.MAX_CHECK_WORDS_PER_QUIZ * 2,
      stats.checkSimpleCount + stats.checkComplexCount,
      remaining
    );

    const newCount = LEARNING.QUIZ_QUESTION_COUNT - reviewCount - checkCount;

    return {
      review: reviewCount,
      check: checkCount,
      new: Math.max(0, newCount),
      available: stats.unlearnedCount >= newCount,
    };
  }

  // ==================== 配置方法 ====================

  /**
   * 更新词库
   * @param {Array} wordSet
   */
  setWordSet(wordSet) {
    this.#wordSet = wordSet;
  }

  /**
   * 更新最小难度
   * @param {number} minLevel
   */
  setMinLevel(minLevel) {
    this.#minLevel = minLevel;
  }

  /**
   * 更新最大难度
   * @param {number} maxLevel
   */
  setMaxLevel(maxLevel) {
    this.#maxLevel = maxLevel;
  }

  /**
   * 更新难度范围
   * @param {number} minLevel
   * @param {number} maxLevel
   */
  setLevelRange(minLevel, maxLevel) {
    this.#minLevel = minLevel;
    this.#maxLevel = maxLevel;
  }

  /**
   * 更新进度追踪器
   * @param {ProgressTracker} progressTracker
   */
  setProgressTracker(progressTracker) {
    this.#progressTracker = progressTracker;
  }
}
