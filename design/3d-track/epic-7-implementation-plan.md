# Epic 7: HUD与UI系统实施计划

## 📋 Context

**目标**: 创建完整的 3D 比赛 HUD 系统，包括顶部状态栏（排名/圈数/计时/最快圈）、底部速度表/小地图/氮气、左侧功能按钮提示、屏幕反馈效果（速度感）。

**背景**:
- Epic 5 已完成，3D 比赛系统可正常运行
- 现有 HUD 使用 Canvas 2D 渲染（`render-system.js`）
- Car3D 已有 `getGear()` 和 `getRPM()` 方法
- RaceSession3D 提供排名数据（`finalRank`, `ranking`）
- Track3D 有 `centerline` 数据可用于小地图
- 2D 模式保持现有 Canvas HUD（不改动）
- 3D 模式使用 HTML 覆盖层 HUD（更灵活、易动画）
- 避免阻塞 3D 渲染（pointer-events: none）
- 保持 60fps 性能

**探索发现**:
- 现有 HUD 数据组装在 `Game._render()` 中（第 396-410 行）
- 排名系统已实现 `rank:changed` 事件
- 小地图已有基础实现（简化采样）
- 档位/转速计算已完成

---

## 🎯 复杂度评估

### 建议：拆分为 3 个迭代阶段

**理由**:
1. **UI 组件独立性强** - 速度表、小地图、状态栏可并行开发
2. **视觉可选性** - 速度感效果（FOV/速度线）可独立迭代，不影响核心功能
3. **测试分层** - 每个 UC 可独立验证，降低回归风险

**拆分策略**: 核心功能优先 → 增强视觉效果 → 性能优化

---

## 📐 Phase 1: 核心 HUD 组件（基础功能）

**目标**: 实现基础 HUD 布局和核心组件

### 1.1 设计 HUD 整体布局

**文件**: `ui/hud-3d/hud-manager.js`（新建）

**布局设计**:

```
┌─────────────────────────────────────────────┐
│ [RANK]           [TIME]           [SCORE]   │ ← 顶部状态栏
│  2nd / 4        01:23.45          1200      │
│                  BEST 00:45.12               │
│ [EXIT RACE]                                 │
├─────────────────────────────────────────────┤
│                                             │
│                                             │
│              3D 渲染区域                     │
│                                             │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│                    ┌──────────┐             │
│  [R] Reset         │ 小地图    │   [NITRO]   │ ← 底部区域
│  [C] Camera        │  ○ ○ ○   │   ● ● ○ ○ ○ │
│  [Tab] Pause       └──────────┘             │
│  ┌─────────┐                               │
│  │  3      │  ← 档位                        │
│  │ 185     │  ← 速度                        │
│  │ km/h    │                                │
│  │ [RPM]   │  ← 转速弧                      │
│  └─────────┘                               │
└─────────────────────────────────────────────┘
```

**接口设计**:

