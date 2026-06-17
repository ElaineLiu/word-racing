/**
 * 成就配置 - Achievement Configuration
 *
 * 定义所有游戏成就、解锁条件和奖励
 */

/**
 * 成就对象结构
 * @typedef {Object} Achievement
 * @property {string} id - 唯一标识
 * @property {string} name - 显示名称
 * @property {string} description - 描述
 * @property {Function} check - 检查函数，接收 state 返回 boolean
 * @property {Object} reward - 奖励
 * @property {string} [reward.track] - 赛道ID
 * @property {number} [reward.fuelCoins] - 燃油币
 */

export const ACHIEVEMENTS = {
  /**
   * 初次上阵 - 完成第一套题
   */
  'first-quiz': {
    id: 'first-quiz',
    name: 'First Pit Stop',
    description: 'Complete your first quiz.',
    check: (state) => (state.learning?.totalQuizzes || 0) >= 1,
    reward: { track: 'shanghai-2d' }
  },

  /**
   * 答题达人 - 累计完成10套题
   */
  'quiz-master-10': {
    id: 'quiz-master-10',
    name: 'Quiz Streak 10',
    description: 'Complete 10 quizzes.',
    check: (state) => (state.learning?.totalQuizzes || 0) >= 10,
    reward: { track: 'monaco-2d' }
  },

  /**
   * 单词收藏家 - 掌握50个单词
   */
  'word-collector-50': {
    id: 'word-collector-50',
    name: 'Word Collector',
    description: 'Master 50 words.',
    check: (state) => (state.learning?.totalWordsMastered || 0) >= 50,
    reward: { track: 'silverstone-2d' }
  },

  /**
   * 单词大师 - 掌握100个单词
   */
  'word-master-100': {
    id: 'word-master-100',
    name: 'Word Master',
    description: 'Master 100 words.',
    check: (state) => (state.learning?.totalWordsMastered || 0) >= 100,
    reward: { track: 'shanghai-3d' }
  },

  /**
   * 完美连击 - 单套题全对
   */
  'perfect-streak': {
    id: 'perfect-streak',
    name: 'Perfect Run',
    description: 'Answer all 10 questions correctly in one quiz.',
    check: (state) => state.learning?.lastPerfectQuiz === true,
    reward: { fuelCoins: 50 }
  }
};
