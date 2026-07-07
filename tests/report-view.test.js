import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { EventBus } from '../core/event-bus.js';
import { ReportView } from '../views/report-view.js';

function buildReportHtml() {
  return `
    <div id="page-report">
      <div id="report-total-stats"></div>
      <div id="report-today-stats"></div>
      <div id="report-mastery-stats"></div>
      <div id="report-wrong-words"></div>
      <div id="report-word-details"></div>
    </div>
  `;
}

function createMockLearningController() {
  return {
    dailyManager: {
      getTotalStats: vi.fn(() => ({
        totalQuizzes: 5,
        totalQuestions: 50,
        totalCorrect: 40,
      })),
      checkDailyGoals: vi.fn(() => ({
        dailyComplete: { achieved: true },
      })),
    },
    getDailyProgress: vi.fn(() => ({
      quizzesCompleted: 2,
      newWordsLearned: 8,
      wordsReviewed: 5,
      maxCombo: 6,
      fuelCoinsEarned: 80,
      gearCoinsEarned: 20,
    })),
    progressTracker: {
      getStats: vi.fn(() => ({
        total: 100,
        mastered: 35,
        learning: 65,
      })),
      getWrongWords: vi.fn(() => [
        { word: 'abandon', simpleWrongCount: 1, complexWrongCount: 0, status: 'exposed' },
        { word: 'balance', simpleWrongCount: 0, complexWrongCount: 2, status: 'simple_passed' },
      ]),
      getAllProgress: vi.fn(() => ({
        abandon: { status: 'exposed', simpleCorrect: false, complexCorrect: false, simpleWrongCount: 1, complexWrongCount: 0, firstSeenDate: '2026-01-10' },
        balance: { status: 'simple_passed', simpleCorrect: true, complexCorrect: false, simpleWrongCount: 0, complexWrongCount: 2, firstSeenDate: '2026-01-12' },
        correct: { status: 'mastered', simpleCorrect: true, complexCorrect: true, simpleWrongCount: 0, complexWrongCount: 0, firstSeenDate: '2026-01-08' },
      })),
    },
  };
}

describe('ReportView', () => {
  let eventBus;
  let mockLC;

  beforeEach(() => {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${buildReportHtml()}</body></html>`);
    global.document = dom.window.document;
    global.window = dom.window;
    eventBus = new EventBus();
    mockLC = createMockLearningController();
  });

  it('renders English total stats labels', () => {
    const view = new ReportView(eventBus, mockLC);
    view.mount();

    const container = document.getElementById('report-total-stats');
    expect(container.textContent).toContain('Quizzes Completed');
    expect(container.textContent).toContain('Total Questions');
    expect(container.textContent).toContain('Correct Answers');
    expect(container.textContent).toContain('Accuracy');
  });

  it('renders English today stats labels', () => {
    const view = new ReportView(eventBus, mockLC);
    view.mount();

    const container = document.getElementById('report-today-stats');
    expect(container.textContent).toContain("Today's Quizzes");
    expect(container.textContent).toContain('New Words');
    expect(container.textContent).toContain('Reviewed Words');
    expect(container.textContent).toContain('Best Combo');
    expect(container.textContent).toContain('Fuel Coins');
    expect(container.textContent).toContain('Gear Coins');
  });

  it('renders English mastery overview labels', () => {
    const view = new ReportView(eventBus, mockLC);
    view.mount();

    const container = document.getElementById('report-mastery-stats');
    expect(container.textContent).toContain('Words Attempted');
    expect(container.textContent).toContain('Mastered');
    expect(container.textContent).toContain('Learning');
  });

  it('renders wrong words table with English headers', () => {
    const view = new ReportView(eventBus, mockLC);
    view.mount();

    const container = document.getElementById('report-wrong-words');
    expect(container.textContent).toContain('Word');
    expect(container.textContent).toContain('Basic Misses');
    expect(container.textContent).toContain('Advanced Misses');
    expect(container.textContent).toContain('Status');
  });

  it('renders word details table with English headers and sort hint', () => {
    const view = new ReportView(eventBus, mockLC);
    view.mount();

    const container = document.getElementById('report-word-details');
    expect(container.textContent).toContain('Word');
    expect(container.textContent).toContain('Status');
    expect(container.textContent).toContain('Basic');
    expect(container.textContent).toContain('Advanced');
    expect(container.textContent).toContain('First Seen');
  });

  it('shows English empty state when no wrong words', () => {
    mockLC.progressTracker.getWrongWords = vi.fn(() => []);

    const view = new ReportView(eventBus, mockLC);
    view.mount();

    const container = document.getElementById('report-wrong-words');
    expect(container.textContent).toContain('No words to review yet');
  });

  it('shows English empty state when no learning data', () => {
    mockLC.progressTracker.getAllProgress = vi.fn(() => ({}));

    const view = new ReportView(eventBus, mockLC);
    view.mount();

    const container = document.getElementById('report-word-details');
    expect(container.textContent).toContain('No learning data yet');
  });

  it('renders English status labels', () => {
    const view = new ReportView(eventBus, mockLC);
    view.mount();

    const container = document.getElementById('report-wrong-words');
    expect(container.textContent).toContain('Seen');
    expect(container.textContent).toContain('Basic Passed');
  });

  it('shows English daily goals with clear copy', () => {
    const view = new ReportView(eventBus, mockLC);
    view.mount();

    const container = document.getElementById('report-today-stats');
    expect(container.textContent).toContain('Complete 3 quizzes');
  });
});