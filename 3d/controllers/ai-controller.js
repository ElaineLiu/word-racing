/**
 * AIController - AI 赛车控制器
 *
 * 使用 PathFollower 进行路径跟随，根据个性调整行为，
 * 实现状态机（racing/recovering）控制 AI 行为。
 */

import { PathFollower } from '../utils/path-follower.js';
import { AI_CONFIG } from '../../config/ai-config.js';

export class AIController {
  #car;
  #track;
  #personality;
  #pathFollower;
  #currentBehavior;
  #recoveryTimer;
  #mistakeCheckTimer;

  /**
   * @param {Object} car - 赛车对象，需要有 input 接口
   * @param {Object} track - 赛道对象，需要有 waypoints
   * @param {Object} personality - AI 个性配置（可选，默认 balanced）
   */
  constructor(car, track, personality = null) {
    this.#car = car;
    this.#track = track;
    this.#personality = personality || AI_CONFIG.PERSONALITIES.balanced;

    // 创建 PathFollower
    const lookahead = this.#personality.lookaheadDistance || AI_CONFIG.PATH_FOLLOWING.lookaheadDistance;
    this.#pathFollower = new PathFollower(track.waypoints, lookahead);

    // 应用随机偏移，让 AI 不完全重叠
    const offset = (Math.random() - 0.5) * AI_CONFIG.PATH_FOLLOWING.offsetRange;
    this.#pathFollower.setOffset(offset);

    // 初始化状态
    this.#currentBehavior = 'racing';
    this.#recoveryTimer = 0;
    this.#mistakeCheckTimer = 0;
  }

  /**
   * 每帧更新 AI 决策
   * @param {number} deltaTime - 时间步长（秒）
   */
  update(deltaTime = 1 / 60) {
    // 1. 更新恢复状态（先更新，再检查犯错）
    if (this.#currentBehavior === 'recovering') {
      this.#recoveryTimer -= deltaTime;
      if (this.#recoveryTimer <= 0) {
        this.#currentBehavior = 'racing';
      }
    }

    // 2. 检查犯错（仅在 racing 状态）
    if (this.#currentBehavior === 'racing') {
      this.#mistakeCheckTimer += deltaTime;
      if (this.#mistakeCheckTimer >= 1.0) {
        this.#mistakeCheckTimer = 0;
        if (Math.random() < this.#personality.mistakeProbability) {
          this.#enterRecovery();
        }
      }
    }

    // 3. 计算转向
    const steering = this.#pathFollower.calculateSteering(
      this.#car.x,
      this.#car.y,
      this.#car.angle
    );

    // 4. 更新输入
    this.#updateInput(steering);

    // 5. 调整速度（根据个性和状态）
    this.#adjustSpeed();
  }

  /**
   * 进入恢复状态
   * @private
   */
  #enterRecovery() {
    this.#currentBehavior = 'recovering';
    this.#recoveryTimer = this.#personality.mistakeDuration || AI_CONFIG.RECOVERY.duration;
  }

  /**
   * 更新赛车输入
   * @param {number} steering - 转向值 [-1, 1]
   * @private
   */
  #updateInput(steering) {
    // 清空所有输入
    this.#car.input.up = false;
    this.#car.input.down = false;
    this.#car.input.left = false;
    this.#car.input.right = false;
    this.#car.input.nitro = false;

    // 转向（设置阈值避免微小转向）
    if (steering < -0.1) {
      this.#car.input.left = true;
    } else if (steering > 0.1) {
      this.#car.input.right = true;
    }

    // 油门
    if (this.#currentBehavior === 'racing') {
      this.#car.input.up = true;
    } else {
      // 恢复期间减速（随机间断加油）
      this.#car.input.up = Math.random() > AI_CONFIG.RECOVERY.speedReduction;
    }
  }

  /**
   * 调整速度（通过速度乘数影响物理）
   * @private
   */
  #adjustSpeed() {
    // 注意：不直接修改 car.maxSpeed（会永久影响）
    // 当前实现通过油门占空比实现减速（在 #updateInput 中）
    // 如果需要更精细的速度控制，可以：
    // 1. 在 Car3D 中添加 speedMultiplier 属性
    // 2. 或通过 nitro 技巧实现临时加速（激进个性）
  }

  /**
   * 获取个性名称
   */
  get personality() {
    return this.#personality.name;
  }

  /**
   * 获取当前行为状态
   */
  get currentBehavior() {
    return this.#currentBehavior;
  }
}
