import { beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from '../core/event-bus.js';
import { VocabularyQuiz } from '../js/quiz.js';
import { QuestionFactory } from '../js/question-factory.js';
import { QuizView } from '../views/quiz-view.js';

describe('QuizView answer-safe example rendering', () => {
  const word = {
    id: 1, word: 'crazy', meaning_cn: '疯狂的', meaning_en: 'very wild or strange',
    phonetic: '/ˈkreɪzi/', sentence: 'He scored and the crowd went crazy!',
    level: 2, category: 'adjectives',
  };
  const words = [word, ...['empty', 'wise', 'wild'].map((text, index) => ({
    ...word, id: index + 2, word: text, meaning_cn: text, meaning_en: text,
  }))];

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `<div id="page-quiz">
      <div id="quiz-question-area"><div id="quiz-progress"></div>
      <div id="quiz-word"></div><div id="quiz-meaning-en"></div>
      <div id="quiz-sentence"></div><div id="quiz-options"></div></div>
      <div id="quiz-complete"></div><div id="quiz-nitro-hint"></div>
      <button id="quiz-dont-know-btn">I'm not sure</button>
      <div id="quiz-learn-panel"><div id="quiz-learn-sentence"></div></div>
    </div>`;
  });

  function render(mode, quizMode, review = false) {
    const quiz = new VocabularyQuiz();
    quiz.quizMode = quizMode;
    const question = QuestionFactory.createQuestion(word, mode, 3, words, true);
    if (review) {
      question.isReview = true;
      question.originalMode = mode;
      question.mode = 'LAP_REVIEW';
    }
    quiz.currentQuiz = [question];
    const view = new QuizView(new EventBus(), { quiz });
    view.mount();
    view.showQuestion();
    return { view, question };
  }

  it.each(['basic', 'challenge'])('hides the original fill-in sentence in %s', quizMode => {
    const { view, question } = render('RADIO_MSG', quizMode);
    expect(document.querySelector('#quiz-word').textContent).toBe(question.prompt);
    expect(document.querySelector('#quiz-word').textContent).not.toContain('crazy');
    expect(document.querySelector('#quiz-sentence').textContent).toBe('');
    expect(document.querySelectorAll('#quiz-options button')).toHaveLength(4);
    view.unmount();
  });

  it.each(['RADIO_MSG'])('hides answer-bearing examples for %s review', mode => {
    const { view } = render(mode, 'basic', true);
    expect(document.querySelector('#quiz-sentence').textContent).not.toContain(word.word);
    view.unmount();
  });

  it('does not reveal the target word in a definition-to-word example', () => {
    const { view } = render('STRATEGY', 'basic');
    expect(document.querySelector('#quiz-word').textContent).toBe(word.meaning_cn);
    expect(document.querySelector('#quiz-sentence').textContent).not.toContain(word.word);
    view.unmount();
  });

  it('keeps the supporting example for word-to-meaning questions', () => {
    const { view } = render('PIT_BOARD', 'basic');
    expect(document.querySelector('#quiz-sentence').textContent).toContain(word.sentence);
    view.unmount();
  });

  it('clears the previous supporting example when switching to fill-in', () => {
    const { view } = render('PIT_BOARD', 'basic');
    view.unmount();
    const next = render('RADIO_MSG', 'basic');
    expect(document.querySelector('#quiz-sentence').textContent).toBe('');
    next.view.unmount();
  });

  it('keeps the full example available after asking to learn the word', () => {
    const { view } = render('RADIO_MSG', 'basic');
    document.querySelector('#quiz-dont-know-btn').click();
    expect(document.querySelector('#quiz-learn-sentence').textContent).toBe(word.sentence);
    view.unmount();
  });
});
