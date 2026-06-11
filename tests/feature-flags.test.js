import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeatureFlags } from '../config/feature-flags.js';

describe('FeatureFlags', () => {
  beforeEach(() => {
    localStorage.clear();
    FeatureFlags.reset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('isEnabled', () => {
    it('should return true for enabled flag', () => {
      expect(FeatureFlags.isEnabled('2d-track')).toBe(true);
      expect(FeatureFlags.isEnabled('multiple-tracks')).toBe(true);
    });

    it('should enable 3D track by default for Epic 5', () => {
      expect(FeatureFlags.isEnabled('3d-track')).toBe(true);
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
        '3d-track': false,
        'custom-flag': true
      }));

      FeatureFlags.load();

      expect(FeatureFlags.isEnabled('3d-track')).toBe(false);
      expect(FeatureFlags.isEnabled('custom-flag')).toBe(true);
      // 默认值仍然存在
      expect(FeatureFlags.isEnabled('2d-track')).toBe(true);
    });

    it('should load legacy console key featureFlags for manual testing', () => {
      localStorage.setItem('featureFlags', JSON.stringify({
        '3d-track': false,
      }));

      FeatureFlags.load();

      expect(FeatureFlags.isEnabled('3d-track')).toBe(false);
    });

    it('should not crash on invalid JSON', () => {
      localStorage.setItem('wr_feature_flags', 'invalid json');

      expect(() => FeatureFlags.load()).not.toThrow();
      // 默认值保持
      expect(FeatureFlags.isEnabled('2d-track')).toBe(true);
      expect(FeatureFlags.isEnabled('3d-track')).toBe(true);
    });

    it('should handle empty localStorage', () => {
      expect(() => FeatureFlags.load()).not.toThrow();
      expect(FeatureFlags.isEnabled('2d-track')).toBe(true);
      expect(FeatureFlags.isEnabled('3d-track')).toBe(true);
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

  describe('reset', () => {
    it('should restore default feature flags', () => {
      FeatureFlags.disable('2d-track');
      FeatureFlags.disable('3d-track');
      FeatureFlags.disable('multiple-tracks');

      FeatureFlags.reset();

      expect(FeatureFlags.isEnabled('2d-track')).toBe(true);
      expect(FeatureFlags.isEnabled('3d-track')).toBe(true);
      expect(FeatureFlags.isEnabled('multiple-tracks')).toBe(true);
    });
  });

  describe('persistence workflow', () => {
    it('should persist changes across load/save cycles', () => {
      // 修改并保存
      FeatureFlags.enable('3d-track');
      FeatureFlags.save();

      // 重置到默认值
      FeatureFlags.reset();

      // 加载
      FeatureFlags.load();

      // 验证持久化
      expect(FeatureFlags.isEnabled('3d-track')).toBe(true);
    });
  });
});
