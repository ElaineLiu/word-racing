/**
 * AI Configuration Tests
 * 验证 AI 个性配置的完整性和合理性
 */

import { describe, it, expect } from 'vitest';
import { AI_CONFIG } from '../../config/ai-config.js';

describe('AI_CONFIG', () => {
  describe('PERSONALITIES', () => {
    it('should have aggressive personality', () => {
      expect(AI_CONFIG.PERSONALITIES.aggressive).toBeDefined();
    });

    it('should have balanced personality', () => {
      expect(AI_CONFIG.PERSONALITIES.balanced).toBeDefined();
    });

    it('should have conservative personality', () => {
      expect(AI_CONFIG.PERSONALITIES.conservative).toBeDefined();
    });

    it('should have all required fields for each personality', () => {
      const requiredFields = [
        'name',
        'aggression',
        'stability',
        'mistakeProbability',
        'mistakeDuration',
        'speedMultiplier',
        'lookaheadDistance',
      ];

      Object.values(AI_CONFIG.PERSONALITIES).forEach(personality => {
        requiredFields.forEach(field => {
          expect(personality[field]).toBeDefined();
        });
      });
    });

    it('should have correct speed multiplier order', () => {
      const { aggressive, balanced, conservative } = AI_CONFIG.PERSONALITIES;

      expect(aggressive.speedMultiplier).toBeGreaterThan(balanced.speedMultiplier);
      expect(balanced.speedMultiplier).toBeGreaterThan(conservative.speedMultiplier);
    });

    it('should have correct mistake probability order', () => {
      const { aggressive, balanced, conservative } = AI_CONFIG.PERSONALITIES;

      expect(aggressive.mistakeProbability).toBeGreaterThan(balanced.mistakeProbability);
      expect(balanced.mistakeProbability).toBeGreaterThan(conservative.mistakeProbability);
    });

    it('should have correct lookahead distance order', () => {
      const { aggressive, balanced, conservative } = AI_CONFIG.PERSONALITIES;

      expect(aggressive.lookaheadDistance).toBeGreaterThan(balanced.lookaheadDistance);
      expect(balanced.lookaheadDistance).toBeGreaterThan(conservative.lookaheadDistance);
    });

    it('should have probability values in [0, 1]', () => {
      Object.values(AI_CONFIG.PERSONALITIES).forEach(personality => {
        expect(personality.mistakeProbability).toBeGreaterThanOrEqual(0);
        expect(personality.mistakeProbability).toBeLessThanOrEqual(1);
      });
    });

    it('should have speed multiplier in reasonable range [0.8, 1.2]', () => {
      Object.values(AI_CONFIG.PERSONALITIES).forEach(personality => {
        expect(personality.speedMultiplier).toBeGreaterThanOrEqual(0.8);
        expect(personality.speedMultiplier).toBeLessThanOrEqual(1.2);
      });
    });
  });

  describe('PATH_FOLLOWING', () => {
    it('should have lookahead distance', () => {
      expect(AI_CONFIG.PATH_FOLLOWING.lookaheadDistance).toBeDefined();
      expect(AI_CONFIG.PATH_FOLLOWING.lookaheadDistance).toBeGreaterThan(0);
    });

    it('should have offset range', () => {
      expect(AI_CONFIG.PATH_FOLLOWING.offsetRange).toBeDefined();
      expect(AI_CONFIG.PATH_FOLLOWING.offsetRange).toBeGreaterThan(0);
    });
  });

  describe('RECOVERY', () => {
    it('should have duration', () => {
      expect(AI_CONFIG.RECOVERY.duration).toBeDefined();
      expect(AI_CONFIG.RECOVERY.duration).toBeGreaterThan(0);
    });

    it('should have speed reduction', () => {
      expect(AI_CONFIG.RECOVERY.speedReduction).toBeDefined();
      expect(AI_CONFIG.RECOVERY.speedReduction).toBeGreaterThan(0);
      expect(AI_CONFIG.RECOVERY.speedReduction).toBeLessThanOrEqual(1);
    });
  });
});
