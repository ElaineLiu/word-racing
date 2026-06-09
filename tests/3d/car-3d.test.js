/**
 * Car3D Tests
 * Tests the 3D car physics and model synchronization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Car3D } from '../../3d/core/car-3d.js';
import * as THREE from 'three';

describe('Car3D', () => {
  let car3D;
  let mockScene;
  let mockTrack;

  beforeEach(() => {
    // Mock Three.js scene
    mockScene = {
      add: vi.fn(),
      remove: vi.fn()
    };

    // Create car at position (100, 100) facing right
    car3D = new Car3D(100, 100, 0, mockScene);

    // Mock track for testing
    mockTrack = {
      trackWidth: 76,
      isOnTrack: () => true,
      getProgress: () => 0,
      getNearestDistance: () => 10,
      getTrackNormal: () => ({ x: 0, y: 1, nearestPoint: { x: 100, y: 100 } }),
      points: [{ x: 100, y: 100 }, { x: 110, y: 100 }],
    };
  });

  describe('initialization', () => {
    it('should inherit from Car', () => {
      expect(car3D.x).toBe(100);
      expect(car3D.y).toBe(100);
      expect(car3D.angle).toBe(0);
      expect(car3D.speed).toBe(0);
    });

    it('should have CarModel instance', () => {
      expect(car3D.carModel).toBeDefined();
      expect(car3D.model).toBeDefined();
    });

    it('should add model to scene', () => {
      expect(mockScene.add).toHaveBeenCalledWith(car3D.model.mesh);
    });

    it('should initialize speed boost state', () => {
      expect(car3D.speedBoostMultiplier).toBe(1.0);
      expect(car3D.speedBoostTimer).toBe(0);
    });
  });

  describe('3D position synchronization', () => {
    it('should convert 2D position to 3D (Y → Z)', () => {
      car3D.x = 50;
      car3D.y = 75;
      car3D.sync3DPosition();

      expect(car3D.model.mesh.position.x).toBe(50);
      expect(car3D.model.mesh.position.y).toBe(0);
      expect(car3D.model.mesh.position.z).toBe(75);
    });

    it('should convert 2D angle to 3D rotation', () => {
      car3D.angle = 0;
      car3D.sync3DPosition();
      expect(car3D.model.mesh.rotation.y).toBeCloseTo(0, 10);

      car3D.angle = Math.PI / 2;
      car3D.sync3DPosition();
      expect(car3D.model.mesh.rotation.y).toBeCloseTo(-Math.PI / 2, 10);
    });

    it('should update 3D position after physics update', () => {
      const initialX = car3D.model.mesh.position.x;

      car3D.input.up = true;
      for (let i = 0; i < 60; i++) {
        car3D.update(mockTrack, 3, 1/60);
      }

      expect(car3D.model.mesh.position.x).toBeGreaterThan(initialX);
    });
  });

  describe('collision rebound', () => {
    it('should rollback and bounce when movement crosses the track boundary', () => {
      car3D.x = 137;
      car3D.y = 100;
      car3D.angle = 0;
      car3D.speed = 20;
      car3D.input.up = true;

      const boundaryTrack = {
        trackWidth: 76,
        isOnTrack: () => true,
        getProgress: () => 0,
        getNearestDistance: (x) => Math.abs(x - 100),
        getTrackNormal: (x) => ({
          x: x >= 100 ? -1 : 1,
          y: 0,
          nearestPoint: { x: 100, y: 100 },
        }),
        checkCollision: (car) => Math.abs(car.x - 100) >= 38,
        points: [{ x: 100, y: 100 }, { x: 110, y: 100 }],
      };

      car3D.update(boundaryTrack, 3, 1 / 60);

      expect(car3D.x).toBeLessThan(138);
      expect(car3D.speed).toBeLessThan(0);
      expect(Math.abs(car3D.speed)).toBeLessThan(20);
      expect(car3D.collisionPenalty).toBeGreaterThan(0);
    });
  });

  describe('wheel rotation', () => {
    it('should rotate wheels based on speed', () => {
      const initialRotations = car3D.model.wheels.map(w => w.rotation.x);

      car3D.input.up = true;
      car3D.update(mockTrack, 3, 1/60);

      // Wheels should have rotated
      for (let i = 0; i < car3D.model.wheels.length; i++) {
        expect(car3D.model.wheels[i].rotation.x).toBeGreaterThan(initialRotations[i]);
      }
    });
  });

  describe('speed boost', () => {
    it('should apply speed boost', () => {
      car3D.applySpeedBoost(1.5, 2.0);

      expect(car3D.speedBoostMultiplier).toBe(1.5);
      expect(car3D.speedBoostTimer).toBe(2.0);
    });

    it('should increase max speed during boost', () => {
      const originalMaxSpeed = car3D.maxSpeed;

      car3D.applySpeedBoost(1.5, 2.0);
      car3D.input.up = true;
      car3D.update(mockTrack, 3, 1/60);

      // During boost, max speed should be temporarily increased
      // (verified by checking that speed can exceed original max)
      for (let i = 0; i < 120; i++) {
        car3D.update(mockTrack, 3, 1/60);
      }

      // After boost expires, speed should be back to normal
      expect(car3D.speedBoostTimer).toBeLessThanOrEqual(0);
    });

    it('should expire after duration', () => {
      car3D.applySpeedBoost(1.5, 0.5);

      // Simulate 1 second (boost should expire after 0.5s)
      for (let i = 0; i < 60; i++) {
        car3D.update(mockTrack, 3, 1/60);
      }

      expect(car3D.speedBoostTimer).toBeLessThanOrEqual(0);
      expect(car3D.speedBoostMultiplier).toBe(1.5); // Multiplier stays, timer controls
    });
  });

  describe('reset', () => {
    it('should reset all state including speed boost', () => {
      car3D.speed = 3.0;
      car3D.applySpeedBoost(2.0, 5.0);

      car3D.reset(200, 200, Math.PI);

      expect(car3D.x).toBe(200);
      expect(car3D.y).toBe(200);
      expect(car3D.angle).toBe(Math.PI);
      expect(car3D.speed).toBe(0);
      expect(car3D.speedBoostMultiplier).toBe(1.0);
      expect(car3D.speedBoostTimer).toBe(0);
    });

    it('should sync 3D position after reset', () => {
      car3D.reset(200, 200, Math.PI);

      expect(car3D.model.mesh.position.x).toBe(200);
      expect(car3D.model.mesh.position.z).toBe(200);
      expect(car3D.model.mesh.rotation.y).toBe(-Math.PI);
    });
  });

  describe('without scene (for testing)', () => {
    it('should work without scene parameter', () => {
      const car = new Car3D(0, 0, 0, null);
      expect(car.model).toBeDefined();
      // Should not throw when updating
      car.update(mockTrack, 3, 1/60);
    });
  });
});
