/**
 * VocabularyQuiz - Vocabulary quiz module (v2.1)
 * Supports 4 question modes via QuestionFactory:
 *   PIT_BOARD (word->definition), RADIO_MSG (fill-in-blank),
 *   STRATEGY (definition->word), QUALIFYING (phonetic->word)
 * Plus LAP_REVIEW for adaptive review of wrong words.
 * Mixed-mode distribution per round, mode-based rewards.
 *
 * Phase 1.2 - Converted to ES6 module
 * Phase 1.5 - Added dynamic wordset loading
 */
import { QuestionFactory } from './question-factory.js';
import { QUIZ } from '../config/game-config.js';
import { loadWordSet, loadLastSelection, getAvailableWordSets, getCurrentWordSetInfo, switchWordSet } from '../quiz/wordset-loader.js';

export class VocabularyQuiz {
    constructor() {
        this.words = [];
        this.currentQuiz = [];
        this.currentIndex = 0;
        this.score = 0;
        this.totalAnswered = 0;
        this.correctCount = 0;
        this.wrongWords = [];         // { word, meaning, wordId, lastMode, reviewCount, correctStreak }
        this.fuelCoinsEarned = 0;
        this.gearCoinsEarned = 0;
        this.combo = 0;               // consecutive correct answers
        this.maxLevel = 3;            // default difficulty cap
        this.quizMode = 'basic';      // 'basic' = Chinese options only, 'challenge' = all 5 modes
        this.loaded = false;
        this.currentWordSetId = null;

        // Track wrong words in current quiz for re-testing
        this.currentQuizWrong = [];  // { wordData, mode }

        // Load persisted wrong words
        this._loadWrongWords();
    }

    // ==================== WordSet Management ====================

    /**
     * Get available wordsets
     * @returns {Promise<Array>}
     */
    async getAvailableWordSets() {
        return await getAvailableWordSets();
    }

    /**
     * Switch to a different wordset
     * @param {string} wordSetId
     */
    async switchWordSet(wordSetId) {
        this.words = await switchWordSet(wordSetId);
        this.currentWordSetId = wordSetId;
        this.loaded = this.words.length > 0;
        return this.loaded;
    }

    /**
     * Get current wordset info
     * @returns {Promise<Object|null>}
     */
    async getWordSetInfo() {
        return await getCurrentWordSetInfo();
    }

    // ==================== Wrong Word Persistence ====================

    _loadWrongWords() {
        try {
            const data = localStorage.getItem('wr_wrongWords');
            this.wrongWords = data ? JSON.parse(data) : [];
        } catch (e) {
            this.wrongWords = [];
        }
    }

    _saveWrongWords() {
        try {
            localStorage.setItem('wr_wrongWords', JSON.stringify(this.wrongWords.slice(0, QUIZ.MAX_WRONG_WORDS)));
        } catch (e) {}
    }

    /**
     * Remove a word from wrong list after consecutive correct answers.
     */
    _markWordCorrect(wordText) {
        const entry = this.wrongWords.find(w => w.word === wordText);
        if (!entry) return;
        entry.correctStreak = (entry.correctStreak || 0) + 1;
        if (entry.correctStreak >= QUIZ.CORRECT_STREAK_TO_REMOVE) {
            this.wrongWords = this.wrongWords.filter(w => w.word !== wordText);
        }
        this._saveWrongWords();
    }

    /**
     * Record or update a wrong word entry.
     */
    _markWordWrong(word, meaning, wordId, mode) {
        const existing = this.wrongWords.find(w => w.word === word);
        if (existing) {
            existing.lastMode = mode;
            existing.reviewCount = (existing.reviewCount || 0) + 1;
            existing.correctStreak = 0; // Reset streak on wrong
        } else {
            this.wrongWords.push({
                word: word,
                meaning: meaning,
                wordId: wordId,
                lastMode: mode,
                reviewCount: 0,
                correctStreak: 0
            });
        }
        this._saveWrongWords();
    }

    // ==================== Word Loading ====================

