/**
 * ReportView - 学习进度报告页面
 */
import { BaseView } from './base-view.js';
import { LEARNING } from '../config/learning-config.js';

const STATUS_LABELS = {
  unlearned: 'Not Started',
  exposed: 'Seen',
  simple_passed: 'Basic Passed',
  complex_passed: 'Advanced Passed',
  mastered: 'Mastered',
  forgotten: 'Needs Review',
  independent_passed: 'Independently Passed',
  pending_verification: 'Pending Verification'
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
    if (this.#learningController?.getLearningWords) {
      this.#renderAdaptive();
      return;
    }
    this.#renderTotalStats();
    this.#renderTodayStats();
    this.#renderMasteryStats();
    this.#renderWrongWords();
    this.#renderWordDetails();
  }

  #renderAdaptive() {
    const c = this.#learningController;
    const stats = c.getLearningWordStats(), daily = c.getLearningProgress();
    const labels = { pending: '待确认', learning: '学习中', learned: '已学习' };
    const escape = value => String(value ?? '-').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
    this.#renderTotalStats();
    this.setHtml('#report-today-stats', `<div class="stat-row"><span>今日完成词汇</span><strong>${daily.completedWords}/${daily.targetWords}</strong></div><div class="stat-row"><span>独立通过</span><strong>${daily.independentWords}</strong></div><div class="stat-row"><span>燃油 / 装备</span><strong>${daily.fuelCoinsEarned} / ${daily.gearCoinsEarned}</strong></div>`);
    this.setHtml('#report-mastery-stats', Object.entries({ '当前词库': stats.total, '待确认': stats.pending, '学习中': stats.learning, '已学习': stats.learned, '到期巩固': stats.due, '归档词汇': stats.archived }).map(([name, value]) => `<div class="stat-row"><span>${name}</span><strong>${value}</strong></div>`).join(''));
    const words = Object.values(c.getLearningWords());
    const rows = list => `<table class="report-table"><thead><tr><th>单词</th><th>状态</th><th>下次任务</th><th>词义 / 语境错误</th></tr></thead><tbody>${list.map(w => `<tr><td>${escape(w.word)}</td><td>${w.available ? labels[w.status] : '归档'}</td><td>${escape(w.nextDueDate)}</td><td>${w.meaningMisses || 0} / ${w.contextMisses || 0}</td></tr>`).join('')}</tbody></table>`;
    const learning = words.filter(w => w.available && w.status === 'learning');
    this.setHtml('#report-wrong-words', learning.length ? rows(learning.slice(0, 20)) : '<div class="empty-message">当前没有需要补学的词</div>');
    const ordered = words.sort((a, b) => Number(!a.available) - Number(!b.available) || Number(a.status === 'learned') - Number(b.status === 'learned'));
    this.setHtml('#report-word-details', rows(ordered.slice(0, 30)));
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
      <div class="stat-row"><span>Practice Accuracy (includes historical answers)</span><strong>${accuracy}%</strong></div>
    `;
  }

  #renderTodayStats() {
    const container = this.$('#report-today-stats');
    if (!container || !this.#learningController) return;

    const progress = this.#learningController.getDailyProgress?.() || {};

    container.innerHTML = `
      <div class="stat-row"><span>Today's Quizzes</span><strong>${progress.quizzesCompleted || 0} / ${LEARNING.DAILY_QUIZ_COUNT}</strong></div>
      <div class="stat-row"><span>New Words</span><strong>${progress.newWordsLearned || 0}</strong></div>
      <div class="stat-row"><span>Reviewed Words</span><strong>${progress.wordsReviewed || 0}</strong></div>
      <div class="stat-row"><span>Best Combo</span><strong>${progress.maxCombo || 0}</strong></div>
      <div class="stat-row"><span>Fuel Coins</span><strong>${progress.fuelCoinsEarned || 0}</strong></div>
      <div class="stat-row"><span>Gear Coins</span><strong>${progress.gearCoinsEarned || 0}</strong></div>
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
      <div class="stat-row"><span>✅ Stable Mastery</span><strong class="text-success">${stats.mastered || 0} <small>(${masteredPercent}%)</small></strong></div>
      <div class="stat-row"><span>📖 Learning</span><strong class="text-warning">${stats.learning || 0} <small>(${learningPercent}%)</small></strong></div>
      <div class="stat-row"><span>Both Abilities Independently Passed</span><strong>${stats.independentPassed || 0}</strong></div>
      <div class="stat-row"><span>Historical Passes Awaiting Verification</span><strong>${stats.pendingVerification || 0}</strong></div>
      <div class="stat-row"><span>Words Completed with Help</span><strong>${stats.assisted || 0}</strong></div>
      <div class="stat-row"><span>Archived Words (not in current wordset)</span><strong>${stats.archived || 0}</strong></div>
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
              <td class="status-${w.status}">${w.available === false ? 'Archived' : (STATUS_LABELS[w.status] || w.status)}</td>
              <td>${w.simpleCorrect ? '✓' : '✗'} (${w.independentDates?.simple.length || 0}/2 dates; ${w.simpleWrongCount} misses)</td>
              <td>${w.complexCorrect ? '✓' : '✗'} (${w.independentDates?.complex.length || 0}/2 dates; ${w.complexWrongCount} misses)</td>
              <td>${w.firstSeenDate || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="more-hint">Showing first 30</div>
    `;
  }
}
