# Epic 6: 单词泡泡系统实施计划

## 📋 Context

**目标**: 在 3D 赛道上实现单词强化泡泡系统，提供已学未掌握单词的复习机会，记录曝光数据反馈到学习系统，强化记忆但**不破坏核心经济循环**。

**背景**:
- Epic 5 已完成，3D 比赛系统可以正常运行
- 现有学习系统（AdaptiveSelector、ProgressTracker）工作正常
- 核心循环：答题获得货币 → 购买燃油 → 比赛 → 结果 → 答题
- **关键约束**: 单词泡泡只给速度奖励 + 曝光记录，**禁止产出货币**

**探索发现**:
- 单词进度由 `ProgressTracker` 管理（不在 GameState）
- 当前单词进度对象缺少 `exposureCount` 字段
- `Car3D` 已有 `applySpeedBoost(multiplier, duration)` 方法
- `RaceSession3D.getResult()` 已预留 `exposedWords: null` 字段
- EventBus 使用 `domain:action` 命名格式

---

## 🎯 复杂度评估

### 建议：拆分为 4 个迭代阶段

**理由**:
1. **数据层修改影响范围大** - 需要迁移现有用户数据，必须确保无回归
2. **多系统集成点** - WordBubbleManager 需要与 RaceSession3D、GameState、EventBus、ProgressTracker 集成
3. **UI 组件独立性** - WordCardDisplay 可以单独开发和测试
4. **测试要求严格** - 每个阶段都要确保现有测试 100% 通过

**拆分策略**: 按依赖关系从底层到上层递进

---

## 📐 Phase 1: 数据层扩展（底层基础）

**目标**: 扩展单词进度数据结构，支持曝光计数

### 1.1 修改默认进度结构

**文件**: `config/learning-config.js`

**修改**: 在 `createDefaultProgress()` 函数中添加 `exposureCount` 字段

```javascript
export function createDefaultProgress(wordText, wordId = null) {
  return {
    word: wordText,
    wordId: wordId,
    status: MASTERY_STATUS.UNLEARNED,
    simpleCorrect: false,
    complexCorrect: false,
    simpleWrongCount: 0,
    complexWrongCount: 0,
    firstSeenDate: new Date().toISOString().split('T')[0],
    lastSeenDate: new Date().toISOString().split('T')[0],
    masteryDate: null,
    exposureCount: 0,  // 新增：曝光次数
  };
}
```

### 1.2 扩展 ProgressTracker

**文件**: `learning/progress-tracker.js`

**新增方法**:

```javascript
/**
 * 增加单词曝光次数
 * @param {string} wordText - 单词文本
 * @returns {Object} 更新后的状态
 */
incrementExposureCount(wordText) {
  let progress = this.#progress.get(wordText);

  // 如果单词不存在，创建默认进度（虽然理论上不应该出现）
  if (!progress) {
    progress = createDefaultProgress(wordText, null);
    progress.status = MASTERY_STATUS.EXPOSED;
    this.#progress.set(wordText, progress);
  }

  progress.exposureCount = (progress.exposureCount || 0) + 1;
  progress.lastSeenDate = new Date().toISOString().split('T')[0];

  this.#dirty = true;
  return progress;
}
```

**修改数据加载逻辑**:

在 `#load()` 方法中，添加数据迁移逻辑，为旧数据补全 `exposureCount = 0`

```javascript
#load() {
  // ... 现有加载逻辑 ...

  // 数据迁移：为旧数据补全 exposureCount
  for (const [word, progress] of this.#progress.entries()) {
    if (progress.exposureCount === undefined) {
      progress.exposureCount = 0;
    }
  }
}
```

### 1.3 添加事件常量

**文件**: `core/event-bus.js`

**修改**: 在 `Events` 对象中添加新事件

```javascript
export const Events = {
  // ... 现有事件 ...

  // Learning system - 单词进度
  WORD_STATUS_CHANGED: 'learning:word_status_changed',
  WORD_MASTERED: 'learning:word_mastered',
  WORD_FORGOTTEN: 'learning:word_forgotten',
  WORD_EXPOSED: 'word:exposed',  // 新增：单词曝光事件

  // ...
};
```

### 1.4 测试策略

**测试文件**: `tests/progress-tracker.test.js`（扩展现有测试）

**测试用例**:
1. `createDefaultProgress()` 应包含 `exposureCount: 0`
2. `incrementExposureCount()` 应正确增加计数
3. 旧数据加载时应自动补全 `exposureCount = 0`
4. `incrementExposureCount()` 应更新 `lastSeenDate`

