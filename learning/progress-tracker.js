/**
 * ProgressTracker - 单词掌握状态追踪
 *
 * 职责：
 * - 追踪每个单词的学习状态（惰性存储）
 * - 处理状态转换逻辑
 * - 提供查询方法供出题算法使用
 * - 持久化到 localStorage
 */

import { Events } from '../core/event-bus.js';
import {
  MASTERY_STATUS,
  QUESTION_MODES,
  isSimpleMode,
  isComplexMode,
  createDefaultProgress,
  LEARNING,
} from '../config/learning-config.js';

// 存储键
const STORAGE_KEY = LEARNING.STORAGE_KEYS.WORD_PROGRESS;

/**
 * ProgressTracker - 单词进度追踪器
 */
export class ProgressTracker {
  #eventBus;
  #wordSetId;
  #progress = new Map(); // word -> WordProgress
  #dirty = false;        // 是否有未保存的更改

  /**
   * @param {EventBus} eventBus - 事件总线
   * @param {string} [wordSetId] - 词库ID
   */
  constructor(eventBus, wordSetId = 'shanghai-zhongkao') {
    this.#eventBus = eventBus;
    this.#wordSetId = wordSetId;
    this.#load();
  }

  // ==================== 状态获取 ====================

  /**
   * 获取单个单词的状态
   * @param {string} wordText - 单词文本
   * @returns {Object|null} 进度对象，不存在返回 null
   */
  getStatus(wordText) {
    return this.#progress.get(wordText) || null;
  }

  /**
   * 批量获取单词状态
   * @param {string[]} wordTexts - 单词文本数组
   * @returns {Map<string, Object>}
   */
  getStatuses(wordTexts) {
    const result = new Map();
    for (const word of wordTexts) {
      const status = this.#progress.get(word);
      if (status) {
        result.set(word, status);
      }
    }
    return result;
  }

  /**
   * 检查单词是否已掌握
   * @param {string} wordText
   * @returns {boolean}
   */
  isMastered(wordText) {
    const progress = this.#progress.get(wordText);
    return progress?.status === MASTERY_STATUS.MASTERED;
  }

  /**
   * 检查单词是否需要复习（错词）
   * @param {string} wordText
   * @returns {boolean}
   */
  needsReview(wordText) {
    const progress = this.#progress.get(wordText);
    if (!progress) return false;
    // 有答错记录的需要复习
    return progress.simpleWrongCount > 0 || progress.complexWrongCount > 0;
  }

  // ==================== 状态更新 ====================

  /**
   * 更新单词状态（答题后调用）
   * @param {string} wordText - 单词文本
   * @param {string} mode - 题型
   * @param {boolean} correct - 是否答对
   * @param {number} [wordId] - 单词ID
   * @returns {Object} 更新后的状态
   */
  updateStatus(wordText, mode, correct, wordId = null) {
    let progress = this.#progress.get(wordText);
    const today = new Date().toISOString().split('T')[0];

    // 首次出现
    if (!progress) {
      progress = createDefaultProgress(wordText, wordId);
      progress.firstSeenDate = today;
      progress.lastSeenDate = today;
      this.#progress.set(wordText, progress);
    } else {
      progress.lastSeenDate = today;
    }

    const previousStatus = progress.status;

    // 更新答对/答错计数
    if (correct) {
      this.#handleCorrect(progress, mode);
    } else {
      this.#handleWrong(progress, mode);
    }

    // 计算新状态
    this.#updateMasteryStatus(progress, today);

    // 发送事件
    if (progress.status !== previousStatus) {
      this.#emitStatusChange(wordText, previousStatus, progress.status);
    }

    this.#dirty = true;
    return progress;
  }

