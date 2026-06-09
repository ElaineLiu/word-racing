/**
 * RankingSystem Tests
 * 实时排名系统测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RankingSystem } from '../../3d/systems/ranking-system.js';
import { EventBus } from '../../core/event-bus.js';

describe('RankingSystem', () => {
  let mockCars;
  let eventBus;
  let rankingSystem;

  beforeEach(() => {
    // Mock cars with different progress
    mockCars = [
      { x: 0, y: 0, lap: 2, progress: 0.3, isPlayer: true },
      { x: 0, y: 0, lap: 1, progress: 0.9, isPlayer: false },
      { x: 0, y: 0, lap: 2, progress: 0.1, isPlayer: false },
      { x: 0, y: 0, lap: 1, progress: 0.5, isPlayer: false },
    ];

    eventBus = new EventBus();
    rankingSystem = new RankingSystem(mockCars, eventBus);
  });

  describe('Constructor', () => {
    it('should initialize with cars and eventBus', () => {
      expect(rankingSystem).toBeDefined();
    });
  });

  describe('calculateRanking', () => {
    it('should rank by lap count first (descending)', () => {
      const ranking = rankingSystem.calculateRanking();

      // 第一辆车（lap: 2, progress: 0.3）应该排第1
      expect(ranking[0].car).toBe(mockCars[0]);
      expect(ranking[0].rank).toBe(1);

      // 第三辆车（lap: 2, progress: 0.1）应该排第2
      expect(ranking[1].car).toBe(mockCars[2]);
      expect(ranking[1].rank).toBe(2);
    });

    it('should rank by progress when lap count is same', () => {
      const ranking = rankingSystem.calculateRanking();

      // 第二辆车（lap: 1, progress: 0.9）应该在 lap=1 的车中排第1
      // 总排名第3
      expect(ranking[2].car).toBe(mockCars[1]);
      expect(ranking[2].lap).toBe(1);
      expect(ranking[2].progress).toBe(0.9);

      // 第四辆车（lap: 1, progress: 0.5）应该在 lap=1 的车中排第2
      // 总排名第4
      expect(ranking[3].car).toBe(mockCars[3]);
      expect(ranking[3].lap).toBe(1);
      expect(ranking[3].progress).toBe(0.5);
    });

    it('should include lap and progress in ranking', () => {
      const ranking = rankingSystem.calculateRanking();

      ranking.forEach(entry => {
        expect(entry).toHaveProperty('car');
        expect(entry).toHaveProperty('rank');
        expect(entry).toHaveProperty('lap');
        expect(entry).toHaveProperty('progress');
      });
    });

    it('should handle single car', () => {
      const singleCar = [{ x: 0, y: 0, lap: 1, progress: 0.5, isPlayer: true }];
      const singleSystem = new RankingSystem(singleCar, eventBus);

      const ranking = singleSystem.calculateRanking();

      expect(ranking).toHaveLength(1);
      expect(ranking[0].rank).toBe(1);
    });

    it('should handle all cars on same lap', () => {
      const sameLapCars = [
        { x: 0, y: 0, lap: 1, progress: 0.8, isPlayer: true },
        { x: 0, y: 0, lap: 1, progress: 0.6, isPlayer: false },
        { x: 0, y: 0, lap: 1, progress: 0.9, isPlayer: false },
      ];
      const sameLapSystem = new RankingSystem(sameLapCars, eventBus);

      const ranking = sameLapSystem.calculateRanking();

      expect(ranking[0].progress).toBe(0.9);
      expect(ranking[1].progress).toBe(0.8);
      expect(ranking[2].progress).toBe(0.6);
    });

    it('should handle all cars at same progress', () => {
      const sameProgressCars = [
        { x: 0, y: 0, lap: 2, progress: 0.5, isPlayer: true },
        { x: 0, y: 0, lap: 1, progress: 0.5, isPlayer: false },
        { x: 0, y: 0, lap: 3, progress: 0.5, isPlayer: false },
      ];
      const sameProgressSystem = new RankingSystem(sameProgressCars, eventBus);

      const ranking = sameProgressSystem.calculateRanking();

      expect(ranking[0].lap).toBe(3);
      expect(ranking[1].lap).toBe(2);
      expect(ranking[2].lap).toBe(1);
    });
  });

  describe('getPlayerRank', () => {
    it('should return player rank', () => {
      const playerRank = rankingSystem.getPlayerRank();

      // 玩家车是第1名
      expect(playerRank).toBe(1);
    });

    it('should return -1 if no player car', () => {
      const noPlayerCars = [
        { x: 0, y: 0, lap: 1, progress: 0.5, isPlayer: false },
      ];
      const noPlayerSystem = new RankingSystem(noPlayerCars, eventBus);

      const playerRank = noPlayerSystem.getPlayerRank();

      expect(playerRank).toBe(-1);
    });

    it('should accept optional ranking parameter', () => {
      const ranking = rankingSystem.calculateRanking();
      const playerRank = rankingSystem.getPlayerRank(ranking);

      expect(playerRank).toBe(1);
    });
  });

  describe('update', () => {
    it('should emit rank:changed event when ranking changes', () => {
      const eventHandler = vi.fn();
      eventBus.on('rank:changed', eventHandler);

      rankingSystem.update();

      // 第一次 update 应该触发事件（从 null 到有排名）
      expect(eventHandler).toHaveBeenCalled();
      expect(eventHandler).toHaveBeenCalledWith(expect.objectContaining({
        ranking: expect.any(Array),
        playerRank: expect.any(Number),
      }));
    });

    it('should not emit event if ranking unchanged', () => {
      const eventHandler = vi.fn();
      eventBus.on('rank:changed', eventHandler);

      // 第一次 update
      rankingSystem.update();
      eventHandler.mockClear();

      // 第二次 update（排名未变）
      rankingSystem.update();

      // 排名未变化，不应该发事件
      expect(eventHandler).not.toHaveBeenCalled();
    });

    it('should emit event when lap changes', () => {
      const eventHandler = vi.fn();
      eventBus.on('rank:changed', eventHandler);

      // 第一次 update
      rankingSystem.update();
      eventHandler.mockClear();

      // 玩家完成一圈
      mockCars[0].lap = 3;

      // 第二次 update
      rankingSystem.update();

      // 排名变化，应该发事件
      expect(eventHandler).toHaveBeenCalled();
    });

    it('should emit event when progress changes significantly', () => {
      const eventHandler = vi.fn();
      eventBus.on('rank:changed', eventHandler);

      // 第一次 update
      rankingSystem.update();
      eventHandler.mockClear();

      // AI 超越玩家
      mockCars[2].progress = 0.5; // 从 0.1 增加到 0.5

      // 第二次 update
      rankingSystem.update();

      // 排名变化，应该发事件
      expect(eventHandler).toHaveBeenCalled();
    });
  });
});