```javascript
import { Events } from '../../core/event-bus.js';

export class HUD3DManager {
  #eventBus;
  #raceSession;
  #game;
  #container;
  #components = {};
  #updateInterval = null;

  constructor(eventBus, raceSession, game) {
    this.#eventBus = eventBus;
    this.#raceSession = raceSession;
    this.#game = game;
  }

  /**
   * 挂载 HUD 到页面
   */
  mount() {
    this.#createContainer();

    // 初始化组件
    this.#components.topBar = new TopBar(this.#container);
    this.#components.speedometer = new Speedometer(this.#container);
    this.#components.minimap = new Minimap(this.#container, this.#raceSession.track);
    this.#components.nitroDisplay = new NitroDisplay(this.#container);
    this.#components.controlHints = new ControlHints(this.#container);

    // 订阅事件
    this.#subscribeToEvents();

    // 启动轮询更新（速度/转速需要每帧更新）
    this.#startUpdateLoop();
  }

  /**
   * 更新所有组件
   */
  update() {
    const playerCar = this.#raceSession.playerCar;
    const data = {
      // 排名数据
      rank: this.#raceSession.playerRank,
      totalCars: this.#raceSession.cars.length,

      // 时间数据
      raceTime: this.#game.raceTime,
      bestLapTime: playerCar.bestLapTime,
      lap: playerCar.lap,
      totalLaps: this.#game.totalLaps,

      // 速度数据
      speed: playerCar.getDisplaySpeed(),
      gear: playerCar.getGear(),
      rpm: playerCar.getRPM(),

      // 氮气数据
      nitro: playerCar.getNitroStatus(),

      // 小地图数据
      playerPos: { x: playerCar.x, y: playerCar.z },
      aiPositions: this.#raceSession.aiCars.map(car => ({ x: car.x, y: car.z })),
    };

    Object.values(this.#components).forEach(c => c.update(data));
  }

  /**
   * 销毁 HUD
   */
  destroy() {
    this.#stopUpdateLoop();
    Object.values(this.#components).forEach(c => c.destroy());
    this.#container?.remove();
    this.#container = null;
  }

  // ==================== 内部方法 ====================

  #createContainer() {
    this.#container = document.createElement('div');
    this.#container.id = 'hud-3d-container';
    this.#container.className = 'hud-3d-container';
    this.#container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      font-family: Arial, sans-serif;
    `;
    document.body.appendChild(this.#container);
  }

  #subscribeToEvents() {
    // 排名变化时立即更新
    this.#eventBus.on('rank:changed', ({ ranking, playerRank }) => {
      this.#components.topBar?.updateRank(playerRank, ranking.length);
    });
  }

  #startUpdateLoop() {
    // 每帧更新速度/转速等实时数据
    const loop = () => {
      if (this.#container) {
        this.update();
        this.#updateInterval = requestAnimationFrame(loop);
      }
    };
    this.#updateInterval = requestAnimationFrame(loop);
  }

  #stopUpdateLoop() {
    if (this.#updateInterval) {
      cancelAnimationFrame(this.#updateInterval);
      this.#updateInterval = null;
    }
  }
}
```

### 1.2 实现顶部状态栏

**文件**: `ui/hud-3d/top-bar.js`（新建）

**接口设计**:

```javascript
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
    // 组件移除时清理
  }

  #createUI(parent) {
    const html = `
      <div class="hud-top-bar">
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
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    this.#container = wrapper.firstElementChild;
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
```

**CSS 文件**: `css/hud-3d.css`（新建）

```css
/* ==================== HUD 3D Container ==================== */
.hud-3d-container * {
  pointer-events: none;
  user-select: none;
}

/* ==================== Top Bar ==================== */
.hud-top-bar {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.hud-panel {
  background: rgba(13, 17, 23, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 12px;
  min-width: 110px;
}

.hud-panel .label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  margin-bottom: 4px;
}

.hud-panel .value {
  color: #FFD700;
  font-size: 20px;
  font-weight: bold;
}

.best-lap {
  position: absolute;
  top: 66px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(0, 200, 83, 0.8);
  font-size: 11px;
  text-align: center;
}
```

### 1.3 测试策略

**测试文件**: `tests/ui/hud-3d-manager.test.js`

**测试用例**:
1. `mount()` 后应创建容器和所有组件
2. `update()` 应调用所有组件的 update 方法
3. `destroy()` 应移除容器和停止更新循环
4. 排名变化时应立即更新 TopBar

**验证标准**:
- ✅ HUD 容器正确创建
- ✅ 所有组件正确初始化
- ✅ 数据更新流畅（60fps）
- ✅ 无内存泄漏（destroy 后容器移除）

---

## 🎨 Phase 2: 速度表与小地图（核心可视化）

**目标**: 实现圆形速度表和增强小地图

### 2.1 实现圆形速度表（含档位/转速）

**文件**: `ui/hud-3d/speedometer.js`（新建）

**接口设计**:

```javascript
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
```

### 2.2 实现增强小地图

**文件**: `ui/hud-3d/minimap.js`（新建）

**接口设计**:

```javascript
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
      ctx.beginPath();
      ctx.arc(ax, ay, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 玩家位置
    const px = offsetX + (playerPos.x - minX) * scale;
    const py = offsetY + (playerPos.y - minY) * scale;
    ctx.fillStyle = '#E53935';
    ctx.fillRect(px - 2, py - 2, 4, 4);
  }
}
```

### 2.3 实现氮气显示

**文件**: `ui/hud-3d/nitro-display.js`（新建）

**接口设计**:

```javascript
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
```

