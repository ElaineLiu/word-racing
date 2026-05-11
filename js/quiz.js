/**
 * VocabularyQuiz - 词汇答题模块
 * 加载词汇库、生成选择题、判定答案、记录错题
 */
class VocabularyQuiz {
    constructor() {
        this.words = [];
        this.currentQuiz = [];
        this.currentIndex = 0;
        this.score = 0;
        this.totalAnswered = 0;
        this.correctCount = 0;
        this.wrongWords = [];
        this.loaded = false;
    }

    async loadWords(url = 'data/words.json') {
        try {
            const resp = await fetch(url);
            const data = await resp.json();
            this.words = data.words;
            this.loaded = true;
        } catch (e) {
            console.error('Failed to load words:', e);
            // Fallback: use a small built-in word set
            this.words = this._getFallbackWords();
            this.loaded = true;
        }
    }

    _getFallbackWords() {
        return [
            { id: 1, word: 'speed', meaning_cn: '速度', level: 2, category: 'abstract' },
            { id: 2, word: 'brake', meaning_cn: '刹车', level: 2, category: 'transport' },
            { id: 3, word: 'champion', meaning_cn: '冠军', level: 3, category: 'sports' },
            { id: 4, word: 'engine', meaning_cn: '引擎', level: 3, category: 'transport' },
            { id: 5, word: 'trophy', meaning_cn: '奖杯', level: 2, category: 'objects' },
            { id: 6, word: 'dangerous', meaning_cn: '危险的', level: 2, category: 'adjectives' },
            { id: 7, word: 'track', meaning_cn: '赛道', level: 2, category: 'places' },
            { id: 8, word: 'practice', meaning_cn: '练习', level: 2, category: 'actions' },
            { id: 9, word: 'accident', meaning_cn: '事故', level: 3, category: 'abstract' },
            { id: 10, word: 'celebrate', meaning_cn: '庆祝', level: 3, category: 'actions' },
        ];
    }

    /**
     * Generate a quiz with 'count' questions
     * @param {number} count - number of questions
     * @param {number} maxLevel - max difficulty level (default 3 for GE=3)
     * @returns {Array} quiz questions
     */
    generateQuiz(count = 5, maxLevel = 3) {
        const eligible = this.words.filter(w => w.level <= maxLevel);
        if (eligible.length < 4) return [];

        // Shuffle and pick 'count' words
        const shuffled = [...eligible].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(count, shuffled.length));

        this.currentQuiz = selected.map(word => {
            // Generate 3 distractors (different meanings)
            const others = eligible.filter(w => w.meaning_cn !== word.meaning_cn);
            const distractors = [...others]
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(w => w.meaning_cn);

            // Create options: correct + 3 distractors, shuffled
            const options = [word.meaning_cn, ...distractors].sort(() => Math.random() - 0.5);
            const correctIndex = options.indexOf(word.meaning_cn);

            return {
                word: word.word,
                correctMeaning: word.meaning_cn,
                meaningEn: word.meaning_en || '',
                sentence: word.sentence || '',
                options: options,
                correctIndex: correctIndex,
                level: word.level,
                answered: false,
                correct: false
            };
        });

        this.currentIndex = 0;
        this.score = 0;
        this.totalAnswered = 0;
        this.correctCount = 0;
        this.wrongWords = [];

        return this.currentQuiz;
    }

    /**
     * Get current question (null if quiz done)
     */
    getCurrentQuestion() {
        if (this.currentIndex < this.currentQuiz.length) {
            return this.currentQuiz[this.currentIndex];
        }
        return null;
    }

    /**
     * Submit an answer for the current question
     * @param {number} selectedIndex - index of selected option
     * @returns {object} { correct: boolean, question: object }
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
        } else {
            this.wrongWords.push({
                word: question.word,
                meaning: question.correctMeaning
            });
        }

        // Move to next question after a short delay
        setTimeout(() => {
            this.currentIndex++;
        }, 800);

        return question;
    }

    /**
     * Check if the quiz is complete
     */
    isComplete() {
        return this.currentIndex >= this.currentQuiz.length;
    }

    /**
     * Get quiz results
     */
    getResults() {
        return {
            total: this.currentQuiz.length,
            correct: this.correctCount,
            wrong: this.wrongWords,
            score: this.score,
            nitroCharges: this.correctCount, // 1 nitro per correct answer
            accuracy: this.totalAnswered > 0
                ? Math.round((this.correctCount / this.totalAnswered) * 100)
                : 0
        };
    }

}
