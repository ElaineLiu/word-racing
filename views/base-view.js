/**
 * BaseView - Abstract base class for all views
 * Provides lifecycle methods and event binding utilities
 */

import { Events } from '../core/event-bus.js';

export class BaseView {
  #container;
  #eventBus;
  #subscriptions = [];
  #mounted = false;

  constructor(containerId, eventBus) {
    this.containerId = containerId;
    this.#eventBus = eventBus;
  }

  // ==================== Lifecycle ====================

  /**
   * Called when view becomes visible
   * Override in subclass
   */
  mount() {
    this.#container = document.getElementById(this.containerId);
    this.#mounted = true;
    this.render();
  }

  /**
   * Called when view becomes hidden
   * Override in subclass
   */
  unmount() {
    this.#mounted = false;
    this.#unsubscribeAll();
  }

  /**
   * Render the view
   * Override in subclass
   */
  render() {
    // Override in subclass
  }

  /**
   * Update partial content without full re-render
   * Override in subclass
   */
  update(data) {
    // Override in subclass
  }

  // ==================== Helpers ====================

  getContainer() {
    return this.#container;
  }

  isMounted() {
    return this.#mounted;
  }

  getEventBus() {
    return this.#eventBus;
  }

  // ==================== Event Binding ====================

  /**
   * Subscribe to an event (auto-unsubscribes on unmount)
   */
  subscribe(event, callback) {
    const unsub = this.#eventBus.on(event, callback);
    this.#subscriptions.push(unsub);
    return unsub;
  }

  /**
   * Subscribe once (auto-unsubscribes on unmount)
   */
  subscribeOnce(event, callback) {
    const unsub = this.#eventBus.once(event, callback);
    this.#subscriptions.push(unsub);
    return unsub;
  }

  /**
   * Emit an event
   */
  emit(event, data) {
    this.#eventBus.emit(event, data);
  }

  #unsubscribeAll() {
    this.#subscriptions.forEach(unsub => unsub());
    this.#subscriptions = [];
  }

  // ==================== DOM Helpers ====================

  $(selector) {
    return this.#container?.querySelector(selector);
  }

  $$(selector) {
    return this.#container?.querySelectorAll(selector) || [];
  }

  setText(selector, text) {
    const el = this.$(selector);
    if (el) el.textContent = text;
  }

  setHtml(selector, html) {
    const el = this.$(selector);
    if (el) el.innerHTML = html;
  }

  show(selector) {
    const el = this.$(selector);
    if (el) el.style.display = '';
  }

  hide(selector) {
    const el = this.$(selector);
    if (el) el.style.display = 'none';
  }

  addClass(selector, className) {
    const el = this.$(selector);
    if (el) el.classList.add(className);
  }

  removeClass(selector, className) {
    const el = this.$(selector);
    if (el) el.classList.remove(className);
  }

  toggleClass(selector, className, force) {
    const el = this.$(selector);
    if (el) el.classList.toggle(className, force);
  }

  // ==================== Event Listener Helpers ====================

  onClick(selector, handler) {
    const el = this.$(selector);
    if (el) {
      el.addEventListener('click', handler);
    }
  }

  onEvent(selector, event, handler) {
    const el = this.$(selector);
    if (el) {
      el.addEventListener(event, handler);
    }
  }
}
