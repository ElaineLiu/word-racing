## 📊 当前数据基线

> **重要**：设计必须基于实际代码，以下数据均已核实（2026-06-14）。

### 当前存储键名

| 键名 | 用途 | 数据结构 |
|------|------|----------|
| `wr_game_state` | 核心游戏状态 | GameState对象 |
| `wr_word_progress` | 单词掌握进度 | { wordSetId, progress, savedAt } |
| `wr_daily_stats` | 每日统计历史 | { date: stats } |
| `wr_quiz_session` | 答题会话（续答） | QuizSession对象 |
| `wr_feature_flags` | 功能开关 | { flagName: boolean } |
| `featureFlags` | 功能开关（旧版） | 已弃用，待清理 |

### 当前 GameState 数据结构（v3）

```javascript
{
  // 资源
  fuel: 0,              // ❌ 待删除（Epic 2）
  fuelCoins: 0,         // 金币
  gearCoins: 0,         // 装备币
  nitroCharges: 0,      // 氮气

  // 升级系统
  upgrades: {           // ❌ 待删除（Epic 2）
    engine: 1,
    tire: 1,
    body: 1,
  },

  // 学习统计
  learning: {
    totalWordsSeen: 0,
    totalWordsMastered: 0,
    totalQuizzes: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    lastPerfectQuiz: false,
  },

  // 每日进度
  daily: {
    lastActiveDate: null,
    streakDays: 0,
    todayQuizzes: 0,
    todayFuelCoins: 0,
    todayGearCoins: 0,
  },

  // 成就系统
  achievements: [],
  unlockedTracks: ['shanghai-2d'],
  selectedTrackId: 'shanghai-2d',

  // 元数据
  version: 3,           // ❌ 需升级为 4（Epic 2）
}
```

### 目标 GameState 数据结构（v4）

```javascript
{
  // 资源（删除fuel）
  fuelCoins: 0,         // 金币
  gearCoins: 0,         // 装备币
  nitroCharges: 0,      // 氮气

  // 学习统计（不变）
  learning: { ... },

  // 每日进度（不变）
  daily: { ... },

  // 成就系统（不变）
  achievements: [],
  unlockedTracks: ['shanghai-2d'],
  selectedTrackId: 'shanghai-2d',

  // 元数据
  version: 4,           // 升级为 4
}
```

### 当前答题奖励配置

**文件**: `config/learning-config.js`

| 行为 | 当前奖励 | 目标奖励 |
|------|---------|---------|
| 简单题答对 | +5 金币 | **+3 金币** |
| 复杂题答对 | +8 装备币 | **+5 金币** |
| 套题完成 | +10 金币 | **删除** |
| 连击奖励 | 3/5/7/10连击 | **删除** |
| 每日完成3套 | +50 金币 +30 装备币 | **删除** |
| 每日正确率≥80% | +30 金币 | **保持** |
| 每日新词10个 | +20 金币 | **删除** |

### 当前比赛消耗

| 项目 | 当前规则 | 目标规则 |
|------|---------|---------|
| 入场费 | 按赛道不同（10-20金币） | **统一10金币/圈** |
| 氮气购买 | 1装备币 = 1氮气 | **保持** |
| 赛道解锁 | 部分需要金币购买 | **仅看学习成就** |

### 关键模块

| 模块 | 文件 | 用途 |
|------|------|------|
| GameState | `core/game-state.js` | 单一数据源，持久化管理 |
| LearningController | `learning/learning-controller.js` | 答题流程主控 |
| DailyManager | `learning/daily-manager.js` | 每日进度管理 |
| AchievementManager | `systems/achievement-manager.js` | 成就检查与解锁 |
| TrackUnlockManager | `systems/track-unlock-manager.js` | 赛道解锁检查 |
| RacingCostManager | `systems/racing-cost-manager.js` | 比赛费用扣除 |
| ViewManager | `views/view-manager.js` | UI协调 |
| main-v2.js | `js/main-v2.js` | 应用入口，初始化所有模块 |

---

## 🎯 数据迁移策略

### 多用户数据分离（Epic 1）

**旧版存储**:
```javascript
wr_game_state
wr_word_progress
wr_daily_stats
wr_quiz_session
```

**新版存储**:
```javascript
wr_user_list                      // 用户列表：['user_001', 'user_002']
wr_current_user                   // 当前用户ID
wr_game_state_user_001            // 用户001的游戏状态
wr_word_progress_user_001         // 用户001的单词进度
wr_daily_stats_user_001           // 用户001的每日统计
wr_quiz_session_user_001          // 用户001的答题会话
```

