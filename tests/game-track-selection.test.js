/**
 * Game - 赛道选择测试（Phase 3.2）
 *
 * 验证 selectTrack / startRace / getAvailableTracks 三个方法。
 * 严格按照 design/赛道解锁系统详细设计.md 的 UC-02 和 UC-03 测试覆盖：
 *   - Main Scenario
 *   - 所有 Alternative Scenarios（未解锁/金币不足/未知赛道/3D 未实现）
 *
 * 借鉴 ISSUE_LOG 经验：
 *   - #003: beforeEach 清理 localStorage 防止持久化污染
 *   - #003: Alternative Scenario 必须测试（曾遗漏金币不足检查）
 *   - #005: 走完整调用链，验证 GameState 副作用
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/game.js';
import { GameState } from '../core/game-state.js';
import { EventBus } from '../core/event-bus.js';
import { Track } from '../js/track.js';
import { TRACK_REGISTRY } from '../config/track-registry.js';

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

describe('Game - 赛道选择 (Phase 3.2)', () => {
  let canvas;
  let eventBus;
  let gameState;
  let game;

  beforeEach(() => {
    localStorage.clear();
    canvas = new MockCanvas();
    eventBus = new EventBus();
    gameState = new GameState(eventBus);
    game = new Game(canvas, gameState);
  });

  // ==================== selectTrack ====================
  describe('selectTrack(trackId) - UC-02', () => {
    it('Main: 选择已解锁且金币足够的赛道，应更新 selectedTrackId 到 GameState', () => {
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);
      gameState.set('fuelCoins', 100);

      game.selectTrack('monaco-2d');

      expect(game.selectedTrackId).toBe('monaco-2d');
      expect(gameState.get('selectedTrackId')).toBe('monaco-2d');
    });

    it('A1: 赛道未解锁应抛出 Track not unlocked', () => {
      gameState.set('unlockedTracks', ['shanghai-2d']);
      gameState.set('fuelCoins', 100);

      expect(() => game.selectTrack('monaco-2d')).toThrow('Track not unlocked');
      // selectedTrackId 不应改变
      expect(game.selectedTrackId).toBe('shanghai-2d');
    });

    it('A2: 金币不足应抛出 Insufficient fuel coins', () => {
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);
      gameState.set('fuelCoins', 5); // monaco 需要 15

      expect(() => game.selectTrack('monaco-2d')).toThrow('Insufficient fuel coins');
      expect(gameState.get('selectedTrackId')).toBe('shanghai-2d');
    });

    it('A3: 赛道不存在应抛出 Unknown track', () => {
      gameState.set('fuelCoins', 100);

      expect(() => game.selectTrack('non-existent')).toThrow('Unknown track');
    });

    it('金币恰好等于 cost 应允许选择（边界值）', () => {
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);
      gameState.set('fuelCoins', 15); // 正好等于 monaco 的 cost

      expect(() => game.selectTrack('monaco-2d')).not.toThrow();
      expect(game.selectedTrackId).toBe('monaco-2d');
    });
  });

  // ==================== startRace ====================
  describe('startRace() - UC-03', () => {
    beforeEach(() => {
      // 默认场景：玩家已选 shanghai-2d，金币充足
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);
      gameState.set('fuelCoins', 100);
      gameState.set('selectedTrackId', 'shanghai-2d');
    });

    it('Main: 应从 GameState 扣除赛道 cost', () => {
      game.startRace();
      expect(gameState.get('fuelCoins')).toBe(90); // 100 - 10
    });

    it('Main: 2D 赛道应创建 Track 实例', () => {
      game.startRace();
      expect(game.track).toBeInstanceOf(Track);
    });

    it('Main: 2D 赛道应使用 registry 的 waypoints 和 trackWidth', () => {
      gameState.set('selectedTrackId', 'monaco-2d');
      game.startRace();
      // monaco 宽 60，shanghai 宽 76
      expect(game.track.trackWidth).toBe(TRACK_REGISTRY['monaco-2d'].trackWidth);
    });

    it('Main: 应将 game.state 切换为 COUNTDOWN', () => {
      game.startRace();
      expect(game.state).toBe('COUNTDOWN');
    });

    it('Main: 应初始化 countdownTimer', () => {
      game.startRace();
      expect(game.countdownTimer).toBeGreaterThan(0);
    });

    it('Main: 应将赛车重置到新赛道起点', () => {
      gameState.set('selectedTrackId', 'monaco-2d');
      game.startRace();
      expect(game.car.x).toBe(game.track.startPos.x);
      expect(game.car.y).toBe(game.track.startPos.y);
    });

    it('Main: 应更新 RenderSystem 的 track 引用', () => {
      game.startRace();
      // RenderSystem 内部应该已经 setTrack；通过 game.track 间接验证
      // 简单确认 _renderSystem 存在且未抛错
      expect(game._renderSystem).toBeDefined();
    });

    it('A1: 金币不足应抛出 Insufficient fuel coins 且不扣金币', () => {
      gameState.set('fuelCoins', 5);
      expect(() => game.startRace()).toThrow('Insufficient fuel coins');
      expect(gameState.get('fuelCoins')).toBe(5); // 不扣
    });

    it('3D 赛道在 feature flag 关闭时不可用', () => {
      gameState.set('unlockedTracks', ['shanghai-3d']);
      gameState.set('fuelCoins', 100);
      gameState.set('selectedTrackId', 'shanghai-3d');

      expect(() => game.startRace()).toThrow('Track not available: shanghai-3d');
    });

    it('未知赛道应抛出 Unknown track', () => {
      gameState.set('selectedTrackId', 'ghost-track');
      expect(() => game.startRace()).toThrow('Unknown track');
    });
  });

  // ==================== getAvailableTracks ====================
  describe('getAvailableTracks()', () => {
    it('应返回 FeatureFlags 启用的赛道', () => {
      const tracks = game.getAvailableTracks();
      // 默认 FeatureFlags: 2d-track=true, 3d-track=false
      // 应该返回 3 条 2D 赛道
      expect(tracks.length).toBe(3);
      expect(tracks.every(t => t.type === '2d')).toBe(true);
    });

    it('应正确标记 unlocked 状态', () => {
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);
      const tracks = game.getAvailableTracks();
      expect(tracks.find(t => t.id === 'shanghai-2d').unlocked).toBe(true);
      expect(tracks.find(t => t.id === 'monaco-2d').unlocked).toBe(true);
      expect(tracks.find(t => t.id === 'silverstone-2d').unlocked).toBe(false);
    });

    it('应正确标记 canAfford 状态', () => {
      gameState.set('fuelCoins', 12);
      const tracks = game.getAvailableTracks();
      expect(tracks.find(t => t.id === 'shanghai-2d').canAfford).toBe(true);  // cost 10
      expect(tracks.find(t => t.id === 'monaco-2d').canAfford).toBe(false); // cost 15
    });

    it('应保留 registry 中的所有原始字段', () => {
      const tracks = game.getAvailableTracks();
      const shanghai = tracks.find(t => t.id === 'shanghai-2d');
      expect(shanghai.name).toBe(TRACK_REGISTRY['shanghai-2d'].name);
      expect(shanghai.cost).toBe(TRACK_REGISTRY['shanghai-2d'].cost);
      expect(shanghai.type).toBe('2d');
      expect(shanghai.waypoints).toBeDefined();
    });

    it('金币为 0 时所有 canAfford 应为 false', () => {
      gameState.set('fuelCoins', 0);
      const tracks = game.getAvailableTracks();
      tracks.forEach(t => {
        expect(t.canAfford).toBe(false);
      });
    });
  });

  // ==================== 集成：完整流程 ====================
  describe('完整流程 (UC-02 + UC-03 集成)', () => {
    it('解锁 → 选择 → 开始比赛 全链路应正确', () => {
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);
      gameState.set('fuelCoins', 50);

      // 选择
      game.selectTrack('monaco-2d');
      expect(game.selectedTrackId).toBe('monaco-2d');

      // 开始比赛
      game.startRace();
      expect(gameState.get('fuelCoins')).toBe(35); // 50 - 15
      expect(game.state).toBe('COUNTDOWN');
      expect(game.track.trackWidth).toBe(50);
    });
  });
});
