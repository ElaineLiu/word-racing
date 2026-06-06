/**
 * TrackUnlockManager - 赛道解锁管理器
 *
 * 职责：
 * - 检查赛道是否解锁
 * - 提供解锁进度信息
 * - 不负责金币扣除（由 RacingCostManager 负责）
 *
 * 设计模式：
 * - 实例方法（参考 AchievementManager 模式）
 * - 构造函数注入 eventBus 和 gameState
 */

import { TRACK_REGISTRY } from '../config/track-registry.js';

export class TrackUnlockManager {
  #eventBus;
  #gameState;

  /**
   * @param {EventBus} eventBus
   * @param {GameState} gameState
   */
  constructor(eventBus, gameState) {
    if (!eventBus) throw new Error('EventBus is required');
    if (!gameState) throw new Error('GameState is required');

    this.#eventBus = eventBus;
    this.#gameState = gameState;
  }

  /**
   * 检查赛道是否解锁
   * @param {string} trackId - 赛道ID
   * @returns {boolean}
   */
  isUnlocked(trackId) {
    const track = TRACK_REGISTRY[trackId];
    if (!track) return false;

    // 检查是否在已解锁列表中
    const unlockedTracks = this.#gameState.get('unlockedTracks') || [];
    return unlockedTracks.includes(trackId);
  }

  /**
   * 获取解锁进度（供UI显示）
   * @param {string} trackId
   * @returns {Object|null} { unlocked: boolean, cost?: number, type?: string, requirements?: Object }
   */
  getUnlockProgress(trackId) {
    const track = TRACK_REGISTRY[trackId];
    if (!track) return null;

    const unlockedTracks = this.#gameState.get('unlockedTracks') || [];

    if (unlockedTracks.includes(trackId)) {
      return { unlocked: true };
    }

    // 返回详细解锁进度
    // 数据源：learning.totalWordsSeen / learning.totalQuizzes / learning.totalWordsMastered
    const requirements = track.unlockRequirements || {};
    const learning = this.#gameState.get('learning') || {};

    return {
      unlocked: false,
      cost: track.cost,
      type: track.type,
      requirements: {
        wordsLearned: {
          current: learning.totalWordsSeen || 0,
          required: requirements.wordsLearned || 0
        },
        quizzesCompleted: {
          current: learning.totalQuizzes || 0,
          required: requirements.quizzesCompleted || 0
        },
        masteryCount: {
          current: learning.totalWordsMastered || 0,
          required: requirements.masteryCount || 0
        }
      }
    };
  }

  /**
   * 获取所有已解锁的赛道
   * @returns {Array<string>} 解锁的赛道ID列表
   */
  getUnlockedTracks() {
    return this.#gameState.get('unlockedTracks') || [];
  }
}
