## Epic 6: 单词泡泡系统（核心教育价值）

### 🎬 Vision

**目标**: 实现单词强化泡泡系统，在3D赛道上提供已学未掌握单词的复习机会，记录曝光数据反馈到学习系统，强化记忆但**不破坏核心经济循环**。

### 设计理念

**教育心理学依据**:
1. **间隔重复（Spaced Repetition）**：已学单词在不同场景重复出现，强化长期记忆
2. **情境学习（Contextual Learning）**：在游戏情境中接触单词，降低认知负荷
3. **正反馈循环**：复习行为获得游戏奖励（速度提升），但**不替代答题**

**核心原则**:
- ✅ **保护核心循环**：泡泡**不产生**燃油币/齿轮币
- ✅ **强化学习效果**：增加单词曝光，影响下次答题选词
- ✅ **奖励玩游戏行为**：速度提升让玩家愿意撞击泡泡
- ✅ **数据驱动学习**：曝光数据反馈到 AdaptiveSelector

**学习闭环**:
```
答题学新词 "accomplish" (exposed状态)
    ↓
3D比赛遇到 "accomplish" 泡泡
    ↓
撞击 → 单词卡片 → 速度+10%
    ↓
exposureCount +1
    ↓
下次答题 "accomplish" 优先出现
    ↓
答对 → 推进mastery进度
    ↓
mastered后 → 泡泡不再生成
```

**功能**:
- WordBubbleManager：泡泡生成、检测、记录
- WordBubbleModel：泡泡3D模型
- WordCardDisplay：单词卡片UI
- 与AdaptiveSelector集成

**依赖**: Epic 5

**状态**: ⏸️ 未开始

---

### 📦 Use Cases

#### UC 6.1: 创建WordBubbleManager类

**描述**: 实现单词泡泡管理器，负责生成、检测、记录曝光

**Acceptance Criteria**:
- [ ] 创建 `3d/systems/word-bubble-manager.js`
- [ ] 构造函数接受 `scene, track, gameState, eventBus, car`
- [ ] `generateBubbles(track)` 生成泡泡：
  - 筛选 `status !== 'mastered'` 且 `status !== 'unlearned'` 的单词
  - 按 `exposureCount` 升序排序（优先曝光少的）
  - 取前30-50个单词
  - 沿赛道随机位置生成
- [ ] `checkCollection(car)` 每帧调用，检测撞击
- [ ] `getExposureStats()` 返回 `{ totalExposed, words }`
- [ ] `update(deltaTime)` 更新泡泡动画
- [ ] `dispose()` 清理场景对象

**接口**:
```javascript
class WordBubbleManager {
  constructor(scene, track, gameState, eventBus, car)
  generateBubbles(track)
  checkCollection(car)
  getExposureStats() → { totalExposed, words }
  update(deltaTime)
  dispose()
}
```

**测试文件**: `tests/3d/word-bubble-manager.test.js`

**状态**: ⏸️ 未开始

---

#### UC 6.2: 创建WordBubbleModel类

**描述**: 创建低多边形风格的单词泡泡3D模型

**Acceptance Criteria**:
- [ ] 创建 `3d/models/word-bubble-model.js`
- [ ] 使用 `THREE.SphereGeometry(15, 8, 8)`（低多边形）
- [ ] 材质：半透明蓝色（opacity=0.7，color=0x6699FF）
- [ ] 发光效果：emissive=0x3399FF
- [ ] 内部显示英文单词（CanvasTexture）
- [ ] 动画：缓慢旋转 + 上下浮动
- [ ] `update(deltaTime)` 更新动画

**接口**:
```javascript
class WordBubbleModel {
  constructor(word)
  get mesh() → THREE.Group
  get word() → object
  update(deltaTime)
  dispose()
}
```

**测试文件**: `tests/3d/word-bubble-model.test.js`

**状态**: ⏸️ 未开始