**验证标准**:
- ✅ 所有现有 ProgressTracker 测试必须通过
- ✅ 新增测试覆盖率 > 80%
- ✅ 手动验证：localStorage 中旧数据加载后包含 exposureCount

---

## 🎨 Phase 2: 泡泡 3D 模型与管理器

**目标**: 实现泡泡的视觉效果和核心管理逻辑

### 2.1 创建 WordBubbleModel

**文件**: `3d/models/word-bubble-model.js`（新建）

**接口设计**:

```javascript
import * as THREE from 'three';

export class WordBubbleModel {
  #word;         // 单词数据对象
  #mesh;         // Three.js Group
  #collected;    // 是否已被收集

  constructor(word) {
    this.#word = word;
    this.#collected = false;
    this.#createMesh();
  }

  get mesh() { return this.#mesh; }
  get word() { return this.#word; }
  get collected() { return this.#collected; }

  /**
   * 更新动画
   * @param {number} deltaTime - 时间增量
   */
  update(deltaTime) {
    if (this.#collected) return;

    // 缓慢旋转
    this.#mesh.rotation.y += 0.5 * deltaTime;

    // 上下浮动
    const floatOffset = Math.sin(Date.now() * 0.002) * 2;
    this.#mesh.position.y = this.#mesh.userData.baseY + floatOffset;
  }

  /**
   * 标记为已收集
   */
  collect() {
    this.#collected = true;
  }

  /**
   * 清理资源
   */
  dispose() {
    this.#mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
  }

  #createMesh() {
    // 低多边形球体
    const geometry = new THREE.SphereGeometry(15, 8, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x6699FF,
      transparent: true,
      opacity: 0.7,
      emissive: 0x3399FF,
      emissiveIntensity: 0.3,
    });

    const sphere = new THREE.Mesh(geometry, material);

    // 文字纹理（使用 CanvasTexture）
    const textTexture = this.#createTextTexture(this.#word.word);
    const labelGeometry = new THREE.PlaneGeometry(20, 10);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);

    this.#mesh = new THREE.Group();
    this.#mesh.add(sphere);
    this.#mesh.add(label);
    this.#mesh.userData.baseY = 0;
  }

  #createTextTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}
```

### 2.2 创建 WordBubbleManager

**文件**: `3d/systems/word-bubble-manager.js`（新建）

**接口设计**:

