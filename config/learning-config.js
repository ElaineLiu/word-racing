/**
 * Learning Configuration - 自适应学习系统配置
 *
 * 包含：掌握状态、题型分类、学习常量、奖励配置
 */

// ============================================================================
// MASTERY STATUS - 单词掌握状态
// ============================================================================

/**
 * 单词掌握状态枚举
 *
 * 状态转换流程：
 * unlearned → exposed (首次出现)
 * exposed → simple_passed (简单题答对)
 * exposed → complex_passed (复杂题答对)
 * simple_passed + complex_passed → mastered (两种题型都通过)
 * mastered → forgotten (已掌握后答错)
 * forgotten → exposed (重新学习)
 */
export const MASTERY_STATUS = {
  UNLEARNED: 'unlearned',           // 未学习（从未出现）
  EXPOSED: 'exposed',               // 接触过（出现过但未通过任何题型）
  SIMPLE_PASSED: 'simple_passed',   // 简单题通过
  COMPLEX_PASSED: 'complex_passed', // 复杂题通过
  MASTERED: 'mastered',             // 已掌握（简单题+复杂题都通过）
  FORGOTTEN: 'forgotten',           // 遗忘（已掌握后再次答错）
  INDEPENDENT_PASSED: 'independent_passed',
  PENDING_VERIFICATION: 'pending_verification',
};

// ============================================================================
// QUESTION MODES - 题型分类
// ============================================================================

/**
 * 题型分类
 * SIMPLE: 简单题 - 词→义 / 义→词
 * COMPLEX: 复杂题 - 填空
 */
export const QUESTION_MODES = {
  SIMPLE: ['PIT_BOARD', 'STRATEGY'],
  COMPLEX: ['RADIO_MSG', 'QUALIFYING'],
  REVIEW: ['LAP_REVIEW'],
};

// 默认自适应出题集合与掌握能力分类分离。QUALIFYING 属于复杂能力，
// 但阶段 A2 不把它加入默认自适应题型比例。
export const DEFAULT_QUESTION_MODES = {
  SIMPLE: ['PIT_BOARD', 'STRATEGY'],
  COMPLEX: ['RADIO_MSG'],
};

/**
 * 判断是否为简单题
 * @param {string} mode - 题型
 * @returns {boolean}
 */
export function isSimpleMode(mode) {
  return QUESTION_MODES.SIMPLE.includes(mode);
}

/**
 * 判断是否为复杂题
 * @param {string} mode - 题型
 * @returns {boolean}
 */
export function isComplexMode(mode) {
  return QUESTION_MODES.COMPLEX.includes(mode);
}

// ============================================================================
// LEARNING CONSTANTS - 学习相关常量
// ============================================================================

export const LEARNING = {
  // 每日学习
  DAILY_QUIZ_COUNT: 20,              // 每天套数
  QUIZ_QUESTION_COUNT: 10,          // 每套题数

  // 出题策略
  MAX_REVIEW_PER_QUIZ: 3,           // 每套最多复习词数（错词）
  MAX_CHECK_WORDS_PER_QUIZ: 2,      // 每套最多检查词数（单题型通过）

  // 难度范围
  MIN_LEVEL: 2,                     // 最低难度（1=小学词汇，跳过）
  MAX_LEVEL: 5,                     // 最高难度

  // 题型偏好
  MODE_PREFERENCE: {
    AUTO: 'auto',       // 自适应（根据掌握状态自动选择）
    SIMPLE: 'simple',   // 偏好简单题
    COMPLEX: 'complex', // 偏好复杂题
  },

  // 存储版本
  STORAGE_VERSION: 3,

  // 存储键
  STORAGE_KEYS: {
    WORD_PROGRESS: 'wr_word_progress',
    DAILY_STATS: 'wr_daily_stats',
    QUIZ_SESSION: 'wr_quiz_session',
    GAME_STATE: 'wr_game_state',
  },
};

// ============================================================================
// DEFAULT PROGRESS - 默认进度结构
// ============================================================================

/**
 * 创建默认单词进度对象
 * @param {string} wordText - 单词文本
 * @param {number} [wordId] - 单词ID
 * @returns {Object}
 */
export function createDefaultProgress(wordText, wordId = null) {
  return {
    word: wordText,
    wordId: wordId,
    status: MASTERY_STATUS.UNLEARNED,  // 初始状态
    simpleCorrect: false,          // 简单题是否答对过
    complexCorrect: false,         // 复杂题是否答对过
    simpleWrongCount: 0,           // 简单题答错次数
    complexWrongCount: 0,          // 复杂题答错次数
    firstSeenDate: new Date().toISOString().split('T')[0],
    lastSeenDate: new Date().toISOString().split('T')[0],
    masteryDate: null,             // 掌握日期
  };
}
