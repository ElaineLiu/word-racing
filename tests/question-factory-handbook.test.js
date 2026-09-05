import { beforeEach, describe, expect, it } from 'vitest';
import { QuestionFactory } from '../js/question-factory.js';

const words = [
  { id: 1, word: 'God', meaning_cn: '上帝', phonetic: '/ɡɒd/', level: 2, category: 'things', sentence: '' },
  { id: 2, word: 'book', meaning_cn: '书', phonetic: '/bʊk/', level: 2, category: 'things', sentence: 'I read a book.' },
  { id: 3, word: 'desk', meaning_cn: '书桌', phonetic: '/desk/', level: 2, category: 'things', sentence: 'The book is on the desk.' },
  { id: 4, word: 'pen', meaning_cn: '钢笔', phonetic: '/pen/', level: 2, category: 'things', sentence: 'This is my pen.' },
];

describe('QuestionFactory handbook content safeguards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to a meaning question when a handbook entry has no sentence', () => {
    const question = QuestionFactory.createQuestion(words[0], 'RADIO_MSG', 2, words, true);

    expect(question.mode).toBe('PIT_BOARD');
    expect(question.prompt).toBe('God');
    expect(question.correctMeaning).toBe('上帝');
  });
});
