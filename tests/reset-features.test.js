/**
 * Reset Features - 重置功能集成测试
 *
 * 验证所有重置功能：
 *   - 全部重置功能
 *   - 重置今日功能
 *   - 重置本周功能
 *   - 多用户数据隔离
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, Events } from '../core/event-bus.js';
import { GameState } from '../core/game-state.js';
import { ProgressTracker } from '../learning/progress-tracker.js';
import { DailyManager } from '../learning/daily-manager.js';

describe('Reset Features - 集成测试', () => {
  let eventBus;

  beforeEach(() => {
    localStorage.clear();
    eventBus = new EventBus();
  });

  describe('GameState.reset()', () => {
    it('应该重置所有状态到默认值', () => {
      const gameState = new GameState(eventBus, 'test-user');

      // 设置一些非默认值
      gameState.set('fuelCoins', 1000);
      gameState.set('gearCoins', 500);
      gameState.set('nitroCharges', 5);
      gameState.set('learning.totalQuizzes', 10);
      gameState.set('learning.totalWordsMastered', 20);
      gameState.set('achievements', ['first-quiz', 'streak-3']);
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d', 'shanghai-3d']);

      // 执行重置
      gameState.reset();

      // 验证所有值都回到默认
      expect(gameState.get('fuelCoins')).toBe(0);
      expect(gameState.get('gearCoins')).toBe(0);
      expect(gameState.get('nitroCharges')).toBe(0);
      expect(gameState.get('learning.totalQuizzes')).toBe(0);
      expect(gameState.get('learning.totalWordsMastered')).toBe(0);
      expect(gameState.get('achievements')).toEqual([]);
      expect(gameState.get('unlockedTracks')).toEqual(['shanghai-2d']);
    });

    it('应该发出 STATE_CHANGED 事件', () => {
      const gameState = new GameState(eventBus, 'test-user');
      const handler = vi.fn();
      eventBus.on(Events.STATE_CHANGED, handler);

      gameState.reset();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('ProgressTracker.clear()', () => {
    it('应该清空所有单词进度', () => {
      const progressTracker = new ProgressTracker(eventBus, 'shanghai-zhongkao', 'test-user');

      // 设置一些单词进度
      progressTracker.updateStatus('apple', 'basic', true, 1);
      progressTracker.updateStatus('banana', 'basic', true, 2);
      progressTracker.updateStatus('cherry', 'basic', false, 3);

      // 验证有数据
      expect(progressTracker.getStatus('apple')).not.toBeNull();

      // 执行清空
      progressTracker.clear();

      // 验证数据已清空
      expect(progressTracker.getStatus('apple')).toBeNull();
      expect(progressTracker.getStatus('banana')).toBeNull();
      expect(progressTracker.getStatus('cherry')).toBeNull();
    });

    it('应该删除 localStorage 中的数据', () => {
      const progressTracker = new ProgressTracker(eventBus, 'shanghai-zhongkao', 'test-user');
      progressTracker.updateStatus('apple', 'basic', true, 1);
      progressTracker.save();

      // 验证 localStorage 有数据
      const storageKey = 'wr_word_progress_test-user';
      expect(localStorage.getItem(storageKey)).not.toBeNull();

      // 执行清空
      progressTracker.clear();

      // 验证 localStorage 已删除
      expect(localStorage.getItem(storageKey)).toBeNull();
    });
  });

  describe('DailyManager.reset()', () => {
    it('应该重置今日进度', () => {
      const gameState = new GameState(eventBus, 'test-user');
      const dailyManager = new DailyManager(eventBus, gameState, 'test-user');

      // 设置一些今日进度
      gameState.set('daily.todayQuizzes', 2);
      gameState.set('daily.todayFuelCoins', 50);
      gameState.set('daily.todayGearCoins', 30);

      // 执行重置
      dailyManager.reset();

      // 验证今日进度已重置
      expect(gameState.get('daily.todayQuizzes')).toBe(0);
      expect(gameState.get('daily.todayFuelCoins')).toBe(0);
      expect(gameState.get('daily.todayGearCoins')).toBe(0);
    });

    it('应该发出 DAILY_RESET 事件', () => {
      const gameState = new GameState(eventBus, 'test-user');
      const dailyManager = new DailyManager(eventBus, gameState, 'test-user');
      const handler = vi.fn();
      eventBus.on(Events.DAILY_RESET, handler);

      dailyManager.reset();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('DailyManager.clearHistory()', () => {
    it('应该清除指定天数的历史数据', () => {
      const gameState = new GameState(eventBus, 'test-user');
      const dailyManager = new DailyManager(eventBus, gameState, 'test-user');

      // 通过 localStorage 直接设置历史数据
      const testHistory = {
        '2026-06-15': { quizzesCompleted: 3 },
        '2026-06-14': { quizzesCompleted: 3 },
        '2026-06-13': { quizzesCompleted: 3 },
        '2026-06-12': { quizzesCompleted: 3 },
        '2026-06-11': { quizzesCompleted: 3 },
      };
      localStorage.setItem('wr_daily_stats_test-user', JSON.stringify(testHistory));

      // 创建新的 manager 来加载数据
      const dailyManager2 = new DailyManager(eventBus, gameState, 'test-user');

      // 验证历史数据已加载
      let history = dailyManager2.getHistory(10);
      expect(history.length).toBe(5);

      // 执行清除最近 3 天
      dailyManager2.clearHistory(3);

      // 验证只剩下 2 天
      history = dailyManager2.getHistory(10);
      expect(history.length).toBe(2);
    });

    it('默认应该清除 7 天的历史数据', () => {
      const gameState = new GameState(eventBus, 'test-user');

      // 通过 localStorage 直接设置历史数据
      const testHistory = {};
      for (let i = 0; i < 10; i++) {
        const date = `2026-06-${String(10 + i).padStart(2, '0')}`;
        testHistory[date] = { quizzesCompleted: 3 };
      }
      localStorage.setItem('wr_daily_stats_test-user', JSON.stringify(testHistory));

      // 创建新的 manager 来加载数据
      const dailyManager = new DailyManager(eventBus, gameState, 'test-user');

      // 执行清除（默认 7 天）
      dailyManager.clearHistory();

      // 验证只剩下 3 天
      const history = dailyManager.getHistory(10);
      expect(history.length).toBe(3);
    });
  });

  describe('多用户数据隔离', () => {
    it('GameState.reset() 应该只影响当前用户的数据', () => {
      const gameState1 = new GameState(eventBus, 'user-1');
      const gameState2 = new GameState(eventBus, 'user-2');

      // 设置两个用户的数据
      gameState1.set('fuelCoins', 1000);
      gameState2.set('fuelCoins', 2000);

      // 重置用户 1
      gameState1.reset();

      // 验证用户 1 被重置，用户 2 不受影响
      expect(gameState1.get('fuelCoins')).toBe(0);
      expect(gameState2.get('fuelCoins')).toBe(2000);
    });

    it('ProgressTracker.clear() 应该只影响当前用户的数据', () => {
      const tracker1 = new ProgressTracker(eventBus, 'shanghai-zhongkao', 'user-1');
      const tracker2 = new ProgressTracker(eventBus, 'shanghai-zhongkao', 'user-2');

      // 设置两个用户的数据
      tracker1.updateStatus('apple', 'basic', true, 1);
      tracker2.updateStatus('apple', 'basic', true, 1);

      // 清空用户 1
      tracker1.clear();

      // 验证用户 1 被清空，用户 2 不受影响
      expect(tracker1.getStatus('apple')).toBeNull();
      expect(tracker2.getStatus('apple')).not.toBeNull();
    });

    it('DailyManager.clearHistory() 应该只影响当前用户的数据', () => {
      const gameState1 = new GameState(eventBus, 'user-1');
      const gameState2 = new GameState(eventBus, 'user-2');

      // 通过 localStorage 直接设置两个用户的历史数据
      const testHistory = {
        '2026-06-15': { quizzesCompleted: 3 },
        '2026-06-14': { quizzesCompleted: 3 },
      };
      localStorage.setItem('wr_daily_stats_user-1', JSON.stringify(testHistory));
      localStorage.setItem('wr_daily_stats_user-2', JSON.stringify(testHistory));

      // 创建两个 manager
      const dailyManager1 = new DailyManager(eventBus, gameState1, 'user-1');
      const dailyManager2 = new DailyManager(eventBus, gameState2, 'user-2');

      // 清除用户 1 的历史
      dailyManager1.clearHistory(7);

      // 验证用户 1 被清除，用户 2 不受影响
      expect(dailyManager1.getHistory(10).length).toBe(0);
      expect(dailyManager2.getHistory(10).length).toBe(2);
    });
  });

  describe('重置功能对比', () => {
    it('GameState.reset() 应该重置所有内容', () => {
      const gameState = new GameState(eventBus, 'test-user');
      gameState.set('fuelCoins', 1000);
      gameState.set('learning.totalQuizzes', 10);
      gameState.set('achievements', ['first-quiz']);

      gameState.reset();

      expect(gameState.get('fuelCoins')).toBe(0);
      expect(gameState.get('learning.totalQuizzes')).toBe(0);
      expect(gameState.get('achievements')).toEqual([]);
    });

    it('DailyManager.reset() 应该只重置今日内容，保留其他', () => {
      const gameState = new GameState(eventBus, 'test-user');
      const dailyManager = new DailyManager(eventBus, gameState, 'test-user');

      gameState.set('fuelCoins', 1000);
      gameState.set('daily.todayQuizzes', 2);
      gameState.set('learning.totalQuizzes', 10);

      dailyManager.reset();

      expect(gameState.get('fuelCoins')).toBe(1000); // 保留
      expect(gameState.get('daily.todayQuizzes')).toBe(0); // 重置
      expect(gameState.get('learning.totalQuizzes')).toBe(10); // 保留
    });

    it('DailyManager.clearHistory() 应该只清除历史，保留其他', () => {
      const gameState = new GameState(eventBus, 'test-user');
      const dailyManager = new DailyManager(eventBus, gameState, 'test-user');

      gameState.set('fuelCoins', 1000);
      gameState.set('daily.todayQuizzes', 2);

      dailyManager.clearHistory(7);

      expect(gameState.get('fuelCoins')).toBe(1000); // 保留
      expect(gameState.get('daily.todayQuizzes')).toBe(2); // 保留
    });
  });
});