**迁移步骤**:
1. 检测 `wr_user_list` 是否存在
2. 不存在 → 首次启动迁移
   - 创建默认用户 `user_001`
   - 将旧数据迁移到 `wr_game_state_user_001` 等
   - 创建 `wr_user_list = ['user_001']`
   - 设置 `wr_current_user = 'user_001'`
3. 存在 → 直接加载当前用户数据

### 数据清理（Epic 2）

**删除字段**:
- `fuel`（燃油）
- `upgrades`（升级系统）

**调整字段**:
- `version: 3` → `version: 4`

**迁移脚本**:
```javascript
function migrateToV4(oldState) {
  const { fuel, upgrades, ...rest } = oldState;
  return {
    ...rest,
    version: 4,
  };
}
```

**赛道解锁重置**:
```javascript
// 清除调试数据，只保留默认赛道
state.unlockedTracks = ['shanghai-2d'];
state.achievements = [];
```

---

## 📐 架构原则

### 1. 用户ID作为命名空间

所有用户数据使用 `wr_<key>_<userId>` 格式：

```javascript
// GameState类改造
class GameState {
  constructor(eventBus, userId = 'default') {
    this.#storageKey = `wr_game_state_${userId}`;
    this.#load();
  }
}

// ProgressTracker类改造
class ProgressTracker {
  constructor(eventBus, wordSetId = 'shanghai-zhongkao', userId = 'default') {
    this.#storageKey = `wr_word_progress_${userId}`;
    this.#load();
  }
}
```

### 2. 向后兼容

- Epic 1 必须兼容旧数据（自动迁移）
- Epic 2 必须处理 v3 → v4 迁移
- 所有迁移不可丢失用户数据（除明确删除的字段）

### 3. 单一数据源

- 每个用户的 GameState 独立
- 不允许跨用户数据访问
- EventBus 事件不带 userId（假设单用户上下文）

### 4. 测试优先（TDD）

- 每个UC配套测试文件
- 单元测试覆盖率 > 80%
- 集成测试验证迁移逻辑

---

## ⚠️ 风险与对策

| 风险 | 概率 | 影响 | 对策 |
|------|------|------|------|
| 旧数据迁移失败 | 低 | 高 | 迁移前备份到临时key，失败时回滚 |
| 用户ID冲突 | 低 | 中 | 使用时间戳+随机数生成唯一ID |
| 多用户数据泄露 | 低 | 高 | 严格使用userId作为命名空间，禁止跨用户访问 |
| 测试数据残留 | 中 | 中 | Epic 2清理所有调试数据，提供重置功能 |
| 奖励计算错误 | 中 | 高 | Epic 3完整测试所有场景，验证金币收益 |
| 重置功能误操作 | 中 | 高 | 二次确认弹窗，提供恢复机制（临时备份） |

---

## 🧪 测试策略

### 单元测试

每个 Epic 的测试重点：

- **Epic 1**: 用户创建、切换、数据隔离
- **Epic 2**: 数据迁移、字段删除、版本升级
- **Epic 3**: 奖励计算、金币消耗、正确率奖励
- **Epic 4**: 重置功能、数据清理范围

### 集成测试

验证跨模块协作：

- 用户切换后数据加载正确
- 迁移后所有功能正常
- 奖励发放后GameState更新正确
- 重置后数据符合预期

### 手动测试

每个 Epic 完成后：

- 浏览器控制台验证 localStorage
- 手动创建多个用户并切换
- 答题验证金币收益
- 重置功能验证数据清理

---

## 📝 数据一致性检查

### Epic 1 完成后

- [ ] 用户列表存在：`wr_user_list`
- [ ] 当前用户存在：`wr_current_user`
- [ ] 每个用户的数据键名正确：`wr_game_state_<userId>`
- [ ] 用户切换后数据加载正确

### Epic 2 完成后

- [ ] 所有用户的 GameState version = 4
- [ ] 所有用户的 `fuel` 字段已删除
- [ ] 所有用户的 `upgrades` 字段已删除
- [ ] 所有用户的 `unlockedTracks = ['shanghai-2d']`

### Epic 3 完成后

- [ ] 答简单题获得 3 金币
- [ ] 答复杂题获得 5 金币
- [ ] 套题完成无额外奖励
- [ ] 连击无奖励
- [ ] 正确率奖励正确发放

### Epic 4 完成后

- [ ] 全部重置清空所有数据
- [ ] 重置今日只清今日统计
- [ ] 重置本周只清7天统计
- [ ] 重置后金币和单词进度保留（除全部重置）
