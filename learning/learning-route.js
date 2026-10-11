import { WORD_STATE as S, LEARNING_ROUTE as C } from '../config/learning-route.js';
import { localDate, blankSentence, isQuestionSafe } from './assessment-policy.js';
import { QuestionFactory } from '../js/question-factory.js';
import { Events } from '../core/event-bus.js';

export function addDays(day, amount) {
  const [y, m, d] = day.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + amount));
}

function initialProgress(word, legacy, today) {
  const stable = legacy?.assessmentVersion === 1 && new Set(legacy.independentDates?.simple || []).size >= 2 &&
    new Set(legacy.independentDates?.complex || []).size >= 2 && legacy.status === 'mastered';
  return { word: word.word, wordId: word.id, available: true, status: stable ? S.LEARNED : S.PENDING,
    seen: !!legacy, firstSeenDate: legacy?.firstSeenDate || null, lastSeenDate: legacy?.lastSeenDate || null,
    legacy: legacy ? structuredClone(legacy) : null, verification: null, practice: null,
    lastAssistedDate: legacy?.lastAssistedDate || null, reviewStep: 0, reviewPasses: 0,
    nextDueDate: stable ? addDays(today, 1) : null, meaningMisses: 0, contextMisses: 0 };
}

/** The route, progress, reward receipts and balances share one GameState save. */
export class LearningRoute {
  constructor(gameState, eventBus, words, legacy = {}, achievements = null) {
    this.state = gameState;
    this.bus = eventBus;
    this.words = words;
    this.achievements = achievements;
    // Initialization is explicit: constructors never emit events.
    this.legacy = legacy;
  }

  init() {
    const state = this.state.getAll();
    const today = localDate();
    const data = state.adaptive?.version === C.VERSION ? state.adaptive : {
      version: C.VERSION, progress: {}, days: {}, session: null, sequence: 0,
    };
    const current = new Map(this.words.map(w => [w.word, w]));
    for (const [text, p] of Object.entries(data.progress)) {
      p.available = current.has(text);
      p.wordId = current.get(text)?.id ?? null;
    }
    for (const word of this.words) {
      data.progress[word.word] ??= initialProgress(word, this.legacy[word.word], today);
    }
    for (const [text, old] of Object.entries(this.legacy)) {
      if (!current.has(text) && !data.progress[text]) {
        data.progress[text] = { ...initialProgress({ word: text, id: null }, old, today), available: false };
      }
    }
    if (data.session?.assigned.some(text => !current.has(text))) data.session = null;
    state.adaptive = data;
    state.learning.totalWordsMastered = Object.values(data.progress).filter(p => p.available && p.status === S.LEARNED).length;
    this.state.replace(state);
    this.lastStatuses = Object.fromEntries(Object.entries(data.progress).map(([word, p]) => [word, p.status]));
    this.day();
    return this;
  }

  day() {
    const data = this.state.get('adaptive');
    const today = localDate();
    if (data.session && data.session.date !== today) data.session = null;
    data.days[today] ??= { rewards: {}, independent: [], newWords: [], oldWords: [], rounds: 0, fuel: 0, gear: 0 };
    data.days[today].completionBonus ??= false;
    // The ledger is compact and retains receipts for all dates: no refresh/import can reissue a day's award.
    return data.days[today];
  }

  save() {
    const state = { learning: this.state.get('learning'), adaptive: this.state.get('adaptive') };
    state.learning.totalWordsMastered = Object.values(state.adaptive.progress).filter(p => p.available && p.status === S.LEARNED).length;
    state.learning.lastPerfectQuiz = false;
    const changes = Object.entries(state.adaptive.progress).filter(([word, p]) => this.lastStatuses?.[word] !== p.status)
      .map(([word, p]) => ({ word, previousStatus: this.lastStatuses?.[word], newStatus: p.status }));
    this.lastStatuses = Object.fromEntries(Object.entries(state.adaptive.progress).map(([word, p]) => [word, p.status]));
    const fuel = this.pendingFuel || 0, gear = this.pendingGear || 0;
    this.pendingFuel = 0; this.pendingGear = 0;
    this.state.commitLearningState(fuel, gear);
    for (const change of changes) {
      this.bus.emit(Events.WORD_STATUS_CHANGED, change);
      if (change.newStatus === S.LEARNED) this.bus.emit(Events.WORD_MASTERED, { word: change.word });
      else if (change.previousStatus === S.LEARNED) this.bus.emit(Events.WORD_FORGOTTEN, { word: change.word });
    }
    this.bus.emit(Events.DAILY_PROGRESS, this.getDailyProgress());
  }

