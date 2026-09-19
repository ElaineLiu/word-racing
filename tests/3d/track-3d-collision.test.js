import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRACK_REGISTRY } from '../../config/track-registry.js';
import { EventBus } from '../../core/event-bus.js';
import { Track3D } from '../../3d/core/track-3d.js';
import { createMockGameState } from '../../3d/utils/test-fixtures.js';

function createRendererFactory() {
  return vi.fn(() => ({
    render: vi.fn(),
    dispose: vi.fn(),
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    setClearColor: vi.fn(),
  }));
}

function createTrack() {
  return new Track3D(
    TRACK_REGISTRY['shanghai-3d'],
    new EventBus(),
    createMockGameState(),
    { rendererFactory: createRendererFactory() }
  );
}

describe('Track3D collision and progress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should detect start position as on track', () => {
    const track = createTrack();
    expect(track.isOnTrack(track.startPos.x, track.startPos.y)).toBe(true);
  });

  it('should share the accepted Shanghai route and expanded world size', () => {
    const track = createTrack();
    expect(TRACK_REGISTRY['shanghai-3d'].waypoints)
      .toBe(TRACK_REGISTRY['shanghai-2d'].waypoints);
    expect(track.canvasSize).toEqual({ width: 3000, height: 1900 });
    expect(track.centerline).toHaveLength(80 * 24);
    expect(track.startPos.x).toBeCloseTo(TRACK_REGISTRY['shanghai-2d'].waypoints[0].x, 8);
    expect(track.startPos.y).toBeCloseTo(TRACK_REGISTRY['shanghai-2d'].waypoints[0].y, 8);
  });

  it('should build the visual road from the same centerline as collision geometry', () => {
    const track = createTrack();
    const road = track.scene.getObjectByName('track-road');
    const positions = road.geometry.attributes.position;
    expect(positions.count).toBe((track.centerline.length + 1) * 2);
    expect(Number.isFinite(road.geometry.boundingSphere?.radius ?? 0)).toBe(true);
  });

  it('should accept car-like object for isOnTrack', () => {
    const track = createTrack();
    expect(track.isOnTrack({ x: track.startPos.x, y: track.startPos.y })).toBe(true);
  });

  it('should detect far point as off track', () => {
    const track = createTrack();
    expect(track.isOnTrack(-10000, -10000)).toBe(false);
  });

  it('should return nearest distance', () => {
    const track = createTrack();
    expect(track.getNearestDistance(track.startPos.x, track.startPos.y)).toBeLessThan(track.trackWidth / 2);
    expect(track.getNearestDistance(-10000, -10000)).toBeGreaterThan(track.trackWidth);
  });

  it('should return progress in [0, 1]', () => {
    const track = createTrack();
    const progress = track.getProgress({ x: track.startPos.x, y: track.startPos.y });
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(1);
  });

  it('should return progress close to 0 at start position', () => {
    const track = createTrack();
    expect(track.getProgress({ x: track.startPos.x, y: track.startPos.y })).toBeCloseTo(0, 2);
  });

  it('should return false collision for car on track', () => {
    const track = createTrack();
    expect(track.checkCollision({ x: track.startPos.x, y: track.startPos.y })).toBe(false);
  });

  it('should return true collision for car off track', () => {
    const track = createTrack();
    expect(track.checkCollision({ x: -10000, y: -10000 })).toBe(true);
  });

  it('should include car body clearance in collision checks', () => {
    const track = createTrack();
    const contact = track.getBoundaryContact(track.startPos.x, track.startPos.y);
    const halfCar = 5;
    const x = contact.nearestPoint.x + contact.normal.x * (track.trackWidth / 2 - halfCar + 0.1);
    const y = contact.nearestPoint.y + contact.normal.y * (track.trackWidth / 2 - halfCar + 0.1);
    expect(track.checkCollision({ x, y, width: halfCar * 2 })).toBe(true);
  });
});
