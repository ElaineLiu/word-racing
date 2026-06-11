/**
 * RenderSystem - Handles all canvas rendering
 * Extracted from Game class for separation of concerns
 */

import { DISPLAY } from '../config/game-config.js';

export class RenderSystem {
  #canvas;
  #ctx;
  #scale = 1;

  // References to game objects (set externally)
  #track = null;
  #car = null;

  // Rendering state
  #floatingTexts = [];
  #exitBtnRect = null;
  #resultsButtons = null;

  constructor(canvas) {
    this.#canvas = canvas;
    this.#ctx = canvas.getContext('2d');
  }

  // ==================== Configuration ====================

  setTrack(track) {
    this.#track = track;
  }

  setCar(car) {
    this.#car = car;
  }

  setScale(scale) {
    this.#scale = scale;
  }

  getScale() {
    return this.#scale;
  }

  getCanvas() {
    return this.#canvas;
  }

  getContext() {
    return this.#ctx;
  }

  // ==================== Floating Text ====================

  showFloatingText(text, x, y, color) {
    this.#floatingTexts.push({ text, x, y, color, life: 90, maxLife: 90 });
  }

  clearFloatingTexts() {
    this.#floatingTexts = [];
  }

  // ==================== Main Render Dispatch ====================

  render(state, gameState) {
    const ctx = this.#ctx;
    const W = this.#canvas.width;
    const H = this.#canvas.height;
    const scale = this.#scale;

    // Check if canvas page is active
    const racePage = document.getElementById('page-race');
    if (!racePage || !racePage.classList.contains('active')) {
      ctx.clearRect(0, 0, W, H);
      return;
    }

    // 3D 模式：清除 canvas 以确保 HUD 可见
    if (this.#track?.type === '3d') {
      ctx.clearRect(0, 0, W, H);
    } else {
      ctx.clearRect(0, 0, W, H);
    }

    ctx.save();
    ctx.scale(scale, scale);

    switch (state) {
      case 'COUNTDOWN':
        this.#renderTrackAndCars(scale);
        this.#renderCountdown(gameState.countdownText, scale);
        break;
      case 'RACING':
        this.#renderTrackAndCars(scale);
        this.#renderHUD(gameState, scale);
        this.#renderFloatingTexts(scale);
        break;
      case 'RESULTS':
        this.#renderTrackAndCars(scale);
        this.#renderResults(gameState, scale);
        break;
    }

    ctx.restore();
  }

  // ==================== Track & Car Rendering ====================

