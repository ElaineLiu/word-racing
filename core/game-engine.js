/**
 * GameEngine - Thin coordinator for game subsystems
 * Phase 2.4 - Refactored from monolithic Game class
 */

import { Track } from '../js/track.js';
import { Car } from '../js/car.js';
import { VocabularyQuiz } from '../js/quiz.js';
import { EventBus, Events } from './event-bus.js';
import { GameState } from './game-state.js';
import { RenderSystem } from '../rendering/render-system.js';
import { ShopSystem } from '../systems/shop-system.js';
import { QuizEngine } from '../systems/quiz-engine.js';
import { ECONOMY, DISPLAY, GAME, UPGRADES } from '../config/game-config.js';

export class GameEngine {
  #eventBus;
  #gameState;
  #renderSystem;
  #shopSystem;
  #quizEngine;

  #canvas;
  #track;
  #car;
  #quiz;

  // Runtime state
  #state = GAME.STATES.MENU;
  #selectedLaps = GAME.MIN_LAPS;
  #totalLaps = GAME.MIN_LAPS;
  #raceTime = 0;
  #raceStartTime = 0;
  #raceScore = 0;
  #quizResults = null;

  // Countdown
  #countdownTimer = 0;
  #countdownText = '';

  // Timing
  #lastFrameTime = 0;
  #animationId = null;

  // Input
  #keys = {};
  #touchInput = null;

  // Callbacks
  #onExitRace = null;
  #onResultsContinue = null;

  constructor(canvas) {
    this.#canvas = canvas;

    // Initialize core systems
    this.#eventBus = new EventBus();
    this.#gameState = new GameState(this.#eventBus);
    this.#renderSystem = new RenderSystem(canvas);

    // Initialize game objects
    this.#track = new Track();
    this.#car = new Car(
      this.#track.startPos.x,
      this.#track.startPos.y,
      this.#track.startPos.angle
    );
    this.#quiz = new VocabularyQuiz();

    // Initialize subsystems
    this.#shopSystem = new ShopSystem(this.#eventBus, this.#gameState);
    this.#quizEngine = new QuizEngine(this.#eventBus, this.#quiz);

    // Connect render system
    this.#renderSystem.setTrack(this.#track);
    this.#renderSystem.setCar(this.#car);

    // Apply saved upgrades
    this.#car.applyUpgrades(this.#gameState.get('upgrades'));

    // Setup input
    this.#setupInput();

