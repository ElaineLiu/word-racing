/**
 * 赛道注册表测试
 *
 * 验证赛道数据的完整性和有效性
 */

import { describe, it, expect } from 'vitest';
import { TRACK_REGISTRY } from '../config/track-registry.js';

describe('Track Registry', () => {
  describe('赛道数据完整性', () => {
    it('应该定义所有必需字段', () => {
      const tracks = Object.values(TRACK_REGISTRY);

      tracks.forEach(track => {
        expect(track).toHaveProperty('id');
        expect(track).toHaveProperty('name');
        expect(track).toHaveProperty('type');
        expect(track).toHaveProperty('description');
        expect(track).toHaveProperty('cost');
      });
    });

    it('ID 应该唯一', () => {
      const ids = Object.keys(TRACK_REGISTRY);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });

    it('name 和 description 应该是非空字符串', () => {
      const tracks = Object.values(TRACK_REGISTRY);

      tracks.forEach(track => {
        expect(typeof track.name).toBe('string');
        expect(track.name.length).toBeGreaterThan(0);
        expect(typeof track.description).toBe('string');
        expect(track.description.length).toBeGreaterThan(0);
      });
    });

    it('type 应该是有效类型', () => {
      const validTypes = ['2d', '3d'];
      const tracks = Object.values(TRACK_REGISTRY);

      tracks.forEach(track => {
        expect(validTypes).toContain(track.type);
      });
    });

    it('cost 应该是非负数', () => {
      const tracks = Object.values(TRACK_REGISTRY);

      tracks.forEach(track => {
        expect(typeof track.cost).toBe('number');
        expect(track.cost).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('默认赛道', () => {
    it('应该包含 shanghai-2d 作为默认赛道', () => {
      expect(TRACK_REGISTRY['shanghai-2d']).toBeDefined();
      expect(TRACK_REGISTRY['shanghai-2d'].type).toBe('2d');
      expect(TRACK_REGISTRY['shanghai-2d'].cost).toBe(10);
    });
  });

  describe('2D 赛道数据', () => {
    it('2D 赛道应该有 waypoints 数据', () => {
      const tracks2D = Object.values(TRACK_REGISTRY).filter(t => t.type === '2d');

      tracks2D.forEach(track => {
        expect(track).toHaveProperty('waypoints');
        expect(Array.isArray(track.waypoints)).toBe(true);
        expect(track.waypoints.length).toBeGreaterThan(0);
      });
    });

    it('2D 赛道应该有 trackWidth', () => {
      const tracks2D = Object.values(TRACK_REGISTRY).filter(t => t.type === '2d');

      tracks2D.forEach(track => {
        expect(track).toHaveProperty('trackWidth');
        expect(typeof track.trackWidth).toBe('number');
        expect(track.trackWidth).toBeGreaterThan(0);
      });
    });

    it('waypoints 应该包含有效的坐标对象', () => {
      const shanghai = TRACK_REGISTRY['shanghai-2d'];

      shanghai.waypoints.forEach(wp => {
        expect(wp).toHaveProperty('x');
        expect(wp).toHaveProperty('y');
        expect(typeof wp.x).toBe('number');
        expect(typeof wp.y).toBe('number');
      });
    });
  });

  describe('3D 赛道数据', () => {
    it('3D 赛道应该有 sceneConfig', () => {
      const tracks3D = Object.values(TRACK_REGISTRY).filter(t => t.type === '3d');

      tracks3D.forEach(track => {
        if (track.type === '3d') {
          expect(track).toHaveProperty('sceneConfig');
          expect(typeof track.sceneConfig).toBe('object');
        }
      });
    });
  });

  describe('赛道成本', () => {
    it('所有赛道都应该有成本', () => {
      const tracks = Object.values(TRACK_REGISTRY);
      tracks.forEach(track => {
        expect(track.cost).toBeGreaterThan(0);
      });
    });

    it('shanghai-2d 应该是成本最低的赛道', () => {
      const shanghai = TRACK_REGISTRY['shanghai-2d'];
      const tracks = Object.values(TRACK_REGISTRY);

      tracks.forEach(track => {
        expect(shanghai.cost).toBeLessThanOrEqual(track.cost);
      });
    });
  });
});
