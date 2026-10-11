import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { LearningController } from '../learning/learning-controller.js';
import { EventBus, Events } from '../core/event-bus.js';
import { Game } from '../js/game.js';
import { LearningView } from '../views/learning-view.js';
import { addDays } from '../learning/learning-route.js';
import { localDate } from '../learning/assessment-policy.js';
import { readFileSync } from 'node:fs';

const words = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, word: `term${i + 1}`,
  meaning_cn: `含义${i + 1}`, meaning_en: `definition ${i + 1}`, sentence: `We use term${i + 1} today.`,
  phonetic: '/test/', level: 2, category: 'test' }));

function create(oldCount = 0, user = 'child', corpus = words) {
  if (oldCount && !localStorage.getItem(`wr_word_progress_${user}`)) {
    localStorage.setItem(`wr_word_progress_${user}`, JSON.stringify({ progress: Object.fromEntries(corpus.slice(0, oldCount).map(w => [w.word, {
      word: w.word, wordId: w.id + 900, status: 'mastered', simpleCorrect: true, complexCorrect: true,
      simpleWrongCount: 0, complexWrongCount: 0,
    }])) }));
  }
  const c = new LearningController(new EventBus(), user);
  c.init(corpus, { skipUI: true }); c.initializeLearningRoute();
  return c;
}

function finish(c, { failVerification = false, known = false } = {}) {
  let steps = 0;
  while (c.getLearningTask()) {
    if (++steps > 300) throw new Error('Route failed to terminate');
    const t = c.getLearningTask();
    if (t.kind === 'intro') known ? c.chooseKnown(t.id) : c.revealLearning(t.id);
    else if (t.kind.includes('card')) { c.revealLearning(t.id); c.continueLearning(t.id); }
    else c.answerLearning(failVerification && t.route === 'verify' ? (t.question.correctIndex + 1) % t.question.options.length : t.question.correctIndex, t.id);
  }
}

function finishDay(c, options = {}, extra = false) {
  let rounds = 0;
  while (c.startLearning({ extra })) {
    if (++rounds > 10) throw new Error('Daily plan failed to terminate');
    finish(c, options);
  }
  return rounds;
}

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 11, 12)); });
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

