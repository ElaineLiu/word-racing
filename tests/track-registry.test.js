/**
 * 赛道注册表测试
 *
 * 验证赛道数据的完整性和有效性
 */

import { describe, it, expect } from 'vitest';
import { TRACK_REGISTRY } from '../config/track-registry.js';

const SAMPLES_PER_SEGMENT = 24;

function generateSmoothCurve(waypoints) {
  const points = [];
  const n = waypoints.length;
  for (let i = 0; i < n; i++) {
    const p0 = waypoints[(i - 1 + n) % n];
    const p1 = waypoints[i];
    const p2 = waypoints[(i + 1) % n];
    const p3 = waypoints[(i + 2) % n];
    for (let j = 0; j < SAMPLES_PER_SEGMENT; j++) {
      const t = j / SAMPLES_PER_SEGMENT;
      points.push({
        x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
        y: catmullRom(p0.y, p1.y, p2.y, p3.y, t),
        segment: i,
      });
    }
  }
  return points;
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function hasCenterlineIntersection(points, waypointCount) {
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      const c = points[j];
      const d = points[(j + 1) % points.length];
      const gap = Math.abs(a.segment - c.segment);
      const cyclicGap = Math.min(gap, waypointCount - gap);
      if (cyclicGap <= 1) continue;
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
}

function getMinimumNonAdjacentSegmentDistance(points, waypointCount) {
  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      const c = points[j];
      const d = points[(j + 1) % points.length];
      const gap = Math.abs(a.segment - c.segment);
      const cyclicGap = Math.min(gap, waypointCount - gap);
      if (cyclicGap <= 1) continue;
      min = Math.min(min, getSegmentDistance(a, b, c, d));
    }
  }
  return min;
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 !== o2 && o3 !== o4;
}

function orientation(a, b, c) {
  const value = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (Math.abs(value) < 1e-9) return 0;
  return Math.sign(value);
}

function getSegmentDistance(a, b, c, d) {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(
    getPointToSegmentDistance(a, c, d),
    getPointToSegmentDistance(b, c, d),
    getPointToSegmentDistance(c, a, b),
    getPointToSegmentDistance(d, a, b),
  );
}

function getPointToSegmentDistance(p, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const lengthSquared = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / lengthSquared));
  return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
}

function getTurnDirectionCounts(points) {
  let left = 0;
  let right = 0;
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 2 + points.length) % points.length];
    const current = points[i];
    const next = points[(i + 2) % points.length];
    const ax = current.x - prev.x;
    const ay = current.y - prev.y;
    const bx = next.x - current.x;
    const by = next.y - current.y;
    const cross = ax * by - ay * bx;
    if (cross > 0.1) left++;
    if (cross < -0.1) right++;
  }
  return { left, right };
}

function getDirectionChanges(points) {
  let previous = 0;
  let changes = 0;
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 2 + points.length) % points.length];
    const current = points[i];
    const next = points[(i + 2) % points.length];
    const ax = current.x - prev.x;
    const ay = current.y - prev.y;
    const bx = next.x - current.x;
    const by = next.y - current.y;
    const cross = ax * by - ay * bx;
    const direction = cross > 0.1 ? 1 : cross < -0.1 ? -1 : 0;
    if (direction !== 0) {
      if (previous !== 0 && previous !== direction) changes++;
      previous = direction;
    }
  }
  return changes;
}

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

    describe('shanghai-3d', () => {
      it('应该有正确的元数据', () => {
        const track = TRACK_REGISTRY['shanghai-3d'];
        expect(track).toBeDefined();
        expect(track.id).toBe('shanghai-3d');
        expect(track.type).toBe('3d');
        expect(track.cost).toBe(10);
      });

      it('应该有 waypoints 数据', () => {
        const track = TRACK_REGISTRY['shanghai-3d'];
        expect(Array.isArray(track.waypoints)).toBe(true);
        expect(track.waypoints.length).toBeGreaterThan(0);
      });

      it('waypoints 应该包含有效的坐标对象', () => {
        const track = TRACK_REGISTRY['shanghai-3d'];
        track.waypoints.forEach(wp => {
          expect(wp).toHaveProperty('x');
          expect(wp).toHaveProperty('y');
          expect(typeof wp.x).toBe('number');
          expect(typeof wp.y).toBe('number');
        });
      });

      it('应该有 trackWidth', () => {
        const track = TRACK_REGISTRY['shanghai-3d'];
        expect(track.trackWidth).toBe(90);
      });

      it('应该有 masteryCount 解锁要求', () => {
        const track = TRACK_REGISTRY['shanghai-3d'];
        expect(track.unlockRequirements).toBeDefined();
        expect(track.unlockRequirements.masteryCount).toBe(200);
      });

      it('应该有有效的 sceneConfig', () => {
        const track = TRACK_REGISTRY['shanghai-3d'];
        expect(track.sceneConfig).toBeDefined();
        expect(track.sceneConfig.camera).toBeDefined();
        expect(track.sceneConfig.lighting).toBeDefined();
      });
    });
  });

  describe('上海赛道几何安全', () => {
    it.each(['shanghai-2d', 'shanghai-3d'])('%s 中心线不应该自交或过近', (trackId) => {
      const track = TRACK_REGISTRY[trackId];
      const points = generateSmoothCurve(track.waypoints);

      expect(hasCenterlineIntersection(points, track.waypoints.length)).toBe(false);
      expect(getMinimumNonAdjacentSegmentDistance(points, track.waypoints.length)).toBeGreaterThan(track.trackWidth);
    });
    it.each(['shanghai-2d', 'shanghai-3d'])('%s 应该有明显左右转变化', (trackId) => {
      const track = TRACK_REGISTRY[trackId];
      const points = generateSmoothCurve(track.waypoints);
      const turns = getTurnDirectionCounts(points);

      expect(turns.left).toBeGreaterThan(points.length * 0.2);
      expect(turns.right).toBeGreaterThan(points.length * 0.2);
      expect(getDirectionChanges(points)).toBeGreaterThanOrEqual(4);
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
