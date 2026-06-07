/**
 * Test fixtures for 3D track development.
 *
 * Used by test-3d.html (standalone test entry) and tests/3d/*.test.js
 * so that 3D modules can be developed and verified without going through
 * the real QUIZ -> SHOP -> RACE flow.
 *
 * IMPORTANT: shape mirrors the real GameState (see core/game-state.js).
 * The real GameState does NOT have a top-level `words` field — word data
 * is owned by the learning module. We expose word data here as
 * `wordsFixture` to make the test-only nature explicit.
 */

const WORD_STATUSES = ['exposed', 'simple_passed', 'complex_passed', 'mastered'];

function makeWord(id, en, zh, status) {
  return { id, en, zh, status, exposureCount: 0 };
}

/**
 * Returns a plain mock object shaped like the real GameState snapshot.
 * Not an instance of GameState — avoids touching localStorage.
 *
 * Numbers are chosen so that:
 *   - the 3D track unlock threshold (masteryCount >= 200) is met
 *   - fuel is sufficient to start a multi-lap race
 *   - wordsFixture covers every status the bubble system cares about
 */
export function createMockGameState() {
  return {
    fuel: 60,
    fuelCoins: 100,
    gearCoins: 50,
    nitroCharges: 2,

    upgrades: { engine: 2, tire: 2, body: 1 },

    learning: {
      totalWordsSeen: 400,
      totalWordsMastered: 250,
      totalQuizzes: 30,
      totalQuestions: 300,
      totalCorrect: 240,
      lastPerfectQuiz: false,
    },

    unlockedTracks: ['shanghai-2d', 'monaco-2d', 'silverstone-2d', 'shanghai-3d'],
    selectedTrackId: 'shanghai-3d',

    wordsFixture: buildWordsFixture(),
  };
}

function buildWordsFixture() {
  const samples = [
    ['accomplish', '完成'],
    ['brilliant', '辉煌的'],
    ['curious', '好奇的'],
    ['determine', '决定'],
    ['envelope', '信封'],
    ['fascinate', '使着迷'],
    ['gradually', '逐渐地'],
    ['humble', '谦虚的'],
    ['imagine', '想象'],
    ['journey', '旅程'],
    ['knowledge', '知识'],
    ['legendary', '传奇的'],
    ['mystery', '神秘'],
    ['navigate', '导航'],
    ['obstacle', '障碍'],
    ['precious', '珍贵的'],
    ['quantum', '量子'],
    ['resilient', '有韧性的'],
    ['solitude', '独处'],
    ['triumph', '胜利'],
    ['ultimate', '最终的'],
    ['vibrant', '充满活力的'],
    ['whisper', '低语'],
    ['xenial', '好客的'],
    ['yearning', '渴望'],
    ['zealous', '热心的'],
    ['altitude', '海拔'],
    ['benevolent', '仁慈的'],
    ['cascade', '瀑布'],
    ['delicate', '精致的'],
    ['eloquent', '雄辩的'],
    ['fortitude', '坚毅'],
  ];

  return samples.map(([en, zh], i) => {
    const status = WORD_STATUSES[i % WORD_STATUSES.length];
    return makeWord(i + 1, en, zh, status);
  });
}
