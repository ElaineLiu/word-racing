/**
 * 成就配置测试
 *
 * 验证成就定义的完整性和正确性
 */

import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS } from '../config/achievements.js';

describe('Achievements Config', () => {
  describe('成就定义完整性', () => {
    it('应该定义所有必需字段', () => {
      const achievements = Object.values(ACHIEVEMENTS);

      achievements.forEach(ach => {
        expect(ach).toHaveProperty('id');
        expect(ach).toHaveProperty('name');
        expect(ach).toHaveProperty('description');
        expect(ach).toHaveProperty('check');
        expect(ach).toHaveProperty('reward');
      });
    });

    it('ID 应该唯一', () => {
      const ids = Object.keys(ACHIEVEMENTS);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });

    it('name 和 description 应该是非空字符串', () => {
      const achievements = Object.values(ACHIEVEMENTS);

      achievements.forEach(ach => {
        expect(typeof ach.name).toBe('string');
        expect(ach.name.length).toBeGreaterThan(0);
        expect(typeof ach.description).toBe('string');
        expect(ach.description.length).toBeGreaterThan(0);
      });
    });

    it('check 应该是函数', () => {
      const achievements = Object.values(ACHIEVEMENTS);

      achievements.forEach(ach => {
        expect(typeof ach.check).toBe('function');
      });
    });

    it('reward 应该包含 track 或 fuelCoins', () => {
      const achievements = Object.values(ACHIEVEMENTS);

      achievements.forEach(ach => {
        const hasTrack = ach.reward.track !== undefined;
        const hasFuelCoins = ach.reward.fuelCoins !== undefined;

        expect(hasTrack || hasFuelCoins).toBe(true);
      });
    });
  });

  describe('成就检查逻辑', () => {
    it('first-quiz: 完成1套题应该返回 true', () => {
      const state = {
        learning: {
          totalQuizzes: 1
        }
      };

      const achievement = ACHIEVEMENTS['first-quiz'];
      expect(achievement.check(state)).toBe(true);
    });

    it('first-quiz: 未完成套题应该返回 false', () => {
      const state = {
        learning: {
          totalQuizzes: 0
        }
      };

      const achievement = ACHIEVEMENTS['first-quiz'];
      expect(achievement.check(state)).toBe(false);
    });

    it('quiz-master-10: 完成10套题应该返回 true', () => {
      const state = {
        learning: {
          totalQuizzes: 10
        }
      };

      const achievement = ACHIEVEMENTS['quiz-master-10'];
      expect(achievement.check(state)).toBe(true);
    });

    it('word-collector-50: 掌握50个单词应该返回 true', () => {
      const state = {
        learning: {
          totalWordsMastered: 50
        }
      };

      const achievement = ACHIEVEMENTS['word-collector-50'];
      expect(achievement.check(state)).toBe(true);
    });
  });

  describe('奖励配置', () => {
    it('track 奖励应该是有效字符串', () => {
      const achievements = Object.values(ACHIEVEMENTS);

      achievements.forEach(ach => {
        if (ach.reward.track) {
          expect(typeof ach.reward.track).toBe('string');
          expect(ach.reward.track.length).toBeGreaterThan(0);
        }
      });
    });

    it('fuelCoins 奖励应该是正数', () => {
      const achievements = Object.values(ACHIEVEMENTS);

      achievements.forEach(ach => {
        if (ach.reward.fuelCoins !== undefined) {
          expect(typeof ach.reward.fuelCoins).toBe('number');
          expect(ach.reward.fuelCoins).toBeGreaterThan(0);
        }
      });
    });
  });
});
