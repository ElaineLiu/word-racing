export const MASTERY_GROUP = Object.freeze({
  SIMPLE: 'simple',
  COMPLEX: 'complex',
});

const SIMPLE_MODES = new Set(['PIT_BOARD', 'STRATEGY']);
const COMPLEX_MODES = new Set(['RADIO_MSG', 'QUALIFYING']);

export function getMasteryGroup(mode, originalMode = null) {
  const resolvedMode = mode === 'LAP_REVIEW' ? originalMode : mode;
  if (SIMPLE_MODES.has(resolvedMode)) return MASTERY_GROUP.SIMPLE;
  if (COMPLEX_MODES.has(resolvedMode)) return MASTERY_GROUP.COMPLEX;
  return null;
}

export function calculateQuestionReward(question) {
  const group = getMasteryGroup(question?.mode, question?.originalMode);
  if (group === MASTERY_GROUP.SIMPLE) return { fuel: 3, gear: 0 };
  if (group === MASTERY_GROUP.COMPLEX) return { fuel: 5, gear: 0 };
  return { fuel: 0, gear: 0 };
}

export function calculateAccuracyBonus(correct, total) {
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0) return { fuel: 0, gear: 0 };
  const accuracy = correct / total;
  if (accuracy >= 1) return { fuel: 0, gear: 3 };
  if (accuracy >= 0.8) return { fuel: 0, gear: 2 };
  if (accuracy >= 0.6) return { fuel: 0, gear: 1 };
  return { fuel: 0, gear: 0 };
}
