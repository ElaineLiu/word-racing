export class Speedometer {
  #container;
  #canvas;
  #ctx;

  constructor(parentContainer) {
    this.#createUI(parentContainer);
  }

  update(data) {
    this.#render(data.speed, data.gear, data.rpm);
  }

  destroy() {
    this.#container?.remove();
  }

  #createUI(parent) {
    this.#container = document.createElement('div');
    this.#container.className = 'speedometer-container';
    this.#container.style.cssText = `
      position: absolute;
      bottom: 12px;
      left: 12px;
      width: 130px;
      height: 130px;
    `;

    this.#canvas = document.createElement('canvas');
    this.#canvas.width = 130;
    this.#canvas.height = 130;
    this.#container.appendChild(this.#canvas);
    this.#ctx = this.#canvas.getContext('2d');

    parent.appendChild(this.#container);
  }

  #render(speed, gear, rpm) {
    const ctx = this.#ctx;
    const x = 65, y = 65, radius = 58;

    // 清空画布
    ctx.clearRect(0, 0, 130, 130);

    // 外圈背景
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // RPM 弧线（270度弧）
    const startAngle = -Math.PI * 0.75;
    const endAngle = Math.PI * 0.75;
    const rpmAngle = startAngle + (rpm / 8000) * (endAngle - startAngle);

    // RPM 背景
    ctx.beginPath();
    ctx.arc(x, y, radius - 8, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // RPM 填充（带颜色渐变）
    const rpmColor = rpm > 6500 ? '#E10600' : rpm > 5000 ? '#FF6D00' : '#00C853';
    ctx.beginPath();
    ctx.arc(x, y, radius - 8, startAngle, rpmAngle);
    ctx.strokeStyle = rpmColor;
    ctx.lineWidth = 6;
    ctx.stroke();

    // 档位显示
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(gear.toString(), x, y - 10);

    // 速度数字
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(speed + ' km/h', x, y + 20);
  }
}
