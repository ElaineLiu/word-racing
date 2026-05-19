/**
 * Mode Registry - Data-driven quiz mode definitions
 * Adding new modes only requires editing this file
 */

export const QuizModes = {
  PIT_BOARD: {
    key: 'PIT_BOARD',
    label: 'PIT BOARD',
    labelCn: '词→义',
    icon: 'PB',
    reward: { fuel: 10, gear: 0 },
    description: 'Read the word, pick the right meaning',
    difficulty: 1,
    // How to build the question
    promptType: 'word',           // What shows as the question
    promptSubType: 'phonetic',    // Secondary info (phonetic)
    answerType: 'meaning',        // What the correct answer is
    showSentence: true,
    sentenceBlank: false,
  },

  RADIO_MSG: {
    key: 'RADIO_MSG',
    label: 'RADIO',
    labelCn: '填空',
    icon: 'RM',
    reward: { fuel: 10, gear: 0 },
    description: 'Fill in the blank in the sentence',
    difficulty: 2,
    promptType: 'sentenceBlank',  // Sentence with blank
    promptSubType: 'meaning',     // Show meaning as hint
    answerType: 'word',
    showSentence: true,
    sentenceBlank: true,
  },

  STRATEGY: {
    key: 'STRATEGY',
    label: 'STRATEGY',
    labelCn: '义→词',
    icon: 'SC',
    reward: { fuel: 15, gear: 0 },
    description: 'Read the definition, pick the right word',
    difficulty: 2,
    promptType: 'meaning',        // Definition as question
    promptSubType: 'phonetic',
    answerType: 'word',
    showSentence: true,
    sentenceBlank: false,
  },

  QUALIFYING: {
    key: 'QUALIFYING',
    label: 'QUALIFYING',
    labelCn: '音标',
    icon: 'QF',
    reward: { fuel: 0, gear: 15 },
    description: 'Read the phonetic, pick the right word',
    difficulty: 3,
    promptType: 'phonetic',       // Phonetic as question
    promptSubType: 'meaningCn',   // Chinese hint for low levels
    answerType: 'word',
    showSentence: false,
    sentenceBlank: false,
  },

  LAP_REVIEW: {
    key: 'LAP_REVIEW',
    label: 'LAP REVIEW',
    labelCn: '复习',
    icon: 'LR',
    reward: { fuel: 0, gear: 5 },
    description: 'Review a word you got wrong',
    difficulty: 0,  // Adaptive
    promptType: 'adaptive',       // Uses one of the base modes
    promptSubType: 'adaptive',
    answerType: 'adaptive',
    showSentence: true,
    sentenceBlank: false,
    isReview: true,
  },
};

/**
 * Get mode definition by key
 * @param {string} key
 * @returns {object|null}
 */
export function getMode(key) {
  return QuizModes[key] || null;
}

/**
 * Get all mode keys
 * @returns {string[]}
 */
export function getModeKeys() {
  return Object.keys(QuizModes);
}

/**
 * Get modes for basic mode (Chinese options)
 * @returns {string[]}
 */
export function getBasicModes() {
  return ['PIT_BOARD', 'STRATEGY'];
}

/**
 * Get modes for challenge mode
 * @returns {string[]}
 */
export function getChallengeModes() {
  return ['PIT_BOARD', 'RADIO_MSG', 'STRATEGY', 'QUALIFYING'];
}

/**
 * Get base modes (excluding LAP_REVIEW)
 * @returns {string[]}
 */
export function getBaseModes() {
  return ['PIT_BOARD', 'RADIO_MSG', 'STRATEGY', 'QUALIFYING'];
}

/**
 * Get appropriate review mode based on difficulty
 * @param {number} reviewCount - How many times this word has been reviewed
 * @param {boolean} useChinese - Whether to use Chinese options
 * @returns {string}
 */
export function getReviewMode(reviewCount, useChinese = false) {
  if (useChinese) {
    // Basic mode: alternate between PIT_BOARD and STRATEGY
    return Math.random() < 0.5 ? 'PIT_BOARD' : 'STRATEGY';
  }
  // Challenge mode: harder modes for repeated reviews
  if (reviewCount >= 2) {
    return Math.random() < 0.5 ? 'STRATEGY' : 'QUALIFYING';
  }
  return Math.random() < 0.5 ? 'PIT_BOARD' : 'RADIO_MSG';
}

/**
 * Calculate reward for a mode with optional combo bonus
 * @param {string} modeKey
 * @param {number} combo - Current combo streak
 * @returns {{ fuel: number, gear: number }}
 */
export function calculateReward(modeKey, combo = 0) {
  const mode = getMode(modeKey);
  if (!mode) return { fuel: 0, gear: 0 };

  const reward = { ...mode.reward };

  // Combo bonus: every 3 consecutive correct = 5 gear coins
  if (combo > 0 && combo % 3 === 0) {
    reward.gear = (reward.gear || 0) + 5;
  }

  return reward;
}
