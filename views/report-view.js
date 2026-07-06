/**
 * ReportView - 学习进度报告页面
 */
import { BaseView } from './base-view.js';

const STATUS_LABELS = {
  unlearned: 'Not Started',
  exposed: 'Seen',
  simple_passed: 'Basic Passed',
  complex_passed: 'Advanced Passed',
  mastered: 'Mastered',
  forgotten: 'Needs Review'
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
      <div class="stat-row"><span>Quizzes Completed</span><strong>${stats.totalQuizzes || 0}</strong></div>
      <div class="stat-row"><span>Total Questions</span><strong>${stats.totalQuestions || 0}</strong></div>
      <div class="stat-row"><span>Correct Answers</span><strong>${stats.totalCorrect || 0}</strong></div>
      <div class="stat-row"><span>Accuracy</span><strong>${accuracy}%</strong></div>
    `;
  }

  #renderTodayStats() {
    const container = this.$('#report-today-stats');
    if (!container || !this.#learningController) return;

    const progress = this.#learningController.getDailyProgress?.() || {};
    const goals = this.#learningController.dailyManager?.checkDailyGoals?.() || {};

    container.innerHTML = `
      <div class="stat-row"><span>Today's Quizzes</span><strong>${progress.quizzesCompleted || 0} / 3</strong></div>
      <div class="stat-row"><span>New Words</span><strong>${progress.newWordsLearned || 0}</strong></div>
      <div class="stat-row"><span>Reviewed Words</span><strong>${progress.wordsReviewed || 0}</strong></div>
      <div class="stat-row"><span>Best Combo</span><strong>${progress.maxCombo || 0}</strong></div>
      <div class="stat-row"><span>Fuel Coins</span><strong>${progress.fuelCoinsEarned || 0}</strong></div>
      <div class="stat-row"><span>Gear Coins</span><strong>${progress.gearCoinsEarned || 0}</strong></div>
      <div class="goals-section">
        <div class="goal ${goals.dailyComplete?.achieved ? 'achieved' : ''}">
          ${goals.dailyComplete?.achieved ? '✓' : '○'} Complete ${goals.dailyComplete?.target || 3} quizzes
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
      <div class="stat-row"><span>Words Attempted</span><strong>${stats.total || 0}</strong></div>
      <div class="stat-row"><span>✅ Mastered</span><strong class="text-success">${stats.mastered || 0} <small>(${masteredPercent}%)</small></strong></div>
      <div class="stat-row"><span>📖 Learning</span><strong class="text-warning">${stats.learning || 0} <small>(${learningPercent}%)</small></strong></div>
    `;
  }

  #renderWrongWords() {
    const container = this.$('#report-wrong-words');
    if (!container || !this.#learningController) return;

    const wrongWords = this.#learningController.progressTracker?.getWrongWords?.() || [];

    if (wrongWords.length === 0) {
      container.innerHTML = '<div class="empty-message">No words to review yet 🎉</div>';
      return;
    }

    container.innerHTML = `
      <table class="report-table">
        <thead>
          <tr><th>Word</th><th>Basic Misses</th><th>Advanced Misses</th><th>Status</th></tr>
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
      ${wrongWords.length > 20 ? `<div class="more-hint">Showing first 20 of ${wrongWords.length}</div>` : ''}
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
      container.innerHTML = '<div class="empty-message">No learning data yet</div>';
      return;
    }

    container.innerHTML = `
      <table class="report-table">
        <thead>
          <tr><th>Word</th><th>Status</th><th>Basic</th><th>Advanced</th><th>First Seen</th></tr>
        </thead>
        <tbody>
          ${words.map(w => `
            <tr>
              <td><strong>${w.word}</strong></td>
              <td class="status-${w.status}">${STATUS_LABELS[w.status] || w.status}</td>
              <td>${w.simpleCorrect ? '✓' : '✗'} (${w.simpleWrongCount} misses)</td>
              <td>${w.complexCorrect ? '✓' : '✗'} (${w.complexWrongCount} misses)</td>
              <td>${w.firstSeenDate || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="more-hint">Showing first 30</div>
    `;
  }
}
