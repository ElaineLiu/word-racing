import { describe, it, expect, beforeEach } from 'vitest';
import { TrackUnlockManager } from '../systems/track-unlock-manager.js';
import { GameState } from '../core/game-state.js';
import { EventBus } from '../core/event-bus.js';

describe('TrackUnlockManager - 解锁进度', () => {
  let eventBus;
  let gameState;
  let manager;

  beforeEach(() => {
    localStorage.clear();
    eventBus = new EventBus();
    gameState = new GameState(eventBus);
    manager = new TrackUnlockManager(eventBus, gameState);
  });

  describe('getUnlockProgress - 详细进度', () => {
    it('应该返回解锁进度（蒙特卡洛）', () => {
      // 设置部分进度：使用真实的 GameState 路径 learning.totalQuizzes
      gameState.set('learning.totalQuizzes', 5);

      const progress = manager.getUnlockProgress('monaco-2d');

      expect(progress.unlocked).toBe(false);
      expect(progress.type).toBe('2d');
      expect(progress.requirements.quizzesCompleted).toEqual({
        current: 5,
        required: 10
      });
      expect(progress.requirements.wordsLearned).toEqual({
        current: 0,
        required: 0
      });
      expect(progress.requirements.masteryCount).toEqual({
        current: 0,
        required: 0
      });
    });

    it('应该返回解锁进度（银石）', () => {
      gameState.set('learning.totalQuizzes', 15);

      const progress = manager.getUnlockProgress('silverstone-2d');

      expect(progress.unlocked).toBe(false);
      expect(progress.type).toBe('2d');
      expect(progress.requirements.quizzesCompleted).toEqual({
        current: 15,
        required: 20
      });
      expect(progress.requirements.wordsLearned).toEqual({
        current: 0,
        required: 0
      });
    });

    it('应该返回已解锁状态', () => {
      gameState.set('unlockedTracks', ['monaco-2d']);

      const progress = manager.getUnlockProgress('monaco-2d');

      expect(progress).toEqual({ unlocked: true });
    });

    it('应该返回上海赛道的默认解锁', () => {
      const progress = manager.getUnlockProgress('shanghai-2d');

      expect(progress.unlocked).toBe(true);
    });

    it('应该对未知赛道返回 null', () => {
      const progress = manager.getUnlockProgress('ghost-track');

      expect(progress).toBeNull();
    });

    it('应该显示完全满足条件的进度', () => {
      gameState.set('learning.totalQuizzes', 10);

      const progress = manager.getUnlockProgress('monaco-2d');

      expect(progress.requirements.quizzesCompleted.current).toBe(10);
      expect(progress.requirements.quizzesCompleted.required).toBe(10);
      // 但仍显示未解锁（需要成就系统触发）
      expect(progress.unlocked).toBe(false);
    });

    it('应该显示超出要求的进度', () => {
      gameState.set('learning.totalQuizzes', 50);

      const progress = manager.getUnlockProgress('monaco-2d');

      expect(progress.requirements.quizzesCompleted.current).toBe(50);
    });
  });

  describe('解锁条件数据完整性', () => {
    it('蒙特卡洛应该有正确的解锁要求（与成就 quiz-master-10 对齐）', () => {
      const progress = manager.getUnlockProgress('monaco-2d');

      expect(progress.requirements.quizzesCompleted.required).toBe(10);
      expect(progress.requirements.wordsLearned.required).toBe(0);
      expect(progress.requirements.masteryCount.required).toBe(0);
    });

    it('银石 2D 应该有正确的解锁要求（20 套题）', () => {
      const progress = manager.getUnlockProgress('silverstone-2d');

      expect(progress.requirements.quizzesCompleted.required).toBe(20);
      expect(progress.requirements.wordsLearned.required).toBe(0);
      expect(progress.requirements.masteryCount.required).toBe(0);
    });

    it('上海 2D 应该默认可解锁', () => {
      const progress = manager.getUnlockProgress('shanghai-2d');

      expect(progress.unlocked).toBe(true);
    });

    it('shanghai-3d 应该有 quizzesCompleted 解锁要求（30套）', () => {
      gameState.set('learning.totalQuizzes', 15);

      const progress = manager.getUnlockProgress('shanghai-3d');

      expect(progress.unlocked).toBe(false);
      expect(progress.type).toBe('3d');
      expect(progress.requirements.quizzesCompleted).toEqual({
        current: 15,
        required: 30
      });
    });

    it('shanghai-3d 已解锁时返回 unlocked: true', () => {
      gameState.set('unlockedTracks', ['shanghai-2d', 'shanghai-3d']);

      const progress = manager.getUnlockProgress('shanghai-3d');

      expect(progress).toEqual({ unlocked: true });
    });
  });
});