    /**
     * Load words from specified wordset or use last selection
     * @param {string} [wordSetId] - Optional wordset ID to load
     */
    async loadWords(wordSetId = null) {
        try {
            if (wordSetId) {
                this.words = await loadWordSet(wordSetId);
                this.currentWordSetId = wordSetId;
            } else {
                // Load last selection or default
                const lastSelection = await loadLastSelection();
                this.words = await loadWordSet(lastSelection);
                this.currentWordSetId = lastSelection;
            }
            this.loaded = this.words.length > 0;
        } catch (e) {
            console.error('Failed to load words:', e);
            this.words = this._getFallbackWords();
            this.loaded = true;
        }
    }

    _getFallbackWords() {
        return [
            { id: 1, word: 'speed', meaning_cn: '速度', meaning_en: 'how fast something goes', phonetic: '/spiːd/', sentence: 'The speed of the car was amazing.', level: 2, category: 'abstract' },
            { id: 2, word: 'brake', meaning_cn: '刹车', meaning_en: 'to make a vehicle stop', phonetic: '/breɪk/', sentence: 'The driver hit the brake before the corner.', level: 2, category: 'transport' },
            { id: 3, word: 'champion', meaning_cn: '冠军', meaning_en: 'the winner of a competition', phonetic: '/ˈtʃæmpiən/', sentence: 'The champion lifted the trophy.', level: 3, category: 'sports' },
            { id: 4, word: 'engine', meaning_cn: '引擎', meaning_en: 'the part that makes a machine go', phonetic: '/ˈendʒɪn/', sentence: 'The engine roared as the race started.', level: 3, category: 'transport' },
            { id: 5, word: 'trophy', meaning_cn: '奖杯', meaning_en: 'a prize you win', phonetic: '/ˈtroʊfi/', sentence: 'The trophy was made of gold.', level: 2, category: 'objects' },
            { id: 6, word: 'dangerous', meaning_cn: '危险的', meaning_en: 'not safe, could cause harm', phonetic: '/ˈdeɪndʒərəs/', sentence: 'Racing in the rain is dangerous.', level: 2, category: 'adjectives' },
            { id: 7, word: 'track', meaning_cn: '赛道', meaning_en: 'a path for racing', phonetic: '/træk/', sentence: 'The track was wet after the rain.', level: 2, category: 'places' },
            { id: 8, word: 'practice', meaning_cn: '练习', meaning_en: 'to do something again to get better', phonetic: '/ˈpræktɪs/', sentence: 'The driver practices on the track every morning.', level: 2, category: 'actions' },
            { id: 9, word: 'accident', meaning_cn: '事故', meaning_en: 'something bad that happens by chance', phonetic: '/ˈæksɪdənt/', sentence: 'There was an accident on the first lap.', level: 3, category: 'abstract' },
            { id: 10, word: 'celebrate', meaning_cn: '庆祝', meaning_en: 'to do something fun because of good news', phonetic: '/ˈselɪbreɪt/', sentence: 'The team celebrated the victory.', level: 3, category: 'actions' },
        ];
    }

    // ==================== Quiz Generation ====================

    /**
     * Generate a quiz with mixed question modes.
     *
     * Basic mode:  only PIT_BOARD (word→Chinese) + STRATEGY (Chinese→word), alternating
     * Challenge mode: 2 PIT_BOARD + 1 RADIO_MSG + 1 STRATEGY + 1 QUALIFYING
     *   If wrongWords exist, 1 slot replaced by LAP_REVIEW
     *
     * @param {number} count - Number of questions (default 5)
     * @param {number} maxLevel - Max difficulty level (default 3)
     * @returns {Array} Quiz questions
     */
    generateQuiz(count = 5, maxLevel = 3) {
        this.maxLevel = maxLevel;
        const eligible = this.words.filter(w => w.level <= maxLevel);
        if (eligible.length < 4) return [];

        const useChinese = (this.quizMode === 'basic');

        // --- Mode distribution ---
        let modeDistribution = this._planModes(count);

        // --- Select words ---
        const usedIds = new Set();
        const selectedWords = [];

        // If we have a LAP_REVIEW slot, pick from wrongWords first
        const reviewSlotIndex = modeDistribution.indexOf('LAP_REVIEW');
        if (reviewSlotIndex >= 0 && this.wrongWords.length > 0) {
            const sorted = [...this.wrongWords].sort((a, b) => (a.reviewCount || 0) - (b.reviewCount || 0));
            const wrongEntry = sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];
            const fullWord = this.words.find(w => w.word === wrongEntry.word || w.id === wrongEntry.wordId);
            if (fullWord) {
                selectedWords[reviewSlotIndex] = { word: fullWord, isReview: true, wrongEntry };
                usedIds.add(fullWord.id);
            } else {
                modeDistribution[reviewSlotIndex] = useChinese ? 'PIT_BOARD' : 'PIT_BOARD';
            }
        } else if (reviewSlotIndex >= 0) {
            modeDistribution[reviewSlotIndex] = useChinese ? 'PIT_BOARD' : 'PIT_BOARD';
        }