  progress(text) { return this.state.get('adaptive').progress[text]; }

  start({ extra = false } = {}) {
    const day = this.day();
    const data = this.state.get('adaptive');
    if (data.session && !data.session.ended) return this.task();
    if (!extra && Object.keys(day.rewards).length >= C.DAILY_WORDS) return null;
    const today = localDate();
    const candidates = this.words.filter(w => {
      const p = this.progress(w.word);
      if (day.rewards[w.word]) return false;
      if (p.nextDueDate && p.nextDueDate > today) return false;
      if (p.status === S.LEARNED) return !!p.nextDueDate;
      if (p.status === S.LEARNING) return !p.practice || p.practice.date !== today || !p.practice.completed;
      return true;
    }).sort((a, b) => {
      const rank = p => p.status === S.LEARNED ? 0 : p.status === S.LEARNING ? 1 : p.seen ? 2 : 3;
      const pa = this.progress(a.word), pb = this.progress(b.word);
      return rank(pa) - rank(pb) || (pa.nextDueDate || '').localeCompare(pb.nextDueDate || '') ||
        ((pb.legacy?.simpleWrongCount || 0) + (pb.legacy?.complexWrongCount || 0)) -
        ((pa.legacy?.simpleWrongCount || 0) + (pa.legacy?.complexWrongCount || 0));
    });
    const selected = [];
    let fresh = day.newWords.length, old = day.oldWords.length;
    const limit = extra ? C.ROUND_WORDS : Math.min(C.ROUND_WORDS, C.DAILY_WORDS - Object.keys(day.rewards).length);
    for (const w of candidates) {
      const p = this.progress(w.word);
      const newEntry = !p.seen && !day.newWords.includes(w.word);
      const oldEntry = p.status === S.PENDING && p.seen && !day.oldWords.includes(w.word);
      if (!extra && ((newEntry && fresh >= C.NEW_WORDS) || (oldEntry && old >= C.OLD_WORDS))) continue;
      // Both directions must have valid material; otherwise skip without changing the child's state.
      if (!this.question(w, 'forward') || !this.question(w, 'reverse')) continue;
      selected.push(w);
      if (newEntry) { day.newWords.push(w.word); fresh++; }
      if (oldEntry) { day.oldWords.push(w.word); old++; }
      if (selected.length >= limit) break;
    }
    if (!selected.length) { this.save(); return null; }
    data.session = { date: today, assigned: selected.map(w => w.word), queue: [], trace: [],
      completed: [], deferred: [], skipped: [], contextWords: [], ended: false, fuel: 0, gear: 0 };
    for (const w of selected) {
      const p = this.progress(w.word);
      if (!p.seen) this.enqueue(w.word, 'intro');
      else if (p.status === S.LEARNING && (!p.practice?.completed || p.lastAssistedDate === today)) this.enqueue(w.word, 'card');
      else {
        if (p.verification && addDays(p.verification.date, C.EVIDENCE_DAYS) < today) p.verification = null;
        this.enqueue(w.word, 'choice', p.status === S.LEARNED ? 'review' : 'verify', p.verification ? 'reverse' : 'forward');
      }
    }
    let contexts = 0;
    for (const w of selected) {
      if (this.progress(w.word).reviewPasses > 0 && blankSentence(w) && contexts < Math.floor(selected.length * 0.3)) {
        data.session.contextWords.push(w.word); contexts++;
      }
    }
    this.save();
    return this.task();
  }

  enqueue(word, kind, route = null, direction = null) {
    const data = this.state.get('adaptive');
    data.session.queue.push({ id: `task-${++data.sequence}`, word, kind, route, direction });
  }

  question(word, direction) {
    // Meaning prompts never include examples; context prompts never include the target definition.
    const source = { ...word, sentence: direction === 'context' ? word.sentence : '', phonetic: '' };
    const q = QuestionFactory.createQuestion(source, direction === 'forward' ? 'PIT_BOARD' : direction === 'reverse' ? 'STRATEGY' : 'RADIO_MSG', 5, this.words, true);
    if (!q || (direction === 'context' && q.mode !== 'RADIO_MSG')) return null;
    q.promptSub = ''; q.promptCn = ''; q.sentence = '';
    return isQuestionSafe(q) ? q : null;
  }

