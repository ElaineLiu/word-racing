/**
 * NavManager - 多页面导航管理器
 * 职责：页面切换、状态保持、导航按钮高亮
 *
 * Phase 1.2 - Converted to ES6 module
 */
import { GAME } from '../config/game-config.js';

export class NavManager {
    constructor(game) {
        this.game = game;
        this.currentPage = 'home';
        this.navBtns = [];

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.navBtns = document.querySelectorAll('.nav-btn');
        const btns = this.navBtns;
        for (let i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', () => {
                const page = btns[i].dataset.page;
                this.switchPage(page);
            });
        }

        this.switchPage('home');
    }

    switchPage(pageName) {
        // 切换到比赛页面前检查
        if (pageName === 'race') {
            if (this.game.fuel <= 0) {
                alert('Insufficient fuel! Buy fuel in the shop first.');
                pageName = 'home';
            } else if (![GAME.STATES.COUNTDOWN, GAME.STATES.RACING, GAME.STATES.RESULTS].includes(this.game.state)) {
                // 比赛未开始，初始化比赛状态
                this.game.continueToRace();
            }
        }

        const pages = document.querySelectorAll('.page');
        for (let i = 0; i < pages.length; i++) {
            pages[i].classList.remove('active');
        }

        const targetPage = document.getElementById('page-' + pageName);
        if (targetPage) {
            targetPage.classList.add('active');
        }

        const btns = this.navBtns;
        for (let i = 0; i < btns.length; i++) {
            const isActive = btns[i].dataset.page === pageName;
            if (isActive) {
                btns[i].classList.add('active');
            } else {
                btns[i].classList.remove('active');
            }
        }

        // 不在这里操作 game.state —— 状态由 game.js / index.html 控制
        // 只做页面切换后的 UI 更新

        this.currentPage = pageName;

        if (pageName === 'home') {
            this.updateHomeStats();
        } else if (pageName === 'shop') {
            // 渲染商店 UI
            if (window.updateShop) window.updateShop();
        } else if (pageName === 'race') {
            // 确保 canvas 尺寸正确（等待浏览器 reflow）
            requestAnimationFrame(() => {
                this.game._resizeCanvas();
            });
        }

        console.log('[NavManager] Switched to page: ' + pageName);
    }

    updateHomeStats() {
        const homeCoins = document.getElementById('home-coins');
        const homeFuel = document.getElementById('home-fuel');
        const homeNitro = document.getElementById('home-nitro');
        const homeFuelCoins = document.getElementById('home-fuel-coins');
        const homeGearCoins = document.getElementById('home-gear-coins');

        if (homeCoins) homeCoins.textContent = this.game.coins;
        if (homeFuel) homeFuel.textContent = Math.round(this.game.fuel);
        if (homeNitro) homeNitro.textContent = this.game.nitroCharges;
        if (homeFuelCoins) homeFuelCoins.textContent = this.game.fuelCoins;
        if (homeGearCoins) homeGearCoins.textContent = this.game.gearCoins;
    }
}

// Module export (ES6)
// window.NavManager is set in main.js for backward compatibility
