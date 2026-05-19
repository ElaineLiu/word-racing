/**
 * QuizEngine - Coordinates quiz flow and rewards
 * Extracted from Game class for separation of concerns
 */

import { Events } from '../core/event-bus.js';
import { ECONOMY } from '../config/game-config.js';

export class QuizEngine {
  #eventBus;
  #quiz;
  #results = null;

  constructor(eventBus, quiz) {
    this.#eventBus = eventBus;
    this.#quiz = quiz;
  }

  /**
   * Start a new quiz round
   * @param {number} count - Number of questions
   * @param {number} maxLevel - Max difficulty level
   * @returns {Array} Quiz questions
   */
  startQuiz(count = 5, maxLevel = 3) {
    this.#results = null;
    this.#eventBus.emit(Events.QUIZ_START, { count, maxLevel });
    return this.#quiz.generateQuiz(count, maxLevel);
  }

  /**
   * Submit an answer
   * @param {number} selectedIndex
   * @returns {Object|null} Question result
   */
  submitAnswer(selectedIndex) {
    const result = this.#quiz.submitAnswer(selectedIndex);
    if (result) {
      this.#eventBus.emit(Events.QUIZ_ANSWER, {
        correct: result.correct,
        question: result,
      });
    }
    return result;
  }

  /**
   * Get current question
   * @returns {Object|null}
   */
  getCurrentQuestion() {
    return this.#quiz.getCurrentQuestion();
  }

  /**
   * Check if quiz is complete
   * @returns {boolean}
   */
  isComplete() {
    return this.#quiz.isComplete();
  }

  /**
   * Complete quiz and calculate rewards
   * @returns {Object} Quiz results
   */
  completeQuiz() {
    this.#results = this.#quiz.getResults();
    this.#eventBus.emit(Events.QUIZ_COMPLETE, this.#results);
    return this.#results;
  }

  /**
   * Get last quiz results
   * @returns {Object|null}
   */
  getResults() {
    return this.#results;
  }

  /**
   * Get quiz mode
   * @returns {string}
   */
  getMode() {
    return this.#quiz.quizMode;
  }

  /**
   * Set quiz mode
   * @param {string} mode - 'basic' | 'challenge'
   */
  setMode(mode) {
    this.#quiz.quizMode = mode;
  }

  /**
   * Get wrong word count
   * @returns {number}
   */
  getWrongWordCount() {
    return this.#quiz.getWrongWordCount();
  }

  /**
   * Get underlying quiz instance (for direct access if needed)
   * @returns {VocabularyQuiz}
   */
  getQuiz() {
    return this.#quiz;
  }
}
