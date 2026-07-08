/**
 * GameState v4 迁移测试
 * 测试 v3 → v4 数据迁移逻辑
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../core/game-state.js';
import { EventBus } from '../core/event-bus.js';

describe('GameState v4 Migration', () => {
  let eventBus;

  beforeEach(() => {
    localStorage.clear();
    eventBus = new EventBus();
  });

  describe('DEFAULT_STATE v4', () => {
    it('should not have fuel field', () => {
      const state = new GameState(eventBus, 'test_user');
      expect(state.get('fuel')).toBeUndefined();
    });

    it('should not have upgrades field', () => {
      const state = new GameState(eventBus, 'test_user');
      expect(state.get('upgrades')).toBeUndefined();
    });

    it('should have version 4', () => {
      const state = new GameState(eventBus, 'test_user');
      expect(state.get('version')).toBe(4);
    });
  });

  describe('v3 to v4 migration', () => {
    it('should delete fuel field during migration', () => {
      // 模拟 v3 数据
      const v3Data = {
        version: 3,
        fuel: 50,
        fuelCoins: 100,
        gearCoins: 50,
      };
      localStorage.setItem('wr_game_state_test_user', JSON.stringify(v3Data));

      // 创建 GameState 实例，触发迁移
      const state = new GameState(eventBus, 'test_user');

      expect(state.get('fuel')).toBeUndefined();
      expect(state.get('version')).toBe(4);
      expect(state.get('fuelCoins')).toBe(100);
    });

    it('should delete upgrades field during migration', () => {
      // 模拟 v3 数据
      const v3Data = {
        version: 3,
        upgrades: { engine: 2, tire: 1, body: 1 },
        fuelCoins: 200,
      };
      localStorage.setItem('wr_game_state_test_user', JSON.stringify(v3Data));

      const state = new GameState(eventBus, 'test_user');

      expect(state.get('upgrades')).toBeUndefined();
      expect(state.get('version')).toBe(4);
      expect(state.get('fuelCoins')).toBe(200);
    });

    it('should preserve other fields during migration', () => {
      const v3Data = {
        version: 3,
        fuel: 80,
        upgrades: { engine: 3, tire: 2, body: 2 },
        fuelCoins: 500,
        gearCoins: 100,
        nitroCharges: 5,
        achievements: ['first_quiz', 'first_race'],
        unlockedTracks: ['shanghai-2d', 'monaco-2d'],
        learning: {
          totalWordsSeen: 50,
          totalWordsMastered: 10,
          totalQuizzes: 5,
        },
      };
      localStorage.setItem('wr_game_state_test_user', JSON.stringify(v3Data));

      const state = new GameState(eventBus, 'test_user');

      // 废弃字段应被删除
      expect(state.get('fuel')).toBeUndefined();
      expect(state.get('upgrades')).toBeUndefined();

      // 其他字段应保留
      expect(state.get('version')).toBe(4);
      expect(state.get('fuelCoins')).toBe(500);
      expect(state.get('gearCoins')).toBe(100);
      expect(state.get('nitroCharges')).toBe(5);
      expect(state.get('achievements')).toEqual(['first_quiz', 'first_race']);
      expect(state.get('unlockedTracks')).toEqual(['shanghai-2d', 'monaco-2d']);
      expect(state.get('learning.totalWordsSeen')).toBe(50);
      expect(state.get('learning.totalWordsMastered')).toBe(10);
      expect(state.get('learning.totalQuizzes')).toBe(5);
    });

    it('should clean debug data during migration', () => {
      const v3Data = {
        version: 3,
        fuel: 100,
        upgrades: { engine: 4, tire: 4, body: 4 },
        fuelCoins: 5000,  // 调试数据
        gearCoins: 3000,  // 调试数据
        nitroCharges: 20, // 调试数据
        achievements: Array(15).fill('achievement'), // 调试数据
        unlockedTracks: Array(16).fill('fake-track'), // 16个赛道，触发 > 15 清理
      };
      localStorage.setItem('wr_game_state_test_user', JSON.stringify(v3Data));

      const state = new GameState(eventBus, 'test_user');

      // 应清理调试数据
      expect(state.get('fuelCoins')).toBe(100);
      expect(state.get('gearCoins')).toBe(50);
      expect(state.get('nitroCharges')).toBe(0);
      expect(state.get('achievements')).toEqual([]);
      expect(state.get('unlockedTracks')).toEqual(['shanghai-2d']);
    });

    it('should not clean normal data during migration', () => {
      const v3Data = {
        version: 3,
        fuel: 30,
        upgrades: { engine: 2, tire: 1, body: 1 },
        fuelCoins: 500,   // 正常数据
        gearCoins: 100,   // 正常数据
        nitroCharges: 3,  // 正常数据
        achievements: ['first_quiz', 'first_race', 'streak_3'], // 3个成就
        unlockedTracks: ['shanghai-2d', 'monaco-2d'], // 2个赛道
      };
      localStorage.setItem('wr_game_state_test_user', JSON.stringify(v3Data));

      const state = new GameState(eventBus, 'test_user');

      // 正常数据应保留
      expect(state.get('fuelCoins')).toBe(500);
      expect(state.get('gearCoins')).toBe(100);
      expect(state.get('nitroCharges')).toBe(3);
      expect(state.get('achievements')).toEqual(['first_quiz', 'first_race', 'streak_3']);
      expect(state.get('unlockedTracks')).toEqual(['shanghai-2d', 'monaco-2d']);
    });

    it('should be idempotent (can run multiple times)', () => {
      const v3Data = {
        version: 3,
        fuel: 50,
        upgrades: { engine: 2, tire: 1, body: 1 },
        fuelCoins: 500,
      };
      localStorage.setItem('wr_game_state_test_user', JSON.stringify(v3Data));

      // 第一次迁移
      const state1 = new GameState(eventBus, 'test_user');
      expect(state1.get('version')).toBe(4);
      expect(state1.get('fuel')).toBeUndefined();
      expect(state1.get('upgrades')).toBeUndefined();

      // 第二次加载（不应再触发迁移，因为已保存到 localStorage）
      const state2 = new GameState(eventBus, 'test_user');
      expect(state2.get('version')).toBe(4);
      expect(state2.get('fuel')).toBeUndefined();
      expect(state2.get('upgrades')).toBeUndefined();
      expect(state2.get('fuelCoins')).toBe(500);
    });

    it('should handle missing version field (legacy data)', () => {
      const legacyData = {
        fuel: 100,
        upgrades: { engine: 1, tire: 1, body: 1 },
        fuelCoins: 200,
      };
      localStorage.setItem('wr_game_state_test_user', JSON.stringify(legacyData));

      const state = new GameState(eventBus, 'test_user');

      // 应该触发迁移
      expect(state.get('version')).toBe(4);
      expect(state.get('fuel')).toBeUndefined();
      expect(state.get('upgrades')).toBeUndefined();
      expect(state.get('fuelCoins')).toBe(200);
    });
  });

  describe('multi-user migration', () => {
    it('should migrate each user independently', () => {
      // 创建多个用户的 v3 数据
      const v3Data1 = {
        version: 3,
        fuel: 50,
        upgrades: { engine: 2, tire: 1, body: 1 },
        fuelCoins: 500,
      };
      const v3Data2 = {
        version: 3,
        fuel: 80,
        upgrades: { engine: 3, tire: 2, body: 2 },
        fuelCoins: 300,
      };

      localStorage.setItem('wr_game_state_user_001', JSON.stringify(v3Data1));
      localStorage.setItem('wr_game_state_user_002', JSON.stringify(v3Data2));

      // 加载两个用户的数据（触发迁移）
      const state1 = new GameState(eventBus, 'user_001');
      const state2 = new GameState(eventBus, 'user_002');

      // 验证第一个用户
      expect(state1.get('version')).toBe(4);
      expect(state1.get('fuel')).toBeUndefined();
      expect(state1.get('upgrades')).toBeUndefined();
      expect(state1.get('fuelCoins')).toBe(500);

      // 验证第二个用户
      expect(state2.get('version')).toBe(4);
      expect(state2.get('fuel')).toBeUndefined();
      expect(state2.get('upgrades')).toBeUndefined();
      expect(state2.get('fuelCoins')).toBe(300);
    });
  });
});
