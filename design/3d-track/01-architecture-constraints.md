## 📊 当前代码基线

> **重要**：设计必须基于实际代码，以下数据均已核实（2026-06-07）。

### 答题系统配置（`config/learning-config.js`）

| 配置 | 实际值 | 说明 |
|------|--------|------|
| `DAILY_QUIZ_COUNT` | 3 | 每天3套题 |
| `QUIZ_QUESTION_COUNT` | **10** | 每套10道题（不是5道） |
| `MAX_REVIEW_PER_QUIZ` | 3 | 每套最多3个复习词 |
| `MIN_LEVEL` / `MAX_LEVEL` | 2 / 5 | 难度范围 |

### 答题奖励（`config/learning-config.js`）

| 行为 | 奖励 |
|------|------|
| 简单题答对 | +5燃油币 |
| 复杂题答对 | +8齿轮币 |
| 完成一套（10题） | +10燃油币 |
| 3连击 | +5齿轮币 |
| 5连击 | +10齿轮币 |
| 7连击 | +15齿轮币 |
| 10连击（满连） | +25齿轮币 |
| 每日完成3套 | +50燃油币 +30齿轮币 |
| 每日正确率≥80% | +30燃油币 |
| 每日新学10词 | +20燃油币 |

### 比赛系统配置（`config/game-config.js`）

| 配置 | 实际值 | 说明 |
|------|--------|------|
| `GAME.MIN_LAPS` / `MAX_LAPS` | 1 / 5 | 圈数1-5圈可选 |
| `ECONOMY.MAX_FUEL` | 100 | 燃油上限 |
| `ECONOMY.FUEL_PER_LAP` | 20 | 每圈消耗20燃油 |
| `ECONOMY.INITIAL_FUEL` | 0 | 必须先在商店购买 |

### 现有2D赛道解锁条件（`config/track-registry.js`）

| 赛道 | 解锁条件 | 燃油币消耗 |
|------|---------|-----------|
| 上海2D | 无要求（默认解锁） | 10 |
| 蒙特卡洛2D | `quizzesCompleted: 10` | 15 |
| 银石2D | `masteryCount: 50` | 20 |

### 关键接口与系统

| 模块 | 文件 | 用途 |
|------|------|------|
| TrackInterface | `core/track-interface.js` | 赛道抽象接口（id/name/type/render/getProgress/isOnTrack等） |
| EventBus | `core/event-bus.js` | 事件总线（on/once/off/emit） |
| GameState | `core/game-state.js` | 单一数据源（fuelCoins/gearCoins/upgrades/learning） |
| TrackFactory | `systems/track-factory.js` | 根据type创建Track2D/Track3D |
| TrackUnlockManager | `systems/track-unlock-manager.js` | 解锁条件检查 |
| RacingCostManager | `systems/racing-cost-manager.js` | 燃油扣除 |
| FeatureFlags | `config/feature-flags.js` | 功能开关（含'3d-track'） |
| Car | `js/car.js` | 现有2D赛车物理 |
| Track | `js/track.js` | 现有2D赛道渲染 |

---

## 🎮 完整游戏流程

### 主流程

```
┌───────────────────────────────────────────────────────────┐
│  QUIZ 答题页面                                              │
│  - 每套10题，每天3套                                         │
│  - 答题获得：燃油币/齿轮币（唯一来源）                          │
└────────────────────┬──────────────────────────────────────┘
                     ▼
┌───────────────────────────────────────────────────────────┐
│  SHOP 商店页面                                              │
│  - 燃油币 → 购买燃油                                          │
│  - 齿轮币 → 升级赛车/购买氮气                                  │
└────────────────────┬──────────────────────────────────────┘
                     ▼
┌───────────────────────────────────────────────────────────┐
│  TRACK SELECTION 赛道选择                                   │
│  - 选择圈数：1-5圈                                            │
│  - 2D区：上海/蒙特卡洛/银石                                    │
│  - 3D区：上海3D（掌握200词解锁）                              │
└────────────────────┬──────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────┐         ┌─────────────────────┐
│  2D 比赛     │         │  3D 比赛            │
│  - 1-5圈     │         │  - 1-5圈            │
│  - 消耗燃油  │         │  - 消耗燃油          │
│  - 无AI      │         │  - 3 AI对手         │
│              │         │  - 单词强化泡泡     │
└──────┬───────┘         └────────┬────────────┘
       │                          │
       └────────┬─────────────────┘
                ▼
┌───────────────────────────────────────────────────────────┐
│  RESULTS 成绩页面                                           │
│  - 用时、最快圈                                              │
│  - 3D额外：排名、本次曝光单词数                                │
└────────────────────┬──────────────────────────────────────┘
                     ▼
                 返回QUIZ
```

