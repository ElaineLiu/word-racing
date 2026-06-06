/**
 * TrackInterface - 赛道抽象接口
 *
 * 这是文档性质的接口，所有赛道实现（2D/3D）应遵循此接口。
 * 不强制继承，但实现者应确保提供所有必需的方法。
 *
 * 设计意图：
 * - 统一接口让 Game 类无需关心底层实现
 * - 支持 2D 和 3D 赛道并存
 * - 方便测试和扩展
 */

export class TrackInterface {
  // ========== 赛道元数据 ==========

  /** @returns {string} 唯一标识 */
  get id() { throw new Error('TrackInterface.id must be implemented'); }

  /** @returns {string} 显示名称 */
  get name() { throw new Error('TrackInterface.name must be implemented'); }

  /** @returns {'2d'|'3d'} 赛道类型 */
  get type() { throw new Error('TrackInterface.type must be implemented'); }

  /** @returns {string} 描述 */
  get description() { throw new Error('TrackInterface.description must be implemented'); }

  /** @returns {number} 燃油币消耗 */
  get cost() { throw new Error('TrackInterface.cost must be implemented'); }

  // ========== 赛道数据 ==========

  /** @returns {{ x: number, y: number, angle: number }} 起始位置和角度 */
  get startPos() { throw new Error('TrackInterface.startPos must be implemented'); }

  /** @returns {Array<{ x: number, y: number }>} 赛道路径点 */
  get waypoints() { throw new Error('TrackInterface.waypoints must be implemented'); }

  /** @returns {number} 赛道宽度 */
  get trackWidth() { throw new Error('TrackInterface.trackWidth must be implemented'); }

  // ========== 渲染接口 ==========

  /**
   * 渲染赛道
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {Car} car - 赛车对象
   * @param {GameState} gameState - 游戏状态
   */
  render(ctx, car, gameState) { throw new Error('TrackInterface.render must be implemented'); }

  /**
   * 更新赛道状态
   * @param {number} deltaTime - 时间增量（帧）
   */
  update(deltaTime) { throw new Error('TrackInterface.update must be implemented'); }

  // ========== 游戏逻辑 ==========

  /**
   * 检查碰撞
   * @param {Car} car
   * @returns {boolean}
   */
  checkCollision(car) { throw new Error('TrackInterface.checkCollision must be implemented'); }

  /**
   * 获取赛车进度
   * @param {Car} car
   * @returns {number} 0-1 之间的进度
   */
  getProgress(car) { throw new Error('TrackInterface.getProgress must be implemented'); }

  /**
   * 检查赛车是否在赛道上
   * @param {Car} car
   * @returns {boolean}
   */
  isOnTrack(car) { throw new Error('TrackInterface.isOnTrack must be implemented'); }
}
