export class NitroDisplay {
  #container;

  constructor(parentContainer) {
    this.#createUI(parentContainer);
  }

  update(data) {
    const nitro = data.nitro;
    this.#updateDots(nitro.charges, nitro.active);
    this.#updateProgressBar(nitro.progress);
  }

  destroy() {
    this.#container?.remove();
  }

  #createUI(parent) {
    this.#container = document.createElement('div');
    this.#container.className = 'nitro-display';
    this.#container.style.cssText = `
      position: absolute;
      bottom: 12px;
      right: 12px;
      width: 100px;
      height: 88px;
      background: rgba(13, 17, 23, 0.82);
      border-radius: 8px;
      padding: 8px;
    `;

    this.#container.innerHTML = `
      <div class="label" style="color: rgba(255,255,255,0.5); font-size: 11px; margin-bottom: 4px;">NITRO</div>
      <div class="nitro-dots" style="display: flex; gap: 8px; margin-bottom: 8px;">
        <div class="dot" style="width: 12px; height: 12px; border-radius: 50%; background: #333;"></div>
        <div class="dot" style="width: 12px; height: 12px; border-radius: 50%; background: #333;"></div>
        <div class="dot" style="width: 12px; height: 12px; border-radius: 50%; background: #333;"></div>
        <div class="dot" style="width: 12px; height: 12px; border-radius: 50%; background: #333;"></div>
        <div class="dot" style="width: 12px; height: 12px; border-radius: 50%; background: #333;"></div>
      </div>
      <div class="nitro-progress" style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px;">
        <div class="nitro-bar" style="width: 0%; height: 100%; background: #FF6D00; border-radius: 2px;"></div>
      </div>
    `;

    parent.appendChild(this.#container);
  }

  #updateDots(charges, active) {
    const dots = this.#container.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
      const filled = i < charges;
      dot.style.background = filled ? '#FF6D00' : '#333';
      dot.style.boxShadow = filled ? '0 0 8px #FF6D00' : 'none';
    });
  }

  #updateProgressBar(progress) {
    const bar = this.#container.querySelector('.nitro-bar');
    bar.style.width = `${progress * 100}%`;
  }
}