  #renderTrackAndCars(scale) {
    if (!this.#track || !this.#car) return;
    if (this.#track.type === '3d') return;

    const W = this.#canvas.width;
    const H = this.#canvas.height;
    const ctx = this.#ctx;

    const tx = W / (2 * scale) - this.#car.x;
    const ty = H / (2 * scale) - this.#car.y;
    ctx.save();
    ctx.translate(tx, ty);

    this.#track.render(ctx, scale);
    this.#car.render(ctx, scale);

    ctx.restore();

    this.#renderMiniMap(scale);
  }

  #renderMiniMap(scale) {
    if (!this.#track || !this.#car) return;

    const ctx = this.#ctx;
    const W = this.#canvas.width;
    const H = this.#canvas.height;
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
    const pts = this.#track.points;
    for (let i = 0; i < pts.length; i += 8) {
      const p = pts[i];
      const sx = mx + (p.x / DISPLAY.CANVAS_WIDTH) * mW;
      const sy = my + (p.y / DISPLAY.CANVAS_HEIGHT) * mH;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.stroke();

    if (pts.length > 0) {
      ctx.fillStyle = '#FFD700';
      const sx = mx + (pts[0].x / DISPLAY.CANVAS_WIDTH) * mW;
      const sy = my + (pts[0].y / DISPLAY.CANVAS_HEIGHT) * mH;
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const pix = mx + (this.#car.x / DISPLAY.CANVAS_WIDTH) * mW;
    const piy = my + (this.#car.y / DISPLAY.CANVAS_HEIGHT) * mH;
    ctx.fillStyle = '#E53935';
    ctx.fillRect(pix - 2, piy - 2, 4, 4);

    ctx.restore();
  }

  // ==================== Countdown ====================

  #renderCountdown(text, scale) {
    const ctx = this.#ctx;

    // 3D 模式下不绘制背景遮罩，避免遮挡 Three.js 渲染的场景
    if (this.#track?.type !== '3d') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, DISPLAY.CANVAS_WIDTH, DISPLAY.CANVAS_HEIGHT);
    }

    ctx.fillStyle = text === 'GO!' ? '#00C853' : '#FFD700';
    ctx.font = `bold ${text === 'GO!' ? 90 : 110}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, DISPLAY.CANVAS_WIDTH / 2, DISPLAY.CANVAS_HEIGHT / 2);
  }

  // ==================== HUD ====================

  #renderHUD(gameState, scale) {
    const ctx = this.#ctx;
    const padding = 12;
    const W = DISPLAY.CANVAS_WIDTH;
    const H = DISPLAY.CANVAS_HEIGHT;
    const centerX = W / 2;
    const rightX = W - 110 - padding; // right panels (width 110)

    // LAP / RANK panel
    this.#drawPanel(ctx, padding, padding, 110, 48, gameState.trackType === '3d' ? 'RANK' : 'LAP',
      gameState.trackType === '3d'
        ? `${this.#formatOrdinal(gameState.finalRank || 1)} / ${gameState.ranking?.length || 4}`
        : `${Math.min(gameState.lap + 1, gameState.totalLaps)} / ${gameState.totalLaps}`,
      '#FFD700');

    // TIME panel (centered)
    this.#drawPanel(ctx, centerX - 85, padding, 170, 48, 'TIME',
      this.#formatTime(gameState.raceTime), '#FFF');

    // Best lap
    if (gameState.bestLapTime < Infinity) {
      ctx.fillStyle = 'rgba(0,200,83,0.8)';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('BEST  ' + this.#formatTime(gameState.bestLapTime), centerX, padding + 54);
    }

    // SCORE panel (right)
    this.#drawPanel(ctx, rightX, padding, 110, 48, 'SCORE',
      String(gameState.raceScore), '#FFD700');

    // FUEL bar (right, below SCORE)
    this.#renderFuelBar(ctx, rightX, padding + 54, 110, 18, gameState.fuel, gameState.maxFuel);

    // SPEED panel (bottom-left)
    this.#renderSpeedPanel(ctx, padding, H - 88 - padding, 130, 88, gameState.displaySpeed);

    // NITRO panel (bottom-right)
    this.#renderNitroHUD(ctx, scale, padding, gameState.nitroStatus);

    // EXIT RACE button
    this.#exitBtnRect = { x: padding, y: padding + 54, w: 110, h: 28 };
    ctx.fillStyle = 'rgba(225,6,0,0.7)';
    this.#roundRect(ctx, this.#exitBtnRect.x, this.#exitBtnRect.y, this.#exitBtnRect.w, this.#exitBtnRect.h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(225,6,0,0.9)';
    ctx.lineWidth = 1;
    this.#roundRect(ctx, this.#exitBtnRect.x, this.#exitBtnRect.y, this.#exitBtnRect.w, this.#exitBtnRect.h, 6);
    ctx.stroke();
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT RACE', this.#exitBtnRect.x + this.#exitBtnRect.w / 2, this.#exitBtnRect.y + this.#exitBtnRect.h / 2 + 0.5);
  }

  #drawPanel(ctx, x, y, w, h, label, value, valueColor = '#FFF') {
    ctx.fillStyle = 'rgba(13,17,23,0.82)';
    this.#roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    this.#roundRect(ctx, x, y, w, h, 8);
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
  }

  #renderFuelBar(ctx, x, y, w, h, fuel, maxFuel) {
    ctx.fillStyle = 'rgba(13,17,23,0.85)';
    this.#roundRect(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    this.#roundRect(ctx, x, y, w, h, 4);
    ctx.stroke();

    const ratio = Math.max(0, Math.min(1, fuel / maxFuel));
    const color = ratio > 0.5 ? '#00C853' : ratio > 0.25 ? '#FF6D00' : '#E10600';
    if (ratio > 0) {
      ctx.fillStyle = color;
      this.#roundRect(ctx, x + 1, y + 1, (w - 2) * ratio, h - 2, 3);
      ctx.fill();
    }

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`FUEL  ${Math.round(fuel)} / ${maxFuel}`, x + w / 2, y + h / 2 + 0.5);
  }

  #renderSpeedPanel(ctx, x, y, w, h, displaySpeed) {
    ctx.fillStyle = 'rgba(13,17,23,0.82)';
    this.#roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    this.#roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displaySpeed, x + w / 2, y + 36);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px Arial';
    ctx.fillText('km/h', x + w / 2, y + 64);

    const speedRatio = Math.min(displaySpeed / 200, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x + 10, y + h - 10, w - 20, 4);
    const speedBarColor = displaySpeed > 150 ? '#FF6D00' : displaySpeed > 80 ? '#00B0FF' : '#00C853';
    ctx.fillStyle = speedBarColor;
    ctx.fillRect(x + 10, y + h - 10, (w - 20) * speedRatio, 4);
  }

  #renderNitroHUD(ctx, scale, padding, nitroStatus) {
    const W = DISPLAY.CANVAS_WIDTH;
    const H = DISPLAY.CANVAS_HEIGHT;
    const w = 110;
    const h = 88;
    const x = W - w - padding;
    const y = H - h - padding;

    ctx.fillStyle = 'rgba(13,17,23,0.82)';
    this.#roundRect(ctx, x, y, w, h, 10);
    ctx.fill();

