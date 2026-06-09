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
  #track3DOptions;

  /**
   * @param {EventBus} eventBus
   * @param {GameState} gameState
   */
  constructor(eventBus, gameState, { track3DOptions = {} } = {}) {
    if (!eventBus) throw new Error('EventBus is required');
    if (!gameState) throw new Error('GameState is required');

    this.#eventBus = eventBus;
    this.#gameState = gameState;
    this.#track3DOptions = track3DOptions;
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

    if (trackData.type === '3d') {
      if (!this.isAvailable(trackId)) {
        throw new Error(`Track not available: ${trackId}`);
      }
      throw new Error('Use createAsync for 3D tracks');
    } else if (trackData.type === '2d') {
      return new Track(trackData.waypoints, trackData.trackWidth);
    } else {
      throw new Error(`Unknown track type: ${trackData.type}`);
    }
  }

  async createAsync(trackId) {
    const trackData = TRACK_REGISTRY[trackId];
    if (!trackData) {
      throw new Error(`Unknown track: ${trackId}`);
    }

    if (trackData.type === '3d') {
      if (!this.isAvailable(trackId)) {
        throw new Error(`Track not available: ${trackId}`);
      }
      const { Track3D } = await import('../3d/core/track-3d.js');
      return new Track3D(trackData, this.#eventBus, this.#gameState, this.#track3DOptions);
    }

    return this.create(trackId);
  }

  _isComplete3DTrack(track) {
    return Array.isArray(track.waypoints) && track.waypoints.length > 0 && track.trackWidth > 0;
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
      if (track.type === '3d' && !this._isComplete3DTrack(track)) {
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

    // 不完整的 3D 赛道视为不可用
    if (track.type === '3d' && !this._isComplete3DTrack(track)) {
      return false;
    }

    return true;
  }
}
