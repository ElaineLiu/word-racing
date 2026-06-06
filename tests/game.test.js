/**
 * Game State Machine Tests
 * Tests economic rules, state transitions, and shop system from game.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../js/game.js';
import { ECONOMY, GAME, UPGRADES, DISPLAY } from '../config/game-config.js';

// Mock canvas with parent element
class MockCanvas {
  constructor(width = 920, height = 620) {
    this.width = width;
    this.height = height;
    this.parentElement = {
      clientWidth: width,
      clientHeight: height,
    };
  }
  getContext(type) {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      scale: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      translate: () => {},
    };
  }
  addEventListener() {}
  removeEventListener() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.width, height: this.height };
  }
}

describe('Game', () => {
  let game;
  let mockCanvas;

  beforeEach(async () => {
    // 清理 localStorage，避免测试间共享 GameState 持久化（ISSUE_LOG #003）
    localStorage.clear();
    mockCanvas = new MockCanvas();
    game = new Game(mockCanvas);
    await game.init();
  });

  describe('initialization', () => {
    it('should start in MENU state', () => {
      expect(game.state).toBe(GAME.STATES.MENU);
    });

    it('should have zero resources initially', () => {
      expect(game.fuel).toBe(ECONOMY.INITIAL_FUEL);
      expect(game.fuelCoins).toBe(0);
      expect(game.gearCoins).toBe(0);
      expect(game.nitroCharges).toBe(0);
    });

    it('should have default upgrades at level 1', () => {
      expect(game.upgrades.engine).toBe(UPGRADES.MIN_LEVEL);
      expect(game.upgrades.tire).toBe(UPGRADES.MIN_LEVEL);
      expect(game.upgrades.body).toBe(UPGRADES.MIN_LEVEL);
    });

    it('should have maxFuel from config', () => {
      expect(game.maxFuel).toBe(ECONOMY.MAX_FUEL);
    });

    it('should have fuelPerLap from config', () => {
      expect(game.fuelPerLap).toBe(ECONOMY.FUEL_PER_LAP);
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
      expect(game.fuel).toBeLessThanOrEqual(ECONOMY.MAX_FUEL);
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

    it('should not upgrade beyond max level', () => {
      game.upgrades.engine = UPGRADES.MAX_LEVEL;
      game.gearCoins = 100;
      game._executeShopAction('engine1');
      expect(game.upgrades.engine).toBe(UPGRADES.MAX_LEVEL);
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

  describe('exitRace', () => {
    it('should return to HOME state on exit', () => {
      game.fuel = 100;
      game.state = GAME.STATES.RACING;
      const newState = game.exitRace();
      expect(newState).toBe('HOME');
      expect(game.state).toBe('HOME');
    });

    it('should reset car position on exit', () => {
      game.fuel = 100;
      game.state = GAME.STATES.RACING;
      game.car.x = 500;
      game.car.y = 300;
      game.exitRace();
      expect(game.car.x).toBe(game.track.startPos.x);
      expect(game.car.y).toBe(game.track.startPos.y);
    });
  });

  describe('display speed', () => {
    it('should calculate displaySpeed without NaN', () => {
      game.car.speed = 2.5;
      const displaySpeed = Math.round(game.car.speed * DISPLAY.SPEED_DISPLAY_MULTIPLIER) || 0;
      expect(displaySpeed).toBe(125);
      expect(Number.isNaN(displaySpeed)).toBe(false);
    });

    it('should return 0 when speed is undefined', () => {
      game.car.speed = undefined;
      const displaySpeed = Math.round(game.car.speed * DISPLAY.SPEED_DISPLAY_MULTIPLIER) || 0;
      expect(displaySpeed).toBe(0);
    });

    it('should use correct config constant', () => {
      expect(DISPLAY.SPEED_DISPLAY_MULTIPLIER).toBeDefined();
      expect(DISPLAY.SPEED_DISPLAY_MULTIPLIER).toBe(50);
    });

    it('should render valid displaySpeed in gameState', () => {
      game.car.speed = 3.0;
      game.state = GAME.STATES.RACING;
      const gameState = {
        displaySpeed: Math.round(game.car.speed * DISPLAY.SPEED_DISPLAY_MULTIPLIER) || 0,
      };
      expect(gameState.displaySpeed).toBe(150);
      expect(Number.isNaN(gameState.displaySpeed)).toBe(false);
    });
  });

  describe('state machine', () => {
    it('should transition from MENU to QUIZ', () => {
      game.startNewQuiz();
      expect(game.state).toBe(GAME.STATES.QUIZ);
    });

    it('should start COUNTDOWN even without fuel (fuel check is in NavManager)', () => {
      game.fuel = 0;
      game.continueToRace();
      // continueToRace() doesn't check fuel - NavManager does that
      expect(game.state).toBe(GAME.STATES.COUNTDOWN);
    });

    it('should transition to COUNTDOWN when race starts', () => {
      game.fuel = 50;
      game.continueToRace();
      expect(game.state).toBe(GAME.STATES.COUNTDOWN);
    });

    it('should transition from COUNTDOWN to RACING after countdown', () => {
      game.fuel = 50;
      game.totalLaps = 1;
      game.state = GAME.STATES.COUNTDOWN;
      game.countdownTimer = 0;
      game._updateCountdown();
      expect(game.state).toBe(GAME.STATES.RACING);
    });

    it('should transition to RESULTS when race finishes', () => {
      game.fuel = 50;
      game.totalLaps = 1;
      game.car.finished = true;
      game._showResults();
      expect(game.state).toBe(GAME.STATES.RESULTS);
    });
  });

  describe('lap count selector', () => {
    it('should allow setting lap count within range', () => {
      game.setLapCount(3);
      expect(game.selectedLaps).toBe(3);
    });

    it('should clamp lap count to minimum', () => {
      game.setLapCount(0);
      expect(game.selectedLaps).toBe(GAME.MIN_LAPS);
    });

    it('should clamp lap count to maximum', () => {
      game.setLapCount(10);
      expect(game.selectedLaps).toBe(GAME.MAX_LAPS);
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

    it('should limit leaderboard entries', () => {
      for (let i = 0; i < 25; i++) {
        game.saveLapTime(50000 + i * 1000, 3);
      }
      expect(game.leaderboard.length).toBeLessThanOrEqual(GAME.MAX_LEADERBOARD_ENTRIES);
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
