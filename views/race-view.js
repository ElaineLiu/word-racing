/**
 * RaceView - Race page with canvas and touch controls
 */

import { BaseView } from './base-view.js';
import { Events } from '../core/event-bus.js';

export class RaceView extends BaseView {
  #game;
  #isTouchDevice = false;
  #touchListeners = [];

  constructor(eventBus, game) {
    super('page-race', eventBus);
    this.#game = game;
  }

  mount() {
    super.mount();
    this.#detectTouchDevice();
    this.#syncCanvasMode();
    this.#setupTouchControls();
    this.#subscribeToEvents();

    // Ensure canvas is properly sized
    requestAnimationFrame(() => {
      this.#game._resizeCanvas?.() || this.#resizeCanvas();
      this.#syncCanvasMode();
      this.#game.resize3D?.();
    });
  }

  unmount() {
    this.#cleanupTouchControls();
    super.unmount();
  }

  render() {
    // Canvas rendering is handled by Game/RenderSystem
  }

  #detectTouchDevice() {
    this.#isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  #setupTouchControls() {
    this.#cleanupTouchControls();
    if (!this.#isTouchDevice) return;

    const touchControls = this.$('#touch-controls');
    if (!touchControls) return;

    const buttons = touchControls.querySelectorAll('.touch-btn');
    const inputState = { up: false, down: false, left: false, right: false, nitro: false };

    buttons.forEach(btn => {
      const action = btn.dataset.action;

      const start = (e) => {
        e.preventDefault();
        inputState[action] = true;
        btn.classList.add('pressed');
        this.#game.setTouchInput(inputState);
      };

      const end = (e) => {
        e.preventDefault();
        inputState[action] = false;
        btn.classList.remove('pressed');
        this.#game.setTouchInput(inputState);
      };

      this.#addTouchListener(btn, 'touchstart', start, { passive: false });
      this.#addTouchListener(btn, 'touchend', end, { passive: false });
      this.#addTouchListener(btn, 'touchcancel', end, { passive: false });
      this.#addTouchListener(btn, 'mousedown', start);
      this.#addTouchListener(btn, 'mouseup', end);
      this.#addTouchListener(btn, 'mouseleave', end);
    });

    touchControls.classList.add('active');
  }

  #addTouchListener(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    this.#touchListeners.push({ element, event, handler });
  }

  #cleanupTouchControls() {
    this.#touchListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.#touchListeners = [];
  }

  #syncCanvasMode() {
    const gameCanvas = this.$('#gameCanvas');
    const threeCanvas = this.$('#threeCanvas');
    if (!gameCanvas || !threeCanvas) return;

    const is3D = this.#game.getCurrentTrackType?.() === '3d';
    threeCanvas.hidden = !is3D;
    gameCanvas.classList.toggle('canvas-overlay', is3D);
    if (is3D) {
      threeCanvas.width = gameCanvas.width;
      threeCanvas.height = gameCanvas.height;
    }
  }

  #resizeCanvas() {
    // This is handled by game._resizeCanvas, but we can trigger it
    const canvas = this.$('#gameCanvas');
    if (!canvas) return;

    const container = canvas.parentElement;
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

    canvas.width = canvasW;
    canvas.height = canvasH;
  }

  #subscribeToEvents() {
    this.subscribe(Events.RACE_FINISH, () => {
      // Race finished - could show results
    });

    this.subscribe(Events.RACE_EXIT, () => {
      this.emit(Events.VIEW_CHANGE, { view: 'home' });
    });
  }
}
