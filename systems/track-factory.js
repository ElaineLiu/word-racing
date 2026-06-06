/**
 * TrackFactory - 赛道工厂
 *
 * 职责：
 * - 根据赛道ID创建赛道实例
 * - 支持2D和3D赛道
 * - 根据 FeatureFlags 选择实现
 *
 * 设计模式：
 * - 实例方法（参考 AchievementManager 模式）
 * - 工厂模式创建赛道
 */

import { Track } from '../js/track.js';
import { TRACK_REGISTRY } from '../config/track-registry.js';
import { FeatureFlags } from '../config/feature-flags.js';
import { TrackUnlockManager } from './track-unlock-manager.js';

export class TrackFactory {
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
   * 创建赛道实例
   * @param {string} trackId
   * @returns {Track} 赛道实例
   * @throws {Error} Unknown track / 3D track not implemented yet
   */
  create(trackId) {
    const trackData = TRACK_REGISTRY[trackId];
    if (!trackData) {
      throw new Error(`Unknown track: ${trackId}`);
    }

    // 根据赛道类型选择实现
    if (trackData.type === '3d') {
      // 3D赛道暂未实现
      throw new Error('3D track not implemented yet');
    } else if (trackData.type === '2d') {
      return new Track(trackData.waypoints, trackData.trackWidth);
    } else {
      throw new Error(`Unknown track type: ${trackData.type}`);
    }
  }

  /**
   * 获取可用赛道列表（根据 FeatureFlags 过滤）
   * @returns {Array<Object>} 赛道配置数组
   */
  getAvailableTracks() {
    return Object.values(TRACK_REGISTRY).filter(track => {
      // 根据 FeatureFlags 过滤
      if (track.type === '3d' && !FeatureFlags.isEnabled('3d-track')) {
        return false;
      }
      if (track.type === '2d' && !FeatureFlags.isEnabled('2d-track')) {
        return false;
      }
      return true;
    });
  }

  /**
   * 检查赛道是否可用（FeatureFlags启用）
   * @param {string} trackId
   * @returns {boolean}
   */
  isAvailable(trackId) {
    const track = TRACK_REGISTRY[trackId];
    if (!track) return false;

    // 检查 FeatureFlags
    if (track.type === '3d' && !FeatureFlags.isEnabled('3d-track')) {
      return false;
    }
    if (track.type === '2d' && !FeatureFlags.isEnabled('2d-track')) {
      return false;
    }

    return true;
  }
}
