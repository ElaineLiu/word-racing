/**
 * RankingSystem - 实时排名系统
 *
 * 根据圈数和进度计算实时排名，排名变化时发射事件。
 */

export class RankingSystem {
  #cars;
  #eventBus;
  #lastRanking;

  /**
   * @param {Array} cars - 所有赛车数组（包括玩家和AI）
   * @param {EventBus} eventBus - 事件总线
   */
  constructor(cars, eventBus) {
    this.#cars = cars;
    this.#eventBus = eventBus;
    this.#lastRanking = null;
  }

  /**
   * 更新排名并发射事件（如果排名变化）
   */
  update() {
    const newRanking = this.calculateRanking();

    // 检查排名变化
    if (this.#hasRankingChanged(newRanking)) {
      this.#eventBus.emit('rank:changed', {
        ranking: newRanking,
        playerRank: this.getPlayerRank(newRanking),
      });
    }

    this.#lastRanking = newRanking;
  }

  /**
   * 计算排名
   * @returns {Array<{car: Object, rank: number, lap: number, progress: number}>}
   */
  calculateRanking() {
    // 排序规则：已完赛车辆按完赛顺序排在前面；未完赛车辆按圈数和进度排序
    const sorted = [...this.#cars].sort((a, b) => {
      if (a.finished && b.finished) {
        return (a.finishOrder ?? Infinity) - (b.finishOrder ?? Infinity);
      }
      if (a.finished) return -1;
      if (b.finished) return 1;

      if (b.lap !== a.lap) return b.lap - a.lap;
      const aProgress = a.raceProgress ?? a.lastProgress ?? a.progress ?? 0;
      const bProgress = b.raceProgress ?? b.lastProgress ?? b.progress ?? 0;
      return bProgress - aProgress;
    });

    // 添加排名信息
    return sorted.map((car, index) => ({
      car,
      rank: index + 1,
      lap: car.lap,
      progress: car.raceProgress ?? car.lastProgress ?? car.progress ?? 0,
    }));
  }

  /**
   * 获取玩家排名
   * @param {Array} ranking - 可选的排名数组（如果不提供则重新计算）
   * @returns {number} 玩家排名（1-N），如果没有玩家则返回 -1
   */
  getPlayerRank(ranking = null) {
    const r = ranking || this.calculateRanking();
    const playerEntry = r.find(entry => entry.car.isPlayer);
    return playerEntry ? playerEntry.rank : -1;
  }

  /**
   * 检查排名是否变化
   * @param {Array} newRanking - 新排名
   * @returns {boolean}
   * @private
   */
  #hasRankingChanged(newRanking) {
    if (!this.#lastRanking) return true;

    // 比较排名顺序是否变化
    if (newRanking.length !== this.#lastRanking.length) return true;

    for (let i = 0; i < newRanking.length; i++) {
      if (newRanking[i].car !== this.#lastRanking[i].car) {
        return true;
      }

      // 检查进度变化（阈值 0.01，避免微小变化频繁发事件）
      if (Math.abs(newRanking[i].progress - this.#lastRanking[i].progress) > 0.01) {
        return true;
      }

      // 检查圈数变化
      if (newRanking[i].lap !== this.#lastRanking[i].lap) {
        return true;
      }
    }

    return false;
  }
}
