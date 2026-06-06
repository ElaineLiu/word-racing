import { describe, it, expect, beforeEach } from 'vitest';
import { RacingCostManager } from '../systems/racing-cost-manager.js';
import { GameState } from '../core/game-state.js';
import { EventBus } from '../core/event-bus.js';

describe('RacingCostManager', () => {
  let eventBus;
  let gameState;
  let manager;

  beforeEach(() => {
    localStorage.clear();
    eventBus = new EventBus();
    gameState = new GameState(eventBus);
    manager = new RacingCostManager(eventBus, gameState);
  });

  describe('constructor', () => {
    it('should throw error if eventBus is missing', () => {
      expect(() => new RacingCostManager(null, gameState))
        .toThrow('EventBus is required');
    });

    it('should throw error if gameState is missing', () => {
      expect(() => new RacingCostManager(eventBus, null))
        .toThrow('GameState is required');
    });

    it('should create instance with valid dependencies', () => {
      expect(manager).toBeInstanceOf(RacingCostManager);
    });
  });

  describe('canAfford', () => {
    it('should return true when have enough coins', () => {
      gameState.set('fuelCoins', 100);

      expect(manager.canAfford('shanghai-2d')).toBe(true);
      expect(manager.canAfford('monaco-2d')).toBe(true);
      expect(manager.canAfford('silverstone-2d')).toBe(true);
    });

    it('should return false when not enough coins', () => {
      gameState.set('fuelCoins', 5);

      expect(manager.canAfford('shanghai-2d')).toBe(false); // cost 10
      expect(manager.canAfford('monaco-2d')).toBe(false);   // cost 15
    });

    it('should return true when coins exactly equal to cost', () => {
      gameState.set('fuelCoins', 15);

      expect(manager.canAfford('monaco-2d')).toBe(true); // cost 15
    });

    it('should return false when coins one less than cost', () => {
      gameState.set('fuelCoins', 14);

      expect(manager.canAfford('monaco-2d')).toBe(false); // cost 15
    });

    it('should return false for unknown track', () => {
      gameState.set('fuelCoins', 100);

      expect(manager.canAfford('ghost-track')).toBe(false);
    });

    it('should return false when no coins', () => {
      gameState.set('fuelCoins', 0);

      expect(manager.canAfford('shanghai-2d')).toBe(false);
    });
  });

  describe('deductCost', () => {
    it('should deduct coins and return success', () => {
      gameState.set('fuelCoins', 100);

      const result = manager.deductCost('monaco-2d');

      expect(result.success).toBe(true);
      expect(gameState.get('fuelCoins')).toBe(85); // 100 - 15
    });

    it('should deduct correct amount for different tracks', () => {
      gameState.set('fuelCoins', 100);

      manager.deductCost('shanghai-2d');
      expect(gameState.get('fuelCoins')).toBe(90); // 100 - 10

      manager.deductCost('monaco-2d');
      expect(gameState.get('fuelCoins')).toBe(75); // 90 - 15
    });

    it('should return error when not enough coins', () => {
      gameState.set('fuelCoins', 5);

      const result = manager.deductCost('monaco-2d');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient fuel coins');
      expect(gameState.get('fuelCoins')).toBe(5); // 未扣除
    });

    it('should return error for unknown track', () => {
      const result = manager.deductCost('ghost-track');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown track');
    });

    it('should deduct exactly all coins', () => {
      gameState.set('fuelCoins', 15);

      const result = manager.deductCost('monaco-2d');

      expect(result.success).toBe(true);
      expect(gameState.get('fuelCoins')).toBe(0);
    });
  });

  describe('refund', () => {
    it('should add coins back', () => {
      gameState.set('fuelCoins', 50);

      manager.refund('monaco-2d');

      expect(gameState.get('fuelCoins')).toBe(65); // 50 + 15
    });

    it('should refund correct amount for different tracks', () => {
      gameState.set('fuelCoins', 0);

      manager.refund('shanghai-2d');
      expect(gameState.get('fuelCoins')).toBe(10);

      manager.refund('silverstone-2d');
      expect(gameState.get('fuelCoins')).toBe(30); // 10 + 20
    });

    it('should handle unknown track gracefully', () => {
      gameState.set('fuelCoins', 50);

      expect(() => manager.refund('ghost-track')).not.toThrow();
      expect(gameState.get('fuelCoins')).toBe(50); // 未变化
    });
  });

  describe('getCost', () => {
    it('should return track cost', () => {
      expect(manager.getCost('shanghai-2d')).toBe(10);
      expect(manager.getCost('monaco-2d')).toBe(15);
      expect(manager.getCost('silverstone-2d')).toBe(20);
      expect(manager.getCost('shanghai-3d')).toBe(30);
      expect(manager.getCost('night-race-3d')).toBe(50);
    });

    it('should return 0 for unknown track', () => {
      expect(manager.getCost('ghost-track')).toBe(0);
    });
  });

  describe('integration with GameState', () => {
    it('should reflect changes when GameState updates', () => {
      gameState.set('fuelCoins', 5);

      expect(manager.canAfford('shanghai-2d')).toBe(false);

      // 更新 GameState
      gameState.set('fuelCoins', 20);

      expect(manager.canAfford('shanghai-2d')).toBe(true);
    });

    it('should work with deduct + refund cycle', () => {
      gameState.set('fuelCoins', 100);

      // 扣款
      const result = manager.deductCost('monaco-2d');
      expect(result.success).toBe(true);
      expect(gameState.get('fuelCoins')).toBe(85);

      // 退款
      manager.refund('monaco-2d');
      expect(gameState.get('fuelCoins')).toBe(100);
    });
  });
});
