import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { TRACK_REGISTRY } from '../../config/track-registry.js';
import { EventBus, Events } from '../../core/event-bus.js';
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
  const eventBus = new EventBus();
  const rendererFactory = createRendererFactory();
  const gameState = createMockGameState();
  const track = new Track3D(
    TRACK_REGISTRY['shanghai-3d'],
    eventBus,
    gameState,
    { rendererFactory }
  );
  return { track, eventBus, rendererFactory, gameState };
}

describe('Track3D', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should construct with track data, eventBus, and gameState', () => {
    const { track } = createTrack();
    expect(track).toBeInstanceOf(Track3D);
  });

  it('should expose TrackInterface metadata getters', () => {
    const { track } = createTrack();
    const data = TRACK_REGISTRY['shanghai-3d'];

    expect(track.id).toBe(data.id);
    expect(track.name).toBe(data.name);
    expect(track.type).toBe('3d');
    expect(track.description).toBe(data.description);
    expect(track.cost).toBe(data.cost);
    expect(track.trackWidth).toBe(data.trackWidth);
    expect(track.waypoints).toEqual(data.waypoints);
  });

  it('should expose startPos with x, y, and angle', () => {
    const { track } = createTrack();
    expect(track.startPos).toHaveProperty('x');
    expect(track.startPos).toHaveProperty('y');
    expect(track.startPos).toHaveProperty('angle');
  });

  it('should expose Three.js scene, camera, and renderer', () => {
    const { track } = createTrack();
    expect(track.scene).toBeInstanceOf(THREE.Scene);
    expect(track.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(track.renderer).toBeDefined();
  });

  it('should delegate render to Scene3D and ignore canvas ctx', () => {
    const { track } = createTrack();
    const renderer = track.renderer;

    track.render(null, { x: track.startPos.x, y: track.startPos.y }, createMockGameState());

    expect(renderer.render).toHaveBeenCalledWith(track.scene, track.camera);
  });

  it('should update without throwing', () => {
    const { track } = createTrack();
    expect(() => track.update(0.016)).not.toThrow();
  });

  it('should emit track:selected after construction', () => {
    const eventBus = new EventBus();
    const handler = vi.fn();
    eventBus.on(Events.TRACK_SELECTED, handler);

    const track = new Track3D(
      TRACK_REGISTRY['shanghai-3d'],
      eventBus,
      createMockGameState(),
      { rendererFactory: createRendererFactory() }
    );

    expect(handler).toHaveBeenCalledWith({
      trackId: 'shanghai-3d',
      track,
      type: '3d',
    });
  });
});