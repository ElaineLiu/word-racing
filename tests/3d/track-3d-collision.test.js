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
});