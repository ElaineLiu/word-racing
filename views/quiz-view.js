/**
 * QuizView - Quiz page with question display, answer handling, and results
 */

import { BaseView } from './base-view.js';
import { Events } from '../core/event-bus.js';
import { LEARNING } from '../config/learning-config.js';

export class QuizView extends BaseView {
  #game;
  #quiz;
  #learningController;
  #isProcessingAnswer = false; // Prevent concurrent answer processing

  constructor(eventBus, game, learningController = null) {
    super('page-quiz', eventBus);
    this.#game = game;
    this.#quiz = game.quiz;
    this.#learningController = learningController;
  }

  mount() {
    super.mount();
    this.#setupEventListeners();
    this.#subscribeToEvents();

    // 同步按钮状态与当前偏好
    this.#syncModeButtons();

    // 初始化题目
    this.#initializeQuiz();
  }

  /**
   * 初始化答题页面
   */
  #initializeQuiz() {
    if (!this.#learningController) return;

    // 检查当前是否有有效题目（用户已主动开始或刚选择继续/重开）
    const currentQuestion = this.#learningController.getCurrentQuestion();
    if (currentQuestion && currentQuestion.options) {
      this.showQuestion();
      return;
    }

    // 方案 B：只有进入 Quiz 页时才提示是否继续未完成会话，首页初始化不弹窗
    if (this.#learningController.hasUnfinishedSession?.()) {
      const prompted = this.#learningController.promptResumeQuiz?.({
        onContinue: () => this.showQuestion(),
        onRestart: () => this.showQuestion(),
      });
      if (prompted) return;
    }

    // 自动开始新题目
    this.#startNewQuiz();
  }

  /**
   * 同步 Basic/Advanced 按钮状态与当前偏好
   */
  #syncModeButtons() {
    const preference = this.#learningController?.getModePreference?.() || 'auto';
    const simpleBtn = this.$('#quiz-type-simple');
    const complexBtn = this.$('#quiz-type-complex');

    if (preference === 'simple') {
      simpleBtn?.classList.add('active');
      complexBtn?.classList.remove('active');
    } else if (preference === 'complex') {
      complexBtn?.classList.add('active');
      simpleBtn?.classList.remove('active');
    } else {
      // auto 模式：默认选中 Basic
      simpleBtn?.classList.add('active');
      complexBtn?.classList.remove('active');
      this.#learningController?.setModePreference('simple');
    }
  }

  render() {
    // Initial state - question area visible, complete hidden
    this.show('#quiz-question-area');
    this.hide('#quiz-complete');
  }

  showQuestion() {
    // Hide learning panel when showing new question
    this.hide('#quiz-learn-panel');

    // Remove class to center layout
    const layout = this.$('#quiz-layout');
    if (layout) layout.classList.remove('has-learn-panel');

    // 优先使用 LearningController
    let q;
    let current;
    let total;
    let correctCount;

    if (this.#learningController) {
      q = this.#learningController.getCurrentQuestion();
      if (!q) {
        this.showComplete();
        return;
      }
      // 验证题目有效性
      if (!q.options || !Array.isArray(q.options)) {
        console.error('[QuizView] Invalid question: missing options', q);
        this.showComplete();
        return;
      }
      const status = this.#learningController.getSessionStatus() || {
        answeredCount: 0,
        totalQuestions: q.options ? LEARNING.QUIZ_QUESTION_COUNT : 0,
        correctCount: 0,
      };
      current = status.answeredCount;
      total = status.totalQuestions;
      correctCount = status.correctCount;
    } else {
      q = this.#quiz.getCurrentQuestion();
      if (!q) {
        this.showComplete();
        return;
      }
      current = Math.min(this.#quiz.currentIndex, this.#quiz.currentQuiz.length - 1);
      total = this.#quiz.currentQuiz.length;
      correctCount = this.#quiz.correctCount;
    }

    // Mode label and hint
    const modeLabel = q.modeLabel || q.mode || 'QUIZ';
    const quizNum = this.#learningController?.getSessionStatus()?.currentQuiz || 1;
    this.setText('#quiz-progress', `Quiz ${quizNum} | Q${current + 1}/${total} | ${modeLabel} | Correct: ${correctCount}`);

    const isChallenge = this.#quiz.quizMode === 'challenge';
    const nitroHint = isChallenge
      ? 'Earn Fuel or Gear Coins for correct answers'
      : 'Earn Fuel Coins for correct answers';
    this.setText('#quiz-nitro-hint', nitroHint);

    // Render question content
    this.#renderQuestionContent(q, isChallenge);

    // Render options
    this.#renderOptions(q);

    // Update navigation buttons
    this.#updateNavButtons();
  }

  #updateNavButtons() {
    const prevBtn = this.$('#quiz-prev-btn');
    const nextBtn = this.$('#quiz-next-btn');

    // LearningController 不支持前进后退
    if (this.#learningController) {
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
    } else {
      if (prevBtn) {
        prevBtn.disabled = !this.#quiz.canGoPrevious();
      }
      if (nextBtn) {
        nextBtn.disabled = !this.#quiz.canGoNext();
      }
    }
  }

  #showLearningPanel(q) {
    this.setText('#quiz-learn-word', q.correctWord || q.word || '');
    this.setText('#quiz-learn-phonetic', q.phonetic || '');
    this.setText('#quiz-learn-meaning', `${q.correctMeaning || q.meaning || ''}  |  ${q.meaningEn || ''}`);
    this.setText('#quiz-learn-sentence', q.sentence || '');
    this.setText('#quiz-learn-sentence-cn', q.sentence_cn || '');

    // Add class to shift layout
    const layout = this.$('#quiz-layout');
    if (layout) layout.classList.add('has-learn-panel');

    this.show('#quiz-learn-panel');
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

      // If question already answered, show result state
      if (q.answered) {
        btn.classList.add('disabled');
        if (idx === q.correctIndex) btn.classList.add('correct');
        if (idx === q.selected && !q.correct) btn.classList.add('wrong');
      } else {
        btn.addEventListener('click', () => this.#handleAnswer(idx));
      }

      container.appendChild(btn);
    });
  }

  #handleAnswer(idx) {
    // Debug logging
    console.log('[QuizView] #handleAnswer called', {
      idx,
      isProcessing: this.#isProcessingAnswer,
      hasLearningController: !!this.#learningController,
      timestamp: Date.now()
    });

    // Prevent concurrent processing
    if (this.#isProcessingAnswer) {
      console.warn('[QuizView] Already processing answer, ignoring click');
      return;
    }

    let result;

    // 优先使用 LearningController
    if (this.#learningController) {
      result = this.#learningController.submitAnswer(idx);
      if (!result) return;
    } else {
      result = this.#quiz.submitAnswer(idx);
      if (!result) return;
    }

    // Set processing flag
    this.#isProcessingAnswer = true;

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
      const isComplete = this.#learningController
        ? this.#learningController.isQuizComplete()
        : this.#quiz.isComplete();

      if (isComplete) {
        this.showComplete();
      } else {
        this.showQuestion();
      }

      // Reset processing flag
      this.#isProcessingAnswer = false;
    }, 900);
  }

  showComplete() {
    let results;

    // 优先使用 LearningController
    if (this.#learningController) {
      results = this.#learningController.completeQuiz();
      if (!results) {
        // Fallback to quiz results
        results = this.#quiz.getResults();
      } else {
        // Sync coins to game object
        this.#game.fuelCoins = (this.#game.fuelCoins || 0) + (results.fuelCoins || 0);
        this.#game.gearCoins = (this.#game.gearCoins || 0) + (results.gearCoins || 0);
      }
    } else {
      results = this.#quiz.getResults();
    }

    this.#game.onQuizComplete();

    this.hide('#quiz-question-area');
    this.show('#quiz-complete');

    // Normalize result fields (LearningController uses fuelCoins, quiz uses fuelCoinsEarned)
    const fuelCoins = results.fuelCoins ?? results.fuelCoinsEarned ?? 0;
    const gearCoins = results.gearCoins ?? results.gearCoinsEarned ?? 0;

    // Display results
    this.setText('#quiz-result-accuracy', `Accuracy: ${results.accuracy}% (${results.correctCount}/${results.totalQuestions})`);
    this.setText('#quiz-result-fuel', `Fuel Coins: +${fuelCoins}`);
    this.setText('#quiz-result-gear', `Gear Coins: +${gearCoins}`);

    // Combo result
    const comboEl = document.getElementById('quiz-result-combo');
    if (comboEl) {
      if (results.maxCombo >= 3) {
        comboEl.style.display = 'block';
        comboEl.textContent = `Max Combo: ${results.maxCombo}x (+${results.comboReward?.gear || 0} Gear)`;
      } else {
        comboEl.style.display = 'none';
      }
    }

    if (results.wrongCount > 0) {
      this.setText('#quiz-result-wrong', `Wrong: ${results.wrongCount} words need review`);
    } else {
      this.setText('#quiz-result-wrong', 'Perfect! All correct!');
    }

    // Hide nitro text since nitro is now earned through shop
    this.hide('#quiz-result-nitro');

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

      // 设置题型偏好
      if (this.#learningController) {
        this.#learningController.setModePreference('simple');
      }

      this.#startNewQuiz(3);
    });

    this.onClick('#quiz-type-complex', () => {
      this.#quiz.quizMode = 'challenge';
      this.#quiz.maxLevel = 4;
      this.addClass('#quiz-type-complex', 'active');
      this.removeClass('#quiz-type-simple', 'active');

      // 设置题型偏好
      if (this.#learningController) {
        this.#learningController.setModePreference('complex');
      }

      this.#startNewQuiz(4);
    });

    // Navigation buttons
    this.onClick('#quiz-prev-btn', () => {
      if (this.#quiz.goToPrevious()) {
        this.showQuestion();
      }
    });

    this.onClick('#quiz-next-btn', () => {
      if (this.#quiz.goToNext()) {
        this.showQuestion();
      }
    });

    // "I don't know" button
    this.onClick('#quiz-dont-know-btn', () => {
      const q = this.#learningController
        ? this.#learningController.getCurrentQuestion()
        : this.#quiz.getCurrentQuestion();
      if (!q || q.answered) return;

      // Show learning panel
      this.#showLearningPanel(q);
    });

    // Learning panel continue button
    this.onClick('#quiz-learn-continue-btn', () => {
      // Check processing state
      if (this.#isProcessingAnswer) {
        console.warn('[QuizView] Already processing, ignoring continue button');
        return;
      }

      this.hide('#quiz-learn-panel');

      // Remove class to center layout
      const layout = this.$('#quiz-layout');
      if (layout) layout.classList.remove('has-learn-panel');

      // Mark as wrong answer (submit wrong index)
      const q = this.#learningController
        ? this.#learningController.getCurrentQuestion()
        : this.#quiz.getCurrentQuestion();
      if (q && !q.answered) {
        const wrongIndex = (q.correctIndex + 1) % 4;
        this.#handleAnswer(wrongIndex);
      }
    });

    // Complete screen buttons
    this.onClick('#quiz-start-btn', () => {
      if (this.#game.fuel <= 0) {
        alert('Insufficient fuel! Buy fuel in the shop first.');
        return;
      }
      try {
        this.#game.continueToRace();
        this.emit(Events.RACE_START, { source: 'quiz' });
      } catch (err) {
        alert(err.message);
      }
    });

    this.onClick('#quiz-shop-btn', () => {
      this.emit(Events.VIEW_CHANGE, { view: 'shop' });
    });

    this.onClick('#quiz-restart-btn', () => {
      this.show('#quiz-question-area');
      this.hide('#quiz-complete');
      this.#startNewQuiz(this.#quiz.maxLevel);
    });
  }

  #startNewQuiz(maxLevel = 3) {
    // 优先使用 LearningController
    if (this.#learningController) {
      const questions = this.#learningController.startNewQuiz({
        count: LEARNING.QUIZ_QUESTION_COUNT,
        useChinese: true,
      });

      // 检查是否成功生成题目
      if (questions && questions.length > 0 && questions[0]?.options) {
        this.showQuestion();
      } else if (questions === null) {
        // 今日配额已用完
        alert('You have completed all 3 quizzes for today! Come back tomorrow.');
      } else {
        // 题目生成失败（可能是词库问题）
        console.error('[QuizView] Failed to generate questions:', { questions });
        alert('无法生成题目，请刷新页面重试。');
      }
    } else {
      this.#quiz.generateQuiz(LEARNING.QUIZ_QUESTION_COUNT, maxLevel);
      this.showQuestion();
    }
  }

  #subscribeToEvents() {
    this.subscribe(Events.QUIZ_START, () => {
      if (this.isMounted()) {
        this.show('#quiz-question-area');
        this.hide('#quiz-complete');
        this.#startNewQuiz();
      }
    });
  }
}
