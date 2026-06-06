/**
 * Game ↔ GameState 集成测试（Phase 3.1a）
 *
 * 验证 Game 类的赛道相关资源字段（fuelCoins/gearCoins/unlockedTracks/selectedTrackId）
 * 与 GameState 单一数据源保持一致。
 *
 * 防止 ISSUE_LOG #002（GameState 扩展字段未迁移）与 #005（集成遗漏）类回归。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/game.js';
import { GameState } from '../core/game-state.js';
import { EventBus } from '../core/event-bus.js';

class MockCanvas {
  constructor() {
    this.width = 920;
    this.height = 620;
    this.parentElement = { clientWidth: 920, clientHeight: 620 };
  }
  getContext() {
    const noop = () => {};
    return new Proxy({}, { get: () => noop });
  }
  addEventListener() {}
  removeEventListener() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 920, height: 620 }; }
}

describe('Game ↔ GameState 集成', () => {
  let canvas;
  let eventBus;
  let gameState;

  beforeEach(() => {
    localStorage.clear();
    canvas = new MockCanvas();
    eventBus = new EventBus();
    gameState = new GameState(eventBus);
  });

  describe('构造函数兼容性', () => {
    it('不传 gameState 时应自建一个，保持向后兼容', () => {
      const game = new Game(canvas);
      expect(game.fuelCoins).toBe(0);
      expect(game.gearCoins).toBe(0);
      expect(game.gameState).toBeDefined();
    });

    it('传入 gameState 时应使用注入的实例', () => {
      gameState.set('fuelCoins', 77);
      gameState.set('gearCoins', 33);

      const game = new Game(canvas, gameState);

      expect(game.fuelCoins).toBe(77);
      expect(game.gearCoins).toBe(33);
      expect(game.gameState).toBe(gameState);
    });
  });

  describe('fuelCoins 双向同步', () => {
    let game;
    beforeEach(() => {
      game = new Game(canvas, gameState);
    });

    it('game.fuelCoins = X 应写入 GameState', () => {
      game.fuelCoins = 100;
      expect(gameState.get('fuelCoins')).toBe(100);
    });

    it('gameState.set 应反映到 game.fuelCoins', () => {
      gameState.set('fuelCoins', 50);
      expect(game.fuelCoins).toBe(50);
    });

    it('game.fuelCoins += 10 应正确累加并写入 GameState', () => {
      game.fuelCoins = 20;
      game.fuelCoins += 10;
      expect(game.fuelCoins).toBe(30);
      expect(gameState.get('fuelCoins')).toBe(30);
    });

    it('game.fuelCoins -= 10 应正确扣减', () => {
      game.fuelCoins = 50;
      game.fuelCoins -= 10;
      expect(game.fuelCoins).toBe(40);
      expect(gameState.get('fuelCoins')).toBe(40);
    });
  });

  describe('gearCoins 双向同步', () => {
    let game;
    beforeEach(() => {
      game = new Game(canvas, gameState);
    });

    it('game.gearCoins = X 应写入 GameState', () => {
      game.gearCoins = 25;
      expect(gameState.get('gearCoins')).toBe(25);
    });

    it('gameState.set 应反映到 game.gearCoins', () => {
      gameState.set('gearCoins', 99);
      expect(game.gearCoins).toBe(99);
    });
  });

  describe('赛道相关字段', () => {
    let game;
    beforeEach(() => {
      game = new Game(canvas, gameState);
    });

    it('unlockedTracks getter 应读 GameState', () => {
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);
      expect(game.unlockedTracks).toEqual(['shanghai-2d', 'monaco-2d']);
    });

    it('默认 unlockedTracks 应包含 shanghai-2d', () => {
      expect(game.unlockedTracks).toContain('shanghai-2d');
    });

    it('selectedTrackId getter/setter 应读写 GameState', () => {
      game.selectedTrackId = 'monaco-2d';
      expect(gameState.get('selectedTrackId')).toBe('monaco-2d');
      expect(game.selectedTrackId).toBe('monaco-2d');
    });

    it('默认 selectedTrackId 应为 shanghai-2d', () => {
      expect(game.selectedTrackId).toBe('shanghai-2d');
    });
  });

  describe('与 LearningController 共享同一 GameState', () => {
    it('LearningController 解锁赛道后，Game.unlockedTracks 应立即可见', async () => {
      // 模拟 LearningController 通过 AchievementManager 解锁赛道
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);

      const game = new Game(canvas, gameState);
      expect(game.unlockedTracks).toContain('monaco-2d');
    });

    it('Game 扣金币后，GameState 应立即反映（供 LearningController 的成就检查）', () => {
      const game = new Game(canvas, gameState);
      gameState.set('fuelCoins', 100);

      game.fuelCoins -= 30;

      expect(gameState.get('fuelCoins')).toBe(70);
    });
  });
});
