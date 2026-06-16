/**
 * AchievementPanel - 成就列表面板组件
 *
 * Phase 3.5: 显示所有成就及其解锁进度（UC-04）。
 */

export class AchievementPanel {
  #learningController;
  #panel;
  #closeBtn;
  #list;

  constructor(learningController) {
    this.#learningController = learningController;
  }

  /**
   * 初始化：绑定按钮和渲染列表
   */
  init() {
    this.#panel = document.getElementById('achievement-panel');
    this.#closeBtn = document.getElementById('achievement-panel-close');
    this.#list = document.getElementById('achievement-list');

    // 绑定所有成就按钮（首页、Report页面、Quiz完成页面）
    const triggerBtns = [
      document.getElementById('achievement-btn-home'),
      document.getElementById('achievement-btn-report'),
      document.getElementById('achievement-btn'),
    ];

    triggerBtns.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => this.show());
      }
    });

    if (this.#closeBtn) {
      this.#closeBtn.addEventListener('click', () => this.hide());
    }

    this.render();
  }

  show() {
    if (this.#panel) {
      this.#panel.style.display = 'block';
      this.render();
    }
  }

  hide() {
    if (this.#panel) {
      this.#panel.style.display = 'none';
    }
  }

  render() {
    if (!this.#list) return;

    const achievements = this.#learningController.getAchievements();

    if (achievements.length === 0) {
      this.#list.innerHTML = '<div class="achievement-empty">No achievements yet. Complete practice to unlock your first reward.</div>';
      return;
    }

    this.#list.innerHTML = '';

    // 已解锁的排前面
    const sorted = [...achievements].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return b.unlocked ? 1 : -1;
      return 0;
    });

    sorted.forEach(ach => {
      const div = document.createElement('div');
      div.className = `achievement-item ${ach.unlocked ? 'unlocked' : ''}`;

      const icon = ach.unlocked ? '🏆' : '🔒';
      const progressHtml = ach.progress
        ? `<div class="achievement-progress">
             <div class="achievement-progress-bar" style="width: ${(ach.progress.current / ach.progress.target) * 100}%"></div>
             <div class="achievement-progress-text">${ach.progress.current}/${ach.progress.target}</div>
           </div>`
        : '';

      div.innerHTML = `
        <div class="achievement-header">
          <span class="achievement-icon">${icon}</span>
          <div class="achievement-info">
            <div class="achievement-name">${ach.name}</div>
            <div class="achievement-desc">${ach.description}</div>
          </div>
        </div>
        ${progressHtml}
      `;

      this.#list.appendChild(div);
    });
  }
}
