/**
 * Main Entry Point for Word Racing (v2 - View Architecture)
 * Uses the new ViewManager for UI coordination
 *
 * Phase 3 of Refactoring Plan
 * Phase 5 - Learning System Integration
 */

import { Game } from './game.js';
import { EventBus, Events } from '../core/event-bus.js';
import { ViewManager } from '../views/view-manager.js';
import { LearningController } from '../learning/learning-controller.js';
import { AchievementToast } from '../ui/achievement-toast.js';
import { AchievementPanel } from '../ui/achievement-panel.js';
import { UserManager } from '../core/user-manager.js';
import { UserSwitcher } from '../ui/user-switcher.js';
import { DataManager } from '../core/data-manager.js';

// ─── Settings Dropdown (全局，所有页面可见) ─────────────────────

function setupSettingsDropdown(game, learningController, dataManager, eventBus) {
  const settingsBtn = document.querySelector('#top-settings-btn');
  const dropdown = document.querySelector('#settings-dropdown');
  if (!settingsBtn || !dropdown) return;

  // Toggle
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.style.display === 'none') {
      const rect = settingsBtn.getBoundingClientRect();
      dropdown.style.top = rect.bottom + 8 + 'px';
      dropdown.style.right = (window.innerWidth - rect.right) + 'px';
      dropdown.style.display = 'block';
    } else {
      dropdown.style.display = 'none';
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !settingsBtn.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  function closeDropdown() {
    dropdown.style.display = 'none';
  }

  function updateAutoSaveLabel() {
    const btn = document.querySelector('#auto-save-btn');
    if (btn) btn.textContent = dataManager.isFileSystemMode ? 'Auto-Save: ON' : 'Auto-Save: OFF';
  }

  // Auto-save button visibility
  if (DataManager.isFileSystemAPISupported()) {
    const autoSaveBtn = document.querySelector('#auto-save-btn');
    if (autoSaveBtn) {
      autoSaveBtn.style.display = '';
      updateAutoSaveLabel();
    }
  }

  // ── Reset buttons ──

  document.querySelector('#reset-daily-btn')?.addEventListener('click', () => {
    if (confirm('Reset daily practice limit?\n\nYour word mastery progress will stay unchanged.')) {
      try {
        const state = JSON.parse(localStorage.getItem('wr_game_state') || '{}');
        state.daily = { lastActiveDate: null, todayQuizzes: 0, todayFuelCoins: 0, todayGearCoins: 0 };
        localStorage.setItem('wr_game_state', JSON.stringify(state));
        localStorage.removeItem('wr_quiz_session');
        learningController.dailyManager?.reset?.();
        learningController.sessionManager?.clearSession?.();
        alert('Daily practice limit reset. You can continue.');
        closeDropdown();
      } catch (e) { alert('Reset failed: ' + e.message); }
    }
  });

  document.querySelector('#reset-week-btn')?.addEventListener('click', () => {
    if (confirm('Reset this week\'s history?\n\nThis will clear the last 7 days of practice history. Your coins and word progress will be kept.')) {
      try {
        learningController.dailyManager?.clearHistory(7);
        alert('This week\'s history has been cleared.');
        closeDropdown();
      } catch (e) { alert('Reset failed: ' + e.message); }
    }
  });

  document.querySelector('#reset-all-btn')?.addEventListener('click', () => {
    if (confirm('Confirm reset all data?\n\nThis will clear all your learning progress, coins, achievements, and unlocked tracks.\nThis action cannot be undone.')) {
      try {
        game.gameState?.reset();
        learningController.progressTracker?.clear();
        learningController.dailyManager?.reset();
        learningController.dailyManager?.clearHistory(30);
        learningController.sessionManager?.clearSession?.();
        alert('All data has been reset. The page will now refresh.');
        window.location.reload();
      } catch (e) { alert('Reset failed: ' + e.message); }
    }
  });

  // ── Data management ──

  document.querySelector('#export-data-btn')?.addEventListener('click', () => {
    dataManager.exportData();
    closeDropdown();
  });

  document.querySelector('#import-data-btn')?.addEventListener('click', () => {
    document.querySelector('#import-data-input')?.click();
  });

  const importInput = document.querySelector('#import-data-input');
  if (importInput) {
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        await dataManager.importData(file);
        alert('Data imported successfully. The page will now refresh.');
        window.location.reload();
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
      importInput.value = '';
    });
  }

  const autoSaveBtn = document.querySelector('#auto-save-btn');
  if (autoSaveBtn) {
    autoSaveBtn.addEventListener('click', async () => {
      if (dataManager.isFileSystemMode) {
        await dataManager.disableAutoSave();
        updateAutoSaveLabel();
      } else {
        try {
          const ok = await dataManager.enableAutoSave();
          if (ok) updateAutoSaveLabel();
        } catch (err) {
          if (err.name !== 'AbortError') {
            alert('Failed to enable auto-save: ' + err.message);
          }
        }
      }
      closeDropdown();
    });
  }

  // Mode change → update label
  eventBus.on('data:mode-changed', () => updateAutoSaveLabel());
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Error handler
  window.addEventListener('error', (e) => {
    const msg = 'JS ERROR: ' + (e.message || 'unknown') + ' at ' + (e.filename || '') + ':' + (e.lineno || '');
    document.body.style.background = '#300';
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c00;color:#fff;padding:12px;z-index:99999;font-size:14px;';
    d.textContent = msg;
    document.body.appendChild(d);
  });

  const canvas = document.getElementById('gameCanvas');

  // 创建共享 EventBus（统一事件总线，避免双重 EventBus 问题）
  const eventBus = new EventBus();

  // 初始化 DataManager（文件持久化，在 UserManager 之前加载数据）
  const dataManager = new DataManager(eventBus);
  await dataManager.init();
  window.dataManager = dataManager;

  // 初始化 UserManager（自动检测并迁移旧数据）
  const userManager = new UserManager(eventBus);
  userManager.init();

  // 获取当前用户
  const currentUser = userManager.getCurrentUser();
  if (!currentUser) {
    throw new Error('No current user found after UserManager.init()');
  }

  // 先创建 LearningController，传入共享 EventBus 和 userId
  // 它会自建 GameState，然后把这个 GameState 注入给 Game，确保单一数据源（Phase 3.1a）
  const learningController = new LearningController(eventBus, currentUser.id);
  const game = new Game(canvas, learningController.gameState, eventBus);
  window.game = game;
  window.learningController = learningController;
  window.userManager = userManager;

  game.init().then(() => {
    // Initialize Learning Controller with loaded wordset
    learningController.init(game.quiz.words || []);

    // Update wordset when quiz loads new words
    game.quiz.onWordsLoaded = (words) => {
      learningController.setWordSet(words);
    };

    // Create ViewManager with Learning Controller (use shared EventBus)
    const viewManager = new ViewManager(eventBus, game, learningController);
    window.viewManager = viewManager;

    // Initialize Achievement Toast (Phase 3.3)
    const achievementToast = new AchievementToast(eventBus);
    achievementToast.mount();

    // Initialize Achievement Panel (Phase 3.5)
    const achievementPanel = new AchievementPanel(learningController);
    achievementPanel.init();

    // Initialize User Switcher (Multi-user support)
    const userSwitcher = new UserSwitcher(eventBus, userManager);
    userSwitcher.mount('body');

    // Set up callbacks (now that viewManager exists)
    game.onExitRace = () => {
      void viewManager.switchTo('home');
    };
    game.onResultsContinueCb = () => {
      void viewManager.switchTo('home');
    };

    // Initial stats update
    viewManager.updateHomeStats();

    // Setup global settings dropdown (works on all pages)
    setupSettingsDropdown(game, learningController, dataManager, eventBus);

    // Debug reset button
    const resetBtn = document.getElementById('debug-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all learning progress? This is for testing only.')) {
          // 清除当前用户的所有数据
          const userId = userManager.getCurrentUser()?.id;
          if (userId) {
            localStorage.removeItem(`wr_game_state_${userId}`);
            localStorage.removeItem(`wr_word_progress_${userId}`);
            localStorage.removeItem(`wr_daily_stats_${userId}`);
            localStorage.removeItem(`wr_quiz_session_${userId}`);
          }

          // 给测试用户一些初始资源
          const testState = {
            version: 3,
            fuel: 50,
            fuelCoins: 100,
            gearCoins: 50,
            nitroCharges: 3,
            upgrades: { engine: 1, tire: 1, body: 1 },
          };
          localStorage.setItem(`wr_game_state_${userId}`, JSON.stringify(testState));
          // 重新加载 GameState，让 Game/LearningController 都看到新数据
          learningController.gameState.deserialize(JSON.stringify(testState));
          // 同步 Game 中尚未迁移的字段（Phase 3.1b 完成后可移除）
          game.fuel = testState.fuel;
          game.nitroCharges = testState.nitroCharges;
          game.upgrades = testState.upgrades;
          game.car?.applyUpgrades?.(testState.upgrades);
          // 重置学习控制器
          if (learningController) {
            learningController.progressTracker?.clear?.();
            learningController.dailyManager?.reset?.();
            learningController.sessionManager?.clearSession?.();
          }
          alert('Progress reset with test resources!');
          void viewManager.switchTo('home');
        }
      });
    }
  }).catch(err => {
    const d = document.createElement('div');
    d.style.cssText = 'color:#fff;background:#c00;padding:16px;font-size:14px;position:fixed;top:0;left:0;right:0;z-index:99999;';
    d.textContent = 'INIT ERROR: ' + err.message + ' | ' + (err.stack || '');
    document.body.appendChild(d);
  });
});
