export class TopBar {
  #container;
  #rankPanel;
  #timePanel;
  #bestLapDisplay;

  constructor(parentContainer) {
    this.#createUI(parentContainer);
  }

  update(data) {
    this.updateRank(data.rank, data.totalCars);
    this.updateTime(data.raceTime);
    this.updateBestLap(data.bestLapTime);
    this.updateLap(data.lap, data.totalLaps);
  }

  updateRank(rank, total) {
    const ordinal = this.#formatOrdinal(rank);
    this.#rankPanel.querySelector('.value').textContent = `${ordinal} / ${total}`;
  }

  updateTime(ms) {
    this.#timePanel.querySelector('.value').textContent = this.#formatTime(ms);
  }

  updateBestLap(ms) {
    if (ms < Infinity) {
      this.#bestLapDisplay.textContent = 'BEST  ' + this.#formatTime(ms);
      this.#bestLapDisplay.style.display = 'block';
    }
  }

  updateLap(current, total) {
    // 可选：显示圈数进度
  }

  destroy() {
    this.#container?.remove();
  }

  #createUI(parent) {
    this.#container = document.createElement('div');
    this.#container.className = 'hud-top-bar';
    this.#container.innerHTML = `
      <div class="hud-panel" id="hud-rank">
        <div class="label">RANK</div>
        <div class="value">1st / 4</div>
      </div>
      <div class="hud-panel" id="hud-time">
        <div class="label">TIME</div>
        <div class="value">00:00.00</div>
      </div>
      <div class="best-lap" style="display: none;">BEST  00:00.00</div>
      <div class="hud-panel" id="hud-score">
        <div class="label">SCORE</div>
        <div class="value">0</div>
      </div>
    `;

    parent.appendChild(this.#container);

    this.#rankPanel = this.#container.querySelector('#hud-rank');
    this.#timePanel = this.#container.querySelector('#hud-time');
    this.#bestLapDisplay = this.#container.querySelector('.best-lap');
  }

  #formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }

  #formatOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
}
