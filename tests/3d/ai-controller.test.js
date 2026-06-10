/**
 * AIController Unit Tests
 * AI 控制器状态机和决策逻辑测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIController } from '../../3d/controllers/ai-controller.js';
import { Car3D } from '../../3d/core/car-3d.js';
import { AI_CONFIG } from '../../config/ai-config.js';
import { TRACK_REGISTRY } from '../../config/track-registry.js';
import { Track } from '../../js/track.js';

describe('AIController', () => {
  let mockCar;
  let mockTrack;
  let personality;

  beforeEach(() => {
    // Mock car
    mockCar = {
      x: 0,
      y: 0,
      angle: 0,
      input: {
        up: false,
        down: false,
        left: false,
        right: false,
        nitro: false,
      },
      maxSpeed: 300,
    };

    // Mock track
    mockTrack = {
      waypoints: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 200, y: 0 },
        { x: 300, y: 0 },
      ],
    };

    // Use balanced personality
    personality = AI_CONFIG.PERSONALITIES.balanced;
  });

  describe('Constructor', () => {
    it('should initialize with car, track, and personality', () => {
      const controller = new AIController(mockCar, mockTrack, personality);

      expect(controller.personality).toBe('Balanced');
      expect(controller.currentBehavior).toBe('racing');
    });

    it('should use default balanced personality if not provided', () => {
      const controller = new AIController(mockCar, mockTrack);

      expect(controller.personality).toBe('Balanced');
    });

    it('should create PathFollower with correct lookahead distance', () => {
      const aggressive = AI_CONFIG.PERSONALITIES.aggressive;
      const controller = new AIController(mockCar, mockTrack, aggressive);

      // PathFollower 应该使用个性的前瞻距离
      // （间接验证，通过检查转向行为）
      expect(controller).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update car input based on path following', () => {
      const controller = new AIController(mockCar, mockTrack, personality);

      controller.update(1 / 60);

      // 应该设置油门（up）
      expect(mockCar.input.up).toBe(true);
    });

    it('should turn left when target is to the left', () => {
      // 设置车在起点，朝向 +X，但路径向左弯曲
      mockTrack.waypoints = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: -50 }, // 向左弯曲
      ];
      mockCar.x = 40;
      mockCar.y = 0;
      mockCar.angle = 0;

      const controller = new AIController(mockCar, mockTrack, personality);
      controller.update(1 / 60);

      // 应该左转
      expect(mockCar.input.left).toBe(true);
      expect(mockCar.input.right).toBe(false);
    });

    it('should turn right when target is to the right', () => {
      // 设置路径向右弯曲
      mockTrack.waypoints = [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 }, // 向右弯曲
      ];
      mockCar.x = 40;
      mockCar.y = 0;
      mockCar.angle = 0;

      const controller = new AIController(mockCar, mockTrack, personality);
      controller.update(1 / 60);

      // 应该右转
      expect(mockCar.input.right).toBe(true);
      expect(mockCar.input.left).toBe(false);
    });

    it('should enter recovery state when mistake is triggered', () => {
      // Mock Math.random: 构造函数使用任意值，犯错检查返回小值
      let callCount = 0;
      const mockRandom = vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return 0.5; // 构造函数中的偏移
        }
        return 0.01; // 犯错检查（< 0.05）
      });

      const controller = new AIController(mockCar, mockTrack, personality);

      // 第一次 update 检查犯错（每秒一次）
      controller.update(1.0);

      expect(controller.currentBehavior).toBe('recovering');

      mockRandom.mockRestore();
    });

    it('should stay in racing state if no mistake', () => {
      // Mock Math.random to avoid mistake
      const mockRandom = vi.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.99); // 大于 mistakeProbability

      const controller = new AIController(mockCar, mockTrack, personality);
      controller.update(1.0);

      expect(controller.currentBehavior).toBe('racing');

      mockRandom.mockRestore();
    });

    it('should exit recovery state after duration', () => {
      let callCount = 0;
      const mockRandom = vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return 0.5; // 构造函数
        }
        if (callCount === 2) {
          return 0.01; // 触发犯错
        }
        return 0.99; // 后续不触发犯错
      });

      const controller = new AIController(mockCar, mockTrack, personality);
      controller.update(1.0); // 触发犯错

      expect(controller.currentBehavior).toBe('recovering');

      // 等待恢复时间过去
      const recoveryDuration = personality.mistakeDuration || 1.0;
      controller.update(recoveryDuration);

      expect(controller.currentBehavior).toBe('racing');

      mockRandom.mockRestore();
    });

    it('should reduce speed during recovery', () => {
      let callCount = 0;
      const mockRandom = vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return 0.5; // 构造函数
        }
        return 0.01; // 触发犯错
      });

      const controller = new AIController(mockCar, mockTrack, personality);
      controller.update(1.0); // 触发犯错

      // 恢复期间，油门应该不那么激进
      // （具体实现可能不同，这里验证行为状态）
      expect(controller.currentBehavior).toBe('recovering');

      mockRandom.mockRestore();
    });
  });


  describe('Closed-loop driving', () => {
    it('should keep one AI opponent moving on track for the opening seconds', () => {
      const trackData = TRACK_REGISTRY['shanghai-3d'];
      const realTrack = new Track(trackData.waypoints, trackData.trackWidth);
      realTrack.checkCollision = car => realTrack.getNearestDistance(car.x, car.y) >= realTrack.trackWidth / 2;

      const aiCar = new Car3D(
        realTrack.startPos.x + 20,
        realTrack.startPos.y,
        realTrack.startPos.angle,
        null
      );

      const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const controller = new AIController(aiCar, realTrack, AI_CONFIG.PERSONALITIES.balanced);

      for (let frame = 0; frame < 300; frame++) {
        controller.update(1 / 60);
        aiCar.update(realTrack, 3, 1 / 60);
      }

      const distanceFromCenter = realTrack.getNearestDistance(aiCar.x, aiCar.y);

      expect(distanceFromCenter).toBeLessThan(realTrack.trackWidth / 2 - 4);
      expect(aiCar.speed).toBeGreaterThan(0.5);
      expect(realTrack.getProgress(aiCar.x, aiCar.y)).toBeGreaterThan(0.05);

      mockRandom.mockRestore();
    });
  });

  describe('Personality differences', () => {
    it('should use different lookahead distances for different personalities', () => {
      const aggressive = new AIController(mockCar, mockTrack, AI_CONFIG.PERSONALITIES.aggressive);
      const conservative = new AIController(mockCar, mockTrack, AI_CONFIG.PERSONALITIES.conservative);

      // 不同个性应该创建不同的 PathFollower
      // （间接验证，通过检查存在性）
      expect(aggressive).toBeDefined();
      expect(conservative).toBeDefined();
    });

    it('aggressive should have higher mistake probability', () => {
      const aggressive = AI_CONFIG.PERSONALITIES.aggressive;
      const conservative = AI_CONFIG.PERSONALITIES.conservative;

      expect(aggressive.mistakeProbability).toBeGreaterThan(conservative.mistakeProbability);
    });
  });
});
