/**
 * ShopView - Shop page with items, stats, and purchase actions
 */

import { BaseView } from './base-view.js';
import { Events } from '../core/event-bus.js';

export class ShopView extends BaseView {
  #game;

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
  }

  #subscribeToEvents() {
    this.subscribe(Events.RESOURCE_CHANGED, () => {
      if (this.isMounted()) {
        this.updateStats();
        this.renderItems();
      }
    });

    this.subscribe(Events.SHOP_PURCHASE, () => {
      if (this.isMounted()) {
        this.updateStats();
        this.renderItems();
      }
    });
  }
}
