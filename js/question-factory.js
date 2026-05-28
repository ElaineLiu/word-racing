/**
 * QuestionFactory - Question generation engine for Word Racing v2.0
 * Supports 4 question modes: PIT_BOARD, RADIO_MSG, STRATEGY, QUALIFYING
 * Plus adaptive LAP_REVIEW that reuses the 4 modes for wrong words.
 *
 * Phase 1.2 - Converted to ES6 module
 * Phase 4.1 - Uses Mode Registry for data-driven mode definitions
 */

import { QuizModes, getMode, getReviewMode, getBaseModes } from '../quiz/mode-registry.js';

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
        // Filter out same id AND same word (to handle duplicate entries in word bank)
        const targetWordLower = targetWord.word.toLowerCase();
        const others = eligibleWords.filter(w =>
            w.id !== targetWord.id &&
            w.word.toLowerCase() !== targetWordLower
        );

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
        const usedWords = new Set([targetWordLower]);
        const distractors = [];

        for (const item of scored) {
            if (distractors.length >= count) break;

            const wordLower = item.word.word.toLowerCase();

            // 所有模式：避免相同的单词（包括与正确答案相同）
            if (usedWords.has(wordLower)) continue;

            // PIT_BOARD 和 STRATEGY：避免相同含义
            if (mode === 'PIT_BOARD' || mode === 'STRATEGY') {
                if (usedMeanings.has(item.word.meaning_cn)) continue;
                usedMeanings.add(item.word.meaning_cn);
            }

            usedWords.add(wordLower);
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
     * Get mode definition (delegates to registry)
     */
    static getMode(key) {
        return getMode(key);
    }

    /**
     * Get all modes (delegates to registry)
     */
    static get MODES() {
        return QuizModes;
    }

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
        const modeDef = getMode(mode);
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
            modeLabel: useChinese && modeDef.labelCn ? modeDef.labelCn : modeDef.label,
            modeIcon: modeDef.icon,
            reward: { ...modeDef.reward },
            wordId: word.id,
            level: word.level,
            options: options,
            correctIndex: correctIndex,
            correctWord: word.word,
            correctMeaning: word.meaning_cn,
            meaningEn: word.meaning_en || '',
            phonetic: word.phonetic || '',
            sentence: word.sentence || '',
            sentence_cn: word.sentence_cn || '',
            answered: false,
            correct: false
        };

        // Mode-specific fields (using promptType from registry)
        QuestionFactory._buildModeSpecificFields(question, word, modeDef, level, useChinese);

        return question;
    }

    /**
     * Build mode-specific question fields based on registry definition
     */
    static _buildModeSpecificFields(question, word, modeDef, level, useChinese) {
        const mode = modeDef.key;

        switch (mode) {
            case 'PIT_BOARD':
                question.prompt = word.word;
                question.promptSub = word.phonetic || '';
                question.sentence = word.sentence || '';
                question.sentenceBlank = modeDef.sentenceBlank;
                break;

            case 'RADIO_MSG':
                question.prompt = QuestionFactory._blankSentence(word);
                question.promptSub = word.meaning_en || word.meaning_cn;
                question.sentence = word.sentence || '';
                question.sentenceBlank = modeDef.sentenceBlank;
                question.sentenceOriginal = word.sentence || '';
                break;

            case 'STRATEGY':
                // STRATEGY always shows definition -> pick word, so sentence should always blank the answer
                if (useChinese) {
                    question.prompt = word.meaning_cn;
                    question.promptSub = '';
                } else {
                    question.prompt = word.meaning_en || word.meaning_cn;
                    question.promptSub = word.phonetic || '';
                    if (level <= 2 && word.meaning_cn) {
                        question.promptCn = word.meaning_cn;
                    }
                }
                // Always blank the answer word in sentence for STRATEGY mode
                question.sentence = QuestionFactory._blankSentence(word);
                question.sentenceBlank = true;
                break;

            case 'QUALIFYING':
                // 音标题：显示音标 + 中文意思，让用户选单词
                question.prompt = word.phonetic || '';
                question.promptSub = word.meaning_cn || '';  // 显示中文意思
                question.sentence = '';
                question.sentenceBlank = modeDef.sentenceBlank;
                break;
        }
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

        // Pick a mode using the registry
        const chosenMode = getReviewMode(wrongWord.reviewCount || 0, useChinese);

        const question = QuestionFactory.createQuestion(word, chosenMode, level, eligibleWords, useChinese);
        if (question) {
            // Keep original mode for rendering, mark as review for rewards
            const reviewDef = getMode('LAP_REVIEW');
            question.originalMode = chosenMode;  // Preserve for rendering
            question.isReview = true;
            question.modeLabel = '[Review] ' + question.modeLabel;
            question.reward = { ...reviewDef.reward };
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
