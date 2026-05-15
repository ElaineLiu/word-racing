/**
 * QuestionFactory - Question generation engine for Word Racing v2.0
 * Supports 4 question modes: PIT_BOARD, RADIO_MSG, STRATEGY, QUALIFYING
 * Plus adaptive LAP_REVIEW that reuses the 4 modes for wrong words.
 *
 * Phase 1.2 - Converted to ES6 module
 */

export class DistractorEngine {
    /**
     * Generate quality distractors for a question.
     * Priority: same category > same level > form-similar
     *
     * @param {object} targetWord - The correct word object
     * @param {string} mode - Question mode (determines what the options look like)
     * @param {Array} eligibleWords - Pool of words to pick distractors from
     * @param {number} count - Number of distractors (default 3)
     * @returns {Array} Array of distractor option strings
     */
    static generate(targetWord, mode, eligibleWords, count = 3, useChinese = false) {
        const others = eligibleWords.filter(w => w.id !== targetWord.id);

        // Score each candidate for distractor quality (higher = better distractor)
        const scored = others.map(w => {
            let score = 0;
            // Same category = strong distractor (but not same meaning)
            if (w.category === targetWord.category && w.meaning_cn !== targetWord.meaning_cn) score += 10;
            // Same level = appropriate difficulty
            if (w.level === targetWord.level) score += 5;
            else if (Math.abs(w.level - targetWord.level) === 1) score += 2;
            // Form similarity for L4+ (words that look/sound similar)
            if (targetWord.level >= 4) {
                score += DistractorEngine._formSimilarity(targetWord.word, w.word) * 3;
            }
            // Add randomness to avoid predictable patterns
            score += Math.random() * 3;
            return { word: w, score };
        });

        scored.sort((a, b) => b.score - a.score);

        // Pick top candidates, ensuring no duplicate meanings
        const usedMeanings = new Set([targetWord.meaning_cn]);
        const distractors = [];

        for (const item of scored) {
            if (distractors.length >= count) break;
            // For PIT_BOARD and STRATEGY, avoid same-meaning options
            if (mode === 'PIT_BOARD' || mode === 'STRATEGY') {
                if (usedMeanings.has(item.word.meaning_cn)) continue;
                usedMeanings.add(item.word.meaning_cn);
            }
            // For RADIO_MSG and QUALIFYING, avoid same-word options (case-insensitive)
            if (mode === 'RADIO_MSG' || mode === 'QUALIFYING') {
                const wordLower = item.word.word.toLowerCase();
                if (distractors.some(d => d.toLowerCase() === wordLower)) continue;
            }
            distractors.push(DistractorEngine._extractOption(item.word, mode, useChinese));
        }

        // Fallback: if not enough, fill from remaining
        if (distractors.length < count) {
            for (const item of scored) {
                if (distractors.length >= count) break;
                const opt = DistractorEngine._extractOption(item.word, mode, useChinese);
                if (!distractors.includes(opt) && opt !== DistractorEngine._extractOption(targetWord, mode, useChinese)) {
                    distractors.push(opt);
                }
            }
        }

        return distractors.slice(0, count);
    }

    /**
     * Extract the option text from a word based on the question mode.
     * @param {object} word - Word object
     * @param {string} mode - Question mode
     * @param {boolean} useChinese - If true, PIT_BOARD returns Chinese meaning
     */
    static _extractOption(word, mode, useChinese = false) {
        switch (mode) {
            case 'PIT_BOARD':
                return useChinese ? word.meaning_cn : (word.meaning_en || word.meaning_cn);
            case 'RADIO_MSG':
                return word.word;
            case 'STRATEGY':
                return word.word;
            case 'QUALIFYING':
                return word.word;
            default:
                return useChinese ? word.meaning_cn : (word.meaning_en || word.meaning_cn);
        }
    }

    /**
     * Calculate form similarity between two words (0-1 scale).
     * Looks at: prefix overlap, suffix overlap, length similarity, letter overlap.
     */
    static _formSimilarity(a, b) {
        if (!a || !b) return 0;
        a = a.toLowerCase();
        b = b.toLowerCase();
        if (a === b) return 0; // Same word, not useful as distractor

        let sim = 0;
        // Prefix overlap (first 3-4 chars)
        const prefixLen = Math.min(4, a.length, b.length);
        let prefixMatch = 0;
        for (let i = 0; i < prefixLen; i++) {
            if (a[i] === b[i]) prefixMatch++;
        }
        sim += (prefixMatch / prefixLen) * 0.5;

        // Length similarity
        const lenDiff = Math.abs(a.length - b.length);
        sim += Math.max(0, 1 - lenDiff * 0.2) * 0.2;

        // Letter overlap
        const setA = new Set(a.split(''));
        const setB = new Set(b.split(''));
        let overlap = 0;
        for (const c of setA) {
            if (setB.has(c)) overlap++;
        }
        sim += (overlap / Math.max(setA.size, setB.size)) * 0.3;

        return sim;
    }
}


