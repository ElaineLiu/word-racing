/**
 * RacingCostManager - 赛道金币消耗管理器
 *
 * 职责：
 * - 检查金币是否足够
 * - 扣除金币
 * - 处理退款（比赛取消时）
 *
 * 设计模式：
 * - 实例方法（参考 AchievementManager 模式）
 * - 构造函数注入 eventBus 和 gameState
 */

import { TRACK_REGISTRY } from '../config/track-registry.js';

export class RacingCostManager {
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
   * 检查是否有足够金币
   * @param {string} trackId
   * @returns {boolean}
   */
  canAfford(trackId) {
    const track = TRACK_REGISTRY[trackId];
    if (!track) return false;

    const fuelCoins = this.#gameState.get('fuelCoins') || 0;
    return fuelCoins >= track.cost;
  }

  /**
   * 扣除金币并返回结果
   * @param {string} trackId
   * @returns {{ success: boolean, error?: string }}
   */
  deductCost(trackId) {
    const track = TRACK_REGISTRY[trackId];
    if (!track) {
      return { success: false, error: 'Unknown track' };
    }

    if (!this.canAfford(trackId)) {
      return { success: false, error: 'Insufficient fuel coins' };
    }

    // 扣除金币
    this.#gameState.modify('fuelCoins', -track.cost);
    return { success: true };
  }

  /**
   * 退款（比赛取消时）
   * @param {string} trackId
   */
  refund(trackId) {
    const track = TRACK_REGISTRY[trackId];
    if (track) {
      this.#gameState.modify('fuelCoins', track.cost);
    }
  }

  /**
   * 获取赛道成本
   * @param {string} trackId
   * @returns {number}
   */
  getCost(trackId) {
    const track = TRACK_REGISTRY[trackId];
    return track?.cost || 0;
  }
}