  /**
   * 处理答对逻辑
   */
  #handleCorrect(progress, mode) {
    if (isSimpleMode(mode)) {
      progress.simpleCorrect = true;
    } else if (isComplexMode(mode)) {
      progress.complexCorrect = true;
    }
  }

  /**
   * 处理答错逻辑
   */
  #handleWrong(progress, mode) {
    if (isSimpleMode(mode)) {
      progress.simpleWrongCount++;
      // 答错时重置该题型的通过状态
      progress.simpleCorrect = false;
    } else if (isComplexMode(mode)) {
      progress.complexWrongCount++;
      // 答错时重置该题型的通过状态
      progress.complexCorrect = false;
    }
  }

  /**
   * 更新掌握状态
   * 状态转换规则：
   * - unlearned → exposed (首次出现，无论对错)
   * - exposed → simple_passed (简单题答对)
   * - exposed → complex_passed (复杂题答对)
   * - simple_passed/complex_passed/exposed → mastered (两种题型都通过)
   * - mastered → forgotten (已掌握后答错)
   * - forgotten → exposed (重新学习)
   */
  #updateMasteryStatus(progress, today) {
    const { status, simpleCorrect, complexCorrect } = progress;

    // 已掌握后，检查是否需要降级
    if (status === MASTERY_STATUS.MASTERED) {
      // 只要有一种题型不再通过，就变成 forgotten
      if (!simpleCorrect || !complexCorrect) {
        progress.status = MASTERY_STATUS.FORGOTTEN;
        progress.masteryDate = null;
        return;
      }
      // 仍然 mastered，不需要更新
      return;
    }

    // forgotten → exposed (重新开始学习)
    if (status === MASTERY_STATUS.FORGOTTEN) {
      progress.status = MASTERY_STATUS.EXPOSED;
      return;
    }

    // 如果两种题型都通过了 → mastered
    if (simpleCorrect && complexCorrect) {
      progress.status = MASTERY_STATUS.MASTERED;
      progress.masteryDate = today;
      return;
    }

    // 根据当前状态和答题情况更新
    if (status === MASTERY_STATUS.UNLEARNED) {
      // 首次出现变为 exposed
      progress.status = MASTERY_STATUS.EXPOSED;
    }

    // exposed 或 simple_passed/complex_passed 状态下
    if (simpleCorrect && !complexCorrect) {
      progress.status = MASTERY_STATUS.SIMPLE_PASSED;
    } else if (!simpleCorrect && complexCorrect) {
      progress.status = MASTERY_STATUS.COMPLEX_PASSED;
    } else if (!simpleCorrect && !complexCorrect) {
      // 两种都没通过，保持 exposed
      progress.status = MASTERY_STATUS.EXPOSED;
    }
  }

  /**
   * 发送状态变更事件
   */
  #emitStatusChange(wordText, previousStatus, newStatus) {
    this.#eventBus.emit(Events.WORD_STATUS_CHANGED, {
      word: wordText,
      previousStatus,
      newStatus,
    });

    if (newStatus === MASTERY_STATUS.MASTERED) {
      this.#eventBus.emit(Events.WORD_MASTERED, { word: wordText });
    }

    if (newStatus === MASTERY_STATUS.FORGOTTEN) {
      this.#eventBus.emit(Events.WORD_FORGOTTEN, { word: wordText });
    }
  }

  // ==================== 查询方法 ====================

  /**
   * 获取需要复习的词（有答错记录）
   * @returns {Array<Object>}
   */
  getWrongWords() {
    const result = [];
    for (const progress of this.#progress.values()) {
      if (progress.simpleWrongCount > 0 || progress.complexWrongCount > 0) {
        if (progress.status !== MASTERY_STATUS.MASTERED) {
          result.push(progress);
        }
      }
    }
    // 按错误次数排序（多的优先）
    return result.sort((a, b) => {
      const aErrors = a.simpleWrongCount + a.complexWrongCount;
      const bErrors = b.simpleWrongCount + b.complexWrongCount;
      return bErrors - aErrors;
    });
  }

  /**
   * 获取待检查的词（单题型通过，需要另一题型验证）
   * @returns {{ needSimpleCheck: Object[], needComplexCheck: Object[] }}
   */
  getCheckWords() {
    const needSimpleCheck = [];
    const needComplexCheck = [];

    for (const progress of this.#progress.values()) {
      if (progress.status === MASTERY_STATUS.SIMPLE_PASSED) {
        needComplexCheck.push(progress);
      } else if (progress.status === MASTERY_STATUS.COMPLEX_PASSED) {
        needSimpleCheck.push(progress);
      }
    }

    return { needSimpleCheck, needComplexCheck };
  }

  /**
   * 获取已掌握的词
   * @returns {Array<Object>}
   */
  getMasteredWords() {
    const result = [];
    for (const progress of this.#progress.values()) {
      if (progress.status === MASTERY_STATUS.MASTERED) {
        result.push(progress);
      }
    }
    return result;
  }

  /**
   * 获取正在学习的词（非未学习、非已掌握）
   * @returns {Array<Object>}
   */
  getLearningWords() {
    const result = [];
    for (const progress of this.#progress.values()) {
      if (progress.status !== MASTERY_STATUS.UNLEARNED &&
          progress.status !== MASTERY_STATUS.MASTERED) {
        result.push(progress);
      }
    }
    return result;
  }

  /**
   * 获取统计信息
   * @returns {{ total: number, mastered: number, learning: number, unlearned: number }}
   */
  getStats() {
    let mastered = 0;
    let learning = 0;

    for (const progress of this.#progress.values()) {
      if (progress.status === MASTERY_STATUS.MASTERED) {
        mastered++;
      } else if (progress.status !== MASTERY_STATUS.UNLEARNED) {
        learning++;
      }
    }

    return {
      total: this.#progress.size,
      mastered,
      learning,
      unlearned: Math.max(0, this.#progress.size - mastered - learning),
    };
  }

  /**
   * 获取所有进度数据
   * @returns {Object}
   */
  getAllProgress() {
    const result = {};
    for (const [word, progress] of this.#progress) {
      result[word] = progress;
    }
    return result;
  }

  // ==================== 持久化 ====================

  /**
   * 保存到 localStorage
   */
  save() {
    if (!this.#dirty) return;

    try {
      const data = {
        wordSetId: this.#wordSetId,
        progress: this.getAllProgress(),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.#dirty = false;
    } catch (e) {
      console.warn('[ProgressTracker] Failed to save:', e);
    }
  }

  /**
   * 从 localStorage 加载
   */
  #load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);

      // 只加载当前词库的进度（可选：支持多词库）
      if (data.progress) {
        for (const [word, progress] of Object.entries(data.progress)) {
          this.#progress.set(word, progress);
        }
      }
    } catch (e) {
      console.warn('[ProgressTracker] Failed to load:', e);
    }
  }

  /**
   * 清除所有进度
   */
  clear() {
    this.#progress.clear();
    this.#dirty = true;
    this.save();
    localStorage.removeItem(STORAGE_KEY);
  }

  // ==================== 工具方法 ====================

  /**
   * 设置词库ID
   * @param {string} wordSetId
   */
  setWordSetId(wordSetId) {
    this.#wordSetId = wordSetId;
  }

  /**
   * 获取词库ID
   * @returns {string}
   */
  getWordSetId() {
    return this.#wordSetId;
  }

  /**
   * 检查是否有未保存的更改
   * @returns {boolean}
   */
  isDirty() {
    return this.#dirty;
  }
}
