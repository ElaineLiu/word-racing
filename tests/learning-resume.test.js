/**
 * LearningController 真实断点续答测试
 *
 * 使用真实 LearningController，避免 mock 掩盖集成问题。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LearningController } from '../learning/learning-controller.js';

const createWordSet = (count = 30) => Array.from({ length: count }, (_, i) => ({
  id: i + 1,
  word: `word${i + 1}`,
  meaning_cn: `词${i + 1}`,
  meaning_en: `meaning ${i + 1}`,
  phonetic: `/word${i + 1}/`,
  sentence: `This is word${i + 1}.`,
  level: 2,
  category: 'test',
}));

describe('LearningController - 真实断点续答', () => {
  let wordSet;

  beforeEach(() => {
    localStorage.clear();
    wordSet = createWordSet();
  });

  it('刷新后 resumeSession 应恢复到下一道未答题，而不是新开一套题', () => {
    const controller = new LearningController();
    controller.init(wordSet, { skipUI: true });
    const questions = controller.startNewQuiz();
    const firstQuestion = questions[0];
    const secondQuestion = questions[1];

    controller.submitAnswer(firstQuestion.correctIndex);

    const reloaded = new LearningController();
    reloaded.init(wordSet, { skipUI: true });
    const resumed = reloaded.resumeSession();

    expect(resumed).not.toBeNull();
    expect(reloaded.getCurrentQuestionIndex()).toBe(1);
    const currentQuestion = reloaded.getCurrentQuestion();
    expect(currentQuestion.wordId).toBe(secondQuestion.wordId);
    expect(currentQuestion.mode).toBe(secondQuestion.mode);
    expect(currentQuestion.options).toEqual(secondQuestion.options);
    expect(currentQuestion.correctIndex).toBe(secondQuestion.correctIndex);
  });

  it('完整完成套题后刷新不应存在未完成会话', () => {
    const controller = new LearningController();
    controller.init(wordSet, { skipUI: true });
    controller.startNewQuiz();

    while (!controller.isQuizComplete()) {
      const question = controller.getCurrentQuestion();
      controller.submitAnswer(question.correctIndex);
    }
    controller.completeQuiz();

    const reloaded = new LearningController();
    reloaded.init(wordSet, { skipUI: true });

    expect(reloaded.hasUnfinishedSession()).toBe(false);
    expect(reloaded.resumeSession()).toBeNull();
  });
});
