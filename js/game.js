/**
 * Game - 游戏主控制器
 * 状态机: MENU -> QUIZ <-> SHOP <-> (COUNTDOWN -> RACING -> RESULTS) -> QUIZ
 * 三面板: QUIZ / SHOP / RACING 可手动切换（RACING中只能EXIT回QUIZ）
 *
 * Phase 1.2 - Converted to ES6 module, uses config
 */
import { Track } from './track.js';
import { Car } from './car.js';
import { VocabularyQuiz } from './quiz.js';
import { ECONOMY, DISPLAY, GAME, UPGRADES } from '../config/game-config.js';

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

        // Subsystems
        this.track = new Track();
        this.car = new Car(
            this.track.startPos.x,
            this.track.startPos.y,
            this.track.startPos.angle
        );
        this.quiz = new VocabularyQuiz();
        this.car.applyUpgrades(this.upgrades);

        // Shop items from config
        this._shopItems = ECONOMY.SHOP_ITEMS.map(item => ({ ...item }));
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
                if (this._exitBtnRect) {
                    const btn = this._exitBtnRect;
                    if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
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

    // Floating text display
    _floatingTexts = [];
    _showFloatingText(text, x, y, color) {
        this._floatingTexts.push({ text, x, y, color, life: 90, maxLife: 90 });
    }

    /**
     * Main render
     */
    _render() {
        const ctx = this.ctx;
        const scale = this.scale;
        const W = this.canvas.width;
        const H = this.canvas.height;

        // Check if canvas page is active
        const racePage = document.getElementById('page-race');
        if (!racePage || !racePage.classList.contains('active')) {
            // Canvas page not active, don't render
            ctx.clearRect(0, 0, W, H);
            return;
        }

        ctx.clearRect(0, 0, W, H);
        ctx.save();
        ctx.scale(scale, scale);

        switch (this.state) {
            case 'COUNTDOWN':
                this._renderTrackAndCars(ctx, scale);
                this._renderCountdown(ctx, scale);
                break;
            case 'RACING':
                this._renderTrackAndCars(ctx, scale);
                this._renderHUD(ctx, scale);
                this._renderFloatingTexts(ctx, scale);
                break;
            case 'RESULTS':
                this._renderTrackAndCars(ctx, scale);
                this._renderResults(ctx, scale);
                break;
        }

        ctx.restore();
    }

    _renderTrackAndCars(ctx, scale) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const tx = W / (2 * scale) - this.car.x;
        const ty = H / (2 * scale) - this.car.y;
        ctx.save();
        ctx.translate(tx, ty);

        this.track.render(ctx, scale);
        this.car.render(ctx, scale);

        ctx.restore();

        this._renderMiniMap(ctx);
    }

    // Mini-map
    _renderMiniMap(ctx) {
        const W = this.canvas.width;
        const H = this.canvas.height;
        const mW = 160;
        const mH = 120;
        const mx = W - mW - 10;
        const my = 10;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(mx, my, mW, mH);

        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const pts = this.track.points;
        for (let i = 0; i < pts.length; i += 8) {
            const p = pts[i];
            const sx = mx + (p.x / 920) * mW;
            const sy = my + (p.y / 620) * mH;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.stroke();

        if (pts.length > 0) {
            ctx.fillStyle = '#FFD700';
            const sx = mx + (pts[0].x / 920) * mW;
            const sy = my + (pts[0].y / 620) * mH;
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        const pix = mx + (this.car.x / 920) * mW;
        const piy = my + (this.car.y / 620) * mH;
        ctx.fillStyle = '#E53935';
        ctx.fillRect(pix - 2, piy - 2, 4, 4);

        ctx.restore();
    }


    // 排行榜渲染（MENU 界面右侧）
    _renderLeaderboard(ctx) {
        const lx = 600, ly = 185, lw = 280, lh = 240;
        ctx.fillStyle = 'rgba(13,17,23,0.7)';
        this._roundRect(ctx, lx, ly, lw, lh, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        this._roundRect(ctx, lx, ly, lw, lh, 10);
        ctx.stroke();

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FASTEST LAPS', lx + lw / 2, ly + 24);

        const top = this.getLeaderboard(5);
        if (top.length === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.font = '13px Arial';
            ctx.fillText('No records yet', lx + lw / 2, ly + 60);
            return;
        }

        top.forEach((entry, i) => {
            const ry = ly + 50 + i * 34;
            ctx.fillStyle = i === 0 ? '#FFD700' : 'rgba(255,255,255,0.7)';
            ctx.font = i === 0 ? 'bold 14px Arial' : '13px Arial';
            ctx.textAlign = 'left';
            const lapStr = `${entry.lapCount}-lap`;
            ctx.fillText(`${i + 1}. ${this._formatTime(entry.time)}  (${lapStr})`, lx + 14, ry);
        });
    }

    _renderFuelBar(ctx, x, y, w, h) {
        // Background
        ctx.fillStyle = 'rgba(13,17,23,0.85)';
        this._roundRect(ctx, x, y, w, h, 4);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        this._roundRect(ctx, x, y, w, h, 4);
        ctx.stroke();

        // Fill
        const ratio = Math.max(0, Math.min(1, this.fuel / this.maxFuel));
        const color = ratio > 0.5 ? '#00C853' : ratio > 0.25 ? '#FF6D00' : '#E10600';
        if (ratio > 0) {
            ctx.fillStyle = color;
            this._roundRect(ctx, x + 1, y + 1, (w - 2) * ratio, h - 2, 3);
            ctx.fill();
        }

        // Label
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`FUEL  ${Math.round(this.fuel)} / ${this.maxFuel}`, x + w / 2, y + h / 2 + 0.5);
    }


    _renderCountdown(ctx, scale) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, 920, 620);

        ctx.fillStyle = this.countdownText === 'GO!' ? '#00C853' : '#FFD700';
        ctx.font = `bold ${this.countdownText === 'GO!' ? 90 : 110}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.countdownText, 460, 310);
    }

    _renderHUD(ctx, scale) {
        const padding = 12;

        // --- Helper: draw a HUD panel ---
        const drawPanel = (x, y, w, h, label, value, valueColor = '#FFF') => {
            ctx.fillStyle = 'rgba(13,17,23,0.82)';
            this._roundRect(ctx, x, y, w, h, 8);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            this._roundRect(ctx, x, y, w, h, 8);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '11px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(label, x + 10, y + 6);
            ctx.fillStyle = valueColor;
            ctx.font = 'bold 20px Arial';
            ctx.textBaseline = 'top';
            ctx.fillText(value, x + 10, y + 22);
        };

        // --- LAP (top-left) ---
        drawPanel(padding, padding, 110, 48, 'LAP',
            `${Math.min(this.car.lap + 1, this.totalLaps)} / ${this.totalLaps}`, '#FFD700');

        // --- TIME (top-center) ---
        drawPanel(375, padding, 170, 48, 'TIME',
            this._formatTime(this.raceTime), '#FFF');

        // Best lap (small, below timer)
        if (this.car.bestLapTime < Infinity) {
            ctx.fillStyle = 'rgba(0,200,83,0.8)';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('BEST  ' + this._formatTime(this.car.bestLapTime), 460, padding + 54);
        }

        // --- SCORE (top-right) ---
        drawPanel(798, padding, 110, 48, 'SCORE',
            String(this.raceScore), '#FFD700');

        // --- FUEL BAR (top-right, below score) ---
        this._renderFuelBar(ctx, 798, padding + 54, 110, 18);

        // --- SPEED (bottom-left) ---
        const speedY = 512;
        const speedW = 130;
        const speedH = 88;
        ctx.fillStyle = 'rgba(13,17,23,0.82)';
        this._roundRect(ctx, padding, speedY, speedW, speedH, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        this._roundRect(ctx, padding, speedY, speedW, speedH, 10);
        ctx.stroke();

        const displaySpeed = this.car.getDisplaySpeed();
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displaySpeed, padding + speedW / 2, speedY + 36);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '12px Arial';
        ctx.fillText('km/h', padding + speedW / 2, speedY + 64);

        // Speed bar
        const speedRatio = Math.min(displaySpeed / 200, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(padding + 10, speedY + speedH - 10, speedW - 20, 4);
        const speedBarColor = displaySpeed > 150 ? '#FF6D00' : displaySpeed > 80 ? '#00B0FF' : '#00C853';
        ctx.fillStyle = speedBarColor;
        ctx.fillRect(padding + 10, speedY + speedH - 10, (speedW - 20) * speedRatio, 4);

        // --- NITRO (bottom-right) ---
        this._renderNitroHUD(ctx, scale, padding);

        // --- EXIT RACE (top-left, below lap) ---
        this._exitBtnRect = { x: padding, y: padding + 54, w: 110, h: 28 };
        ctx.fillStyle = 'rgba(225,6,0,0.7)';
        this._roundRect(ctx, this._exitBtnRect.x, this._exitBtnRect.y, this._exitBtnRect.w, this._exitBtnRect.h, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(225,6,0,0.9)';
        ctx.lineWidth = 1;
        this._roundRect(ctx, this._exitBtnRect.x, this._exitBtnRect.y, this._exitBtnRect.w, this._exitBtnRect.h, 6);
        ctx.stroke();
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('EXIT RACE', this._exitBtnRect.x + this._exitBtnRect.w / 2, this._exitBtnRect.y + this._exitBtnRect.h / 2 + 0.5);
    }

    _renderNitroHUD(ctx, scale, padding) {
        const nitro = this.car.getNitroStatus();
        const x = 798;
        const y = 512;
        const w = 110;
        const h = 88;

        // Panel background
        ctx.fillStyle = 'rgba(13,17,23,0.82)';
        this._roundRect(ctx, x, y, w, h, 10);
        ctx.fill();

        // Panel border (glow when nitro available)
        ctx.strokeStyle = nitro.charges > 0 ? 'rgba(255,109,0,0.35)' : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        this._roundRect(ctx, x, y, w, h, 10);
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('NITRO', x + w - 10, y + 6);

        // Charge dots (max 5)
        const maxDots = 5;
        for (let i = 0; i < maxDots; i++) {
            const dotX = x + w - 14 - i * 18;
            const dotY = y + 30;
            if (i < nitro.charges) {
                ctx.fillStyle = '#FF6D00';
                ctx.beginPath();
                ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.beginPath();
                ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Active progress bar
        if (nitro.active) {
            ctx.fillStyle = 'rgba(255,109,0,0.15)';
            this._roundRect(ctx, x + 10, y + 50, w - 20, 10, 5);
            ctx.fill();
            ctx.fillStyle = '#FF6D00';
            this._roundRect(ctx, x + 10, y + 50, (w - 20) * nitro.progress, 10, 5);
            ctx.fill();

            // Strong glow border when active
            ctx.strokeStyle = 'rgba(255,109,0,0.6)';
            ctx.lineWidth = 1.5;
            this._roundRect(ctx, x, y, w, h, 10);
            ctx.stroke();
        }

        // Key hint
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('SPACE', x + w / 2, y + h - 16);
    }

    _renderFloatingTexts(ctx, scale) {
        for (let i = this._floatingTexts.length - 1; i >= 0; i--) {
            const ft = this._floatingTexts[i];
            const alpha = ft.life / ft.maxLife;
            const offsetY = (1 - alpha) * 40;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = ft.color;
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y - offsetY);
            ctx.restore();
            ft.life--;
            if (ft.life <= 0) this._floatingTexts.splice(i, 1);
        }
    }

    _renderResults(ctx, scale) {
        // Dark overlay
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, 920, 620);

        const bw = 460, bh = 440;
        const bx = (920 - bw) / 2, by = (620 - bh) / 2;

        // Panel background
        ctx.fillStyle = '#161B22';
        this._roundRect(ctx, bx, by, bw, bh, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        this._roundRect(ctx, bx, by, bw, bh, 16);
        ctx.stroke();

        // Title
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RACE COMPLETE!', 460, by + 45);

        // Subtitle
        ctx.fillStyle = '#00C853';
        ctx.font = 'bold 22px Arial';
        ctx.fillText('1st Place!', 460, by + 82);

        // Divider line
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + 30, by + 100);
        ctx.lineTo(bx + bw - 30, by + 100);
        ctx.stroke();

        const stats = [
            { label: 'Race Time', value: this._formatTime(this.raceTime) },
            { label: 'Best Lap', value: this.car.bestLapTime < Infinity ? this._formatTime(this.car.bestLapTime) : '--' },
            { label: 'Word Score', value: String(this.raceScore) },
            { label: 'Quiz Score', value: String(this.quizResults ? this.quizResults.score : 0) },
            { label: 'Total Score', value: String(this.raceScore + (this.quizResults ? this.quizResults.score : 0)) },
            { label: 'Fuel Left', value: `${Math.round(this.fuel)} / ${this.maxFuel}` },
        ];

        stats.forEach((stat, i) => {
            const sy = by + 120 + i * 36;
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.font = '15px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(stat.label, bx + 40, sy);
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(stat.value, bx + bw - 40, sy);
        });

        // Wrong words review
        if (this.quizResults && this.quizResults.wrong.length > 0) {
            ctx.fillStyle = '#FF6D00';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Review: ' + this.quizResults.wrong.map(w => w.word + '(' + w.meaning + ')').join(', '), 460, by + bh - 72);
        }

        // Continue button
        const btnText = this.fuel <= 0 ? 'NEED FUEL! QUIZ NOW!' : 'CONTINUE';
        const btnColor = this.fuel <= 0 ? '#FF6D00' : '#00C853';
        ctx.fillStyle = this._hexToRgba(btnColor, 0.12);
        ctx.strokeStyle = btnColor;
        ctx.lineWidth = 1.5;
        this._roundRect(ctx, bx + 80, by + bh - 55, bw - 160, 42, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = btnColor;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btnText, 460, by + bh - 34);

        // Store button position for click detection
        this._resultsButtons = [{
            id: 'continue',
            x: bx + 80,
            y: by + bh - 55,
            w: bw - 160,
            h: 42
        }];
    }

    _hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    // ==================== SHOP Panel ====================
    // Shop items are loaded from config in constructor


    /**
     * 处理 RESULTS 面板上的点击事件
     * @returns {string} 新状态（可能不变）
     */
    handleResultsClick(cx, cy) {
        if (!this._resultsButtons) return this.state;
        for (const btn of this._resultsButtons) {
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
     */
    _executeShopAction(id) {
        // Find item in _shopItems
        const item = this._shopItems.find(it => it.id === id);
        if (!item) {
            // Handle non-item actions
            switch (id) {
                case 'back_quiz':
                    this.state = 'QUIZ';
                    return 'QUIZ';
                case 'start_race':
                    if (this.fuel > 0) {
                        this.totalLaps = this.selectedLaps;
                        this.state = 'COUNTDOWN';
                        this.countdownTimer = DISPLAY.COUNTDOWN_FRAMES;
                        return 'COUNTDOWN';
                    }
                    break;
            }
            return this.state;
        }

        // Check if can afford based on currency
        let canAfford = false;
        if (item.currency === 'fuel') {
            canAfford = this.fuelCoins >= item.cost && this.fuel < this.maxFuel;
        } else if (item.currency === 'gear') {
            canAfford = this.gearCoins >= item.cost;
            // For upgrades, check if already at max level
            if (canAfford && item.upgrade) {
                canAfford = this.upgrades[item.upgrade] < UPGRADES.MAX_LEVEL;
            }
        }

        if (!canAfford) {
            console.warn(`Cannot afford ${item.label} or item maxed out`);
            return this.state;
        }

        // Deduct currency
        if (item.currency === 'fuel') {
            this.fuelCoins -= item.cost;
        } else if (item.currency === 'gear') {
            this.gearCoins -= item.cost;
        }

        // Apply effect
        if (id.startsWith('fuel')) {
            const amount = id === 'fuel20' ? 20 : 50;
            this.fuel = Math.min(this.maxFuel, this.fuel + amount);
        } else if (id.startsWith('nitro')) {
            const amount = id === 'nitro1' ? 1 : 3;
            this.car.addNitro(amount);
            this.nitroCharges += amount;
        } else if (item.upgrade) {
            // Upgrade item
            this.upgrades[item.upgrade] = Math.min(UPGRADES.MAX_LEVEL, this.upgrades[item.upgrade] + 1);
            this.car.applyUpgrades(this.upgrades);
            console.log(`Upgraded ${item.upgrade} to level ${this.upgrades[item.upgrade]}`);
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