  task() {
    this.day();
    const session = this.state.get('adaptive').session;
    if (!session || session.ended) return null;
    let changed = false;
    while (session.queue.length) {
      const t = session.queue[0];
      const p = this.progress(t.word);
      if (t.kind === 'choice' && t.direction === 'reverse' && t.route !== 'practice' && p.verification?.date === localDate()) {
        const others = new Set(session.trace.slice(p.verification.traceIndex + 1).filter(w => w !== t.word));
        if (others.size < 2) {
          const possible = new Set([...others, ...session.queue.slice(1).map(other => other.word).filter(w => w !== t.word)]);
          if (possible.size >= 2) { session.queue.push(session.queue.shift()); changed = true; continue; }
          p.nextDueDate = addDays(localDate(), 1);
          session.deferred.push(t.word); session.queue.shift(); changed = true; continue;
        }
      }
      if (t.kind === 'choice') {
        if (!t.question) { t.question = this.question(this.words.find(w => w.word === t.word), t.direction); changed = true; }
        if (!t.question) { session.skipped.push(t.word); session.queue.shift(); continue; }
      }
      if (changed) this.save();
      return structuredClone(t);
    }
    session.ended = true;
    if (session.assigned.every(word => session.completed.includes(word))) {
      this.state.get('adaptive').days[localDate()].rounds++;
      this.state.modify('learning.totalQuizzes', 1);
    }
    this.save();
    this.achievements?.checkAll();
    return null;
  }

  current(id) {
    this.day();
    const session = this.state.get('adaptive').session;
    return session && !session.ended && session.queue[0]?.id === id ? session.queue[0] : null;
  }

  chooseKnown(id) {
    const t = this.current(id);
    if (!t || t.kind !== 'intro') return false;
    const p = this.progress(t.word);
    p.seen = true; p.firstSeenDate ??= localDate();
    t.kind = 'choice'; t.route = 'verify'; t.direction = 'forward';
    this.save(); return true;
  }

  reveal(id) {
    const t = this.current(id);
    if (!t) return false;
    const p = this.progress(t.word);
    p.lastAssistedDate = localDate(); p.seen = true; p.firstSeenDate ??= localDate();
    p.verification = null;
    if (t.route === 'context') {
      p.nextDueDate = addDays(localDate(), 1);
      t.kind = 'context-card';
    } else if (p.status === S.LEARNED) {
      p.nextDueDate = addDays(localDate(), 1);
      t.kind = 'review-card';
    } else {
      p.status = S.LEARNING; p.nextDueDate = null;
      t.kind = 'card';
    }
    this.save(); return true;
  }

  continueCard(id) {
    const t = this.current(id);
    if (!t || !['card', 'review-card', 'context-card'].includes(t.kind)) return false;
    const session = this.state.get('adaptive').session;
    session.queue.shift(); session.trace.push(t.word);
    if (t.kind === 'card') {
      const p = this.progress(t.word);
      p.lastAssistedDate = localDate();
      session.queue = session.queue.filter(other => other.word !== t.word || other.route !== 'practice');
      p.practice = { date: localDate(), forward: false, reverse: false, completed: false };
      // Append after the other words' learning tasks; directions are randomized.
      for (const direction of Math.random() < 0.5 ? ['forward', 'reverse'] : ['reverse', 'forward']) this.enqueue(t.word, 'choice', 'practice', direction);
      const practice = session.queue.filter(other => other.route === 'practice');
      for (let i = practice.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [practice[i], practice[j]] = [practice[j], practice[i]];
      }
      session.queue = [...session.queue.filter(other => other.route !== 'practice'), ...practice];
    }
    this.save(); return true;
  }

