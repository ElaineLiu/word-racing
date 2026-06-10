/**
 * AI Configuration
 * AI 个性预设和路径跟随参数
 */

export const AI_CONFIG = {
  /**
   * AI 个性预设
   * 每种个性有不同的行为特征
   */
  PERSONALITIES: {
    /**
     * 激进型：速度快，前瞻距离长，但容易犯错
     */
    aggressive: {
      name: 'Aggressive',
      aggression: 0.9,           // 进攻性（影响超车倾向）
      stability: 0.6,            // 稳定性（影响过弯平滑度）
      mistakeProbability: 0.08,  // 犯错概率（每秒触发）
      mistakeDuration: 1.2,      // 犯错持续时间（秒）
      speedMultiplier: 1.1,      // 速度乘数（相对于基础速度）
      lookaheadDistance: 120,    // 前瞻距离（更长=更激进）
    },

    /**
     * 平衡型：速度适中，稳定，偶尔犯错
     */
    balanced: {
      name: 'Balanced',
      aggression: 0.5,
      stability: 0.8,
      mistakeProbability: 0.05,
      mistakeDuration: 1.0,
      speedMultiplier: 1.0,
      lookaheadDistance: 100,
    },

    /**
     * 保守型：速度慢，非常稳定，很少犯错
     */
    conservative: {
      name: 'Conservative',
      aggression: 0.3,
      stability: 0.95,
      mistakeProbability: 0.02,
      mistakeDuration: 0.8,
      speedMultiplier: 0.9,
      lookaheadDistance: 80,
    },
  },

  /**
   * 路径跟随参数
   */
  PATH_FOLLOWING: {
    lookaheadDistance: 100,      // 默认前瞻距离
    offsetRange: 20,             // 路径偏移范围（±20px），让 AI 不完全重叠
  },

  /**
   * 犯错恢复参数
   */
  RECOVERY: {
    duration: 1.0,               // 恢复状态持续时间（秒）
    speedReduction: 0.5,         // 恢复期间速度降低比例
  },
};
