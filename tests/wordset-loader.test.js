import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VocabularyQuiz } from '../js/quiz.js';

const DEFAULT_ID = 'shanghai-zhongkao';
const CONFIG_URL = 'data/wordsets-config.json';
const WORDS_URL = 'data/words-shanghai-zhongkao.json';

const config = {
  version: 3,
  defaultWordSet: DEFAULT_ID,
  wordSets: [{
    id: DEFAULT_ID,
    name: '上海中考考纲',
    totalWords: 1639,
    file: WORDS_URL,
  }],
  difficultyLevels: {},
};

const words = [
  { id: 1, word: 'ability', meaning_cn: '能力', meaning_en: 'skill', phonetic: '/əˈbɪləti/', sentence: 'She has the ability.', level: 1, category: 'things' },
  { id: 2, word: 'able', meaning_cn: '能够', meaning_en: 'capable', phonetic: '/ˈeɪbəl/', sentence: 'He is able to swim.', level: 1, category: 'adjectives' },
];

function response(data, ok = true, status = 200) {
  return { ok, status, json: vi.fn().mockResolvedValue(data) };
}

async function importLoader() {
  vi.resetModules();
  return import('../quiz/wordset-loader.js');
}

describe('WordSetLoader single-wordset policy', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    global.fetch = vi.fn(async url => {
      if (url === CONFIG_URL) return response(config);
      if (url === WORDS_URL) return response({ words });
      throw new Error(`Unexpected URL: ${url}`);
    });
  });

  it('loads only the Shanghai Zhongkao wordset', async () => {
    const loader = await importLoader();

    expect(await loader.getAvailableWordSets()).toEqual([
      expect.objectContaining({ id: DEFAULT_ID, name: '上海中考考纲', totalWords: 1639 }),
    ]);
    await expect(loader.loadWordSet(DEFAULT_ID)).resolves.toEqual(words);
    expect(localStorage.getItem('wr_wordset_config')).toBe(DEFAULT_ID);
  });

  it.each(['shanghai-grade6', 'f1-racing', 'unknown'])('migrates legacy or invalid id %s idempotently', async invalidId => {
    localStorage.setItem('wr_wordset_config', invalidId);
    const loader = await importLoader();

    await expect(loader.loadLastSelection()).resolves.toBe(DEFAULT_ID);
    await expect(loader.loadLastSelection()).resolves.toBe(DEFAULT_ID);
    expect(loader.getCurrentWordSetId()).toBe(DEFAULT_ID);
    expect(localStorage.getItem('wr_wordset_config')).toBe(DEFAULT_ID);
  });

  it('routes an invalid explicit id to Shanghai Zhongkao and persists the migration', async () => {
    const loader = await importLoader();

    await expect(loader.loadWordSet('shanghai-grade6')).resolves.toEqual(words);
    expect(global.fetch).toHaveBeenCalledWith(WORDS_URL);
    expect(localStorage.getItem('wr_wordset_config')).toBe(DEFAULT_ID);
  });

  it('uses the Shanghai Zhongkao offline config when config loading fails', async () => {
    global.fetch = vi.fn(async url => {
      if (url === CONFIG_URL) throw new Error('offline');
      if (url === WORDS_URL) return response({ words });
      throw new Error(`Unexpected URL: ${url}`);
    });
    const loader = await importLoader();

    await expect(loader.loadWordSet(DEFAULT_ID)).resolves.toEqual(words);
    await expect(loader.getCurrentWordSetInfo()).resolves.toEqual(
      expect.objectContaining({ id: DEFAULT_ID, file: WORDS_URL }),
    );
  });

  it('throws a clear error instead of returning a temporary word list', async () => {
    global.fetch = vi.fn(async url => {
      if (url === CONFIG_URL) return response(config);
      if (url === WORDS_URL) return response({}, false, 503);
      throw new Error(`Unexpected URL: ${url}`);
    });
    const loader = await importLoader();

    await expect(loader.loadWordSet(DEFAULT_ID)).rejects.toThrow(
      /无法加载“上海中考考纲”词库.*503/,
    );
  });

  it('rejects malformed word data', async () => {
    global.fetch = vi.fn(async url => {
      if (url === CONFIG_URL) return response(config);
      if (url === WORDS_URL) return response({ words: [] });
      throw new Error(`Unexpected URL: ${url}`);
    });
    const loader = await importLoader();

    await expect(loader.loadWordSet(DEFAULT_ID)).rejects.toThrow(/没有可用单词/);
  });

  it('propagates loading failure through the real VocabularyQuiz without enabling play', async () => {
    global.fetch = vi.fn(async url => {
      if (url === CONFIG_URL) return response(config);
      if (url === WORDS_URL) throw new Error('network unavailable');
      throw new Error(`Unexpected URL: ${url}`);
    });
    const quiz = new VocabularyQuiz();

    await expect(quiz.loadWords()).rejects.toThrow(/network unavailable/);
    expect(quiz.loaded).toBe(false);
    expect(quiz.words).toEqual([]);
  });

  it('keeps the real VocabularyQuiz selection aligned after migrating an invalid id', async () => {
    const quiz = new VocabularyQuiz();

    await expect(quiz.switchWordSet('shanghai-grade6')).resolves.toBe(true);
    expect(quiz.currentWordSetId).toBe(DEFAULT_ID);
    expect(localStorage.getItem('wr_wordset_config')).toBe(DEFAULT_ID);
  });
});
