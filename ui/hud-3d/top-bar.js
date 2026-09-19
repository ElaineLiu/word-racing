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
    this.updateLap(data.lap, data.totalLaps, data.lapTimes);
    this.updateScore(data.score);
  }

  updateRank(rank, total) {
    const ordinal = this.#formatOrdinal(rank);
    this.#rankPanel.querySelector('.value').textContent = `${ordinal} / ${total}`;
  }

  updateTime(ms) {
    this.#timePanel.querySelector('.value').textContent = this.#formatTime(ms);
  }

  updateBestLap(ms) {
    if (ms && ms < Infinity) {
      this.#bestLapDisplay.textContent = 'BEST  ' + this.#formatTime(ms);
      this.#bestLapDisplay.style.display = 'block';
    } else {
      this.#bestLapDisplay.style.display = 'none';
    }
  }

  updateLap(completed, total, lapTimes = []) {
    const lapPanel = this.#container.querySelector('#hud-lap .value');
    const lapList = this.#container.querySelector('.lap-times');
    if (lapPanel) lapPanel.textContent = `${Math.min(completed + 1, total)} / ${total}`;
    if (lapList) {
      lapList.innerHTML = lapTimes.map((time, index) => (
        `<div>LAP ${index + 1}&nbsp;&nbsp;${this.#formatTime(time)}</div>`
      )).join('');
      lapList.style.display = lapTimes.length ? 'block' : 'none';
    }
  }

  updateScore(score) {
    const scorePanel = this.#container.querySelector('#hud-score .value');
    if (scorePanel) {
      scorePanel.textContent = score || 0;
    }
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
      <div class="hud-panel" id="hud-lap">
        <div class="label">LAP</div>
        <div class="value">1 / 1</div>
        <div class="lap-times" style="display: none;"></div>
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