        // Fill remaining slots with random words
        const shuffledEligible = [...eligible].sort(() => Math.random() - 0.5);
        let wordIndex = 0;
        for (let i = 0; i < count; i++) {
            if (selectedWords[i]) continue;
            while (wordIndex < shuffledEligible.length && usedIds.has(shuffledEligible[wordIndex].id)) {
                wordIndex++;
            }
            if (wordIndex < shuffledEligible.length) {
                selectedWords[i] = { word: shuffledEligible[wordIndex], isReview: false };
                usedIds.add(shuffledEligible[wordIndex].id);
                wordIndex++;
            }
        }

        // --- Generate questions ---
        this.currentQuiz = [];
        for (let i = 0; i < count; i++) {
            const item = selectedWords[i];
            if (!item) continue;

            let question;
            if (item.isReview && item.wrongEntry) {
                question = QuestionFactory.createReviewQuestion(
                    item.wrongEntry, this.words, maxLevel, eligible, useChinese
                );
            } else {
                question = QuestionFactory.createQuestion(
                    item.word, modeDistribution[i], maxLevel, eligible, useChinese
                );
            }

            if (question) {
                this.currentQuiz.push(question);
            }
        }

        // --- Reset state ---
        this.currentIndex = 0;
        this.score = 0;
        this.totalAnswered = 0;
        this.correctCount = 0;
        this.fuelCoinsEarned = 0;
        this.gearCoinsEarned = 0;
        this.combo = 0;
        this.currentQuizWrong = [];  // Clear wrong words for this quiz

