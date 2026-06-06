/**
 * QuizSessionManager Tests
 * Tests for quiz session management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuizSessionManager } from '../learning/quiz-session.js';
import { EventBus, Events } from '../core/event-bus.js';
import { GameState } from '../core/game-state.js';
import { DailyManager } from '../learning/daily-manager.js';
import { ProgressTracker } from '../learning/progress-tracker.js';
import { LEARNING } from '../config/learning-config.js';
const createQuestion = (id, word = `word${id}`, overrides = {}) => ({
  wordId: id,
  word,
  mode: 'PIT_BOARD',
  modeLabel: '词→义',
  prompt: word,
  promptSub: `/wɜːrd${id}/`,
  sentence: `This is ${word}.`,
  options: ['选项A', '选项B', '选项C', `词${id}`],
  correctIndex: 3,
  correctWord: word,
  correctMeaning: `词${id}`,
  isNew: true,
  ...overrides,
});

describe('QuizSessionManager', () => {
  let eventBus;
  let gameState;
  let dailyManager;
  let progressTracker;
  let sessionManager;

  beforeEach(() => {
    localStorage.clear();

    eventBus = new EventBus();
    gameState = new GameState(eventBus);
    dailyManager = new DailyManager(eventBus, gameState);
    progressTracker = new ProgressTracker(eventBus);
    sessionManager = new QuizSessionManager(eventBus, dailyManager, progressTracker);
  });

  // ==================== Session Start ====================

  describe('startDailySession', () => {
    it('should create a new session', () => {
      const session = sessionManager.startDailySession();

      expect(session).not.toBeNull();
      expect(session.currentQuiz).toBe(1);
      expect(session.completed).toBe(false);
    });

    it('should emit SESSION_START event', () => {
      const handler = vi.fn();
      eventBus.on(Events.SESSION_START, handler);

      sessionManager.startDailySession();

      expect(handler).toHaveBeenCalledWith({
        quizNumber: 1,
        totalQuizzes: LEARNING.DAILY_QUIZ_COUNT,
      });
    });

    it('should return null when all quizzes completed', () => {
      // Complete 3 quizzes
      for (let i = 0; i < 3; i++) {
        dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 8 });
      }

      const session = sessionManager.startDailySession();
      expect(session).toBeNull();
    });

    it('should increment quiz number for subsequent sessions', () => {
      sessionManager.startDailySession();
      sessionManager.completeQuiz();

      const session2 = sessionManager.startDailySession();
      expect(session2.currentQuiz).toBe(2);
    });
  });

  // ==================== Session Resume ====================

  describe('resumeSession', () => {
    it('should return null when no session exists', () => {
      const session = sessionManager.resumeSession();
      expect(session).toBeNull();
    });

    it('should return null for completed session', () => {
      sessionManager.startDailySession();
      sessionManager.completeQuiz();

      const session = sessionManager.resumeSession();
      expect(session).toBeNull();
    });

    it('should resume incomplete session', () => {
      const session = sessionManager.startDailySession();
      sessionManager.setQuestions([
        createQuestion(1, 'speed'),
        createQuestion(2, 'brake'),
      ]);
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });

      // Create new manager to simulate page reload
      const newManager = new QuizSessionManager(eventBus, dailyManager, progressTracker);
      const resumed = newManager.resumeSession();

      expect(resumed).not.toBeNull();
      expect(resumed.answers.length).toBe(1);
    });

    it('should emit SESSION_RESUME event', () => {
      const handler = vi.fn();
      eventBus.on(Events.SESSION_RESUME, handler);

      sessionManager.startDailySession();
      sessionManager.setQuestions([
        createQuestion(1, 'speed'),
        createQuestion(2, 'brake'),
      ]);
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });

      // Resume
      sessionManager.resumeSession();

      expect(handler).toHaveBeenCalled();
    });
  });

  // ==================== Has Unfinished Session ====================

  describe('hasUnfinishedSession', () => {
    it('should return false initially', () => {
      expect(sessionManager.hasUnfinishedSession()).toBe(false);
    });

    it('should return true for incomplete session', () => {
      sessionManager.startDailySession();
      sessionManager.setQuestions([
        createQuestion(1, 'speed'),
        createQuestion(2, 'brake'),
      ]);
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });

      expect(sessionManager.hasUnfinishedSession()).toBe(true);
    });

    it('should return false after completion', () => {
      sessionManager.startDailySession();
      sessionManager.setQuestions([createQuestion(1, 'speed')]);
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });
      sessionManager.completeQuiz();

      expect(sessionManager.hasUnfinishedSession()).toBe(false);
    });
  });

  // ==================== Answer Saving ====================

  describe('saveAnswer', () => {
    beforeEach(() => {
      sessionManager.startDailySession();
      sessionManager.setQuestions([
        { wordId: 1, word: 'speed', mode: 'PIT_BOARD' },
        { wordId: 2, word: 'brake', mode: 'PIT_BOARD' },
        { wordId: 3, word: 'engine', mode: 'RADIO_MSG' },
      ]);
    });

    it('should save answer and update stats', () => {
      const result = sessionManager.saveAnswer({
        questionIndex: 0,
        correct: true,
        selectedIndex: 0,
        mode: 'PIT_BOARD',
        fuelCoins: 5,
      });

      expect(result.answeredCount).toBe(1);
      expect(result.totalQuestions).toBe(3);
      expect(result.combo).toBe(1);
      expect(result.isComplete).toBe(false);
    });

    it('should track combo correctly', () => {
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });
      sessionManager.saveAnswer({ questionIndex: 1, correct: true, mode: 'PIT_BOARD' });

      const result = sessionManager.saveAnswer({ questionIndex: 2, correct: false, mode: 'RADIO_MSG' });

      expect(result.combo).toBe(0);
    });

    it('should accumulate coins', () => {
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD', fuelCoins: 5 });
      sessionManager.saveAnswer({ questionIndex: 1, correct: true, mode: 'PIT_BOARD', fuelCoins: 5 });

      const session = sessionManager.getCurrentSession();
      expect(session.fuelCoinsEarned).toBe(10);
    });

    it('should emit SESSION_SAVE event', () => {
      const handler = vi.fn();
      eventBus.on(Events.SESSION_SAVE, handler);

      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });

      expect(handler).toHaveBeenCalled();
    });

    it('should detect completion', () => {
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });
      sessionManager.saveAnswer({ questionIndex: 1, correct: true, mode: 'PIT_BOARD' });

      const result = sessionManager.saveAnswer({ questionIndex: 2, correct: true, mode: 'RADIO_MSG' });

      expect(result.isComplete).toBe(true);
    });
  });

  // ==================== Quiz Completion ====================

  describe('completeQuiz', () => {
    beforeEach(() => {
      sessionManager.startDailySession();
      sessionManager.setQuestions([
        createQuestion(1, 'speed'),
        createQuestion(2, 'brake'),
      ]);
    });

    it('should return quiz results', () => {
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD', fuelCoins: 5 });
      sessionManager.saveAnswer({ questionIndex: 1, correct: false, mode: 'PIT_BOARD' });

      const result = sessionManager.completeQuiz();

      expect(result.totalQuestions).toBe(2);
      expect(result.correctCount).toBe(1);
      expect(result.accuracy).toBe(50);
    });

    it('should include combo rewards', () => {
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });
      sessionManager.saveAnswer({ questionIndex: 1, correct: true, mode: 'PIT_BOARD' });

      const result = sessionManager.completeQuiz();

      expect(result.maxCombo).toBe(2);
      expect(result.comboReward).toBeDefined();
    });

    it('should emit QUIZ_COMPLETE event', () => {
      const handler = vi.fn();
      eventBus.on(Events.QUIZ_COMPLETE, handler);

      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });
      sessionManager.saveAnswer({ questionIndex: 1, correct: true, mode: 'PIT_BOARD' });
      sessionManager.completeQuiz();

      expect(handler).toHaveBeenCalled();
    });

    it('should update daily progress', () => {
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });
      sessionManager.saveAnswer({ questionIndex: 1, correct: true, mode: 'PIT_BOARD' });
      sessionManager.completeQuiz();

      const progress = dailyManager.getTodayProgress();
      expect(progress.quizzesCompleted).toBe(1);
    });
  });

  // ==================== Combo Rewards ====================

  describe('getComboReward', () => {
    beforeEach(() => {
      sessionManager.startDailySession();
      sessionManager.setQuestions(Array(10).fill(null).map((_, i) => createQuestion(i, `word${i}`)));
    });

    it('should return no reward for combo < 3', () => {
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });
      sessionManager.saveAnswer({ questionIndex: 1, correct: true, mode: 'PIT_BOARD' });

      const reward = sessionManager.getComboReward();
      expect(reward.fuel).toBe(0);
      expect(reward.gear).toBe(0);
    });

    it('should return combo 3 reward', () => {
      for (let i = 0; i < 3; i++) {
        sessionManager.saveAnswer({ questionIndex: i, correct: true, mode: 'PIT_BOARD' });
      }

      const reward = sessionManager.getComboReward();
      expect(reward.gear).toBe(5);
    });

    it('should return combo 5 reward', () => {
      for (let i = 0; i < 5; i++) {
        sessionManager.saveAnswer({ questionIndex: i, correct: true, mode: 'PIT_BOARD' });
      }

      const reward = sessionManager.getComboReward();
      expect(reward.gear).toBe(10);
    });
  });

  // ==================== Today Stats ====================

  describe('getTodayStats', () => {
    it('should return today stats', () => {
      const stats = sessionManager.getTodayStats();

      expect(stats.quizzesCompleted).toBe(0);
      expect(stats.remainingQuizzes).toBe(3);
    });

    it('should update after quiz completion', () => {
      sessionManager.startDailySession();
      sessionManager.setQuestions([createQuestion(1, 'speed')]);
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });
      sessionManager.completeQuiz();

      const stats = sessionManager.getTodayStats();
      expect(stats.quizzesCompleted).toBe(1);
      expect(stats.remainingQuizzes).toBe(2);
    });
  });

  // ==================== Utility Methods ====================

  describe('utility methods', () => {
    it('should get current question index', () => {
      sessionManager.startDailySession();
      sessionManager.setQuestions([
        createQuestion(1, 'speed'),
        createQuestion(2, 'brake'),
      ]);

      expect(sessionManager.getCurrentQuestionIndex()).toBe(0);

      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });
      expect(sessionManager.getCurrentQuestionIndex()).toBe(1);
    });

    it('should get progress percentage', () => {
      sessionManager.startDailySession();
      sessionManager.setQuestions([
        createQuestion(1, 'speed'),
        createQuestion(2, 'brake'),
      ]);

      expect(sessionManager.getProgressPercentage()).toBe(0);

      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });
      expect(sessionManager.getProgressPercentage()).toBe(50);
    });

    it('should check if can start next quiz', () => {
      expect(sessionManager.canStartNextQuiz()).toBe(true);

      for (let i = 0; i < 3; i++) {
        dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 8 });
      }

      expect(sessionManager.canStartNextQuiz()).toBe(false);
    });

    it('should clear session', () => {
      sessionManager.startDailySession();
      sessionManager.clearSession();

      expect(sessionManager.getCurrentSession()).toBeNull();
      expect(sessionManager.hasUnfinishedSession()).toBe(false);
    });
  });

  // ==================== Session Validity ====================

  describe('isSessionValid', () => {
    it('should return false without session', () => {
      expect(sessionManager.isSessionValid()).toBe(false);
    });

    it('should return true for valid session', () => {
      sessionManager.startDailySession();
      expect(sessionManager.isSessionValid()).toBe(true);
    });

    it('should return false after completion', () => {
      sessionManager.startDailySession();
      sessionManager.completeQuiz();
      expect(sessionManager.isSessionValid()).toBe(false);
    });
  });

  // ==================== Persistence ====================

  describe('persistence', () => {
    it('should save session to localStorage', () => {
      sessionManager.startDailySession();
      sessionManager.setQuestions([createQuestion(1, 'speed')]);
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });

      const saved = JSON.parse(localStorage.getItem('wr_quiz_session'));
      expect(saved).toBeDefined();
      expect(saved.answers.length).toBe(1);
    });

    it('should persist complete question data for real resume', () => {
      sessionManager.startDailySession();
      sessionManager.setQuestions([
        createQuestion(1, 'speed', { isReview: true, originalMode: 'STRATEGY' }),
      ]);

      const saved = JSON.parse(localStorage.getItem('wr_quiz_session'));
      const question = saved.questions[0];

      expect(question.options).toEqual(['选项A', '选项B', '选项C', '词1']);
      expect(question.correctIndex).toBe(3);
      expect(question.prompt).toBe('speed');
      expect(question.promptSub).toBe('/wɜːrd1/');
      expect(question.sentence).toBe('This is speed.');
      expect(question.correctWord).toBe('speed');
      expect(question.correctMeaning).toBe('词1');
      expect(question.isReview).toBe(true);
      expect(question.originalMode).toBe('STRATEGY');
    });

    it('should save completed=true to localStorage after quiz completion', () => {
      sessionManager.startDailySession();
      sessionManager.setQuestions([createQuestion(1, 'speed')]);
      sessionManager.saveAnswer({ questionIndex: 0, correct: true, mode: 'PIT_BOARD' });

      sessionManager.completeQuiz();

      const saved = JSON.parse(localStorage.getItem('wr_quiz_session'));
      expect(saved.completed).toBe(true);

      const newManager = new QuizSessionManager(eventBus, dailyManager, progressTracker);
      expect(newManager.hasUnfinishedSession()).toBe(false);
    });

    it('should treat old lossy sessions as non-resumable', () => {
      sessionManager.startDailySession();
      sessionManager.setQuestions([{ wordId: 1, word: 'speed', mode: 'PIT_BOARD' }]);
      sessionManager.saveAnswer({ questionIndex: 0, correct: false, mode: 'PIT_BOARD' });

      const newManager = new QuizSessionManager(eventBus, dailyManager, progressTracker);
      expect(newManager.hasUnfinishedSession()).toBe(false);
    });
  });
});
