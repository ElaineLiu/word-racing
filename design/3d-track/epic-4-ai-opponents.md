## Epic 4: AI对手系统

### 🎬 Vision

**目标**: 实现3个AI对手，具有行为差异（激进/平衡/保守），能沿赛道行驶并与玩家动态竞争。同时实现AUTO模式让AI接管玩家赛车。

**功能**:
- AIController：AI决策控制
- PathFollower：Pure Pursuit路径跟随
- AI个性预设（激进/平衡/保守）
- 排名系统（实时计算）
- AUTO模式（Tab键切换）

**作用**:
- 让3D比赛有挑战性
- 排名动态变化，增加趣味
- AUTO模式方便观赏/测试

**依赖**: Epic 3

**状态**: ⏸️ 未开始

---

### 📦 Use Cases

#### UC 4.1: 创建PathFollower（Pure Pursuit算法）

**描述**: 实现路径跟随算法，根据当前位置计算转向角度

**Acceptance Criteria**:
- [ ] 创建 `3d/utils/path-follower.js`
- [ ] 构造函数接受 `waypoints` 和 `lookaheadDistance`（默认100）
- [ ] `calculateSteering(x, y, currentAngle)` 返回 -1.0~1.0（左转~右转）
- [ ] 实现前瞻点查找算法
- [ ] 支持随机偏移（让AI不完全贴中心线）
- [ ] 处理路径循环（最后一个waypoint回到第一个）

**接口**:
```javascript
class PathFollower {
  constructor(waypoints, lookaheadDistance = 100)
  calculateSteering(x, y, currentAngle) → number  // -1.0 ~ 1.0
  setOffset(offset)  // 设置路径偏移
}
```

**测试文件**: `tests/3d/path-follower.test.js`

**状态**: ⏸️ 未开始

---

#### UC 4.2: 创建AI个性配置

**描述**: 定义3种AI个性预设

**Acceptance Criteria**:
- [ ] 创建 `config/ai-config.js`
- [ ] 定义 `AI_CONFIG.PERSONALITIES`：
  - `aggressive`: aggression=0.9, stability=0.6, mistakeProbability=0.08, speedMultiplier=1.1
  - `balanced`: aggression=0.5, stability=0.8, mistakeProbability=0.05, speedMultiplier=1.0
  - `conservative`: aggression=0.3, stability=0.95, mistakeProbability=0.02, speedMultiplier=0.9
- [ ] 定义 `AI_CONFIG.PATH_FOLLOWING.lookaheadDistance = 100`

**测试文件**: `tests/config/ai-config.test.js`

**状态**: ⏸️ 未开始

---

#### UC 4.3: 创建AIController类

**描述**: 实现AI控制器，控制AI赛车的输入

**Acceptance Criteria**:
- [ ] 创建 `3d/controllers/ai-controller.js`
- [ ] 构造函数接受 `car, track, personality`
- [ ] 内部使用 PathFollower 计算转向
- [ ] `update()` 每帧调用，更新 `car.input`
- [ ] 实现行为状态机：`racing | recovering`
- [ ] 根据 personality 调整目标速度
- [ ] 实现犯错逻辑（random < mistakeProbability 时进入 recovering 状态，持续1秒）
- [ ] 不同AI使用不同 pathOffset（避免完全重叠）

**接口**:
```javascript
class AIController {
  constructor(car, track, personality)
  update()  // 每帧调用，更新car.input
  get personality() → string
  get currentBehavior() → string
}
```

**测试文件**: `tests/3d/ai-controller.test.js`

**状态**: ⏸️ 未开始

---

#### UC 4.4: 实现排名系统

**描述**: 实现实时排名计算

**Acceptance Criteria**:
- [ ] 在 Game 类（或新建 RankingSystem）中实现 `calculateRank()`
- [ ] 排名规则：先按完成圈数倒序，再按当前圈进度倒序
- [ ] 返回玩家当前排名（1-4）
- [ ] 每帧更新排名
- [ ] 排名变化时发射 `rank:changed` 事件

**接口**:
```javascript
class RankingSystem {
  constructor(cars)
  calculateRanking() → Array<{car, rank}>
  getPlayerRank() → number
}
```

**测试文件**: `tests/3d/ranking-system.test.js`

**状态**: ⏸️ 未开始

---

#### UC 4.5: 实现AUTO模式

**描述**: Tab键切换AUTO模式，AI接管玩家赛车

**Acceptance Criteria**:
- [ ] Game 类（或测试入口）添加 `autoMode` 状态
- [ ] Tab键切换 `autoMode`（在RACING状态下）
- [ ] 启用时：为玩家赛车创建一个临时 AIController（使用 balanced personality）
- [ ] 禁用时：恢复玩家键盘控制
- [ ] 通过 EventBus 发射 `auto-mode:changed` 事件

**测试文件**: `tests/3d/auto-mode.test.js`

**状态**: ⏸️ 未开始

---

#### UC 4.6: 在测试入口集成AI对手

**描述**: 在 `test-3d.html` 中加载3个AI对手与玩家一起比赛

**Acceptance Criteria**:
- [ ] 创建3个AI赛车（不同个性、不同颜色）
- [ ] AI赛车沿赛道行驶
- [ ] 排名实时显示在调试面板
- [ ] Tab键可切换AUTO模式
- [ ] AI行为有明显差异（激进AI更快但易出错）

**测试**: 手动观察验证

**状态**: ⏸️ 未开始

---

### ✅ Definition of Done

**代码完成**:
- [ ] 所有UC的AC全部勾选
- [ ] 3个AI对手可在赛道上比赛
- [ ] AI有明显行为差异
- [ ] 排名系统准确
- [ ] AUTO模式工作正常

**测试完成**:
- [ ] PathFollower 单元测试通过（覆盖率 > 80%）
- [ ] AIController 单元测试通过（覆盖率 > 80%）
- [ ] 排名系统测试通过
- [ ] 手动验证：AI完成比赛、排名动态变化

**文档完成**:
- [ ] 更新本Epic状态为 ✅
- [ ] Git提交：`feat(epic-4): AI opponents with path following`

---

### 🧪 Test Cases

#### TC 4.1: PathFollower路径跟随
```javascript
describe('PathFollower', () => {
  it('should steer right when target is to the right', () => {
    const waypoints = [{ x: 0, z: 0 }, { x: 100, z: 0 }];
    const follower = new PathFollower(waypoints, 50);

    // 车在(0,0)朝上(Z轴正方向)，目标在右边(X轴正方向)
    const steering = follower.calculateSteering(0, 0, -Math.PI/2);
    expect(steering).toBeGreaterThan(0);
  });
});
```

#### TC 4.2: AI个性差异
```javascript
it('should have different target speeds based on personality', () => {
  const aggressiveAI = new AIController(car1, track, AI_CONFIG.PERSONALITIES.aggressive);
  const conservativeAI = new AIController(car2, track, AI_CONFIG.PERSONALITIES.conservative);

  expect(aggressiveAI.targetSpeed).toBeGreaterThan(conservativeAI.targetSpeed);
});
```

#### TC 4.3: 排名计算
```javascript
it('should rank by lap count first, then progress', () => {
  const cars = [
    { lap: 2, progress: 0.3 },  // 应排第1
    { lap: 1, progress: 0.9 },  // 应排第3
    { lap: 2, progress: 0.1 },  // 应排第2
  ];

  const ranking = new RankingSystem(cars).calculateRanking();
  expect(ranking[0].car).toBe(cars[0]);
  expect(ranking[1].car).toBe(cars[2]);
  expect(ranking[2].car).toBe(cars[1]);
});
```

---