    // Setup event listeners
    this.#setupEventListeners();
  }

  // ==================== Initialization ====================

  async init() {
    this.#resizeCanvas();
    window.addEventListener('resize', () => this.#resizeCanvas());
    await this.#quiz.loadWords();
    this.#startLoop();
  }

  #resizeCanvas() {
    const container = this.#canvas.parentElement;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    const gameAspect = 920 / 620;
    let canvasW, canvasH;

    if (containerW / containerH > gameAspect) {
      canvasH = containerH;
      canvasW = canvasH * gameAspect;
    } else {
      canvasW = containerW;
      canvasH = canvasW / gameAspect;
    }

    this.#canvas.width = canvasW;
    this.#canvas.height = canvasH;
    this.#renderSystem.setScale(canvasW / 920);
  }

  #setupInput() {
    const preventKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];

    document.addEventListener('keydown', (e) => {
      this.#keys[e.key] = true;
      if (preventKeys.includes(e.key)) {
        e.preventDefault();
      }
    }, true);

    document.addEventListener('keyup', (e) => {
      this.#keys[e.key] = false;
    });

    // Canvas click handler
    this.#canvas.addEventListener('click', (e) => {
      this.#handleCanvasClick(e);
    });
  }

  #setupEventListeners() {
    // Sync nitro charges from car to state
    this.#eventBus.on(Events.NITRO_CHANGED, ({ value }) => {
      this.#gameState.set('nitroCharges', value);
    });
  }

  // ==================== Public API (Game class compatibility) ====================

  get state() { return this.#state; }
  set state(value) { this.#state = value; }

  get selectedLaps() { return this.#selectedLaps; }
  set selectedLaps(value) { this.#selectedLaps = value; }

  get fuel() { return this.#gameState.get('fuel'); }
  set fuel(value) { this.#gameState.set('fuel', value); }

  get maxFuel() { return ECONOMY.MAX_FUEL; }

  get fuelCoins() { return this.#gameState.get('fuelCoins'); }
  set fuelCoins(value) { this.#gameState.set('fuelCoins', value); }

  get gearCoins() { return this.#gameState.get('gearCoins'); }
  set gearCoins(value) { this.#gameState.set('gearCoins', value); }

  get nitroCharges() { return this.#car.nitroCharges; }
  set nitroCharges(value) { this.#car.nitroCharges = value; }

  get upgrades() {
    return {
      engine: this.#gameState.get('upgrades.engine'),
      tire: this.#gameState.get('upgrades.tire'),
      body: this.#gameState.get('upgrades.body'),
    };
  }

  set onExitRace(cb) { this.#onExitRace = cb; }
  get onExitRace() { return this.#onExitRace; }

  set onResultsContinueCb(cb) { this.#onResultsContinue = cb; }
  get onResultsContinueCb() { return this.#onResultsContinueCb; }

  get quiz() { return this.#quiz; }
  get car() { return this.#car; }
  get track() { return this.#track; }
  get quizResults() { return this.#quizResults; }
  set quizResults(value) { this.#quizResults = value; }
  get raceScore() { return this.#raceScore; }
  set raceScore(value) { this.#raceScore = value; }
  get totalScore() { return this.#quizResults ? this.#raceScore + this.#quizResults.score : this.#raceScore; }

  // ==================== Leaderboard ====================

  _loadLeaderboard() {
    return this.#gameState.get('leaderboard') || [];
  }

  _saveLeaderboard() {
    // Handled by GameState
  }

  saveLapTime(lapTime, lapCount) {
    this.#gameState.addLeaderboardEntry({
      time: lapTime,
      lapCount,
      date: new Date().toLocaleDateString('en-US'),
    });
  }

  getLeaderboard(topN = 5) {
    return (this.#gameState.get('leaderboard') || []).slice(0, topN);
  }

  // ==================== Lap Selector ====================

  setLapCount(n) {
    this.#selectedLaps = Math.max(GAME.MIN_LAPS, Math.min(GAME.MAX_LAPS, n));
  }

  // ==================== Quiz Methods ====================

  startNewQuiz() {
    this.#car.reset(this.#track.startPos.x, this.#track.startPos.y, this.#track.startPos.angle);
    this.#raceScore = 0;
    this.#raceTime = 0;
    this.#renderSystem.clearFloatingTexts();

    this.#state = 'QUIZ';
    this.#quiz.quizMode = 'basic';
    return this.#quizEngine.startQuiz(5, 3);
  }

  onQuizComplete() {
    this.#quizResults = this.#quizEngine.completeQuiz();

    // Update coins
    this.#gameState.addFuelCoins(this.#quizResults.fuelCoinsEarned);
    this.#gameState.addGearCoins(this.#quizResults.gearCoinsEarned);
  }

  // ==================== Race Methods ====================

  continueToRace() {
    this.#totalLaps = this.#selectedLaps;
    this.#state = 'COUNTDOWN';
    this.#countdownTimer = DISPLAY.COUNTDOWN_FRAMES;
    this.#eventBus.emit(Events.COUNTDOWN_START, { laps: this.#totalLaps });
  }

  startRaceFromShop() {
    if (this.fuel <= 0) return;
    this.continueToRace();
  }

  exitRace() {
    // Save best lap
    if (this.#car.bestLapTime < Infinity) {
      this.saveLapTime(this.#car.bestLapTime, this.#totalLaps);
    }

    // Calculate fuel usage
    const progress = this.#car.lastProgress || 0;
    const lapsDone = Math.max(0, this.#car.lap);
    const partialFuel = ECONOMY.FUEL_PER_LAP * Math.max(0, progress);
    const totalFuelUsed = lapsDone * ECONOMY.FUEL_PER_LAP + partialFuel;
    this.fuel = Math.max(0, this.fuel - totalFuelUsed);

    // Reset car
    this.#car.reset(this.#track.startPos.x, this.#track.startPos.y, this.#track.startPos.angle);
    this.#raceTime = 0;
    this.#renderSystem.clearFloatingTexts();

    this.#state = 'QUIZ';
    this.#eventBus.emit(Events.RACE_EXIT, { fuelUsed: totalFuelUsed });
    return 'QUIZ';
  }

  // ==================== Shop Methods ====================

  get _shopItems() {
    return this.#shopSystem.getItems();
  }

  _executeShopAction(id) {
    const context = {
      fuelCoins: this.fuelCoins,
      gearCoins: this.gearCoins,
      fuel: this.fuel,
      maxFuel: this.maxFuel,
      nitroCharges: this.nitroCharges,
      upgrades: this.upgrades,
      car: this.#car,
    };

    const result = this.#shopSystem.purchase(id, context);

    if (result.success) {
      // Sync state back
      this.#gameState.set('fuelCoins', context.fuelCoins);
      this.#gameState.set('gearCoins', context.gearCoins);
      this.fuel = context.fuel;
      this.#gameState.set('nitroCharges', context.nitroCharges);
      this.#gameState.set('upgrades', context.upgrades);

      if (result.newState) {
        this.#state = result.newState;
        if (result.countdownFrames) {
          this.#countdownTimer = result.countdownFrames;
        }
      }
    }

    return this.#state;
  }

  // ==================== Results ====================

  handleResultsClick(cx, cy) {
    const buttons = this.#renderSystem.getResultsButtons();
    if (!buttons) return this.#state;

    for (const btn of buttons) {
      if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
        if (btn.id === 'continue') {
          return this.onResultsContinue();
        }
      }
    }
    return this.#state;
  }

  onResultsContinue() {
    this.startNewQuiz();
    if (typeof this.#onResultsContinue === 'function') {
      this.#onResultsContinue();
    }
    return 'QUIZ';
  }

  _showResults() {
    // Calculate fuel usage
    const progress = this.#car.lastProgress || 0;
    const lapsDone = Math.max(0, this.#car.lap);
    const partialFuel = ECONOMY.FUEL_PER_LAP * Math.max(0, progress);
    const totalFuelUsed = lapsDone * ECONOMY.FUEL_PER_LAP + partialFuel;
    this.fuel = Math.max(0, this.fuel - totalFuelUsed);

    // Save best lap
    if (this.#car.bestLapTime < Infinity) {
      this.saveLapTime(this.#car.bestLapTime, this.#totalLaps);
    }

    this.#state = 'RESULTS';
    this.#eventBus.emit(Events.RACE_FINISH, { time: this.#raceTime });
  }

  // ==================== Input ====================

  setTouchInput(input) {
    this.#touchInput = input;
  }

  #getCarInput() {
    const keys = this.#keys;
    const t = this.#touchInput;
    return {
      up: keys['ArrowUp'] || keys['w'] || keys['W'] || !!(t && t.up),
      down: keys['ArrowDown'] || keys['s'] || keys['S'] || !!(t && t.down),
      left: keys['ArrowLeft'] || keys['a'] || keys['A'] || !!(t && t.left),
      right: keys['ArrowRight'] || keys['d'] || keys['D'] || !!(t && t.right),
      nitro: keys[' '] || !!(t && t.nitro),
    };
  }

  #handleCanvasClick(e) {
    const rect = this.#canvas.getBoundingClientRect();
    const scale = this.#renderSystem.getScale();
    const cx = (e.clientX - rect.left) / scale;
    const cy = (e.clientY - rect.top) / scale;

    if (this.#state === 'RESULTS') {
      const newState = this.handleResultsClick(cx, cy);
      if (newState !== this.#state) {
        this.#state = newState;
      }
    } else if (this.#state === 'RACING') {
      const btn = this.#renderSystem.getExitBtnRect();
      if (btn && cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
        this.exitRace();
        if (typeof this.#onExitRace === 'function') {
          this.#onExitRace();
        }
      }
    }
  }

  // ==================== Game Loop ====================

  #startLoop() {
    const loop = (timestamp) => {
      this.#update(timestamp);
      this.#render();
      this.#animationId = requestAnimationFrame(loop);
    };
    this.#animationId = requestAnimationFrame(loop);
  }

  #update(timestamp) {
    switch (this.#state) {
      case 'COUNTDOWN':
        this.#updateCountdown();
        break;
      case 'RACING':
        this.#updateRacing();
        break;
    }
  }

  #updateCountdown() {
    this.#countdownTimer--;
    if (this.#countdownTimer > 180) this.#countdownText = '3';
    else if (this.#countdownTimer > 120) this.#countdownText = '2';
    else if (this.#countdownTimer > 60) this.#countdownText = '1';
    else if (this.#countdownTimer > 0) this.#countdownText = 'GO!';
    else {
      this.#countdownText = '';
      this.#state = 'RACING';
      this.#raceStartTime = Date.now();
      this.#car.lapStartTime = Date.now();
      this.#eventBus.emit(Events.RACE_START, { laps: this.#totalLaps });
    }
  }

  #updateRacing() {
    this.#car.input = this.#getCarInput();
    this.#car.update(this.#track, this.#totalLaps);
    this.#raceTime = Date.now() - this.#raceStartTime;

    if (this.#car.finished) {
      setTimeout(() => this._showResults(), 1000);
      this.#state = 'RESULTS';
    }
  }

  #render() {
    const gameState = {
      lap: this.#car.lap,
      totalLaps: this.#totalLaps,
      raceTime: this.#raceTime,
      raceScore: this.#raceScore,
      quizScore: this.#quizResults?.score || 0,
      bestLapTime: this.#car.bestLapTime,
      fuel: this.fuel,
      maxFuel: this.maxFuel,
      displaySpeed: this.#car.getDisplaySpeed(),
      nitroStatus: this.#car.getNitroStatus(),
      wrongWords: this.#quizResults?.wrong || [],
      countdownText: this.#countdownText,
    };

    this.#renderSystem.render(this.#state, gameState);
  }

  // ==================== Utility ====================

  _formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${min}:${sec.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  }

  _showFloatingText(text, x, y, color) {
    this.#renderSystem.showFloatingText(text, x, y, color);
  }
}
