/**
 * AchievementToast - 成就解锁提示组件测试（Phase 3.3）
 *
 * 验证成就 Toast 通知功能：
 *   - 监听 ACHIEVEMENT_UNLOCKED 事件
 *   - 显示 Toast（成就名称、描述、奖励）
 *   - 自动消失（3秒后）
 *   - 多个 Toast 堆叠显示
 *
 * 借鉴 ISSUE_LOG #005（集成遗漏）：不仅要测 Toast 能显示，还要测事件监听正确绑定。
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { EventBus, Events } from '../core/event-bus.js';
import { AchievementToast } from '../ui/achievement-toast.js';

function createMockAchievement() {
  return {
    id: 'first-quiz',
    name: 'First Pit Stop',
    description: 'Complete your first quiz.',
    reward: { track: 'shanghai-2d' },
  };
}

function mountToast(eventBus) {
  const html = `
    <div id="toast-container"></div>
  `;
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
  global.document = dom.window.document;
  global.window = dom.window;
  const toast = new AchievementToast(eventBus);
  toast.mount();
  return { toast, document: dom.window.document };
}

describe('AchievementToast - 成就提示 (Phase 3.3)', () => {
  let eventBus;
  let mockAchievement;

  beforeEach(() => {
    eventBus = new EventBus();
    mockAchievement = createMockAchievement();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('mount 和事件监听', () => {
    it('mount 后应创建 toast-container', () => {
      global.document = new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
      const toast = new AchievementToast(eventBus);
      toast.mount();
      const container = document.getElementById('toast-container');
      expect(container).toBeTruthy();
      expect(container.tagName).toBe('DIV');
    });

    it('应订阅 ACHIEVEMENT_UNLOCKED 事件', () => {
      const { toast } = mountToast(eventBus);
      eventBus.emit(Events.ACHIEVEMENT_UNLOCKED, { achievement: mockAchievement });
      vi.advanceTimersByTime(100);
      const container = document.getElementById('toast-container');
      expect(container.children.length).toBeGreaterThan(0);
    });
  });

  describe('Toast 显示', () => {
    it('应显示成就名称', () => {
      const { document } = mountToast(eventBus);
      eventBus.emit(Events.ACHIEVEMENT_UNLOCKED, { achievement: mockAchievement });
      vi.advanceTimersByTime(100);
      const toast = document.querySelector('.achievement-toast');
      expect(toast.textContent).toContain('First Pit Stop');
    });

    it('应显示成就描述', () => {
      const { document } = mountToast(eventBus);
      eventBus.emit(Events.ACHIEVEMENT_UNLOCKED, { achievement: mockAchievement });
      vi.advanceTimersByTime(100);
      const toast = document.querySelector('.achievement-toast');
      expect(toast.textContent).toContain('Complete your first quiz.');
    });

    it('应显示奖励（赛道图标）', () => {
      const { document } = mountToast(eventBus);
      eventBus.emit(Events.ACHIEVEMENT_UNLOCKED, { achievement: mockAchievement });
      vi.advanceTimersByTime(100);
      const toast = document.querySelector('.achievement-toast');
      expect(toast.textContent).toContain('🏁'); // track icon
    });

    it('应显示奖励（金币）', () => {
      const { document } = mountToast(eventBus);
      const ach = { ...mockAchievement, reward: { fuelCoins: 50 } };
      eventBus.emit(Events.ACHIEVEMENT_UNLOCKED, { achievement: ach });
      vi.advanceTimersByTime(100);
      const toast = document.querySelector('.achievement-toast');
      expect(toast.textContent).toContain('🪙');
    });

    it('Toast 应有 trophy 图标', () => {
      const { document } = mountToast(eventBus);
      eventBus.emit(Events.ACHIEVEMENT_UNLOCKED, { achievement: mockAchievement });
      vi.advanceTimersByTime(100);
      const toast = document.querySelector('.achievement-toast');
      expect(toast.textContent).toContain('🏆');
    });
  });

  describe('自动消失', () => {
    it('Toast 应在 3 秒后自动移除', () => {
      const { document } = mountToast(eventBus);
      eventBus.emit(Events.ACHIEVEMENT_UNLOCKED, { achievement: mockAchievement });
      vi.advanceTimersByTime(100);
      expect(document.querySelectorAll('.achievement-toast').length).toBe(1);

      vi.advanceTimersByTime(3000);
      expect(document.querySelectorAll('.achievement-toast').length).toBe(0);
    });

    it('多个 Toast 应堆叠显示', () => {
      const { document } = mountToast(eventBus);
      eventBus.emit(Events.ACHIEVEMENT_UNLOCKED, { achievement: mockAchievement });
      vi.advanceTimersByTime(100);
      const ach2 = { ...mockAchievement, id: 'quiz-master-10', name: 'Quiz Streak 10' };
      eventBus.emit(Events.ACHIEVEMENT_UNLOCKED, { achievement: ach2 });
      vi.advanceTimersByTime(100);
      expect(document.querySelectorAll('.achievement-toast').length).toBe(2);
    });

    it('多个 Toast 应按顺序消失', () => {
      const { document } = mountToast(eventBus);
      eventBus.emit(Events.ACHIEVEMENT_UNLOCKED, { achievement: mockAchievement });
      vi.advanceTimersByTime(100);
      const ach2 = { ...mockAchievement, id: 'quiz-master-10' };
      eventBus.emit(Events.ACHIEVEMENT_UNLOCKED, { achievement: ach2 });
      vi.advanceTimersByTime(100);

      // 此时总时间 200ms，第一个 toast 将在 3000ms 消失，第二个在 3100ms
      vi.advanceTimersByTime(2800);
      // 时间到 3000ms，第一个消失，第二个还剩 100ms
      expect(document.querySelectorAll('.achievement-toast').length).toBe(1);
    });
  });

  describe('unmount 清理', () => {
    it('unmount 后应不再响应事件', () => {
      const { toast, document } = mountToast(eventBus);
      toast.unmount();
      eventBus.emit(Events.ACHIEVEMENT_UNLOCKED, { achievement: mockAchievement });
      vi.advanceTimersByTime(100);
      expect(document.querySelectorAll('.achievement-toast').length).toBe(0);
    });
  });
});