---

#### UC 6.3: 实现泡泡撞击检测与奖励

**描述**: 检测车辆与泡泡的碰撞，触发奖励与曝光记录

**Acceptance Criteria**:
- [ ] 距离检测（distance < 20）
- [ ] 撞击后执行（按顺序）：
  1. 标记泡泡 `collected = true`
  2. 从场景移除泡泡（含粒子破裂效果）
  3. 显示单词卡片（WordCardDisplay）
  4. 更新 `gameState.getWordProgress(word.id).exposureCount += 1`
  5. 更新 `lastSeenAt = new Date().toISOString()`
  6. 发射 `word:exposed` 事件
  7. 给予速度奖励：`car.applySpeedBoost(1.1, 1.0)`
- [ ] **不增加任何货币**（fuelCoins/gearCoins）
- [ ] 一个泡泡只能撞击一次

**测试文件**: `tests/3d/bubble-collision.test.js`

**状态**: ⏸️ 未开始

---

#### UC 6.4: 创建WordCardDisplay组件

**描述**: 在屏幕中央显示单词卡片

**Acceptance Criteria**:
- [ ] 创建 `ui/word-card-display.js`
- [ ] 使用HTML覆盖层（不阻塞游戏）
- [ ] 显示内容：英文单词（大字号）、音标、中文翻译
- [ ] 例句（可选，小字号）
- [ ] 显示时长：1.5秒
- [ ] 动画：淡入（200ms）→ 显示 → 淡出（300ms）
- [ ] 不暂停游戏（玩家可继续驾驶）
- [ ] 可同时显示多张（叠加）

**接口**:
```javascript
class WordCardDisplay {
  constructor(containerSelector)
  show(word, duration = 1500)
  hide()
}
```

**测试文件**: `tests/ui/word-card-display.test.js`

**状态**: ⏸️ 未开始

---

#### UC 6.5: 集成学习系统（AdaptiveSelector）

**描述**: 让曝光数据影响下次答题选词

**Acceptance Criteria**:
- [ ] 扩展 GameState 单词数据结构，增加 `exposureCount` 字段（默认0）
- [ ] 修改 `learning/adaptive-selector.js`：
  - 在选词时，优先选择 `exposureCount > 0 && status !== 'mastered'` 的单词
  - 按 `exposureCount` 倒序排（曝光多的优先）
  - 但不破坏原有的 review/check 优先级
- [ ] 现有学习系统行为不受影响（无曝光时按原逻辑）
- [ ] 提供 GameState 迁移：旧数据自动补全 `exposureCount = 0`

**测试文件**: `tests/integration/word-exposure-learning.test.js`

**状态**: ⏸️ 未开始

---

#### UC 6.6: 比赛结束统计曝光数据

**描述**: 比赛结束时通过 race:finish 事件传递曝光统计

**Acceptance Criteria**:
- [ ] `Game.startRace()` 在3D模式下创建 WordBubbleManager
- [ ] `race:finish` 事件payload包含 `wordExposure: { totalExposed, words }`
- [ ] 结果页面（Epic 5 UC 5.4）显示"本次曝光X个单词"
- [ ] 2D比赛的事件payload无此字段

**测试文件**: `tests/integration/race-finish-exposure.test.js`

**状态**: ⏸️ 未开始

---

#### UC 6.7: 在测试入口集成单词泡泡

**描述**: 在 `test-3d.html` 中加载单词泡泡系统

**Acceptance Criteria**:
- [ ] 使用 Epic 0 的模拟单词数据
- [ ] 赛道上生成30个泡泡
- [ ] 玩家可撞击泡泡
- [ ] 单词卡片正确显示
- [ ] 调试面板显示曝光统计
- [ ] 撞击时有速度提升效果

**测试**: 手动验证

**状态**: ⏸️ 未开始

---

### ✅ Definition of Done

