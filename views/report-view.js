/**
 * ReportView - 学习进度报告页面
 */
import { BaseView } from './base-view.js';

const STATUS_LABELS = {
  unlearned: '未学习',
  exposed: '已接触',
  simple_passed: '简单题通过',
  complex_passed: '复杂题通过',
  mastered: '已掌握',
  forgotten: '已遗忘'
};

export class ReportView extends BaseView {
  #learningController;

  constructor(eventBus, learningController = null) {
    super('page-report', eventBus);
    this.#learningController = learningController;
  }

  mount() {
    super.mount();
    this.render();
  }

  render() {
    this.#renderTotalStats();
    this.#renderTodayStats();
    this.#renderMasteryStats();
    this.#renderWrongWords();
    this.#renderWordDetails();
  }

  #renderTotalStats() {
    const container = this.$('#report-total-stats');
    if (!container || !this.#learningController) return;

    const stats = this.#learningController.dailyManager?.getTotalStats() || {};
    const accuracy = stats.totalQuestions > 0
      ? (stats.totalCorrect / stats.totalQuestions * 100).toFixed(1)
      : 0;

    container.innerHTML = `
      <div class="stat-row"><span>完成套数</span><strong>${stats.totalQuizzes || 0}</strong></div>
      <div class="stat-row"><span>总题目数</span><strong>${stats.totalQuestions || 0}</strong></div>
      <div class="stat-row"><span>答对数</span><strong>${stats.totalCorrect || 0}</strong></div>
      <div class="stat-row"><span>正确率</span><strong>${accuracy}%</strong></div>
      <div class="stat-row"><span>连续学习天数</span><strong>${stats.streak || 0}</strong></div>
    `;
  }

  #renderTodayStats() {
    const container = this.$('#report-today-stats');
    if (!container || !this.#learningController) return;

    const progress = this.#learningController.getDailyProgress?.() || {};
    const goals = this.#learningController.dailyManager?.checkDailyGoals?.() || {};

    container.innerHTML = `
      <div class="stat-row"><span>今日套数</span><strong>${progress.quizzesCompleted || 0} / 3</strong></div>
      <div class="stat-row"><span>今日新词</span><strong>${progress.newWordsLearned || 0}</strong></div>
      <div class="stat-row"><span>今日复习</span><strong>${progress.wordsReviewed || 0}</strong></div>
      <div class="stat-row"><span>最大连击</span><strong>${progress.maxCombo || 0}</strong></div>
      <div class="stat-row"><span>燃油币</span><strong>${progress.fuelCoinsEarned || 0}</strong></div>
      <div class="stat-row"><span>装备币</span><strong>${progress.gearCoinsEarned || 0}</strong></div>
      <div class="goals-section">
        <div class="goal ${goals.allThree?.achieved ? 'achieved' : ''}">
          ${goals.allThree?.achieved ? '✓' : '○'} 完成3套题
        </div>
        <div class="goal ${goals.accuracy80?.achieved ? 'achieved' : ''}">
          ${goals.accuracy80?.achieved ? '✓' : '○'} 正确率80%+
        </div>
        <div class="goal ${goals.newWords10?.achieved ? 'achieved' : ''}">
          ${goals.newWords10?.achieved ? '✓' : '○'} 学习10个新词
        </div>
      </div>
    `;
  }

  #renderMasteryStats() {
    const container = this.$('#report-mastery-stats');
    if (!container || !this.#learningController) return;

    const stats = this.#learningController.progressTracker?.getStats?.() || {};

    // 计算比例
    const masteredPercent = stats.total > 0 ? (stats.mastered / stats.total * 100).toFixed(1) : 0;
    const learningPercent = stats.total > 0 ? (stats.learning / stats.total * 100).toFixed(1) : 0;

    container.innerHTML = `
      <div class="stat-row"><span>答过的单词</span><strong>${stats.total || 0}</strong></div>
      <div class="stat-row"><span>✅ 已掌握</span><strong class="text-success">${stats.mastered || 0} <small>(${masteredPercent}%)</small></strong></div>
      <div class="stat-row"><span>📖 学习中</span><strong class="text-warning">${stats.learning || 0} <small>(${learningPercent}%)</small></strong></div>
    `;
  }

  #renderWrongWords() {
    const container = this.$('#report-wrong-words');
    if (!container || !this.#learningController) return;

    const wrongWords = this.#learningController.progressTracker?.getWrongWords?.() || [];

    if (wrongWords.length === 0) {
      container.innerHTML = '<div class="empty-message">太棒了！没有错词 🎉</div>';
      return;
    }

    container.innerHTML = `
      <table class="report-table">
        <thead>
          <tr><th>单词</th><th>简单题错</th><th>复杂题错</th><th>状态</th></tr>
        </thead>
        <tbody>
          ${wrongWords.slice(0, 20).map(w => `
            <tr>
              <td><strong>${w.word}</strong></td>
              <td>${w.simpleWrongCount}</td>
              <td>${w.complexWrongCount}</td>
              <td class="status-${w.status}">${STATUS_LABELS[w.status] || w.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${wrongWords.length > 20 ? `<div class="more-hint">显示前20个，共${wrongWords.length}个</div>` : ''}
    `;
  }

  #renderWordDetails() {
    const container = this.$('#report-word-details');
    if (!container || !this.#learningController) return;

    const allProgress = this.#learningController.progressTracker?.getAllProgress?.() || {};
    const words = Object.entries(allProgress)
      .map(([word, data]) => ({ word, ...data }))
      .sort((a, b) => {
        // mastered 排最后
        if (a.status === 'mastered' && b.status !== 'mastered') return 1;
        if (a.status !== 'mastered' && b.status === 'mastered') return -1;
        return 0;
      })
      .slice(0, 30);

    if (words.length === 0) {
      container.innerHTML = '<div class="empty-message">暂无学习数据</div>';
      return;
    }

    container.innerHTML = `
      <table class="report-table">
        <thead>
          <tr><th>单词</th><th>状态</th><th>简单题</th><th>复杂题</th><th>首次见到</th></tr>
        </thead>
        <tbody>
          ${words.map(w => `
            <tr>
              <td><strong>${w.word}</strong></td>
              <td class="status-${w.status}">${STATUS_LABELS[w.status] || w.status}</td>
              <td>${w.simpleCorrect ? '✓' : '✗'} (${w.simpleWrongCount}错)</td>
              <td>${w.complexCorrect ? '✓' : '✗'} (${w.complexWrongCount}错)</td>
              <td>${w.firstSeenDate || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="more-hint">显示前30个</div>
    `;
  }
}
