/**
 * ShopView - Shop page with items, stats, and purchase actions
 *
 * Phase 3.4: 新增赛道标签页（Tracks Tab），按 design/赛道解锁系统详细设计.md UC-02 实现。
 */

import { BaseView } from './base-view.js';
import { Events } from '../core/event-bus.js';

export class ShopView extends BaseView {
  #game;
  #activeTab = 'items'; // 'items' | 'tracks'

  constructor(eventBus, game) {
    super('page-shop', eventBus);
    this.#game = game;
  }

  mount() {
    super.mount();
    this.#setupEventListeners();
    this.#subscribeToEvents();
    this.render();
  }

  render() {
    this.updateStats();
    this.renderItems();
    this.renderTracks();
    this.#applyTabVisibility();
  }

  updateStats() {
    this.setText('#shop-fuel-coins', this.#game.fuelCoins);
    this.setText('#shop-gear-coins', this.#game.gearCoins);
    this.setText('#shop-fuel', Math.round(this.#game.fuel));
    this.setText('#shop-nitro', this.#game.nitroCharges);
  }

  renderItems() {
    const container = this.$('#shop-items');
    if (!container) return;

    container.innerHTML = '';

    const items = this.#game._shopItems;

    items.forEach((item) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'shop-item';

      const info = document.createElement('div');
      info.innerHTML = `<strong>${item.label}</strong> <span class="text-muted">- ${item.desc} (${item.cost} ${item.currency === 'fuel' ? 'Fuel Coins' : 'Gear Coins'})</span>`;
      itemDiv.appendChild(info);

      const buyBtn = document.createElement('button');
      buyBtn.textContent = 'Buy';

      // Check if can buy
      const canBuy = this.#canBuyItem(item);
      if (!canBuy) buyBtn.disabled = true;

      buyBtn.addEventListener('click', () => {
        this.#handlePurchase(item.id);
      });

      itemDiv.appendChild(buyBtn);
      container.appendChild(itemDiv);
    });
  }

  // ==================== Tracks Tab (Phase 3.4) ====================

  renderTracks() {
    const container = this.$('#shop-tracks');
    if (!container) return;
    if (typeof this.#game.getAvailableTracks !== 'function') return;

    container.innerHTML = '';

    const tracks = this.#game.getAvailableTracks();
    const selectedId = this.#game.selectedTrackId;

    tracks.forEach((track) => {
      const div = document.createElement('div');
      div.className = 'shop-track-item';
      div.dataset.trackId = track.id;
      if (track.id === selectedId) div.classList.add('selected');

      const lockIcon = track.unlocked ? '' : '🔒 ';
      const info = document.createElement('div');
      info.innerHTML = `<strong>${lockIcon}${track.name}</strong>
        <span class="text-muted">- ${track.description} (${track.cost} Fuel Coins)</span>`;
      div.appendChild(info);

      const btn = document.createElement('button');
      btn.textContent = track.id === selectedId ? 'Selected' : 'Select';
      btn.disabled = !track.unlocked || !track.canAfford || track.id === selectedId;
      btn.addEventListener('click', () => this.#handleTrackSelect(track.id));
      div.appendChild(btn);

      container.appendChild(div);
    });
  }

  #handleTrackSelect(trackId) {
    try {
      this.#game.selectTrack(trackId);
      this.emit(Events.TRACK_SELECTED, { trackId });
      this.render();
    } catch (err) {
      // UC-02 Alternative Scenarios: 静默捕获，按钮 disabled 已经预防大部分情况
      console.warn('selectTrack failed:', err.message);
    }
  }

  #setActiveTab(tab) {
    this.#activeTab = tab;
    this.#applyTabVisibility();
  }

  #applyTabVisibility() {
    const itemsPanel = this.$('#shop-items');
    const tracksPanel = this.$('#shop-tracks');
    const itemsTab = this.$('#shop-tab-items');
    const tracksTab = this.$('#shop-tab-tracks');

    if (itemsPanel) itemsPanel.style.display = this.#activeTab === 'items' ? 'block' : 'none';
    if (tracksPanel) tracksPanel.style.display = this.#activeTab === 'tracks' ? 'block' : 'none';
    if (itemsTab) itemsTab.classList.toggle('active', this.#activeTab === 'items');
    if (tracksTab) tracksTab.classList.toggle('active', this.#activeTab === 'tracks');
  }

  #canBuyItem(item) {
    if (item.currency === 'fuel') {
      const canAfford = this.#game.fuelCoins >= item.cost;
      // For fuel items, check if tank is not full
      if (item.effect?.fuel) {
        return canAfford && this.#game.fuel < this.#game.maxFuel;
      }
      return canAfford;
    } else if (item.currency === 'gear') {
      const canAfford = this.#game.gearCoins >= item.cost;
      // For upgrades, check if not maxed
      if (item.upgrade && this.#game.upgrades) {
        const currentLevel = this.#game.upgrades[item.upgrade] || 1;
        return canAfford && currentLevel < 4; // MAX_LEVEL = 4
      }
      return canAfford;
    }
    return false;
  }

  #handlePurchase(itemId) {
    this.#game._executeShopAction(itemId);
    this.render();
    this.emit(Events.SHOP_PURCHASE, { itemId });
  }

  #setupEventListeners() {
    this.onClick('#shop-back-btn', () => {
      this.emit(Events.VIEW_CHANGE, { view: 'home' });
    });

    this.onClick('#shop-race-btn', () => {
      if (this.#game.fuel > 0) {
        this.#game.continueToRace();
        this.emit(Events.RACE_START, { source: 'shop' });
      } else {
        alert('Need fuel! Go to quiz to earn fuel coins.');
      }
    });

    this.onClick('#shop-tab-items', () => this.#setActiveTab('items'));
    this.onClick('#shop-tab-tracks', () => this.#setActiveTab('tracks'));
  }

  #subscribeToEvents() {
    this.subscribe(Events.RESOURCE_CHANGED, () => {
      if (this.isMounted()) {
        this.updateStats();
        this.renderItems();
        this.renderTracks();
      }
    });

    this.subscribe(Events.SHOP_PURCHASE, () => {
      if (this.isMounted()) {
        this.updateStats();
        this.renderItems();
        this.renderTracks();
      }
    });
  }
}