describe('adaptive learning real controller flow', () => {
  it('constructs the controller without publishing events before initialization', () => {
    const bus = new EventBus(), handler = vi.fn();
    bus.on(Events.DAILY_RESET, handler); bus.on(Events.RESOURCE_CHANGED, handler);
    new LearningController(bus, 'child');
    expect(handler).not.toHaveBeenCalled();
  });
  it('migrates legacy evidence by word, preserves resources, archives removed words, and is idempotent', () => {
    const c = create(10);
    c.gameState.set('fuelCoins', 116);
    c.gameState.set('gearCoins', 15);
    c.gameState.set('nitroCharges', 10);
    const before = c.getLearningWords();
    expect(before.term1.status).toBe('pending');
    expect(before.term1.wordId).toBe(1);
    const refreshed = create(0, 'child', words.slice(1));
    expect(refreshed.getLearningWords().term1.available).toBe(false);
    expect(refreshed.gameState.get('fuelCoins')).toBe(116);
    expect(refreshed.gameState.get('gearCoins')).toBe(15);
    expect(refreshed.gameState.get('nitroCharges')).toBe(10);
    expect(refreshed.getLearningProgress().fuelCoinsEarned).toBe(0);
    expect(create(0, 'child', words.slice(1)).getLearningWords()).toEqual(refreshed.getLearningWords());
  });

  it('45 completed practice words earn 100 fuel in five rounds, enough for two five-lap races', async () => {
    const c = create(30);
    expect(finishDay(c, { failVerification: true })).toBe(5);
    expect(c.getLearningProgress().completedWords).toBe(45);
    expect(c.getLearningProgress().targetWords).toBe(45);
    expect(c.gameState.get('fuelCoins')).toBe(100);
    expect(c.getLearningWordStats().learning).toBe(45);
    expect(c.getLearningWordStats().learned).toBe(0);
    const canvas = document.createElement('canvas');
    const holder = document.createElement('div'); holder.append(canvas); document.body.append(holder);
    const game = new Game(canvas, c.gameState, c.eventBus);
    await game.init();
    expect(game.getFuelCostForLaps(10)).toBe(100);
    expect(game.getMaxAffordableLaps()).toBe(5);
    game.setLapCount(5);
    await game.continueToRace();
    game.car.lap = 5;
    game.exitRace();
    expect(game.fuelCoins).toBe(50);
    await game.continueToRace();
    game.car.lap = 5;
    game.exitRace();
    expect(game.fuelCoins).toBe(0);
  });

  it('15 new practice words plus 30 independent confirmations yield 100 fuel and 2 gear', () => {
    const c = create(30);
    finishDay(c);
    expect(c.gameState.get('fuelCoins')).toBe(100);
    expect(c.gameState.get('gearCoins')).toBe(2);
    expect(c.getLearningWordStats().learned).toBe(30);
    expect(c.gameState.get('learning.totalWordsMastered')).toBe(30);
    expect(c.gameState.get('achievements')).not.toContain('perfect-streak');
    expect(c.startLearning()).toBeNull();
  });

  it('45 independent words earn 100 fuel while gear stays capped at 2', () => {
    const c = create(45, 'child', words.slice(0, 45));
    finishDay(c);
    finishDay(c, { known: true }, true);
    expect(c.getLearningProgress().completedWords).toBe(45);
    expect(c.gameState.get('fuelCoins')).toBe(100);
    expect(c.gameState.get('gearCoins')).toBe(2);
  });

  it('awards the 45-word milestone once, atomically, across refresh, duplicate events and extra practice', () => {
    let c = create(30);
    for (let i = 0; i < 4; i++) { c.startLearning(); finish(c, { failVerification: true }); }
    c.startLearning();
    while (c.getLearningProgress().completedWords < 44) {
      const t = c.getLearningTask();
      if (t.kind === 'intro') c.revealLearning(t.id);
      else if (t.kind.includes('card')) { c.revealLearning(t.id); c.continueLearning(t.id); }
      else c.answerLearning(t.question.correctIndex, t.id);
    }
    expect(c.gameState.get('fuelCoins')).toBe(88);
    expect(c.gameState.get('adaptive.days')[localDate()].completionBonus).toBe(false);
    c = create();
    const writes = vi.spyOn(localStorage, 'setItem');
    let last, result;
    while (c.getLearningTask()) {
      last = c.getLearningTask(); result = c.answerLearning(last.question.correctIndex, last.id);
    }
    expect(result).toMatchObject({ fuel: 12, completionBonus: 10 });
    expect(c.answerLearning(last.question.correctIndex, last.id)).toBeNull();
    expect(c.gameState.get('fuelCoins')).toBe(100);
    expect(c.startLearning()).toBeNull();
    for (const [key, raw] of writes.mock.calls) {
      if (key !== 'wr_game_state_child') continue;
      const saved = JSON.parse(raw), day = saved.adaptive.days[localDate()];
      expect(saved.fuelCoins).toBe(day.fuel);
      if (day.completionBonus) expect(day.fuel).toBeGreaterThanOrEqual(100);
    }
    writes.mockRestore();
    c = create();
    c.startLearning({ extra: true }); finish(c);
    expect(c.gameState.get('fuelCoins')).toBe(120);
    expect(c.getLearningProgress().completedWords).toBe(55);
    expect(create().gameState.get('fuelCoins')).toBe(120);
    vi.setSystemTime(new Date(2026, 9, 12, 12));
    finishDay(c);
    expect(c.getLearningProgress().completedWords).toBe(45);
    expect(c.getLearningProgress().fuelCoinsEarned).toBe(100);
    expect(c.gameState.get('fuelCoins')).toBe(220);
  });

  it('new words reveal no definitions until selected, and same-day practice does not certify', () => {
    const c = create(); c.startLearning();
    const t = c.getLearningTask();
    expect(t.kind).toBe('intro'); expect(t.question).toBeUndefined();
    c.revealLearning(t.id);
    expect(c.gameState.get('fuelCoins')).toBe(0);
    finish(c);
    expect(c.getLearningProgress().completedWords).toBe(10);
    expect(c.gameState.get('fuelCoins')).toBe(20);
    expect(c.getLearningWordStats().learned).toBe(0);
    c.startLearning(); finish(c);
    expect(c.getLearningProgress().completedWords).toBe(15);
    expect(c.gameState.get('fuelCoins')).toBe(30);
    expect(c.startLearning()).toBeNull();
    vi.setSystemTime(new Date(2026, 9, 12, 12));
    c.startLearning(); finish(c);
    expect(c.getLearningWordStats().learned).toBe(10);
  });

  it('rejects repeated and late task events, resumes the identical question after refresh', () => {
    let c = create(10); c.startLearning();
    const t = c.getLearningTask();
    c = create();
    expect(c.getLearningTask()).toEqual(t);
    c.answerLearning(t.question.correctIndex, t.id);
    expect(c.answerLearning(t.question.correctIndex, t.id)).toBeNull();
    expect(c.gameState.get('fuelCoins')).toBe(0);
    finish(c);
    const balance = c.gameState.get('fuelCoins');
    create().getLearningTask();
    expect(create().gameState.get('fuelCoins')).toBe(balance);
  });

  it('persists rewards and balance together, preserves higher historical receipts without re-awarding', () => {
    const c = create(10);
    c.gameState.set('fuelCoins', 7);
    const day = c.gameState.get('adaptive.days')[localDate()];
    day.rewards.term1 = 7; day.fuel = 7;
    c.startLearning();
    // Simulate a previously awarded practice receipt coexisting with an independently eligible task.
    const s = c.gameState.get('adaptive.session');
    s.queue.push({ id: 'eligible-forward', word: 'term1', kind: 'choice', route: 'verify', direction: 'forward' });
    s.assigned.push('term1');
    const writes = vi.spyOn(localStorage, 'setItem');
    finish(c);
    expect(day.rewards.term1).toBe(7);
    // Ten newly completed words earn 20; the historical 7-fuel receipt is retained.
    expect(c.gameState.get('fuelCoins')).toBe(27);
    expect(day.fuel).toBe(27);
    const snapshots = writes.mock.calls.filter(([key]) => key === 'wr_game_state_child').map(([, raw]) => JSON.parse(raw));
    for (const snapshot of snapshots) {
      expect(snapshot.fuelCoins).toBe(snapshot.adaptive.days[localDate()].fuel);
    }
    expect(create().gameState.get('fuelCoins')).toBe(27);
    writes.mockRestore();
  });

  it('cross-day refresh abandons yesterday tasks, preserves evidence and resumes with a fresh plan', () => {
    const c = create(10); c.startLearning();
    const t = c.getLearningTask(); c.answerLearning(t.question.correctIndex, t.id);
    const oldId = c.getLearningTask().id;
    vi.setSystemTime(new Date(2026, 9, 12, 0, 1));
    const refreshed = create();
    expect(refreshed.getLearningTask()).toBeNull();
    refreshed.startLearning();
    expect(refreshed.getLearningTask().id).not.toBe(oldId);
    expect(refreshed.answerLearning(0, oldId)).toBeNull();
    expect(refreshed.getLearningProgress().fuelCoinsEarned).toBe(0);
    expect(refreshed.getLearningWords().term1.verification.date).toBe('2026-10-11');
  });

  it('preserves only reliable stable legacy passes and caps the 30-day review interval', () => {
    const legacy = { word: 'term1', wordId: 999, status: 'mastered', assessmentVersion: 1,
      independentDates: { simple: ['2026-10-01', '2026-10-02'], complex: ['2026-10-01', '2026-10-02'] } };
    localStorage.setItem('wr_word_progress_child', JSON.stringify({ progress: {
      term1: legacy, term2: { ...legacy, word: 'term2', independentDates: { simple: ['2026-10-01', '2026-10-01'], complex: [] } },
    } }));
    const c = create();
    expect(c.getLearningWords().term1.status).toBe('learned');
    expect(c.getLearningWords().term2.status).toBe('pending');
    const p = c.gameState.get('adaptive.progress').term1;
    p.reviewStep = 4; p.nextDueDate = '2026-10-11';
    c.startLearning(); finish(c);
    expect(p.nextDueDate).toBe(addDays(localDate(), 30));
    expect(p.reviewStep).toBe(4);
  });

  it('archives legacy unfinished quiz without certifying or awarding it', () => {
    const c = new LearningController(new EventBus(), 'child');
    c.init(words, { skipUI: true }); c.startNewQuiz();
    const q = c.getCurrentQuestion(); c.submitAnswer(q.correctIndex);
    c.initializeLearningRoute();
    expect(c.gameState.get('adaptive.legacySession.answers')).toHaveLength(1);
    expect(c.sessionManager.getCurrentSession()).toBeNull();
    expect(c.getLearningWordStats().learned).toBe(0);
    expect(c.gameState.get('fuelCoins')).toBe(0);
  });

  it('spaces reverse confirmation with two other words and defers a one-word session until tomorrow', () => {
    const c = create(10); c.startLearning();
    let t = c.getLearningTask(); const first = t.word;
    c.answerLearning(t.question.correctIndex, t.id);
    expect(c.getLearningTask().word).not.toBe(first);
    finish(c);
    localStorage.clear();
    const single = create(1);
    // All other words are future-due: material remains available as distractors.
    for (const p of Object.values(single.gameState.get('adaptive.progress'))) if (p.word !== 'term1') p.nextDueDate = '2026-11-01';
    single.startLearning(); t = single.getLearningTask();
    single.answerLearning(t.question.correctIndex, t.id);
    expect(single.getLearningTask()).toBeNull();
    expect(single.getLearningWords().term1.status).toBe('pending');
    expect(single.gameState.get('learning.totalQuizzes')).toBe(0);
    vi.setSystemTime(new Date(2026, 9, 12, 12));
    single.startLearning(); t = single.getLearningTask();
    expect(t.direction).toBe('reverse');
    single.answerLearning(t.question.correctIndex, t.id); single.getLearningTask();
    expect(single.getLearningWords().term1.status).toBe('learned');
    expect(single.gameState.get('fuelCoins')).toBe(2);
  });

  it('expired one-direction evidence restarts forward confirmation', () => {
    const c = create(10);
    c.gameState.get('adaptive.progress').term1.verification = { date: '2026-10-01', traceIndex: 0 };
    c.startLearning();
    expect(c.getLearningTask().direction).toBe('forward');
  });

  it('review advances dates, context failure keeps learned, meaning failure triggers relearning', () => {
    const c = create(10); c.startLearning(); finish(c);
    vi.setSystemTime(new Date(2026, 9, 12, 12));
    c.startLearning(); finish(c);
    expect(c.getLearningWords().term1.nextDueDate).toBe('2026-10-15');
    expect(c.getLearningWords().term1.reviewPasses).toBe(1);
    vi.setSystemTime(new Date(2026, 9, 15, 12));
    c.startLearning();
    let t, context;
    for (let i = 0; i < 150 && (t = c.getLearningTask()); i++) {
      if (t.route === 'context') { context = t; break; }
      c.answerLearning(t.question.correctIndex, t.id);
    }
    expect(context).toBeDefined();
    expect(context.question.promptSub).toBe('');
    c.answerLearning(-1, context.id);
    expect(c.getLearningWords()[context.word].status).toBe('learned');
    expect(c.getLearningWords()[context.word].nextDueDate).toBe('2026-10-16');
    finish(c);
    vi.setSystemTime(new Date(2026, 9, 16, 12));
    c.startLearning(); t = c.getLearningTask();
    c.answerLearning(-1, t.id);
    expect(c.getLearningWords()[t.word].status).toBe('learning');
  });

  it('review help preserves learned and schedules tomorrow without reward or interval extension', () => {
    const c = create(10); c.startLearning(); finish(c);
    vi.setSystemTime(new Date(2026, 9, 12, 12)); c.startLearning();
    const t = c.getLearningTask(); c.revealLearning(t.id);
    expect(c.getLearningWords()[t.word].status).toBe('learned');
    expect(c.getLearningWords()[t.word].nextDueDate).toBe('2026-10-13');
    c.continueLearning(t.id);
    expect(c.getLearningProgress().fuelCoinsEarned).toBe(0);
  });

  it('bad sentence falls back to meaning; no valid choices means no task or penalty', () => {
    const corpus = words.map(w => ({ ...w, source2025: { needs_review: true } }));
    const c = create(10, 'child', corpus);
    c.startLearning(); finish(c);
    expect(c.getLearningWordStats().learned).toBe(10);
    const tiny = create(0, 'tiny', [words[0]]);
    expect(tiny.startLearning()).toBeNull();
    expect(tiny.getLearningWords().term1.status).toBe('pending');
  });

  it('keeps independent users and prior achievements isolated', () => {
    const a = create(10, 'a'); a.gameState.set('achievements', ['perfect-streak']);
    a.startLearning(); finish(a);
    const b = create(0, 'b');
    expect(b.gameState.get('fuelCoins')).toBe(0);
    expect(a.gameState.get('achievements')).toContain('perfect-streak');
  });

  it('emits shared-bus state transitions and tolerates listeners reading the current task during rewards', () => {
    const c = create(10);
    const changes = [];
    c.eventBus.on(Events.WORD_STATUS_CHANGED, change => changes.push(change));
    c.eventBus.on(Events.COINS_CHANGED, () => c.getLearningTask());
    c.startLearning(); finish(c);
    expect(c.gameState.get('fuelCoins')).toBe(20);
    expect(changes.filter(change => change.newStatus === 'learned')).toHaveLength(10);
    expect(c.getLearningProgress().completedWords).toBe(10);
  });

  it('uses the real learning page, cleans listeners, and never displays definitions during verification', () => {
    document.body.innerHTML = readFileSync('index.html', 'utf8');
    const c = create(10);
    const canvas = document.createElement('canvas');
    const game = new Game(canvas, c.gameState, c.eventBus);
    game.fuelCoins = 50;
    const selectLap = vi.spyOn(game, 'setLapCount');
    const view = new LearningView(c.eventBus, game, c);
    view.mount(); view.unmount(); view.mount();
    document.querySelector('#quiz-lap-select button[data-laps="5"]').click();
    expect(selectLap).toHaveBeenCalledTimes(1);
    expect(game.selectedLaps).toBe(5);
    document.querySelector('#learning-start-btn').click();
    expect(document.querySelector('#quiz-word').textContent).toBe(c.getLearningTask().question.prompt);
    expect(document.querySelector('#quiz-sentence').textContent).toBe('');
    const t = c.getLearningTask();
    document.querySelectorAll('#quiz-options button')[t.question.correctIndex].click();
    expect(c.gameState.get('learning.totalQuestions')).toBe(1);
    document.querySelector('#quiz-dont-know-btn').click();
    expect(document.querySelector('#quiz-learn-panel').style.display).toBe('block');
    expect(c.getLearningWords()[c.getLearningTask().word].status).toBe('learning');
    expect(document.querySelector('#quiz-type-simple')).toBeNull();
    expect(document.querySelector('#quiz-type-complex')).toBeNull();
    view.unmount();
  });
});
