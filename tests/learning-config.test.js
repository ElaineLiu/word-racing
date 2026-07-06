/**
 * 答题奖励配置测试
 * Epic 3+4 - Phase 1: 验证新奖励机制配置
 */

import { describe, it, expect } from 'vitest';
import { REWARDS } from '../config/learning-config.js';

describe('learning-config - reward config', () => {
  describe('per-question rewards', () => {
    it('should give 5 fuel coins for simple questions', () => {
      expect(REWARDS.perCorrectSimple).toEqual({ fuel: 5, gear: 0 });
    });

    it('should give 8 gear coins for complex questions', () => {
      expect(REWARDS.perCorrectComplex).toEqual({ fuel: 0, gear: 8 });
    });

    it('should give no reward for wrong answers', () => {
      expect(REWARDS.perWrong).toEqual({ fuel: 0, gear: 0 });
    });
  });

  describe('quiz completion rewards', () => {
    it('should have perQuizComplete reward', () => {
      expect(REWARDS.perQuizComplete).toBeDefined();
    });

    it('should give 10 fuel coins for completing a quiz', () => {
      expect(REWARDS.perQuizComplete).toEqual({ fuel: 10, gear: 0 });
    });
  });

  describe('combo rewards', () => {
    it('should have combo rewards', () => {
      expect(REWARDS.combo).toBeDefined();
    });

    it('should give 5 gear coins for 3x combo', () => {
      expect(REWARDS.combo[3]).toEqual({ fuel: 0, gear: 5 });
    });

    it('should give 25 gear coins for 10x combo (full combo)', () => {
      expect(REWARDS.combo[10]).toEqual({ fuel: 0, gear: 25 });
    });
  });

  describe('deleted rewards', () => {
    it('should NOT have accuracyBonus', () => {
      expect(REWARDS.accuracyBonus).toBeUndefined();
    });
  });

  describe('daily goals', () => {
    it('should have allThree goal', () => {
      expect(REWARDS.dailyGoals.allThree).toBeDefined();
    });

    it('should give 50 fuel + 30 gear for allThree goal', () => {
      expect(REWARDS.dailyGoals.allThree).toEqual({ fuel: 50, gear: 30 });
    });

    it('should have newWords10 goal', () => {
      expect(REWARDS.dailyGoals.newWords10).toBeDefined();
    });

    it('should give 20 fuel for newWords10 goal', () => {
      expect(REWARDS.dailyGoals.newWords10).toEqual({ fuel: 20, gear: 0 });
    });

    it('should give 30 fuel for accuracy80 goal', () => {
      expect(REWARDS.dailyGoals.accuracy80).toEqual({ fuel: 30, gear: 0 });
    });

    it('should NOT have accuracy100 goal', () => {
      expect(REWARDS.dailyGoals.accuracy100).toBeUndefined();
    });
  });
});