        return this.currentQuiz;
    }

    /**
     * Plan the mode distribution for a quiz round.
     * Basic mode: alternating PIT_BOARD (word→Chinese) + STRATEGY (Chinese→word)
     * Challenge mode: 2 PIT_BOARD + 1 RADIO_MSG + 1 STRATEGY + 1 QUALIFYING (+ LAP_REVIEW if wrong words)
     * @param {number} count
     * @returns {Array} Array of mode strings
     */
    _planModes(count) {
        const modes = [];

        // --- Basic mode: only PIT_BOARD + STRATEGY with Chinese options ---
        if (this.quizMode === 'basic') {
            for (let i = 0; i < count; i++) {
                modes.push(i % 2 === 0 ? 'PIT_BOARD' : 'STRATEGY');
            }
            // Shuffle so the order isn't always the same
            modes.sort(() => Math.random() - 0.5);
            return modes;
        }

        // --- Challenge mode: full 5-mode mix ---
        const hasWrongWords = this.wrongWords.length > 0;

        if (count <= 2) {
            for (let i = 0; i < count; i++) modes.push('PIT_BOARD');
            if (hasWrongWords && count >= 2) modes[1] = 'LAP_REVIEW';
            return modes;
        }

        const baseDistribution = [
            'PIT_BOARD',
            'RADIO_MSG',
            'PIT_BOARD',
            'STRATEGY',
            'QUALIFYING'
        ];

        if (hasWrongWords) {
            baseDistribution[2] = 'LAP_REVIEW';
        }

        for (let i = 0; i < count; i++) {
            modes.push(baseDistribution[i % baseDistribution.length]);
        }

        // Shuffle but keep LAP_REVIEW not first
        const reviewSlots = [];
        const regularSlots = [];
        modes.forEach((m, i) => {
            if (m === 'LAP_REVIEW') reviewSlots.push(i);
            else regularSlots.push(i);
        });

        const regularModes = regularSlots.map(i => modes[i]).sort(() => Math.random() - 0.5);
        regularSlots.forEach((slotIdx, i) => {
            modes[slotIdx] = regularModes[i];
        });

        if (reviewSlots.length > 0 && reviewSlots[0] === 0) {
            const swapIdx = regularSlots.find(i => i > 0);
            if (swapIdx !== undefined) {
                [modes[0], modes[swapIdx]] = [modes[swapIdx], modes[0]];
            }
        }

        return modes;
    }

    // ==================== Question Access ====================

    /**
     * Get current question (null if quiz done)
     */
    getCurrentQuestion() {
        if (this.currentIndex < this.currentQuiz.length) {
            return this.currentQuiz[this.currentIndex];
        }
        return null;
    }

    // ==================== Answer Submission ====================

    /**
     * Submit an answer for the current question.
     * Rewards are determined by the question's mode.
     *
     * @param {number} selectedIndex - Index of selected option
     * @returns {object|null} The question with answered/correct flags set
     */
    submitAnswer(selectedIndex) {
        const question = this.getCurrentQuestion();
        if (!question || question.answered) return null;

        question.answered = true;
        question.selected = selectedIndex;
        question.correct = selectedIndex === question.correctIndex;

        this.totalAnswered++;

        if (question.correct) {
            this.correctCount++;
            this.score += 50;
            this.combo++;

            // Mode-based rewards (fallback for old-format questions)
            const reward = question.reward || { fuel: 10, gear: 0 };
            this.fuelCoinsEarned += reward.fuel || 0;
            this.gearCoinsEarned += reward.gear || 0;

            // Combo bonus: every 3 consecutive correct = 5 gear coins
            if (this.combo > 0 && this.combo % 3 === 0) {
                this.gearCoinsEarned += 5;
            }

            // If this was a review question and the word was in wrongWords, track it
            if (question.isReview || question.mode === 'LAP_REVIEW') {
                this._markWordCorrect(question.correctWord || question.word);
            }
        } else {
            this.combo = 0;

            // Record wrong word (fallback for old-format questions)
            this._markWordWrong(
                question.correctWord || question.word,
                question.correctMeaning || question.meaning,
                question.wordId || 0,
                question.mode || 'PIT_BOARD'
            );

            // Add wrong word to end of quiz for re-testing
            // Only if not already a retry
            if (!question.isRetry) {
                const wordData = this.words.find(w => w.id === question.wordId || w.word === question.correctWord);
                if (wordData) {
                    this.currentQuizWrong.push({
                        wordData,
                        mode: question.mode
                    });
                }
            }
        }

        // Move to next question after a short delay
        setTimeout(() => {
            this.currentIndex++;
        }, 800);

        return question;
    }

    // ==================== Quiz Status ====================

    /**
     * Check if the quiz is complete
     * If there are wrong words to retry, add them to the quiz first
     */
    isComplete() {
        // Check if we've reached the end of current quiz
        if (this.currentIndex < this.currentQuiz.length) {
            return false;
        }

        // Check if there are wrong words to retry
        if (this.currentQuizWrong.length > 0) {
            // Add wrong words to quiz for re-testing
            this._addRetryQuestions();
            return false;
        }

        return true;
    }

    /**
     * Add retry questions for wrong words
     */
    _addRetryQuestions() {
        const eligible = this.words.filter(w => w.level <= this.maxLevel);
        const useChinese = this.quizMode === 'basic';

        for (const item of this.currentQuizWrong) {
            // Create a new question for this word
            const question = QuestionFactory.createQuestion(
                item.wordData,
                item.mode || 'PIT_BOARD',
                this.maxLevel,
                eligible,
                useChinese
            );

            if (question) {
                question.isRetry = true;  // Mark as retry question
                question.modeLabel = '🔄 RETRY';
                this.currentQuiz.push(question);
            }
        }

        // Clear the wrong words list
        this.currentQuizWrong = [];
    }

    /**
     * Get quiz results
     */
    getResults() {
        return {
            score: this.score,
            correctCount: this.correctCount,
            totalQuestions: this.currentQuiz.length,
            fuelCoinsEarned: this.fuelCoinsEarned,
            gearCoinsEarned: this.gearCoinsEarned,
            nitroCharges: this.correctCount, // backward compatibility
            wrong: this.wrongWords.filter(w => this.currentQuiz.some(q => (q.correctWord || q.word) === w.word)),
            accuracy: this.totalAnswered > 0
                ? Math.round((this.correctCount / this.totalAnswered) * 100)
                : 0
        };
    }

    /**
     * Get wrong word count for UI display
     */
    getWrongWordCount() {
        return this.wrongWords.length;
    }
}
