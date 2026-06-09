import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrackFactory } from '../systems/track-factory.js';
import { Track } from '../js/track.js';
import { GameState } from '../core/game-state.js';
import { EventBus } from '../core/event-bus.js';
import { FeatureFlags } from '../config/feature-flags.js';

describe('TrackFactory', () => {
  let eventBus;
  let gameState;
  let factory;

  beforeEach(() => {
    localStorage.clear();
    eventBus = new EventBus();
    gameState = new GameState(eventBus);
    factory = new TrackFactory(eventBus, gameState);

    // 重置 FeatureFlags 到默认值
    FeatureFlags.flags = {
      '2d-track': true,
      '3d-track': false,
      'multiple-tracks': true,
    };
  });

  afterEach(() => {
    localStorage.clear();
  });

  function createFactoryWith3DOptions() {
    const rendererFactory = vi.fn(() => ({
      render: vi.fn(), dispose: vi.fn(), setSize: vi.fn(),
      setPixelRatio: vi.fn(), setClearColor: vi.fn(),
    }));
    return new TrackFactory(eventBus, gameState, {
      track3DOptions: { rendererFactory }
    });
  }

  describe('constructor', () => {
    it('should throw error if eventBus is missing', () => {
      expect(() => new TrackFactory(null, gameState))
        .toThrow('EventBus is required');
    });

    it('should throw error if gameState is missing', () => {
      expect(() => new TrackFactory(eventBus, null))
        .toThrow('GameState is required');
    });

    it('should create instance with valid dependencies', () => {
      expect(factory).toBeInstanceOf(TrackFactory);
    });
  });

  describe('create', () => {
    it('should create 2D track instance', () => {
      const track = factory.create('shanghai-2d');

      expect(track).toBeInstanceOf(Track);
      expect(track.trackWidth).toBe(90);
    });

    it('should create monaco track with different width', () => {
      const track = factory.create('monaco-2d');

      expect(track).toBeInstanceOf(Track);
      expect(track.trackWidth).toBe(50);
    });

    it('should create silverstone track', () => {
      const track = factory.create('silverstone-2d');

      expect(track).toBeInstanceOf(Track);
      expect(track.trackWidth).toBe(90);
    });

    it('should throw error for unknown track', () => {
      expect(() => factory.create('ghost-track'))
        .toThrow('Unknown track: ghost-track');
    });

    it('should throw error for 3D track when feature disabled', () => {
      FeatureFlags.disable('3d-track');

      expect(() => factory.create('shanghai-3d'))
        .toThrow('Track not available: shanghai-3d');
    });

    it('should tell callers to use async creation for 3D tracks', () => {
      FeatureFlags.enable('3d-track');

      expect(() => createFactoryWith3DOptions().create('shanghai-3d'))
        .toThrow('Use createAsync for 3D tracks');
    });

    it('should create 3D track asynchronously when feature enabled', async () => {
      FeatureFlags.enable('3d-track');

      const track = await createFactoryWith3DOptions().createAsync('shanghai-3d');
      expect(track.type).toBe('3d');
      expect(track.id).toBe('shanghai-3d');
    });

    it('should throw error for night-race-3d (incomplete track)', () => {
      FeatureFlags.enable('3d-track');

      expect(() => factory.create('night-race-3d'))
        .toThrow();
    });
  });

  describe('getAvailableTracks', () => {
    it('should return 2D tracks when feature enabled', () => {
      FeatureFlags.enable('2d-track');

      const tracks = factory.getAvailableTracks();
      const trackIds = tracks.map(t => t.id);

      expect(trackIds).toContain('shanghai-2d');
      expect(trackIds).toContain('monaco-2d');
      expect(trackIds).toContain('silverstone-2d');
    });

    it('should not return 2D tracks when feature disabled', () => {
      FeatureFlags.disable('2d-track');

      const tracks = factory.getAvailableTracks();
      const trackIds = tracks.map(t => t.id);

      expect(trackIds).not.toContain('shanghai-2d');
      expect(trackIds).not.toContain('monaco-2d');
    });

    it('should not return 3D tracks when feature disabled', () => {
      FeatureFlags.disable('3d-track');

      const tracks = factory.getAvailableTracks();
      const trackIds = tracks.map(t => t.id);

      expect(trackIds).not.toContain('shanghai-3d');
      expect(trackIds).not.toContain('night-race-3d');
    });

    it('should return complete 3D tracks when feature enabled', () => {
      FeatureFlags.enable('3d-track');

      const tracks = factory.getAvailableTracks();
      const trackIds = tracks.map(t => t.id);

      expect(trackIds).toContain('shanghai-3d');
      expect(trackIds).not.toContain('night-race-3d');
    });

    it('should return all tracks when both features enabled', () => {
      FeatureFlags.enable('2d-track');
      FeatureFlags.enable('3d-track');

      const tracks = factory.getAvailableTracks();
      const trackIds = tracks.map(t => t.id);

      expect(trackIds).toContain('shanghai-2d');
      expect(trackIds).toContain('monaco-2d');
      expect(trackIds).toContain('silverstone-2d');
      expect(trackIds).toContain('shanghai-3d');
      expect(trackIds).not.toContain('night-race-3d');
      expect(trackIds.length).toBe(4);
    });

    it('should return no tracks when both features disabled', () => {
      FeatureFlags.disable('2d-track');
      FeatureFlags.disable('3d-track');

      const tracks = factory.getAvailableTracks();

      expect(tracks.length).toBe(0);
    });
  });

  describe('isAvailable', () => {
    it('should return true for 2D track when feature enabled', () => {
      FeatureFlags.enable('2d-track');

      expect(factory.isAvailable('shanghai-2d')).toBe(true);
      expect(factory.isAvailable('monaco-2d')).toBe(true);
    });

    it('should return false for 2D track when feature disabled', () => {
      FeatureFlags.disable('2d-track');

      expect(factory.isAvailable('shanghai-2d')).toBe(false);
      expect(factory.isAvailable('monaco-2d')).toBe(false);
    });

    it('should return false for 3D track when feature disabled', () => {
      FeatureFlags.disable('3d-track');

      expect(factory.isAvailable('shanghai-3d')).toBe(false);
      expect(factory.isAvailable('night-race-3d')).toBe(false);
    });

    it('should return true for complete 3D track when feature enabled', () => {
      FeatureFlags.enable('3d-track');

      expect(factory.isAvailable('shanghai-3d')).toBe(true);
      expect(factory.isAvailable('night-race-3d')).toBe(false);
    });

    it('should return false for unknown track', () => {
      expect(factory.isAvailable('ghost-track')).toBe(false);
    });
  });

  describe('integration with FeatureFlags', () => {
    it('should reflect feature flag changes', () => {
      FeatureFlags.enable('2d-track');
      expect(factory.isAvailable('shanghai-2d')).toBe(true);

      FeatureFlags.disable('2d-track');
      expect(factory.isAvailable('shanghai-2d')).toBe(false);

      FeatureFlags.enable('2d-track');
      expect(factory.isAvailable('shanghai-2d')).toBe(true);
    });

    it('should handle multiple feature flags independently', () => {
      FeatureFlags.enable('2d-track');
      FeatureFlags.disable('3d-track');

      expect(factory.isAvailable('shanghai-2d')).toBe(true);
      expect(factory.isAvailable('shanghai-3d')).toBe(false);

      FeatureFlags.disable('2d-track');
      FeatureFlags.enable('3d-track');

      expect(factory.isAvailable('shanghai-2d')).toBe(false);
      expect(factory.isAvailable('shanghai-3d')).toBe(true);
    });
  });
});
