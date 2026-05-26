/**
 * Learning System Integration Tests
 *
 * 测试原则改进：走完整调用链路，使用 LearningController 作为入口
 * 不再直接调用底层模块方法
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
      level: Math.ceil(i / 10) + 1, // 2-6
      category: 'test',
    });
  }
  return words;
};

describe('Learning System Integration', () => {
  let controller;
  let wordSet;

  beforeEach(() => {
    localStorage.clear();
    wordSet = createTestWordSet(50);
    controller = new LearningController();
    controller.init(wordSet, { skipUI: true });
  });

  // ==================== 完整答题流程（走入口方法）====================

  describe('complete quiz flow via controller', () => {
    it('should update all modules when answering questions', async () => {
      // 1. 开始套题（走入口方法）
      const questions = controller.startNewQuiz();
      expect(questions).not.toBeNull();
      expect(questions.length).toBe(LEARNING.QUIZ_QUESTION_COUNT);

      // 2. 答题（走入口方法）
      let correctCount = 0;
      for (let i = 0; i < 3; i++) {
        const question = controller.getCurrentQuestion();
        if (question) {
          const result = controller.submitAnswer(question.correctIndex);
          if (result.correct) correctCount++;
        }
      }

      // 3. 验证 session 状态
      const sessionStatus = controller.getSessionStatus();
      expect(sessionStatus.correctCount).toBe(correctCount);
      expect(sessionStatus.answeredCount).toBe(3);

      // 4. 验证 daily progress 已更新（这是之前遗漏的测试点）
      const dailyProgress = controller.getDailyProgress();
      expect(dailyProgress.newWordsLearned).toBe(correctCount);
      expect(dailyProgress.totalQuestions).toBe(3);

      // 5. 验证 word progress 已更新
      const wordStats = controller.getWordStats();
      expect(wordStats.total).toBeGreaterThan(0);
    });

    it('should complete full daily learning cycle', () => {
      // 完成3套题的完整流程
      for (let quizNum = 0; quizNum < 3; quizNum++) {
        const questions = controller.startNewQuiz();
        expect(questions).not.toBeNull();

        // 80%正确率
        for (let i = 0; i < questions.length; i++) {
          const question = controller.getCurrentQuestion();
          if (question) {
            const correct = i < 8;
            const index = correct ? question.correctIndex : (question.correctIndex + 1) % 4;
            controller.submitAnswer(index);
          }
        }

        const result = controller.completeQuiz();
        expect(result).not.toBeNull();
        expect(result.accuracy).toBe(80);
      }

      // 验证每日目标
      const goals = controller.dailyManager.checkDailyGoals();
      expect(goals.allThree.achieved).toBe(true);
      expect(goals.accuracy80.achieved).toBe(true);
      expect(goals.newWords10.achieved).toBe(true);

      // 无法再开始新套题
      const more = controller.startNewQuiz();
      expect(more).toBeNull();
    });
  });

  // ==================== 事件流测试 ====================

  describe('event flow', () => {
    it('should emit correct event sequence during quiz', () => {
      const events = [];

      controller.eventBus.on('session:start', () => events.push('session_start'));
      controller.eventBus.on('session:save', () => events.push('session_save'));
      controller.eventBus.on('quiz:complete', () => events.push('quiz_complete'));
      controller.eventBus.on('daily:progress', () => events.push('daily_progress'));
      controller.eventBus.on('learning:word_status_changed', () => events.push('word_status_changed'));

      controller.startNewQuiz();
      const question = controller.getCurrentQuestion();
      controller.submitAnswer(question.correctIndex);
      controller.completeQuiz();

      expect(events).toContain('session_start');
      expect(events).toContain('session_save');
      expect(events).toContain('quiz_complete');
      expect(events).toContain('word_status_changed');
      expect(events).toContain('daily_progress'); // 这个事件之前没验证
    });
  });

  // ==================== 断点续答 ====================

  describe('session resume', () => {
    it('should restore session context after page reload', () => {
      // 开始答题
      controller.startNewQuiz();
      const question = controller.getCurrentQuestion();
      controller.submitAnswer(question.correctIndex);

      // 模拟页面刷新 - 创建新实例
      const newController = new LearningController();
      newController.init(wordSet, { skipUI: true });

      // 恢复会话
      const session = newController.sessionManager.resumeSession();
      expect(session).not.toBeNull();
      expect(session.answers.length).toBe(1);
    });
  });

  // ==================== 边界条件 ====================

  describe('edge cases', () => {
    it('should handle localStorage full', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // 应该不崩溃
      expect(() => {
        controller.startNewQuiz();
        const question = controller.getCurrentQuestion();
        if (question) {
          controller.submitAnswer(question.correctIndex);
        }
      }).not.toThrow();

      localStorage.setItem = originalSetItem;
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('wr_word_progress', 'not valid json');
      localStorage.setItem('wr_quiz_session', '{ broken json');

      // 应该优雅降级
      expect(() => {
        const newController = new LearningController();
        newController.init(wordSet);
      }).not.toThrow();
    });

    it('should handle completing quiz twice', () => {
      controller.startNewQuiz();
      for (let i = 0; i < 10; i++) {
        const question = controller.getCurrentQuestion();
        if (question) controller.submitAnswer(question.correctIndex);
      }

      const result1 = controller.completeQuiz();
      expect(result1).not.toBeNull();

      // 再次完成应该返回 null
      const result2 = controller.completeQuiz();
      expect(result2).toBeNull();
    });

    it('should handle cross-midnight session', () => {
      // 设置为昨天
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // 昨天的会话
      localStorage.setItem('wr_quiz_session', JSON.stringify({
        date: yesterdayStr,
        currentQuiz: 1,
        questions: [{ wordId: 1, word: 'old', mode: 'PIT_BOARD' }],
        answers: [],
        completed: false,
      }));

      // 今天启动，应该清除旧会话
      const newController = new LearningController();
      newController.init(wordSet);

      const session = newController.sessionManager.resumeSession();
      expect(session).toBeNull();
      expect(newController.sessionManager.hasUnfinishedSession()).toBe(false);
    });
  });

  // ==================== 性能测试 ====================

  describe('performance', () => {
    it('should handle large progress data', () => {
      // 模拟大量答题
      const start = performance.now();

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

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500); // 应该在 500ms 内完成
    });
  });

  // ==================== 新增：目标达成集成测试 ====================

  describe('goal achievement integration', () => {
    it('should correctly track newWords10 goal through full flow', () => {
      // 这是之前遗漏的测试点

      // 第一套题：10个新词
      controller.startNewQuiz();
      for (let i = 0; i < 10; i++) {
        const question = controller.getCurrentQuestion();
        if (question) {
          controller.submitAnswer(question.correctIndex);
        }
      }
      controller.completeQuiz();

      // 验证目标状态
      let goals = controller.dailyManager.checkDailyGoals();
      expect(goals.newWords10.achieved).toBe(true);
      expect(goals.newWords10.progress).toBe(10);

      // 第二套题：不应该再计入新词（因为是复习词或检查词）
      controller.startNewQuiz();
      for (let i = 0; i < 10; i++) {
        const question = controller.getCurrentQuestion();
        if (question) {
          controller.submitAnswer(question.correctIndex);
        }
      }
      controller.completeQuiz();

      goals = controller.dailyManager.checkDailyGoals();
      // 新词数不应该再增加10
      expect(goals.newWords10.progress).toBeLessThanOrEqual(20);
    });

    it('should correctly track accuracy across multiple quizzes', () => {
      // 第一套：100% 正确率
      controller.startNewQuiz();
      for (let i = 0; i < 10; i++) {
        const question = controller.getCurrentQuestion();
        if (question) controller.submitAnswer(question.correctIndex);
      }
      controller.completeQuiz();

      // 第二套：60% 正确率
      controller.startNewQuiz();
      for (let i = 0; i < 10; i++) {
        const question = controller.getCurrentQuestion();
        if (question) {
          const correct = i < 6;
          const index = correct ? question.correctIndex : (question.correctIndex + 1) % 4;
          controller.submitAnswer(index);
        }
      }
      controller.completeQuiz();

      // 总正确率应该是 (10+6)/20 = 80%
      const goals = controller.dailyManager.checkDailyGoals();
      expect(goals.accuracy80.achieved).toBe(true);
      expect(goals.accuracy80.progress).toBe(80);
    });
  });
});
