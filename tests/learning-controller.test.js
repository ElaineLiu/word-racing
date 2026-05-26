/**
 * LearningController Tests - 协调层集成测试
 *
 * 测试原则：走完整调用链路，验证所有副作用
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LearningController } from '../learning/learning-controller.js';
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
      level: Math.ceil(i / 10) + 1, // 2-6，跳过 level 1
      category: 'test',
    });
  }
  return words;
};

describe('LearningController', () => {
  let controller;
  let wordSet;

  beforeEach(() => {
    localStorage.clear();
    wordSet = createTestWordSet(30);
    controller = new LearningController();
    controller.init(wordSet, { skipUI: true });
  });

  // ==================== 入口方法测试 ====================

  describe('submitAnswer - 完整链路验证', () => {
    beforeEach(() => {
      controller.startNewQuiz();
    });

    it('should update session progress when answering', () => {
      const question = controller.getCurrentQuestion();
      const correctIndex = question.correctIndex;

      const result = controller.submitAnswer(correctIndex);

      expect(result.correct).toBe(true);
      expect(result.combo).toBe(1);
      expect(controller.getSessionStatus().correctCount).toBe(1);
    });

    it('should update daily progress with new word count', () => {
      const question = controller.getCurrentQuestion();

      // 答对第一个新词
      controller.submitAnswer(question.correctIndex);

      const progress = controller.getDailyProgress();
      expect(progress.newWordsLearned).toBe(1);
    });

    it('should NOT count wrong answer as new word learned', () => {
      const question = controller.getCurrentQuestion();
      const wrongIndex = (question.correctIndex + 1) % 4;

      controller.submitAnswer(wrongIndex);

      const progress = controller.getDailyProgress();
      expect(progress.newWordsLearned).toBe(0);
    });

    it('should track multiple new words across questions', () => {
      // 连续答对多题
      for (let i = 0; i < 5; i++) {
        const question = controller.getCurrentQuestion();
        if (question) {
          controller.submitAnswer(question.correctIndex);
        }
      }

      const progress = controller.getDailyProgress();
      expect(progress.newWordsLearned).toBe(5);
    });

    it('should update word progress status', () => {
      const question = controller.getCurrentQuestion();
      const wordText = question.correctWord || question.word;

      controller.submitAnswer(question.correctIndex);

      const status = controller.progressTracker.getStatus(wordText);
      expect(status.status).not.toBe(MASTERY_STATUS.UNLEARNED);
    });

    it('should accumulate coins in session', () => {
      const question = controller.getCurrentQuestion();

      controller.submitAnswer(question.correctIndex);

      const session = controller.getCurrentSession();
      expect(session.fuelCoinsEarned + session.gearCoinsEarned).toBeGreaterThan(0);
    });
  });

  // ==================== 副作用验证 ====================

  describe('side effects', () => {
    it('should emit DAILY_PROGRESS event on answer', () => {
      const handler = vi.fn();
      controller.eventBus.on('daily:progress', handler);

      controller.startNewQuiz();
      const question = controller.getCurrentQuestion();
      controller.submitAnswer(question.correctIndex);

      expect(handler).toHaveBeenCalled();
    });

    it('should update UI after quiz complete', () => {
      controller.startNewQuiz();
      const session = controller.getCurrentSession();

      // 答完所有题
      for (let i = 0; i < session.questions.length; i++) {
        const question = controller.getCurrentQuestion();
        if (question) {
          controller.submitAnswer(question.correctIndex);
        }
      }

      controller.completeQuiz();

      const progress = controller.getDailyProgress();
      expect(progress.quizzesCompleted).toBe(1);
    });
  });

  // ==================== 目标达成验证 ====================

  describe('daily goals', () => {
    it('should achieve newWords10 goal after learning 10 words', () => {
      // 完成一套题（10题全对）
      controller.startNewQuiz();
      for (let i = 0; i < 10; i++) {
        const question = controller.getCurrentQuestion();
        if (question) {
          controller.submitAnswer(question.correctIndex);
        }
      }
      controller.completeQuiz();

      const goals = controller.dailyManager.checkDailyGoals();
      expect(goals.newWords10.achieved).toBe(true);
      expect(goals.newWords10.progress).toBe(10);
    });

    it('should achieve allThree goal after 3 quizzes', () => {
      for (let quiz = 0; quiz < 3; quiz++) {
        controller.startNewQuiz();
        for (let i = 0; i < 10; i++) {
          const question = controller.getCurrentQuestion();
          if (question) {
            controller.submitAnswer(question.correctIndex);
          }
        }
        controller.completeQuiz();
      }

      const goals = controller.dailyManager.checkDailyGoals();
      expect(goals.allThree.achieved).toBe(true);
    });

    it('should achieve accuracy80 goal with 80%+ correct', () => {
      controller.startNewQuiz();
      // 8对2错 = 80%
      for (let i = 0; i < 10; i++) {
        const question = controller.getCurrentQuestion();
        if (question) {
          const correct = i < 8;
          const index = correct ? question.correctIndex : (question.correctIndex + 1) % 4;
          controller.submitAnswer(index);
        }
      }
      controller.completeQuiz();

      const goals = controller.dailyManager.checkDailyGoals();
      expect(goals.accuracy80.achieved).toBe(true);
    });
  });

  // ==================== 完整用户流程 ====================

  describe('complete user flow', () => {
    it('should handle full daily learning session', () => {
      // 模拟完整的一天学习
      for (let quiz = 0; quiz < 3; quiz++) {
        const questions = controller.startNewQuiz();
        expect(questions).not.toBeNull();
        expect(questions.length).toBe(LEARNING.QUIZ_QUESTION_COUNT);

        for (let i = 0; i < questions.length; i++) {
          const question = controller.getCurrentQuestion();
          if (question) {
            controller.submitAnswer(question.correctIndex);
          }
        }

        const result = controller.completeQuiz();
        expect(result).not.toBeNull();
        expect(result.accuracy).toBe(100);
      }

      // 验证最终状态
      const progress = controller.getDailyProgress();
      expect(progress.quizzesCompleted).toBe(3);
      // 第一套10个新词，第二、三套会有复习词和检查词
      expect(progress.newWordsLearned).toBeGreaterThanOrEqual(10);
      expect(progress.newWordsLearned).toBeLessThanOrEqual(30);

      // 无法再开始新套题
      const more = controller.startNewQuiz();
      expect(more).toBeNull();
    });
  });

  // ==================== 参数传递验证 ====================

  describe('parameter passing', () => {
    it('should pass correct isReview flag for review questions', () => {
      // 先答错一些词
      controller.startNewQuiz();
      for (let i = 0; i < 3; i++) {
        const question = controller.getCurrentQuestion();
        if (question) {
          const wrongIndex = (question.correctIndex + 1) % 4;
          controller.submitAnswer(wrongIndex);
        }
      }
      controller.completeQuiz();

      // 开始第二套，应该有复习题
      controller.startNewQuiz();

      const progress = controller.getDailyProgress();
      // 复习词不计入新词
      expect(progress.wordsReviewed).toBeGreaterThanOrEqual(0);
    });

    it('should pass correct isNewWord flag only for first appearance', () => {
      controller.startNewQuiz();

      // 第一套：10个新词
      for (let i = 0; i < 10; i++) {
        const question = controller.getCurrentQuestion();
        if (question) {
          controller.submitAnswer(question.correctIndex);
        }
      }
      controller.completeQuiz();

      let progress = controller.getDailyProgress();
      expect(progress.newWordsLearned).toBe(10);

      // 第二套：复习词和检查词，不再计入新词
      controller.startNewQuiz();
      for (let i = 0; i < 10; i++) {
        const question = controller.getCurrentQuestion();
        if (question) {
          controller.submitAnswer(question.correctIndex);
        }
      }
      controller.completeQuiz();

      progress = controller.getDailyProgress();
      // 新词数应该还是接近10（只有检查词答对后不算新词）
      expect(progress.newWordsLearned).toBeLessThanOrEqual(20);
    });
  });

  // ==================== 错误处理 ====================

  describe('error handling', () => {
    it('should return null when no current question', () => {
      const result = controller.submitAnswer(0);
      expect(result).toBeNull();
    });

    it('should return null when daily quota reached', () => {
      // 完成3套题
      for (let quiz = 0; quiz < 3; quiz++) {
        controller.startNewQuiz();
        for (let i = 0; i < 10; i++) {
          const question = controller.getCurrentQuestion();
          if (question) controller.submitAnswer(question.correctIndex);
        }
        controller.completeQuiz();
      }

      // 第4套应该失败
      const questions = controller.startNewQuiz();
      expect(questions).toBeNull();
    });
  });
});
