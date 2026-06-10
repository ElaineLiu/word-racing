/**
 * PathFollower - Pure Pursuit 路径跟随算法
 *
 * 根据当前位置和角度计算转向角度，用于 AI 赛车路径跟随。
 */

export class PathFollower {
  #waypoints;
  #lookaheadDistance;
  #offset;

  constructor(waypoints, lookaheadDistance = 100) {
    if (!waypoints || waypoints.length === 0) {
      throw new Error('Waypoints cannot be empty');
    }

    this.#waypoints = waypoints;
    this.#lookaheadDistance = lookaheadDistance;
    this.#offset = 0;
  }

  get waypoints() {
    return this.#waypoints;
  }

  get lookaheadDistance() {
    return this.#lookaheadDistance;
  }

  /**
   * 计算转向角度
   * @param {number} x - 当前 X 坐标
   * @param {number} y - 当前 Y 坐标
   * @param {number} currentAngle - 当前朝向角度（弧度）
   * @returns {number} 转向值 [-1, 1]，负数左转，正数右转
   */
  calculateSteering(x, y, currentAngle) {
    // 1. 找到前瞻点
    const lookahead = this.#findLookaheadPoint(x, y);

    // 2. 计算目标方向
    const targetAngle = Math.atan2(lookahead.y - y, lookahead.x - x);

    // 3. 计算角度差
    const angleDiff = this.#normalizeAngle(targetAngle - currentAngle);

    // 4. 映射到 [-1, 1]
    // angleDiff ∈ [-π, π]，映射到 [-1, 1]
    return Math.max(-1, Math.min(1, angleDiff / Math.PI));
  }

  /**
   * 设置路径偏移（让 AI 不完全贴中心线）
   * @param {number} offset - 偏移值（像素）
   */
  setOffset(offset) {
    this.#offset = offset;
  }

  /**
   * 找到前瞻点
   * @param {number} x - 当前 X 坐标
   * @param {number} y - 当前 Y 坐标
   * @returns {{x: number, y: number}} 前瞻点坐标
   * @private
   */
  #findLookaheadPoint(x, y) {
    // 1. 找到最近的 waypoint
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < this.#waypoints.length; i++) {
      const wp = this.#waypoints[i];
      const dist = Math.hypot(wp.x - x, wp.y - y);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestIndex = i;
      }
    }

    // 2. 沿路径向前搜索，找到距离当前位置 lookaheadDistance 的点
    let accumulatedDistance = 0;
    let currentIndex = nearestIndex;

    // 循环路径，从最近点向前搜索
    while (accumulatedDistance < this.#lookaheadDistance) {
      const nextIndex = (currentIndex + 1) % this.#waypoints.length;
      const current = this.#waypoints[currentIndex];
      const next = this.#waypoints[nextIndex];

      const segmentLength = Math.hypot(next.x - current.x, next.y - current.y);

      if (accumulatedDistance + segmentLength >= this.#lookaheadDistance) {
        // 前瞻点在这段路径上
        const remaining = this.#lookaheadDistance - accumulatedDistance;
        const t = remaining / segmentLength;

        // 插值计算前瞻点
        let lookaheadX = current.x + (next.x - current.x) * t;
        let lookaheadY = current.y + (next.y - current.y) * t;

        // 应用偏移（沿路径法线方向）
        if (this.#offset !== 0) {
          const dx = next.x - current.x;
          const dy = next.y - current.y;
          const len = Math.hypot(dx, dy);

          if (len > 0) {
            // 法线方向（垂直于路径方向）
            const nx = -dy / len;
            const ny = dx / len;

            lookaheadX += nx * this.#offset;
            lookaheadY += ny * this.#offset;
          }
        }

        return { x: lookaheadX, y: lookaheadY };
      }

      accumulatedDistance += segmentLength;
      currentIndex = nextIndex;

      // 防止无限循环（已绕了一圈）
      if (currentIndex === nearestIndex) {
        break;
      }
    }

    // 如果路径总长度小于前瞻距离，返回最后一个点
    const lastWaypoint = this.#waypoints[this.#waypoints.length - 1];
    return { x: lastWaypoint.x, y: lastWaypoint.y };
  }

  /**
   * 归一化角度到 [-π, π]
   * @param {number} angle - 角度（弧度）
   * @returns {number} 归一化后的角度
   * @private
   */
  #normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }
}
