/**
 * UserSwitcher - 用户切换UI组件
 *
 * 职责：
 * - 显示当前用户名
 * - 提供用户切换下拉菜单
 * - 新建用户功能
 */

import { Events } from '../core/event-bus.js';

export class UserSwitcher {
  #eventBus;
  #userManager;
  #container = null;

  /**
   * @param {EventBus} eventBus - 事件总线
   * @param {UserManager} userManager - 用户管理器
   */
  constructor(eventBus, userManager) {
    this.#eventBus = eventBus;
    this.#userManager = userManager;
  }

  /**
   * 挂载到指定容器
   * @param {string} selector - CSS选择器
   */
  mount(selector) {
    const parent = document.querySelector(selector);
    if (!parent) {
      console.warn(`[UserSwitcher] Container not found: ${selector}`);
      return;
    }

    this.#container = document.createElement('div');
    this.#container.id = 'user-switcher';
    this.#container.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1000;
      font-family: Arial, sans-serif;
    `;

    this.#render();
    parent.appendChild(this.#container);

    // 监听用户切换事件
    this.#eventBus.on('user:switched', () => {
      this.#render();
    });
  }

  #render() {
    const currentUser = this.#userManager.getCurrentUser();
    if (!currentUser) return;

    this.#container.innerHTML = `
      <button class="user-switcher-btn" style="
        background: rgba(0,0,0,0.7);
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: 14px;
        font-family: Arial, sans-serif;
      ">
        👤 ${currentUser.username}
      </button>
      <div class="user-dropdown" style="
        display: none;
        position: absolute;
        top: 100%;
        right: 0;
        background: rgba(0,0,0,0.9);
        border: 1px solid #555;
        border-radius: 4px;
        min-width: 150px;
        margin-top: 4px;
      "></div>
    `;

    const btn = this.#container.querySelector('.user-switcher-btn');
    const dropdown = this.#container.querySelector('.user-dropdown');

    // 点击按钮显示/隐藏下拉菜单
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdown.style.display === 'block';
      dropdown.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        this.#renderDropdown(dropdown);
      }
    });

    // 点击外部关闭下拉菜单
    document.addEventListener('click', () => {
      dropdown.style.display = 'none';
    });
  }

  #renderDropdown(dropdown) {
    const users = this.#userManager.getUserList();
    const currentUserId = this.#userManager.getCurrentUser()?.id;

    dropdown.innerHTML = users.map(user => `
      <div class="user-item ${user.id === currentUserId ? 'current' : ''}" data-user-id="${user.id}" style="
        padding: 10px 12px;
        cursor: ${user.id === currentUserId ? 'default' : 'pointer'};
        color: ${user.id === currentUserId ? '#888' : '#fff'};
        border-bottom: 1px solid #333;
        font-family: Arial, sans-serif;
      ">
        ${user.id === currentUserId ? '✓ ' : ''}${user.username}
      </div>
    `).join('') + `
      <div class="user-create" style="
        padding: 10px 12px;
        cursor: pointer;
        color: #4af;
        border-top: 1px solid #555;
        font-family: Arial, sans-serif;
      ">
        + 新建用户
      </div>
    `;

    // 用户项点击事件
    dropdown.querySelectorAll('.user-item:not(.current)').forEach(item => {
      item.addEventListener('click', () => {
        const userId = item.dataset.userId;
        this.#userManager.switchUser(userId);
        // 刷新页面以重新初始化所有模块
        location.reload();
      });
    });

    // 新建用户点击事件
    dropdown.querySelector('.user-create').addEventListener('click', () => {
      this.#showCreateUserDialog();
    });
  }

  #showCreateUserDialog() {
    const username = prompt('请输入用户名（2-20字符）:');
    if (!username) return;

    try {
      const user = this.#userManager.createUser(username);
      this.#userManager.switchUser(user.id);
      // 刷新页面
      location.reload();
    } catch (e) {
      alert(e.message);
    }
  }
}
