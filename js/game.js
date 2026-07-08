/**
 * Game - 游戏主控制器
 * 状态机: MENU -> QUIZ <-> SHOP <-> (COUNTDOWN -> RACING -> RESULTS) -> QUIZ
 * 三面板: QUIZ / SHOP / RACING 可手动切换（RACING中只能EXIT回QUIZ）
 *
 * Phase 1.2 - Converted to ES6 module, uses config
 * Phase 2.2 - Integrated ShopSystem
 * Phase 2.1 - Integrated RenderSystem
 */
import { Car } from './car.js';
import { VocabularyQuiz } from './quiz.js';
import { ECONOMY, DISPLAY, GAME } from '../config/game-config.js';
import { EventBus, Events } from '../core/event-bus.js';
import { GameState } from '../core/game-state.js';
import { ShopSystem } from '../systems/shop-system.js';
import { RenderSystem } from '../rendering/render-system.js';
import { TRACK_REGISTRY } from '../config/track-registry.js';
import { FeatureFlags } from '../config/feature-flags.js';
import { TrackUnlockManager } from '../systems/track-unlock-manager.js';
import { TrackFactory } from '../systems/track-factory.js';

export class Game {
    constructor(canvas, gameState = null, eventBus = null, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scale = 1;
        this._track3DOptions = options.track3DOptions || {};
        this._raceSession3D = null;
        this._hud3DManager = null;
        this._raceStartPending = null;
        this._lastUpdateTime = 0;

        // Game state
        this.state = GAME.STATES.MENU;
        this.selectedLaps = GAME.MIN_LAPS;
        this.totalLaps = GAME.MIN_LAPS;

        // Core systems (EventBus 先建好，GameState 可注入或自建)
        this._eventBus = eventBus || new EventBus();
        this._gameState = gameState || new GameState(this._eventBus);

        // Load feature flags
        FeatureFlags.load();

        // Manager instances
        this._trackUnlockManager = new TrackUnlockManager(this._eventBus, this._gameState);
        this._trackFactory = new TrackFactory(this._eventBus, this._gameState, {
            track3DOptions: this._track3DOptions
        });

        // Player resources (legacy 'coins' counter, not persisted — kept for UI compatibility)
        this.coins = 0;
        this.raceScore = 0;
        this.totalScore = 0;
        this.raceStartTime = 0;
        this.raceTime = 0;
        this.quizResults = null;

        // 注：fuel / maxFuel / upgrades / nitroCharges 均通过 GameState 代理
        // 见下方 getter/setter，避免与 GameState 数据双源

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

        // Render & Shop systems
        this._shopSystem = new ShopSystem(this._eventBus, this._gameState);
        this._renderSystem = new RenderSystem(canvas);

        // Subsystems
        // 构造函数始终创建默认 2D 赛道，避免同步创建 3D
        // 真正的赛道在 startRace() 时按 selectedTrackId 创建
        this.track = this._trackFactory.create('shanghai-2d');
        this.car = new Car(
            this.track.startPos.x,
            this.track.startPos.y,
            this.track.startPos.angle
        );
        this.quiz = new VocabularyQuiz();
        // 同步持久化的 nitroCharges 到 Car（运行时单一源）
        this.car.nitroCharges = this._gameState.get('nitroCharges') || 0;

        // Connect render system
        this._renderSystem.setTrack(this.track);
        this._renderSystem.setCar(this.car);
    }

    // Shop items delegate to ShopSystem
    get _shopItems() {
        return this._shopSystem.getItems();
    }

    // ==================== GameState 同步字段（Phase 3.1a） ====================
    // 这些字段背后由 GameState 单一管理，确保与 LearningController / AchievementManager 共享同一份数据。

    get gameState() { return this._gameState; }

    get fuelCoins() { return this._gameState.get('fuelCoins') || 0; }
    set fuelCoins(value) { this._gameState.set('fuelCoins', value); }

