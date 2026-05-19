/**
 * RaceView - Race page with canvas and touch controls
 */

import { BaseView } from './base-view.js';
import { Events } from '../core/event-bus.js';

export class RaceView extends BaseView {
  #game;
  #isTouchDevice = false;

  constructor(eventBus, game) {
    super('page-race', eventBus);
    this.#game = game;
  }

  mount() {
    super.mount();
    this.#detectTouchDevice();
    this.#setupTouchControls();
    this.#subscribeToEvents();

    // Ensure canvas is properly sized
    requestAnimationFrame(() => {
      this.#game._resizeCanvas?.() || this.#resizeCanvas();
    });
  }

  render() {
    // Canvas rendering is handled by Game/RenderSystem
  }

  #detectTouchDevice() {
    this.#isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  #setupTouchControls() {
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

      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
      btn.addEventListener('touchcancel', end, { passive: false });
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
      btn.addEventListener('mouseleave', end);
    });

    touchControls.classList.add('active');
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