```javascript
import * as THREE from 'three';
import { WordBubbleModel } from '../models/word-bubble-model.js';
import { Events } from '../../core/event-bus.js';
import { MASTERY_STATUS } from '../../config/learning-config.js';

export class WordBubbleManager {
  #scene;
  #track;
  #gameState;
  #eventBus;
  #car;
  #progressTracker;
  #bubbles = [];
  #exposedWords = [];

  constructor(scene, track, gameState, eventBus, car, progressTracker) {
    this.#scene = scene;
    this.#track = track;
    this.#gameState = gameState;
    this.#eventBus = eventBus;
    this.#car = car;
    this.#progressTracker = progressTracker;
  }

  /**
   * 生成泡泡
   * @param {Object} track - Track3D 实例
   */
  generateBubbles(track) {
    // 1. 从词库筛选未掌握的单词
    const eligibleWords = this.#selectEligibleWords();
    if (eligibleWords.length === 0) return;

    // 2. 沿赛道随机放置
    const centerline = track.centerline;
    const maxBubbles = Math.min(50, eligibleWords.length);

    for (let i = 0; i < maxBubbles; i++) {
      const word = eligibleWords[i];
      const pointIndex = Math.floor(Math.random() * centerline.length);
      const point = centerline[pointIndex];

      const bubble = new WordBubbleModel(word);
      bubble.mesh.position.set(
        point.x + (Math.random() - 0.5) * 40,
        20 + Math.random() * 10,
        point.z + (Math.random() - 0.5) * 40
      );

      this.#bubbles.push(bubble);
      this.#scene.add(bubble.mesh);
    }
  }

  /**
   * 检测碰撞
   */
  checkCollection() {
    const carPos = new THREE.Vector3(this.#car.x, 0, this.#car.z);

    for (const bubble of this.#bubbles) {
      if (bubble.collected) continue;

      const distance = carPos.distanceTo(bubble.mesh.position);

      if (distance < 20) {
        this.#onBubbleHit(bubble);
      }
    }
  }

  /**
   * 更新动画
   */
  update(deltaTime) {
    for (const bubble of this.#bubbles) {
      if (!bubble.collected) {
        bubble.update(deltaTime);
      }
    }
  }

  /**
   * 获取曝光统计
   */
  getExposureStats() {
    return {
      totalExposed: this.#exposedWords.length,
      words: this.#exposedWords,
    };
  }

  /**
   * 清理资源
   */
  dispose() {
    for (const bubble of this.#bubbles) {
      this.#scene.remove(bubble.mesh);
      bubble.dispose();
    }
    this.#bubbles = [];
  }

  // ==================== 内部方法 ====================

  #selectEligibleWords() {
    // 从 gameState 获取词库
    const wordSet = this.#gameState.get('wordSet') || [];

    // 筛选未掌握的单词
    const eligible = wordSet.filter(wordData => {
      const progress = this.#progressTracker.getStatus(wordData.word);
      if (!progress) return false;

      // 未学习和已掌握的词不生成泡泡
      if (progress.status === MASTERY_STATUS.UNLEARNED) return false;
      if (progress.status === MASTERY_STATUS.MASTERED) return false;

      return true;
    });

    // 按 exposureCount 升序排序（优先曝光少的）
    eligible.sort((a, b) => {
      const progressA = this.#progressTracker.getStatus(a.word);
      const progressB = this.#progressTracker.getStatus(b.word);
      return (progressA?.exposureCount || 0) - (progressB?.exposureCount || 0);
    });

    return eligible;
  }

  #onBubbleHit(bubble) {
    // 1. 标记为已收集
    bubble.collect();

    // 2. 从场景移除
    this.#scene.remove(bubble.mesh);

    // 3. 更新曝光计数
    const progress = this.#progressTracker.incrementExposureCount(bubble.word.word);

    // 4. 记录曝光
    this.#exposedWords.push({
      wordId: bubble.word.id,
      word: bubble.word.word,
      exposureCount: progress.exposureCount,
    });

    // 5. 发射事件
    this.#eventBus.emit(Events.WORD_EXPOSED, {
      wordId: bubble.word.id,
      word: bubble.word.word,
      exposureCount: progress.exposureCount,
      lastSeenAt: progress.lastSeenDate,
    });

    // 6. 给予速度奖励
    this.#car.applySpeedBoost(1.1, 1.0);

    // 7. 清理资源
    bubble.dispose();
  }
}
```

### 2.3 测试策略

**测试文件**:
- `tests/3d/word-bubble-model.test.js`
- `tests/3d/word-bubble-manager.test.js`

**测试用例（WordBubbleModel）**:
1. 构造函数应创建 mesh
2. `update()` 应更新旋转和浮动
3. `collect()` 应标记为已收集
4. `dispose()` 应清理资源

**测试用例（WordBubbleManager）**:
1. `generateBubbles()` 应只生成未掌握单词的泡泡
2. `checkCollection()` 应检测距离 < 20 的碰撞
3. 撞击后应调用 `progressTracker.incrementExposureCount()`
4. 撞击后应发射 `WORD_EXPOSED` 事件
5. 撞击后应调用 `car.applySpeedBoost(1.1, 1.0)`
6. **撞击后不应增加货币**（核心循环保护）
7. `getExposureStats()` 应返回正确的统计数据

**集成测试**:
- 使用真实 ProgressTracker 和 EventBus
- 不能完全 mock（遵循项目约束）

---

## 🖥️ Phase 3: UI 组件与集成

**目标**: 实现单词卡片显示，并集成到比赛系统

### 3.1 创建 WordCardDisplay

**文件**: `ui/word-card-display.js`（新建）

**接口设计**:

