/**
 * WordSetLoader - 词库动态加载器
 * 支持多词库切换、动态加载、缓存管理
 */

// 词库缓存
const cache = new Map();

// 当前词库状态
let currentWordSet = null;
let currentConfig = null;

// 存储键
const STORAGE_KEY = 'wr_wordset_config';

/**
 * 加载词库配置
 * @returns {Promise<Object>}
 */
export async function loadConfig() {
  if (currentConfig) return currentConfig;

  try {
    const response = await fetch('data/wordsets-config.json');
    currentConfig = await response.json();
    return currentConfig;
  } catch (e) {
    console.error('[WordSetLoader] Failed to load config:', e);
    return getDefaultConfig();
  }
}

/**
 * 加载指定词库
 * @param {string} wordSetId - 词库ID
 * @returns {Promise<Array>} 词汇数组
 */
export async function loadWordSet(wordSetId) {
  // 检查缓存
  if (cache.has(wordSetId)) {
    return cache.get(wordSetId);
  }

  try {
    const config = await loadConfig();
    const wordSet = config.wordSets.find(ws => ws.id === wordSetId);

    if (!wordSet) {
      console.error(`[WordSetLoader] WordSet not found: ${wordSetId}`);
      return [];
    }

    const response = await fetch(wordSet.file);
    const data = await response.json();
    const words = data.words || [];

    // 缓存结果
    cache.set(wordSetId, words);
    currentWordSet = wordSetId;

    // 保存选择
    saveSelection(wordSetId);

    console.log(`[WordSetLoader] Loaded ${words.length} words from ${wordSet.name}`);
    return words;
  } catch (e) {
    console.error(`[WordSetLoader] Failed to load wordset ${wordSetId}:`, e);
    return [];
  }
}

/**
 * 获取当前词库ID
 * @returns {string}
 */
export function getCurrentWordSetId() {
  return currentWordSet || localStorage.getItem(STORAGE_KEY) || 'shanghai-grade6';
}

/**
 * 获取当前词库信息
 * @returns {Promise<Object|null>}
 */
export async function getCurrentWordSetInfo() {
  const config = await loadConfig();
  const id = getCurrentWordSetId();
  return config.wordSets.find(ws => ws.id === id) || null;
}

/**
 * 获取所有可用词库列表
 * @returns {Promise<Array>}
 */
export async function getAvailableWordSets() {
  const config = await loadConfig();
  return config.wordSets.map(ws => ({
    id: ws.id,
    name: ws.name,
    description: ws.description,
    totalWords: ws.totalWords,
    tags: ws.tags,
  }));
}

/**
 * 切换词库
 * @param {string} wordSetId
 * @returns {Promise<Array>}
 */
export async function switchWordSet(wordSetId) {
  const words = await loadWordSet(wordSetId);
  if (words.length > 0) {
    currentWordSet = wordSetId;
    saveSelection(wordSetId);
  }
  return words;
}

/**
 * 预加载所有词库（可选）
 * @returns {Promise<void>}
 */
export async function preloadAllWordSets() {
  const config = await loadConfig();
  await Promise.all(config.wordSets.map(ws => loadWordSet(ws.id)));
}

/**
 * 清除缓存
 */
export function clearCache() {
  cache.clear();
}

/**
 * 保存选择到 localStorage
 */
function saveSelection(wordSetId) {
  try {
    localStorage.setItem(STORAGE_KEY, wordSetId);
  } catch (e) {}
}

/**
 * 加载上次选择的词库
 * @returns {Promise<string>}
 */
export async function loadLastSelection() {
  const config = await loadConfig();
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && config.wordSets.some(ws => ws.id === saved)) {
    return saved;
  }
  return config.defaultWordSet;
}

/**
 * 获取难度等级定义
 * @returns {Promise<Object>}
 */
export async function getDifficultyLevels() {
  const config = await loadConfig();
  return config.difficultyLevels;
}

/**
 * 默认配置（离线备用）
 */
function getDefaultConfig() {
  return {
    version: 1,
    defaultWordSet: 'shanghai-grade6',
    wordSets: [{
      id: 'shanghai-grade6',
      name: '沪教版六年级',
      description: '默认词库',
      totalWords: 240,
      file: 'data/words.json',
    }],
    difficultyLevels: {
      "1": { label: "基础", description: "最常用基础词汇" },
      "2": { label: "初级", description: "课本核心词汇" },
      "3": { label: "中级", description: "拓展词汇" },
      "4": { label: "进阶", description: "挑战词汇" },
      "5": { label: "高级", description: "超纲词汇" },
    },
  };
}
