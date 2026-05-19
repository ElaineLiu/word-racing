/**
 * QuizView - Quiz page with question display, answer handling, and results
 */

import { BaseView } from './base-view.js';
import { Events } from '../core/event-bus.js';

export class QuizView extends BaseView {
  #game;
  #quiz;

  constructor(eventBus, game) {
    super('page-quiz', eventBus);
    this.#game = game;
    this.#quiz = game.quiz;
  }

  mount() {
    super.mount();
    this.#setupEventListeners();
    this.#subscribeToEvents();
  }

  render() {
    // Initial state - question area visible, complete hidden
    this.show('#quiz-question-area');
    this.hide('#quiz-complete');
  }

  showQuestion() {
    const q = this.#quiz.getCurrentQuestion();
    if (!q) {
      this.showComplete();
      return;
    }

    const current = Math.min(this.#quiz.currentIndex, this.#quiz.currentQuiz.length - 1);
    const total = this.#quiz.currentQuiz.length;

    // Mode label and hint
    const modeLabel = q.modeLabel || q.mode || 'QUIZ';
    this.setText('#quiz-progress', `Q${current + 1}/${total} | ${modeLabel} | Correct: ${this.#quiz.correctCount}`);

    const isChallenge = this.#quiz.quizMode === 'challenge';
    const nitroHint = isChallenge
      ? 'Earn Fuel or Gear Coins for correct answers'
      : 'Earn Fuel Coins for correct answers';
    this.setText('#quiz-nitro-hint', nitroHint);

    // Render question content
    this.#renderQuestionContent(q, isChallenge);

    // Render options
    this.#renderOptions(q);
  }

  #renderQuestionContent(q, isChallenge) {
    // For review questions, use the original mode for rendering
    const renderMode = q.isReview ? q.originalMode : q.mode;
    const showSentence = !isChallenge || renderMode === 'PIT_BOARD';

    // Clear fields
    this.setText('#quiz-word', '');
    this.setText('#quiz-meaning-en', '');
    this.setText('#quiz-sentence', '');

    const sentenceEl = this.$('#quiz-sentence');
    if (sentenceEl) sentenceEl.style.fontStyle = '';

    switch (renderMode) {
      case 'PIT_BOARD':
        this.setText('#quiz-word', q.correctWord || '');
        this.setText('#quiz-meaning-en', q.promptSub || '');
        if (showSentence && q.sentence) {
          this.setText('#quiz-sentence', `"${q.sentence}"`);
          if (sentenceEl) sentenceEl.style.fontStyle = 'italic';
        }
        break;

      case 'RADIO_MSG':
        this.setText('#quiz-word', q.prompt || '');
        this.setText('#quiz-meaning-en', q.promptSub || '');
        if (showSentence && q.sentence && q.sentence !== q.prompt) {
          this.setText('#quiz-sentence', `"${q.sentence}"`);
          if (sentenceEl) sentenceEl.style.fontStyle = 'italic';
        }
        break;

      case 'STRATEGY':
        this.setText('#quiz-word', q.prompt || '');
        this.setText('#quiz-meaning-en', q.promptSub || q.promptCn || '');
        if (showSentence && q.sentence) {
          this.setText('#quiz-sentence', `"${q.sentence}"`);
          if (sentenceEl) sentenceEl.style.fontStyle = 'italic';
        }
        break;

      case 'QUALIFYING':
        this.setText('#quiz-word', q.prompt || '');
        this.setText('#quiz-meaning-en', q.promptCn || q.promptSub || '');
        break;

      default:
        this.setText('#quiz-word', q.correctWord || q.word || q.prompt || '');
        this.setText('#quiz-meaning-en', q.promptSub || q.meaning_en || q.meaning || '');
        if (showSentence && q.sentence) {
          this.setText('#quiz-sentence', `"${q.sentence}"`);
          if (sentenceEl) sentenceEl.style.fontStyle = 'italic';
        }
    }
  }

  #renderOptions(q) {
    const container = this.$('#quiz-options');
    if (!container) return;

