/**
 * ShopView - 赛道标签页测试（Phase 3.4）
 *
 * 验证 ShopView 的赛道标签页功能：
 *   - 标签切换（道具 / 赛道）
 *   - 赛道列表渲染（已解锁/未解锁）
 *   - 当前选中赛道高亮
 *   - 点击选择赛道调用 game.selectTrack()
 *   - 错误处理（未解锁）
 *
 * 借鉴 ISSUE_LOG #001（解锁≠免费）和 #003（Alternative Scenario 必须测试）。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { EventBus, Events } from '../core/event-bus.js';
import { ShopView } from '../views/shop-view.js';
import { TRACK_REGISTRY } from '../config/track-registry.js';

function buildShopHtml() {
  return `
    <div id="page-shop">
      <span id="shop-fuel-coins"></span>
      <span id="shop-gear-coins"></span>
      <span id="shop-fuel"></span>
      <span id="shop-nitro"></span>

      <!-- Tab 切换按钮 -->
      <div id="shop-tabs">
        <button id="shop-tab-items" class="active">Items</button>
        <button id="shop-tab-tracks">Tracks</button>
      </div>

      <!-- Items 标签内容 -->
      <div id="shop-items"></div>

      <!-- Tracks 标签内容（默认隐藏） -->
      <div id="shop-tracks" style="display:none;"></div>

      <button id="shop-back-btn"></button>
      <button id="shop-race-btn"></button>
    </div>
  `;
}

function createMockGame(overrides = {}) {
  return {
    fuelCoins: 50,
    gearCoins: 30,
    fuel: 80,
    maxFuel: 100,
    nitroCharges: 2,
    upgrades: { engine: 1, tire: 1, body: 1 },
    selectedTrackId: 'shanghai-2d',
    _shopItems: [
      { id: 'fuel20', label: 'Fuel +20', desc: 'Add 20 fuel', cost: 15, currency: 'fuel', effect: { fuel: 20 } },
    ],
    _executeShopAction: vi.fn(),
    continueToRace: vi.fn(),
    getAvailableTracks: vi.fn(() => Object.values(TRACK_REGISTRY).map(t => ({
      ...t,
      unlocked: t.id === 'shanghai-2d',
    }))),
    selectTrack: vi.fn(function (id) { this.selectedTrackId = id; }),
    ...overrides,
  };
}

function mountShopView(mockGame, eventBus) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${buildShopHtml()}</body></html>`);
  global.document = dom.window.document;
  global.window = dom.window;
  const view = new ShopView(eventBus, mockGame);
  view.mount();
  return { view, document: dom.window.document };
}

describe('ShopView - 赛道标签页 (Phase 3.4)', () => {
  let eventBus;
  let mockGame;

  beforeEach(() => {
    eventBus = new EventBus();
    mockGame = createMockGame();
  });

  describe('标签切换', () => {
    it('初始应显示 Items 标签，隐藏 Tracks 标签', () => {
      const { document } = mountShopView(mockGame, eventBus);
      expect(document.getElementById('shop-items').style.display).not.toBe('none');
      expect(document.getElementById('shop-tracks').style.display).toBe('none');
    });

    it('点击 Tracks 标签应显示赛道面板、隐藏道具面板', () => {
      const { document } = mountShopView(mockGame, eventBus);
      document.getElementById('shop-tab-tracks').click();
      expect(document.getElementById('shop-tracks').style.display).not.toBe('none');
      expect(document.getElementById('shop-items').style.display).toBe('none');
    });

    it('点击 Items 标签应切回道具面板', () => {
      const { document } = mountShopView(mockGame, eventBus);
      document.getElementById('shop-tab-tracks').click();
      document.getElementById('shop-tab-items').click();
      expect(document.getElementById('shop-items').style.display).not.toBe('none');
      expect(document.getElementById('shop-tracks').style.display).toBe('none');
    });

    it('当前激活的标签按钮应有 active 类', () => {
      const { document } = mountShopView(mockGame, eventBus);
      document.getElementById('shop-tab-tracks').click();
      expect(document.getElementById('shop-tab-tracks').classList.contains('active')).toBe(true);
      expect(document.getElementById('shop-tab-items').classList.contains('active')).toBe(false);
    });
  });

  describe('赛道列表渲染', () => {
    it('应渲染 TRACK_REGISTRY 中所有赛道', () => {
      const { document } = mountShopView(mockGame, eventBus);
      const tracksContainer = document.getElementById('shop-tracks');
      const trackItems = tracksContainer.querySelectorAll('.shop-track-item');
      expect(trackItems.length).toBe(Object.keys(TRACK_REGISTRY).length);
    });

    it('应调用 game.getAvailableTracks() 获取数据', () => {
      mountShopView(mockGame, eventBus);
      expect(mockGame.getAvailableTracks).toHaveBeenCalled();
    });

    it('已解锁但未选中的赛道应显示可点的选择按钮', () => {
      // 让 monaco 已解锁，但当前选中的是 shanghai
      mockGame.getAvailableTracks = vi.fn(() => Object.values(TRACK_REGISTRY).map(t => ({
        ...t, unlocked: t.id !== 'silverstone-2d',
      })));
      const { document } = mountShopView(mockGame, eventBus);
      const monaco = document.querySelector('.shop-track-item[data-track-id="monaco-2d"]');
      expect(monaco).toBeTruthy();
      const btn = monaco.querySelector('button');
      expect(btn).toBeTruthy();
      expect(btn.disabled).toBe(false);
    });

    it('未解锁赛道应显示 🔒 锁定标识', () => {
      const { document } = mountShopView(mockGame, eventBus);
      const monaco = document.querySelector('.shop-track-item[data-track-id="monaco-2d"]');
      expect(monaco.textContent).toContain('🔒');
    });

    it('未解锁赛道的按钮应 disabled', () => {
      const { document } = mountShopView(mockGame, eventBus);
      const monaco = document.querySelector('.shop-track-item[data-track-id="monaco-2d"]');
      const btn = monaco.querySelector('button');
      expect(btn.disabled).toBe(true);
    });

    it('应显示赛道名称和描述', () => {
      const { document } = mountShopView(mockGame, eventBus);
      const shanghai = document.querySelector('.shop-track-item[data-track-id="shanghai-2d"]');
      expect(shanghai.textContent).toContain('Shanghai International Circuit');
    });

    it('当前选中赛道应有 selected 类', () => {
      mockGame.selectedTrackId = 'shanghai-2d';
      const { document } = mountShopView(mockGame, eventBus);
      const shanghai = document.querySelector('.shop-track-item[data-track-id="shanghai-2d"]');
      expect(shanghai.classList.contains('selected')).toBe(true);
    });
  });

  describe('选择赛道交互', () => {
    beforeEach(() => {
      // 多个赛道都已解锁，currentSelected = shanghai
      mockGame.getAvailableTracks = vi.fn(() => Object.values(TRACK_REGISTRY).map(t => ({
        ...t, unlocked: true,
      })));
    });

    it('点击已解锁未选中赛道按钮应调用 game.selectTrack(id)', () => {
      const { document } = mountShopView(mockGame, eventBus);
      const monaco = document.querySelector('.shop-track-item[data-track-id="monaco-2d"]');
      monaco.querySelector('button').click();
      expect(mockGame.selectTrack).toHaveBeenCalledWith('monaco-2d');
    });

    it('选择成功后应发出 TRACK_SELECTED 事件', () => {
      const handler = vi.fn();
      eventBus.on(Events.TRACK_SELECTED, handler);
      const { document } = mountShopView(mockGame, eventBus);
      document.querySelector('.shop-track-item[data-track-id="monaco-2d"] button').click();
      expect(handler).toHaveBeenCalledWith({ trackId: 'monaco-2d' });
    });

    it('selectTrack 抛错时应捕获并不崩溃', () => {
      mockGame.selectTrack = vi.fn(() => { throw new Error('Insufficient fuel coins'); });
      const { document } = mountShopView(mockGame, eventBus);
      expect(() => {
        document.querySelector('.shop-track-item[data-track-id="monaco-2d"] button').click();
      }).not.toThrow();
    });

    it('选择后应重新渲染（高亮新的 selected）', () => {
      const { document } = mountShopView(mockGame, eventBus);
      document.querySelector('.shop-track-item[data-track-id="monaco-2d"] button').click();
      document.getElementById('shop-tab-tracks').click();
      const monaco = document.querySelector('.shop-track-item[data-track-id="monaco-2d"]');
      expect(monaco.classList.contains('selected')).toBe(true);
    });
  });
});