### 2.4 实现控制提示

**文件**: `ui/hud-3d/control-hints.js`（新建）

**接口设计**:

```javascript
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
```

### 2.5 测试策略

**测试文件**:
- `tests/ui/speedometer.test.js`
- `tests/ui/minimap.test.js`

**测试用例（Speedometer）**:
1. 应正确渲染圆形背景
2. RPM 弧线应根据转速值正确变化
3. 档位显示应正确
4. 速度数字应正确显示

**测试用例（Minimap）**:
1. 应正确计算赛道轮廓缩放
2. 玩家位置应正确映射
3. AI 对手位置应正确显示
4. 空数据时应正常处理

---

## 🚀 Phase 3: 视觉效果与优化

**目标**: 添加速度感视觉效果和性能优化

### 3.1 实现速度感视觉效果

**文件**: `ui/hud-3d/speed-effects.js`（新建）

**接口设计**:

```javascript
export class SpeedEffects {
  #eventBus;
  #playerCar;
  #camera;
  #speedLines = [];
  #shakeOffset = { x: 0, y: 0 };

  constructor(eventBus, playerCar, camera) {
    this.#eventBus = eventBus;
    this.#playerCar = playerCar;
    this.#camera = camera;
  }

  update() {
    const speed = this.#playerCar.speed;
    const maxSpeed = this.#playerCar.maxSpeed;
    const speedRatio = Math.abs(speed) / maxSpeed;

    // FOV 拉伸效果（高速时视野变宽）
    this.#updateFOV(speedRatio);

    // 速度线效果
    this.#updateSpeedLines(speedRatio);

    // 震动效果（碰撞时）
    this.#updateShake();
  }

  #updateFOV(speedRatio) {
    // FOV 从 60 度到 75 度随速度变化
    const baseFOV = 60;
    const maxFOV = 75;
    const targetFOV = baseFOV + (maxFOV - baseFOV) * speedRatio;

    this.#camera.fov = targetFOV;
    this.#camera.updateProjectionMatrix();
  }

  #updateSpeedLines(speedRatio) {
    if (speedRatio > 0.7) {
      // 高速时显示速度线
      this.#createSpeedLine();
    }
  }

  #createSpeedLine() {
    // 创建速度线粒子效果
    // 简化实现：可在后续优化
  }

  #updateShake() {
    // 碰撞震动效果（监听碰撞事件）
    // 简化实现：可在后续优化
  }

  dispose() {
    // 清理效果
  }
}
```

### 3.2 性能优化

**优化策略**:

1. **预计算赛道轮廓** - Minimap 在构造函数中预计算缩放数据
2. **节流更新** - 非关键数据（如小地图）降低更新频率（30fps）
3. **Canvas 复用** - 避免每帧创建新 Canvas
4. **requestAnimationFrame** - 使用 RAF 确保流畅渲染

### 3.3 集成到 Game

**文件**: `js/game.js`

**修改**: 在 `_prepareRaceAfterCost()` 中初始化 HUD3DManager

```javascript
async _prepareRaceAfterCost(trackId, trackDef) {
  // ... 现有代码 ...

  if (trackDef.type === '3d') {
    const { RaceSession3D } = await import('../3d/runtime/race-session-3d.js?v=epic7');
    this._raceSession3D = new RaceSession3D({
      trackData: trackDef,
      canvas: this._getThreeCanvas(),
      eventBus: this._eventBus,
      gameState: this._gameState,
      progressTracker: this._progressTracker,
    });

    // 新增：初始化 3D HUD
    const { HUD3DManager } = await import('../ui/hud-3d/hud-manager.js');
    this._hud3DManager = new HUD3DManager(this._eventBus, this._raceSession3D, this);
    this._hud3DManager.mount();
  }

  // ... 现有代码 ...
}
```

**修改**: 在比赛结束时清理 HUD

```javascript
_showResults() {
  // 清理 3D HUD
  if (this._hud3DManager) {
    this._hud3DManager.destroy();
    this._hud3DManager = null;
  }

  // ... 现有代码 ...
}
```

### 3.4 测试策略

**测试文件**: `tests/integration/hud-3d-integration.test.js`

**测试用例**:
1. 3D 比赛启动时应创建 HUD
2. HUD 应正确显示排名、速度、小地图
3. 比赛结束时应销毁 HUD
4. 无内存泄漏

