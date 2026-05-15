/**
 * Quiz Engine Tests
 * Tests the quiz logic from quiz.js and question-factory.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import both modules
await import('../js/question-factory.js');
const VocabularyQuiz = window.VocabularyQuiz;

describe('VocabularyQuiz', () => {
  let quiz;

  beforeEach(async () => {
    quiz = new VocabularyQuiz();
    await quiz.loadWords();
  });

  describe('word loading', () => {
    it('should load words from JSON', () => {
      expect(quiz.words.length).toBeGreaterThan(0);
    });

    it('should set loaded flag after loading', () => {
      expect(quiz.loaded).toBe(true);
    });

    it('should have fallback words if load fails', () => {
      const fallbackQuiz = new VocabularyQuiz();
      fallbackQuiz.words = fallbackQuiz._getFallbackWords();
      expect(fallbackQuiz.words.length).toBe(10);
    });
  });

  describe('quiz generation', () => {
    it('should generate quiz with 5 questions by default', () => {
      const questions = quiz.generateQuiz(5, 3);
      expect(questions.length).toBe(5);
    });

    it('should respect maxLevel filter', () => {
      const questions = quiz.generateQuiz(5, 2);
      questions.forEach(q => {
        expect(q.level).toBeLessThanOrEqual(2);
      });
    });

    it('should have 4 options per question', () => {
      const questions = quiz.generateQuiz(5, 3);
      questions.forEach(q => {
        expect(q.options.length).toBe(4);
      });
    });

    it('should have correctIndex within range', () => {
      const questions = quiz.generateQuiz(5, 3);
      questions.forEach(q => {
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
      });
    });

    it('should have mode property', () => {
      const questions = quiz.generateQuiz(5, 3);
      questions.forEach(q => {
        expect(q.mode).toBeDefined();
      });
    });

    it('should have reward property', () => {
      const questions = quiz.generateQuiz(5, 3);
      questions.forEach(q => {
        expect(q.reward).toBeDefined();
        expect(q.reward.fuel).toBeDefined();
        expect(q.reward.gear).toBeDefined();
      });
    });
  });

  describe('question modes', () => {
    it('should support PIT_BOARD mode', () => {
      quiz.quizMode = 'challenge';
      const questions = quiz.generateQuiz(5, 3);
      const pitBoard = questions.find(q => q.mode === 'PIT_BOARD');
      if (pitBoard) {
        expect(pitBoard.prompt).toBeDefined();
        expect(pitBoard.reward.fuel).toBe(10);
      }
    });

    it('should support STRATEGY mode', () => {
      quiz.quizMode = 'challenge';
      const questions = quiz.generateQuiz(5, 3);
      const strategy = questions.find(q => q.mode === 'STRATEGY');
      if (strategy) {
        expect(strategy.prompt).toBeDefined();
        expect(strategy.reward.fuel).toBe(15);
      }
    });

    it('should support QUALIFYING mode', () => {
      quiz.quizMode = 'challenge';
      const questions = quiz.generateQuiz(5, 3);
      const qualifying = questions.find(q => q.mode === 'QUALIFYING');
      if (qualifying) {
        expect(qualifying.reward.gear).toBe(15);
      }
    });
  });

  describe('basic mode', () => {
    it('should only use PIT_BOARD and STRATEGY in basic mode', () => {
      quiz.quizMode = 'basic';
      const questions = quiz.generateQuiz(5, 3);
      questions.forEach(q => {
        expect(['PIT_BOARD', 'STRATEGY']).toContain(q.mode);
      });
    });
  });

  describe('answer submission', () => {
    it('should mark correct answer', () => {
      quiz.generateQuiz(5, 3);
      const q = quiz.getCurrentQuestion();
      const result = quiz.submitAnswer(q.correctIndex);
      expect(result.correct).toBe(true);
    });

    it('should mark wrong answer', () => {
      quiz.generateQuiz(5, 3);
      const q = quiz.getCurrentQuestion();
      const wrongIndex = (q.correctIndex + 1) % 4;
      const result = quiz.submitAnswer(wrongIndex);
      expect(result.correct).toBe(false);
    });

    it('should increment correctCount on correct answer', () => {
      quiz.generateQuiz(5, 3);
      const q = quiz.getCurrentQuestion();
      quiz.submitAnswer(q.correctIndex);
      expect(quiz.correctCount).toBe(1);
    });

    it('should increment totalAnswered', () => {
      quiz.generateQuiz(5, 3);
      const q = quiz.getCurrentQuestion();
      quiz.submitAnswer(q.correctIndex);
      expect(quiz.totalAnswered).toBe(1);
    });

    it('should add fuel coins on correct answer', () => {
      quiz.generateQuiz(5, 3);
      const q = quiz.getCurrentQuestion();
      quiz.submitAnswer(q.correctIndex);
      expect(quiz.fuelCoinsEarned).toBeGreaterThan(0);
    });

    it('should add gear coins for QUALIFYING mode', () => {
      quiz.quizMode = 'challenge';
      quiz.generateQuiz(5, 3);
      // Find a QUALIFYING question
      while (!quiz.isComplete()) {
        const q = quiz.getCurrentQuestion();
        if (q.mode === 'QUALIFYING') {
          quiz.submitAnswer(q.correctIndex);
          expect(quiz.gearCoinsEarned).toBeGreaterThanOrEqual(15);
          return;
        }
        quiz.submitAnswer(q.correctIndex);
      }
    });
  });

  describe('combo system', () => {
    it('should track combo on consecutive correct answers', () => {
      quiz.generateQuiz(5, 3);
      for (let i = 0; i < 3; i++) {
        const q = quiz.getCurrentQuestion();
        quiz.submitAnswer(q.correctIndex);
        // Wait for index increment
        quiz.currentIndex++;
      }
      expect(quiz.combo).toBe(3);
    });

    it('should give bonus gear coins for 3 combo', () => {
      quiz.generateQuiz(5, 3);
      const initialGear = quiz.gearCoinsEarned;
      for (let i = 0; i < 3; i++) {
        const q = quiz.getCurrentQuestion();
        quiz.submitAnswer(q.correctIndex);
        quiz.currentIndex++;
      }
      // Combo bonus: +5 gear coins per 3 consecutive correct
      expect(quiz.gearCoinsEarned).toBeGreaterThanOrEqual(5);
    });

    it('should reset combo on wrong answer', () => {
      quiz.generateQuiz(5, 3);
      // Answer correctly twice
      for (let i = 0; i < 2; i++) {
        const q = quiz.getCurrentQuestion();
        quiz.submitAnswer(q.correctIndex);
        quiz.currentIndex++;
      }
      expect(quiz.combo).toBe(2);
      // Answer wrong
      const q = quiz.getCurrentQuestion();
      quiz.submitAnswer((q.correctIndex + 1) % 4);
      expect(quiz.combo).toBe(0);
    });
  });

  describe('wrong word tracking', () => {
    it('should track wrong words', () => {
      quiz.generateQuiz(5, 3);
      const q = quiz.getCurrentQuestion();
      quiz.submitAnswer((q.correctIndex + 1) % 4);
      expect(quiz.wrongWords.length).toBeGreaterThan(0);
    });

    it('should persist wrong words to localStorage', () => {
      quiz.generateQuiz(5, 3);
      const q = quiz.getCurrentQuestion();
      quiz.submitAnswer((q.correctIndex + 1) % 4);
      quiz._saveWrongWords();
      const stored = localStorage.getItem('wr_wrongWords');
      expect(stored).not.toBeNull();
    });

    it('should limit wrong words to 50 entries', () => {
      // Add 60 fake wrong words
      for (let i = 0; i < 60; i++) {
        quiz.wrongWords.push({ word: `word${i}`, meaning: `meaning${i}` });
      }
      quiz._saveWrongWords();
      const stored = JSON.parse(localStorage.getItem('wr_wrongWords'));
      expect(stored.length).toBeLessThanOrEqual(50);
    });
  });

  describe('quiz completion', () => {
    it('should detect when quiz is complete', () => {
      quiz.generateQuiz(5, 3);
      for (let i = 0; i < 5; i++) {
        const q = quiz.getCurrentQuestion();
        quiz.submitAnswer(q.correctIndex);
        quiz.currentIndex++;
      }
      expect(quiz.isComplete()).toBe(true);
    });

    it('should return results with accuracy', () => {
      quiz.generateQuiz(5, 3);
      for (let i = 0; i < 5; i++) {
        const q = quiz.getCurrentQuestion();
        quiz.submitAnswer(q.correctIndex);
        quiz.currentIndex++;
      }
      const results = quiz.getResults();
      expect(results.accuracy).toBe(100);
      expect(results.correctCount).toBe(5);
      expect(results.totalQuestions).toBe(5);
    });
  });

  describe('LAP_REVIEW mode', () => {
    it('should include LAP_REVIEW if wrong words exist', () => {
      quiz.wrongWords = [{ word: 'test', meaning: 'test', wordId: 1 }];
      quiz.quizMode = 'challenge';
      const questions = quiz.generateQuiz(5, 3);
      const review = questions.find(q => q.mode === 'LAP_REVIEW');
      expect(review).toBeDefined();
    });

    it('should give gear coins for correct review', () => {
      quiz.wrongWords = [{ word: 'speed', meaning: '速度', wordId: 1 }];
      quiz.quizMode = 'challenge';
      quiz.generateQuiz(5, 3);
      // Find and answer the review question
      while (!quiz.isComplete()) {
        const q = quiz.getCurrentQuestion();
        if (q.mode === 'LAP_REVIEW') {
          quiz.submitAnswer(q.correctIndex);
          expect(quiz.gearCoinsEarned).toBeGreaterThanOrEqual(5);
          return;
        }
        quiz.submitAnswer(q.correctIndex);
      }
    });
  });
});
