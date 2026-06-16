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

    // 顶部解锁规则总览卡片
    const overview = document.createElement('div');
    overview.className = 'track-unlock-overview';
    overview.style.cssText = 'background: rgba(33, 150, 243, 0.08); border-left: 3px solid #2196F3; padding: 10px 12px; margin-bottom: 12px; border-radius: 4px; font-size: 13px; line-height: 1.6;';
    overview.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 6px;">How to unlock new tracks</div>
      <div style="color: var(--text-muted, #888);">
        • Complete quizzes to build words learned and words mastered<br>
        • Meet the progress requirements below to unlock tracks automatically through achievements<br>
        • After a track is unlocked, spend the required Fuel Coins to race
      </div>
    `;
    container.appendChild(overview);

    const tracks = this.#game.getAvailableTracks();
    const selectedId = this.#game.selectedTrackId;

    tracks.forEach((track) => {
      const div = document.createElement('div');
      div.className = 'shop-track-item';
      div.dataset.trackId = track.id;
      if (track.id === selectedId) div.classList.add('selected');

      const lockIcon = track.unlocked ? '' : '🔒 ';
      const info = document.createElement('div');

      // 基本信息
      let infoHTML = `<strong>${lockIcon}${track.name}</strong>
        <span class="text-muted">- ${track.description} (${track.cost} Fuel Coins)</span>`;

      // 解锁进度（如果未解锁）
      if (!track.unlocked && this.#game._trackUnlockManager) {
        const progress = this.#game._trackUnlockManager.getUnlockProgress(track.id);
        if (progress && progress.requirements) {
          const req = progress.requirements;

          // 计算还差多少
          const remaining = [];
          if (req.wordsLearned.required > 0 && req.wordsLearned.current < req.wordsLearned.required) {
            remaining.push(`Learn ${req.wordsLearned.required - req.wordsLearned.current} more words`);
          }
          if (req.quizzesCompleted.required > 0 && req.quizzesCompleted.current < req.quizzesCompleted.required) {
            remaining.push(`Complete ${req.quizzesCompleted.required - req.quizzesCompleted.current} more quizzes`);
          }
          if (req.masteryCount.required > 0 && req.masteryCount.current < req.masteryCount.required) {
            remaining.push(`Master ${req.masteryCount.required - req.masteryCount.current} more words`);
          }

          infoHTML += '<div class="unlock-requirements" style="margin-top: 8px; font-size: 12px;">';

          if (remaining.length > 0) {
            infoHTML += `<div style="color: #FF9800; margin-bottom: 6px;">Remaining: ${remaining.join(', ')}</div>`;
          } else {
            infoHTML += `<div style="color: #4CAF50; margin-bottom: 6px;">Requirements met. Complete your next quiz to unlock this track.</div>`;
          }

          // 进度条
          if (req.wordsLearned.required > 0) {
            const percent = Math.min(100, (req.wordsLearned.current / req.wordsLearned.required) * 100);
            infoHTML += `<div>Words learned: ${req.wordsLearned.current}/${req.wordsLearned.required}
              <div style="background: #eee; height: 4px; border-radius: 2px; margin-top: 2px;">
                <div style="background: #4CAF50; width: ${percent}%; height: 100%; border-radius: 2px;"></div>
              </div>
            </div>`;
          }

          if (req.quizzesCompleted.required > 0) {
            const percent = Math.min(100, (req.quizzesCompleted.current / req.quizzesCompleted.required) * 100);
            infoHTML += `<div style="margin-top: 6px;">Quizzes completed: ${req.quizzesCompleted.current}/${req.quizzesCompleted.required}
              <div style="background: #eee; height: 4px; border-radius: 2px; margin-top: 2px;">
                <div style="background: #2196F3; width: ${percent}%; height: 100%; border-radius: 2px;"></div>
              </div>
            </div>`;
          }

          if (req.masteryCount.required > 0) {
            const percent = Math.min(100, (req.masteryCount.current / req.masteryCount.required) * 100);
            infoHTML += `<div style="margin-top: 6px;">Mastered: ${req.masteryCount.current}/${req.masteryCount.required}
              <div style="background: #eee; height: 4px; border-radius: 2px; margin-top: 2px;">
                <div style="background: #FF9800; width: ${percent}%; height: 100%; border-radius: 2px;"></div>
              </div>
            </div>`;
          }

          infoHTML += '</div>';
        }
      }

      info.innerHTML = infoHTML;
      div.appendChild(info);

      const btn = document.createElement('button');
      if (!track.unlocked) {
        btn.textContent = 'Locked';
      } else if (track.id === selectedId) {
        btn.textContent = 'Selected';
      } else if (!track.canAfford) {
        btn.textContent = 'Not enough fuel coins';
      } else {
        btn.textContent = 'Select';
      }
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
      // UC-02 Alternative Scenarios: 用户友好的错误提示
      if (err.message === 'Track not unlocked') {
        alert('This track is locked. Complete the achievement requirements to unlock it.');
      } else if (err.message === 'Insufficient fuel coins') {
        const track = this.#game.getAvailableTracks().find(t => t.id === trackId);
        const cost = track ? track.cost : 0;
        alert(`Not enough fuel coins. You need ${cost} Fuel Coins.`);
      } else {
        console.warn('selectTrack failed:', err.message);
      }
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
      return this.#game.fuelCoins >= item.cost;
    } else if (item.currency === 'gear') {
      return this.#game.gearCoins >= item.cost;
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

    this.onClick('#shop-race-btn', async () => {
      const button = this.$('#shop-race-btn');
      try {
        if (button) button.disabled = true;
        await this.#game.continueToRace();
        this.emit(Events.RACE_START, { source: 'shop' });
      } catch (err) {
        alert(err.message);
      } finally {
        if (button) button.disabled = false;
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
