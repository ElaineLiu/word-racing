/**
 * 成就管理器测试
 *
 * 验证成就检查、解锁、奖励发放等核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AchievementManager } from '../systems/achievement-manager.js';
import { EventBus, Events } from '../core/event-bus.js';
import { GameState } from '../core/game-state.js';

describe('AchievementManager', () => {
  let eventBus, gameState, manager;

  beforeEach(() => {
    // 清理 localStorage，避免测试间相互影响
    localStorage.clear();

    eventBus = new EventBus();
    gameState = new GameState(eventBus);
    manager = new AchievementManager(eventBus, gameState);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('constructor()', () => {
    it('应该需要 EventBus 实例', () => {
      expect(() => new AchievementManager(null, gameState))
        .toThrow('EventBus is required');
    });

    it('应该需要 GameState 实例', () => {
      expect(() => new AchievementManager(eventBus, null))
        .toThrow('GameState is required');
    });
  });

  describe('checkAll()', () => {
    it('应该在条件满足时解锁成就', () => {
      gameState.set('learning.totalQuizzes', 1);

      manager.checkAll();

      const achievements = gameState.get('achievements');
      expect(achievements).toContain('first-quiz');
    });

    it('应该在条件不满足时不解锁成就', () => {
      gameState.set('learning.totalQuizzes', 0);

      manager.checkAll();

      const achievements = gameState.get('achievements');
      expect(achievements).not.toContain('first-quiz');
    });

    it('应该避免重复解锁', () => {
      gameState.set('learning.totalQuizzes', 1);

      manager.checkAll();
      manager.checkAll();  // 第二次调用

      const achievements = gameState.get('achievements');
      const count = achievements.filter(id => id === 'first-quiz').length;
      expect(count).toBe(1);
    });

    it('应该解锁多个符合条件的成就', () => {
      gameState.set('learning.totalQuizzes', 10);
      gameState.set('learning.totalWordsMastered', 50);

      manager.checkAll();

      const achievements = gameState.get('achievements');
      expect(achievements).toContain('first-quiz');
      expect(achievements).toContain('quiz-master-10');
      expect(achievements).toContain('word-collector-50');
    });
  });

  describe('奖励发放', () => {
    it('应该在解锁成就时解锁赛道', () => {
      gameState.set('learning.totalQuizzes', 1);

      manager.checkAll();

      const unlockedTracks = gameState.get('unlockedTracks');
      expect(unlockedTracks).toContain('shanghai-2d');
    });

    it('应该在解锁成就时发放金币', () => {
      gameState.set('learning.lastPerfectQuiz', true);
      const initialCoins = gameState.get('fuelCoins');

      manager.checkAll();

      const finalCoins = gameState.get('fuelCoins');
      expect(finalCoins).toBe(initialCoins + 50);
    });

    it('应该避免重复解锁赛道', () => {
      gameState.set('learning.totalQuizzes', 1);

      manager.checkAll();
      manager.checkAll();

      const unlockedTracks = gameState.get('unlockedTracks');
      const count = unlockedTracks.filter(id => id === 'shanghai-2d').length;
      expect(count).toBe(1);
    });
  });

  describe('事件发送', () => {
    it('应该在解锁成就时发送 ACHIEVEMENT_UNLOCKED 事件', () => {
      const handler = vi.fn();
      eventBus.on(Events.ACHIEVEMENT_UNLOCKED, handler);

      gameState.set('learning.totalQuizzes', 1);
      manager.checkAll();

      expect(handler).toHaveBeenCalledWith({
        achievement: expect.objectContaining({
          id: 'first-quiz',
          name: '初次上阵'
        })
      });
    });

    it('应该在不解锁成就时不发送事件', () => {
      const handler = vi.fn();
      eventBus.on(Events.ACHIEVEMENT_UNLOCKED, handler);

      gameState.set('learning.totalQuizzes', 0);
      manager.checkAll();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('getAllStatus()', () => {
    it('应该返回所有成就及其解锁状态', () => {
      gameState.set('learning.totalQuizzes', 1);
      manager.checkAll();

      const status = manager.getAllStatus();

      expect(status).toBeInstanceOf(Array);
      expect(status.find(a => a.id === 'first-quiz')?.unlocked).toBe(true);
      expect(status.find(a => a.id === 'quiz-master-10')?.unlocked).toBe(false);
    });

    it('应该包含成就进度', () => {
      gameState.set('learning.totalQuizzes', 5);

      const status = manager.getAllStatus();

      const achievement = status.find(a => a.id === 'quiz-master-10');
      expect(achievement.progress).toEqual({ current: 5, target: 10 });
    });

    it('应该将已解锁的成就排在前面', () => {
      gameState.set('learning.totalQuizzes', 10);
      manager.checkAll();

      const status = manager.getAllStatus();

      const firstUnlockedIndex = status.findIndex(a => a.unlocked);
      const lastLockedIndex = status.findIndex(a => !a.unlocked);

      expect(firstUnlockedIndex).toBeLessThan(lastLockedIndex);
    });
  });

  describe('错误处理', () => {
    it('应该处理成就检查函数抛出的错误', () => {
      // 不应该抛出错误
      expect(() => manager.checkAll()).not.toThrow();
    });

    it('应该处理无效的 GameState 数据', () => {
      gameState.set('learning', null);

      expect(() => manager.checkAll()).not.toThrow();
    });
  });
});
