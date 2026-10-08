import { getMasteryGroup } from '../config/reward-policy.js';

export const ASSESSMENT_VERSION = 1;

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function containsAnswer(text, word) {
  if (word && !/^[a-z]/i.test(word)) return String(text || '').toLowerCase().includes(word.toLowerCase());
  return !!word && new RegExp(`\\b${escapeRegex(word)}\\b`, 'i').test(text || '');
}

export function blankSentence(word) {
  if (!word.sentence || word.question_eligibility?.sentence === false || word.source2025?.needs_review) return '';
  const forms = [word.word, ...(word.word_forms || []).map(form => form.word),
    ...['s', 'es', 'ed', 'ing', 'er', 'est'].map(suffix => word.word + suffix)]
    .filter(Boolean).sort((a, b) => b.length - a.length);
  const expression = new RegExp(`\\b(?:${forms.map(escapeRegex).join('|')})\\b`, 'gi');
  if (!expression.test(word.sentence)) return '';
  return word.sentence.replace(expression, '______');
}

export function isQuestionSafe(question) {
  if (!question || !Array.isArray(question.options) || question.options.length < 2) return false;
  if (new Set(question.options).size !== question.options.length) return false;
  if (!Number.isInteger(question.correctIndex) || !question.options[question.correctIndex]) return false;
  const mode = question.isReview || question.mode === 'LAP_REVIEW' ? question.originalMode : question.mode;
  if (!getMasteryGroup(mode)) return false;
  const answer = question.options[question.correctIndex];
  const hint = [question.promptSub, question.promptCn].filter(Boolean).join(' ');
  if (mode === 'PIT_BOARD') return !containsAnswer([hint, question.sentence].filter(Boolean).join(' '), answer);
  if (containsAnswer([question.prompt, hint].join(' '), question.correctWord || answer)) return false;
  if (mode === 'RADIO_MSG') return !!question.prompt?.includes('______');
  if (mode === 'STRATEGY' && containsAnswer(question.sentence, question.correctWord || answer)) return false;
  return true;
}

export function migrateProgress(progress, words) {
  const currentWords = new Map(words.map(word => [word.word, word]));
  return Object.fromEntries(Object.entries(progress).map(([word, original]) => {
    const p = structuredClone(original);
    const current = currentWords.get(word);
    if (p.assessmentVersion !== ASSESSMENT_VERSION) {
      p.legacyEvidence = { wordId: p.wordId, status: p.status,
        simpleCorrect: !!p.simpleCorrect, complexCorrect: !!p.complexCorrect,
        masteryDate: p.masteryDate || null };
      p.assessmentVersion = ASSESSMENT_VERSION;
      p.independentDates = { simple: [], complex: [] };
      p.pendingVerification = !!(p.simpleCorrect || p.complexCorrect);
      p.simpleCorrect = false;
      p.complexCorrect = false;
      p.masteryDate = null;
      p.status = p.pendingVerification ? 'pending_verification' : 'exposed';
    }
    p.word = word;
    p.available = !!current;
    p.wordId = current?.id ?? null;
    p.simpleWrongCount ??= 0;
    p.complexWrongCount ??= 0;
    p.assistedCompletions ??= 0;
    return [word, p];
  }));
}
