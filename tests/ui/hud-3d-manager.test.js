import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HUD3DManager } from '../../ui/hud-3d/hud-manager.js';
import { EventBus } from '../../core/event-bus.js';
import { GameState } from '../../core/game-state.js';

function createMockCar() {
  return {
    x: 0,
    z: 0,
    lap: 1,
    bestLapTime: Infinity,
    speed: 0,
    maxSpeed: 200,
    getDisplaySpeed: vi.fn(() => 120),
    getGear: vi.fn(() => 3),
    getRPM: vi.fn(() => 4500),
    getNitroStatus: vi.fn(() => ({ charges: 2, active: false, progress: 0.4 })),
  };
}

function createMockTrack() {
  return {
    centerline: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
  };
}

function createMockRaceSession() {
  const playerCar = createMockCar();
  const aiCar1 = createMockCar();
  const aiCar2 = createMockCar();

  return {
    playerCar,
    aiCars: [aiCar1, aiCar2],
    cars: [playerCar, aiCar1, aiCar2],
    playerRank: 1,
    ranking: [playerCar, aiCar1, aiCar2],
    track: createMockTrack(),
  };
}

function createMockGame() {
  return {
    raceTime: 60000,
    totalLaps: 3,
  };
}

function createHUDManager() {
  const eventBus = new EventBus();
  const gameState = new GameState(eventBus);
  const raceSession = createMockRaceSession();
  const game = createMockGame();

  const manager = new HUD3DManager(eventBus, raceSession, game);

  return { manager, eventBus, raceSession, game };
}

describe('HUD3DManager', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
  });

  describe('mount()', () => {
    it('应创建 HUD 容器', () => {
      const { manager } = createHUDManager();

      manager.mount();

      const container = document.getElementById('hud-3d-container');
      expect(container).toBeTruthy();
      expect(container.classList.contains('hud-3d-container')).toBe(true);

      manager.destroy();
    });

    it('应创建所有组件', () => {
      const { manager } = createHUDManager();

      manager.mount();

      // 检查 TopBar 是否创建
      const topBar = document.querySelector('.hud-top-bar');
      expect(topBar).toBeTruthy();

      // 检查 Speedometer 是否创建
      const speedometer = document.querySelector('.speedometer-container');
      expect(speedometer).toBeTruthy();

      // 检查 Minimap 是否创建
      const minimap = document.querySelector('.minimap-container');
      expect(minimap).toBeTruthy();

      // 检查 NitroDisplay 是否创建
      const nitro = document.querySelector('.nitro-display');
      expect(nitro).toBeTruthy();

      // 检查 ControlHints 是否创建
      const hints = document.querySelector('.control-hints');
      expect(hints).toBeTruthy();

      manager.destroy();
    });

    it('容器应设置 pointer-events: none', () => {
      const { manager } = createHUDManager();

      manager.mount();

      const container = document.getElementById('hud-3d-container');
      expect(container.style.pointerEvents).toBe('none');

      manager.destroy();
    });
  });

  describe('update()', () => {
    it('应更新 TopBar 显示的数据', () => {
      const { manager } = createHUDManager();

      manager.mount();
      manager.update();

      // 验证排名显示
      const rankValue = document.querySelector('#hud-rank .value');
      expect(rankValue).toBeTruthy();
      expect(rankValue.textContent).toContain('1st');
      expect(rankValue.textContent).toContain('3');

      // 验证时间显示
      const timeValue = document.querySelector('#hud-time .value');
      expect(timeValue).toBeTruthy();
      expect(timeValue.textContent).toBe('01:00.00');

      manager.destroy();
    });

    it('应更新速度表的数据', () => {
      const { manager } = createHUDManager();

      manager.mount();
      manager.update();

      // 验证速度表 Canvas 存在
      const speedometer = document.querySelector('.speedometer-container canvas');
      expect(speedometer).toBeTruthy();

      manager.destroy();
    });

    it('应更新小地图的数据', () => {
      const { manager } = createHUDManager();

      manager.mount();
      manager.update();

      // 验证小地图 Canvas 存在
      const minimap = document.querySelector('.minimap-container canvas');
      expect(minimap).toBeTruthy();

      manager.destroy();
    });
  });

  describe('destroy()', () => {
    it('应移除 HUD 容器', () => {
      const { manager } = createHUDManager();

      manager.mount();
      expect(document.getElementById('hud-3d-container')).toBeTruthy();

      manager.destroy();
      expect(document.getElementById('hud-3d-container')).toBeNull();
    });

    it('应停止更新循环', async () => {
      const { manager } = createHUDManager();

      manager.mount();

      // 等待一帧，确保更新循环启动
      await new Promise(resolve => requestAnimationFrame(resolve));

      manager.destroy();

      // 验证容器已移除（说明更新循环已停止）
      expect(document.getElementById('hud-3d-container')).toBeNull();
    });

    it('应移除所有组件', () => {
      const { manager } = createHUDManager();

      manager.mount();

      // 验证所有组件存在
      expect(document.querySelector('.hud-top-bar')).toBeTruthy();
      expect(document.querySelector('.speedometer-container')).toBeTruthy();
      expect(document.querySelector('.minimap-container')).toBeTruthy();
      expect(document.querySelector('.nitro-display')).toBeTruthy();
      expect(document.querySelector('.control-hints')).toBeTruthy();

      manager.destroy();

      // 验证所有组件已移除
      expect(document.querySelector('.hud-top-bar')).toBeNull();
      expect(document.querySelector('.speedometer-container')).toBeNull();
      expect(document.querySelector('.minimap-container')).toBeNull();
      expect(document.querySelector('.nitro-display')).toBeNull();
      expect(document.querySelector('.control-hints')).toBeNull();
    });
  });

  describe('事件订阅', () => {
    it('排名变化时应立即更新 TopBar', () => {
      const { manager, eventBus, raceSession } = createHUDManager();

      manager.mount();

      // 初始排名显示
      const rankValue = document.querySelector('#hud-rank .value');
      expect(rankValue.textContent).toContain('1st');

      // 触发排名变化事件
      eventBus.emit('rank:changed', {
        ranking: raceSession.cars,
        playerRank: 2,
      });

      // 验证排名已更新
      expect(rankValue.textContent).toContain('2nd');

      manager.destroy();
    });
  });
});
