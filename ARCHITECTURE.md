# Word Racing v2.0 Architecture: Question Type Redesign & Word Bank Expansion

## 1. Problem Statement

| Issue | Detail |
|-------|--------|
| Type field is meaningless | 234 simple vs 6 complex -- complex is just a Level 3+ tag, not a real question type |
| Only one quiz format | Always 4-option "word -> Chinese meaning", no variety |
| Options are all Chinese | Kids rely on Chinese intuition, never build English thinking |
| No contextual interaction | Racing theme only in example sentences, which don't participate in the quiz |
| 240 words is too small | Quick to exhaust, no room for progression |

## 2. New Question Types (4 modes)

### Mode 1: PIT_BOARD -- Word to Definition
- **Scenario**: Pit board strategy shows a command word, pick the right meaning
- **Prompt**: English word (+ phonetic as subtitle)
- **Options**: 4 English definitions (meaning_en)
- **Difficulty**: L1-2 options include Chinese; L3-4 pure English; L5 near-synonym distractors
- **Reward**: +10 Fuel Coins

### Mode 2: RADIO_MSG -- Sentence Fill-in-Blank
- **Scenario**: Radio message with a word blocked by noise, pick the right word
- **Prompt**: Sentence with `______` where the target word was
- **Options**: 4 English words
- **Difficulty**: L1-2 show Chinese translation; L3-4 English only
- **Reward**: +10 Fuel Coins

### Mode 3: STRATEGY -- Definition to Word (Reverse)
- **Scenario**: Engineer gives a meaning, driver must select the right English word
- **Prompt**: English definition (or Chinese definition at L1-2)
- **Options**: 4 English words
- **Difficulty**: L1-2 Chinese definition; L3-4 English definition; L5 near-synonym definitions
- **Reward**: +15 Fuel Coins

### Mode 4: QUALIFYING -- Phonetic to Word
- **Scenario**: Hear the word during qualifying, identify which word it is
- **Prompt**: Phonetic transcription
- **Options**: 4 English words
- **Difficulty**: L1-2 phonetic + Chinese hint; L3-4 phonetic only; L5 audio only (Phase 2)
- **Reward**: +15 Gear Coins

### Mode 5: LAP_REVIEW -- Adaptive Review (from wrong words)
- **Scenario**: Post-race review, wrong words reappear with harder question types
- **Logic**: Pick from wrongWords, use one of the 4 modes above
- **First review**: PIT_BOARD; **Second review**: RADIO_MSG or STRATEGY
- **Reward**: +5 Gear Coins per correct review
- **Removal**: After 2 consecutive correct answers, word is removed from wrong list

## 3. Quiz Distribution Per Round (5 questions)

Default: 2 PIT_BOARD + 1 RADIO_MSG + 1 STRATEGY + 1 QUALIFYING
If wrongWords exist: 1 slot replaced by LAP_REVIEW

## 4. Unified Question Data Structure

```js
{
  mode: 'PIT_BOARD' | 'RADIO_MSG' | 'STRATEGY' | 'QUALIFYING',
  modeLabel: 'PIT BOARD',        // UI display
  prompt: 'factory',             // Main prompt text
  promptSub: '/ˈfæktəri/',      // Secondary prompt (phonetic/definition)
  sentence: 'The car ______ makes 100 cars every day.',  // RADIO_MSG only
  sentenceBlank: true,           // Whether sentence has blank
  options: ['A) ...', 'B) ...', 'C) ...', 'D) ...'],
  correctIndex: 0,
  reward: { fuel: 10, gear: 0 },
  wordId: 1,
  level: 3,
  answered: false,
  correct: false
}
```

## 5. Architecture Layers

