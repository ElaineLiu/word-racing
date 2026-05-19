/**
 * Main Entry Point for Word Racing
 * This is the single entry point that loads all modules.
 *
 * Phase 1.2 of Refactoring Plan
 */

// Import all modules in correct dependency order
import { Track } from './track.js';
import { Car } from './car.js';
import { QuestionFactory, DistractorEngine } from './question-factory.js';
import { VocabularyQuiz } from './quiz.js';
import { Game } from './game.js';
import { NavManager } from './nav.js';

// Export for global access (temporary during transition)
window.Track = Track;
window.Car = Car;
window.QuestionFactory = QuestionFactory;
window.DistractorEngine = DistractorEngine;
window.VocabularyQuiz = VocabularyQuiz;
window.Game = Game;
window.NavManager = NavManager;

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Error handler
  window.addEventListener('error', (e) => {
    const msg = 'JS ERROR: ' + (e.message || 'unknown') + ' at ' + (e.filename || '') + ':' + (e.lineno || '');
    document.body.style.background = '#300';
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c00;color:#fff;padding:12px;z-index:99999;font-size:14px;';
    d.textContent = msg;
    document.body.appendChild(d);
  });

  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);
  const nav = new NavManager(game);
  window.game = game;

  // Set up callbacks
  game.onExitRace = () => nav.switchPage('home');
  game.onResultsContinueCb = () => nav.switchPage('home');

  let isTouchDevice = false;

  game.init().then(() => {
    setupTouchDetection();
    nav.updateHomeStats();
  }).catch(err => {
    const d = document.createElement('div');
    d.style.cssText = 'color:#fff;background:#c00;padding:16px;font-size:14px;position:fixed;top:0;left:0;right:0;z-index:99999;';
    d.textContent = 'INIT ERROR: ' + err.message + ' | ' + (err.stack || '');
    document.body.appendChild(d);
  });

  function setupTouchDetection() {
    isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (isTouchDevice) {
      setupTouchControls();
    }
  }

  function setupTouchControls() {
    const touchControls = document.getElementById('touch-controls');
    const buttons = touchControls.querySelectorAll('.touch-btn');
    const inputState = { up: false, down: false, left: false, right: false, nitro: false };

    buttons.forEach(btn => {
      const action = btn.dataset.action;
      const start = (e) => {
        e.preventDefault();
        inputState[action] = true;
        btn.classList.add('pressed');
        game.setTouchInput(inputState);
      };
      const end = (e) => {
        e.preventDefault();
        inputState[action] = false;
        btn.classList.remove('pressed');
        game.setTouchInput(inputState);
      };

      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', end, { passive: false });
      btn.addEventListener('touchcancel', end, { passive: false });
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', end);
      btn.addEventListener('mouseleave', end);
    });

    touchControls.classList.add('active');
  }

  // Quiz functions
  window.startQuiz = function() {
    const questions = game.startNewQuiz();
    nav.switchPage('quiz');
    showQuizQuestion();
  };

  window.showQuizQuestion = function() {
    const q = game.quiz.getCurrentQuestion();
    if (!q) {
      finishQuiz();
      return;
    }

    // Hide learning panel, show question area
    document.getElementById('quiz-question-area').style.display = 'block';
    document.getElementById('quiz-learn-panel').style.display = 'none';

    const quizProgress = document.getElementById('quiz-progress');
    const quizWord = document.getElementById('quiz-word');
    const quizMeaningEn = document.getElementById('quiz-meaning-en');
    const quizSentence = document.getElementById('quiz-sentence');
    const quizOptions = document.getElementById('quiz-options');
    const quizNitroHint = document.getElementById('quiz-nitro-hint');

    const current = Math.min(game.quiz.currentIndex, game.quiz.currentQuiz.length - 1);
    const total = game.quiz.currentQuiz.length;

    if (game.quiz.quizMode === 'basic') {
      quizNitroHint.textContent = 'Earn Fuel Coins for correct answers';
    } else {
      quizNitroHint.textContent = 'Earn Fuel or Gear Coins for correct answers';
    }

    const modeLabel = q.modeLabel || q.mode || 'QUIZ';
    quizProgress.textContent = `Q${current + 1}/${total} | ${modeLabel} | Correct: ${game.quiz.correctCount}`;

    quizWord.textContent = '';
    quizMeaningEn.textContent = '';
    quizSentence.textContent = '';
    quizSentence.style.fontStyle = '';

    const isChallenge = game.quiz.quizMode === 'challenge';
    const showSentence = !isChallenge || q.mode === 'PIT_BOARD';

    switch (q.mode) {
      case 'PIT_BOARD':
        quizWord.textContent = q.correctWord || '';
        quizMeaningEn.textContent = q.promptSub || '';
        if (showSentence && q.sentence) {
          quizSentence.textContent = `"${q.sentence}"`;
          quizSentence.style.fontStyle = 'italic';
        }
        break;
      case 'RADIO_MSG':
        quizWord.textContent = q.prompt || '';
        quizMeaningEn.textContent = q.promptSub || '';
        if (showSentence && q.sentence && q.sentence !== q.prompt) {
          quizSentence.textContent = `"${q.sentence}"`;
          quizSentence.style.fontStyle = 'italic';
        }
        break;
      case 'STRATEGY':
        quizWord.textContent = q.prompt || '';
        quizMeaningEn.textContent = q.promptSub || '';
        if (q.promptCn && !q.promptSub) {
          quizMeaningEn.textContent = q.promptCn;
        }
        if (showSentence && q.sentence) {
          quizSentence.textContent = `"${q.sentence}"`;
          quizSentence.style.fontStyle = 'italic';
        }
        break;
      case 'QUALIFYING':
        quizWord.textContent = q.prompt || '';
        quizMeaningEn.textContent = q.promptCn || q.promptSub || '';
        break;
      case 'LAP_REVIEW':
        quizWord.textContent = (q.correctWord ? 'Review: ' + q.correctWord : 'Review');
        quizMeaningEn.textContent = q.promptSub || q.meaningEn || '';
        if (showSentence && q.sentence) {
          quizSentence.textContent = `"${q.sentence}"`;
          quizSentence.style.fontStyle = 'italic';
        }
        break;
      default:
        quizWord.textContent = q.correctWord || q.word || q.prompt || '';
        quizMeaningEn.textContent = q.promptSub || q.meaning_en || q.meaning || '';
        if (showSentence && q.sentence) {
          quizSentence.textContent = `"${q.sentence}"`;
          quizSentence.style.fontStyle = 'italic';
        }
    }

    quizOptions.innerHTML = '';
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.textContent = opt;
      btn.addEventListener('click', () => handleQuizAnswer(idx));
      quizOptions.appendChild(btn);
    });
  };

  /**
   * Show learning panel for a word
   * @param {Object} q - Question object
   * @param {boolean} isWrong - Whether this is shown after a wrong answer
   */
  window.showLearnPanel = function(q, isWrong = false) {
    document.getElementById('quiz-question-area').style.display = 'none';
    const learnPanel = document.getElementById('quiz-learn-panel');
    learnPanel.style.display = 'block';
    learnPanel.classList.toggle('wrong', isWrong);

    document.getElementById('quiz-learn-word').textContent = q.correctWord || '';
    document.getElementById('quiz-learn-phonetic').textContent = q.promptSub || '';
    document.getElementById('quiz-learn-meaning').textContent = q.correctMeaning || '';
    document.getElementById('quiz-learn-sentence').textContent = q.sentence ? `"${q.sentence}"` : '';

    // Try to find Chinese sentence from word data
    const wordData = game.quiz.words.find(w => w.word === q.correctWord);
    document.getElementById('quiz-learn-sentence-cn').textContent = wordData?.sentence_cn || '';
  };

  /**
   * Handle "I don't know" button click
   */
  window.handleDontKnow = function() {
    const q = game.quiz.getCurrentQuestion();
    if (!q) return;

    // Mark as answered but not correct (for tracking purposes)
    q.answered = true;
    q.dontKnow = true;
    game.quiz.totalAnswered++;

    // Show learning panel
    showLearnPanel(q, false);
  };

  /**
   * Handle "Got it, continue" button click
   */
  window.handleLearnContinue = function() {
    const q = game.quiz.getCurrentQuestion();
    if (!q) return;

    // If this was a "don't know", mark the word for later review
    if (q.dontKnow) {
      game.quiz._markWordWrong(
        q.correctWord,
        q.correctMeaning,
        q.wordId,
        q.mode
      );
    }

    // Move to next question
    game.quiz.currentIndex++;
    showQuizQuestion();
  };

  window.handleQuizAnswer = function(idx) {
    const result = game.quiz.submitAnswer(idx);
    if (!result) return;

    const quizOptions = document.getElementById('quiz-options');
    const buttons = quizOptions.querySelectorAll('.quiz-option');
    buttons.forEach((btn, i) => {
      btn.classList.add('disabled');
      if (i === result.correctIndex) btn.classList.add('correct');
      if (i === idx && !result.correct) btn.classList.add('wrong');
    });

    // Hide "I don't know" button
    document.getElementById('quiz-dont-know').style.display = 'none';

    if (result.correct) {
      // Correct answer - continue after short delay
      setTimeout(() => {
        document.getElementById('quiz-dont-know').style.display = 'block';
        showQuizQuestion();
      }, 900);
    } else {
      // Wrong answer - show learning panel
      setTimeout(() => {
        showLearnPanel(result, true);
      }, 900);
    }
  };

  window.finishQuiz = function() {
    const results = game.quiz.getResults();
    game.onQuizComplete();

    document.getElementById('quiz-question-area').style.display = 'none';
    document.getElementById('quiz-complete').style.display = 'block';

    document.getElementById('quiz-result-accuracy').textContent = `Accuracy: ${results.accuracy}% (${results.correctCount}/${results.totalQuestions})`;
    document.getElementById('quiz-result-fuel').textContent = `Fuel Coins: +${results.fuelCoinsEarned}`;
    document.getElementById('quiz-result-gear').textContent = `Gear Coins: +${results.gearCoinsEarned}`;

    if (results.wrong.length > 0) {
      document.getElementById('quiz-result-wrong').textContent = 'Wrong: ' + results.wrong.map(w => w.word + '=' + w.meaning).join(', ');
    } else {
      document.getElementById('quiz-result-wrong').textContent = 'Perfect! All correct!';
    }

    if (results.nitroCharges > 0) {
      document.getElementById('quiz-result-nitro').textContent = `N2O Nitro x${results.nitroCharges} Ready!`;
    } else {
      document.getElementById('quiz-result-nitro').textContent = 'No nitro this time. Try harder next race!';
    }

    renderLapSelector();
  };

  function renderLapSelector() {
    const quizLapSelect = document.getElementById('quiz-lap-select');
    quizLapSelect.innerHTML = '';
    const label = document.createElement('span');
    label.textContent = 'Laps: ';
    label.style.marginRight = '8px';
    label.style.color = 'var(--text-secondary)';
    quizLapSelect.appendChild(label);

    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.className = 'lap-btn' + (i === game.selectedLaps ? ' active' : '');
      btn.addEventListener('click', () => {
        game.setLapCount(i);
        renderLapSelector();
      });
      quizLapSelect.appendChild(btn);
    }
  }

  // Quiz type selector
  document.getElementById('quiz-type-simple').addEventListener('click', () => {
    game.quiz.quizMode = 'basic';
    game.quiz.maxLevel = 3;
    document.getElementById('quiz-type-simple').classList.add('active');
    document.getElementById('quiz-type-complex').classList.remove('active');
    game.quiz.generateQuiz(5, 3);
    showQuizQuestion();
  });

  document.getElementById('quiz-type-complex').addEventListener('click', () => {
    game.quiz.quizMode = 'challenge';
    game.quiz.maxLevel = 4;
    document.getElementById('quiz-type-complex').classList.add('active');
    document.getElementById('quiz-type-simple').classList.remove('active');
    game.quiz.generateQuiz(5, 4);
    showQuizQuestion();
  });

  // "I don't know" button
  document.getElementById('quiz-dont-know-btn').addEventListener('click', handleDontKnow);

  // "Got it, continue" button
  document.getElementById('quiz-learn-continue-btn').addEventListener('click', handleLearnContinue);

  // Quiz complete buttons
  document.getElementById('quiz-start-btn').addEventListener('click', () => {
    if (game.fuel <= 0) {
      alert('Insufficient fuel! Buy fuel in the shop first.');
      return;
    }
    game.continueToRace();
    nav.switchPage('race');
  });

  document.getElementById('quiz-shop-btn').addEventListener('click', () => nav.switchPage('shop'));

  document.getElementById('quiz-restart-btn').addEventListener('click', () => {
    document.getElementById('quiz-complete').style.display = 'none';
    document.getElementById('quiz-question-area').style.display = 'block';
    game.startNewQuiz();
    showQuizQuestion();
  });

  // Home page button
  document.getElementById('home-start-btn').addEventListener('click', () => startQuiz());

  // Shop page
  function renderShop() {
    const shopItems = document.getElementById('shop-items');
    shopItems.innerHTML = '';

    game._shopItems.forEach((item) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'shop-item';

      const info = document.createElement('div');
      info.innerHTML = `<strong>${item.label}</strong> <span class="text-muted">- ${item.desc} (${item.cost} ${item.currency === 'fuel' ? 'Fuel Coins' : 'Gear Coins'})</span>`;
      itemDiv.appendChild(info);

      const buyBtn = document.createElement('button');
      buyBtn.textContent = 'Buy';

      const canBuy = item.currency === 'fuel'
        ? (game.fuelCoins >= item.cost && game.fuel < game.maxFuel)
        : (game.gearCoins >= item.cost);

      if (!canBuy) buyBtn.disabled = true;

      buyBtn.addEventListener('click', () => {
        game._executeShopAction(item.id);
        renderShop();
        nav.updateHomeStats();
        updateShop();
      });

      itemDiv.appendChild(buyBtn);
      shopItems.appendChild(itemDiv);
    });
  }

  document.getElementById('shop-back-btn').addEventListener('click', () => nav.switchPage('home'));

  document.getElementById('shop-race-btn').addEventListener('click', () => {
    if (game.fuel > 0) {
      game.continueToRace();
      nav.switchPage('race');
    } else {
      alert('Need fuel! Go to quiz to earn fuel coins.');
    }
  });

  // Keyboard handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && game.state === 'RACING') {
      game.exitRace();
      nav.switchPage('home');
    }
  });

  // Update shop
  window.updateShop = function() {
    document.getElementById('shop-fuel-coins').textContent = game.fuelCoins;
    document.getElementById('shop-gear-coins').textContent = game.gearCoins;
    document.getElementById('shop-fuel').textContent = Math.round(game.fuel);
    document.getElementById('shop-nitro').textContent = game.nitroCharges;
    renderShop();
  };
});