```javascript
export class WordCardDisplay {
  #eventBus;
  #container = null;
  #cardElement = null;
  #hideTimer = null;
  #isVisible = false;
  #subscription = null;

  static DEFAULT_OPTIONS = {
    position: 'top-right',
    autoHideDelay: 1500,
    animationDuration: 300,
    zIndex: 350,
  };

  constructor(eventBus, options = {}) {
    this.#eventBus = eventBus;
    this.options = { ...WordCardDisplay.DEFAULT_OPTIONS, ...options };
  }

  /**
   * 挂载到指定容器
   */
  mount(containerSelector = 'body') {
    const parent = document.querySelector(containerSelector);
    if (!parent) return null;

    this.#ensureContainer(parent);
    this.#subscribeToEvents();
    return this.#container;
  }

  /**
   * 销毁组件
   */
  destroy() {
    this.#clearHideTimer();
    if (this.#subscription) {
      this.#subscription();
      this.#subscription = null;
    }
    if (this.#container) {
      this.#container.remove();
      this.#container = null;
    }
  }

  /**
   * 显示单词卡片
   */
  show(wordData) {
    this.#clearHideTimer();
    this.#renderCard(wordData);
    this.#cardElement.classList.remove('hidden');

    if (this.options.autoHideDelay > 0) {
      this.#hideTimer = setTimeout(() => this.hide(), this.options.autoHideDelay);
    }
  }

  /**
   * 隐藏单词卡片
   */
  hide() {
    if (this.#cardElement) {
      this.#cardElement.classList.add('fade-out');
      setTimeout(() => {
        this.#cardElement.classList.add('hidden');
        this.#cardElement.classList.remove('fade-out');
      }, this.options.animationDuration);
    }
  }

  // ==================== 内部方法 ====================

  #ensureContainer(parent) {
    this.#container = document.createElement('div');
    this.#container.id = 'word-card-display';
    this.#container.className = 'word-card-container';
    this.#container.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: ${this.options.zIndex};
      pointer-events: none;
    `;
    parent.appendChild(this.#container);
  }

  #subscribeToEvents() {
    this.#subscription = this.#eventBus.on(Events.WORD_EXPOSED, (data) => {
      // data: { wordId, word, exposureCount, lastSeenAt }
      // 从词库获取完整单词数据
      const wordSet = this.#eventBus.getState?.('wordSet') || [];
      const wordData = wordSet.find(w => w.word === data.word);

      if (wordData) {
        this.show(wordData);
      }
    });
  }

  #renderCard(wordData) {
    if (!this.#cardElement) {
      this.#cardElement = document.createElement('div');
      this.#cardElement.className = 'word-card';
      this.#container.appendChild(this.#cardElement);
    }

    this.#cardElement.innerHTML = `
      <div class="word-card-header">
        <span class="word-card-word">${wordData.word}</span>
        <span class="word-card-phonetic">${wordData.phonetic || ''}</span>
      </div>
      <div class="word-card-meaning">${wordData.zh}</div>
      ${wordData.sentence ? `
        <div class="word-card-sentence">${wordData.sentence}</div>
        ${wordData.sentenceCn ? `<div class="word-card-sentence-cn">${wordData.sentenceCn}</div>` : ''}
      ` : ''}
    `;
  }

  #clearHideTimer() {
    if (this.#hideTimer) {
      clearTimeout(this.#hideTimer);
      this.#hideTimer = null;
    }
  }
}
```

**CSS 文件**: `css/word-card.css`（新建，样式参考探索报告）

### 3.2 集成到 RaceSession3D

**文件**: `3d/runtime/race-session-3d.js`

**修改**:

```javascript
import { WordBubbleManager } from '../systems/word-bubble-manager.js';

export class RaceSession3D {
  #track;
  #playerCar;
  #aiCars;
  #aiControllers;
  #rankingSystem;
  #cameraController;
  #wordBubbleManager;  // 新增
  #progressTracker;    // 新增
  #finishOrder = 0;
  #disposed = false;

  constructor({ trackData, canvas, eventBus, gameState, progressTracker, rendererFactory } = {}) {
    // ... 现有代码 ...

    // 新增：创建 WordBubbleManager
    this.#progressTracker = progressTracker;
    this.#wordBubbleManager = new WordBubbleManager(
      this.#track.scene,
      this.#track,
      gameState,
      eventBus,
      this.#playerCar,
      progressTracker
    );
    this.#wordBubbleManager.generateBubbles(this.#track);
  }

  update(input, deltaTime = 1 / 60, totalLaps = 3) {
    if (this.#disposed) return;

    this.#playerCar.input = { ...input };
    this.#aiControllers.forEach(controller => controller.update(deltaTime));
    this.cars.forEach(car => car.update(this.#track, totalLaps, deltaTime));

    // 新增：检测泡泡碰撞
    this.#wordBubbleManager.checkCollection();

    this.cars.forEach(car => this.#updateRaceProgress(car, totalLaps));
    this.#rankingSystem.update();
    this.#cameraController.update(this.#playerCar);
    this.#track.update(deltaTime);

    // 新增：更新泡泡动画
    this.#wordBubbleManager.update(deltaTime);
  }

  getResult() {
    const ranking = this.#rankingSystem.calculateRanking().map(entry => ({
      rank: entry.rank,
      lap: entry.lap,
      progress: entry.progress ?? 0,
      isPlayer: entry.car.isPlayer === true,
    }));

    return {
      trackType: '3d',
      finalRank: this.#rankingSystem.getPlayerRank(),
      ranking,
      exposedWords: this.#wordBubbleManager.getExposureStats(),  // 修改
    };
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;

    // 新增：清理 WordBubbleManager
    this.#wordBubbleManager.dispose();

    // ... 现有清理代码 ...
  }
}
```