### 学习闭环（3D特有）

```
QUIZ答题学习新词 "accomplish"  →  exposed状态
                ↓
        参加3D比赛
                ↓
     赛道上看到 "accomplish" 泡泡
                ↓
   撞击 → 单词卡片显示 → 记忆强化
                ↓
        exposureCount +1
                ↓
   下次答题时该单词优先出现
                ↓
   答对 → mastery进度+1 → 最终掌握
                ↓
        泡泡不再生成
```

### 关键原则

1. **燃油币/齿轮币**：**仅来自答题**，赛道不产出货币
2. **单词泡泡奖励**：仅给速度提升+曝光记录，不给货币
3. **2D/3D共享**：同一GameState、同一商店、同一升级、同一解锁系统

---

## 📐 架构原则

### 1. 接口一致性
- `Track3D` 和 `Car3D` 实现 `TrackInterface`
- 共享 `GameState` 单一数据源
- 通过 `EventBus` 发射标准事件

### 2. 2D/3D完全隔离
- 2D相关代码（`js/track.js`, `js/car.js`, `rendering/render-system.js`）**不修改**
- 3D相关代码全部在`3d/`目录下
- 通过`TrackFactory`根据`track.type`分发
- `FeatureFlags.isEnabled('3d-track')`控制总开关

### 3. 渲染架构：Track自渲染模式
- `Track3D.render()` 内部调用 Three.js 渲染器
- `Game`类调用 `track.render()` 时无需感知2D/3D
- Three.js Canvas与2D Canvas通过CSS层叠或切换

### 4. 物理系统：时间基础
- 现有Car物理改为时间基础（`deltaTime`参数）
- 帧率无关，物理更精确
- 向后兼容（默认`deltaTime=1/60`）

### 5. 测试优先（TDD）
- 每个UC配套测试文件
- 单元测试覆盖率 > 80%
- 集成测试验证模块协作

### 目录结构

```
word-racing/
├── 3d/                          # 新增：3D模块
│   ├── core/
│   │   ├── scene-3d.js          # Three.js场景管理
│   │   ├── track-3d.js          # Track3D（实现TrackInterface）
│   │   └── car-3d.js            # Car3D（继承Car）
│   ├── controllers/
│   │   ├── camera-controller.js # 摄像机控制
│   │   └── ai-controller.js     # AI对手
│   ├── systems/
│   │   └── word-bubble-manager.js # 单词泡泡
│   ├── rendering/
│   │   └── track-builder.js     # 赛道几何生成
│   ├── models/
│   │   ├── car-model.js
│   │   ├── tree-model.js
│   │   └── word-bubble-model.js
│   └── utils/
│       └── path-follower.js     # AI路径跟随
│
├── ui/
│   └── word-card-display.js     # 新增：单词卡片UI
│
├── tests/
│   ├── 3d/                      # 新增：3D测试
│   └── integration/             # 新增：3D集成测试
│
├── test-3d.html                 # 新增：独立测试入口
│
├── config/
│   ├── track-registry.js        # 扩展：3D赛道配置
│   ├── feature-flags.js         # 已有：'3d-track'开关
│   └── ai-config.js             # 新增：AI个性配置
│
├── systems/
│   └── track-factory.js         # 扩展：3D赛道创建
│
└── js/
    ├── car.js                   # 修改：deltaTime参数
    └── game.js                  # 扩展：3D赛道集成
```

---

## ⚠️ 风险与对策

| 风险 | 概率 | 影响 | 对策 |
|------|------|------|------|
| Three.js学习曲线陡峭 | 高 | 中 | Epic 0先做最小原型，渐进迭代 |
| 性能不达标（<30fps） | 中 | 高 | Epic 8性能优化，提供画质选项 |
| 3D/2D数据状态不一致 | 中 | 高 | 强制共享GameState，禁止3D内部状态 |
| 单词泡泡干扰游戏体验 | 中 | 中 | 卡片显示限1.5秒，不暂停游戏 |
| 单词泡泡破坏经济循环 | 低 | 高 | 严格禁止泡泡产生货币，只给速度奖励 |
| AI行为不自然 | 中 | 低 | 简化AI，使用固定路径+随机扰动 |
| 移动端性能差 | 高 | 中 | 默认低画质，移动端检测自动降级 |
| 物理改为时间基础导致回归 | 中 | 高 | 现有测试必须100%通过，新增对比测试 |

---
