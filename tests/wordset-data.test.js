import { beforeEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const readJson = relativePath => JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));

describe('runtime wordset data contract', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('declares Shanghai Zhongkao as the only runtime wordset', () => {
    const config = readJson('data/wordsets-config.json');

    expect(config.defaultWordSet).toBe('shanghai-zhongkao');
    expect(config.wordSets).toHaveLength(1);
    expect(config.wordSets[0]).toMatchObject({
      id: 'shanghai-zhongkao',
      name: '上海中考考纲',
      totalWords: 1639,
      file: 'data/words-shanghai-zhongkao.json',
      isDefault: true,
    });
  });

  it('contains exactly 1,639 handbook words with unique ids and exact spellings', () => {
    const { words } = readJson('data/words-shanghai-zhongkao.json');
    const required = ['id', 'word', 'meaning_cn', 'phonetic', 'level', 'category', 'pos', 'source2025'];

    expect(words).toHaveLength(1639);
    expect(new Set(words.map(word => word.id)).size).toBe(1639);
    expect(new Set(words.map(word => word.word)).size).toBe(1639);
    for (const word of words) {
      for (const field of required) expect(word[field]).not.toBeFalsy();
    }
  });

  it('keeps legacy files in archive only', () => {
    expect(existsSync(resolve(root, 'data/words.json'))).toBe(false);
    expect(existsSync(resolve(root, 'data/words-shanghai-g6.json'))).toBe(false);
    expect(existsSync(resolve(root, 'data/archive/legacy-wordsets/words.json'))).toBe(true);
    expect(existsSync(resolve(root, 'data/archive/legacy-wordsets/words-shanghai-g6.json'))).toBe(true);
  });

  it('tracks handbook provenance and question eligibility for every word', () => {
    const { words } = readJson('data/words-shanghai-zhongkao.json');

    for (const word of words) {
      expect(word.source2025.document).toBe('2025-shanghai-handbook');
      expect(word.source2025.page).toBeGreaterThanOrEqual(7);
      expect(word.source2025.page).toBeLessThanOrEqual(284);
      expect(word.question_eligibility.meaning).toBe(true);
      expect(word.question_eligibility.sentence).toBe(Boolean(word.sentence));
    }
  });

  it('shows the sole wordset name without rendering a wordset selector', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');

    expect(html).toContain('id="quiz-wordset-label"');
    expect(html).toContain('上海中考考纲');
    expect(html).not.toMatch(/<select[^>]+(?:wordset|word-set)/i);
  });
});
