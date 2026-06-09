/**
 * Car Physics Tests
 * Tests the core physics formulas from car.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Car } from '../js/car.js';

describe('Car', () => {
  let car;
  let mockTrack;

  beforeEach(() => {
    // Create a car at position (100, 100) facing right (angle = 0)
    car = new Car(100, 100, 0);

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
    it('should initialize with correct position and angle', () => {
      expect(car.x).toBe(100);
      expect(car.y).toBe(100);
      expect(car.angle).toBe(0);
    });

    it('should start with zero speed', () => {
      expect(car.speed).toBe(0);
    });

    it('should have default upgrade levels of 1', () => {
      expect(car.upgradeLevels.engine).toBe(1);
      expect(car.upgradeLevels.tire).toBe(1);
      expect(car.upgradeLevels.body).toBe(1);
    });

    it('should have zero nitro charges initially', () => {
      expect(car.nitroCharges).toBe(0);
    });
  });

  describe('base physics constants', () => {
    it('should have maxSpeed of 4.0', () => {
      expect(car.maxSpeed).toBe(4.0);
    });

    it('should have acceleration of 0.08', () => {
      expect(car.acceleration).toBe(0.08);
    });

    it('should have brakeForce of 0.15', () => {
      expect(car.brakeForce).toBe(0.15);
    });

    it('should have friction of 0.988', () => {
      expect(car.friction).toBe(0.988);
    });

    it('should have turnSpeed of 0.045', () => {
      expect(car.turnSpeed).toBe(0.045);
    });

    it('should have nitroDuration of 180 frames', () => {
      expect(car.nitroDuration).toBe(180);
    });
  });

  describe('acceleration', () => {
    it('should increase speed when accelerating', () => {
      car.input.up = true;
      car.update(mockTrack);
      expect(car.speed).toBeGreaterThan(0);
    });

    it('should not exceed maxSpeed', () => {
      car.speed = 4.0;
      car.input.up = true;
      car.update(mockTrack);
      expect(car.speed).toBeLessThanOrEqual(4.0);
    });

    it('should accelerate faster with nitro', () => {
      const carWithNitro = new Car(100, 100, 0);
      carWithNitro.nitroActive = true;
      carWithNitro.nitroTimer = 180; // Need timer for nitro to stay active
      carWithNitro.input.up = true;
      carWithNitro.update(mockTrack);

      const normalCar = new Car(100, 100, 0);
      normalCar.input.up = true;
      normalCar.update(mockTrack);

      // Nitro car should accelerate faster (0.2 vs 0.08)
      // Normal: 0.08 * 0.988 ≈ 0.079
      // Nitro: 0.2 * 0.988 ≈ 0.197
      expect(carWithNitro.speed).toBeGreaterThan(normalCar.speed);
      expect(carWithNitro.speed).toBeGreaterThan(0.15); // Nitro should be ~0.197
    });

    it('should have nitroMaxSpeed of 8.0', () => {
      expect(car.nitroMaxSpeed).toBe(8.0);
    });
  });

  describe('braking', () => {
    it('should decrease speed when braking', () => {
      car.speed = 2.0;
      car.input.down = true;
      car.update(mockTrack);
      expect(car.speed).toBeLessThan(2.0);
    });

    it('should allow reverse speed up to -1.5', () => {
      car.speed = 0;
      car.input.down = true;
      // Simulate many frames of braking
      for (let i = 0; i < 100; i++) {
        car.update(mockTrack);
      }
      expect(car.speed).toBeGreaterThanOrEqual(-1.5);
    });
  });

  describe('steering', () => {
    it('should turn left when input.left is true', () => {
      car.speed = 2.0;
      car.input.left = true;
      const initialAngle = car.angle;
      car.update(mockTrack);
      expect(car.angle).toBeLessThan(initialAngle);
    });

    it('should turn right when input.right is true', () => {
      car.speed = 2.0;
      car.input.right = true;
      const initialAngle = car.angle;
      car.update(mockTrack);
      expect(car.angle).toBeGreaterThan(initialAngle);
    });

    it('should turn slower at low speeds', () => {
      car.speed = 0.5;
      car.input.left = true;
      car.update(mockTrack);
      const lowSpeedTurn = car.angle;

      car.angle = 0;
      car.speed = 2.0;
      car.input.left = true;
      car.update(mockTrack);
      const highSpeedTurn = car.angle;

      // Higher speed should turn more (turnFactor is min(|speed|/1.2, 1))
      expect(Math.abs(highSpeedTurn)).toBeGreaterThan(Math.abs(lowSpeedTurn));
    });
  });

  describe('friction', () => {
    it('should apply friction and slow down when no input', () => {
      car.speed = 2.0;
      car.update(mockTrack);
      // No input up/down, speed *= 0.72 * 0.988 ≈ 0.71
      expect(car.speed).toBeLessThan(2.0);
    });

    it('should stop completely at very low speeds', () => {
      car.speed = 0.04;
      car.update(mockTrack);
      expect(car.speed).toBe(0);
    });
  });

  describe('nitro system', () => {
    it('should not activate nitro without charges', () => {
      car.nitroCharges = 0;
      car.input.nitro = true;
      car.speed = 1.0;
      car.update(mockTrack);
      expect(car.nitroActive).toBe(false);
    });

    it('should not activate nitro when speed is too low', () => {
      car.nitroCharges = 3;
      car.input.nitro = true;
      car.speed = 0.3; // below 0.5 threshold
      car.update(mockTrack);
      expect(car.nitroActive).toBe(false);
    });

    it('should activate nitro when conditions are met', () => {
      car.nitroCharges = 3;
      car.input.nitro = true;
      car.speed = 1.0;
      car.update(mockTrack);
      expect(car.nitroActive).toBe(true);
      expect(car.nitroCharges).toBe(2);
    });

    it('should deactivate nitro after duration expires', () => {
      car.nitroActive = true;
      car.nitroTimer = 1;
      car.update(mockTrack);
      expect(car.nitroActive).toBe(false);
    });
  });

  describe('upgrades', () => {
    it('should apply engine upgrade (speed +10% per level)', () => {
      car.applyUpgrades({ engine: 2, tire: 1, body: 1 });
      expect(car.maxSpeed).toBeCloseTo(4.0 * 1.1, 2); // 4.4
      expect(car.nitroMaxSpeed).toBeCloseTo(8.0 * 1.1, 2); // 8.8
    });

    it('should apply tire upgrade (turn +10% per level)', () => {
      car.applyUpgrades({ engine: 1, tire: 3, body: 1 });
      expect(car.turnSpeed).toBeCloseTo(0.045 * 1.2, 4); // 0.054
    });

    it('should apply body upgrade (accel +5% per level)', () => {
      car.applyUpgrades({ engine: 1, tire: 1, body: 4 });
      expect(car.acceleration).toBeCloseTo(0.08 * 1.15, 4); // 0.092
      expect(car.brakeForce).toBeCloseTo(0.15 * 1.15, 4); // 0.1725
    });

    it('should apply all upgrades together', () => {
      car.applyUpgrades({ engine: 4, tire: 4, body: 4 });
      expect(car.maxSpeed).toBeCloseTo(4.0 * 1.3, 2); // 5.2
      expect(car.turnSpeed).toBeCloseTo(0.045 * 1.3, 4); // 0.0585
      expect(car.acceleration).toBeCloseTo(0.08 * 1.15, 4); // 0.092
    });
  });

  describe('lap tracking', () => {
    it('should increment lap when crossing finish line', () => {
      mockTrack.getProgress = () => 0.05;
      car.lastProgress = 0.95;
      car.speed = 2.0;
      car.update(mockTrack);
      expect(car.lap).toBe(1);
    });

    it('should not increment lap when going backwards', () => {
      mockTrack.getProgress = () => 0.95;
      car.lastProgress = 0.05;
      car.speed = 2.0;
      car.update(mockTrack);
      expect(car.lap).toBe(0);
    });

    it('should not increment lap when speed is too low', () => {
      mockTrack.getProgress = () => 0.05;
      car.lastProgress = 0.95;
      car.speed = 0.5; // below 1 threshold
      car.update(mockTrack);
      expect(car.lap).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset car to given position', () => {
      car.speed = 3.0;
      car.lap = 2;
      car.reset(200, 200, Math.PI);
      expect(car.x).toBe(200);
      expect(car.y).toBe(200);
      expect(car.angle).toBe(Math.PI);
      expect(car.speed).toBe(0);
      expect(car.lap).toBe(0);
    });
  });

  describe('display speed', () => {
    it('should convert speed to km/h display value', () => {
      car.speed = 4.0;
      expect(car.getDisplaySpeed()).toBe(200); // 4.0 * 50
    });

    it('should handle negative speed (reverse)', () => {
      car.speed = -1.5;
      expect(car.getDisplaySpeed()).toBe(75); // |-1.5| * 50
    });
  });

  describe('time-based physics', () => {
    it('should produce similar results at 60fps and 120fps', () => {
      const car60 = new Car(0, 0, 0);
      const car120 = new Car(0, 0, 0);

      car60.input.up = true;
      car120.input.up = true;

      // Simulate 1 second: 60 frames @ 60fps, 120 frames @ 120fps
      for (let i = 0; i < 60; i++) {
        car60.update(mockTrack, 3, 1/60);
      }
      for (let i = 0; i < 120; i++) {
        car120.update(mockTrack, 3, 1/120);
      }

      // Both should have similar speed and position (within 10% tolerance due to floating point accumulation)
      const speedDiff = Math.abs(car60.speed - car120.speed);
      const avgSpeed = (car60.speed + car120.speed) / 2;
      expect(speedDiff / avgSpeed).toBeLessThan(0.1); // Within 10% relative error

      const posDiff = Math.sqrt(Math.pow(car60.x - car120.x, 2) + Math.pow(car60.y - car120.y, 2));
      const avgPos = (Math.abs(car60.x) + Math.abs(car120.x)) / 2;
      if (avgPos > 0.01) {
        expect(posDiff / avgPos).toBeLessThan(0.1); // Within 10% relative error
      }
    });

    it('should use default deltaTime of 1/60 when not specified', () => {
      const car1 = new Car(0, 0, 0);
      const car2 = new Car(0, 0, 0);

      car1.input.up = true;
      car2.input.up = true;

      car1.update(mockTrack); // No deltaTime
      car2.update(mockTrack, 3, 1/60); // Explicit deltaTime

      expect(car1.speed).toBeCloseTo(car2.speed, 6);
      expect(car1.x).toBeCloseTo(car2.x, 6);
    });

    it('should handle varying deltaTime values', () => {
      const car = new Car(0, 0, 0);
      car.input.up = true;

      // Simulate 1 second with varying frame rates
      const frameTimes = [
        1/30, 1/30, 1/30, // 3 frames @ 30fps = 0.1s
        1/60, 1/60, 1/60, 1/60, 1/60, 1/60, // 6 frames @ 60fps = 0.1s
        1/120, 1/120, 1/120, 1/120, 1/120, 1/120, 1/120, 1/120, 1/120, 1/120, 1/120, 1/120, // 12 frames @ 120fps = 0.1s
        1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60 // 42 frames @ 60fps = 0.7s
      ];

      let totalTime = 0;
      for (const dt of frameTimes) {
        car.update(mockTrack, 3, dt);
        totalTime += dt;
      }

      // Should have accelerated for approximately 1 second
      expect(totalTime).toBeCloseTo(1, 2);
      expect(car.speed).toBeGreaterThan(0);
    });

    it('should scale nitro timer with deltaTime', () => {
      const car = new Car(0, 0, 0);
      car.nitroActive = true;
      car.nitroTimer = 180; // 3 seconds @ 60fps

      // Update at 60fps for 1 second
      for (let i = 0; i < 60; i++) {
        car.update(mockTrack, 3, 1/60);
      }

      // Timer should decrease by 60 frames
      expect(car.nitroTimer).toBeCloseTo(120, 1);
    });

    it('should scale particle lifetime with deltaTime', () => {
      const car = new Car(0, 0, 0);
      car.speed = 2.0;
      car.nitroActive = true;
      car.nitroTimer = 180;

      // Update once to generate particles
      car.update(mockTrack, 3, 1/60);
      const initialParticleCount = car.particles.length;
      expect(initialParticleCount).toBeGreaterThan(0);

      // Record initial life
      const initialLife = car.particles[0].life;

      // Update again
      car.update(mockTrack, 3, 1/60);

      // Particle life should decrease
      if (car.particles.length > 0) {
        expect(car.particles[0].life).toBeLessThan(initialLife);
      }
    });
  });
});
