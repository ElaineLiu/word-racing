/**
 * Car Physics Tests
 * Tests the core physics formulas from car.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Car } from '../js/car.js';
import { Track } from '../js/track.js';
import { TRACK_REGISTRY } from '../config/track-registry.js';

describe('Car', () => {
  let car;
  let mockTrack;

  beforeEach(() => {
    localStorage.clear();
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

  describe('real Shanghai 2D road boundary', () => {
    it('lets a car in the visible edge band move inward instead of trapping it behind an invisible wall', () => {
      const data = TRACK_REGISTRY['shanghai-2d'];
      const track = new Track(data.waypoints, data.trackWidth, data.samplesPerSegment, data.canvasSize, data.strictBoundary);
      const center = track.points[228];
      const next = track.points[229];
      const tangent = Math.atan2(next.y - center.y, next.x - center.x);
      const normal = { x: -Math.sin(tangent), y: Math.cos(tangent) };
      const edge = { x: center.x + normal.x * 33, y: center.y + normal.y * 33 };
      expect(track.isOnTrack(edge.x, edge.y)).toBe(true);
      expect(track.isOnTrack(edge.x, edge.y, 17)).toBe(false);

      const realCar = new Car(edge.x, edge.y, tangent + Math.PI / 2);
      realCar.speed = 2;
      realCar.update(track, 3);
      expect(realCar.x).toBeCloseTo(edge.x);
      expect(realCar.y).toBeCloseTo(edge.y);

      // Reorient at zero speed, then move toward the centerline one small
      // step at a time; a single frame cannot clear the whole edge band.
      realCar.speed = 0;
      realCar.input.left = true;
      const beforeTurn = realCar.angle;
      for (let frame = 0; frame < 100; frame++) realCar.update(track, 3);
      expect(realCar.angle).toBeLessThan(beforeTurn - 3);
      realCar.input.left = false;
      realCar.input.up = true;
      const beforeDistance = track.getNearestDistance(realCar.x, realCar.y);
      for (let frame = 0; frame < 10; frame++) realCar.update(track, 3);
      expect(track.getNearestDistance(realCar.x, realCar.y)).toBeLessThan(beforeDistance);
      expect(track.isOnTrack(realCar.x, realCar.y)).toBe(true);
    });

    it('preserves forward progress when a driver scrapes the outer edge of the spiral', () => {
      const data = TRACK_REGISTRY['shanghai-2d'];
      const track = new Track(data.waypoints, data.trackWidth, data.samplesPerSegment, data.canvasSize, data.strictBoundary);
      const center = track.points[228];
      const next = track.points[229];
      const tangent = Math.atan2(next.y - center.y, next.x - center.x);
      const normal = { x: -Math.sin(tangent), y: Math.cos(tangent) };
      const realCar = new Car(center.x + normal.x * 26, center.y + normal.y * 26, tangent + 0.8);
      realCar.speed = 2;
      realCar.input.up = true;
      const startProgress = track.getProgress(realCar.x, realCar.y);

      for (let frame = 0; frame < 120; frame++) {
        realCar.update(track, 3);
        expect(track.isOnTrack(realCar.x, realCar.y, realCar.width / 2)).toBe(true);
      }
      expect(track.getProgress(realCar.x, realCar.y)).toBeGreaterThan(startProgress + 0.002);
    });

    it('blocks a direct hop across the spiral while the car is driving', () => {
      const data = TRACK_REGISTRY['shanghai-2d'];
      const track = new Track(data.waypoints, data.trackWidth, data.samplesPerSegment, data.canvasSize, data.strictBoundary);
      const start = track.points[482];
      const nearbyOtherLane = track.points[900];
      const gapMidpoint = {
        x: (start.x + nearbyOtherLane.x) / 2,
        y: (start.y + nearbyOtherLane.y) / 2,
      };
      expect(track.isOnTrack(gapMidpoint.x, gapMidpoint.y)).toBe(false);
      const heading = Math.atan2(nearbyOtherLane.y - start.y, nearbyOtherLane.x - start.x);
      const realCar = new Car(start.x, start.y, heading);
      realCar.speed = 4;
      realCar.input.up = true;

      for (let frame = 0; frame < 120; frame++) {
        realCar.update(track, 3);
        expect(track.isOnTrack(realCar.x, realCar.y, realCar.width / 2)).toBe(true);
      }

      expect(Math.hypot(realCar.x - nearbyOtherLane.x, realCar.y - nearbyOtherLane.y)).toBeGreaterThan(80);
    });

    it('does not impose the Shanghai hard boundary on another 2D track', () => {
      const data = TRACK_REGISTRY['monaco-2d'];
      const track = new Track(data.waypoints, data.trackWidth, 24, data.canvasSize, data.strictBoundary);

      expect(track.strictBoundary).toBe(false);
    });
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