---

## ✅ Verification Plan

### 自动化测试

```bash
# 运行所有测试（必须 100% 通过）
npx vitest run

# 运行特定测试
npx vitest run tests/ui/hud-3d-manager.test.js
npx vitest run tests/ui/speedometer.test.js
npx vitest run tests/ui/minimap.test.js
```

### 手动测试

**使用 test-3d.html**:

1. 启动开发服务器: `npx http-server . -p 3000`
2. 访问 `http://localhost:3000/test-3d.html`
3. 验证：
   - 顶部状态栏正确显示排名、计时
   - 左下角速度表正确显示档位、转速、速度
   - 右下角小地图正确显示赛道轮廓、玩家、AI 对手
   - 氮气显示正确
   - 控制提示显示正确

**使用完整游戏流程**:

1. 选择 3D 赛道
2. 开始比赛
3. 验证 HUD 实时更新
4. 完成比赛，验证结果页面

### 性能验证

**检查帧率**:

```javascript
// 在浏览器控制台
let frameCount = 0;
let lastTime = performance.now();

function countFrames() {
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    console.log(`FPS: ${frameCount}`);
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(countFrames);
}

countFrames();
```

**验证标准**:
- FPS 稳定在 60 左右
- HUD 更新无卡顿
- 无内存泄漏（长时间运行后内存不增长）

---

## 📝 关键文件清单

### 新建文件
- `ui/hud-3d/hud-manager.js` - HUD 总控制器
- `ui/hud-3d/top-bar.js` - 顶部状态栏
- `ui/hud-3d/speedometer.js` - 圆形速度表
- `ui/hud-3d/minimap.js` - 小地图
- `ui/hud-3d/nitro-display.js` - 氮气显示
- `ui/hud-3d/control-hints.js` - 控制提示
- `ui/hud-3d/speed-effects.js` - 速度感效果（可选）
- `css/hud-3d.css` - HUD 样式
- `tests/ui/hud-3d-manager.test.js`
- `tests/ui/speedometer.test.js`
- `tests/ui/minimap.test.js`
- `tests/integration/hud-3d-integration.test.js`

### 修改文件
- `js/game.js` - 集成 HUD3DManager
- `index.html` - 引入 HUD CSS（可选）

---

## ⚠️ Risk Mitigation

### 风险 1: HUD 阻塞 3D 渲染

**对策**:
- 所有 HUD 元素设置 `pointer-events: none`
- 使用 `position: fixed` 脱离文档流
- 避免 HUD 内部复杂 DOM 操作

### 风险 2: 性能问题（60fps 要求）

**对策**:
- 使用 Canvas 而非 SVG 绘制速度表和小地图
- 预计算赛道轮廓（构造时一次性计算）
- 节流非关键更新（小地图 30fps）
- 使用 requestAnimationFrame 确保流畅

### 风险 3: 2D/3D HUD 混淆

**对策**:
- 2D 模式继续使用 `render-system.js` 的 Canvas HUD
- 3D 模式使用 HTML HUD
- 通过 `trackType === '3d'` 判断模式
- 保持代码清晰分离

### 风险 4: 响应式布局问题

**对策**:
- 使用固定像素尺寸（参考现有 HUD）
- 避免百分比布局
- 测试不同分辨率

---

## 🎯 Success Criteria

**Phase 1 完成**:
- ✅ HUD3DManager 实现完成
- ✅ 顶部状态栏正确显示
- ✅ 基础布局完成
- ✅ 测试通过

**Phase 2 完成**:
- ✅ 圆形速度表实现完成
- ✅ 档位/转速可视化正确
- ✅ 小地图正确显示赛道和车辆
- ✅ 氮气显示正确
- ✅ 测试通过

**Phase 3 完成**:
- ✅ 集成到 Game
- ✅ 性能达标（60fps）
- ✅ 无内存泄漏
- ✅ 手动验证通过

**Epic 7 完成**:
- ✅ 所有 Phase 完成
- ✅ 所有测试通过（覆盖率 > 80%）
- ✅ 手动验证完整
- ✅ 无回归问题
- ✅ Git 提交：`feat(epic-7): 3D HUD and UI system`
