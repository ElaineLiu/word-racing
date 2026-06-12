import { TopBar } from './top-bar.js';
import { Speedometer } from './speedometer.js';
import { Minimap } from './minimap.js';
import { NitroDisplay } from './nitro-display.js';
import { ControlHints } from './control-hints.js';

export class HUD3DManager {
  #eventBus;
  #raceSession;
  #game;
  #container;
  #components = {};
  #updateInterval = null;

  constructor(eventBus, raceSession, game) {
    this.#eventBus = eventBus;
    this.#raceSession = raceSession;
    this.#game = game;
  }

  /**
   * 挂载 HUD 到页面
   */
  mount() {
    this.#createContainer();

    // 初始化组件
    this.#components.topBar = new TopBar(this.#container);
    this.#components.speedometer = new Speedometer(this.#container);
    this.#components.minimap = new Minimap(this.#container, this.#raceSession.track);
    this.#components.nitroDisplay = new NitroDisplay(this.#container);
    this.#components.controlHints = new ControlHints(this.#container);

    // 订阅事件
    this.#subscribeToEvents();

    // 启动轮询更新（速度/转速需要每帧更新）
    this.#startUpdateLoop();
  }

  /**
   * 更新所有组件
   */
  update() {
    const playerCar = this.#raceSession.playerCar;
    const data = {
      // 排名数据
      rank: this.#raceSession.playerRank,
      totalCars: this.#raceSession.cars.length,

      // 时间数据
      raceTime: this.#game.raceTime,
      bestLapTime: playerCar.bestLapTime,
      lap: playerCar.lap,
      totalLaps: this.#game.totalLaps,

      // 分数数据
      score: this.#game.raceScore,

      // 速度数据
      speed: playerCar.getDisplaySpeed(),
      gear: playerCar.getGear(),
      rpm: playerCar.getRPM(),

      // 氮气数据
      nitro: playerCar.getNitroStatus(),

      // 小地图数据
      playerPos: { x: playerCar.x, y: playerCar.y },
      aiPositions: this.#raceSession.aiCars.map(car => ({ x: car.x, y: car.y })),
    };

    Object.values(this.#components).forEach(c => c.update(data));
  }

  /**
   * 销毁 HUD
   */
  destroy() {
    this.#stopUpdateLoop();
    Object.values(this.#components).forEach(c => c.destroy());
    this.#container?.remove();
    this.#container = null;
  }

  // ==================== 内部方法 ====================

  #createContainer() {
    this.#container = document.createElement('div');
    this.#container.id = 'hud-3d-container';
    this.#container.className = 'hud-3d-container';
    this.#container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(this.#container);
  }

  #subscribeToEvents() {
    // 排名变化时立即更新
    this.#eventBus.on('rank:changed', ({ ranking, playerRank }) => {
      this.#components.topBar?.updateRank(playerRank, ranking.length);
    });
  }

  #startUpdateLoop() {
    // 每帧更新速度/转速等实时数据
    const loop = () => {
      if (this.#container) {
        this.update();
      }
      this.#updateInterval = requestAnimationFrame(loop);
    };
    this.#updateInterval = requestAnimationFrame(loop);
  }

  #stopUpdateLoop() {
    if (this.#updateInterval) {
      cancelAnimationFrame(this.#updateInterval);
      this.#updateInterval = null;
    }
  }
}
