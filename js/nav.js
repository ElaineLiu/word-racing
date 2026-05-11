/**
 * NavManager - 多页面导航管理器
 * 职责：页面切换、状态保持、导航按钮高亮
 */
class NavManager {
    constructor(game) {
        this.game = game;
        this.currentPage = 'home';

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * 初始化导航
     */
    init() {
        // Bind navigation button clicks
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.switchPage(page);
            });
        });

        // Default show home page
        this.switchPage('home');
    }

    /**
     * Switch page
     * @param {string} pageName - page name (home/quiz/shop/race)
     */
    switchPage(pageName) {
        // 1. Hide all pages
        const pages = document.querySelectorAll('.page');
        pages.forEach(p => p.classList.remove('active'));

        // 2. Show target page
        const targetPage = document.getElementById(`page-${pageName}`);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // 3. Update navigation button states
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageName);
        });

        // 4. Handle special page logic
        if (pageName === 'race') {
            // Race page: start game loop
            if (this.game.state !== 'RACING' && this.game.state !== 'COUNTDOWN') {
                this.game.state = 'RACING';
                // Don't call continueToRace() here, let user click START RACE
            }
            // Ensure game loop is running
            if (!this.game.animationId) {
                this.game._startLoop();
            }
        } else if (pageName === 'quiz') {
            // Quiz page: start quiz
            if (this.game.state !== 'QUIZ') {
                this.game.state = 'QUIZ';
                this.game.startNewQuiz();
            }
        } else if (pageName === 'shop') {
            // Shop page: show shop
            this.game.state = 'SHOP';
        }

        // 5. Update current page
        this.currentPage = pageName;

        // 6. Update home page stats
        if (pageName === 'home') {
            this.updateHomeStats();
        }

        console.log(`[NavManager] Switched to page: ${pageName}`);
    }

    /**
     * Update home page stats
     */
    updateHomeStats() {
        const homeCoins = document.getElementById('home-coins');
        const homeFuel = document.getElementById('home-fuel');
        const homeNitro = document.getElementById('home-nitro');

        if (homeCoins) homeCoins.textContent = this.game.coins;
        if (homeFuel) homeFuel.textContent = Math.round(this.game.fuel);
        if (homeNitro) homeNitro.textContent = this.game.nitroCharges;
    }
}

// Export
window.NavManager = NavManager;
