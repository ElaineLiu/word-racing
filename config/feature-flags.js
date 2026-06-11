/**
 * FeatureFlags - 运行时功能开关
 * 用于动态启用/禁用功能，无需重新部署
 */

const DEFAULT_FLAGS = {
  '2d-track': true,
  '3d-track': true,
  'multiple-tracks': true,
};

export const FeatureFlags = {
  flags: { ...DEFAULT_FLAGS },

  /**
   * 检查功能是否启用
   * @param {string} flagName - 功能名称
   * @returns {boolean}
   */
  isEnabled(flagName) {
    return this.flags[flagName] === true;
  },

  /**
   * 启用功能
   * @param {string} flagName
   */
  enable(flagName) {
    this.flags[flagName] = true;
  },

  /**
   * 禁用功能
   * @param {string} flagName
   */
  disable(flagName) {
    this.flags[flagName] = false;
  },

  /**
   * 从 localStorage 加载用户配置
   */
  load() {
    try {
      const saved = localStorage.getItem('wr_feature_flags') || localStorage.getItem('featureFlags');
      if (saved) {
        this.flags = { ...this.flags, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load feature flags:', e);
    }
  },

  /**
   * 保存到 localStorage
   */
  save() {
    localStorage.setItem('wr_feature_flags', JSON.stringify(this.flags));
  },

  reset() {
    this.flags = { ...DEFAULT_FLAGS };
  }
};
