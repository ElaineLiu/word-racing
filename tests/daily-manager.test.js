/**
 * DailyManager Tests
 * Tests for daily learning management
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DailyManager } from '../learning/daily-manager.js';
import { EventBus, Events } from '../core/event-bus.js';
import { GameState } from '../core/game-state.js';
import { LEARNING } from '../config/learning-config.js';

describe('DailyManager', () => {
  let eventBus;
  let gameState;
  let dailyManager;

  beforeEach(() => {
    localStorage.clear();

    eventBus = new EventBus();
    gameState = new GameState(eventBus);
    dailyManager = new DailyManager(eventBus, gameState);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==================== Initialization ====================

  describe('initialization', () => {
    it('should initialize with today date', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(gameState.get('daily.lastActiveDate')).toBe(today);
    });

    it('should reset today stats on new day', () => {
      expect(gameState.get('daily.todayQuizzes')).toBe(0);
      expect(gameState.get('daily.todayFuelCoins')).toBe(0);
      expect(gameState.get('daily.todayGearCoins')).toBe(0);
    });

    it('should emit DAILY_RESET when day changes', () => {
      // Set lastActiveDate to yesterday to trigger reset
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Clear localStorage and set old date
      localStorage.clear();
      const storedData = {
        version: 3,
        daily: {
          lastActiveDate: yesterdayStr,
          todayQuizzes: 3,
          todayFuelCoins: 100,
          todayGearCoins: 50,
        },
        learning: {
          totalWordsSeen: 50,
          totalWordsMastered: 10,
          totalQuizzes: 3,
          totalQuestions: 30,
          totalCorrect: 25,
        },
      };
      localStorage.setItem('wr_game_state', JSON.stringify(storedData));

      // Create new instances that will load the old data
      const newEventBus = new EventBus();
      const handler = vi.fn();
      newEventBus.on(Events.DAILY_RESET, handler);

      // Create new GameState which loads stored data
      const newGameState = new GameState(newEventBus);
      const newManager = new DailyManager(newEventBus, newGameState);

      expect(handler).toHaveBeenCalled();
    });
  });

  // ==================== Date Utilities ====================

  describe('date utilities', () => {
    it('should return correct today date', () => {
      const expected = new Date().toISOString().split('T')[0];
      expect(dailyManager.getToday()).toBe(expected);
    });

    it('should detect new day correctly', () => {
      // Today is set as lastActiveDate
      expect(dailyManager.isNewDay()).toBe(false);
    });

    it('should detect new day when lastActiveDate is different', () => {
      gameState.set('daily.lastActiveDate', '2026-05-20');
      const newManager = new DailyManager(eventBus, gameState);
      expect(newManager.isNewDay()).toBe(false); // Reset happened on init
      expect(gameState.get('daily.lastActiveDate')).toBe(newManager.getToday());
    });
  });

  // ==================== Progress Updates ====================

  describe('updateProgress', () => {
    it('should update total questions', () => {
      dailyManager.updateProgress({ correct: true });

      const progress = dailyManager.getTodayProgress();
      expect(progress.totalQuestions).toBe(1);
    });

    it('should update correct answers', () => {
      dailyManager.updateProgress({ correct: true });
      dailyManager.updateProgress({ correct: false });

      const progress = dailyManager.getTodayProgress();
      expect(progress.correctAnswers).toBe(1);
    });

    it('should accumulate fuel coins', () => {
      dailyManager.updateProgress({ correct: true, fuelCoins: 5 });
      dailyManager.updateProgress({ correct: true, fuelCoins: 10 });

      const progress = dailyManager.getTodayProgress();
      expect(progress.fuelCoinsEarned).toBe(15);
      expect(gameState.get('daily.todayFuelCoins')).toBe(15);
    });

    it('should accumulate gear coins', () => {
      dailyManager.updateProgress({ correct: true, gearCoins: 8 });

      const progress = dailyManager.getTodayProgress();
      expect(progress.gearCoinsEarned).toBe(8);
    });

    it('should track max combo', () => {
      dailyManager.updateProgress({ correct: true, combo: 3 });
      dailyManager.updateProgress({ correct: true, combo: 5 });
      dailyManager.updateProgress({ correct: true, combo: 2 });

      const progress = dailyManager.getTodayProgress();
      expect(progress.maxCombo).toBe(5);
    });

    it('should emit DAILY_PROGRESS event', () => {
      const handler = vi.fn();
      eventBus.on(Events.DAILY_PROGRESS, handler);

      dailyManager.updateProgress({ correct: true });

      expect(handler).toHaveBeenCalled();
    });
  });

  // ==================== Quiz Completion ====================

  describe('completeQuiz', () => {
    it('should increment quizzes completed', () => {
      dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 8 });

      const progress = dailyManager.getTodayProgress();
      expect(progress.quizzesCompleted).toBe(1);
      expect(gameState.get('daily.todayQuizzes')).toBe(1);
    });

    it('should update learning stats', () => {
      dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 8 });

      expect(gameState.get('learning.totalQuizzes')).toBe(1);
      expect(gameState.get('learning.totalQuestions')).toBe(10);
      expect(gameState.get('learning.totalCorrect')).toBe(8);
    });

    it('should return goal check results', () => {
      const result = dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 8 });

      expect(result.goals).toBeDefined();
      expect(result.goals.dailyComplete).toBeDefined();
    });
  });

  // ==================== Daily Goals ====================

  describe('checkDailyGoals', () => {
    it('should return dailyComplete goal as not achieved initially', () => {
      const goals = dailyManager.checkDailyGoals();

      expect(goals.dailyComplete.achieved).toBe(false);
      expect(goals.dailyComplete.progress).toBe(0);
    });

    it('should achieve dailyComplete after 3 quizzes', () => {
      for (let i = 0; i < 3; i++) {
        dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 8 });
      }

      const goals = dailyManager.checkDailyGoals();
      expect(goals.dailyComplete.achieved).toBe(true);
    });
  });

  // ==================== Daily Rewards ====================

  describe('settleDailyRewards', () => {
    it('should return empty rewards when no goals achieved', () => {
      const result = dailyManager.settleDailyRewards();

      expect(result.rewards.fuel).toBe(0);
      expect(result.rewards.gear).toBe(0);
      expect(result.achieved).toEqual([]);
    });

    it('should mark dailyComplete when 3 quizzes done', () => {
      // Complete 3 quizzes
      for (let i = 0; i < 3; i++) {
        dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 9 });
      }

      const result = dailyManager.settleDailyRewards();

      expect(result.rewards.fuel).toBe(0);
      expect(result.rewards.gear).toBe(0);
      expect(result.achieved).toContain('dailyComplete');
    });

    it('should emit DAILY_GOAL_COMPLETE when goals achieved', () => {
      const handler = vi.fn();
      eventBus.on(Events.DAILY_GOAL_COMPLETE, handler);

      for (let i = 0; i < 3; i++) {
        dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 9 });
      }
      dailyManager.settleDailyRewards();

      expect(handler).toHaveBeenCalled();
    });
  });

  // ==================== History ====================

  describe('history', () => {
    it('should save to history on settle', () => {
      for (let i = 0; i < 3; i++) {
        dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 8 });
      }
      dailyManager.settleDailyRewards();

      const history = dailyManager.getHistory(1);
      expect(history.length).toBe(1);
    });

    it('should return empty history initially', () => {
      const history = dailyManager.getHistory(7);
      expect(history.length).toBe(0);
    });

    it('should limit history to requested days', () => {
      // Simulate multiple days by saving to history directly
      for (let i = 0; i < 10; i++) {
        const date = `2026-05-${String(10 + i).padStart(2, '0')}`;
        dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 8 });
        dailyManager.settleDailyRewards();
      }

      const history = dailyManager.getHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  // ==================== Utility Methods ====================

  describe('utility methods', () => {
    it('should return remaining quizzes', () => {
      expect(dailyManager.getRemainingQuizzes()).toBe(3);

      dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 8 });
      expect(dailyManager.getRemainingQuizzes()).toBe(2);

      dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 8 });
      dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 8 });
      expect(dailyManager.getRemainingQuizzes()).toBe(0);
    });

    it('should check if can continue quiz', () => {
      expect(dailyManager.canContinueQuiz()).toBe(true);

      for (let i = 0; i < 3; i++) {
        dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 8 });
      }
      expect(dailyManager.canContinueQuiz()).toBe(false);
    });

    it('should check if today is complete', () => {
      expect(dailyManager.isTodayComplete()).toBe(false);

      for (let i = 0; i < 3; i++) {
        dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 8 });
      }
      dailyManager.settleDailyRewards();

      expect(dailyManager.isTodayComplete()).toBe(true);
    });
  });

  // ==================== Total Stats ====================

  describe('getTotalStats', () => {
    it('should return total stats from gameState', () => {
      dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 8 });
      dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 7 });

      const stats = dailyManager.getTotalStats();

      expect(stats.totalQuizzes).toBe(2);
      expect(stats.totalQuestions).toBe(20);
      expect(stats.totalCorrect).toBe(15);
    });
  });
});