export class QuestionFactory {
    /**
     * Mode definitions with labels, icons, and reward structures.
     */
    static MODES = {
        PIT_BOARD: {
            key: 'PIT_BOARD',
            label: 'PIT BOARD',
            icon: 'PB',    // Will be styled as CSS in Sprint C
            reward: { fuel: 10, gear: 0 },
            description: 'Read the word, pick the right meaning'
        },
        RADIO_MSG: {
            key: 'RADIO_MSG',
            label: 'RADIO',
            icon: 'RM',
            reward: { fuel: 10, gear: 0 },
            description: 'Fill in the blank in the sentence'
        },
        STRATEGY: {
            key: 'STRATEGY',
            label: 'STRATEGY',
            icon: 'SC',
            reward: { fuel: 15, gear: 0 },
            description: 'Read the definition, pick the right word'
        },
        QUALIFYING: {
            key: 'QUALIFYING',
            label: 'QUALIFYING',
            icon: 'QF',
            reward: { fuel: 0, gear: 15 },
            description: 'Read the phonetic, pick the right word'
        },
        LAP_REVIEW: {
            key: 'LAP_REVIEW',
            label: 'LAP REVIEW',
            icon: 'LR',
            reward: { fuel: 0, gear: 5 },
            description: 'Review a word you got wrong'
        }
    };

    /**
     * Create a question object for the given word and mode.
     *
     * @param {object} word - The target word object from words.json
     * @param {string} mode - One of PIT_BOARD, RADIO_MSG, STRATEGY, QUALIFYING
     * @param {number} level - Current difficulty level cap
     * @param {Array} eligibleWords - Pool of words for distractor generation
     * @param {boolean} useChinese - If true, PIT_BOARD options use Chinese, STRATEGY prompt uses Chinese
     * @returns {object} Unified question data structure
     */
    static createQuestion(word, mode, level, eligibleWords, useChinese = false) {
        const modeDef = QuestionFactory.MODES[mode];
        if (!modeDef) {
            console.error('Unknown question mode:', mode);
            return null;
        }

        // Generate distractors
        const distractors = DistractorEngine.generate(word, mode, eligibleWords, 3, useChinese);

        // Build correct answer based on mode
        const correctAnswer = QuestionFactory._getCorrectAnswer(word, mode, useChinese);

        // Assemble options: correct + 3 distractors, shuffled
        const allOptions = [correctAnswer, ...distractors];
        const shuffled = QuestionFactory._shuffleWithIndex(allOptions);
        const correctIndex = shuffled.correctIndex;
        const options = shuffled.options;

        // Build question-specific fields
        const question = {
            mode: mode,
            modeLabel: modeDef.label,
            modeIcon: modeDef.icon,
            reward: { ...modeDef.reward },
            wordId: word.id,
            level: word.level,
            options: options,
            correctIndex: correctIndex,
            correctWord: word.word,
            correctMeaning: word.meaning_cn,
            meaningEn: word.meaning_en || '',
            answered: false,
            correct: false
        };

        // Mode-specific fields
        switch (mode) {
            case 'PIT_BOARD':
                question.prompt = word.word;
                question.promptSub = word.phonetic || '';
                question.sentence = word.sentence || '';
                question.sentenceBlank = false;
                // Chinese mode: label tells kid it's "word→meaning"
                if (useChinese) {
                    question.modeLabel = '词→义';
                }
                break;

            case 'RADIO_MSG':
                question.prompt = QuestionFactory._blankSentence(word);
                question.promptSub = word.meaning_en || word.meaning_cn;
                question.sentence = word.sentence || '';
                question.sentenceBlank = true;
                // Store the original sentence with the word visible (for answer reveal)
                question.sentenceOriginal = word.sentence || '';
                break;

            case 'STRATEGY':
                if (useChinese) {
                    // Chinese mode: prompt = Chinese meaning, options = English words
                    question.prompt = word.meaning_cn;
                    question.promptSub = '';
                    question.modeLabel = '义→词';
                } else {
                    question.prompt = word.meaning_en || word.meaning_cn;
                    question.promptSub = word.phonetic || '';
                    // At L1-2, show Chinese definition as prompt instead
                    if (level <= 2 && word.meaning_cn) {
                        question.promptCn = word.meaning_cn;
                    }
                }
                question.sentence = word.sentence || '';
                question.sentenceBlank = false;
                break;

            case 'QUALIFYING':
                question.prompt = word.phonetic || '';
                question.promptSub = ''; // At L1-2, could add Chinese hint
                question.sentence = '';
                question.sentenceBlank = false;
                if (level <= 2 && word.meaning_cn) {
                    question.promptCn = word.meaning_cn;
                }
                break;
        }

        return question;
    }

