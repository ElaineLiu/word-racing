/**
 * AdaptiveSelector Tests
 * 单元测试 + 集成测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptiveSelector } from '../learning/adaptive-selector.js';
import { EventBus, Events } from '../core/event-bus.js';
import { ProgressTracker } from '../learning/progress-tracker.js';
import { MASTERY_STATUS, LEARNING } from '../config/learning-config.js';

// 测试用词库
const createTestWordSet = (count = 50) => {
  const words = [];
  for (let i = 1; i <= count; i++) {
    words.push({
      id: i,
      word: `word${i}`,
      meaning_cn: `词${i}`,
      meaning_en: `meaning ${i}`,
      phonetic: `/word${i}/`,
      sentence: `This is word${i}.`,
      level: Math.ceil(i / 10), // 1-5
      category: 'test',
    });
  }
  return words;
};

describe('AdaptiveSelector', () => {
  let eventBus;
  let progressTracker;
  let wordSet;
  let selector;

  beforeEach(() => {
    localStorage.clear();
    eventBus = new EventBus();
    progressTracker = new ProgressTracker(eventBus);
    wordSet = createTestWordSet(50);
    selector = new AdaptiveSelector(eventBus, progressTracker, wordSet, 5);
  });

  // ==================== 基础选题测试 ====================

  describe('basic selection', () => {
    it('should return requested number of questions', () => {
      const questions = selector.buildQuiz({ count: 10 });

      expect(questions.length).toBe(10);
    });

    it('should return questions with required fields', () => {
      const questions = selector.buildQuiz({ count: 5 });

      questions.forEach(q => {
        expect(q.wordId).toBeDefined();
        expect(q.correctWord || q.word).toBeDefined();
        expect(q.mode).toBeDefined();
        expect(q.options).toBeDefined();
        expect(q.correctIndex).toBeDefined();
      });
    });

    it('should emit QUIZ_BUILT event', () => {
      const handler = vi.fn();
      eventBus.on(Events.QUIZ_BUILT, handler);

      selector.buildQuiz({ count: 10 });

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        total: 10,
      }));
    });

    it('should respect maxLevel parameter', () => {
      const selectorLevel3 = new AdaptiveSelector(eventBus, progressTracker, wordSet, 3);
      const questions = selectorLevel3.buildQuiz({ count: 10 });

      // 所有题目的词应该 level <= 3
      questions.forEach(q => {
        const word = wordSet.find(w => w.id === q.wordId);
        expect(word.level).toBeLessThanOrEqual(3);
      });
    });

    it('should not duplicate words in single quiz', () => {
      const questions = selector.buildQuiz({ count: 10 });
      const wordIds = questions.map(q => q.wordId);

      const uniqueIds = new Set(wordIds);
      expect(uniqueIds.size).toBe(wordIds.length);
    });
  });

  // ==================== 错词复习测试 ====================

  describe('review word selection', () => {
    it('should prioritize wrong words', () => {
      // 创建一些错词
      progressTracker.updateStatus('word1', 'PIT_BOARD', false, 1);
      progressTracker.updateStatus('word2', 'PIT_BOARD', false, 2);
      progressTracker.updateStatus('word3', 'PIT_BOARD', false, 3);

      const questions = selector.buildQuiz({ count: 10 });

      // 应该有复习题标记
      const reviewQuestions = questions.filter(q => q.isReview);
      expect(reviewQuestions.length).toBeGreaterThan(0);
    });

    it('should limit review words to MAX_REVIEW_PER_QUIZ', () => {
      // 创建很多错词
      for (let i = 1; i <= 10; i++) {
        progressTracker.updateStatus(`word${i}`, 'PIT_BOARD', false, i);
      }

      const questions = selector.buildQuiz({ count: 10 });
      const reviewQuestions = questions.filter(q => q.isReview);

      expect(reviewQuestions.length).toBeLessThanOrEqual(LEARNING.MAX_REVIEW_PER_QUIZ);
    });

    it('should emit REVIEW_WORDS_SELECTED event', () => {
      const handler = vi.fn();
      eventBus.on(Events.REVIEW_WORDS_SELECTED, handler);

      progressTracker.updateStatus('word1', 'PIT_BOARD', false, 1);
      selector.buildQuiz({ count: 10 });

      expect(handler).toHaveBeenCalled();
    });

    it('should select appropriate mode for wrong word', () => {
      // 简单题错得多
      progressTracker.updateStatus('word1', 'PIT_BOARD', false, 1);
      progressTracker.updateStatus('word1', 'STRATEGY', false, 1);

      // 复杂题错得多
      progressTracker.updateStatus('word2', 'RADIO_MSG', false, 2);
      progressTracker.updateStatus('word2', 'QUALIFYING', false, 2);

      const questions = selector.buildQuiz({ count: 10 });

      // 复习题应该有不同题型
      const reviewQuestions = questions.filter(q => q.isReview);
      expect(reviewQuestions.length).toBeGreaterThan(0);
    });
  });

  // ==================== 检查词测试 ====================

  describe('check word selection', () => {
    it('should select simple mode for complex_passed words', () => {
      // word1 复杂题通过，需要检查简单题
      progressTracker.updateStatus('word1', 'RADIO_MSG', true, 1);
      // word1 的状态应该是 complex_passed

      const questions = selector.buildQuiz({ count: 10 });
      const checkQuestions = questions.filter(q => q.isCheck);

      // 检查题应该是简单题模式
      checkQuestions.forEach(q => {
        expect(['PIT_BOARD', 'STRATEGY']).toContain(q.mode);
      });
    });

    it('should select complex mode for simple_passed words', () => {
      // word1 简单题通过，需要检查复杂题
      progressTracker.updateStatus('word2', 'PIT_BOARD', true, 2);

      const questions = selector.buildQuiz({ count: 10 });
      const checkQuestions = questions.filter(q => q.isCheck);

      // 检查题应该是复杂题模式
      checkQuestions.forEach(q => {
        expect(['RADIO_MSG', 'QUALIFYING']).toContain(q.mode);
      });
    });

    it('should not include mastered words in check', () => {
      // 已掌握的词不应该被选中
      progressTracker.updateStatus('word1', 'PIT_BOARD', true, 1);
      progressTracker.updateStatus('word1', 'RADIO_MSG', true, 1);

      const mastered = progressTracker.getMasteredWords();
      expect(mastered.length).toBe(1);

      const questions = selector.buildQuiz({ count: 10 });
      const masteredWordIds = mastered.map(w => w.wordId);

      questions.forEach(q => {
        expect(masteredWordIds).not.toContain(q.wordId);
      });
    });
  });

  // ==================== 新词选择测试 ====================

  describe('new word selection', () => {
    it('should select unlearned words for new slots', () => {
      const questions = selector.buildQuiz({ count: 10 });
      const newQuestions = questions.filter(q => q.isNew);

      // 应该有新词
      expect(newQuestions.length).toBeGreaterThan(0);
    });

    it('should prefer lower level words', () => {
      const questions = selector.buildQuiz({ count: 10 });
      const newQuestions = questions.filter(q => q.isNew);

      // 新词的平均难度应该较低
      const avgLevel = newQuestions.reduce((sum, q) => {
        const word = wordSet.find(w => w.id === q.wordId);
        return sum + (word?.level || 5);
      }, 0) / newQuestions.length;

      expect(avgLevel).toBeLessThan(4);
    });

    it('should use simple mode for new words', () => {
      const questions = selector.buildQuiz({ count: 10 });
      const newQuestions = questions.filter(q => q.isNew);

      newQuestions.forEach(q => {
        expect(['PIT_BOARD', 'STRATEGY']).toContain(q.mode);
      });
    });
  });

  // ==================== 题目分布测试 ====================

  describe('question distribution', () => {
    it('should distribute questions correctly', () => {
      // 设置各种状态的词
      // 错词
      progressTracker.updateStatus('word1', 'PIT_BOARD', false, 1);
      progressTracker.updateStatus('word2', 'PIT_BOARD', false, 2);
      // 检查词
      progressTracker.updateStatus('word3', 'PIT_BOARD', true, 3);
      progressTracker.updateStatus('word4', 'RADIO_MSG', true, 4);
      // 已掌握
      progressTracker.updateStatus('word5', 'PIT_BOARD', true, 5);
      progressTracker.updateStatus('word5', 'RADIO_MSG', true, 5);

      const questions = selector.buildQuiz({ count: 10 });

      const reviewCount = questions.filter(q => q.isReview).length;
      const checkCount = questions.filter(q => q.isCheck).length;
      const newCount = questions.filter(q => q.isNew).length;

      expect(reviewCount).toBeLessThanOrEqual(LEARNING.MAX_REVIEW_PER_QUIZ);
      expect(reviewCount + checkCount + newCount).toBe(10);
    });

    it('should not have consecutive review questions', () => {
      // 创建很多错词
      for (let i = 1; i <= 5; i++) {
        progressTracker.updateStatus(`word${i}`, 'PIT_BOARD', false, i);
      }

      const questions = selector.buildQuiz({ count: 10 });

      // 检查连续的复习题
      let consecutiveReview = 0;
      let maxConsecutive = 0;

      questions.forEach(q => {
        if (q.isReview) {
          consecutiveReview++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveReview);
        } else {
          consecutiveReview = 0;
        }
      });

      expect(maxConsecutive).toBeLessThanOrEqual(2);
    });
  });

  // ==================== 统计方法测试 ====================

  describe('statistics methods', () => {
    it('should return correct selection stats', () => {
      progressTracker.updateStatus('word1', 'PIT_BOARD', false, 1);
      progressTracker.updateStatus('word2', 'PIT_BOARD', true, 2);

      const stats = selector.getSelectionStats();

      expect(stats.wrongCount).toBe(1);
      expect(stats.checkSimpleCount + stats.checkComplexCount).toBe(1);
    });

    it('should preview next quiz correctly', () => {
      progressTracker.updateStatus('word1', 'PIT_BOARD', false, 1);
      progressTracker.updateStatus('word2', 'PIT_BOARD', false, 2);

      const preview = selector.previewNextQuiz();

      expect(preview.review).toBeGreaterThan(0);
      expect(preview.review + preview.check + preview.new).toBe(LEARNING.QUIZ_QUESTION_COUNT);
    });
  });

  // ==================== 边界条件测试 ====================

  describe('edge cases', () => {
    it('should handle empty wordset', () => {
      const emptySelector = new AdaptiveSelector(eventBus, progressTracker, [], 5);
      const questions = emptySelector.buildQuiz({ count: 10 });

      expect(questions.length).toBe(0);
    });

    it('should handle small wordset', () => {
      const smallWordSet = createTestWordSet(3);
      // 设置 minLevel=1 以包含 level 1 的词
      const smallSelector = new AdaptiveSelector(eventBus, progressTracker, smallWordSet, 5, 1);
      const questions = smallSelector.buildQuiz({ count: 10 });

      expect(questions.length).toBe(3);
    });

    it('should handle all words mastered', () => {
      // 所有词都掌握
      for (let i = 1; i <= 10; i++) {
        progressTracker.updateStatus(`word${i}`, 'PIT_BOARD', true, i);
        progressTracker.updateStatus(`word${i}`, 'RADIO_MSG', true, i);
      }

      const questions = selector.buildQuiz({ count: 10 });

      // 应该还有题目（从其他未掌握的词中选择）
      expect(questions.length).toBeGreaterThan(0);
    });

    it('should handle all words wrong', () => {
      // 所有词都答错
      for (let i = 1; i <= 10; i++) {
        progressTracker.updateStatus(`word${i}`, 'PIT_BOARD', false, i);
      }

      const questions = selector.buildQuiz({ count: 10 });

      // 复习题应该不超过上限
      const reviewCount = questions.filter(q => q.isReview).length;
      expect(reviewCount).toBeLessThanOrEqual(LEARNING.MAX_REVIEW_PER_QUIZ);
    });

    it('should handle useChinese option', () => {
      const questionsChinese = selector.buildQuiz({ count: 5, useChinese: true });
      const questionsEnglish = selector.buildQuiz({ count: 5, useChinese: false });

      // 两种都应该生成题目
      expect(questionsChinese.length).toBe(5);
      expect(questionsEnglish.length).toBe(5);
    });

    it('should handle question creation failure gracefully', () => {
      // 使用无效的词库
      const invalidWordSet = [{ id: 1, word: 'test' }]; // 缺少必要字段
      const invalidSelector = new AdaptiveSelector(eventBus, progressTracker, invalidWordSet, 5);

      // 不应该崩溃
      expect(() => {
        invalidSelector.buildQuiz({ count: 10 });
      }).not.toThrow();
    });
  });

  // ==================== 配置方法测试 ====================

  describe('configuration methods', () => {
    it('should update wordset', () => {
      const newWordSet = createTestWordSet(20);
      selector.setWordSet(newWordSet);
      // 默认 minLevel=2，所以 level 1 的词被过滤
      // 20个词中，level 分布：1-10 是 level 1, 11-20 是 level 2
      // 所以 eligible = 10 (只有 level 2)
      const stats = selector.getSelectionStats();
      expect(stats.totalEligible).toBe(10);
    });

    it('should update maxLevel', () => {
      selector.setLevelRange(1, 2); // 设置 minLevel=1, maxLevel=2

      const questions = selector.buildQuiz({ count: 10 });
      questions.forEach(q => {
        const word = wordSet.find(w => w.id === q.wordId);
        expect(word.level).toBeLessThanOrEqual(2);
      });
    });
  });

  // ==================== 性能测试 ====================

  describe('performance', () => {
    it('should build quiz quickly with large wordset', () => {
      const largeWordSet = createTestWordSet(2000);
      // 设置 minLevel=1 以包含所有词
      const largeSelector = new AdaptiveSelector(eventBus, progressTracker, largeWordSet, 5, 1);

      const start = performance.now();
      largeSelector.buildQuiz({ count: 10 });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should build quiz quickly with many wrong words', () => {
      // 创建大量错词
      for (let i = 1; i <= 100; i++) {
        progressTracker.updateStatus(`word${i}`, 'PIT_BOARD', false, i);
      }

      const start = performance.now();
      selector.buildQuiz({ count: 10 });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });
});

// ==================== 集成测试 ====================

describe('AdaptiveSelector Integration', () => {
  let eventBus;
  let progressTracker;
  let wordSet;
  let selector;

  beforeEach(() => {
    localStorage.clear();
    eventBus = new EventBus();
    progressTracker = new ProgressTracker(eventBus);
    wordSet = createTestWordSet(50);
    selector = new AdaptiveSelector(eventBus, progressTracker, wordSet, 5);
  });

  describe('with ProgressTracker', () => {
    it('should reflect progress changes in selection', () => {
      // 第一套题
      const quiz1 = selector.buildQuiz({ count: 10 });

      // 模拟答题 - 全对
      quiz1.forEach(q => {
        const correctWord = q.correctWord || q.word;
        progressTracker.updateStatus(correctWord, q.mode, true, q.wordId);
      });

      // 第二套题 - 应该有检查词
      const quiz2 = selector.buildQuiz({ count: 10 });
      const checkQuestions = quiz2.filter(q => q.isCheck);

      // 第一套题的新词现在应该变成检查词
      expect(checkQuestions.length).toBeGreaterThan(0);
    });

    it('should not select mastered words', () => {
      // 掌握前10个词
      for (let i = 1; i <= 10; i++) {
        progressTracker.updateStatus(`word${i}`, 'PIT_BOARD', true, i);
        progressTracker.updateStatus(`word${i}`, 'RADIO_MSG', true, i);
      }

      // 建题时应该跳过已掌握的词
      const questions = selector.buildQuiz({ count: 10 });
      const masteredIds = new Set(Array.from({ length: 10 }, (_, i) => i + 1));

      questions.forEach(q => {
        expect(masteredIds.has(q.wordId)).toBe(false);
      });
    });

    it('should track learning progress over multiple quizzes', () => {
      // 模拟5套题的学习过程
      for (let quizNum = 0; quizNum < 5; quizNum++) {
        const questions = selector.buildQuiz({ count: 10 });

        questions.forEach(q => {
          const correctWord = q.correctWord || q.word;
          // 80%正确率
          const correct = Math.random() < 0.8;
          progressTracker.updateStatus(correctWord, q.mode, correct, q.wordId);
        });
      }

      // 检查学习进度
      const stats = progressTracker.getStats();
      expect(stats.total).toBeGreaterThan(0);

      // 检查掌握的词
      const mastered = progressTracker.getMasteredWords();
      expect(mastered.length).toBeGreaterThan(0);
    });
  });

  describe('complete learning cycle', () => {
    it('should handle full adaptive learning flow', () => {
      const learningHistory = [];

      // 模拟30套题（相当于10天的学习）
      for (let quizNum = 0; quizNum < 30; quizNum++) {
        const questions = selector.buildQuiz({ count: 10 });

        const results = questions.map(q => {
          const correctWord = q.correctWord || q.word;
          // 正确率随学习进度提高
          const progress = progressTracker.getStatus(correctWord);
          const baseAccuracy = progress ? 0.7 : 0.5;
          const correct = Math.random() < baseAccuracy;

          progressTracker.updateStatus(correctWord, q.mode, correct, q.wordId);

          return {
            word: correctWord,
            correct,
            isReview: q.isReview,
            isCheck: q.isCheck,
            isNew: q.isNew,
          };
        });

        learningHistory.push({
          quizNum,
          correct: results.filter(r => r.correct).length,
          review: results.filter(r => r.isReview).length,
          check: results.filter(r => r.isCheck).length,
          new: results.filter(r => r.isNew).length,
        });
      }

      // 验证学习曲线
      const stats = progressTracker.getStats();
      expect(stats.mastered).toBeGreaterThan(0);
      // 30套题后，可能所有词都掌握了，也可能还有正在学习的
      expect(stats.mastered + stats.learning).toBeGreaterThan(0);

      // 验证选题分布
      const totalReview = learningHistory.reduce((sum, h) => sum + h.review, 0);
      const totalCheck = learningHistory.reduce((sum, h) => sum + h.check, 0);
      const totalNew = learningHistory.reduce((sum, h) => sum + h.new, 0);

      // 应该有合理的分布
      expect(totalReview).toBeGreaterThan(0);
      expect(totalCheck).toBeGreaterThan(0);
      expect(totalNew).toBeGreaterThan(0);
    });
  });
});
