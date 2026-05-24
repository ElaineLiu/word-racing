/**
 * Quiz Engine Tests
 * Tests the quiz logic from quiz.js
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VocabularyQuiz } from '../js/quiz.js';
import { DistractorEngine } from '../js/question-factory.js';

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

describe('DistractorEngine', () => {
  describe('duplicate word handling', () => {
    it('should not include duplicate words with same spelling', () => {
      // Simulate the real word bank issue: duplicate "after" entries
      const duplicateWords = [
        { id: 1, word: 'after', meaning_cn: '在...之后', meaning_en: 'later than', level: 2, category: 'grammar' },
        { id: 2, word: 'after', meaning_cn: '终究，毕竟', meaning_en: 'eventually', level: 2, category: 'other' },
        { id: 3, word: 'before', meaning_cn: '在...之前', meaning_en: 'earlier than', level: 2, category: 'grammar' },
        { id: 4, word: 'during', meaning_cn: '在...期间', meaning_en: 'throughout', level: 2, category: 'grammar' },
        { id: 5, word: 'since', meaning_cn: '自从', meaning_en: 'from then', level: 2, category: 'grammar' },
      ];
      const targetWord = duplicateWords[0]; // after (id:1)
      const distractors = DistractorEngine.generate(targetWord, 'PIT_BOARD', duplicateWords, 3, true);

      // Should not include meanings from duplicate "after" entry
      expect(distractors).not.toContain('终究，毕竟');
      expect(distractors).not.toContain('在...之后');
      // Should include meanings from other words
      expect(distractors.length).toBeGreaterThan(0);
    });

    it('should generate distractors without target word meaning', () => {
      const words = [
        { id: 1, word: 'speed', meaning_cn: '速度', meaning_en: 'fast', level: 2, category: 'abstract' },
        { id: 2, word: 'brake', meaning_cn: '刹车', meaning_en: 'stop', level: 2, category: 'actions' },
        { id: 3, word: 'engine', meaning_cn: '引擎', meaning_en: 'motor', level: 2, category: 'objects' },
        { id: 4, word: 'track', meaning_cn: '赛道', meaning_en: 'path', level: 2, category: 'places' },
        { id: 5, word: 'trophy', meaning_cn: '奖杯', meaning_en: 'prize', level: 2, category: 'objects' },
      ];
      const targetWord = words[0];
      const distractors = DistractorEngine.generate(targetWord, 'PIT_BOARD', words, 3, true);

      expect(distractors).not.toContain('速度');
      expect(distractors.length).toBe(3);
    });

    it('should filter by word text not just id', () => {
      // Case insensitive matching
      const words = [
        { id: 1, word: 'After', meaning_cn: '正确答案', level: 2, category: 'grammar' },
        { id: 2, word: 'after', meaning_cn: '错误干扰项', level: 2, category: 'other' },
        { id: 3, word: 'before', meaning_cn: '之前', level: 2, category: 'grammar' },
      ];
      const targetWord = words[0];
      const distractors = DistractorEngine.generate(targetWord, 'PIT_BOARD', words, 3, true);

      expect(distractors).not.toContain('错误干扰项');
    });
  });
});
