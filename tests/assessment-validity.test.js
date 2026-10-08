import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { EventBus } from '../core/event-bus.js';
import { ProgressTracker } from '../learning/progress-tracker.js';
import { LearningController } from '../learning/learning-controller.js';
import { QuestionFactory } from '../js/question-factory.js';
import { AdaptiveSelector } from '../learning/adaptive-selector.js';

const words = ['crazy', 'empty', 'wise', 'wild', 'other'].map((word, i) => ({
  id: i + 100, word, level: 2, category: 'adjectives', phonetic: '/test/',
  meaning_cn: `释义${i}`, meaning_en: `definition ${i}`,
  sentence: `He went ${word}.`,
}));

describe('assessment validity and migration', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 8, 12)); });
  afterEach(() => vi.useRealTimers());

  it('requires two independent dates for each ability, not same-day repetitions', () => {
    const t = new ProgressTracker(new EventBus());
    for (let i = 0; i < 2; i++) {
      t.updateStatus('crazy', 'PIT_BOARD', true, 100);
      t.updateStatus('crazy', 'RADIO_MSG', true, 100);
    }
    expect(t.isMastered('crazy')).toBe(false);
    expect(t.getStats().independentPassed).toBe(1);
    vi.setSystemTime(new Date(2026, 9, 9, 12));
    t.updateStatus('crazy', 'PIT_BOARD', true, 100);
    t.updateStatus('crazy', 'RADIO_MSG', true, 100);
    expect(t.isMastered('crazy')).toBe(true);
    t.save();
    expect(new ProgressTracker(new EventBus()).isMastered('crazy')).toBe(true);
  });

  it('does not certify a correct answer after help, including after refresh', () => {
    const c = new LearningController(new EventBus(), 'child').init(words, { skipUI: true });
    c.startNewQuiz({ count: 1 });
    c.markCurrentQuestionAssisted();
    const restored = new LearningController(new EventBus(), 'child').init(words, { skipUI: true });
    restored.resumeSession();
    const q = restored.getCurrentQuestion();
    expect(q.assisted).toBe(true);
    const result = restored.submitAnswer(q.correctIndex, q);
    expect(result.fuelCoins).toBe(0);
    const p = restored.progressTracker.getStatus(q.correctWord);
    expect(p.simpleCorrect).toBe(false);
    expect(p.assistedCompletions).toBe(1);
    expect(restored.completeQuiz().accuracyBonus.gear).toBe(0);
    restored.progressTracker.updateStatus(q.correctWord, 'PIT_BOARD', true, q.wordId);
    expect(restored.progressTracker.getStatus(q.correctWord).simpleCorrect).toBe(false);
    vi.setSystemTime(new Date(2026, 9, 9, 12));
    restored.progressTracker.updateStatus(q.correctWord, 'PIT_BOARD', true, q.wordId);
    expect(restored.progressTracker.getStatus(q.correctWord).simpleCorrect).toBe(true);
  });

  it('preserves historical passes, binds by exact word and archives unavailable words idempotently', () => {
    localStorage.setItem('wr_word_progress_default', JSON.stringify({ progress: {
      crazy: { word: 'crazy', wordId: 101, status: 'mastered', simpleCorrect: true, complexCorrect: true },
      absent: { word: 'absent', wordId: 100, status: 'simple_passed', simpleCorrect: true },
    } }));
    const t = new ProgressTracker(new EventBus());
    t.reconcileWordSet(words);
    expect(t.getStatus('crazy').wordId).toBe(100);
    expect(t.getStatus('crazy').legacyEvidence.complexCorrect).toBe(true);
    expect(t.isMastered('crazy')).toBe(false);
    expect(t.getStatus('absent').available).toBe(false);
    expect(t.getStats()).toMatchObject({ total: 2, learning: 1, archived: 1, unlearned: 0 });
    const snapshot = JSON.stringify(t.getAllProgress());
    t.reconcileWordSet(words);
    expect(JSON.stringify(t.getAllProgress())).toBe(snapshot);
    const checks = t.getCheckWords();
    expect([...checks.needSimpleCheck, ...checks.needComplexCheck].some(p => p.word === 'absent')).toBe(false);
  });

  it('never resolves a saved word to a different word through its old ID', () => {
    const t = new ProgressTracker(new EventBus());
    t.updateStatus('crazy', 'PIT_BOARD', false, 101);
    const selector = new AdaptiveSelector(new EventBus(), t, words, 5, 1);
    const quiz = selector.buildQuiz({ count: 1 });
    expect(quiz[0].correctWord).toBe('crazy');
  });

  it('falls back safely when the sentence cannot be blanked without showing the answer', () => {
    const q = QuestionFactory.createQuestion({ ...words[0], sentence: 'A different sentence.' }, 'RADIO_MSG', 3, words, true);
    expect(q.mode).toBe('PIT_BOARD');
    expect(q.prompt).not.toContain('______');
  });

  it('rejects reverse-word prompts that contain the target answer', () => {
    const q = QuestionFactory.createQuestion({ ...words[0], meaning_cn: 'crazy means wild' }, 'STRATEGY', 3, words, true);
    expect(q).toBeNull();
  });

  it('hides unreliable OCR examples even in meaning questions and learning panels', () => {
    const q = QuestionFactory.createQuestion({ ...words[0], source2025: { needs_review: true } }, 'PIT_BOARD', 3, words, true);
    expect(q.sentence).toBe('');
    expect(q.sentenceOriginal).toBe('');
  });

  it('preserves an unfinished quiz when no verification questions are due', () => {
    const c = new LearningController(new EventBus(), 'child').init(words, { skipUI: true });
    c.startNewQuiz({ count: 1 });
    const original = c.getCurrentQuestion();
    expect(c.startNewQuiz({ verificationOnly: true })).toEqual([]);
    expect(c.getCurrentQuestion()).toBe(original);
    expect(c.hasUnfinishedSession()).toBe(true);
  });

  it('requires another day after wrong-answer feedback before certification', () => {
    const c = new LearningController(new EventBus(), 'child').init(words, { skipUI: true });
    c.startNewQuiz({ count: 1 });
    const q = c.getCurrentQuestion();
    c.submitAnswer((q.correctIndex + 1) % q.options.length, q);
    c.progressTracker.updateStatus(q.correctWord, q.mode, true, q.wordId);
    expect(c.progressTracker.getStatus(q.correctWord).simpleCorrect).toBe(false);
    vi.setSystemTime(new Date(2026, 9, 9, 12));
    c.progressTracker.updateStatus(q.correctWord, q.mode, true, q.wordId);
    expect(c.progressTracker.getStatus(q.correctWord).simpleCorrect).toBe(true);
  });

  it('resolves legacy review by word and preserves the fallback ability', () => {
    const q = QuestionFactory.createReviewQuestion({ word: 'empty', wordId: 100 }, words, 3, words, true);
    expect(q.correctWord).toBe('empty');
    expect(q.originalMode).toBe(q.mode);
  });
});
