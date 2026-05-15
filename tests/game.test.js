/**
 * Game State Machine Tests
 * Tests economic rules, state transitions, and shop system from game.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockCanvas } from './setup.js';

const Game = await import('../js/game.js').then(m => m.Game || window.Game);

describe('Game', () => {
  let game;
  let mockCanvas;

  beforeEach(async () => {
    mockCanvas = new MockCanvas(920, 620);
    game = new Game(mockCanvas);
    await game.init();
  });

  describe('initialization', () => {
    it('should start in MENU state', () => {
      expect(game.state).toBe('MENU');
    });

    it('should have zero resources initially', () => {
      expect(game.fuel).toBe(0);
      expect(game.fuelCoins).toBe(0);
      expect(game.gearCoins).toBe(0);
      expect(game.nitroCharges).toBe(0);
    });

    it('should have default upgrades at level 1', () => {
      expect(game.upgrades.engine).toBe(1);
      expect(game.upgrades.tire).toBe(1);
      expect(game.upgrades.body).toBe(1);
    });

    it('should have maxFuel of 100', () => {
      expect(game.maxFuel).toBe(100);
    });

    it('should have fuelPerLap of 20', () => {
      expect(game.fuelPerLap).toBe(20);
    });
  });

  describe('dual currency system', () => {
    it('should track fuelCoins and gearCoins separately', () => {
      game.fuelCoins = 50;
      game.gearCoins = 30;
      expect(game.fuelCoins).toBe(50);
      expect(game.gearCoins).toBe(30);
    });
  });

  describe('shop items', () => {
    it('should have fuel items', () => {
      const fuel20 = game._shopItems.find(i => i.id === 'fuel20');
      expect(fuel20).toBeDefined();
      expect(fuel20.cost).toBe(15);
      expect(fuel20.currency).toBe('fuel');
    });

    it('should have nitro items', () => {
      const nitro1 = game._shopItems.find(i => i.id === 'nitro1');
      expect(nitro1).toBeDefined();
      expect(nitro1.cost).toBe(20);
      expect(nitro1.currency).toBe('gear');
    });

    it('should have upgrade items', () => {
      const engine = game._shopItems.find(i => i.id === 'engine1');
      expect(engine).toBeDefined();
      expect(engine.cost).toBe(100);
      expect(engine.upgrade).toBe('engine');
    });
  });

  describe('shop purchases', () => {
    it('should buy fuel with fuel coins', () => {
      game.fuelCoins = 30;
      game.fuel = 0;
      game._executeShopAction('fuel20');
      expect(game.fuelCoins).toBe(15);
      expect(game.fuel).toBe(20);
    });

    it('should not buy fuel if not enough coins', () => {
      game.fuelCoins = 10;
      game.fuel = 0;
      const initialState = { fuel: game.fuel, coins: game.fuelCoins };
      game._executeShopAction('fuel20');
      expect(game.fuelCoins).toBe(initialState.coins);
      expect(game.fuel).toBe(initialState.fuel);
    });

    it('should not exceed maxFuel', () => {
      game.fuelCoins = 100;
      game.fuel = 90;
      game._executeShopAction('fuel20');
      expect(game.fuel).toBeLessThanOrEqual(100);
    });

    it('should buy nitro with gear coins', () => {
      game.gearCoins = 50;
      game._executeShopAction('nitro1');
      expect(game.gearCoins).toBe(30);
      expect(game.nitroCharges).toBe(1);
    });

    it('should upgrade engine', () => {
      game.gearCoins = 100;
      game._executeShopAction('engine1');
      expect(game.gearCoins).toBe(0);
      expect(game.upgrades.engine).toBe(2);
    });

    it('should not upgrade beyond level 4', () => {
      game.upgrades.engine = 4;
      game.gearCoins = 100;
      game._executeShopAction('engine1');
      expect(game.upgrades.engine).toBe(4);
      expect(game.gearCoins).toBe(100); // not spent
    });
  });

  describe('fuel consumption', () => {
    it('should deduct fuel on race completion', () => {
      game.fuel = 100;
      game.totalLaps = 3;
      game.car.lap = 3;
      game.car.finished = true;
      game.car.lastProgress = 0.5;
      game._showResults();
      // 3 laps * 20 fuel/lap = 60 fuel
      expect(game.fuel).toBeLessThan(100);
    });

    it('should deduct fuel proportionally on exit', () => {
      game.fuel = 100;
      game.totalLaps = 3;
      game.car.lap = 1;
      game.car.lastProgress = 0.5;
      game.exitRace();
      // 1 lap * 20 + 0.5 * 20 = 30 fuel
      expect(game.fuel).toBe(70);
    });
  });

  describe('state machine', () => {
    it('should transition from MENU to QUIZ', () => {
      game.startNewQuiz();
      expect(game.state).toBe('QUIZ');
    });

    it('should not start race without fuel', () => {
      game.fuel = 0;
      game.continueToRace();
      // Should not transition to COUNTDOWN
      expect(game.state).not.toBe('COUNTDOWN');
    });

    it('should transition to COUNTDOWN when race starts', () => {
      game.fuel = 50;
      game.continueToRace();
      expect(game.state).toBe('COUNTDOWN');
    });

    it('should transition from COUNTDOWN to RACING after countdown', () => {
      game.fuel = 50;
      game.totalLaps = 1;
      game.state = 'COUNTDOWN';
      game.countdownTimer = 0;
      game._updateCountdown();
      expect(game.state).toBe('RACING');
    });

    it('should transition to RESULTS when race finishes', () => {
      game.fuel = 50;
      game.totalLaps = 1;
      game.car.finished = true;
      game._showResults();
      expect(game.state).toBe('RESULTS');
    });
  });

  describe('lap count selector', () => {
    it('should allow setting lap count 1-5', () => {
      game.setLapCount(3);
      expect(game.selectedLaps).toBe(3);
    });

    it('should clamp lap count to valid range', () => {
      game.setLapCount(0);
      expect(game.selectedLaps).toBe(1);
      game.setLapCount(10);
      expect(game.selectedLaps).toBe(5);
    });
  });

  describe('quiz completion rewards', () => {
    it('should add coins on quiz completion', () => {
      game.startNewQuiz();
      // Simulate answering all questions correctly
      game.quiz.correctCount = 5;
      game.quiz.fuelCoinsEarned = 50;
      game.quiz.gearCoinsEarned = 15;
      game.onQuizComplete();
      expect(game.fuelCoins).toBe(50);
      expect(game.gearCoins).toBe(15);
    });
  });

  describe('leaderboard', () => {
    it('should save lap time to leaderboard', () => {
      game.saveLapTime(45000, 3); // 45 seconds, 3 laps
      expect(game.leaderboard.length).toBe(1);
      expect(game.leaderboard[0].time).toBe(45000);
    });

    it('should sort leaderboard by time ascending', () => {
      game.saveLapTime(60000, 3);
      game.saveLapTime(45000, 3);
      expect(game.leaderboard[0].time).toBe(45000);
    });

    it('should limit leaderboard to 20 entries', () => {
      for (let i = 0; i < 25; i++) {
        game.saveLapTime(50000 + i * 1000, 3);
      }
      expect(game.leaderboard.length).toBeLessThanOrEqual(20);
    });

    it('should persist leaderboard to localStorage', () => {
      game.saveLapTime(45000, 3);
      const stored = localStorage.getItem('wr_leaderboard');
      expect(stored).not.toBeNull();
    });
  });

  describe('car upgrade sync', () => {
    it('should apply upgrades to car', () => {
      game.upgrades.engine = 2;
      game.car.applyUpgrades(game.upgrades);
      expect(game.car.maxSpeed).toBeGreaterThan(4.0); // 4.0 * 1.1
    });
  });

  describe('time formatting', () => {
    it('should format time correctly', () => {
      // 1 minute 23.45 seconds = 83450 ms
      const formatted = game._formatTime(83450);
      expect(formatted).toBe('1:23.45');
    });

    it('should handle zero time', () => {
      const formatted = game._formatTime(0);
      expect(formatted).toBe('0:00.00');
    });
  });
});