### 3.3 集成到 Game

**文件**: `js/game.js`

**修改**: 在 `_prepareRaceAfterCost()` 中传入 `progressTracker`

```javascript
async _prepareRaceAfterCost(trackId, trackDef) {
  // ... 现有代码 ...

  if (trackDef.type === '3d') {
    const { RaceSession3D } = await import('../3d/runtime/race-session-3d.js?v=epic6');
    this._raceSession3D = new RaceSession3D({
      trackData: trackDef,
      canvas: this._getThreeCanvas(),
      eventBus: this._eventBus,
      gameState: this._gameState,
      progressTracker: this._progressTracker,  // 新增
      ...this._track3DOptions,
    });
  }

  // ... 现有代码 ...
}
```

### 3.4 在页面初始化 WordCardDisplay

**文件**: `main-v2.js`（或相关入口文件）

**修改**: 在 ViewManager 初始化后创建 WordCardDisplay

```javascript
import { WordCardDisplay } from './ui/word-card-display.js';

// ... 现有代码 ...

const wordCardDisplay = new WordCardDisplay(eventBus);
wordCardDisplay.mount('#page-race');
```

### 3.5 测试策略

**测试文件**:
- `tests/ui/word-card-display.test.js`
- `tests/integration/game-3d-integration.test.js`（扩展）

**测试用例（WordCardDisplay）**:
1. `mount()` 后应创建容器
2. `destroy()` 后应移除容器
3. `show()` 应显示单词卡片
4. `hide()` 应隐藏单词卡片
5. 自动隐藏功能测试
6. 订阅 `WORD_EXPOSED` 事件并显示卡片

**集成测试**:
1. 3D 比赛中撞击泡泡应发射 `WORD_EXPOSED` 事件
2. WordCardDisplay 应响应事件并显示卡片
3. `race:finish` 事件应包含 `exposedWords` 数据

---

## 📊 Phase 4: 学习系统集成

**目标**: 让曝光数据影响下次答题选词

### 4.1 修改 AdaptiveSelector

**文件**: `learning/adaptive-selector.js`

**修改**: 在 `#selectNewWords()` 方法中，排序时考虑 `exposureCount`

```javascript
#selectNewWords(maxCount, eligibleWords, usedWordIds, useChinese, preferredMode, modePreference) {
  const questions = [];
  const unlearnedWords = eligibleWords.filter(wordData => {
    const progress = this.#progressTracker.getStatus(wordData.word);
    return !progress || progress.status === MASTERY_STATUS.UNLEARNED;
  });

  // 按难度和曝光次数排序
  const sorted = [...unlearnedWords].sort((a, b) => {
    const progressA = this.#progressTracker.getStatus(a.word);
    const progressB = this.#progressTracker.getStatus(b.word);

    // 优先选择曝光次数多的（但仅限于 exposed 状态）
    const exposureA = progressA?.status === MASTERY_STATUS.EXPOSED ? (progressA.exposureCount || 0) : 0;
    const exposureB = progressB?.status === MASTERY_STATUS.EXPOSED ? (progressB.exposureCount || 0) : 0;

    if (exposureA !== exposureB) return exposureB - exposureA;

    // 其次按难度排序
    return a.level - b.level;
  });

  // ... 现有代码 ...
}
```

### 4.2 测试策略

**测试文件**: `tests/adaptive-selector.test.js`（扩展）

**测试用例**:
1. 选词时应优先选择 `exposureCount > 0` 的单词
2. 曝光优先级不应破坏错词复习优先级
3. 曝光优先级不应破坏检查词优先级
4. 无曝光数据时应按原逻辑选词

**集成测试**: `tests/integration/word-exposure-learning.test.js`

**测试用例**:
1. 完整流程：答题学新词 → 3D 比赛曝光 → 下次答题优先出现
2. 曝光单词答对后应推进 mastery 进度
3. 已掌握单词不应再生成泡泡

---

## ✅ Verification Plan

### 自动化测试

```bash
# 运行所有测试（必须 100% 通过）
npx vitest run

# 运行特定测试
npx vitest run tests/progress-tracker.test.js
npx vitest run tests/3d/word-bubble-manager.test.js
npx vitest run tests/ui/word-card-display.test.js
npx vitest run tests/integration/word-exposure-learning.test.js
```

