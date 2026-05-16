/**
 * Quiz Engine Tests
 * Tests the quiz logic from quiz.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VocabularyQuiz } from '../js/quiz.js';

describe('VocabularyQuiz', () => {
  let quiz;

  beforeEach(() => {
    quiz = new VocabularyQuiz();
    // Use fallback words instead of loading from network
    quiz.words = quiz._getFallbackWords();
    quiz.loaded = true;
  });

  describe('word loading', () => {
    it('should have fallback words', () => {
      expect(quiz._getFallbackWords().length).toBe(10);
    });
  });

  describe('quiz generation', () => {
    it('should generate quiz with 5 questions', () => {
      const questions = quiz.generateQuiz(5, 3);
      expect(questions.length).toBe(5);
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

    it('should add fuel coins on correct answer', () => {
      quiz.generateQuiz(5, 3);
      const q = quiz.getCurrentQuestion();
      quiz.submitAnswer(q.correctIndex);
      expect(quiz.fuelCoinsEarned).toBeGreaterThan(0);
    });
  });

  describe('wrong word tracking', () => {
    it('should track wrong words', () => {
      quiz.generateQuiz(5, 3);
      const q = quiz.getCurrentQuestion();
      quiz.submitAnswer((q.correctIndex + 1) % 4);
      expect(quiz.wrongWords.length).toBeGreaterThan(0);
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
    });
  });
});
