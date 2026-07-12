/**
 * Tests for View layer (Phase 3)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { EventBus, Events } from '../core/event-bus.js';
import { BaseView } from '../views/base-view.js';
import { HomeView } from '../views/home-view.js';
import { QuizView } from '../views/quiz-view.js';
import { ShopView } from '../views/shop-view.js';
import { RaceView } from '../views/race-view.js';

// Mock game object
const createMockGame = () => ({
  coins: 100,
  fuel: 50,
  nitroCharges: 2,
  fuelCoins: 200,
  gearCoins: 50,
  selectedLaps: 3,
  state: 'IDLE',
  gameState: {
    getAll: () => ({
      daily: { todayQuizzes: 1 },
      learning: { totalWordsMastered: 25 }
    })
  },
  quiz: {
    getCurrentQuestion: vi.fn(),
    submitAnswer: vi.fn(),
    isComplete: vi.fn(() => false),
    getResults: vi.fn(() => ({
      accuracy: 80,
      correctCount: 4,
      totalQuestions: 5,
      fuelCoinsEarned: 40,
      gearCoinsEarned: 10,
      wrong: [],
      nitroCharges: 1
    })),
    generateQuiz: vi.fn(),
    currentIndex: 0,
    correctCount: 4,
    currentQuiz: [{}, {}, {}, {}, {}],
    quizMode: 'basic'
  },
  getLeaderboard: vi.fn(() => [
    { time: 45000, lapCount: 3 },
    { time: 52000, lapCount: 3 }
  ]),
  setLapCount: vi.fn(),
  getMaxAffordableLaps: vi.fn(() => 5),
  getFuelCostForLaps: vi.fn(() => 20),
  startNewQuiz: vi.fn(),
  continueToRace: vi.fn(),
  onQuizComplete: vi.fn(),
  _shopItems: [
    { id: 'fuel20', label: 'Fuel +20', desc: 'Add 20 fuel', cost: 15, currency: 'fuel', effect: { fuel: 20 } },
    { id: 'nitro1', label: 'Nitro x1', desc: 'Add 1 nitro', cost: 20, currency: 'gear', effect: { nitro: 1 } }
  ],
  _executeShopAction: vi.fn()
});

describe('BaseView', () => {
  let dom;
  let document;
  let eventBus;
  let container;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="test-container"><span id="text-el"></span><button id="btn"></button></div></body></html>');
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    eventBus = new EventBus();
    container = document.getElementById('test-container');
  });

  it('should mount and set container', () => {
    class TestView extends BaseView {
      render() {}
    }
    const view = new TestView('test-container', eventBus);
    view.mount();
    expect(view.isMounted()).toBe(true);
    expect(view.getContainer()).toBe(container);
  });

  it('should unmount and clear subscriptions', () => {
    class TestView extends BaseView {
      render() {}
    }
    const view = new TestView('test-container', eventBus);
    view.mount();
    view.unmount();
    expect(view.isMounted()).toBe(false);
  });

  it('should set text content', () => {
    class TestView extends BaseView {
      render() {}
    }
    const view = new TestView('test-container', eventBus);
    view.mount();
    view.setText('#text-el', 'Hello World');
    expect(document.getElementById('text-el').textContent).toBe('Hello World');
  });

  it('should hide element with display: none', () => {
    class TestView extends BaseView {
      render() {}
    }
    const view = new TestView('test-container', eventBus);
    view.mount();
    view.hide('#text-el');
    expect(document.getElementById('text-el').style.display).toBe('none');
  });

  it('should show element with display: block', () => {
    class TestView extends BaseView {
      render() {}
    }
    const view = new TestView('test-container', eventBus);
    view.mount();
    const el = document.getElementById('text-el');
    el.style.display = 'none';
    view.show('#text-el');
    expect(el.style.display).toBe('block');
  });

  it('should emit events via eventBus', () => {
    class TestView extends BaseView {
      render() {}
    }
    const view = new TestView('test-container', eventBus);
    view.mount();

    const handler = vi.fn();
    eventBus.on(Events.QUIZ_START, handler);
    view.emit(Events.QUIZ_START, { source: 'test' });
    expect(handler).toHaveBeenCalledWith({ source: 'test' });
  });
});

describe('QuizView', () => {
  let dom;
  let document;
  let eventBus;
  let mockGame;

  beforeEach(() => {
    const html = `
      <div id="page-quiz">
        <div id="quiz-question-area" style="display:block;"></div>
        <div id="quiz-complete" style="display:none;">
          <div id="quiz-result-accuracy"></div>
          <div id="quiz-result-fuel"></div>
          <div id="quiz-result-gear"></div>
          <div id="quiz-result-wrong"></div>
          <div id="quiz-result-nitro"></div>
          <div id="quiz-lap-select"></div>
          <button id="quiz-restart-btn"></button>
          <button id="quiz-start-btn"></button>
          <button id="quiz-shop-btn"></button>
        </div>
        <div id="quiz-progress"></div>
        <div id="quiz-word"></div>
        <div id="quiz-meaning-en"></div>
        <div id="quiz-sentence"></div>
        <div id="quiz-options"></div>
      </div>
    `;
    dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    eventBus = new EventBus();
    mockGame = createMockGame();
  });

  it('should hide question area and show complete panel', () => {
    const view = new QuizView(eventBus, mockGame);
    view.mount();

    const questionArea = document.getElementById('quiz-question-area');
    const completePanel = document.getElementById('quiz-complete');

    // Initially question area visible, complete hidden
    expect(questionArea.style.display).toBe('block');
    expect(completePanel.style.display).toBe('none');

    // Call showComplete
    view.showComplete();

    // Now question area hidden, complete visible
    expect(questionArea.style.display).toBe('none');
    expect(completePanel.style.display).toBe('block');
  });

  it('should display quiz results correctly', () => {
    const view = new QuizView(eventBus, mockGame);
    view.mount();
    view.showComplete();

    expect(document.getElementById('quiz-result-accuracy').textContent).toContain('80%');
    expect(document.getElementById('quiz-result-fuel').textContent).toContain('+40');
    expect(document.getElementById('quiz-result-gear').textContent).toContain('+10');
  });

  it('should render lap selector in complete panel', () => {
    const view = new QuizView(eventBus, mockGame);
    view.mount();
    view.showComplete();

    const lapSelect = document.getElementById('quiz-lap-select');
    expect(lapSelect.children.length).toBeGreaterThan(0);
  });

  it('should emit VIEW_CHANGE when shop button clicked', () => {
    const view = new QuizView(eventBus, mockGame);
    view.mount();
    view.showComplete();

    const handler = vi.fn();
    eventBus.on(Events.VIEW_CHANGE, handler);

    document.getElementById('quiz-shop-btn').click();
    expect(handler).toHaveBeenCalledWith({ view: 'shop' });
  });
});

describe('HomeView', () => {
  let dom;
  let document;
  let eventBus;
  let mockGame;

  beforeEach(() => {
    const html = `
      <div id="page-home">
        <span id="home-fuel"></span>
        <span id="home-nitro"></span>
        <span id="home-fuel-coins"></span>
        <span id="home-gear-coins"></span>
        <span id="home-quizzes-today"></span>
        <span id="home-words-mastered"></span>
        <div id="home-leaderboard"></div>
        <div id="home-lap-select"></div>
        <button id="home-start-btn"></button>
      </div>
    `;
    dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    eventBus = new EventBus();
    mockGame = createMockGame();
  });

  it('should display stats correctly', () => {
    const view = new HomeView(eventBus, mockGame);
    view.mount();
    view.updateStats();

    // 比赛资源
    expect(document.getElementById('home-nitro').textContent).toBe('2');

    // 货币资源
    expect(document.getElementById('home-fuel-coins').textContent).toBe('200');
    expect(document.getElementById('home-gear-coins').textContent).toBe('50');

    // 学习进度
    expect(document.getElementById('home-quizzes-today').textContent).toBe('1/20');
    expect(document.getElementById('home-words-mastered').textContent).toBe('25 words');
  });

  it('should emit QUIZ_START when start button clicked', () => {
    const view = new HomeView(eventBus, mockGame);
    view.mount();

    const handler = vi.fn();
    eventBus.on(Events.QUIZ_START, handler);

    document.getElementById('home-start-btn').click();
    expect(handler).toHaveBeenCalled();
  });
});

describe('ShopView', () => {
  let dom;
  let document;
  let eventBus;
  let mockGame;

  beforeEach(() => {
    const html = `
      <div id="page-shop">
        <span id="shop-fuel-coins"></span>
        <span id="shop-gear-coins"></span>
        <span id="shop-fuel"></span>
        <span id="shop-nitro"></span>
        <div id="shop-items"></div>
        <button id="shop-back-btn"></button>
        <button id="shop-race-btn"></button>
      </div>
    `;
    dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    eventBus = new EventBus();
    mockGame = createMockGame();
  });

  it('should display stats correctly', () => {
    const view = new ShopView(eventBus, mockGame);
    view.mount();
    view.updateStats();

    expect(document.getElementById('shop-fuel-coins').textContent).toBe('200');
    expect(document.getElementById('shop-gear-coins').textContent).toBe('50');
  });

  it('should render shop items', () => {
    const view = new ShopView(eventBus, mockGame);
    view.mount();

    const itemsContainer = document.getElementById('shop-items');
    expect(itemsContainer.children.length).toBe(2);
  });

  it('should emit VIEW_CHANGE when back button clicked', () => {
    const view = new ShopView(eventBus, mockGame);
    view.mount();

    const handler = vi.fn();
    eventBus.on(Events.VIEW_CHANGE, handler);

    document.getElementById('shop-back-btn').click();
    expect(handler).toHaveBeenCalledWith({ view: 'home' });
  });
});

describe('QuizView - Review Questions', () => {
  let dom;
  let document;
  let eventBus;
  let mockGame;

  beforeEach(() => {
    const html = `
      <div id="page-quiz">
        <div id="quiz-question-area" style="display:block;"></div>
        <div id="quiz-complete" style="display:none;"></div>
        <div id="quiz-progress"></div>
        <div id="quiz-word"></div>
        <div id="quiz-meaning-en"></div>
        <div id="quiz-sentence"></div>
        <div id="quiz-options"></div>
      </div>
    `;
    dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;
    eventBus = new EventBus();
    mockGame = createMockGame();
  });

  it('should render review question using original mode (STRATEGY)', () => {
    const view = new QuizView(eventBus, mockGame);
    view.mount();

    // Simulate a review question with STRATEGY as original mode
    const reviewQuestion = {
      mode: 'PIT_BOARD', // This would be LAP_REVIEW in real scenario, but we test with different
      originalMode: 'STRATEGY',
      isReview: true,
      modeLabel: '[Review] 义→词',
      prompt: '方向', // Chinese meaning
      promptSub: '',
      sentence: 'The driver changed the ______ at the corner.',
      options: ['accident', 'deliver', 'however', 'direction'],
      correctIndex: 3,
      correctWord: 'direction'
    };

    mockGame.quiz.getCurrentQuestion = vi.fn(() => reviewQuestion);
    mockGame.quiz.currentIndex = 0;
    mockGame.quiz.currentQuiz = [reviewQuestion];
    mockGame.quiz.correctCount = 0;
    mockGame.quiz.quizMode = 'basic';

    view.showQuestion();

    // Should show Chinese meaning as prompt, NOT the answer word
    const wordEl = document.getElementById('quiz-word');
    expect(wordEl.textContent).toBe('方向');
    expect(wordEl.textContent).not.toContain('direction');
    expect(wordEl.textContent).not.toContain('Review: direction');
  });

  it('should render review question using original mode (PIT_BOARD)', () => {
    const view = new QuizView(eventBus, mockGame);
    view.mount();

    // Simulate a review question with PIT_BOARD as original mode
    const reviewQuestion = {
      mode: 'PIT_BOARD',
      originalMode: 'PIT_BOARD',
      isReview: true,
      modeLabel: '[Review] 词→义',
      prompt: 'direction',
      promptSub: '/dəˈrekʃn/',
      sentence: 'The driver changed the direction at the corner.',
      options: ['事故', '递送', '然而', '方向'],
      correctIndex: 3,
      correctWord: 'direction'
    };

    mockGame.quiz.getCurrentQuestion = vi.fn(() => reviewQuestion);
    mockGame.quiz.currentIndex = 0;
    mockGame.quiz.currentQuiz = [reviewQuestion];
    mockGame.quiz.correctCount = 0;
    mockGame.quiz.quizMode = 'basic';

    view.showQuestion();

    // Should show the word, prompt user to select meaning
    const wordEl = document.getElementById('quiz-word');
    expect(wordEl.textContent).toBe('direction');
  });

  it('should show [Review] label in progress', () => {
    const view = new QuizView(eventBus, mockGame);
    view.mount();

    const reviewQuestion = {
      mode: 'STRATEGY',
      originalMode: 'STRATEGY',
      isReview: true,
      modeLabel: '[Review] 义→词',
      prompt: '方向',
      options: ['accident', 'deliver', 'however', 'direction'],
      correctIndex: 3,
      correctWord: 'direction'
    };

    mockGame.quiz.getCurrentQuestion = vi.fn(() => reviewQuestion);
    mockGame.quiz.currentIndex = 0;
    mockGame.quiz.currentQuiz = [reviewQuestion];
    mockGame.quiz.correctCount = 0;
    mockGame.quiz.quizMode = 'basic';

    view.showQuestion();

    const progressEl = document.getElementById('quiz-progress');
    expect(progressEl.textContent).toContain('[Review]');
  });
});