### 手动测试

**使用 test-3d.html**:

1. 启动开发服务器: `npx http-server . -p 3000`
2. 访问 `http://localhost:3000/test-3d.html`
3. 验证：
   - 赛道上生成 30-50 个单词泡泡
   - 撞击泡泡时：
     - 泡泡消失
     - 屏幕右上角显示单词卡片
     - 赛车获得速度提升（持续 1 秒）
     - 燃油币/齿轮币未增加（核心约束）
   - 调试面板显示曝光统计

**使用完整游戏流程**:

1. 答题学习新词
2. 参加 3D 比赛
3. 撞击已学单词的泡泡
4. 返回答题
5. 验证：
   - 曝光的单词在下次答题时优先出现
   - 答对后推进 mastery 进度
   - 掌握后泡泡不再生成

### 数据验证

**检查 localStorage**:

```javascript
// 在浏览器控制台
const progress = JSON.parse(localStorage.getItem('wr_word_progress'));
console.log(progress);

// 验证：
// 1. 所有单词都有 exposureCount 字段
// 2. 曝光过的单词 exposureCount > 0
// 3. 未曝光的单词 exposureCount = 0
```

---

## 📝 关键文件清单

### 新建文件
- `3d/models/word-bubble-model.js`
- `3d/systems/word-bubble-manager.js`
- `ui/word-card-display.js`
- `css/word-card.css`
- `tests/3d/word-bubble-model.test.js`
- `tests/3d/word-bubble-manager.test.js`
- `tests/ui/word-card-display.test.js`
- `tests/integration/word-exposure-learning.test.js`

### 修改文件
- `config/learning-config.js` - 添加 exposureCount 字段
- `learning/progress-tracker.js` - 添加 incrementExposureCount() 方法
- `core/event-bus.js` - 添加 WORD_EXPOSED 事件
- `3d/runtime/race-session-3d.js` - 集成 WordBubbleManager
- `js/game.js` - 传入 progressTracker
- `learning/adaptive-selector.js` - 选词时考虑 exposureCount
- `main-v2.js` - 初始化 WordCardDisplay

---

## ⚠️ Risk Mitigation

### 风险 1: 数据迁移导致现有用户数据丢失

**对策**:
- 在 `ProgressTracker.#load()` 中添加迁移逻辑
- 为所有旧数据补全 `exposureCount = 0`
- 编写专门的迁移测试

### 风险 2: 曝光逻辑破坏现有选题优先级

**对策**:
- exposureCount 仅影响新词选择（不影响错词复习和检查词）
- 编写测试确保错词复习优先级不变
- 编写测试确保检查词优先级不变

### 风险 3: 泡泡产出货币破坏核心循环

**对策**:
- 严格代码审查：`#onBubbleHit()` 方法中不能有增加 fuelCoins/gearCoins 的代码
- 编写测试：撞击后验证货币未增加
- 设计文档明确标注：**禁止产出货币**

### 风险 4: 性能问题（过多泡泡导致卡顿）

**对策**:
- 限制泡泡数量（最多 50 个）
- 使用简单几何体（SphereGeometry 8x8）
- 性能测试：确保帧率 > 30fps

---

## 🎯 Success Criteria

**Phase 1 完成**:
- ✅ `createDefaultProgress()` 包含 `exposureCount: 0`
- ✅ `incrementExposureCount()` 方法可用
- ✅ 旧数据自动迁移
- ✅ 所有现有测试通过

**Phase 2 完成**:
- ✅ WordBubbleModel 和 WordBubbleManager 实现完成
- ✅ 泡泡可在赛道上生成
- ✅ 撞击检测正确
- ✅ 曝光计数正确
- ✅ 不产出货币

**Phase 3 完成**:
- ✅ WordCardDisplay 实现完成
- ✅ 集成到 RaceSession3D
- ✅ 单词卡片正确显示
- ✅ race:finish 事件包含曝光数据

**Phase 4 完成**:
- ✅ AdaptiveSelector 优先选择曝光单词
- ✅ 不破坏现有选题优先级
- ✅ 完整学习闭环可用

**Epic 6 完成**:
- ✅ 所有 Phase 完成
- ✅ 所有测试通过（覆盖率 > 80%）
- ✅ 手动验证流程完整
- ✅ 无回归问题
- ✅ Git 提交：`feat(epic-6): word reinforcement bubble system`
