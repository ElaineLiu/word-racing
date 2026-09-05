/**
 * WordSetLoader - 单一运行时词库加载器
 *
 * 阶段 A1 起，应用只允许加载上海中考考纲词库。旧版或无效选择会被
 * 幂等迁移到默认 ID；词库加载失败时抛出明确错误，禁止用临时词库继续记账。
 */

export const DEFAULT_WORD_SET_ID = 'shanghai-zhongkao';
export const WORD_SET_STORAGE_KEY = 'wr_wordset_config';

const DEFAULT_WORD_SET = Object.freeze({
  id: DEFAULT_WORD_SET_ID,
  name: '上海中考考纲',
  description: '2025年上海中考英语考纲词汇用法手册（1639个主词条）',
  source: '2025年上海中考英语考纲词汇',
  difficultyRange: [1, 5],
  totalWords: 1639,
  file: 'data/words-shanghai-zhongkao.json',
  tags: ['中考', '考纲', '上海', '初中'],
  gradeLevel: '7-9',
  geLevel: '2-4',
  isDefault: true,
});

const cache = new Map();
let currentWordSet = null;
let currentConfig = null;

function getDefaultConfig() {
  return {
    version: 3,
    defaultWordSet: DEFAULT_WORD_SET_ID,
    wordSets: [{ ...DEFAULT_WORD_SET }],
    difficultyLevels: {
      1: { label: '基础', description: '最常用基础词汇 (GE 1-2)', ge: '1-2' },
      2: { label: '初级', description: '课本核心词汇 (GE 2-2.5)', ge: '2-2.5' },
      3: { label: '中级', description: '中考核心词汇 (GE 2.5-3)', ge: '2.5-3' },
      4: { label: '进阶', description: '中考拓展词汇 (GE 3-3.5)', ge: '3-3.5' },
      5: { label: '高级', description: '超纲词汇 (GE 3.5-4+)', ge: '3.5-4' },
    },
  };
}

function saveSelection(wordSetId) {
  try {
    localStorage.setItem(WORD_SET_STORAGE_KEY, wordSetId);
  } catch (_) {
    // localStorage 不可用时仍允许只读运行。
  }
}

function migrateSelection(wordSetId) {
  if (wordSetId !== DEFAULT_WORD_SET_ID) saveSelection(DEFAULT_WORD_SET_ID);
  currentWordSet = DEFAULT_WORD_SET_ID;
  return DEFAULT_WORD_SET_ID;
}

export async function loadConfig() {
  if (currentConfig) return currentConfig;

  try {
    const response = await fetch('data/wordsets-config.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    const validSingleSet = config?.defaultWordSet === DEFAULT_WORD_SET_ID
      && Array.isArray(config.wordSets)
      && config.wordSets.length === 1
      && config.wordSets[0]?.id === DEFAULT_WORD_SET_ID;
    if (!validSingleSet) throw new Error('配置未声明唯一的上海中考考纲词库');
    currentConfig = config;
  } catch (error) {
    console.warn('[WordSetLoader] 词库配置加载失败，使用内置上海中考配置：', error);
    currentConfig = getDefaultConfig();
  }

  return currentConfig;
}

export async function loadWordSet(wordSetId = DEFAULT_WORD_SET_ID) {
  const resolvedId = migrateSelection(wordSetId);
  if (cache.has(resolvedId)) return cache.get(resolvedId);

  const config = await loadConfig();
  const wordSet = config.wordSets[0];

  try {
    const response = await fetch(wordSet.file);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data?.words) || data.words.length === 0) {
      throw new Error('词库文件没有可用单词');
    }

    cache.set(resolvedId, data.words);
    currentWordSet = resolvedId;
    saveSelection(resolvedId);
    console.log(`[WordSetLoader] Loaded ${data.words.length} words from ${wordSet.name}`);
    return data.words;
  } catch (error) {
    throw new Error(`无法加载“${wordSet.name}”词库：${error.message}`, { cause: error });
  }
}

export function getCurrentWordSetId() {
  const saved = currentWordSet || localStorage.getItem(WORD_SET_STORAGE_KEY);
  return migrateSelection(saved);
}

export async function getCurrentWordSetInfo() {
  const config = await loadConfig();
  migrateSelection(getCurrentWordSetId());
  return config.wordSets[0];
}

export async function getAvailableWordSets() {
  const config = await loadConfig();
  const wordSet = config.wordSets[0];
  return [{
    id: wordSet.id,
    name: wordSet.name,
    description: wordSet.description,
    totalWords: wordSet.totalWords,
    tags: wordSet.tags,
  }];
}

export async function switchWordSet(wordSetId) {
  return loadWordSet(wordSetId);
}

export async function preloadAllWordSets() {
  await loadWordSet(DEFAULT_WORD_SET_ID);
}

export function clearCache() {
  cache.clear();
  currentWordSet = null;
  currentConfig = null;
}

export async function loadLastSelection() {
  return migrateSelection(localStorage.getItem(WORD_SET_STORAGE_KEY));
}

export async function getDifficultyLevels() {
  const config = await loadConfig();
  return config.difficultyLevels;
}