    container.innerHTML = '';
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => this.#handleAnswer(idx));
      container.appendChild(btn);
    });
  }

  #handleAnswer(idx) {
    const result = this.#quiz.submitAnswer(idx);
    if (!result) return;

    // Highlight buttons
    const buttons = this.$$('.quiz-option');
    buttons.forEach((btn, i) => {
      btn.classList.add('disabled');
      if (i === result.correctIndex) btn.classList.add('correct');
      if (i === idx && !result.correct) btn.classList.add('wrong');
    });

    // Emit answer event
    this.emit(Events.QUIZ_ANSWER, { correct: result.correct, question: result });

    // Move to next question
    setTimeout(() => {
      if (this.#quiz.isComplete()) {
        this.showComplete();
      } else {
        this.showQuestion();
      }
    }, 900);
  }

  showComplete() {
    const results = this.#quiz.getResults();
    this.#game.onQuizComplete();

    this.hide('#quiz-question-area');
    this.show('#quiz-complete');

    // Display results
    this.setText('#quiz-result-accuracy', `Accuracy: ${results.accuracy}% (${results.correctCount}/${results.totalQuestions})`);
    this.setText('#quiz-result-fuel', `Fuel Coins: +${results.fuelCoinsEarned}`);
    this.setText('#quiz-result-gear', `Gear Coins: +${results.gearCoinsEarned}`);

    if (results.wrong.length > 0) {
      this.setText('#quiz-result-wrong', 'Wrong: ' + results.wrong.map(w => `${w.word}=${w.meaning}`).join(', '));
    } else {
      this.setText('#quiz-result-wrong', 'Perfect! All correct!');
    }

    if (results.nitroCharges > 0) {
      this.setText('#quiz-result-nitro', `N2O Nitro x${results.nitroCharges} Ready!`);
    } else {
      this.setText('#quiz-result-nitro', 'No nitro this time. Try harder next race!');
    }

    this.#renderLapSelector();

    this.emit(Events.QUIZ_COMPLETE, results);
  }

  #renderLapSelector() {
    const container = this.$('#quiz-lap-select');
    if (!container) return;

    container.innerHTML = '';

    const label = document.createElement('span');
    label.textContent = 'Laps: ';
    label.style.marginRight = '8px';
    label.style.color = 'var(--text-secondary)';
    container.appendChild(label);

    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = 'lap-btn' + (i === this.#game.selectedLaps ? ' active' : '');
      btn.addEventListener('click', () => {
        this.#game.setLapCount(i);
        this.#renderLapSelector();
      });
      container.appendChild(btn);
    }
  }

  #setupEventListeners() {
    // Quiz type selector
    this.onClick('#quiz-type-simple', () => {
      this.#quiz.quizMode = 'basic';
      this.#quiz.maxLevel = 3;
      this.addClass('#quiz-type-simple', 'active');
      this.removeClass('#quiz-type-complex', 'active');
      this.#quiz.generateQuiz(5, 3);
      this.showQuestion();
    });

    this.onClick('#quiz-type-complex', () => {
      this.#quiz.quizMode = 'challenge';
      this.#quiz.maxLevel = 4;
      this.addClass('#quiz-type-complex', 'active');
      this.removeClass('#quiz-type-simple', 'active');
      this.#quiz.generateQuiz(5, 4);
      this.showQuestion();
    });

    // Complete screen buttons
    this.onClick('#quiz-start-btn', () => {
      if (this.#game.fuel <= 0) {
        alert('Insufficient fuel! Buy fuel in the shop first.');
        return;
      }
      this.#game.continueToRace();
      this.emit(Events.RACE_START, { source: 'quiz' });
    });

    this.onClick('#quiz-shop-btn', () => {
      this.emit(Events.VIEW_CHANGE, { view: 'shop' });
    });

    this.onClick('#quiz-restart-btn', () => {
      this.show('#quiz-question-area');
      this.hide('#quiz-complete');
      this.#game.startNewQuiz();
      this.showQuestion();
    });
  }

  #subscribeToEvents() {
    this.subscribe(Events.QUIZ_START, () => {
      if (this.isMounted()) {
        this.show('#quiz-question-area');
        this.hide('#quiz-complete');
        this.showQuestion();
      }
    });
  }
}
