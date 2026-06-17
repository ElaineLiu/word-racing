/**
 * 答题奖励配置测试
 * Epic 3 - Phase 1: 验证新奖励机制配置
 */

import { describe, it, expect } from 'vitest';
import { REWARDS } from '../config/learning-config.js';

describe('learning-config - Epic 3 rewards', () => {
  describe('per-question rewards', () => {
    it('should give 3 fuel coins for simple questions', () => {
      expect(REWARDS.perCorrectSimple).toEqual({ fuel: 3, gear: 0 });
    });

    it('should give 5 fuel coins for complex questions', () => {
      expect(REWARDS.perCorrectComplex).toEqual({ fuel: 5, gear: 0 });
    });

    it('should give no reward for wrong answers', () => {
      expect(REWARDS.perWrong).toEqual({ fuel: 0, gear: 0 });
    });
  });

  describe('deleted rewards', () => {
    it('should NOT have perQuizComplete reward', () => {
      expect(REWARDS.perQuizComplete).toBeUndefined();
    });

    it('should NOT have combo rewards', () => {
      expect(REWARDS.combo).toBeUndefined();
    });
  });

  describe('accuracy bonus', () => {
    it('should define accuracy bonus configuration', () => {
      expect(REWARDS.accuracyBonus).toBeDefined();
    });

    it('should give 3 gear coins for 100% accuracy', () => {
      expect(REWARDS.accuracyBonus[100]).toEqual({ gear: 3 });
    });

    it('should give 2 gear coins for 80% accuracy', () => {
      expect(REWARDS.accuracyBonus[80]).toEqual({ gear: 2 });
    });

    it('should give 1 gear coin for 60% accuracy', () => {
      expect(REWARDS.accuracyBonus[60]).toEqual({ gear: 1 });
    });
  });

  describe('daily goals', () => {
    it('should NOT have allThree goal', () => {
      expect(REWARDS.dailyGoals.allThree).toBeUndefined();
    });

    it('should NOT have newWords10 goal', () => {
      expect(REWARDS.dailyGoals.newWords10).toBeUndefined();
    });

    it('should give 30 fuel coins for accuracy100 goal', () => {
      expect(REWARDS.dailyGoals.accuracy100).toEqual({ fuel: 30, gear: 0 });
    });

    it('should give 20 fuel coins for accuracy80 goal', () => {
      expect(REWARDS.dailyGoals.accuracy80).toEqual({ fuel: 20, gear: 0 });
    });
  });
});
