/**
 * GameState 扩展测试 - 成就和赛道相关字段
 *
 * 验证新增字段的初始化和旧存档迁移
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameState } from '../core/game-state.js';
import { EventBus } from '../core/event-bus.js';

describe('GameState - Achievement & Track Fields', () => {
  let eventBus, gameState;

  beforeEach(() => {
    eventBus = new EventBus();
    // 清理 localStorage
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('默认值', () => {
    it('应该初始化 achievements 为空数组', () => {
      gameState = new GameState(eventBus);
      expect(gameState.get('achievements')).toEqual([]);
    });

    it('应该初始化 unlockedTracks 包含默认赛道', () => {
      gameState = new GameState(eventBus);
      expect(gameState.get('unlockedTracks')).toEqual(['shanghai-2d']);
    });

    it('应该初始化 selectedTrackId 为默认赛道', () => {
      gameState = new GameState(eventBus);
      expect(gameState.get('selectedTrackId')).toBe('shanghai-2d');
    });

    it('应该初始化 learning.lastPerfectQuiz 为 false', () => {
      gameState = new GameState(eventBus);
      expect(gameState.get('learning.lastPerfectQuiz')).toBe(false);
    });
  });

  describe('旧存档迁移', () => {
    it('应该为 v2 存档添加新字段', () => {
      const oldSave = {
        fuel: 100,
        fuelCoins: 50,
        version: 2,
        learning: {
          totalQuizzes: 5
        }
      };

      localStorage.setItem('wr_game_state_default', JSON.stringify(oldSave));

      gameState = new GameState(eventBus);

      // 新字段应该有默认值
      expect(gameState.get('achievements')).toEqual([]);
      expect(gameState.get('unlockedTracks')).toEqual(['shanghai-2d']);
      expect(gameState.get('selectedTrackId')).toBe('shanghai-2d');
      expect(gameState.get('learning.lastPerfectQuiz')).toBe(false);

      // v4 迁移删除了燃油和升级字段
      expect(gameState.get('fuel')).toBeUndefined();
      expect(gameState.get('upgrades')).toBeUndefined();

      // 旧字段应该保持不变
      expect(gameState.get('fuelCoins')).toBe(50);
      expect(gameState.get('learning.totalQuizzes')).toBe(5);
    });

    it('应该为无版本号的存档添加新字段', () => {
      const ancientSave = {
        fuel: 50,
        upgrades: { engine: 2 }
      };

      localStorage.setItem('wr_game_state', JSON.stringify(ancientSave));

      gameState = new GameState(eventBus);

      expect(gameState.get('achievements')).toEqual([]);
      expect(gameState.get('unlockedTracks')).toEqual(['shanghai-2d']);
      expect(gameState.get('selectedTrackId')).toBe('shanghai-2d');
    });

    it('不应该覆盖已有的新字段', () => {
      const newSave = {
        version: 3,
        achievements: ['first-quiz'],
        unlockedTracks: ['shanghai-2d', 'monaco-2d'],
        selectedTrackId: 'monaco-2d',
        learning: {
          lastPerfectQuiz: true
        }
      };

      localStorage.setItem('wr_game_state_default', JSON.stringify(newSave));

      gameState = new GameState(eventBus);

      expect(gameState.get('achievements')).toEqual(['first-quiz']);
      expect(gameState.get('unlockedTracks')).toEqual(['shanghai-2d', 'monaco-2d']);
      expect(gameState.get('selectedTrackId')).toBe('monaco-2d');
      expect(gameState.get('learning.lastPerfectQuiz')).toBe(true);
    });
  });

  describe('字段操作', () => {
    beforeEach(() => {
      gameState = new GameState(eventBus);
    });

    it('应该能添加成就', () => {
      gameState.modify('achievements', 'first-quiz');
      expect(gameState.get('achievements')).toContain('first-quiz');
    });

    it('应该能解锁新赛道', () => {
      gameState.modify('unlockedTracks', 'monaco-2d');
      expect(gameState.get('unlockedTracks')).toContain('monaco-2d');
    });

    it('应该能切换选择的赛道', () => {
      gameState.set('selectedTrackId', 'monaco-2d');
      expect(gameState.get('selectedTrackId')).toBe('monaco-2d');
    });

    it('应该能设置 lastPerfectQuiz', () => {
      gameState.set('learning.lastPerfectQuiz', true);
      expect(gameState.get('learning.lastPerfectQuiz')).toBe(true);
    });
  });

  describe('持久化', () => {
    it('新字段应该正确保存和加载', () => {
      gameState = new GameState(eventBus);

      gameState.set('achievements', ['first-quiz', 'quiz-master-10']);
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);
      gameState.set('selectedTrackId', 'monaco-2d');
      gameState.set('learning.lastPerfectQuiz', true);

      // 创建新的 GameState 实例来测试持久化
      const newGameState = new GameState(eventBus);

      expect(newGameState.get('achievements')).toEqual(['first-quiz', 'quiz-master-10']);
      expect(newGameState.get('unlockedTracks')).toEqual(['shanghai-2d', 'monaco-2d']);
      expect(newGameState.get('selectedTrackId')).toBe('monaco-2d');
      expect(newGameState.get('learning.lastPerfectQuiz')).toBe(true);
    });
  });
});
