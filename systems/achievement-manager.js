/**
 * AchievementManager - 成就管理器
 *
 * 职责：
 * - 检查成就条件
 * - 解锁成就并发放奖励
 * - 提供成就状态查询
 */

import { Events } from '../core/event-bus.js';
import { ACHIEVEMENTS } from '../config/achievements.js';

export class AchievementManager {
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
   * 检查所有成就（答题后调用）
   * @public
   */
  checkAll() {
    const state = this.#gameState.getAll();
    const unlocked = state.achievements || [];

    for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
      // 跳过已解锁
      if (unlocked.includes(id)) continue;

      try {
        // 检查条件
        if (achievement.check(state)) {
          this.#unlock(achievement);
        }
      } catch (error) {
        console.error(`Failed to check achievement ${id}:`, error);
      }
    }
  }

  /**
   * 获取所有成就状态（供 UI 显示）
   * @public
   * @returns {Array<Object>} 成就列表，包含解锁状态和进度
   */
  getAllStatus() {
    const state = this.#gameState.getAll();
    const unlocked = state.achievements || [];

    return Object.values(ACHIEVEMENTS)
      .map(ach => ({
        ...ach,
        unlocked: unlocked.includes(ach.id),
        progress: this.#getProgress(ach, state)
      }))
      .sort((a, b) => {
        // 已解锁的排前面
        if (a.unlocked !== b.unlocked) {
          return a.unlocked ? -1 : 1;
        }
        return 0;
      });
  }

  /**
   * 解锁成就
   * @private
   * @param {Object} achievement
   */
  #unlock(achievement) {
    const state = this.#gameState.getAll();

    // 避免重复解锁
    if (state.achievements.includes(achievement.id)) {
      return;
    }

    // 记录成就
    state.achievements.push(achievement.id);
    this.#gameState.set('achievements', state.achievements);

    // 发放奖励
    if (achievement.reward.track) {
      this.#unlockTrack(achievement.reward.track);
    }
    if (achievement.reward.fuelCoins) {
      this.#gameState.modify('fuelCoins', achievement.reward.fuelCoins);
    }
    if (achievement.reward.gearCoins) {
      this.#gameState.modify('gearCoins', achievement.reward.gearCoins);
    }

    // 发送事件
    this.#eventBus.emit(Events.ACHIEVEMENT_UNLOCKED, { achievement });

    console.log(`🏆 Achievement unlocked: ${achievement.name}`);
  }

  /**
   * 解锁赛道
   * @private
   * @param {string} trackId
   */
  #unlockTrack(trackId) {
    const state = this.#gameState.getAll();

    if (!state.unlockedTracks.includes(trackId)) {
      state.unlockedTracks.push(trackId);
      this.#gameState.set('unlockedTracks', state.unlockedTracks);
      console.log(`🏁 Track unlocked: ${trackId}`);
    }
  }

  /**
   * 获取成就进度
   * @private
   * @param {Object} achievement
   * @param {Object} state
   * @returns {Object|null} { current, target }
   */
  #getProgress(achievement, state) {
    // 提取数字目标（如："完成 10 套题" → 10）
    const match = achievement.description.match(/(\d+)/);
    if (!match) return null;

    const target = parseInt(match[1]);

    // 根据成就类型确定当前值
    if (achievement.id.includes('quiz')) {
      return { current: state.learning?.totalQuizzes || 0, target };
    }
    if (achievement.id.includes('word')) {
      return { current: state.learning?.totalWordsMastered || 0, target };
    }

    return null;
  }
}