  answer(index, id) {
    const t = this.current(id);
    if (!t || t.kind !== 'choice') return null;
    const q = t.question;
    if (!q || !isQuestionSafe(q)) return null;
    if (!Number.isInteger(index) || index < -1 || index >= q.options.length) return null;
    const correct = index === q.correctIndex;
    const p = this.progress(t.word);
    const session = this.state.get('adaptive').session;
    p.seen = true; p.firstSeenDate ??= localDate(); p.lastSeenDate = localDate();
    this.state.get('learning').totalQuestions++;
    if (correct) this.state.get('learning').totalCorrect++;
    let fuel = 0, gear = 0, completionBonus = 0;
    if (t.route === 'context') {
      if (!correct) { p.contextMisses++; p.nextDueDate = addDays(localDate(), 1); this.reveal(id); return { correct, fuel, gear }; }
    } else if (!correct) {
      p.meaningMisses++; p.status = S.LEARNING; p.verification = null; p.reviewStep = 0; p.reviewPasses = 0;
      this.reveal(id); return { correct, fuel, gear };
    } else if (t.route === 'practice') {
      p.practice[t.direction] = true;
      if (p.practice.forward && p.practice.reverse) {
        p.practice.completed = true; p.nextDueDate = addDays(localDate(), 1);
        ({ fuel, gear, completionBonus } = this.award(t.word, false));
      }
    } else if (p.lastAssistedDate === localDate()) {
      this.reveal(id); return { correct, fuel, gear };
    } else if (t.direction === 'forward') {
      p.verification = { date: localDate(), traceIndex: session.trace.length };
      this.enqueue(t.word, 'choice', t.route, 'reverse');
    } else if (p.verification && addDays(p.verification.date, C.EVIDENCE_DAYS) >= localDate()) {
      p.status = S.LEARNED; p.verification = null;
      if (t.route === 'review') { p.reviewPasses++; p.reviewStep = Math.min(p.reviewStep + 1, C.INTERVALS.length - 1); }
      else p.reviewStep = 0;
      p.nextDueDate = addDays(localDate(), C.INTERVALS[p.reviewStep]);
      ({ fuel, gear, completionBonus } = this.award(t.word, true));
    }
    session.queue.shift(); session.trace.push(t.word);
    this.save();
    this.achievements?.checkAll();
    return { correct, fuel, gear, completionBonus };
  }

  award(word, independent) {
    const day = this.day();
    const target = independent ? C.INDEPENDENT_FUEL : C.PRACTICE_FUEL;
    let fuel = Math.max(0, target - (day.rewards[word] || 0));
    day.rewards[word] = Math.max(target, day.rewards[word] || 0);
    // Only fully completed, distinct words count. The milestone receipt shares the balance save.
    const completionBonus = !day.completionBonus && Object.keys(day.rewards).length >= C.DAILY_WORDS
      ? C.DAILY_COMPLETION_FUEL : 0;
    if (completionBonus) { day.completionBonus = true; fuel += completionBonus; }
    const priorGear = Math.min(C.MAX_DAILY_GEAR, Math.floor(day.independent.length / C.GEAR_WORDS));
    if (independent && !day.independent.includes(word)) day.independent.push(word);
    const gear = Math.min(C.MAX_DAILY_GEAR, Math.floor(day.independent.length / C.GEAR_WORDS)) - priorGear;
    const session = this.state.get('adaptive').session;
    if (!session.completed.includes(word)) session.completed.push(word);
    if (independent && session.contextWords?.includes(word)) {
      session.contextWords = session.contextWords.filter(text => text !== word);
      this.enqueue(word, 'choice', 'context', 'context');
    }
    session.fuel += fuel; session.gear += gear; day.fuel += fuel; day.gear += gear;
    this.pendingFuel = (this.pendingFuel || 0) + fuel;
    this.pendingGear = (this.pendingGear || 0) + gear;
    return { fuel, gear, completionBonus };
  }

  getDailyProgress() {
    const day = this.day();
    return { completedWords: Object.keys(day.rewards).length, targetWords: C.DAILY_WORDS,
      independentWords: day.independent.length, fuelCoinsEarned: day.fuel, gearCoinsEarned: day.gear,
      newWordsLearned: day.newWords.length, quizzesCompleted: day.rounds };
  }

  getAllProgress() { return structuredClone(this.state.get('adaptive').progress); }
  getStats() {
    const all = Object.values(this.state.get('adaptive').progress), active = all.filter(p => p.available);
    return { total: active.length, pending: active.filter(p => p.status === S.PENDING).length,
      learning: active.filter(p => p.status === S.LEARNING).length, learned: active.filter(p => p.status === S.LEARNED).length,
      due: active.filter(p => p.status === S.LEARNED && p.nextDueDate <= localDate()).length,
      archived: all.length - active.length };
  }
}
