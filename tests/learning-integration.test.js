/**
 * Learning System Integration Tests
 * 测试模块间的协作
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, Events } from '../core/event-bus.js';
import { GameState } from '../core/game-state.js';
import { ProgressTracker } from '../learning/progress-tracker.js';
import { DailyManager } from '../learning/daily-manager.js';
import { QuizSessionManager } from '../learning/quiz-session.js';
import { MASTERY_STATUS } from '../config/learning-config.js';

describe('Learning System Integration', () => {
  let eventBus;
  let gameState;
  let progressTracker;
  let dailyManager;
  let sessionManager;

  beforeEach(() => {
    localStorage.clear();
    eventBus = new EventBus();
    gameState = new GameState(eventBus);
    progressTracker = new ProgressTracker(eventBus);
    dailyManager = new DailyManager(eventBus, gameState);
    sessionManager = new QuizSessionManager(eventBus, dailyManager, progressTracker);
  });

  // ==================== 完整答题流程 ====================

  describe('complete quiz flow', () => {
    it('should update all modules when answering questions', async () => {
      // 1. 开始会话
      const session = sessionManager.startDailySession();
      expect(session).not.toBeNull();

      // 2. 设置题目
      sessionManager.setQuestions([
        { wordId: 1, word: 'speed', meaning: '速度', mode: 'PIT_BOARD' },
        { wordId: 2, word: 'brake', meaning: '刹车', mode: 'PIT_BOARD' },
        { wordId: 3, word: 'engine', meaning: '引擎', mode: 'RADIO_MSG' },
      ]);

      // 3. 答题并追踪进度
      // 第一题答对
      sessionManager.saveAnswer({
        questionIndex: 0,
        correct: true,
        selectedIndex: 0,
        mode: 'PIT_BOARD',
        fuelCoins: 5,
      });
      progressTracker.updateStatus('speed', 'PIT_BOARD', true, 1);

      // 第二题答错
      sessionManager.saveAnswer({
        questionIndex: 1,
        correct: false,
        selectedIndex: 1,
        mode: 'PIT_BOARD',
      });
      progressTracker.updateStatus('brake', 'PIT_BOARD', false, 2);

      // 第三题答对
      sessionManager.saveAnswer({
        questionIndex: 2,
        correct: true,
        selectedIndex: 0,
        mode: 'RADIO_MSG',
        gearCoins: 8,
      });
      progressTracker.updateStatus('engine', 'RADIO_MSG', true, 3);

      // 4. 完成套题
      const result = sessionManager.completeQuiz();

      // 5. 验证结果
      expect(result.correctCount).toBe(2);
      expect(result.accuracy).toBe(67);

      // 6. 验证 DailyManager 更新
      const dailyProgress = dailyManager.getTodayProgress();
      expect(dailyProgress.quizzesCompleted).toBe(1);
      expect(dailyProgress.correctAnswers).toBe(2);

      // 7. 验证 ProgressTracker 更新
      expect(progressTracker.getStatus('speed').status).toBe(MASTERY_STATUS.SIMPLE_PASSED);
      expect(progressTracker.getStatus('brake').status).toBe(MASTERY_STATUS.EXPOSED);
      expect(progressTracker.getStatus('engine').status).toBe(MASTERY_STATUS.COMPLEX_PASSED);

      // 8. 验证 GameState 更新
      expect(gameState.get('learning.totalQuizzes')).toBe(1);
    });

    it('should complete full daily learning cycle', () => {
      // 完成3套题的完整流程
      for (let quizNum = 0; quizNum < 3; quizNum++) {
        const session = sessionManager.startDailySession();
        sessionManager.setQuestions(
          Array(10).fill(null).map((_, i) => ({
            wordId: quizNum * 10 + i,
            word: `word${quizNum * 10 + i}`,
            mode: i % 2 === 0 ? 'PIT_BOARD' : 'RADIO_MSG',
          }))
        );

        // 模拟答题（80%正确率）
        for (let i = 0; i < 10; i++) {
          const correct = i < 8;
          sessionManager.saveAnswer({
            questionIndex: i,
            correct,
            mode: i % 2 === 0 ? 'PIT_BOARD' : 'RADIO_MSG',
            fuelCoins: correct && i % 2 === 0 ? 5 : 0,
            gearCoins: correct && i % 2 === 1 ? 8 : 0,
          });
          progressTracker.updateStatus(
            `word${quizNum * 10 + i}`,
            i % 2 === 0 ? 'PIT_BOARD' : 'RADIO_MSG',
            correct,
            quizNum * 10 + i
          );
        }

        sessionManager.completeQuiz();
      }

      // 验证每日目标
      const goals = dailyManager.checkDailyGoals();
      expect(goals.allThree.achieved).toBe(true);
      expect(goals.accuracy80.achieved).toBe(true);

      // 结算奖励
      const rewards = dailyManager.settleDailyRewards();
      expect(rewards.achieved).toContain('allThree');
      expect(rewards.achieved).toContain('accuracy80');
      expect(rewards.streak).toBe(1);
    });
  });

  // ==================== 事件流测试 ====================

  describe('event flow', () => {
    it('should emit correct event sequence during quiz', () => {
      const events = [];

      eventBus.on(Events.SESSION_START, () => events.push('session_start'));
      eventBus.on(Events.SESSION_SAVE, () => events.push('session_save'));
      eventBus.on(Events.QUIZ_COMPLETE, () => events.push('quiz_complete'));
      eventBus.on(Events.DAILY_PROGRESS, () => events.push('daily_progress'));
      eventBus.on(Events.WORD_STATUS_CHANGED, () => events.push('word_status_changed'));

      sessionManager.startDailySession();
      sessionManager.setQuestions([{ wordId: 1, word: 'test', mode: 'PIT_BOARD' }]);
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });
      progressTracker.updateStatus('test', 'PIT_BOARD', true, 1);
      sessionManager.completeQuiz();

      expect(events).toContain('session_start');
      expect(events).toContain('session_save');
      expect(events).toContain('quiz_complete');
      expect(events).toContain('word_status_changed');
    });
  });

  // ==================== 断点续答 ====================

  describe('session resume', () => {
    it('should restore session context after page reload', () => {
      // 开始答题
      sessionManager.startDailySession();
      sessionManager.setQuestions([
        { wordId: 1, word: 'speed', mode: 'PIT_BOARD' },
        { wordId: 2, word: 'brake', mode: 'PIT_BOARD' },
      ]);
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });

      // 模拟页面刷新 - 创建新实例（共享同一个 localStorage）
      const newEventBus = new EventBus();
      const newGameState = new GameState(newEventBus);
      const newDailyManager = new DailyManager(newEventBus, newGameState);
      const newProgressTracker = new ProgressTracker(newEventBus);
      const newSessionManager = new QuizSessionManager(
        newEventBus,
        newDailyManager,
        newProgressTracker
      );

      // 恢复会话
      const resumed = newSessionManager.resumeSession();
      expect(resumed).not.toBeNull();
      expect(resumed.answers.length).toBe(1);
      expect(newSessionManager.getCurrentQuestionIndex()).toBe(1);
    });
  });

  // ==================== 边界条件 ====================

  describe('edge cases', () => {
    it('should handle localStorage full', () => {
      // 模拟 localStorage 满
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // 应该不崩溃
      expect(() => {
        progressTracker.updateStatus('test', 'PIT_BOARD', true, 1);
        progressTracker.save();
      }).not.toThrow();

      localStorage.setItem = originalSetItem;
    });

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('wr_word_progress', 'not valid json');
      localStorage.setItem('wr_quiz_session', '{ broken json');

      // 应该优雅降级
      expect(() => {
        const newTracker = new ProgressTracker(eventBus);
        const newSession = new QuizSessionManager(eventBus, dailyManager, newTracker);
      }).not.toThrow();
    });

    it('should handle completing quiz twice', () => {
      sessionManager.startDailySession();
      sessionManager.setQuestions([{ wordId: 1, word: 'test', mode: 'PIT_BOARD' }]);
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });

      const result1 = sessionManager.completeQuiz();
      expect(result1).not.toBeNull();

      // 再次完成应该返回 null 或安全处理
      const result2 = sessionManager.completeQuiz();
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
      const newSession = sessionManager.resumeSession();
      expect(newSession).toBeNull();
      expect(sessionManager.hasUnfinishedSession()).toBe(false);
    });
  });

  // ==================== 性能测试 ====================

  describe('performance', () => {
    it('should handle large progress data', () => {
      // 模拟 1000 个单词的进度
      for (let i = 0; i < 1000; i++) {
        progressTracker.updateStatus(`word${i}`, 'PIT_BOARD', i % 2 === 0, i);
      }

      const start = performance.now();
      progressTracker.save();
      const saveTime = performance.now() - start;

      expect(saveTime).toBeLessThan(100); // 应该在 100ms 内完成
    });
  });
});