**代码完成**:
- [ ] 所有UC的AC全部勾选
- [ ] 单词泡泡可在3D赛道上生成与撞击
- [ ] 单词卡片正确显示
- [ ] 曝光数据正确记录
- [ ] AdaptiveSelector优先选择曝光单词
- [ ] **未引入任何货币产出**（核心循环保护）

**测试完成**:
- [ ] WordBubbleManager 单元测试通过（覆盖率 > 80%）
- [ ] WordBubbleModel 测试通过
- [ ] WordCardDisplay 测试通过
- [ ] 学习系统集成测试通过
- [ ] **现有AdaptiveSelector测试100%通过（无回归）**
- [ ] 手动验证：泡泡视觉效果、卡片显示、曝光影响下次答题

**文档完成**:
- [ ] 更新本Epic状态为 ✅
- [ ] Git提交：`feat(epic-6): word reinforcement bubble system`

---

### 🧪 Test Cases

#### TC 6.1: 泡泡只生成未掌握单词
```javascript
describe('WordBubbleManager', () => {
  it('should only generate bubbles for unmastered words', () => {
    const gameState = {
      words: [
        { id: 1, status: 'exposed', exposureCount: 0 },
        { id: 2, status: 'mastered', exposureCount: 0 },
        { id: 3, status: 'simple_passed', exposureCount: 0 }
      ]
    };

    const manager = new WordBubbleManager(scene, track, gameState, eventBus, car);
    manager.generateBubbles(track);

    expect(manager.bubbles.length).toBe(2);
    expect(manager.bubbles.find(b => b.word.id === 2)).toBeUndefined();
  });
});
```

#### TC 6.2: 撞击不产生货币（核心循环保护）
```javascript
it('MUST NOT increase fuelCoins/gearCoins on bubble hit', () => {
  const gameState = createMockGameState();
  const initialFuel = gameState.fuelCoins;
  const initialGear = gameState.gearCoins;

  const manager = new WordBubbleManager(scene, track, gameState, eventBus, car);
  manager.generateBubbles(track);
  manager.onBubbleHit(manager.bubbles[0]);

  expect(gameState.fuelCoins).toBe(initialFuel);
  expect(gameState.gearCoins).toBe(initialGear);
});
```

#### TC 6.3: 撞击记录曝光
```javascript
it('should increment exposureCount on hit', () => {
  const manager = new WordBubbleManager(scene, track, gameState, eventBus, car);
  manager.generateBubbles(track);

  const bubble = manager.bubbles[0];
  const wordId = bubble.word.id;
  const initialCount = gameState.getWordProgress(wordId).exposureCount || 0;

  manager.onBubbleHit(bubble);

  expect(gameState.getWordProgress(wordId).exposureCount).toBe(initialCount + 1);
});
```

#### TC 6.4: AdaptiveSelector优先曝光单词
```javascript
it('should prioritize exposed words in next quiz', () => {
  gameState.words[0].exposureCount = 3;
  gameState.words[1].exposureCount = 1;
  gameState.words[2].exposureCount = 0;

  const selector = new AdaptiveSelector(gameState);
  const selected = selector.selectWordsForQuiz();

  expect(selected[0].id).toBe(gameState.words[0].id);
});
```

#### TC 6.5: 撞击给予速度奖励
```javascript
it('should boost car speed on hit', () => {
  const car = new Car3D(0, 0, 0, scene);
  const originalMaxSpeed = car.maxSpeed;

  const manager = new WordBubbleManager(scene, track, gameState, eventBus, car);
  manager.generateBubbles(track);
  manager.onBubbleHit(manager.bubbles[0]);

  expect(car.maxSpeed).toBeGreaterThan(originalMaxSpeed);

  // 1秒后恢复
  for (let i = 0; i < 60; i++) car.update(track, 3, 1/60);
  expect(car.maxSpeed).toBeCloseTo(originalMaxSpeed, 1);
});
```

---
