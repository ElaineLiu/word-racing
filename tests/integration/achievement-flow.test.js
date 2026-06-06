/**
 * 成就解锁集成测试
 *
 * 验证完整调用链：LearningController.completeQuiz() →
 *   更新 learning 统计 → AchievementManager.checkAll() → 解锁成就+发放奖励
 *
 * 此测试用于防止 ISSUE_LOG #005（集成测试遗漏：成就检查未被调用）的回归。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LearningController } from '../../learning/learning-controller.js';
import { Events } from '../../core/event-bus.js';
import { LEARNING } from '../../config/learning-config.js';

// 测试用词库（保证有足够单词构造完整套题）
const createTestWordSet = (count = 50) => {
  const words = [];
  for (let i = 1; i <= count; i++) {
    words.push({
      id: i,
      word: `word${i}`,
      meaning_cn: `词${i}`,
      meaning_en: `meaning ${i}`,
      phonetic: `/word${i}/`,
      sentence: `This is word${i}.`,
      level: Math.ceil(i / 10) + 1,
      category: 'test',
    });
  }
  return words;
};

/**
 * 完成一整套题，传入答题策略
 * @param {LearningController} controller
 * @param {Function} answerStrategy - (questionIndex, question) => selectedIndex
 */
function completeOneQuiz(controller, answerStrategy) {
  const questions = controller.startNewQuiz();
  if (!questions) return null;

  for (let i = 0; i < questions.length; i++) {
    const question = controller.getCurrentQuestion();
    if (!question) break;
    const selectedIndex = answerStrategy(i, question);
    controller.submitAnswer(selectedIndex);
  }

  return controller.completeQuiz();
}

const ALL_CORRECT = (_i, q) => q.correctIndex;
const ALL_WRONG = (_i, q) => (q.correctIndex + 1) % 4;

describe('成就解锁集成流程', () => {
  let controller;
  let wordSet;

  beforeEach(() => {
    localStorage.clear();
    wordSet = createTestWordSet(50);
    controller = new LearningController();
    controller.init(wordSet, { skipUI: true });
  });

  describe('completeQuiz 触发成就检查', () => {
    it('完成第一套题后应解锁 first-quiz 成就', () => {
      completeOneQuiz(controller, ALL_CORRECT);

      const achievements = controller.gameState.get('achievements');
      expect(achievements).toContain('first-quiz');
    });

    it('解锁 first-quiz 成就时应解锁 shanghai-2d 赛道', () => {
      completeOneQuiz(controller, ALL_CORRECT);

      const unlockedTracks = controller.gameState.get('unlockedTracks');
      expect(unlockedTracks).toContain('shanghai-2d');
    });

    it('完成第一套题应将 totalQuizzes 累加到 1', () => {
      completeOneQuiz(controller, ALL_CORRECT);

      const totalQuizzes = controller.gameState.get('learning.totalQuizzes');
      expect(totalQuizzes).toBe(1);
    });
  });

  describe('完美连击成就', () => {
    it('单套题全对应解锁 perfect-streak 成就并发放金币', () => {
      const initialCoins = controller.gameState.get('fuelCoins');

      completeOneQuiz(controller, ALL_CORRECT);

      const achievements = controller.gameState.get('achievements');
      expect(achievements).toContain('perfect-streak');

      const finalCoins = controller.gameState.get('fuelCoins');
      expect(finalCoins).toBeGreaterThanOrEqual(initialCoins + 50);
    });

    it('单套题不全对不应解锁 perfect-streak 成就', () => {
      // 答错最后一题
      completeOneQuiz(controller, (i, q) => {
        if (i === LEARNING.QUIZ_QUESTION_COUNT - 1) return (q.correctIndex + 1) % 4;
        return q.correctIndex;
      });

      const achievements = controller.gameState.get('achievements');
      expect(achievements).not.toContain('perfect-streak');
    });

    it('上一套全对后下一套不全对应重置 lastPerfectQuiz', () => {
      // 第一套全对
      completeOneQuiz(controller, ALL_CORRECT);
      expect(controller.gameState.get('learning.lastPerfectQuiz')).toBe(true);

      // 第二套答错一题
      completeOneQuiz(controller, (i, q) => {
        if (i === 0) return (q.correctIndex + 1) % 4;
        return q.correctIndex;
      });
      expect(controller.gameState.get('learning.lastPerfectQuiz')).toBe(false);
    });
  });

  describe('成就事件发送', () => {
    it('解锁成就时应发送 ACHIEVEMENT_UNLOCKED 事件', () => {
      const handler = vi.fn();
      controller.eventBus.on(Events.ACHIEVEMENT_UNLOCKED, handler);

      completeOneQuiz(controller, ALL_CORRECT);

      expect(handler).toHaveBeenCalled();
      const calls = handler.mock.calls.map(c => c[0].achievement.id);
      expect(calls).toContain('first-quiz');
    });
  });

  describe('避免重复解锁', () => {
    it('多次完成套题不应重复解锁同一成就', () => {
      completeOneQuiz(controller, ALL_CORRECT);
      completeOneQuiz(controller, ALL_CORRECT);

      const achievements = controller.gameState.get('achievements');
      const firstQuizCount = achievements.filter(id => id === 'first-quiz').length;
      expect(firstQuizCount).toBe(1);
    });
  });

  describe('AchievementManager 访问器', () => {
    it('应通过 controller.achievementManager 暴露管理器', () => {
      expect(controller.achievementManager).toBeDefined();
      expect(typeof controller.achievementManager.checkAll).toBe('function');
      expect(typeof controller.achievementManager.getAllStatus).toBe('function');
    });

    it('getAllStatus 应能正确返回成就状态', () => {
      completeOneQuiz(controller, ALL_CORRECT);

      const status = controller.achievementManager.getAllStatus();
      const firstQuiz = status.find(a => a.id === 'first-quiz');
      expect(firstQuiz?.unlocked).toBe(true);
    });
  });

  describe('totalCorrect 统计', () => {
    it('全对一套题应累加 totalCorrect', () => {
      const before = controller.gameState.get('learning.totalCorrect') || 0;

      completeOneQuiz(controller, ALL_CORRECT);

      const after = controller.gameState.get('learning.totalCorrect');
      expect(after).toBe(before + LEARNING.QUIZ_QUESTION_COUNT);
    });

    it('totalQuestions 应累加 QUIZ_QUESTION_COUNT', () => {
      const before = controller.gameState.get('learning.totalQuestions') || 0;

      completeOneQuiz(controller, ALL_WRONG);

      const after = controller.gameState.get('learning.totalQuestions');
      expect(after).toBe(before + LEARNING.QUIZ_QUESTION_COUNT);
    });
  });
});
