import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { EventBus } from '../core/event-bus.js';
import { Game } from '../js/game.js';
import { LearningController } from '../learning/learning-controller.js';
import { LearningView } from '../views/learning-view.js';

const words = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  word: `term${i + 1}`,
  phonetic: `/tɜːm ${i + 1}/`,
  meaning_cn: `含义${i + 1}`,
  meaning_en: `definition ${i + 1}`,
  sentence: `We use term${i + 1} today.`,
  level: 1,
  category: 'test',
}));

function setup() {
  document.body.innerHTML = readFileSync('index.html', 'utf8');
  const bus = new EventBus();
  const controller = new LearningController(bus, 'child');
  controller.init(words, { skipUI: true });
  controller.initializeLearningRoute();
  const game = new Game(document.createElement('canvas'), controller.gameState, bus);
  const player = { play: vi.fn().mockResolvedValue(true), stop: vi.fn() };
  const view = new LearningView(bus, game, controller, player);
  view.mount();
  return { controller, player, view };
}

describe('pronunciation learning flow with real controller and state', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 24, 12)); });
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

  it('shows phonetics and auto-plays a new-word intro only once across re-renders', () => {
    const { controller, player, view } = setup();
    controller.startLearning();
    view.render();
    const task = controller.getLearningTask();
    const corpus = words.find(word => word.word === task.word);
    expect(task.kind).toBe('intro');
    expect(document.querySelector('#quiz-phonetic').textContent).toBe(corpus.phonetic);
    expect(player.play).toHaveBeenCalledWith(corpus, expect.objectContaining({ automatic: true, dedupeKey: `${task.id}:intro` }));
    view.render();
    expect(player.play).toHaveBeenCalledTimes(1);
    document.querySelector('#quiz-pronounce-btn').click();
    expect(player.play).toHaveBeenLastCalledWith(corpus, expect.objectContaining({ automatic: false }));
  });

  it('auto-plays a learning card and stops audio when unmounted', () => {
    const { controller, player, view } = setup();
    controller.startLearning(); view.render();
    const intro = controller.getLearningTask();
    controller.revealLearning(intro.id); view.render();
    const card = controller.getLearningTask();
    expect(card.kind).toBe('card');
    expect(document.querySelector('#quiz-learn-phonetic').textContent).not.toBe('');
    expect(player.play).toHaveBeenCalledWith(expect.objectContaining({ word: card.word }), expect.objectContaining({ dedupeKey: `${card.id}:card` }));
    const stopsBeforeUnmount = player.stop.mock.calls.length;
    view.unmount();
    expect(player.stop).toHaveBeenCalledTimes(stopsBeforeUnmount + 1);
  });

  it('does not auto-play or expose phonetics on reverse and context questions', () => {
    const { controller, player, view } = setup();
    controller.startLearning();
    const route = controller.gameState.get('adaptive');
    route.session.queue[0] = { id: 'reverse-1', word: words[0].word, kind: 'choice', route: 'verify', direction: 'reverse' };
    controller.gameState.commitLearningState();
    player.play.mockClear(); view.render();
    expect(document.querySelector('#quiz-phonetic').textContent).toBe('');
    expect(document.querySelector('#quiz-pronounce-btn').style.display).toBe('none');
    expect(player.play).not.toHaveBeenCalled();
    route.session.queue[0] = { id: 'context-1', word: words[0].word, kind: 'choice', route: 'context', direction: 'context' };
    controller.gameState.commitLearningState(); view.render();
    expect(document.querySelector('#quiz-phonetic').textContent).toBe('');
    expect(player.play).not.toHaveBeenCalled();
  });

  it('respects the per-user auto-play setting while leaving manual playback available', () => {
    const { controller, player, view } = setup();
    controller.gameState.set('preferences.autoPronunciation', false);
    controller.startLearning(); view.render();
    expect(player.play).not.toHaveBeenCalled();
    expect(document.querySelector('#quiz-pronounce-btn').style.display).not.toBe('none');
    document.querySelector('#quiz-pronounce-btn').click();
    expect(player.play).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ automatic: false }));
  });
});
