/**
 * DebugPanel - Development debugging overlay
 * Shows FPS, state inspector, physics overlay, and more
 *
 * Usage:
 *   import { DebugPanel } from './debug/debug-panel.js';
 *   DebugPanel.init(game);
 *   DebugPanel.toggle(); // or press F3
 */

export class DebugPanel {
  static #game = null;
  static #panel = null;
  static #visible = false;
  static #fpsHistory = [];
  static #lastFrameTime = 0;
  static #frameCount = 0;
  static #physicsOverlay = false;
  static #updateInterval = null;

  /**
   * Initialize debug panel
   * @param {Game} game - Game instance
   */
  static init(game) {
    this.#game = game;

    // Create panel element
    this.#createPanel();

    // Keyboard toggle
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === 'F4') {
        e.preventDefault();
        this.togglePhysicsOverlay();
      }
    });

    // Start FPS tracking
    this.#startFPSTracking();
  }

  /**
   * Toggle panel visibility
   */
  static toggle() {
    this.#visible = !this.#visible;
    if (this.#panel) {
      this.#panel.style.display = this.#visible ? 'block' : 'none';
    }

    if (this.#visible) {
      this.#startUpdateLoop();
    } else {
      this.#stopUpdateLoop();
    }
  }

  /**
   * Show the panel
   */
  static show() {
    if (!this.#visible) this.toggle();
  }

  /**
   * Hide the panel
   */
  static hide() {
    if (this.#visible) this.toggle();
  }

  /**
   * Toggle physics overlay (collision boxes, velocity vectors)
   */
  static togglePhysicsOverlay() {
    this.#physicsOverlay = !this.#physicsOverlay;
    console.log(`[Debug] Physics overlay: ${this.#physicsOverlay ? 'ON' : 'OFF'}`);
  }

  /**
   * Check if physics overlay is enabled
   */
  static isPhysicsOverlayEnabled() {
    return this.#physicsOverlay;
  }

  /**
   * Render physics overlay on canvas
   * Call this from game's render method
   */
  static renderPhysicsOverlay(ctx, car, track, scale) {
    if (!this.#physicsOverlay || !ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Car bounding box
    const carW = car.width * scale;
    const carH = car.height * scale;
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      ctx.canvas.width / 2 - carW / 2,
      ctx.canvas.height / 2 - carH / 2,
      carW,
      carH
    );

    // Velocity vector
    const vx = Math.cos(car.angle) * car.speed * scale * 5;
    const vy = Math.sin(car.angle) * car.speed * scale * 5;
    ctx.strokeStyle = '#0f0';
    ctx.beginPath();
    ctx.moveTo(ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.lineTo(ctx.canvas.width / 2 + vx, ctx.canvas.height / 2 + vy);
    ctx.stroke();

    // Track center line
    if (track && track.points) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      track.points.forEach((p, i) => {
        const px = (p.x - car.x) * scale + ctx.canvas.width / 2;
        const py = (p.y - car.y) * scale + ctx.canvas.height / 2;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Get current FPS
   */
  static getFPS() {
    if (this.#fpsHistory.length === 0) return 0;
    return Math.round(this.#fpsHistory.reduce((a, b) => a + b, 0) / this.#fpsHistory.length);
  }

  /**
   * Log a debug message
   */
  static log(message) {
    if (this.#visible) {
      console.log(`[Debug] ${message}`);
    }
  }

  // ==================== Private Methods ====================

  static #createPanel() {
    this.#panel = document.createElement('div');
    this.#panel.id = 'debug-panel';
    this.#panel.style.cssText = `
      position: fixed;
      top: 60px;
      right: 10px;
      width: 280px;
      max-height: 80vh;
      background: rgba(0, 0, 0, 0.9);
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      padding: 10px;
      border-radius: 6px;
      z-index: 99997;
      overflow-y: auto;
      display: none;
      box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    `;

    document.body.appendChild(this.#panel);
  }

  static #startFPSTracking() {
    const trackFrame = (timestamp) => {
      if (this.#lastFrameTime > 0) {
        const delta = timestamp - this.#lastFrameTime;
        const fps = 1000 / delta;
        this.#fpsHistory.push(fps);
        if (this.#fpsHistory.length > 60) {
          this.#fpsHistory.shift();
        }
      }
      this.#lastFrameTime = timestamp;
      requestAnimationFrame(trackFrame);
    };
    requestAnimationFrame(trackFrame);
  }

  static #startUpdateLoop() {
    this.#updateInterval = setInterval(() => this.#update(), 100);
  }

  static #stopUpdateLoop() {
    if (this.#updateInterval) {
      clearInterval(this.#updateInterval);
      this.#updateInterval = null;
    }
  }

  static #update() {
    if (!this.#panel || !this.#game) return;

    const game = this.#game;
    const car = game.car;

    const sections = [
      this.#renderFPS(),
      this.#renderState(game),
      this.#renderCar(car),
      this.#renderResources(game),
      this.#renderControls(),
    ];

    this.#panel.innerHTML = sections.join('<hr style="border-color:#333;margin:8px 0">');
  }

  static #renderFPS() {
    const fps = this.getFPS();
    const color = fps >= 55 ? '#0f0' : fps >= 30 ? '#ff0' : '#f00';
    return `<div><span style="color:${color}">FPS: ${fps}</span></div>`;
  }

  static #renderState(game) {
    return `
      <div>
        <strong>State:</strong> ${game.state || 'N/A'}<br>
        <strong>Page:</strong> ${document.querySelector('.page.active')?.id || 'N/A'}
      </div>
    `;
  }

  static #renderCar(car) {
    if (!car) return '<div>Car: N/A</div>';
    return `
      <div>
        <strong>Car</strong><br>
        x: ${car.x?.toFixed(1) || 0}, y: ${car.y?.toFixed(1) || 0}<br>
        angle: ${((car.angle || 0) * 180 / Math.PI).toFixed(1)}°<br>
        speed: ${car.speed?.toFixed(2) || 0}<br>
        lap: ${car.lap || 0} / ${game?.totalLaps || 0}<br>
        bestLap: ${car.bestLapTime < Infinity ? this.#formatTime(car.bestLapTime) : '--'}
      </div>
    `;
  }

  static #renderResources(game) {
    return `
      <div>
        <strong>Resources</strong><br>
        Fuel: ${Math.round(game.fuel || 0)}/${game.maxFuel || 100}<br>
        FuelCoins: ${game.fuelCoins || 0}<br>
        GearCoins: ${game.gearCoins || 0}<br>
        Nitro: ${game.nitroCharges || 0}<br>
        Upgrades: E${game.upgrades?.engine || 1} T${game.upgrades?.tire || 1} B${game.upgrades?.body || 1}
      </div>
    `;
  }

  static #renderControls() {
    return `
      <div>
        <strong>Controls</strong><br>
        F3: Toggle panel<br>
        F4: Physics overlay [${this.#physicsOverlay ? 'ON' : 'OFF'}]<br>
        <button onclick="window.game.fuel=100;window.game.fuelCoins=1000;window.game.gearCoins=1000" style="margin-top:4px;padding:2px 6px;font-size:10px">
          +Resources
        </button>
      </div>
    `;
  }

  static #formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${min}:${sec.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  }
}

// Auto-initialize if game is global
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    if (window.game) {
      // Delay to ensure game is fully initialized
      setTimeout(() => DebugPanel.init(window.game), 1000);
    }
  });
}
