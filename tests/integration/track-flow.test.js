import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../../js/game.js';
import { GameState } from '../../core/game-state.js';
import { EventBus } from '../../core/event-bus.js';
import { TrackUnlockManager } from '../../systems/track-unlock-manager.js';
import { TrackFactory } from '../../systems/track-factory.js';
import { FeatureFlags } from '../../config/feature-flags.js';

/**
 * 赛道系统完整流程集成测试
 *
 * 验证：
 * 1. Manager 类与 Game 类的集成
 * 2. 完整的赛道选择 → 开始比赛流程
 * 3. 错误场景的处理
 * 4. FeatureFlags 的控制
 */
describe('Track System Integration', () => {
  let game;
  let eventBus;
  let gameState;
  let canvas;

  beforeEach(() => {
    localStorage.clear();

    // 创建 mock canvas
    canvas = {
      width: 920,
      height: 620,
      parentElement: { clientWidth: 920, clientHeight: 620 },
      getContext: () => new Proxy({}, { get: () => () => {} }),
      addEventListener: () => {},
      removeEventListener: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 920, height: 620 })
    };

    eventBus = new EventBus();
    gameState = new GameState(eventBus);
    game = new Game(canvas, gameState);

    // 重置 FeatureFlags
    FeatureFlags.flags = {
      '2d-track': true,
      '3d-track': false,
    };
  });

  describe('完整流程', () => {
    it('应该完成完整的赛道选择和开始比赛流程', () => {
      // 1. 设置初始状态
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);
      gameState.set('fuelCoins', 100);  // 添加足够的金币

      // 2. 获取可用赛道
      const tracks = game.getAvailableTracks();
      expect(tracks.length).toBeGreaterThan(0);

      const monacoTrack = tracks.find(t => t.id === 'monaco-2d');
      expect(monacoTrack).toBeDefined();
      expect(monacoTrack.unlocked).toBe(true);

      // 3. 选择赛道
      game.selectTrack('monaco-2d');
      expect(game.selectedTrackId).toBe('monaco-2d');

      // 4. 开始比赛
      game.startRace();
      expect(game.state).toBe('COUNTDOWN');
      expect(game.track.trackWidth).toBe(50);
      // 比赛开始时不扣费
      expect(gameState.get('fuelCoins')).toBe(100);

      // 5. 模拟跑 1 圈后完赛
      game.car.lap = 1;
      game.car.lastProgress = 0;
      game.car.finished = true;
      game._showResults();

      // 比赛结束时扣费：1 圈 × 10 = 10 金币
      expect(gameState.get('fuelCoins')).toBe(90);
    });
  });

  describe('错误场景', () => {
    it('应该阻止选择未解锁的赛道', () => {
      gameState.set('unlockedTracks', ['shanghai-2d']);

      expect(() => game.selectTrack('monaco-2d')).toThrow('Track not unlocked');
      expect(game.selectedTrackId).toBe('shanghai-2d');
    });
  });

  describe('Manager 集成', () => {
    it('Game 类应该正确使用所有 Manager', () => {
      gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);

      // 验证 Manager 实例存在
      expect(game._trackUnlockManager).toBeInstanceOf(TrackUnlockManager);
      expect(game._trackFactory).toBeInstanceOf(TrackFactory);

      // 验证 Manager 功能正常
      expect(game._trackUnlockManager.isUnlocked('monaco-2d')).toBe(true);

      const track = game._trackFactory.create('monaco-2d');
      expect(track.trackWidth).toBe(50);
    });
  });

  describe('FeatureFlags 控制', () => {
    it('FeatureFlags 禁用时应该隐藏赛道', () => {
      FeatureFlags.disable('2d-track');

      const tracks = game.getAvailableTracks();
      const trackIds = tracks.map(t => t.id);

      expect(trackIds).not.toContain('shanghai-2d');
      expect(trackIds).not.toContain('monaco-2d');
    });

    it('FeatureFlags 启用时应该显示赛道', () => {
      FeatureFlags.enable('2d-track');

      const tracks = game.getAvailableTracks();
      const trackIds = tracks.map(t => t.id);

      expect(trackIds).toContain('shanghai-2d');
      expect(trackIds).toContain('monaco-2d');
    });
  });
});
