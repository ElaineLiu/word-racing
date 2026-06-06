/**
 * 断点续答提示触发时机测试
 *
 * 目标行为（方案 B）：刷新首页不弹窗；进入 Quiz 页时才提示是否继续未完成答题。
 * 使用真实 LearningController，避免 ISSUE_LOG #005/#007 的 mock 集成遗漏。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { EventBus } from '../core/event-bus.js';
import { LearningController } from '../learning/learning-controller.js';
import { QuizView } from '../views/quiz-view.js';
import { ViewManager } from '../views/view-manager.js';

const createWordSet = (count = 30) => Array.from({ length: count }, (_, i) => ({
  id: i + 1,
  word: `word${i + 1}`,
  meaning_cn: `词${i + 1}`,
  meaning_en: `meaning ${i + 1}`,
  phonetic: `/word${i + 1}/`,
  sentence: `This is word${i + 1}.`,
  level: 2,
  category: 'test',
}));

class MockGame {
  constructor() {
    this.quiz = {};
  }
}

function setupDom() {
  const html = `
    <div id="learning-panel-container"></div>
    <div id="page-quiz">
      <div id="quiz-question-area"></div>
      <div id="quiz-complete"></div>
      <div id="quiz-progress"></div>
      <div id="quiz-word"></div>
      <div id="quiz-meaning-en"></div>
      <div id="quiz-sentence"></div>
      <div id="quiz-options"></div>
      <button id="quiz-type-simple" class="quiz-type-btn active"></button>
      <button id="quiz-type-complex" class="quiz-type-btn"></button>
      <button id="quiz-dont-know-btn"></button>
      <button id="quiz-prev-btn"></button>
      <button id="quiz-next-btn"></button>
      <button id="quiz-restart-btn"></button>
      <button id="quiz-start-btn"></button>
      <button id="quiz-shop-btn"></button>
      <div id="quiz-learn-panel"></div>
      <div id="quiz-lap-select"></div>
      <div id="quiz-result-accuracy"></div>
      <div id="quiz-result-fuel"></div>
      <div id="quiz-result-gear"></div>
      <div id="quiz-result-wrong"></div>
      <div id="quiz-result-nitro"></div>
    </div>
  `;
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
  global.document = dom.window.document;
  global.window = dom.window;
}

function setupAppDom() {
  const html = `
    <nav id="top-nav">
      <button class="nav-btn active" data-page="home">Home</button>
      <button class="nav-btn" data-page="quiz">Quiz</button>
      <button class="nav-btn" data-page="shop">Shop</button>
      <button class="nav-btn" data-page="race">Race</button>
      <button class="nav-btn" data-page="report">Report</button>
    </nav>
    <div id="page-home" class="page active">
      <div id="learning-panel-container"></div>
      <span id="home-coins"></span>
      <span id="home-fuel"></span>
      <span id="home-nitro"></span>
      <span id="home-fuel-coins"></span>
      <span id="home-gear-coins"></span>
      <div id="home-leaderboard"></div>
      <div id="home-lap-select"></div>
      <button id="home-start-btn"></button>
      <button id="home-settings-btn"></button>
      <div id="settings-dropdown" style="display:none;"></div>
      <button id="reset-daily-btn"></button>
    </div>
    <div id="page-quiz" class="page">
      <div id="quiz-question-area"></div>
      <div id="quiz-complete"></div>
      <div id="quiz-progress"></div>
      <div id="quiz-word"></div>
      <div id="quiz-meaning-en"></div>
      <div id="quiz-sentence"></div>
      <div id="quiz-options"></div>
      <button id="quiz-type-simple" class="quiz-type-btn active"></button>
      <button id="quiz-type-complex" class="quiz-type-btn"></button>
      <button id="quiz-dont-know-btn"></button>
      <button id="quiz-prev-btn"></button>
      <button id="quiz-next-btn"></button>
      <button id="quiz-restart-btn"></button>
      <button id="quiz-start-btn"></button>
      <button id="quiz-shop-btn"></button>
      <button id="quiz-learn-continue-btn"></button>
      <div id="quiz-learn-panel"></div>
      <div id="quiz-layout"></div>
      <div id="quiz-lap-select"></div>
      <div id="quiz-result-accuracy"></div>
      <div id="quiz-result-fuel"></div>
      <div id="quiz-result-gear"></div>
      <div id="quiz-result-combo"></div>
      <div id="quiz-result-wrong"></div>
      <div id="quiz-result-nitro"></div>
      <div id="quiz-nitro-hint"></div>
    </div>
    <div id="page-shop" class="page">
      <span id="shop-fuel-coins"></span>
      <span id="shop-gear-coins"></span>
      <span id="shop-fuel"></span>
      <span id="shop-nitro"></span>
      <button id="shop-back-btn"></button>
      <button id="shop-race-btn"></button>
      <button id="shop-tab-items"></button>
      <button id="shop-tab-tracks"></button>
      <div id="shop-items"></div>
      <div id="shop-tracks"></div>
    </div>
    <div id="page-race" class="page">
      <button id="race-exit-btn"></button>
    </div>
    <div id="page-report" class="page">
      <div id="report-summary"></div>
      <div id="report-mode-stats"></div>
      <div id="report-wrong-words"></div>
      <div id="report-word-details"></div>
    </div>
  `;
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
  global.document = dom.window.document;
  global.window = dom.window;
}

function createViewManagerGame(words = []) {
  return {
    quiz: { words, quizMode: 'basic', maxLevel: 3 },
    coins: 0,
    fuel: 50,
    nitroCharges: 0,
    fuelCoins: 0,
    gearCoins: 0,
    selectedLaps: 1,
    state: 'MENU',
    getLeaderboard: () => [],
    setLapCount(laps) { this.selectedLaps = laps; },
    startNewQuiz() { return []; },
    continueToRace() {},
    onQuizComplete() {},
    getAvailableTracks: () => [],
  };
}

function createUnfinishedSession(wordSet) {
  const seed = new LearningController();
  seed.init(wordSet, { skipUI: true });
  const questions = seed.startNewQuiz();
  const question = seed.getCurrentQuestion();
  seed.submitAnswer(question.correctIndex);
  return { questions, nextQuestion: questions[1] };
}

function createCompletedSession(wordSet) {
  const seed = new LearningController();
  seed.init(wordSet, { skipUI: true });
  seed.startNewQuiz();
  while (!seed.isQuizComplete()) {
    const question = seed.getCurrentQuestion();
    seed.submitAnswer(question.correctIndex);
  }
  seed.completeQuiz();
}

describe('断点续答提示触发时机', () => {
  let wordSet;

  beforeEach(() => {
    localStorage.clear();
    setupDom();
    wordSet = createWordSet();
  });

  it('LearningController.init() 不应在首页刷新时自动弹出续答提示', () => {
    createUnfinishedSession(wordSet);

    const controller = new LearningController();
    controller.init(wordSet);

    expect(document.querySelector('.resume-overlay')).toBeNull();
    expect(controller.hasUnfinishedSession()).toBe(true);
  });

  it('进入 QuizView 时才应弹出续答提示', () => {
    createUnfinishedSession(wordSet);

    const controller = new LearningController();
    controller.init(wordSet);
    const view = new QuizView(new EventBus(), new MockGame(), controller);

    view.mount();

    expect(document.querySelector('.resume-overlay')).not.toBeNull();
  });

  it('完整完成套题后刷新进入 QuizView 不应弹出续答提示', () => {
    createCompletedSession(wordSet);

    const controller = new LearningController();
    controller.init(wordSet);
    const view = new QuizView(new EventBus(), new MockGame(), controller);

    view.mount();

    expect(document.querySelector('.resume-overlay')).toBeNull();
  });

  it('真实导航链路刷新后 Continue Quiz 应停在下一道未答题', () => {
    setupAppDom();
    const eventBus = new EventBus();
    const controller = new LearningController();
    controller.init(wordSet);
    const game = createViewManagerGame(wordSet);
    const viewManager = new ViewManager(eventBus, game, controller);
    viewManager.switchTo('home');

    document.querySelector('#home-start-btn').click();
    document.querySelector('.quiz-option').click();
    const expectedQuestion = controller.getCurrentQuestion();

    setupAppDom();
    const reloadedEventBus = new EventBus();
    const reloadedController = new LearningController();
    reloadedController.init(wordSet);
    const reloadedGame = createViewManagerGame(wordSet);
    const reloadedViewManager = new ViewManager(reloadedEventBus, reloadedGame, reloadedController);
    reloadedViewManager.switchTo('home');

    reloadedViewManager.switchTo('quiz');
    expect(document.querySelector('.resume-overlay')).not.toBeNull();

    document.querySelector('.resume-btn.continue').click();

    expect(reloadedViewManager.getCurrentPage()).toBe('quiz');
    expect(reloadedController.getCurrentQuestionIndex()).toBe(1);
    expect(reloadedController.getCurrentQuestion().wordId).toBe(expectedQuestion.wordId);
    expect(document.querySelector('#quiz-progress').textContent).toContain('Q2/10');
  });
});
