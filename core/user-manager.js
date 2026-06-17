/**
 * UserManager - 用户管理器
 *
 * 职责：
 * - 管理用户列表
 * - 跟踪当前用户
 * - 用户创建、切换、查询
 * - 自动迁移旧数据
 */

import { EventBus } from './event-bus.js';

// 存储键
const USER_LIST_KEY = 'wr_user_list';
const CURRENT_USER_KEY = 'wr_current_user';

/**
 * 用户数据结构
 * @typedef {Object} User
 * @property {string} id - 用户ID（格式: user_<timestamp>_<randomHex>）
 * @property {string} username - 用户名（2-20字符）
 * @property {string} createdAt - 创建时间（ISO时间戳）
 */

export class UserManager {
  #eventBus;
  #userList = [];
  #currentUserId = null;

  /**
   * @param {EventBus} eventBus - 事件总线
   */
  constructor(eventBus) {
    if (!(eventBus instanceof EventBus)) {
      throw new Error('UserManager requires EventBus instance');
    }
    this.#eventBus = eventBus;
  }

  // ==================== 初始化 ====================

  /**
   * 初始化用户管理器
   * - 加载用户列表
   * - 加载当前用户
   * - 如果无用户，创建默认用户或迁移旧数据
   */
  init() {
    this.#loadUserList();
    this.#loadCurrentUser();

    // 首次启动：无用户列表
    if (this.#userList.length === 0) {
      this.#migrateOrCreateDefault();
    }
  }

  /**
   * 迁移旧数据或创建默认用户
   */
  #migrateOrCreateDefault() {
    // 检查是否有旧数据（wr_game_state 存在且无用户系统）
    const hasOldState = localStorage.getItem('wr_game_state') !== null;

    if (hasOldState) {
      // 迁移模式：创建默认用户，保留旧数据
      // 实际数据不需要移动，各模块会在加载时自动迁移
      console.log('[UserManager] Detected old data, creating default user for migration');
      this.createUser('Player 1', true); // skipCheck = true
    } else {
      // 全新启动：创建默认用户
      console.log('[UserManager] Fresh start, creating default user');
      this.createUser('Player 1', true);
    }
  }

  // ==================== 用户管理 ====================

  /**
   * 创建新用户
   * @param {string} username - 用户名（2-20字符）
   * @param {boolean} skipCheck - 跳过重名检查（用于迁移）
   * @returns {User} 创建的用户
   * @throws {Error} 用户名无效或重复
   */
  createUser(username, skipCheck = false) {
    // 验证用户名长度
    if (!username || username.length < 2 || username.length > 20) {
      throw new Error('Username must be 2-20 characters');
    }

    // 检查重名（除非跳过）
    if (!skipCheck && this.#userList.some(u => u.username === username)) {
      throw new Error('Username already exists');
    }

    // 生成唯一ID
    const id = `user_${Date.now()}_${Math.random().toString(16).substr(2, 6)}`;

    const user = {
      id,
      username,
      createdAt: new Date().toISOString(),
    };

    this.#userList.push(user);
    this.#saveUserList();

    // 如果是第一个用户，自动设为当前用户
    if (this.#userList.length === 1) {
      this.switchUser(id);
    }

    // 发送事件
    this.#eventBus.emit('user:created', user);

    console.log(`[UserManager] Created user: ${username} (${id})`);
    return user;
  }

  /**
   * 切换用户
   * @param {string} userId - 用户ID
   * @returns {boolean} 是否成功
   */
  switchUser(userId) {
    const user = this.#userList.find(u => u.id === userId);
    if (!user) {
      console.warn(`[UserManager] User not found: ${userId}`);
      return false;
    }

    this.#currentUserId = userId;
    localStorage.setItem(CURRENT_USER_KEY, userId);

    // 发送事件
    this.#eventBus.emit('user:switched', user);

    console.log(`[UserManager] Switched to user: ${user.username} (${userId})`);
    return true;
  }

  /**
   * 获取当前用户
   * @returns {User|null}
   */
  getCurrentUser() {
    if (!this.#currentUserId) return null;
    return this.#userList.find(u => u.id === this.#currentUserId) || null;
  }

  /**
   * 获取用户列表
   * @returns {User[]}
   */
  getUserList() {
    return [...this.#userList];
  }

  // ==================== 私有方法 ====================

  /**
   * 加载用户列表
   */
  #loadUserList() {
    try {
      const raw = localStorage.getItem(USER_LIST_KEY);
      this.#userList = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[UserManager] Failed to load user list:', e);
      this.#userList = [];
    }
  }

  /**
   * 保存用户列表
   */
  #saveUserList() {
    try {
      localStorage.setItem(USER_LIST_KEY, JSON.stringify(this.#userList));
    } catch (e) {
      console.error('[UserManager] Failed to save user list:', e);
    }
  }

  /**
   * 加载当前用户
   */
  #loadCurrentUser() {
    this.#currentUserId = localStorage.getItem(CURRENT_USER_KEY);

    // 验证当前用户是否在列表中
    if (this.#currentUserId && !this.#userList.some(u => u.id === this.#currentUserId)) {
      console.warn('[UserManager] Current user not in list, clearing');
      this.#currentUserId = null;
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }
}
