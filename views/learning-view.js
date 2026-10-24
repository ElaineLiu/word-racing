import { BaseView } from './base-view.js';
import { Events } from '../core/event-bus.js';
import { blankSentence } from '../learning/assessment-policy.js';
import { LEARNING_ROUTE as C } from '../config/learning-route.js';

/** Production learning page. Legacy QuizView is retained only for old quiz integrations. */
export class LearningView extends BaseView {
  constructor(bus, game, controller, pronunciationPlayer = null) {
    super('page-quiz', bus);
    this.game = game;
    this.controller = controller;
    this.pronunciationPlayer = pronunciationPlayer;
    this.busy = false;
    this.lastAutoPronunciationKey = null;
    this.currentPronunciationWord = null;
  }

  mount() {
    super.mount();
    this.onClick('#learning-start-btn', () => { this.controller.startLearning(); this.render(); });
    this.onClick('#learning-extra-btn', () => { this.controller.startLearning({ extra: true }); this.render(); });
    this.onClick('#quiz-restart-btn', () => { this.controller.startLearning(); this.render(); });
    this.onClick('#quiz-shop-btn', () => this.emit(Events.VIEW_CHANGE, { view: 'shop' }));
    this.onClick('#quiz-start-btn', async () => {
      if (this.busy) return;
      this.busy = true;
      try { await this.game.continueToRace(); this.emit(Events.RACE_START, { source: 'learning' }); }
      catch (error) { alert(error.message); }
      finally { this.busy = false; }
    });
    this.onClick('#quiz-dont-know-btn', () => {
      if (this.task?.kind !== 'choice') return;
      this.controller.revealLearning(this.task.id); this.render();
    });
    this.onClick('#quiz-learn-continue-btn', () => {
      if (!this.task) return;
      this.controller.continueLearning(this.task.id); this.render();
    });
    this.onClick('#quiz-pronounce-btn', () => this.playCurrentPronunciation(false));
    this.onClick('#quiz-learn-pronounce-btn', () => this.playCurrentPronunciation(false));
    this.onEvent('#quiz-lap-select', 'click', event => {
      const button = event.target.closest('button[data-laps]');
      if (!button || button.disabled) return;
      this.game.setLapCount(Number(button.dataset.laps)); this.renderLaps();
    });
    // Choice handlers use delegation, cleaned up by BaseView on unmount.
    this.onEvent('#quiz-options', 'click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button || this.busy) return;
      const id = button.dataset.task;
      if (button.dataset.action === 'known') this.controller.chooseKnown(id);
      else if (button.dataset.action === 'learn') this.controller.revealLearning(id);
      else {
        const result = this.controller.answerLearning(Number(button.dataset.index), id);
        if (!result) return;
        this.feedback = result.correct ? (result.fuel ? `完成这个词：+${result.fuel - (result.completionBonus || 0)} 燃油${result.completionBonus ? `，完成今日目标 +${result.completionBonus} 燃油` : ''}${result.gear ? `，+${result.gear} 装备` : ''}` : '答对了，继续下一步') : '先一起学习，再练习';
      }
      this.render();
    });
    this.subscribe(Events.QUIZ_START, () => { if (this.isMounted()) { this.controller.startLearning(); this.render(); } });
    this.render();
  }

  unmount() {
    this.pronunciationPlayer?.stop();
    this.currentPronunciationWord = null;
    this.lastAutoPronunciationKey = null;
    super.unmount();
  }

  playCurrentPronunciation(automatic, dedupeKey = null) {
    if (!this.currentPronunciationWord || !this.pronunciationPlayer) return;
    if (automatic && !this.controller.gameState.get('preferences.autoPronunciation')) return;
    void this.pronunciationPlayer.play(this.currentPronunciationWord, { automatic, dedupeKey });
  }

  showPronunciation(word, task, surface, learningCard = false) {
    this.currentPronunciationWord = word;
    const key = `${task.id}:${surface}`;
    if (learningCard) {
      this.setText('#quiz-learn-phonetic', word.phonetic || '');
      this.show('#quiz-learn-pronounce-btn');
    } else {
      this.setText('#quiz-phonetic', word.phonetic || '');
      this.show('#quiz-pronounce-btn');
    }
    if (this.lastAutoPronunciationKey !== key) {
      this.pronunciationPlayer?.stop();
      this.lastAutoPronunciationKey = key;
      this.playCurrentPronunciation(true, key);
    }
  }

  hidePronunciation() {
    this.currentPronunciationWord = null;
    this.setText('#quiz-phonetic', '');
    this.setText('#quiz-learn-phonetic', '');
    this.hide('#quiz-pronounce-btn');
    this.hide('#quiz-learn-pronounce-btn');
  }

  button(label, action, id, index = '') {
    const btn = document.createElement('button');
    btn.className = 'quiz-option'; btn.textContent = label;
    btn.dataset.action = action; btn.dataset.task = id; btn.dataset.index = index;
    return btn;
  }

  render() {
    if (!this.getContainer() || !this.controller) return;
    const daily = this.controller.getLearningProgress();
    this.setText('#learning-daily-progress', `今日完成 ${daily.completedWords}/${daily.targetWords} 词 · 独立通过 ${daily.independentWords} 词 · 燃油 +${daily.fuelCoinsEarned} · 装备 +${daily.gearCoinsEarned}`);
    this.task = this.controller.getLearningTask();
    this.hide('#quiz-nav'); this.hide('#quiz-learn-panel'); this.hide('#quiz-complete');
    this.hidePronunciation();
    this.$('#quiz-layout')?.classList.remove('has-learn-panel');
    this.setText('#quiz-sentence', ''); this.setText('#quiz-meaning-en', '');
    const options = this.$('#quiz-options');
    options?.replaceChildren();
    if (!this.task) {
      this.pronunciationPlayer?.stop();
      this.lastAutoPronunciationKey = null;
      this.hide('#quiz-question-area'); this.show('#quiz-complete');
      const session = this.controller.gameState.get('adaptive.session');
      this.setText('#quiz-result-accuracy', session ? `本轮完成 ${session.completed.length}/${session.assigned.length} 个词` : '点击“开始今日学习”安排任务');
      this.setText('#quiz-result-fuel', `今日学习获得 ${daily.fuelCoinsEarned} 燃油 · 当前余额 ${this.game.fuelCoins}`);
      this.setText('#quiz-result-gear', `今日学习获得 ${daily.gearCoinsEarned} 装备`);
      this.setText('#quiz-result-wrong', session?.deferred.length ? '部分反向验证将于明天继续，已通过证据保留。' : `已学习仍需日后巩固。完成${C.DAILY_WORDS}个不同词获得${C.DAILY_WORDS * C.PRACTICE_FUEL + C.DAILY_COMPLETION_FUEL}燃油，可跑10圈。`);
      this.hide('#quiz-result-nitro');
      this.renderLaps();
      return;
    }
    const t = this.task;
    const corpus = this.controller.learningWordSet.find(w => w.word === t.word);
    this.show('#quiz-question-area');
    this.setText('#quiz-progress', `${({ intro: '新词', card: '学习', 'review-card': '巩固提示', 'context-card': '用法学习' })[t.kind] || ({ practice: '练习', verify: '独立验证', review: '词义巩固', context: '语境运用' })[t.route]}`);
    this.setText('#quiz-nitro-hint', this.feedback || `双向完成一个词 +${C.PRACTICE_FUEL}燃油；完成今日${C.DAILY_WORDS}词再奖励${C.DAILY_COMPLETION_FUEL}燃油`);
    this.feedback = '';
    this.hide('#quiz-dont-know');
    if (t.kind === 'intro') {
      this.setText('#quiz-word', t.word);
      this.showPronunciation(corpus, t, 'intro');
      options?.append(this.button('开始学习', 'learn', t.id), this.button('我认识，先验证', 'known', t.id));
    } else if (['card', 'review-card', 'context-card'].includes(t.kind)) {
      // Persist help before exposing any definition/example, including scheduled learning cards.
      this.controller.revealLearning(t.id);
      const word = this.controller.getLearningWords()[t.word];
      this.setText('#quiz-word', '先学习，稍后练习');
      this.setText('#quiz-learn-word', t.word);
      this.showPronunciation(corpus, t, t.kind, true);
      this.setText('#quiz-learn-meaning', `${corpus.meaning_cn} ${corpus.meaning_en || ''}`);
      this.setText('#quiz-learn-sentence', blankSentence(corpus) ? corpus.sentence : '');
      this.setText('#quiz-learn-sentence-cn', blankSentence(corpus) ? corpus.sentence_cn || '' : '');
      this.setText('#quiz-nitro-hint', word.status === 'learned' ? '提示后明天重新巩固，不计独立通过' : '学习中的词最早明天独立验证');
      this.show('#quiz-learn-panel');
      this.$('#quiz-layout')?.classList.add('has-learn-panel');
    } else {
      this.setText('#quiz-word', t.question.prompt);
      if (t.direction === 'forward') this.showPronunciation(corpus, t, `${t.route}-forward`);
      else {
        this.pronunciationPlayer?.stop();
        this.lastAutoPronunciationKey = null;
      }
      this.show('#quiz-dont-know');
      t.question.options.forEach((label, index) => options?.append(this.button(label, 'answer', t.id, index)));
    }
  }

  renderLaps() {
    const container = this.$('#quiz-lap-select');
    container?.replaceChildren();
    for (let laps = 1; laps <= 5; laps++) {
      const button = document.createElement('button');
      button.className = 'lap-btn'; button.textContent = `${laps}圈`;
      button.dataset.laps = laps;
      button.disabled = laps > this.game.getMaxAffordableLaps();
      container?.append(button);
    }
  }
}
