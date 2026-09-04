import { beforeEach, describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { EventBus } from '../core/event-bus.js';
import { LearningController } from '../learning/learning-controller.js';
import { ProgressTracker } from '../learning/progress-tracker.js';
import { QuizView } from '../views/quiz-view.js';

const words = Array.from({ length: 30 }, (_, index) => ({
  id: index + 1,
  word: `word${index + 1}`,
  meaning_cn: `词${index + 1}`,
  meaning_en: `meaning ${index + 1}`,
  phonetic: `/word${index + 1}/`,
  sentence: `This is word${index + 1}.`,
  level: 2,
  category: 'test',
}));

function setupDom() {
  const ids = [
    'quiz-question-area', 'quiz-complete', 'quiz-progress', 'quiz-word',
    'quiz-meaning-en', 'quiz-sentence', 'quiz-options', 'quiz-learn-panel',
    'quiz-layout', 'quiz-lap-select', 'quiz-result-accuracy', 'quiz-result-fuel',
    'quiz-result-gear', 'quiz-result-wrong', 'quiz-result-nitro', 'quiz-nitro-hint',
  ];
  const buttons = [
    'quiz-type-simple', 'quiz-type-complex', 'quiz-dont-know-btn', 'quiz-prev-btn',
    'quiz-next-btn', 'quiz-restart-btn', 'quiz-start-btn', 'quiz-shop-btn',
    'quiz-learn-continue-btn',
  ];
  const html = `<div id="page-quiz">${ids.map(id => `<div id="${id}"></div>`).join('')}${buttons.map(id => `<button id="${id}"></button>`).join('')}</div>`;
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  global.document = dom.window.document;
  global.window = dom.window;
}

function answerCurrentQuiz(controller) {
  while (!controller.isQuizComplete()) {
    const question = controller.getCurrentQuestion();
    controller.submitAnswer(question.correctIndex);
  }
  return controller.completeQuiz();
}

describe('mastery integration and persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    setupDom();
  });

  it('keeps auto mode on initial QuizView mount and masters words across simple/complex checks', () => {
    const eventBus = new EventBus();
    const controller = new LearningController(eventBus, 'child');
    controller.init(words, { skipUI: true });
    const game = { quiz: { quizMode: 'basic', maxLevel: 3 }, setLapCount() {}, selectedLaps: 1 };
    const view = new QuizView(eventBus, game, controller);

    view.mount();
    expect(controller.getModePreference()).toBe('auto');
    answerCurrentQuiz(controller);

    controller.startNewQuiz();
    const secondModes = controller.getCurrentSession().questions.map(question => question.mode);
    expect(secondModes).toContain('RADIO_MSG');
    expect(secondModes).not.toContain('QUALIFYING');
    answerCurrentQuiz(controller);

    expect(controller.getWordStats().mastered).toBeGreaterThan(0);
    expect(controller.gameState.get('learning.totalWordsMastered'))
      .toBe(controller.getWordStats().mastered);
  });

  it('restores mastered words and repairs a stale GameState summary after refresh', () => {
    const eventBus = new EventBus();
    const tracker = new ProgressTracker(eventBus, 'shanghai-zhongkao', 'child');
    tracker.updateStatus('ability', 'PIT_BOARD', true, 1);
    tracker.updateStatus('ability', 'RADIO_MSG', true, 1);
    tracker.save();
    localStorage.setItem('wr_game_state_child', JSON.stringify({
      version: 4,
      learning: { totalWordsMastered: 0 },
    }));

    const restored = new LearningController(new EventBus(), 'child');
    restored.init(words, { skipUI: true });

    expect(restored.progressTracker.getStatus('ability').status).toBe('mastered');
    expect(restored.gameState.get('learning.totalWordsMastered')).toBe(1);
  });

  it('uses LAP_REVIEW originalMode and persists the resulting mastery state', () => {
    const tracker = new ProgressTracker(new EventBus(), 'shanghai-zhongkao', 'child');
    tracker.updateStatus('ability', 'PIT_BOARD', true, 1);
    tracker.updateStatus('ability', 'LAP_REVIEW', true, 1, 'QUALIFYING');
    tracker.save();

    const restored = new ProgressTracker(new EventBus(), 'shanghai-zhongkao', 'child');
    expect(restored.getStatus('ability').status).toBe('mastered');
  });

  it('treats QUALIFYING as complex mastery without putting it in the default distribution', () => {
    const tracker = new ProgressTracker(new EventBus(), 'shanghai-zhongkao', 'child');
    tracker.updateStatus('ability', 'PIT_BOARD', true, 1);
    tracker.updateStatus('ability', 'QUALIFYING', true, 1);

    expect(tracker.getStatus('ability').status).toBe('mastered');
  });

  it('does not issue question or accuracy rewards twice', () => {
    const controller = new LearningController(new EventBus(), 'child');
    controller.init(words, { skipUI: true });
    controller.startNewQuiz();
    const question = controller.getCurrentQuestion();

    expect(controller.submitAnswer(question.correctIndex, question).fuelCoins).toBe(3);
    expect(controller.submitAnswer(question.correctIndex, question)).toBeNull();
    expect(controller.getCurrentSession().answers).toHaveLength(1);
    expect(controller.getCurrentSession().fuelCoinsEarned).toBe(3);

    while (!controller.isQuizComplete()) {
      const current = controller.getCurrentQuestion();
      controller.submitAnswer(current.correctIndex);
    }
    const first = controller.completeQuiz();
    const gearAfterFirst = controller.gameState.get('gearCoins');

    expect(first.accuracyBonus).toEqual({ fuel: 0, gear: 3 });
    expect(controller.completeQuiz()).toBeNull();
    expect(controller.gameState.get('gearCoins')).toBe(gearAfterFirst);
  });
});
