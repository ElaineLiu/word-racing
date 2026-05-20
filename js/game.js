/**
 * Game - 游戏主控制器
 * 状态机: MENU -> QUIZ <-> SHOP <-> (COUNTDOWN -> RACING -> RESULTS) -> QUIZ
 * 三面板: QUIZ / SHOP / RACING 可手动切换（RACING中只能EXIT回QUIZ）
 *
 * Phase 1.2 - Converted to ES6 module, uses config
 * Phase 2.2 - Integrated ShopSystem
 * Phase 2.1 - Integrated RenderSystem
 */
import { Track } from './track.js';
import { Car } from './car.js';
import { VocabularyQuiz } from './quiz.js';
import { ECONOMY, DISPLAY, GAME, UPGRADES } from '../config/game-config.js';
import { EventBus } from '../core/event-bus.js';
import { ShopSystem } from '../systems/shop-system.js';
import { RenderSystem } from '../rendering/render-system.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scale = 1;

        // Game state
        this.state = GAME.STATES.MENU;
        this.selectedLaps = GAME.MIN_LAPS;
        this.totalLaps = GAME.MIN_LAPS;

        // Player resources
        this.coins = 0;
        // --- 双货币系统 ---
        this.fuelCoins = 0;      // 燃油币（橙色图标 🪙）
        this.gearCoins = 0;      // 装备币（蓝色图标 ⚙️）
        this.maxFuel = ECONOMY.MAX_FUEL;
        this.fuel = ECONOMY.INITIAL_FUEL;
        this.fuelPerLap = ECONOMY.FUEL_PER_LAP;
        this.raceScore = 0;
        this.totalScore = 0;
        this.raceStartTime = 0;
        this.raceTime = 0;
        this.quizResults = null;
        // --- 改装等级 ---
        this.upgrades = {
            engine: UPGRADES.MIN_LEVEL,
            tire: UPGRADES.MIN_LEVEL,
            body: UPGRADES.MIN_LEVEL
        };
        this.nitroCharges = 0;

        // Countdown
        this.countdownTimer = 0;
        this.countdownText = '';

        // Timing
        this.lastFrameTime = 0;
        this.animationId = null;

        // Input
        this.keys = {};
        this._setupInput();

        // Leaderboard (从 localStorage 加载)
        this.leaderboard = this._loadLeaderboard();

        // Callbacks (set by index.html)
        this.onExitRace = null;
        this.onResultsContinueCb = null;

        // Core systems
        this._eventBus = new EventBus();
        this._shopSystem = new ShopSystem(this._eventBus, null);
        this._renderSystem = new RenderSystem(canvas);

        // Subsystems
        this.track = new Track();
        this.car = new Car(
            this.track.startPos.x,
            this.track.startPos.y,
            this.track.startPos.angle
        );
        this.quiz = new VocabularyQuiz();
        this.car.applyUpgrades(this.upgrades);

        // Connect render system
        this._renderSystem.setTrack(this.track);
        this._renderSystem.setCar(this.car);
    }

    // Shop items delegate to ShopSystem
    get _shopItems() {
        return this._shopSystem.getItems();
    }

    // ==================== Leaderboard ====================
    _loadLeaderboard() {
        try {
            const data = localStorage.getItem('wr_leaderboard');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    _saveLeaderboard() {
        try {
            localStorage.setItem('wr_leaderboard', JSON.stringify(this.leaderboard.slice(0, GAME.MAX_LEADERBOARD_ENTRIES)));
        } catch (e) {}
    }

    /**
     * 保存圈速到排行榜（仅保存最快圈）
     * @param {number} lapTime - 圈速（ms）
     * @param {number} lapCount - 本次比赛圈数
     */
    saveLapTime(lapTime, lapCount) {
        this.leaderboard.push({
            time: lapTime,
            lapCount: lapCount,
            date: new Date().toLocaleDateString('en-US')
        });
        // 按时间升序排列，保留前20条
        this.leaderboard.sort((a, b) => a.time - b.time);
        if (this.leaderboard.length > GAME.MAX_LEADERBOARD_ENTRIES) this.leaderboard = this.leaderboard.slice(0, GAME.MAX_LEADERBOARD_ENTRIES);
        this._saveLeaderboard();
    }

    /**
     * 获取前N名排行榜
     */
    getLeaderboard(topN = 5) {
        return this.leaderboard.slice(0, topN);
    }

    // ==================== Lap Selector ====================
    /**
     * 设置比赛圈数（1-5）
     */
    setLapCount(n) {
        this.selectedLaps = Math.max(GAME.MIN_LAPS, Math.min(GAME.MAX_LAPS, n));
    }

    // ==================== Initialize ====================

    /**
     * Initialize and start
     */
    async init() {
        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());
        await this.quiz.loadWords();
        this._startLoop();
    }

    /**
     * Resize canvas
     */
    _resizeCanvas() {
        const container = this.canvas.parentElement;
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
        this.canvas.width = canvasW;
        this.canvas.height = canvasH;
        this.scale = canvasW / 920;
    }

    /**
     * Setup keyboard and touch input
     */
    _setupInput() {
        const _preventKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (_preventKeys.includes(e.key)) {
                e.preventDefault();
            }
        }, true);
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Canvas click handler
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const cx = (e.clientX - rect.left) / this.scale;
            const cy = (e.clientY - rect.top) / this.scale;

            if (this.state === 'RESULTS') {
                const newState = this.handleResultsClick(cx, cy);
                if (newState !== this.state) {
                    this.state = newState;
                }
            } else if (this.state === 'RACING') {
                // Check if EXIT RACE button was clicked
                const exitBtn = this._renderSystem.getExitBtnRect();
                if (exitBtn) {
                    if (cx >= exitBtn.x && cx <= exitBtn.x + exitBtn.w && cy >= exitBtn.y && cy <= exitBtn.y + exitBtn.h) {
                        this.exitRace();
                        if (typeof this.onExitRace === 'function') {
                            this.onExitRace();
                        }
                    }
                }
            }
        });
    }

    /**
     * Get current input state for car
     */
    _getCarInput() {
        const keys = this.keys;
        const t = this._touchInput;
        return {
            up:    keys['ArrowUp']   || keys['w'] || keys['W'] || !!(t && t.up),
            down:  keys['ArrowDown'] || keys['s'] || keys['S'] || !!(t && t.down),
            left:  keys['ArrowLeft']  || keys['a'] || keys['A'] || !!(t && t.left),
            right: keys['ArrowRight'] || keys['d'] || keys['D'] || !!(t && t.right),
            nitro: keys[' ']      || !!(t && t.nitro)
        };
    }

    // Touch input (set by touch controls)
    _touchInput = null;

    setTouchInput(input) {
        this._touchInput = input;
    }

    /**
     * Main game loop
     */
    _startLoop() {
        const loop = (timestamp) => {
            this._update(timestamp);
            this._render();
            this.animationId = requestAnimationFrame(loop);
        };
        this.animationId = requestAnimationFrame(loop);
    }

    /**
     * Main update
     */
    _update(timestamp) {
        switch (this.state) {
            case 'MENU':
                break;
            case 'QUIZ':
                // Quiz is handled by UI callbacks
                break;
            case 'SHOP':
                // SHOP is rendered, clicks handled by index.html
                break;
            case 'COUNTDOWN':
                this._updateCountdown();
                break;
            case 'RACING':
                this._updateRacing();
                break;
            case 'RESULTS':
                break;
        }
    }

    /**
     * Update countdown
     */
    _updateCountdown() {
        this.countdownTimer--;
        if (this.countdownTimer > 180) this.countdownText = '3';
        else if (this.countdownTimer > 120) this.countdownText = '2';
        else if (this.countdownTimer > 60) this.countdownText = '1';
        else if (this.countdownTimer > 0) this.countdownText = 'GO!';
        else {
            this.countdownText = '';
            this.state = 'RACING';
            this.raceStartTime = Date.now();
            this.car.lapStartTime = Date.now();
        }
    }

    /**
     * Update racing state
     */
    _updateRacing() {
        this.car.input = this._getCarInput();
        this.car.update(this.track, this.totalLaps);

        // BugFix: sync nitro charges (car.nitroCharges changes when nitro is used)
        this.nitroCharges = this.car.nitroCharges;

        this.raceTime = Date.now() - this.raceStartTime;

        // 燃油不在每圈扣除，改为比赛结束时统一结算（在 _showResults / exitRace 中）
        // 圈数达标则完赛
        if (this.car.finished) {
            setTimeout(() => this._showResults(), 1000);
            this.state = 'RESULTS';
        }
    }

    _lastLap = 0;

    // Floating text display - delegates to RenderSystem
    _floatingTexts = [];
    _showFloatingText(text, x, y, color) {
        this._renderSystem.showFloatingText(text, x, y, color);
    }

    /**
     * Main render - delegates to RenderSystem
     */
    _render() {
        // Update render system scale
        this._renderSystem.setScale(this.scale);

        // Build game state for render system
        const gameState = {
            countdownText: this.countdownText,
            lap: this.car.lap,
            totalLaps: this.totalLaps,
            raceTime: this.raceTime,
            bestLapTime: this.car.bestLapTime,
            raceScore: this.raceScore,
            quizScore: this.quizResults?.score || 0,
            fuel: this.fuel,
            maxFuel: this.maxFuel,
            displaySpeed: this.car.speed * DISPLAY.SPEED_MULTIPLIER,
            nitroStatus: this.car.getNitroStatus(),
            wrongWords: this.quizResults?.wrong || []
        };

        this._renderSystem.render(this.state, gameState);
    }

    // ==================== SHOP Panel ====================
    // Shop items are loaded from config in constructor


    /**
     * 处理 RESULTS 面板上的点击事件
     * @returns {string} 新状态（可能不变）
     */
    handleResultsClick(cx, cy) {
        const resultsButtons = this._renderSystem.getResultsButtons();
        if (!resultsButtons) return this.state;
        for (const btn of resultsButtons) {
            if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
                if (btn.id === 'continue') {
                    return this.onResultsContinue();
                }
            }
        }
        return this.state;
    }

    /**
     * 执行 SHOP 按钮对应的操作
     * Delegates to ShopSystem
     */
    _executeShopAction(id) {
        const context = {
            fuelCoins: this.fuelCoins,
            gearCoins: this.gearCoins,
            fuel: this.fuel,
            maxFuel: this.maxFuel,
            nitroCharges: this.nitroCharges,
            upgrades: this.upgrades,
            car: this.car
        };

        const result = this._shopSystem.purchase(id, context);

        if (result.success) {
            // Sync context back
            this.fuelCoins = context.fuelCoins;
            this.gearCoins = context.gearCoins;
            this.fuel = context.fuel;
            this.nitroCharges = context.nitroCharges;
            this.upgrades = context.upgrades;

            if (result.newState) {
                this.state = result.newState;
                if (result.newState === 'COUNTDOWN') {
                    this.totalLaps = this.selectedLaps;
                }
                if (result.countdownFrames) {
                    this.countdownTimer = result.countdownFrames;
                }
            }
        }

        return this.state;
    }

    /**
     * Start a new quiz (entry point after MENU or RESULTS)
     */
    startNewQuiz() {
        this.car.reset(this.track.startPos.x, this.track.startPos.y, this.track.startPos.angle);
        this.raceScore = 0;
        this.raceTime = 0;
        this._floatingTexts = [];
        this._lastLap = 0;

        this.state = 'QUIZ';
        // Preserve current quiz mode (basic/challenge)
        const currentMode = this.quiz.quizMode || 'basic';
        const maxLevel = currentMode === 'challenge' ? 4 : 3;
        return this.quiz.generateQuiz(5, maxLevel);
    }

    /**
     * Called when quiz is complete — reward coins & fuel, do NOT start race yet.
     * 让用户选择圈数，并可以前往 SHOP 或直接开始比赛。
     */
    onQuizComplete() {
        this.quizResults = this.quiz.getResults();

        // Dual currency rewards
        this.fuelCoins += this.quizResults.fuelCoinsEarned;
        this.gearCoins += this.quizResults.gearCoinsEarned;

        // Legacy coins (keep for compatibility)
        const coinReward = Math.round(this.quizResults.score * 0.6);
        this.coins += coinReward;

        // BugFix: DO NOT auto-refuel! Player must buy fuel in shop with fuelCoins
        // this.fuel = this.maxFuel;  // REMOVED: this line made fuel coins useless

        // BugFix: DO NOT auto-add nitro! Must buy in shop with gear coins
        // Nitro can ONLY be purchased in shop with gear coins
        // this.car.addNitro(nitroCharges);  // REMOVED
        // this.nitroCharges += nitroCharges;  // REMOVED

        this.totalScore = this.quizResults.score;

        // 不自动开始比赛，等待用户操作
        // state 保持 QUIZ，由 index.html 控制面板显示
    }

    /**
     * 用户确认开始比赛（从 QUIZ 完成面板或 SHOP 面板触发）
     */
    continueToRace() {
        this.totalLaps = this.selectedLaps;
        this.state = 'COUNTDOWN';
        this.countdownTimer = 240;
    }

    /**
     * Called when player clicks "Start Race" in SHOP
     */
    startRaceFromShop() {
        if (this.fuel <= 0) return; // safety guard
        this.continueToRace();
    }

    _showResults() {
        // BugFix: Deduct fuel when race completes (real-time based on distance)
        // Same logic as exitRace(): lapsDone * fuelPerLap + partialFuel
        const progress = this.car.lastProgress || 0;
        const lapsDone = Math.max(0, this.car.lap);
        const partialFuel = this.fuelPerLap * Math.max(0, progress);
        const totalFuelUsed = lapsDone * this.fuelPerLap + partialFuel;
        this.fuel = Math.max(0, this.fuel - totalFuelUsed);

        this.totalScore = this.raceScore + (this.quizResults ? this.quizResults.score : 0);
        // 保存最快圈速到排行榜
        if (this.car.bestLapTime < Infinity) {
            this.saveLapTime(this.car.bestLapTime, this.totalLaps);
        }
        this.state = 'RESULTS';
    }

    /**
     * 中途退赛：停止计时、按比例扣燃油、赛车回起点、返回 QUIZ
     */
    exitRace() {
        // 先保存当前最快圈速（如果有）
        if (this.car.bestLapTime < Infinity) {
            this.saveLapTime(this.car.bestLapTime, this.totalLaps);
        }
        // 按已完成的圈数 + 当前圈进度比例扣除燃油
        const progress = this.car.lastProgress || 0;
        const lapsDone = Math.max(0, this.car.lap); // 已完成的整圈数
        const partialFuel = this.fuelPerLap * Math.max(0, progress); // 当前圈按比例扣
        const totalFuelUsed = lapsDone * this.fuelPerLap + partialFuel;
        this.fuel = Math.max(0, this.fuel - totalFuelUsed);

        // 赛车回起点
        this.car.reset(this.track.startPos.x, this.track.startPos.y, this.track.startPos.angle);
        this.raceTime = 0;
        this._floatingTexts = [];
        this._lastLap = 0;

        // 返回 QUIZ 状态
        this.state = 'QUIZ';
        return 'QUIZ';
    }

    /**
     * Called when player clicks "Continue" on RESULTS screen
     * @returns {string} new state
     */
    onResultsContinue() {
        // 比完一圈必须重新答题（燃油不继承，重新答题后补给）
        this.startNewQuiz();
        // 触发回调，切换到首页（答题面板在首页）
        if (typeof this.onResultsContinueCb === 'function') {
            this.onResultsContinueCb();
        }
        return 'QUIZ';
    }

    /**
     * Format milliseconds to M:SS.ms
     */
    _formatTime(ms) {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        const millis = Math.floor((ms % 1000) / 10);
        return `${min}:${sec.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
    }

    /**
     * Draw rounded rectangle
     */
    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
