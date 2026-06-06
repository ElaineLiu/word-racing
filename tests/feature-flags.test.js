import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeatureFlags } from '../config/feature-flags.js';

describe('FeatureFlags', () => {
  beforeEach(() => {
    localStorage.clear();
    // 重置为默认值
    FeatureFlags.flags = {
      '2d-track': true,
      '3d-track': false,
      'multiple-tracks': true,
    };
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('isEnabled', () => {
    it('should return true for enabled flag', () => {
      expect(FeatureFlags.isEnabled('2d-track')).toBe(true);
      expect(FeatureFlags.isEnabled('multiple-tracks')).toBe(true);
    });

    it('should return false for disabled flag', () => {
      expect(FeatureFlags.isEnabled('3d-track')).toBe(false);
    });

    it('should return false for unknown flag', () => {
      expect(FeatureFlags.isEnabled('unknown-flag')).toBe(false);
    });
  });

  describe('enable', () => {
    it('should enable a flag', () => {
      FeatureFlags.enable('3d-track');
      expect(FeatureFlags.isEnabled('3d-track')).toBe(true);
    });

    it('should enable unknown flag', () => {
      FeatureFlags.enable('custom-flag');
      expect(FeatureFlags.isEnabled('custom-flag')).toBe(true);
    });
  });

  describe('disable', () => {
    it('should disable a flag', () => {
      FeatureFlags.disable('2d-track');
      expect(FeatureFlags.isEnabled('2d-track')).toBe(false);
    });
  });

  describe('load', () => {
    it('should load flags from localStorage', () => {
      localStorage.setItem('wr_feature_flags', JSON.stringify({
        '3d-track': true,
        'custom-flag': true
      }));

      FeatureFlags.load();

      expect(FeatureFlags.isEnabled('3d-track')).toBe(true);
      expect(FeatureFlags.isEnabled('custom-flag')).toBe(true);
      // 默认值仍然存在
      expect(FeatureFlags.isEnabled('2d-track')).toBe(true);
    });

    it('should not crash on invalid JSON', () => {
      localStorage.setItem('wr_feature_flags', 'invalid json');

      expect(() => FeatureFlags.load()).not.toThrow();
      // 默认值保持
      expect(FeatureFlags.isEnabled('2d-track')).toBe(true);
    });

    it('should handle empty localStorage', () => {
      expect(() => FeatureFlags.load()).not.toThrow();
      expect(FeatureFlags.isEnabled('2d-track')).toBe(true);
    });
  });

  describe('save', () => {
    it('should save flags to localStorage', () => {
      FeatureFlags.enable('3d-track');
      FeatureFlags.save();

      const saved = JSON.parse(localStorage.getItem('wr_feature_flags'));
      expect(saved['3d-track']).toBe(true);
    });

    it('should save all current flags', () => {
      FeatureFlags.disable('multiple-tracks');
      FeatureFlags.save();

      const saved = JSON.parse(localStorage.getItem('wr_feature_flags'));
      expect(saved['multiple-tracks']).toBe(false);
      expect(saved['2d-track']).toBe(true);
    });
  });

  describe('persistence workflow', () => {
    it('should persist changes across load/save cycles', () => {
      // 修改并保存
      FeatureFlags.enable('3d-track');
      FeatureFlags.save();

      // 重置到默认值
      FeatureFlags.flags = {
        '2d-track': true,
        '3d-track': false,
        'multiple-tracks': true,
      };

      // 加载
      FeatureFlags.load();

      // 验证持久化
      expect(FeatureFlags.isEnabled('3d-track')).toBe(true);
    });
  });
});
