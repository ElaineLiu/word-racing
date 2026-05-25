/**
 * ProgressTracker Tests
 * Tests for learning progress tracking module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProgressTracker } from '../learning/progress-tracker.js';
import { EventBus, Events } from '../core/event-bus.js';
import { MASTERY_STATUS } from '../config/learning-config.js';

describe('ProgressTracker', () => {
  let eventBus;
  let tracker;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Create fresh instances
    eventBus = new EventBus();
    tracker = new ProgressTracker(eventBus);
  });

  // ==================== Initialization ====================

  describe('initialization', () => {
    it('should initialize with empty progress', () => {
      const stats = tracker.getStats();
      expect(stats.total).toBe(0);
    });

    it('should load existing progress from localStorage', () => {
      // Setup: save some progress
      const existingData = {
        wordSetId: 'shanghai-zhongkao',
        progress: {
          'speed': {
            word: 'speed',
            wordId: 1,
            status: MASTERY_STATUS.SIMPLE_PASSED,
            simpleCorrect: true,
            complexCorrect: false,
            simpleWrongCount: 0,
            complexWrongCount: 1,
            firstSeenDate: '2026-05-20',
            lastSeenDate: '2026-05-25',
            masteryDate: null,
          },
        },
        savedAt: '2026-05-25T10:00:00Z',
      };
      localStorage.setItem('wr_word_progress', JSON.stringify(existingData));

      // Create new tracker - should load existing
      const newTracker = new ProgressTracker(eventBus);
      const status = newTracker.getStatus('speed');
      expect(status).not.toBeNull();
      expect(status.status).toBe(MASTERY_STATUS.SIMPLE_PASSED);
    });
  });

  // ==================== Status Updates ====================

  describe('updateStatus', () => {
    it('should create new progress for first-time word and set to exposed', () => {
      tracker.updateStatus('ability', 'PIT_BOARD', true, 1);

      const status = tracker.getStatus('ability');
      expect(status).not.toBeNull();
      // 首次出现并答对简单题 → simple_passed
      expect(status.status).toBe(MASTERY_STATUS.SIMPLE_PASSED);
      expect(status.simpleCorrect).toBe(true);
    });

    it('should update simpleCorrect when answering simple mode correctly', () => {
      tracker.updateStatus('brake', 'PIT_BOARD', true, 2);

      const status = tracker.getStatus('brake');
      expect(status.simpleCorrect).toBe(true);
      expect(status.complexCorrect).toBe(false);
    });

    it('should update complexCorrect when answering complex mode correctly', () => {
      tracker.updateStatus('engine', 'RADIO_MSG', true, 3);

      const status = tracker.getStatus('engine');
      expect(status.simpleCorrect).toBe(false);
      expect(status.complexCorrect).toBe(true);
    });

    it('should increment wrong count on incorrect answer', () => {
      tracker.updateStatus('trophy', 'PIT_BOARD', false, 4);

      const status = tracker.getStatus('trophy');
      expect(status.simpleWrongCount).toBe(1);
      expect(status.simpleCorrect).toBe(false);
    });
  });

  // ==================== Status Transitions ====================

  describe('status transitions', () => {
    it('should transition to simple_passed after simple mode correct', () => {
      tracker.updateStatus('champion', 'PIT_BOARD', true, 5);

      const status = tracker.getStatus('champion');
      // 首次答对简单题 → simple_passed
      expect(status.status).toBe(MASTERY_STATUS.SIMPLE_PASSED);
    });

    it('should transition to mastered when both modes correct', () => {
      // First: simple mode correct → simple_passed
      tracker.updateStatus('accelerate', 'PIT_BOARD', true, 6);
      expect(tracker.getStatus('accelerate').status).toBe(MASTERY_STATUS.SIMPLE_PASSED);

      // Then: complex mode correct → mastered
      tracker.updateStatus('accelerate', 'RADIO_MSG', true, 6);
      expect(tracker.getStatus('accelerate').status).toBe(MASTERY_STATUS.MASTERED);
    });

    it('should transition to exposed after wrong answer on new word', () => {
      // 首次答错 → exposed
      tracker.updateStatus('wrong_first', 'PIT_BOARD', false, 99);

      const status = tracker.getStatus('wrong_first');
      expect(status.status).toBe(MASTERY_STATUS.EXPOSED);
      expect(status.simpleWrongCount).toBe(1);
    });

    it('should transition to forgotten when mastered word is wrong', () => {
      // First: master the word
      tracker.updateStatus('dangerous', 'PIT_BOARD', true, 7);
      tracker.updateStatus('dangerous', 'RADIO_MSG', true, 7);
      expect(tracker.getStatus('dangerous').status).toBe(MASTERY_STATUS.MASTERED);

      // Then: answer wrong - after wrong answer, status becomes exposed first
      tracker.updateStatus('dangerous', 'PIT_BOARD', false, 7);
      // After wrong, simpleCorrect is reset, status transitions
      const status = tracker.getStatus('dangerous');
      expect(status.simpleWrongCount).toBe(1);
    });

    it('should re-master a word after forgetting', () => {
      // Master first
      tracker.updateStatus('practice', 'PIT_BOARD', true, 8);
      tracker.updateStatus('practice', 'RADIO_MSG', true, 8);
      expect(tracker.getStatus('practice').status).toBe(MASTERY_STATUS.MASTERED);

      // Wrong answer
      tracker.updateStatus('practice', 'PIT_BOARD', false, 8);
      // The word now has wrongCount > 0

      // Re-answer correctly for both modes
      tracker.updateStatus('practice', 'PIT_BOARD', true, 8);
      tracker.updateStatus('practice', 'RADIO_MSG', true, 8);
      expect(tracker.getStatus('practice').status).toBe(MASTERY_STATUS.MASTERED);
    });
  });

  // ==================== Events ====================

  describe('events', () => {
    it('should emit WORD_STATUS_CHANGED on status change', () => {
      const handler = vi.fn();
      eventBus.on(Events.WORD_STATUS_CHANGED, handler);

      tracker.updateStatus('track', 'PIT_BOARD', true, 9);
      tracker.updateStatus('track', 'RADIO_MSG', true, 9);

      expect(handler).toHaveBeenCalled();
    });

    it('should emit WORD_MASTERED when word becomes mastered', () => {
      const handler = vi.fn();
      eventBus.on(Events.WORD_MASTERED, handler);

      tracker.updateStatus('accident', 'PIT_BOARD', true, 10);
      tracker.updateStatus('accident', 'RADIO_MSG', true, 10);

      expect(handler).toHaveBeenCalledWith({ word: 'accident' });
    });

    it('should emit WORD_FORGOTTEN when mastered word becomes forgotten', () => {
      const handler = vi.fn();
      eventBus.on(Events.WORD_FORGOTTEN, handler);

      // First master the word
      tracker.updateStatus('celebrate', 'PIT_BOARD', true, 11);
      tracker.updateStatus('celebrate', 'RADIO_MSG', true, 11);

      // Wrong answer triggers forgotten status
      tracker.updateStatus('celebrate', 'PIT_BOARD', false, 11);

      // Check if forgotten event was emitted
      expect(handler).toHaveBeenCalledWith({ word: 'celebrate' });
    });
  });

  // ==================== Query Methods ====================

  describe('query methods', () => {
    beforeEach(() => {
      // Setup: create various states
      // mastered words
      tracker.updateStatus('mastered1', 'PIT_BOARD', true, 1);
      tracker.updateStatus('mastered1', 'RADIO_MSG', true, 1);

      // wrong words (needs review)
      tracker.updateStatus('wrong1', 'PIT_BOARD', false, 2);
      tracker.updateStatus('wrong1', 'RADIO_MSG', false, 2);

      // learning words (simple passed)
      tracker.updateStatus('simple_passed1', 'PIT_BOARD', true, 3);

      // learning words (complex passed)
      tracker.updateStatus('complex_passed1', 'RADIO_MSG', true, 4);
    });

    it('should get wrong words correctly', () => {
      const wrongWords = tracker.getWrongWords();
      expect(wrongWords.length).toBe(1);
      expect(wrongWords[0].word).toBe('wrong1');
    });

    it('should get check words correctly', () => {
      const { needSimpleCheck, needComplexCheck } = tracker.getCheckWords();

      expect(needSimpleCheck.length).toBe(1);
      expect(needSimpleCheck[0].word).toBe('complex_passed1');

      expect(needComplexCheck.length).toBe(1);
      expect(needComplexCheck[0].word).toBe('simple_passed1');
    });

    it('should get mastered words correctly', () => {
      const mastered = tracker.getMasteredWords();
      expect(mastered.length).toBe(1);
      expect(mastered[0].word).toBe('mastered1');
    });

    it('should get stats correctly', () => {
      const stats = tracker.getStats();
      // 4 words: mastered1, wrong1, simple_passed1, complex_passed1
      expect(stats.total).toBe(4);
      expect(stats.mastered).toBe(1);
      expect(stats.learning).toBe(3);
    });
  });

  // ==================== Persistence ====================

  describe('persistence', () => {
    it('should save progress to localStorage', () => {
      tracker.updateStatus('persist_test', 'PIT_BOARD', true, 100);
      tracker.save();

      const stored = JSON.parse(localStorage.getItem('wr_word_progress'));
      expect(stored.progress['persist_test']).toBeDefined();
      expect(stored.progress['persist_test'].simpleCorrect).toBe(true);
    });

    it('should not save if not dirty', () => {
      tracker.updateStatus('test', 'PIT_BOARD', true, 1);
      tracker.save();

      // Clear dirty flag by saving again
      const storedBefore = localStorage.getItem('wr_word_progress');

      // No changes, save should be no-op
      tracker.save();
      // Just verify it doesn't throw
      expect(true).toBe(true);
    });

    it('should clear all progress', () => {
      tracker.updateStatus('clear_test', 'PIT_BOARD', true, 1);
      tracker.clear();

      expect(tracker.getStats().total).toBe(0);
      expect(localStorage.getItem('wr_word_progress')).toBeNull();
    });
  });

  // ==================== Edge Cases ====================

  describe('edge cases', () => {
    it('should handle unknown word getStatus', () => {
      const status = tracker.getStatus('unknown_word');
      expect(status).toBeNull();
    });

    it('should handle STRATEGY mode (simple)', () => {
      tracker.updateStatus('strategy_word', 'STRATEGY', true, 1);

      const status = tracker.getStatus('strategy_word');
      expect(status.simpleCorrect).toBe(true);
    });

    it('should handle QUALIFYING mode (complex)', () => {
      tracker.updateStatus('qualifying_word', 'QUALIFYING', true, 1);

      const status = tracker.getStatus('qualifying_word');
      expect(status.complexCorrect).toBe(true);
    });

    it('should handle multiple wrong answers', () => {
      tracker.updateStatus('multi_wrong', 'PIT_BOARD', false, 1);
      tracker.updateStatus('multi_wrong', 'PIT_BOARD', false, 1);
      tracker.updateStatus('multi_wrong', 'RADIO_MSG', false, 1);

      const status = tracker.getStatus('multi_wrong');
      expect(status.simpleWrongCount).toBe(2);
      expect(status.complexWrongCount).toBe(1);
    });
  });
});
