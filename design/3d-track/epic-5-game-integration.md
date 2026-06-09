## Epic 5: 比赛流程与系统集成

### 🎬 Vision

**目标**: 将3D赛道接入主游戏流程，让玩家可以从主游戏的赛道选择界面进入3D比赛。完成 TrackFactory 扩展、Game 类集成、赛道选择UI扩展、结果页面适配。

**功能**:
- 扩展 TrackFactory 支持创建 Track3D
- 扩展 Game.startRace() 支持3D赛道
- 扩展赛道选择界面（区分2D/3D区，显示解锁进度）
- 扩展结果页面（3D额外显示排名）
- 启用 FeatureFlags 的 '3d-track' 开关

**作用**:
- 让3D赛道从"独立测试品"变成"主游戏功能"
- 完成2D/3D的无缝切换

**依赖**: Epic 4

**状态**: ⏸️ 未开始

---

### 📦 Use Cases

#### UC 5.1: 扩展TrackFactory支持Track3D

**描述**: 修改 TrackFactory，根据 `track.type` 创建 Track3D 或 Track

**Acceptance Criteria**:
- [ ] 修改 `systems/track-factory.js`
- [ ] `create(trackId)` 方法增加3D分支：
  - 当 `trackData.type === '3d'` 且 `FeatureFlags.isEnabled('3d-track')` 时，返回 `new Track3D(...)`
  - 否则按现有逻辑返回 `new Track(...)`
- [ ] 2D赛道创建逻辑完全不变
- [ ] `FeatureFlags.isEnabled('3d-track') === false` 时尝试创建3D赛道抛出明确错误

**测试文件**: `tests/systems/track-factory.test.js`

**状态**: ⏸️ 未开始

---

#### UC 5.2: 扩展Game.startRace()支持3D

**描述**: 修改 Game 类，根据赛道类型创建对应的Car和管理对象

**Acceptance Criteria**:
- [ ] 修改 `js/game.js`
- [ ] `startRace()` 中根据 `track.type` 分支：
  - 2D：使用现有 Car（行为不变）
  - 3D：创建 Car3D + 3个AI对手（AIController）
- [ ] 燃油扣除逻辑统一：`fuelCost = selectedLaps * ECONOMY.FUEL_PER_LAP`
- [ ] 共享同一 GameState 实例
- [ ] 主游戏循环统一调用 `track.render(ctx, car, gameState)`
- [ ] 2D比赛行为完全不变（回归测试通过）

**测试文件**: `tests/integration/game-3d-integration.test.js`

**状态**: ⏸️ 未开始

---

#### UC 5.3: 扩展赛道选择界面

**描述**: 修改赛道选择界面，区分2D/3D区，显示解锁进度

**Acceptance Criteria**:
- [ ] 修改赛道选择视图（具体文件名待开发时确定）
- [ ] 分类显示：
  - "经典赛道"区：所有2D赛道
  - "3D沉浸赛道"区：所有3D赛道
- [ ] 3D区显示解锁进度条（如 `已掌握 150/200 个单词`）
- [ ] 未解锁的3D赛道显示锁定状态
- [ ] 解锁后按钮变为可点击
- [ ] 与现有圈数选择器配合

**测试文件**: `tests/views/track-selection-view.test.js`

**状态**: ⏸️ 未开始

---

#### UC 5.4: 扩展结果页面

**描述**: 修改比赛结果页面，3D比赛额外显示排名

**Acceptance Criteria**:
- [ ] 修改结果页面视图
- [ ] 2D结果：用时、最快圈、奖励（无变化）
- [ ] 3D结果额外显示：
  - 最终排名（1st/2nd/3rd/4th）
  - 完整排名榜（含3个AI）
  - 本次曝光单词数（来自Epic 6）
- [ ] 通过 `race:finish` 事件接收数据，事件payload包含 `trackType`

**测试文件**: `tests/views/race-result-view.test.js`

**状态**: ⏸️ 未开始

---

#### UC 5.5: 启用FeatureFlags '3d-track'开关

**描述**: 默认启用3D赛道开关，准备发布

**Acceptance Criteria**:
- [ ] `config/feature-flags.js` 中 `'3d-track': true`
- [ ] 提供 localStorage 可覆盖开关
- [ ] 开关禁用时，3D赛道不出现在选择界面（即使解锁）

**测试文件**: `tests/config/feature-flags.test.js`

**状态**: ⏸️ 未开始

---

### ✅ Definition of Done

**代码完成**:
- [ ] 所有UC的AC全部勾选
- [ ] 玩家可从主游戏进入3D比赛
- [ ] 2D比赛行为完全不变

**测试完成**:
- [ ] TrackFactory 测试通过
- [ ] Game 类3D集成测试通过
- [ ] **所有现有测试通过（无回归）**
- [ ] 端到端流程：QUIZ → SHOP → 选择3D赛道 → 比赛 → 结果

**文档完成**:
- [ ] 更新本Epic状态为 ✅
- [ ] Git提交：`feat(epic-5): integrate 3D track into main game flow`

---

### 🧪 Test Cases

#### TC 5.1: TrackFactory分发
```javascript
describe('TrackFactory with 3D', () => {
  it('should create Track3D for 3d type when flag enabled', () => {
    FeatureFlags.enable('3d-track');
    const track = factory.create('shanghai-3d');
    expect(track).toBeInstanceOf(Track3D);
  });

  it('should throw when 3d flag is disabled', () => {
    FeatureFlags.disable('3d-track');
    expect(() => factory.create('shanghai-3d')).toThrow();
  });

  it('should create Track2D unchanged', () => {
    const track = factory.create('shanghai-2d');
    expect(track).toBeInstanceOf(Track);
  });
});
```

#### TC 5.2: 2D赛道无回归
```javascript
it('should not affect 2D race behavior', () => {
  const game = new Game(canvas);
  game.selectedTrackId = 'shanghai-2d';
  game.startRace();

  expect(game.track).toBeInstanceOf(Track);
  expect(game.car).toBeInstanceOf(Car);
  // 所有原有行为应一致
});
```

---
