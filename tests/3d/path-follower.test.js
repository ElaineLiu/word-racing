/**
 * PathFollower Tests
 * Pure Pursuit 路径跟随算法测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PathFollower } from '../../3d/utils/path-follower.js';

describe('PathFollower', () => {
  let waypoints;

  beforeEach(() => {
    // 简单的直线路径：沿 X 轴正方向
    waypoints = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 200, y: 0 },
      { x: 300, y: 0 },
    ];
  });

  describe('Constructor', () => {
    it('should initialize with waypoints and lookahead distance', () => {
      const follower = new PathFollower(waypoints, 50);
      expect(follower.waypoints).toEqual(waypoints);
      expect(follower.lookaheadDistance).toBe(50);
    });

    it('should use default lookahead distance if not provided', () => {
      const follower = new PathFollower(waypoints);
      expect(follower.lookaheadDistance).toBe(100);
    });

    it('should throw error if waypoints is empty', () => {
      expect(() => new PathFollower([], 50)).toThrow();
    });
  });

  describe('calculateSteering', () => {
    it('should steer right when target is to the right', () => {
      const follower = new PathFollower(waypoints, 50);

      // 车在起点 (0,0)，朝向 +Y 方向（角度 -π/2），目标在前方右侧
      const steering = follower.calculateSteering(0, 0, -Math.PI / 2);

      // 目标在右侧，应该右转（steering > 0）
      expect(steering).toBeGreaterThan(0);
      expect(steering).toBeLessThanOrEqual(1);
    });

    it('should steer left when target is to the left', () => {
      // 路径沿 -Y 方向（在 Canvas 坐标系中是向上）
      const leftWaypoints = [
        { x: 0, y: 0 },
        { x: 0, y: -50 },
        { x: 0, y: -100 },
      ];
      const follower = new PathFollower(leftWaypoints, 50);

      // 车在起点 (0,0)，朝向 +X 方向（角度 0）
      // 目标在前方左侧（-Y 方向）
      const steering = follower.calculateSteering(0, 0, 0);

      // 目标在左侧，应该左转（steering < 0）
      expect(steering).toBeLessThan(0);
      expect(steering).toBeGreaterThanOrEqual(-1);
    });

    it('should go straight when target is ahead', () => {
      const follower = new PathFollower(waypoints, 50);

      // 车在起点 (0,0)，朝向 +X 方向（角度 0），目标在前方正前方
      const steering = follower.calculateSteering(0, 0, 0);

      // 目标在前方，应该直行（steering ≈ 0）
      expect(Math.abs(steering)).toBeLessThan(0.2);
    });

    it('should handle circular path (last waypoint to first)', () => {
      const circularWaypoints = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];
      const follower = new PathFollower(circularWaypoints, 50);

      // 车在最后一个waypoint附近，前瞻点应该回到第一个waypoint
      const steering = follower.calculateSteering(0, 100, -Math.PI / 2);

      // 应该计算出合理的转向值（不抛错）
      expect(steering).toBeGreaterThanOrEqual(-1);
      expect(steering).toBeLessThanOrEqual(1);
    });

    it('should clamp steering to [-1, 1]', () => {
      // 创建一个急弯路径
      const sharpTurn = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ];
      const follower = new PathFollower(sharpTurn, 10);

      // 车在 (100, 0) 附近，朝向 +X，需要急转弯
      const steering = follower.calculateSteering(100, 0, 0);

      expect(steering).toBeGreaterThanOrEqual(-1);
      expect(steering).toBeLessThanOrEqual(1);
    });
  });

  describe('setOffset', () => {
    it('should apply offset to path', () => {
      const follower = new PathFollower(waypoints, 50);
      follower.setOffset(20);

      // 偏移后，前瞻点应该偏离中心线
      // （具体实现可能不同，这里只验证方法存在且不抛错）
      const steering = follower.calculateSteering(0, 0, 0);
      expect(typeof steering).toBe('number');
    });

    it('should handle negative offset', () => {
      const follower = new PathFollower(waypoints, 50);
      follower.setOffset(-20);

      const steering = follower.calculateSteering(0, 0, 0);
      expect(typeof steering).toBe('number');
    });
  });

  describe('Edge cases', () => {
    it('should handle car at path start', () => {
      const follower = new PathFollower(waypoints, 50);
      const steering = follower.calculateSteering(0, 0, 0);

      expect(typeof steering).toBe('number');
      expect(steering).toBeGreaterThanOrEqual(-1);
      expect(steering).toBeLessThanOrEqual(1);
    });

    it('should handle car at path end', () => {
      const follower = new PathFollower(waypoints, 50);

      // 车在路径末端
      const steering = follower.calculateSteering(300, 0, 0);

      expect(typeof steering).toBe('number');
    });

    it('should handle car off the path', () => {
      const follower = new PathFollower(waypoints, 50);

      // 车远离路径
      const steering = follower.calculateSteering(100, 100, 0);

      expect(typeof steering).toBe('number');
    });

    it('should handle different lookahead distances', () => {
      const shortLookahead = new PathFollower(waypoints, 20);
      const longLookahead = new PathFollower(waypoints, 150);

      const steering1 = shortLookahead.calculateSteering(0, 0, 0);
      const steering2 = longLookahead.calculateSteering(0, 0, 0);

      // 不同的前瞻距离可能导致不同的转向值
      expect(typeof steering1).toBe('number');
      expect(typeof steering2).toBe('number');
    });
  });

  describe('Angle normalization', () => {
    it('should handle angle wrapping around ±π', () => {
      const follower = new PathFollower(waypoints, 50);

      // 车朝向 -X 方向（角度 π 或 -π）
      const steering1 = follower.calculateSteering(0, 0, Math.PI);
      const steering2 = follower.calculateSteering(0, 0, -Math.PI);

      // 两个等效角度应该给出相似的结果
      expect(typeof steering1).toBe('number');
      expect(typeof steering2).toBe('number');
    });
  });
});
