/**
 * 答题奖励配置测试
 * Epic 3+4 - Phase 1: 验证新奖励机制配置
 */

import { describe, it, expect } from 'vitest';
import { REWARDS } from '../config/learning-config.js';

describe('learning-config - reward config', () => {
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

  describe('accuracy bonus', () => {
    it('should have accuracyBonus', () => {
      expect(REWARDS.accuracyBonus).toBeDefined();
    });

    it('should give 3 gear for 100% accuracy', () => {
      expect(REWARDS.accuracyBonus[100]).toEqual({ gear: 3 });
    });

    it('should give 2 gear for 80% accuracy', () => {
      expect(REWARDS.accuracyBonus[80]).toEqual({ gear: 2 });
    });

    it('should give 1 gear for 60% accuracy', () => {
      expect(REWARDS.accuracyBonus[60]).toEqual({ gear: 1 });
    });
  });

  describe('deleted rewards', () => {
    it('should NOT have perQuizComplete', () => {
      expect(REWARDS.perQuizComplete).toBeUndefined();
    });

    it('should NOT have combo', () => {
      expect(REWARDS.combo).toBeUndefined();
    });

    it('should NOT have dailyGoals', () => {
      expect(REWARDS.dailyGoals).toBeUndefined();
    });
  });
});
