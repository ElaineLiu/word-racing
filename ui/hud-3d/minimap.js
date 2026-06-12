export class Minimap {
  #container;
  #canvas;
  #ctx;
  #track;
  #trackOutline;

  constructor(parentContainer, track) {
    this.#track = track;
    this.#createUI(parentContainer);
    this.#precomputeTrackOutline();
  }

  update(data) {
    this.#render(data.playerPos, data.aiPositions);
  }

  destroy() {
    this.#container?.remove();
  }

  #createUI(parent) {
    this.#container = document.createElement('div');
    this.#container.className = 'minimap-container';
    this.#container.style.cssText = `
      position: absolute;
      bottom: 12px;
      right: 120px;
      width: 160px;
      height: 120px;
    `;

    this.#canvas = document.createElement('canvas');
    this.#canvas.width = 160;
    this.#canvas.height = 120;
    this.#container.appendChild(this.#canvas);
    this.#ctx = this.#canvas.getContext('2d');

    parent.appendChild(this.#container);
  }

  #precomputeTrackOutline() {
    // 预计算赛道轮廓（优化性能）
    const centerline = this.#track.centerline;
    if (!centerline || centerline.length === 0) return;

    const bounds = this.#computeBounds(centerline);
    this.#trackOutline = { centerline, bounds };
  }

  #computeBounds(points) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    points.forEach(p => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });

    return { minX, maxX, minY, maxY };
  }

  #render(playerPos, aiPositions) {
    const ctx = this.#ctx;
    const W = 160, H = 120;

    // 清空画布
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, W, H);

    if (!this.#trackOutline) return;

    const { centerline, bounds } = this.#trackOutline;
    const { minX, maxX, minY, maxY } = bounds;

    // 缩放比例
    const scaleX = (W - 10) / (maxX - minX);
    const scaleY = (H - 10) / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);

    // 偏移量（居中）
    const offsetX = (W - (maxX - minX) * scale) / 2;
    const offsetY = (H - (maxY - minY) * scale) / 2;

    // 绘制赛道轮廓
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < centerline.length; i += 8) {
      const p = centerline[i];
      const sx = offsetX + (p.x - minX) * scale;
      const sy = offsetY + (p.y - minY) * scale;

      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }

    ctx.closePath();
    ctx.stroke();

    // 起点/终点标记
    const startPos = centerline[0];
    const startX = offsetX + (startPos.x - minX) * scale;
    const startY = offsetY + (startPos.y - minY) * scale;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(startX, startY, 3, 0, Math.PI * 2);
    ctx.fill();

    // AI 对手位置
    const aiColors = ['#ff4444', '#44ff44', '#4444ff'];
    aiPositions.forEach((pos, i) => {
      const ax = offsetX + (pos.x - minX) * scale;
      const ay = offsetY + (pos.y - minY) * scale;
      ctx.fillStyle = aiColors[i] || '#4FC3F7';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ax, ay, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // 玩家位置
    const px = offsetX + (playerPos.x - minX) * scale;
    const py = offsetY + (playerPos.y - minY) * scale;
    ctx.fillStyle = '#E53935';
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
