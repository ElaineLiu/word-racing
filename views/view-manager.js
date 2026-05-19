/**
 * ViewManager - Manages view lifecycle and switching
 * Coordinates between views and handles navigation
 */

import { Events } from '../core/event-bus.js';
import { GAME } from '../config/game-config.js';
import { HomeView } from './home-view.js';
import { QuizView } from './quiz-view.js';
import { ShopView } from './shop-view.js';
import { RaceView } from './race-view.js';

export class ViewManager {
  #eventBus;
  #game;
  #views = new Map();
  #currentView = null;
  #currentPage = 'home';
  #navBtns = [];

  constructor(eventBus, game) {
    this.#eventBus = eventBus;
    this.#game = game;
    this.#createViews();
    this.#setupNavigation();
    this.#setupEventListeners();
  }

  #createViews() {
    this.#views.set('home', new HomeView(this.#eventBus, this.#game));
    this.#views.set('quiz', new QuizView(this.#eventBus, this.#game));
    this.#views.set('shop', new ShopView(this.#eventBus, this.#game));
    this.#views.set('race', new RaceView(this.#eventBus, this.#game));
  }

  #setupNavigation() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.#initNavigation());
    } else {
      this.#initNavigation();
    }
  }

  #initNavigation() {
    this.#navBtns = document.querySelectorAll('.nav-btn');

    this.#navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        this.switchTo(page);
      });
    });

    // Start on home page
    this.switchTo('home');
  }

  #setupEventListeners() {
    // Listen for view change requests
    this.#eventBus.on(Events.VIEW_CHANGE, ({ view }) => {
      this.switchTo(view);
    });

    // Listen for quiz start
    this.#eventBus.on(Events.QUIZ_START, ({ source }) => {
      this.#game.startNewQuiz();
      this.switchTo('quiz');
      const quizView = this.#views.get('quiz');
      quizView?.showQuestion?.();
    });

    // Listen for race start
    this.#eventBus.on(Events.RACE_START, ({ source }) => {
      this.switchTo('race');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.#game.state === 'RACING') {
        this.#game.exitRace();
        this.switchTo('home');
      }
    });
  }

  switchTo(viewName) {
    // Validate race access
    if (viewName === 'race') {
      if (this.#game.fuel <= 0) {
        alert('Insufficient fuel! Buy fuel in the shop first.');
        viewName = 'home';
      } else if (![GAME.STATES.COUNTDOWN, GAME.STATES.RACING, GAME.STATES.RESULTS].includes(this.#game.state)) {
        this.#game.continueToRace();
      }
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });

    // Show target page
    const targetPage = document.getElementById(`page-${viewName}`);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // Update nav buttons
    this.#navBtns.forEach(btn => {
      const isActive = btn.dataset.page === viewName;
      btn.classList.toggle('active', isActive);
    });

    // Unmount current view
    if (this.#currentView) {
      this.#currentView.unmount();
    }

    // Mount new view
    const newView = this.#views.get(viewName);
    if (newView) {
      newView.mount();
      this.#currentView = newView;
    }

    this.#currentPage = viewName;

    console.log(`[ViewManager] Switched to: ${viewName}`);
  }

  getCurrentView() {
    return this.#currentView;
  }

  getCurrentPage() {
    return this.#currentPage;
  }

  getView(name) {
    return this.#views.get(name);
  }

  // Public method for updating home stats (backward compatibility)
  updateHomeStats() {
    const homeView = this.#views.get('home');
    if (homeView) {
      homeView.updateStats();
    }
  }
}
