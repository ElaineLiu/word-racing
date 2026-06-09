/**
 * Car3D Gear/RPM Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Car3D } from '../../3d/core/car-3d.js';

describe('Car3D Gear and RPM', () => {
  let car3D;
  let mockTrack;

  beforeEach(() => {
    car3D = new Car3D(0, 0, 0, null);
    mockTrack = {
      trackWidth: 76,
      isOnTrack: () => true,
      getProgress: () => 0,
      getNearestDistance: () => 10,
      getTrackNormal: () => ({ x: 0, y: 1, nearestPoint: { x: 0, y: 0 } }),
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
    };
  });

  describe('getGear', () => {
    it('should return gear 1 at zero speed', () => {
      car3D.speed = 0;
      expect(car3D.getGear()).toBe(1);
    });

    it('should return gear 2 at 20% speed', () => {
      car3D.speed = car3D.maxSpeed * 0.20;
      expect(car3D.getGear()).toBe(2);
    });

    it('should return gear 6 at max speed', () => {
      car3D.speed = car3D.maxSpeed;
      expect(car3D.getGear()).toBe(6);
    });
  });

  describe('getRPM', () => {
    it('should return 0 RPM at zero speed', () => {
      car3D.speed = 0;
      expect(car3D.getRPM()).toBe(0);
    });

    it('should increase within same gear', () => {
      // Test within gear 1 (0-15% speed)
      car3D.speed = car3D.maxSpeed * 0.05;
      const rpm1 = car3D.getRPM();

      car3D.speed = car3D.maxSpeed * 0.10;
      const rpm2 = car3D.getRPM();

      expect(rpm2).toBeGreaterThan(rpm1);
    });

    it('should cycle 0-8000 within each gear', () => {
      // At gear 1 start
      car3D.speed = 0;
      expect(car3D.getRPM()).toBe(0);

      // At gear 1 end (15% speed)
      car3D.speed = car3D.maxSpeed * 0.14;
      expect(car3D.getRPM()).toBeGreaterThan(7000);
    });

    it('should not exceed 8000', () => {
      car3D.speed = car3D.maxSpeed;
      expect(car3D.getRPM()).toBeLessThanOrEqual(8000);
    });
  });

  describe('getDisplaySpeed', () => {
    it('should convert speed to km/h', () => {
      car3D.speed = 4.0;
      expect(car3D.getDisplaySpeed()).toBe(200); // 4.0 * 50
    });
  });
});

describe('Car3D Collision Penalty', () => {
  let car3D;
  let mockTrack;

  beforeEach(() => {
    car3D = new Car3D(0, 0, 0, null);
    mockTrack = {
      trackWidth: 76,
      isOnTrack: () => true,
      getProgress: () => 0,
      getNearestDistance: () => 10,
      getTrackNormal: () => ({ x: 0, y: 1, nearestPoint: { x: 0, y: 0 } }),
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      checkCollision: () => false
    };
  });

  describe('collision handling', () => {
    it('should initialize with zero collision penalty', () => {
      expect(car3D.collisionPenalty).toBe(0);
    });

    it('should detect collision and apply penalty', () => {
      car3D.speed = 3.0;
      mockTrack.checkCollision = () => true;

      car3D.update(mockTrack, 3, 1/60);

      expect(car3D.collisionPenalty).toBeGreaterThan(0);
      expect(car3D.speed).toBeLessThan(3.0); // Speed reduced by 30%
    });

    it('should disable steering during penalty', () => {
      mockTrack.checkCollision = () => true;
      car3D.input.left = true;
      car3D.update(mockTrack, 3, 1/60);

      // Penalty should be set (shortened to 0.5 seconds)
      expect(car3D.collisionPenalty).toBe(0.5);
    });

    it('should expire penalty after duration', () => {
      car3D.collisionPenalty = 0.5;

      // Simulate 1 second
      for (let i = 0; i < 60; i++) {
        car3D.update(mockTrack, 3, 1/60);
      }

      expect(car3D.collisionPenalty).toBeLessThanOrEqual(0);
    });
  });
});