    get gearCoins() { return this._gameState.get('gearCoins') || 0; }
    set gearCoins(value) { this._gameState.set('gearCoins', value); }

    get upgrades() { return this._gameState.get('upgrades'); }
    set upgrades(value) { this._gameState.set('upgrades', value); }

    // nitroCharges: Car 是运行时单一源（每帧消耗），GameState 是持久化源。
    // 读取优先 Car（运行时最新），写入双写以保证持久化。
    get nitroCharges() {
        return this.car ? this.car.nitroCharges : (this._gameState.get('nitroCharges') || 0);
    }
    set nitroCharges(value) {
        if (this.car) this.car.nitroCharges = value;
        this._gameState.set('nitroCharges', value);
    }

    get unlockedTracks() { return this._gameState.get('unlockedTracks') || []; }
    // 不提供 setter：解锁逻辑统一走 AchievementManager

    get selectedTrackId() { return this._gameState.get('selectedTrackId') || 'shanghai-2d'; }
    set selectedTrackId(value) { this._gameState.set('selectedTrackId', value); }

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
        // 验证 selectedTrackId 是否可用（比如 feature flag 禁用 3D）
        const currentTrackId = this.selectedTrackId;
        if (!this._trackFactory.isAvailable(currentTrackId)) {
            // 重置为默认 2D 赛道
            this.selectedTrackId = 'shanghai-2d';
        }

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
        const gameAspect = DISPLAY.CANVAS_WIDTH / DISPLAY.CANVAS_HEIGHT;
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
        this.scale = canvasW / DISPLAY.CANVAS_WIDTH;
    }

    /**
     * Setup keyboard and touch input
     */
    _setupInput() {
        const _preventKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'];
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (_preventKeys.includes(e.key)) {
                e.preventDefault();
            }

            // 处理 RACING/PAUSED 状态下的控制键
            if (this.state === 'RACING' || this.state === 'PAUSED') {
                if (this.state === 'RACING' && (e.key === 'r' || e.key === 'R')) {
                    this._resetCar();
                } else if (this.state === 'RACING' && (e.key === 'c' || e.key === 'C')) {
                    this._changeCamera();
                } else if (e.key === 'Tab') {
                    this._togglePause();
                }
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
        const deltaTime = this._lastUpdateTime ? (timestamp - this._lastUpdateTime) / 1000 : 1 / 60;
        this._lastUpdateTime = timestamp;

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
                this._updateRacing(deltaTime);
                break;
            case 'PAUSED':
                // 暂停状态不更新游戏逻辑
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
    _updateRacing(deltaTime = 1 / 60) {
        if (this.isCurrentTrack3D()) {
            this._raceSession3D.update(this._getCarInput(), deltaTime, this.totalLaps);
        } else {
            this.car.input = this._getCarInput();
            this.car.update(this.track, this.totalLaps);
        }

        // nitro 运行时单一源是 Car；持久化到 GameState 由比赛结束/退出统一处理

        this.raceTime = Date.now() - this.raceStartTime;

        // 燃油不在每圈扣除，改为比赛结束时统一结算（在 _showResults / exitRace 中）
        // 圈数达标则完赛
        if (this.car.finished) {
            this._showResults();
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
        if (this.isCurrentTrack3D()) {
            this._raceSession3D.render();
        }

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
            displaySpeed: Math.round(this.car.speed * DISPLAY.SPEED_DISPLAY_MULTIPLIER) || 0,
            nitroStatus: this.car.getNitroStatus(),
            wrongWords: this.quizResults?.wrong || [],
            ...(this._raceSession3D ? this._raceSession3D.getResult() : {})
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
     * 确保比赛已准备就绪（用于页面导航/恢复，不重复扣金币）
     * 如果当前已处于 COUNTDOWN/RACING/RESULTS，则不做任何事。
     * 否则委托给 startRace() 走完整流程：扣金币 + 用 TrackFactory 创建赛道。
     */
    async continueToRace() {
        // 已在比赛生命周期内，避免重复扣金币（修复刷新/导航导致 fuelCoins 清零）
        if ([GAME.STATES.COUNTDOWN, GAME.STATES.RACING, GAME.STATES.RESULTS].includes(this.state)) {
            return;
        }
        if (this._raceStartPending) {
            return this._raceStartPending;
        }

        this._raceStartPending = this.startRace().finally(() => {
            this._raceStartPending = null;
        });
        return this._raceStartPending;
    }

    /**
     * Called when player clicks "Start Race" in SHOP
     */
    startRaceFromShop() {
        return this.continueToRace();
    }

    _showResults() {
        // 清理 3D HUD
        this._disposeHUD3DManager();

        // 同步赛车运行时 nitro 到持久化层（单一源 Car → GameState）
        this._gameState.set('nitroCharges', this.car.nitroCharges);

        // 按实际圈数扣费
        this._chargeFuelCoinsByActualLaps();

        if (this.isCurrentTrack3D() && this.car.bestLapTime === Infinity) {
            this.car.bestLapTime = this.raceTime;
        }

        this.totalScore = this.raceScore + (this.quizResults ? this.quizResults.score : 0);
        // 保存最快圈速到排行榜
        if (this.car.bestLapTime < Infinity) {
            this.saveLapTime(this.car.bestLapTime, this.totalLaps);
        }
        this.state = 'RESULTS';
        this._eventBus.emit(Events.RACE_FINISH, this._buildRaceResultPayload());
    }

    /**
     * 中途退赛：停止计时、按比例扣燃油、赛车回起点、返回 QUIZ
     */
    exitRace() {
        // 先保存当前最快圈速（如果有）
        if (this.car.bestLapTime < Infinity) {
            this.saveLapTime(this.car.bestLapTime, this.totalLaps);
        }

        // 同步赛车运行时 nitro 到持久化层
        this._gameState.set('nitroCharges', this.car.nitroCharges);

        // 按实际圈数扣费
        this._chargeFuelCoinsByActualLaps();

        const exitPayload = {
            trackId: this.selectedTrackId,
            trackType: this.getCurrentTrackType(),
        };

        // 清理 3D HUD 和赛程
        this._disposeHUD3DManager();

        // 赛车回起点
        if (this._raceSession3D) {
            this._disposeRaceSession3D();
        } else {
            this.car.reset(this.track.startPos.x, this.track.startPos.y, this.track.startPos.angle);
        }
        this.raceTime = 0;
        this._floatingTexts = [];
        this._lastLap = 0;

        // 返回 HOME 状态
        this.state = 'HOME';
        this._eventBus.emit(Events.RACE_EXIT, exitPayload);
        return 'HOME';
    }

    /**
     * 按实际跑的圈数扣费
     * 扣费公式：实际圈数 × 10 金币
     * 实际圈数 = car.lap + (car.lastProgress || 0)
     * 例如：跑 2.5 圈，扣 25 金币
     */
    _chargeFuelCoinsByActualLaps() {
        // 计算实际圈数
        let actualLaps = this.car.lap + (this.car.lastProgress || 0);

        // 扣费（向上取整，最少扣 0 金币）
        const cost = Math.ceil(actualLaps * GAME.FUEL_COST_PER_LAP);
        const currentCoins = this._gameState.get('fuelCoins') || 0;
        const finalCost = Math.max(0, Math.min(cost, currentCoins));

        this._gameState.set('fuelCoins', currentCoins - finalCost);

        // 记录扣费日志（调试用）
        console.log(`[Race Cost] Actual laps: ${actualLaps.toFixed(2)}, Cost: ${finalCost} fuel coins`);

        // 清除比赛开始时记录的状态
        this._raceStartFuelCoins = null;
    }

    /**
     * 计算 N 圈需要的燃油币
     * @param {number} laps
     * @returns {number}
     */
    getFuelCostForLaps(laps) {
        return laps * GAME.FUEL_COST_PER_LAP;
    }

    /**
     * 当前燃油币能跑的最大圈数
     * @returns {number} 0-5
     */
    getMaxAffordableLaps() {
        const coins = this._gameState.get('fuelCoins') || 0;
        const maxByCoins = Math.floor(coins / GAME.FUEL_COST_PER_LAP);
        return Math.max(0, Math.min(maxByCoins, GAME.MAX_LAPS));
    }

    /**
     * 是否有足够燃油币参加比赛（至少 1 圈）
     * @returns {boolean}
     */
    canAffordRace() {
        return this.getMaxAffordableLaps() >= GAME.MIN_LAPS;
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
     * 选择赛道（UC-02）
     * 验证赛道是否存在、是否解锁、金币是否足够，然后持久化到 GameState。
     * @param {string} trackId
     * @throws {Error} Unknown track / Track not unlocked / Insufficient fuel coins
     */
    selectTrack(trackId) {
        const track = TRACK_REGISTRY[trackId];
        if (!track) throw new Error('Unknown track');

        // 委托给 TrackUnlockManager
        if (!this._trackUnlockManager.isUnlocked(trackId)) {
            throw new Error('Track not unlocked');
        }

        const fuelCoins = this._gameState.get('fuelCoins') || 0;
        if (fuelCoins < track.cost) throw new Error('Insufficient fuel coins');

        this.selectedTrackId = trackId;
    }

    /**
     * 开始比赛（UC-03）
     * 扣除赛道 cost，创建赛道实例并切换到 COUNTDOWN。
     * @throws {Error} Unknown track / Insufficient fuel coins / 3D track not implemented yet
     */
    startRace() {
        const trackId = this.selectedTrackId;
        const trackDef = TRACK_REGISTRY[trackId];
        if (!trackDef) throw new Error('Unknown track');
        if (trackDef.type === '3d' && !this._trackFactory.isAvailable(trackId)) {
            throw new Error(`Track not available: ${trackId}`);
        }

        // 燃油币不足 1 圈 → 拒绝比赛
        if (!this.canAffordRace()) {
            const costPerLap = GAME.FUEL_COST_PER_LAP;
            const coins = this._gameState.get('fuelCoins') || 0;
            throw new Error(`Not enough Fuel Coins. Need ${costPerLap}, have ${coins}. Complete quizzes to earn more.`);
        }

        // 如果选中圈数超过可负担上限，自动 clamp 到最大值
        const maxAffordable = this.getMaxAffordableLaps();
        if (this.selectedLaps > maxAffordable) {
            this.selectedLaps = maxAffordable;
        }

        return this._prepareRaceAfterCost(trackId, trackDef);
    }

    async _prepareRaceAfterCost(trackId, trackDef) {
        // 不再扣费，改为比赛结束时按实际圈数扣费
        // 记录比赛开始时的状态（用于调试）
        this._raceStartFuelCoins = this._gameState.get('fuelCoins') || 0;

        try {
            this._disposeRaceSession3D();
            this._disposeHUD3DManager();

            if (trackDef.type === '3d') {
                const { RaceSession3D } = await import('../3d/runtime/race-session-3d.js?v=epic5-fixed-right-chevron');
                this._raceSession3D = new RaceSession3D({
                    trackData: trackDef,
                    canvas: this._getThreeCanvas(),
                    eventBus: this._eventBus,
                    gameState: this._gameState,
                    ...this._track3DOptions,
                });
                this.track = this._raceSession3D.track;
                this.car = this._raceSession3D.playerCar;

                // 初始化 3D HUD
                const { HUD3DManager } = await import('../ui/hud-3d/hud-manager.js');
                this._hud3DManager = new HUD3DManager(this._eventBus, this._raceSession3D, this);
                this._hud3DManager.mount();
            } else {
                this.track = this._trackFactory.create(trackId);
                if (this.car instanceof Car) {
                    this.car.reset(this.track.startPos.x, this.track.startPos.y, this.track.startPos.angle);
                } else {
                    this.car = new Car(
                        this.track.startPos.x,
                        this.track.startPos.y,
                        this.track.startPos.angle
                    );
                    this.car.applyUpgrades(this.upgrades);
                    this.car.nitroCharges = this._gameState.get('nitroCharges') || 0;
                }
            }
        } catch (error) {
            // 创建失败，无需退款（因为还没扣费）
            this._disposeRaceSession3D();
            this._disposeHUD3DManager();
            throw error;
        }

        // 替换赛道实例
        this._renderSystem.setTrack(this.track);
        this._renderSystem.setCar(this.car);

        // 进入倒计时
        this.totalLaps = this.selectedLaps;
        this.state = GAME.STATES.COUNTDOWN;
        this.countdownTimer = 240;
    }

    /**
     * 重置赛车位置（R 键）
     */
    _resetCar() {
        if (!this.isCurrentTrack3D()) return;

        // 重置到赛道起点
        const startPos = this.track.startPos;
        this.car.x = startPos.x;
        this.car.y = startPos.y;
        this.car.angle = startPos.angle;
        this.car.speed = 0;
        this.car.steer = 0;
        this.car.sync3DPosition?.();
    }

    /**
     * 切换摄像机视角（C 键）
     */
    _changeCamera() {
        if (!this.isCurrentTrack3D()) return;

        // 在 3D 模式下切换摄像机视角
        if (this._raceSession3D && this._raceSession3D.track) {
            this._raceSession3D.track.cameraController?.toggleMode();
        }
    }

    /**
     * 暂停/恢复游戏（Tab 键）
     */
    _togglePause() {
        if (this.state === 'RACING') {
            this.state = 'PAUSED';
            this._eventBus.emit('game:paused');
        } else if (this.state === 'PAUSED') {
            this.state = 'RACING';
            this._eventBus.emit('game:resumed');
        }
    }

    _getThreeCanvas() {
        const canvas = document.getElementById('threeCanvas');
        if (!canvas) throw new Error('threeCanvas is required');
        return canvas;
    }

    _disposeRaceSession3D() {
        if (!this._raceSession3D) return;
        this._raceSession3D.dispose();
        this._raceSession3D = null;
    }

    _disposeHUD3DManager() {
        if (!this._hud3DManager) return;
        this._hud3DManager.destroy();
        this._hud3DManager = null;
    }

    isCurrentTrack3D() {
        return this._raceSession3D !== null && this.track?.type === '3d';
    }

    getCurrentTrackType() {
        return this.track?.type || '2d';
    }

    get3DRaceSession() {
        return this._raceSession3D;
    }

    resize3D() {
        if (!this._raceSession3D) return;
        this._raceSession3D.resize(this.canvas.width, this.canvas.height);
    }

    _buildRaceResultPayload() {
        return {
            trackId: this.selectedTrackId,
            trackType: this.getCurrentTrackType(),
            raceTime: this.raceTime,
            bestLapTime: this.car.bestLapTime,
            totalLaps: this.totalLaps,
            fuel: this.fuel,
            maxFuel: this.maxFuel,
            nitroCharges: this.nitroCharges,
            ...(this._raceSession3D ? this._raceSession3D.getResult() : {}),
        };
    }

    /**
     * 获取所有赛道及其解锁/可购买状态（供 ShopView 渲染）
     * @returns {Array<Object>}
     */
    getAvailableTracks() {
        // 使用 TrackFactory 过滤 FeatureFlags
        const availableTracks = this._trackFactory.getAvailableTracks();

        return availableTracks.map(track => ({
            ...track,
            unlocked: this._trackUnlockManager.isUnlocked(track.id)
        }));
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
}
