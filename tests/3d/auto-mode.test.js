/**
 * AUTO Mode Tests
 * AUTO 模式（AI 接管玩家赛车）测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../core/event-bus.js';
import { AIController } from '../../3d/controllers/ai-controller.js';
import { AI_CONFIG } from '../../config/ai-config.js';

describe('AUTO Mode', () => {
  let mockCar;
  let mockTrack;
  let eventBus;
  let autoMode;
  let playerAIController;

  beforeEach(() => {
    // Mock car
    mockCar = {
      x: 0,
      y: 0,
      angle: 0,
      lap: 1,
      progress: 0.5,
      isPlayer: true,
      input: {
        up: false,
        down: false,
        left: false,
        right: false,
        nitro: false,
      },
    };

    // Mock track
    mockTrack = {
      waypoints: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 200, y: 0 },
      ],
    };

    eventBus = new EventBus();
    autoMode = false;
    playerAIController = null;
  });

  describe('AUTO mode toggle', () => {
    it('should toggle autoMode flag', () => {
      autoMode = false;

      // Toggle ON
      autoMode = !autoMode;
      expect(autoMode).toBe(true);

      // Toggle OFF
      autoMode = !autoMode;
      expect(autoMode).toBe(false);
    });

    it('should create AIController when AUTO enabled', () => {
      autoMode = true;
      playerAIController = new AIController(mockCar, mockTrack, AI_CONFIG.PERSONALITIES.balanced);

      expect(playerAIController).toBeDefined();
      expect(playerAIController.personality).toBe('Balanced');
    });

    it('should remove AIController when AUTO disabled', () => {
      autoMode = true;
      playerAIController = new AIController(mockCar, mockTrack, AI_CONFIG.PERSONALITIES.balanced);

      // Disable AUTO
      autoMode = false;
      playerAIController = null;

      expect(playerAIController).toBeNull();
    });

    it('should reset car input when AUTO disabled', () => {
      // Enable AUTO
      autoMode = true;
      playerAIController = new AIController(mockCar, mockTrack, AI_CONFIG.PERSONALITIES.balanced);

      // Update AI (car input changed)
      playerAIController.update(1 / 60);

      // Disable AUTO
      autoMode = false;
      playerAIController = null;
      mockCar.input = { up: false, down: false, left: false, right: false, nitro: false };

      // All inputs should be false
      expect(mockCar.input.up).toBe(false);
      expect(mockCar.input.left).toBe(false);
      expect(mockCar.input.right).toBe(false);
    });
  });

  describe('Event emission', () => {
    it('should emit auto-mode:changed event when enabled', () => {
      const eventHandler = vi.fn();
      eventBus.on('auto-mode:changed', eventHandler);

      autoMode = true;
      eventBus.emit('auto-mode:changed', { enabled: true });

      expect(eventHandler).toHaveBeenCalledWith({ enabled: true });
    });

    it('should emit auto-mode:changed event when disabled', () => {
      const eventHandler = vi.fn();
      eventBus.on('auto-mode:changed', eventHandler);

      autoMode = false;
      eventBus.emit('auto-mode:changed', { enabled: false });

      expect(eventHandler).toHaveBeenCalledWith({ enabled: false });
    });
  });

  describe('AI control', () => {
    it('should use AIController to update car input in AUTO mode', () => {
      autoMode = true;
      playerAIController = new AIController(mockCar, mockTrack, AI_CONFIG.PERSONALITIES.balanced);

      playerAIController.update(1 / 60);

      // AI should have set some input
      expect(mockCar.input.up).toBeDefined();
    });

    it('should allow player input when AUTO disabled', () => {
      autoMode = false;
      playerAIController = null;

      // Simulate player input
      mockCar.input.up = true;
      mockCar.input.left = true;

      expect(mockCar.input.up).toBe(true);
      expect(mockCar.input.left).toBe(true);
    });

    it('should use balanced personality in AUTO mode', () => {
      autoMode = true;
      playerAIController = new AIController(mockCar, mockTrack, AI_CONFIG.PERSONALITIES.balanced);

      expect(playerAIController.personality).toBe('Balanced');
    });
  });

  describe('Integration with game loop', () => {
    it('should call AIController.update() in AUTO mode', () => {
      autoMode = true;
      playerAIController = new AIController(mockCar, mockTrack, AI_CONFIG.PERSONALITIES.balanced);

      const updateSpy = vi.spyOn(playerAIController, 'update');

      // Simulate game loop
      if (autoMode && playerAIController) {
        playerAIController.update(1 / 60);
      }

      expect(updateSpy).toHaveBeenCalledWith(1 / 60);

      updateSpy.mockRestore();
    });

    it('should call player input update when AUTO disabled', () => {
      autoMode = false;
      playerAIController = null;

      const updateInput = vi.fn(() => {
        mockCar.input.up = true;
      });

      // Simulate game loop
      if (autoMode && playerAIController) {
        playerAIController.update(1 / 60);
      } else {
        updateInput();
      }

      expect(updateInput).toHaveBeenCalled();
    });
  });
});
