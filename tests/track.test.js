/**
 * Track Tests
 * Tests the track geometry and collision detection from track.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Track } from '../js/track.js';
import { TRACK } from '../config/game-config.js';

describe('Track', () => {
  let track;

  beforeEach(() => {
    track = new Track();
  });

  describe('initialization', () => {
    it('should have trackWidth from config', () => {
      expect(track.trackWidth).toBe(TRACK.WIDTH);
    });

    it('should have waypoints from config', () => {
      expect(track.waypoints.length).toBe(TRACK.WAYPOINTS.length);
    });

    it('should generate smooth curve points', () => {
      expect(track.points.length).toBeGreaterThan(0);
    });

    it('should calculate start position', () => {
      expect(track.startPos.x).toBeDefined();
      expect(track.startPos.y).toBeDefined();
      expect(track.startPos.angle).toBeDefined();
    });
  });

  describe('Catmull-Rom spline', () => {
    it('should generate smooth interpolation between waypoints', () => {
      // First waypoint should be close to first curve point
      const firstWp = track.waypoints[0];
      const firstPoint = track.points[0];
      expect(Math.abs(firstPoint.x - firstWp.x)).toBeLessThan(1);
      expect(Math.abs(firstPoint.y - firstWp.y)).toBeLessThan(1);
    });

    it('should produce correct number of points (waypoints * samples)', () => {
      const expectedPoints = TRACK.WAYPOINTS.length * TRACK.SAMPLES_PER_SEGMENT;
      expect(track.points.length).toBe(expectedPoints);
    });

    it('should create a closed loop (first and last points should connect)', () => {
      const first = track.points[0];
      const last = track.points[track.points.length - 1];
      // Last point should loop back to connect with first
      expect(last).toBeDefined();
    });
  });

  describe('collision detection', () => {
    it('should detect when point is on track', () => {
      // Start position should be on track
      const result = track.isOnTrack(track.startPos.x, track.startPos.y);
      expect(result).toBe(true);
    });

    it('should detect when point is off track', () => {
      // Far outside the track should be off track
      const result = track.isOnTrack(0, 0);
      expect(result).toBe(false);
    });

    it('should calculate nearest distance to track center', () => {
      // At start position, distance should be small
      const dist = track.getNearestDistance(track.startPos.x, track.startPos.y);
      expect(dist).toBeLessThan(track.trackWidth / 2);
    });

    it('should return larger distance for far points', () => {
      const dist = track.getNearestDistance(0, 0);
      expect(dist).toBeGreaterThan(track.trackWidth);
    });
  });

  describe('progress calculation', () => {
    it('should return progress between 0 and 1', () => {
      const progress = track.getProgress(track.startPos.x, track.startPos.y);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });

    it('should return 0 at start position', () => {
      const progress = track.getProgress(track.startPos.x, track.startPos.y);
      expect(progress).toBeCloseTo(0, 1);
    });

    it('should increase progress along the track', () => {
      const startProgress = track.getProgress(track.startPos.x, track.startPos.y);
      // Move along track direction
      const nextPoint = track.points[Math.floor(track.points.length * 0.1)];
      const laterProgress = track.getProgress(nextPoint.x, nextPoint.y);
      expect(laterProgress).toBeGreaterThan(startProgress);
    });
  });

  describe('track normal', () => {
    it('should return normalized direction vector', () => {
      const normal = track.getTrackNormal(track.startPos.x, track.startPos.y + 20);
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
      expect(length).toBeCloseTo(1, 2);
    });

    it('should return nearest point', () => {
      const normal = track.getTrackNormal(track.startPos.x, track.startPos.y + 20);
      expect(normal.nearestPoint).toBeDefined();
      expect(normal.nearestPoint.x).toBeDefined();
      expect(normal.nearestPoint.y).toBeDefined();
    });
  });

  describe('rendering', () => {
    it('should render without errors', () => {
      const canvas = { width: 920, height: 620 };
      const ctx = {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        globalAlpha: 1,
        save: () => {},
        restore: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        fillText: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        ellipse: () => {},
        fill: () => {},
        stroke: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        setLineDash: () => {},
        quadraticCurveTo: () => {},
      };

      expect(() => track.render(ctx, 1)).not.toThrow();
    });
  });
});
