export class ControlHints {
  #container;

  constructor(parentContainer) {
    this.#createUI(parentContainer);
  }

  update(data) {
    // 可选：根据状态显示/隐藏某些提示
  }

  destroy() {
    this.#container?.remove();
  }

  #createUI(parent) {
    this.#container = document.createElement('div');
    this.#container.className = 'control-hints';
    this.#container.style.cssText = `
      position: absolute;
      bottom: 150px;
      left: 12px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      line-height: 1.8;
    `;

    this.#container.innerHTML = `
      <div>[R] Reset</div>
      <div>[C] Camera</div>
      <div>[Tab] Pause</div>
    `;

    parent.appendChild(this.#container);
  }
}