    ctx.strokeStyle = nitroStatus.charges > 0 ? 'rgba(255,109,0,0.35)' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    this.#roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('NITRO', x + w - 10, y + 6);

    const maxDots = 5;
    for (let i = 0; i < maxDots; i++) {
      const dotX = x + w - 14 - i * 18;
      const dotY = y + 30;
      if (i < nitroStatus.charges) {
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

    if (nitroStatus.active) {
      ctx.fillStyle = 'rgba(255,109,0,0.15)';
      this.#roundRect(ctx, x + 10, y + 50, w - 20, 10, 5);
      ctx.fill();
      ctx.fillStyle = '#FF6D00';
      this.#roundRect(ctx, x + 10, y + 50, (w - 20) * nitroStatus.progress, 10, 5);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,109,0,0.6)';
      ctx.lineWidth = 1.5;
      this.#roundRect(ctx, x, y, w, h, 10);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('SPACE', x + w / 2, y + h - 16);
  }

  #renderFloatingTexts(scale) {
    const ctx = this.#ctx;
    for (let i = this.#floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.#floatingTexts[i];
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
      if (ft.life <= 0) this.#floatingTexts.splice(i, 1);
    }
  }

  // ==================== Results ====================

  #renderResults(gameState, scale) {
    const ctx = this.#ctx;
    const W = DISPLAY.CANVAS_WIDTH;
    const H = DISPLAY.CANVAS_HEIGHT;
    const centerX = W / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    const bw = 460, bh = 440;
    const bx = (W - bw) / 2, by = (H - bh) / 2;

    ctx.fillStyle = '#161B22';
    this.#roundRect(ctx, bx, by, bw, bh, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    this.#roundRect(ctx, bx, by, bw, bh, 16);
    ctx.stroke();

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RACE COMPLETE!', centerX, by + 45);

    const placementText = gameState.trackType === '3d'
      ? `${this.#formatOrdinal(gameState.finalRank || 1)} Place`
      : '1st Place!';
    ctx.fillStyle = '#00C853';
    ctx.font = 'bold 22px Arial';
    ctx.fillText(placementText, centerX, by + 82);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + 30, by + 100);
    ctx.lineTo(bx + bw - 30, by + 100);
    ctx.stroke();

    const stats = [
      { label: 'Race Time', value: this.#formatTime(gameState.raceTime) },
      { label: 'Best Lap', value: gameState.bestLapTime < Infinity ? this.#formatTime(gameState.bestLapTime) : '--' },
      { label: 'Word Score', value: String(gameState.raceScore) },
      { label: 'Quiz Score', value: String(gameState.quizScore || 0) },
      { label: 'Total Score', value: String(gameState.raceScore + (gameState.quizScore || 0)) },
      { label: 'Fuel Left', value: `${Math.round(gameState.fuel)} / ${gameState.maxFuel}` },
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

    if (gameState.trackType === '3d' && Array.isArray(gameState.ranking)) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '13px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('Ranking', bx + 40, by + 338);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'right';
      const rankingText = gameState.ranking
        .map(entry => `${entry.isPlayer ? 'You' : 'AI'} ${this.#formatOrdinal(entry.rank)}`)
        .join('  ');
      ctx.fillText(rankingText, bx + bw - 40, by + 338);
    }

    if (gameState.wrongWords && gameState.wrongWords.length > 0) {
      ctx.fillStyle = '#FF6D00';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Review: ' + gameState.wrongWords.map(w => w.word + '(' + w.meaning + ')').join(', '), centerX, by + bh - 72);
    }

    const btnText = gameState.fuel <= 0 ? 'NEED FUEL! QUIZ NOW!' : 'CONTINUE';
    const btnColor = gameState.fuel <= 0 ? '#FF6D00' : '#00C853';
    ctx.fillStyle = this.#hexToRgba(btnColor, 0.12);
    ctx.strokeStyle = btnColor;
    ctx.lineWidth = 1.5;
    this.#roundRect(ctx, bx + 80, by + bh - 55, bw - 160, 42, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = btnColor;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btnText, centerX, by + bh - 34);

    this.#resultsButtons = [{
      id: 'continue',
      x: bx + 80,
      y: by + bh - 55,
      w: bw - 160,
      h: 42
    }];
  }

  // ==================== Utility Methods ====================

  getExitBtnRect() {
    return this.#exitBtnRect;
  }

  getResultsButtons() {
    return this.#resultsButtons;
  }

  #roundRect(ctx, x, y, w, h, r) {
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

  #hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  #formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${min}:${sec.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  }

  #formatOrdinal(n) {
    const value = Number(n) || 1;
    const suffix = value === 1 ? 'st' : value === 2 ? 'nd' : value === 3 ? 'rd' : 'th';
    return `${value}${suffix}`;
  }
}
