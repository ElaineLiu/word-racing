/**
 * AchievementPanel - 成就列表面板测试（Phase 3.5）
 *
 * 验证成就面板功能：
 *   - 显示所有成就（已解锁/未解锁）
 *   - 显示进度条（如：5/10 套题）
 *   - 按解锁状态排序（已解锁在前）
 *   - 模态框显示/隐藏
 *
 * 按 design/赛道解锁系统详细设计.md UC-04 实现。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { EventBus } from '../core/event-bus.js';
import { AchievementPanel } from '../ui/achievement-panel.js';

function createMockLearningController() {
  return {
    getAchievements: vi.fn(() => [
      {
        id: 'first-quiz',
        name: 'First Pit Stop',
        description: 'Complete your first quiz.',
        unlocked: true,
        progress: null,
        reward: { track: 'shanghai-2d' },
      },
      {
        id: 'quiz-master-10',
        name: 'Quiz Streak 10',
        description: 'Complete 10 quizzes.',
        unlocked: false,
        progress: { current: 5, target: 10 },
        reward: { fuelCoins: 50 },
      },
      {
        id: 'perfect-streak',
        name: 'Perfect Run',
        description: 'Answer all 10 questions correctly in one quiz.',
        unlocked: false,
        progress: null,
        reward: { track: 'monaco-2d' },
      },
    ]),
  };
}

function mountPanel(learningController) {
  const html = `
    <div id="achievement-panel" class="modal" style="display:none;">
      <div class="modal-content">
        <button id="achievement-panel-close">×</button>
        <div id="achievement-list"></div>
      </div>
    </div>
    <button id="achievement-btn"></button>
  `;
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
  global.document = dom.window.document;
  global.window = dom.window;
  const panel = new AchievementPanel(learningController);
  panel.init();
  return { panel, document: dom.window.document };
}

describe('AchievementPanel - 成就面板 (Phase 3.5)', () => {
  let learningController;

  beforeEach(() => {
    learningController = createMockLearningController();
  });

  describe('显示/隐藏', () => {
    it('点击成就按钮应显示面板', () => {
      const { document } = mountPanel(learningController);
      document.getElementById('achievement-btn').click();
      expect(document.getElementById('achievement-panel').style.display).not.toBe('none');
    });

    it('点击关闭按钮应隐藏面板', () => {
      const { document } = mountPanel(learningController);
      document.getElementById('achievement-btn').click();
      document.getElementById('achievement-panel-close').click();
      expect(document.getElementById('achievement-panel').style.display).toBe('none');
    });
  });

  describe('成就列表渲染', () => {
    it('应调用 learningController.getAchievements()', () => {
      mountPanel(learningController);
      expect(learningController.getAchievements).toHaveBeenCalled();
    });

    it('应渲染所有成就', () => {
      const { document } = mountPanel(learningController);
      const items = document.querySelectorAll('.achievement-item');
      expect(items.length).toBe(3);
    });

    it('已解锁成就应显示 🏆 图标', () => {
      const { document } = mountPanel(learningController);
      const firstUnlocked = document.querySelector('.achievement-item.unlocked');
      expect(firstUnlocked.textContent).toContain('🏆');
    });

    it('未解锁成就应显示 🔒 图标', () => {
      const { document } = mountPanel(learningController);
      const locked = document.querySelectorAll('.achievement-item:not(.unlocked)')[0];
      expect(locked.textContent).toContain('🔒');
    });

    it('已解锁成就应有 unlocked 类', () => {
      const { document } = mountPanel(learningController);
      const unlockedCount = document.querySelectorAll('.achievement-item.unlocked').length;
      expect(unlockedCount).toBe(1);
    });

    it('有进度的成就应显示进度条', () => {
      const { document } = mountPanel(learningController);
      const progressBar = document.querySelector('.achievement-progress-bar');
      expect(progressBar).toBeTruthy();
    });

    it('进度条应显示 current/target 文字', () => {
      const { document } = mountPanel(learningController);
      const progress = document.querySelector('.achievement-progress');
      expect(progress.textContent).toContain('5/10');
    });

    it('已解锁成就应排在前面', () => {
      const { document } = mountPanel(learningController);
      const items = document.querySelectorAll('.achievement-item');
      expect(items[0].classList.contains('unlocked')).toBe(true);
    });
  });

  describe('空状态', () => {
    it('无成就时应显示提示', () => {
      learningController.getAchievements = vi.fn(() => []);
      const { document } = mountPanel(learningController);
      const list = document.getElementById('achievement-list');
      expect(list.textContent).toContain('No achievements yet');
    });
  });
});
