import { describe, it, expect, beforeEach } from 'vitest';
import { TrackUnlockManager } from '../systems/track-unlock-manager.js';
import { GameState } from '../core/game-state.js';
import { EventBus } from '../core/event-bus.js';

describe('TrackUnlockManager', () => {
  let eventBus;
  let gameState;
  let manager;

  beforeEach(() => {
    localStorage.clear();
    eventBus = new EventBus();
    gameState = new GameState(eventBus);
    manager = new TrackUnlockManager(eventBus, gameState);
  });

  describe('constructor', () => {
    it('should throw error if eventBus is missing', () => {
      expect(() => new TrackUnlockManager(null, gameState))
        .toThrow('EventBus is required');
    });

    it('should throw error if gameState is missing', () => {
      expect(() => new TrackUnlockManager(eventBus, null))
        .toThrow('GameState is required');
    });

    it('should create instance with valid dependencies', () => {
      expect(manager).toBeInstanceOf(TrackUnlockManager);
    });
  });

  describe('isUnlocked', () => {
    it('should return true for unlocked track', () => {
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);

      expect(manager.isUnlocked('shanghai-2d')).toBe(true);
      expect(manager.isUnlocked('monaco-2d')).toBe(true);
    });

    it('should return false for locked track', () => {
      gameState.set('unlockedTracks', ['shanghai-2d']);

      expect(manager.isUnlocked('monaco-2d')).toBe(false);
      expect(manager.isUnlocked('silverstone-2d')).toBe(false);
    });

    it('should return false for unknown track', () => {
      expect(manager.isUnlocked('ghost-track')).toBe(false);
    });

    it('should return false when no tracks unlocked', () => {
      gameState.set('unlockedTracks', []);

      expect(manager.isUnlocked('shanghai-2d')).toBe(false);
    });
  });

  describe('getUnlockProgress', () => {
    it('should return unlocked status for unlocked track', () => {
      gameState.set('unlockedTracks', ['shanghai-2d']);

      const progress = manager.getUnlockProgress('shanghai-2d');

      expect(progress).toEqual({ unlocked: true });
    });

    it('should return cost and type for locked track', () => {
      gameState.set('unlockedTracks', ['shanghai-2d']);

      const progress = manager.getUnlockProgress('monaco-2d');

      expect(progress.unlocked).toBe(false);
      expect(progress.cost).toBe(15);
      expect(progress.type).toBe('2d');
      expect(progress.requirements).toBeDefined();
    });

    it('should return cost for shanghai-3d', () => {
      const progress = manager.getUnlockProgress('shanghai-3d');

      expect(progress.unlocked).toBe(false);
      expect(progress.cost).toBe(10);
      expect(progress.type).toBe('3d');
      expect(progress.requirements).toBeDefined();
      expect(progress.requirements.masteryCount.required).toBe(200);
    });

    it('should return null for unknown track', () => {
      const progress = manager.getUnlockProgress('ghost-track');

      expect(progress).toBeNull();
    });
  });

  describe('getUnlockedTracks', () => {
    it('should return unlocked track IDs', () => {
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d', 'silverstone-2d']);

      const unlocked = manager.getUnlockedTracks();

      expect(unlocked).toEqual(['shanghai-2d', 'monaco-2d', 'silverstone-2d']);
    });

    it('should return empty array when no tracks unlocked', () => {
      gameState.set('unlockedTracks', []);

      const unlocked = manager.getUnlockedTracks();

      expect(unlocked).toEqual([]);
    });

    it('should return default unlocked tracks for new GameState', () => {
      // GameState 默认解锁第一条赛道
      const unlocked = manager.getUnlockedTracks();

      expect(unlocked).toContain('shanghai-2d');
    });
  });

  describe('integration with GameState', () => {
    it('should reflect changes when GameState updates', () => {
      gameState.set('unlockedTracks', ['shanghai-2d']);

      expect(manager.isUnlocked('monaco-2d')).toBe(false);

      // 更新 GameState
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);

      expect(manager.isUnlocked('monaco-2d')).toBe(true);
    });
  });
});