    /**
     * Create a LAP_REVIEW question from a wrong word.
     * Uses one of the 4 base modes (preferring a different mode than the original error).
     *
     * @param {object} wrongWord - { word, meaning, wordId, lastMode }
     * @param {Array} allWords - Full word bank
     * @param {number} level - Current difficulty level cap
     * @param {Array} eligibleWords - Pool for distractors
     * @param {boolean} useChinese - If true, use Chinese options for review
     * @returns {object|null} Question object or null if word not found
     */
    static createReviewQuestion(wrongWord, allWords, level, eligibleWords, useChinese = false) {
        // Find the full word object
        const word = allWords.find(w =>
            w.word === wrongWord.word ||
            w.id === wrongWord.wordId
        );
        if (!word) return null;

        // Pick a mode different from the one the user got wrong
        let chosenMode;
        if (useChinese) {
            // In basic mode, only use PIT_BOARD or STRATEGY for review
            chosenMode = Math.random() < 0.5 ? 'PIT_BOARD' : 'STRATEGY';
        } else {
            const baseModes = ['PIT_BOARD', 'RADIO_MSG', 'STRATEGY', 'QUALIFYING'];
            if (wrongWord.reviewCount >= 2) {
                chosenMode = baseModes[Math.floor(Math.random() * 2) + 2]; // STRATEGY or QUALIFYING
            } else {
                chosenMode = baseModes[Math.floor(Math.random() * 2)]; // PIT_BOARD or RADIO_MSG
            }
        }

        const question = QuestionFactory.createQuestion(word, chosenMode, level, eligibleWords, useChinese);
        if (question) {
            // Override to LAP_REVIEW mode for reward tracking
            question.mode = 'LAP_REVIEW';
            question.modeLabel = 'LAP REVIEW';
            question.modeIcon = 'LR';
            question.reward = { fuel: 0, gear: 5 };
            question.isReview = true;
        }
        return question;
    }

    /**
     * Get the correct answer text based on mode.
     * @param {object} word - Word object
     * @param {string} mode - Question mode
     * @param {boolean} useChinese - If true, PIT_BOARD returns Chinese meaning
     */
    static _getCorrectAnswer(word, mode, useChinese = false) {
        switch (mode) {
            case 'PIT_BOARD':
                return useChinese ? word.meaning_cn : (word.meaning_en || word.meaning_cn);
            case 'RADIO_MSG':
                return word.word;
            case 'STRATEGY':
                return word.word;
            case 'QUALIFYING':
                return word.word;
            default:
                return word.meaning_cn;
        }
    }

    /**
     * Create a fill-in-the-blank sentence from the word's example sentence.
     * Handles both exact matches and variant forms (destroyed vs destroy).
     */
    static _blankSentence(word) {
        const sentence = word.sentence || '';
        if (!sentence) return `______ (${word.word})`;

        const target = word.word;

        // Try exact match first (case-insensitive, word boundary)
        const exactRegex = new RegExp('\\b(' + target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b', 'i');
        const exactMatch = sentence.match(exactRegex);
        if (exactMatch) {
            return sentence.replace(exactRegex, '______');
        }

        // Try variant forms: word + common suffixes
        const suffixes = ['s', 'es', 'ed', 'ing', 'er', 'est', 'tion', 'ment', 'ly', 'ful', 'ness', 'ous', 'ive', 'al', 'ity'];
        for (const suffix of suffixes) {
            const variant = target + suffix;
            const variantRegex = new RegExp('\\b(' + variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b', 'i');
            if (variantRegex.test(sentence)) {
                return sentence.replace(variantRegex, '______');
            }
        }

        // Try stem match (first 4+ chars)
        if (target.length >= 4) {
            const stem = target.slice(0, Math.min(target.length - 1, 5));
            const stemRegex = new RegExp('\\b(' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*)\\b', 'i');
            const stemMatch = sentence.match(stemRegex);
            if (stemMatch) {
                return sentence.replace(stemRegex, '______');
            }
        }

        // Fallback: show the word in brackets after blank
        return sentence + '  ______ (' + target + ')';
    }

    /**
     * Shuffle options and track the correct answer index.
     */
    static _shuffleWithIndex(options) {
        const indexed = options.map((opt, i) => ({ opt, isCorrect: i === 0 }));
        // Fisher-Yates shuffle
        for (let i = indexed.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
        }
        return {
            options: indexed.map(item => item.opt),
            correctIndex: indexed.findIndex(item => item.isCorrect)
        };
    }
}

// Module export (ES6)
// window.QuestionFactory and window.DistractorEngine are set in main.js for backward compatibility