```
index.html
  showQuizQuestion(q)  -- branch render by q.mode
  handleQuizAnswer(idx) -- unchanged
    |
quiz.js
  VocabularyQuiz
  +-- generateQuiz() -> calls QuestionFactory
  +-- submitAnswer() -> dispatch reward by q.mode
  +-- wrongWords -> persist to localStorage
    |
question-factory.js (NEW)
  QuestionFactory
  +-- createQuestion(word, mode, level, eligibleWords)
  +--   PIT_BOARD    -> word -> English definition
  +--   RADIO_MSG    -> fill-in-blank sentence
  +--   STRATEGY     -> definition -> pick word
  +--   QUALIFYING   -> phonetic -> pick word
  +-- DistractorEngine
  +--   generate(word, mode, eligibleWords) -> [3 distractors]
  +--   sameCategory priority
  +--   similarLevel priority
  +--   formSimilar pool (L4+)
```

## 6. Reward Table

| Mode | Reward | Rationale |
|------|--------|-----------|
| PIT_BOARD | +10 Fuel Coins | Basic, low barrier |
| RADIO_MSG | +10 Fuel Coins | Sentence context helps |
| STRATEGY | +15 Fuel Coins | Reverse thinking, harder |
| QUALIFYING | +15 Gear Coins | Phonetic recognition is advanced |
| LAP_REVIEW | +5 Gear Coins | Review incentive |
| Combo (3 correct) | +5 Gear Coins | Unchanged |

## 7. Word Bank Expansion Plan

| Source | Count | Priority |
|--------|-------|----------|
| Shanghai Ed. Grade 6 (existing) | 240 | Done |
| F1 Racing vocabulary | 80 | P0 (Sprint B) |
| Shanghai Ed. Grade 5 review | 120 | P1 |
| Shanghai Ed. Grade 7 preview | 60 | P2 |
| **Total** | **500** | |

F1 word categories: f1-racing, f1-strategy, f1-parts, f1-actions, f1-media

## 8. Sprint Plan

### Sprint A: Engine + Factory (no UI change)
- A1: Create question-factory.js with 4 createQuestion() methods
- A2: Implement DistractorEngine (sameCategory, sameLevel, formSimilar)
- A3: Rewrite quiz.js generateQuiz() for mixed-mode distribution
- A4: Rewrite quiz.js submitAnswer() for mode-based rewards
- A5: Remove questionType property and Simple/Complex logic
- A6: Add question-factory.js script tag to index.html

### Sprint B: F1 Word Bank
- B1: Write 80 F1 racing words in words-f1.json
- B2: Modify loadWords() for multi-file merge
- B3: Fine-grained F1 category taxonomy

### Sprint C: Quiz UI Rewrite
- C1: Remove Simple/Complex toggle buttons
- C2: Implement showQuizQuestion() branch rendering by q.mode
- C3: PIT_BOARD rendering (word + phonetic, English definition options)
- C4: RADIO_MSG rendering (blanked sentence, word options)
- C5: STRATEGY rendering (definition prompt, word options)
- C6: QUALIFYING rendering (phonetic prompt, word options)
- C7: Mode label UI (top-left of each question)
- C8: Progress bar with mode icon sequence

### Sprint D: Wrong Word Book + Adaptive Review
- D1: wrongWords persist to localStorage
- D2: Home page wrong word count display
- D3: LAP_REVIEW mode implementation
- D4: Remove word after 2 consecutive correct reviews
- D5: "Review Wrong Words" button on Home page

### Sprint E: Difficulty Ladder + Testing
- E1-E3: Per-mode difficulty tiering
- E4: maxLevel selector on Home page
- E5: Integration testing all mode x level combos

## 9. Dependencies

```
Sprint A (engine) --> Sprint C (UI) --> Sprint E (difficulty)
       |                                      ^
       +--> Sprint B (words) ----------------+
       +--> Sprint D (wrong words) ----------+
```

## 10. Risks

| Risk | Mitigation |
|------|------------|
| Word form mismatch in fill-in-blank (destroyed vs destroy) | Pre-process: add sentenceBlank field marking original form |
| Poor distractor quality | DistractorEngine: same category + same level + form-similar pool |
| Performance with 320 words | Two JSON files < 50KB each, total < 100KB, no issue |
| Canvas quiz UI still shows old text | Sprint A-D only change HTML quiz page; Canvas UI synced later |
