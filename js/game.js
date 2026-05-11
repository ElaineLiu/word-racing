/**
 * Game - 游戏主控制器
 * 状态机: MENU -> QUIZ <-> SHOP <-> (COUNTDOWN -> RACING -> RESULTS) -> QUIZ
 * 三面板: QUIZ / SHOP / RACING 可手动切换（RACING中只能EXIT回QUIZ）
 */
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scale = 1;

        // Game state
        this.state = 'MENU'; // MENU, QUIZ, SHOP, COUNTDOWN, RACING, RESULTS
        this.selectedLaps = 1;  // 用户设置的圈数 1-5
        this.totalLaps = 1;     // 当前比赛总圈数（由 selectedLaps 赋值）

        // Player resources
        this.coins = 0;
        // --- 双货币系统 ---
        this.fuelCoins = 0;      // 燃油币（橙色图标 🪙）
        this.gearCoins = 0;      // 装备币（蓝色图标 ⚙️）
        this.maxFuel = 100;
        this.fuel = 0;           // BugFix: initial fuel = 0, MUST buy in shop
        this.fuelPerLap = 20;   // 每圈消耗燃油（降低，让比赛更持久）
        this.raceScore = 0;
        this.totalScore = 0;
        this.raceStartTime = 0;
        this.raceTime = 0;
        this.quizResults = null;
        // --- 改装等级 ---
        this.upgrades = {
            engine: 1,  // 引擎等级（1-4）
            tire: 1,     // 轮胎等级（1-4）
            body: 1      // 车身等级（1-4）
        };
        this.nitroCharges = 0;    // Nitro 次数

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

        // Subsystems
        this.track = new Track();
        this.car = new Car(
            this.track.startPos.x,
            this.track.startPos.y,
            this.track.startPos.angle
        );
        this.quiz = new VocabularyQuiz();
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
            localStorage.setItem('wr_leaderboard', JSON.stringify(this.leaderboard.slice(0, 20)));
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
            date: new Date().toLocaleDateString('zh-CN')
        });
        // 按时间升序排列，保留前20条
        this.leaderboard.sort((a, b) => a.time - b.time);
        if (this.leaderboard.length > 20) this.leaderboard = this.leaderboard.slice(0, 20);
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
        this.selectedLaps = Math.max(1, Math.min(5, n));
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

        ctx.clearRect(0, 0, W, H);
        ctx.save();
        ctx.scale(scale, scale);

        switch (this.state) {
            case 'MENU':
                this._renderMenu(ctx, scale);
                break;
            case 'QUIZ':
                this._renderTrackAndCars(ctx, scale);
                this._renderQuizOverlay(ctx, scale);
                break;
            case 'SHOP':
                this._renderShop(ctx, scale);
                break;
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

    _renderMenu(ctx, scale) {
        ctx.fillStyle = '#1B5E20';
        ctx.fillRect(0, 0, 920, 620);

        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.arc(100 + i * 120, 100 + Math.sin(i) * 50, 60, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 56px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('WORD RACING', 460, 120);

        ctx.fillStyle = '#FFF';
        ctx.font = '18px Arial';
        ctx.fillText('Back words, drive fast!', 460, 160);

        // --- Lap count selector (1-5) ---
        ctx.fillStyle = '#FFF';
        ctx.font = '16px Arial';
        ctx.fillText('Select Laps:', 300, 200);
        for (let i = 1; i <= 5; i++) {
            const bx = 380 + (i - 1) * 52;
            const by = 182;
            const isSelected = (i === this.selectedLaps);
            ctx.fillStyle = isSelected ? '#FFD700' : 'rgba(255,255,255,0.15)';
            ctx.strokeStyle = isSelected ? '#FFD700' : '#FFF';
            ctx.lineWidth = 2;
            this._roundRect(ctx, bx, by, 40, 36, 8);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = isSelected ? '#1B5E20' : '#FFF';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(String(i), bx + 20, by + 22);
        }

        // --- Leaderboard (top 5) ---
        this._renderLeaderboard(ctx);

        // Start button
        ctx.fillStyle = 'rgba(255,215,0,0.15)';
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        this._roundRect(ctx, 330, 370, 260, 60, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('START', 460, 402);

        // Dual currency display on menu
        ctx.font = '15px Arial';
        ctx.textAlign = 'center';

        // Fuel Coins (orange)
        ctx.fillStyle = '#FF6B35';
        ctx.fillText(`Fuel Coins: ${this.fuelCoins} 🪙`, 460, 465);

        // Gear Coins (blue)
        ctx.fillStyle = '#4A90D9';
        ctx.fillText(`Gear Coins: ${this.gearCoins} ⚙️`, 460, 488);

        this._renderFuelBar(ctx, 350, 502, 220, 18);

        // "GO TO SHOP" button on menu
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1.5;
        this._roundRect(ctx, 370, 510, 180, 36, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 15px Arial';
        ctx.fillText('GO TO SHOP', 460, 532);

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '13px Arial';
        ctx.fillText('Arrow keys / WASD | Space = nitro', 460, 570);
    }

    // 排行榜渲染（MENU 界面右侧）
    _renderLeaderboard(ctx) {
        const lx = 600, ly = 185, lw = 280, lh = 240;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        this._roundRect(ctx, lx, ly, lw, lh, 10);
        ctx.fill();

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FASTEST LAPS', lx + lw / 2, ly + 24);

        const top = this.getLeaderboard(5);
        if (top.length === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.font = '13px Arial';
            ctx.fillText('No records yet', lx + lw / 2, ly + 60);
            return;
        }

        top.forEach((entry, i) => {
            const ry = ly + 50 + i * 34;
            ctx.fillStyle = i === 0 ? '#FFD700' : 'rgba(255,255,255,0.8)';
            ctx.font = i === 0 ? 'bold 14px Arial' : '13px Arial';
            ctx.textAlign = 'left';
            const lapStr = `${entry.lapCount}-lap`;
            ctx.fillText(`${i + 1}. ${this._formatTime(entry.time)}  (${lapStr})`, lx + 14, ry);
        });
    }

    _renderFuelBar(ctx, x, y, w, h) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x, y, w, h);
        const ratio = this.fuel / this.maxFuel;
        const color = ratio > 0.5 ? '#4CAF50' : ratio > 0.25 ? '#FF9800' : '#F44336';
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w * ratio, h);
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#FFF';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Fuel: ${Math.round(this.fuel)} / ${this.maxFuel}`, x + w / 2, y + h - 5);
    }

    _renderQuizOverlay(ctx, scale) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, 920, 620);

        if (this.quiz.currentQuiz.length > 0) {
            const current = Math.min(this.quiz.currentIndex, this.quiz.currentQuiz.length - 1);
            const total = this.quiz.currentQuiz.length;
            const correct = this.quiz.correctCount;

            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            this._roundRect(ctx, 260, 30, 400, 8, 4);
            ctx.fill();
            ctx.fillStyle = '#4CAF50';
            this._roundRect(ctx, 260, 30, 400 * (current + 1) / total, 8, 4);
            ctx.fill();

            ctx.fillStyle = '#FFF';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${current + 1} / ${total}  |  Correct: ${correct}`, 460, 65);
        }
    }

    _renderCountdown(ctx, scale) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, 920, 620);

        ctx.fillStyle = this.countdownText === 'GO!' ? '#4CAF50' : '#FFD700';
        ctx.font = `bold ${this.countdownText === 'GO!' ? 80 : 100}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.countdownText, 460, 310);
    }

    _renderHUD(ctx, scale) {
        const padding = 12;

        // Speed gauge (bottom-left)
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        this._roundRect(ctx, padding, 520, 140, 80, 10);
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.car.getDisplaySpeed(), 82, 555);

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '12px Arial';
        ctx.fillText('km/h', 82, 585);

        // Lap counter (top-left)
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        this._roundRect(ctx, padding, padding, 130, 50, 10);
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('LAP', padding + 15, padding + 22);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 22px Arial';
        ctx.fillText(`${Math.min(this.car.lap + 1, this.totalLaps)} / ${this.totalLaps}`, padding + 15, padding + 44);

        // Timer (top-center)
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        this._roundRect(ctx, 375, padding, 170, 50, 10);
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('TIME', 460, padding + 22);
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 22px Arial';
        ctx.fillText(this._formatTime(this.raceTime), 460, padding + 44);

        // Best lap (below timer)
        if (this.car.bestLapTime < Infinity) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            this._roundRect(ctx, 395, padding + 55, 130, 28, 8);
            ctx.fill();
            ctx.fillStyle = '#4CAF50';
            ctx.font = '13px Arial';
            ctx.fillText('Best: ' + this._formatTime(this.car.bestLapTime), 460, padding + 74);
        }

        // Fuel bar (top-right, below score)
        this._renderFuelBar(ctx, 770, padding + 65, 138, 20);

        // Score (top-right)
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        this._roundRect(ctx, 770, padding, 138, 50, 10);
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('SCORE', 896, padding + 22);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 22px Arial';
        ctx.fillText(String(this.raceScore), 896, padding + 44);

        // Nitro indicator (bottom-right)
        this._renderNitroHUD(ctx, scale, padding);

        // Dual currency display (top-right, below score)
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        this._roundRect(ctx, 770, 110, 138, 50, 8);
        ctx.fill();

        ctx.font = '12px Arial';
        ctx.textAlign = 'right';

        // Fuel Coins (orange)
        ctx.fillStyle = '#FF6B35';
        ctx.fillText(`Fuel: ${this.fuelCoins} 🪙`, 896, 128);

        // Gear Coins (blue)
        ctx.fillStyle = '#4A90D9';
        ctx.fillText(`Gear: ${this.gearCoins} ⚙️`, 896, 146);

        // EXIT 按钮（右上角）
        this._exitBtnRect = { x: 770, y: 420, w: 138, h: 32 };
        ctx.fillStyle = 'rgba(220,53,69,0.7)';
        ctx.strokeStyle = '#DC3545';
        ctx.lineWidth = 1.5;
        this._roundRect(ctx, this._exitBtnRect.x, this._exitBtnRect.y, this._exitBtnRect.w, this._exitBtnRect.h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('EXIT RACE', this._exitBtnRect.x + this._exitBtnRect.w / 2, this._exitBtnRect.y + 20);
    }

    _renderNitroHUD(ctx, scale, padding) {
        const nitro = this.car.getNitroStatus();
        const x = 770;
        const y = 520;
        const w = 138;
        const h = 80;

        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        this._roundRect(ctx, x, y, w, h, 10);
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('NITRO', x + w - 12, y + 22);

        for (let i = 0; i < Math.min(nitro.charges, 5); i++) {
            ctx.fillStyle = '#FF6D00';
            ctx.beginPath();
            ctx.arc(x + w - 20 - i * 22, y + 50, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        if (nitro.active) {
            ctx.fillStyle = 'rgba(255,109,0,0.3)';
            this._roundRect(ctx, x + 12, y + 38, w - 100, 12, 6);
            ctx.fill();
            ctx.fillStyle = '#FF6D00';
            this._roundRect(ctx, x + 12, y + 38, (w - 100) * nitro.progress, 12, 6);
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SPACE', x + w / 2, y + h - 5);
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
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, 920, 620);

        const bw = 460, bh = 440;
        const bx = (920 - bw) / 2, by = (620 - bh) / 2;

        ctx.fillStyle = '#FFF';
        this._roundRect(ctx, bx, by, bw, bh, 16);
        ctx.fill();

        ctx.fillStyle = '#1B5E20';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('RACE COMPLETE!', 460, by + 45);

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 22px Arial';
        ctx.fillText('1st Place!', 460, by + 85);

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
            ctx.fillStyle = '#666';
            ctx.font = '15px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(stat.label, bx + 40, sy);
            ctx.fillStyle = '#333';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(stat.value, bx + bw - 40, sy);
        });

        // Wrong words review
        if (this.quizResults && this.quizResults.wrong.length > 0) {
            ctx.fillStyle = '#FF9800';
            ctx.font = '13px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Review: ' + this.quizResults.wrong.map(w => w.word + '(' + w.meaning + ')').join(', '), 460, by + bh - 70);
        }

        // Continue button
        ctx.fillStyle = 'rgba(76,175,80,0.15)';
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        this._roundRect(ctx, bx + 80, by + bh - 55, bw - 160, 42, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        const btnText = this.fuel <= 0 ? 'NEED FUEL! QUIZ NOW!' : 'CONTINUE';
        ctx.fillText(btnText, 460, by + bh - 28);
    }

    // ==================== SHOP Panel ====================
    // 商品定义（纯数据，点击逻辑在 handleShopClick 中）
    _shopItems = [
        { id: 'fuel20', label: 'Fuel +20', cost: 15, desc: 'Refuel 20 units', currency: 'fuel' },
        { id: 'fuel50', label: 'Fuel +50', cost: 30, desc: 'Refuel 50 units', currency: 'fuel' },
        { id: 'nitro1', label: 'Nitro x1', cost: 20, desc: '1 Nitro boost', currency: 'gear' },
        { id: 'nitro3', label: 'Nitro x3', cost: 50, desc: '3 Nitro boosts', currency: 'gear' },
        { id: 'engine1', label: 'Engine Lv.2', cost: 100, desc: 'Upgrade engine (speed +10%)', currency: 'gear', upgrade: 'engine' },
        { id: 'tire1', label: 'Tire Lv.2', cost: 80, desc: 'Upgrade tire (grip +10%)', currency: 'gear', upgrade: 'tire' },
        { id: 'body1', label: 'Body Lv.2', cost: 120, desc: 'Upgrade body (weight -5%)', currency: 'gear', upgrade: 'body' }
    ]

    _renderShop(ctx, scale) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, 920, 620);

        const bx = 160, by = 80, bw = 600, bh = 480;
        ctx.fillStyle = '#FFF';
        this._roundRect(ctx, bx, by, bw, bh, 16);
        ctx.fill();

        ctx.fillStyle = '#1B5E20';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PIT SHOP', bx + bw / 2, by + 40);

        // 资源显示（双货币）
        ctx.fillStyle = '#333';
        ctx.font = '16px Arial';
        ctx.fillText(`Fuel Coins: ${this.fuelCoins} 🪙  |  Gear Coins: ${this.gearCoins} ⚙️  |  Fuel: ${Math.round(this.fuel)}/${this.maxFuel}  |  Nitro: ${this.car.nitroCharges}`, bx + bw / 2, by + 70);

        // --- 商品列表 + 记录按钮位置供点击检测 ---
        this._shopButtons = [];

        this._shopItems.forEach((item, i) => {
            const iy = by + 110 + i * 80;
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            this._roundRect(ctx, bx + 30, iy, bw - 60, 65, 10);
            ctx.fill();

            ctx.fillStyle = '#333';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(item.label, bx + 50, iy + 26);

            ctx.fillStyle = '#666';
            ctx.font = '13px Arial';
            ctx.fillText(item.desc, bx + 50, iy + 48);

            // Buy 按钮位置（供点击检测）
            const btnX = bx + bw - 160, btnY = iy + 12, btnW = 110, btnH = 40;
            this._shopButtons.push({ id: item.id, x: btnX, y: btnY, w: btnW, h: btnH });

            // Check if can buy based on currency and upgrade level
            let canBuy = false;
            if (item.currency === 'fuel') {
                canBuy = this.fuelCoins >= item.cost && this.fuel < this.maxFuel;
            } else if (item.currency === 'gear') {
                if (item.upgrade) {
                    // Upgrade item - check if already at max level (4)
                    canBuy = this.gearCoins >= item.cost && this.upgrades[item.upgrade] < 4;
                } else {
                    // Nitro items
                    canBuy = this.gearCoins >= item.cost;
                }
            }
            ctx.fillStyle = canBuy ? 'rgba(76,175,80,0.15)' : 'rgba(0,0,0,0.05)';
            ctx.strokeStyle = canBuy ? '#4CAF50' : '#AAA';
            ctx.lineWidth = 1.5;
            this._roundRect(ctx, btnX, btnY, btnW, btnH, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = canBuy ? '#4CAF50' : '#AAA';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            const currencyIcon = item.currency === 'fuel' ? '🪙' : '⚙️';
            ctx.fillText(`Buy ${item.cost}${currencyIcon}`, btnX + btnW / 2, btnY + 25);
        });

        // "BACK TO QUIZ" 按钮
        const backX = bx + 140, backY = by + bh - 60, backW = 160, backH = 40;
        this._shopButtons.push({ id: 'back_quiz', x: backX, y: backY, w: backW, h: backH });
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1.5;
        this._roundRect(ctx, backX, backY, backW, backH, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1B5E20';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BACK TO QUIZ', backX + backW / 2, backY + 25);

        // "START RACE" 按钮
        const raceX = bx + 320, raceY = by + bh - 60, raceW = 160, raceH = 40;
        this._shopButtons.push({ id: 'start_race', x: raceX, y: raceY, w: raceW, h: raceH });
        ctx.fillStyle = this.fuel > 0 ? 'rgba(255,215,0,0.15)' : 'rgba(0,0,0,0.05)';
        ctx.strokeStyle = this.fuel > 0 ? '#FFD700' : '#AAA';
        ctx.lineWidth = 1.5;
        this._roundRect(ctx, raceX, raceY, raceW, raceH, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = this.fuel > 0 ? '#FFD700' : '#AAA';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('START RACE', raceX + raceW / 2, raceY + 25);
    }

    /**
     * 处理 SHOP 面板上的点击事件
     * @returns {string} 新状态（可能不变）
     */
    handleShopClick(cx, cy) {
        if (!this._shopButtons) return this.state;
        for (const btn of this._shopButtons) {
            if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
                return this._executeShopAction(btn.id);
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
                        this.countdownTimer = 240;
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
                canAfford = this.upgrades[item.upgrade] < 4;
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
            this.upgrades[item.upgrade] = Math.min(4, this.upgrades[item.upgrade] + 1);
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
        return this.quiz.generateQuiz(5, 3);
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

        // Nitro charges: 1 per correct answer
        const nitroCharges = this.quizResults.correctCount;
        this.car.addNitro(nitroCharges);
        this.nitroCharges += nitroCharges;

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
