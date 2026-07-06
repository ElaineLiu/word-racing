## Epic 4: 重置功能

### 🎬 Vision

**目标**: 实现三种重置功能，支持用户清理学习数据，同时提供调试口令用于开发测试。

**功能**:
- 全部重置：清零所有数据，回到初始状态
- 重置今日：只清除今日答题统计
- 重置本周：只清除最近7天答题统计
- 调试口令：隐蔽的控制台脚本，用于解锁赛道/添加金币

**作用**:
- 提供数据重置能力（用户可能想重新开始）
- 修复错误数据（如误操作）
- 开发调试方便

**依赖**: Epic 3（奖励机制调整）

**状态**: ✅ 已完成（UC 4.6 取消）

---

### 📦 Use Cases

#### UC 4.1: 实现全部重置功能

**描述**: 在设置页面提供"全部重置"按钮，清零所有数据

**Acceptance Criteria**:
- [x] 在 `views/settings-view.js` 添加"全部重置"按钮
- [x] 点击后弹出确认弹窗：
  - 标题："确认重置所有数据？"
  - 内容："这将清空您的所有学习进度、金币、成就，无法恢复。"
  - 按钮："确认重置" / "取消"
- [x] 确认后执行重置：
  - 金币 → 0
  - 装备币 → 0
  - 氮气 → 0
  - 学习统计 → 0
  - 单词掌握进度 → 清空
  - 成就 → 清空
  - 已解锁赛道 → ['shanghai-2d']
  - 每日进度 → 清空
- [x] 重置后刷新页面
- [x] 调用 `GameState.reset()` 和 `ProgressTracker.clear()`

**影响文件**:
- `views/home-view.js`（实现位置，非 settings-view.js）
- `learning/progress-tracker.js`（使用现有clear方法）
- `learning/daily-manager.js`（使用现有reset方法）

**测试文件**: `tests/reset-features.test.js`（已完成）

**状态**: ✅ 已完成

---

#### UC 4.2: 实现重置今日功能

**描述**: 在学习页面提供"重置今日"按钮，只清除今日答题统计

**Acceptance Criteria**:
- [x] 在 `ui/learning-ui.js` 添加"重置今日"按钮（开发调试用，可隐藏）
- [x] 点击后弹出确认弹窗：
  - 标题："确认重置今日学习记录？"
  - 内容："这将清除今日的答题统计和收益，但保留金币和单词掌握进度。"
  - 按钮："确认重置" / "取消"
- [x] 确认后执行重置：
  - 今日答题统计（套数、正确率）→ 0
  - 今日收益（金币、装备币）→ 0
  - 总金币 → 不变
  - 单词掌握进度 → 不变
- [x] 调用 `DailyManager.reset()`
- [x] 更新UI显示

**影响文件**:
- `views/home-view.js`（实现位置，通过下拉菜单触发）
- `learning/daily-manager.js`

**测试文件**: `tests/reset-features.test.js`（已完成）

**状态**: ✅ 已完成

---

#### UC 4.3: 实现重置本周功能

**描述**: 在学习页面提供"重置本周"按钮，清除最近7天答题统计

**Acceptance Criteria**:
- [x] 在 `views/home-view.js` 添加"重置本周"按钮（通过下拉菜单触发）
- [x] 点击后弹出确认弹窗：
  - 标题："确认重置本周学习记录？"
  - 内容："这将清除最近7天的答题统计，但保留金币和单词掌握进度。"
  - 按钮："确认重置" / "取消"
- [x] 确认后执行重置：
  - 最近7天答题统计 → 清空
  - 总金币 → 不变
  - 单词掌握进度 → 不变
- [x] 调用 `DailyManager.clearHistory(7)`
- [x] 更新UI显示

**新增方法**:
```javascript
// 在 DailyManager 中
clearHistory(days = 7) {
  const dates = Object.keys(this.#historyStats).sort().reverse();
  const toClear = dates.slice(0, days);
  for (const date of toClear) {
    delete this.#historyStats[date];
  }
  this.#saveHistory();
}
```

**测试文件**: `tests/daily-manager.test.js`（更新）

**状态**: ✅ 已完成

---

#### UC 4.4: 创建调试口令系统

**描述**: 创建隐蔽的控制台脚本，用于解锁赛道、添加金币

**Acceptance Criteria**:
- [x] 创建 `scripts/debug-commands.js`（开发环境自动加载）
- [x] 提供以下调试命令：
  ```javascript
  // 解锁指定赛道
  window.debugUnlockTrack('monaco-2d');
  window.debugUnlockTrack('silverstone-2d');
  window.debugUnlockTrack('shanghai-3d');
  window.debugUnlockTrack('night-race-3d');

  // 添加金币
  window.debugAddFuelCoins(1000);

  // 添加装备币
  window.debugAddGearCoins(500);

  // 解锁所有赛道
  window.debugUnlockAllTracks();

  // 重置为默认状态（保留单词进度）
  window.debugResetToDefault();

  // 显示帮助
  window.debugHelp();
  ```
- [x] 命令执行后自动刷新页面
- [x] 在 `game-mechanics-v2.md` 中记录调试口令

**实现**: `scripts/debug-commands.js`（IIFE，通过 `index.html` 条件加载）

**测试**: 在浏览器控制台手动测试

**状态**: ✅ 已完成

---

#### UC 4.5: 创建重置功能测试

**描述**: 创建完整的重置功能测试，验证所有场景

**Acceptance Criteria**:
- [x] 测试全部重置：
  - 验证所有数据清零
  - 验证单词进度清空
  - 验证赛道解锁重置
- [x] 测试重置今日：
  - 验证今日统计清零
  - 验证金币保留
  - 验证单词进度保留
- [x] 测试重置本周：
  - 验证7天统计清空
  - 验证金币保留
  - 验证单词进度保留

**测试文件**: `tests/reset-features.test.js`（已完成）

**状态**: ✅ 已完成

---

#### UC 4.6: 更新UI布局

**描述**: 调整重置按钮的UI布局，区分生产环境和开发环境

**Acceptance Criteria**:
- [ ] 全部重置按钮：放在设置页面（生产环境可见）
- [ ] 重置今日/本周按钮：放在学习页面调试区（仅开发环境显示）
- [ ] 使用环境变量或FeatureFlag控制显示：
  ```javascript
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isDevelopment) {
    // 显示调试按钮
  }
  ```
- [ ] 添加警告样式：红色边框或背景，提醒用户这是危险操作

**测试**: 手动验证UI显示正确

**状态**: ❌ 已取消 — 重置功能统一通过首页下拉菜单访问，无需区分开发/生产环境UI

---

### ✅ Definition of Done

**代码完成**:
- [x] 所有UC的AC全部勾选（UC 4.6 取消）
- [x] 无console错误或警告
- [x] 调试命令仅在开发环境（localhost）加载

**测试完成**:
- [x] 所有测试用例通过（`npx vitest run`）— 740 tests passed
- [x] 测试覆盖率 > 80%
- [x] 手动验证：三种重置功能正常
- [x] 手动验证：调试命令正常

**文档完成**:
- [x] 更新本Epic状态为 ✅
- [x] 更新 `game-mechanics-v2.md` 中的调试口令说明
- [ ] Git历史清晰，每个UC独立commit

---

### 🧪 Test Cases

#### TC 4.1: 全部重置

```javascript
describe('Reset all data', () => {
  it('should clear all user data', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus, 'test_user');
    const progressTracker = new ProgressTracker(eventBus, 'shanghai-zhongkao', 'test_user');

    // 设置一些数据
    gameState.set('fuelCoins', 1000);
    gameState.set('gearCoins', 500);
    gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);
    gameState.set('learning.totalQuizzes', 10);

    progressTracker.updateStatus('test', 'PIT_BOARD', true, 1);

    // 执行全部重置
    gameState.reset();
    progressTracker.clear();

    // 验证所有数据清零
    expect(gameState.get('fuelCoins')).toBe(0);
    expect(gameState.get('gearCoins')).toBe(0);
    expect(gameState.get('unlockedTracks')).toEqual(['shanghai-2d']);
    expect(gameState.get('learning.totalQuizzes')).toBe(0);
    expect(progressTracker.getStatus('test')).toBeNull();
  });
});
```

#### TC 4.2: 重置今日

```javascript
describe('Reset today progress', () => {
  it('should clear today stats but keep coins', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus, 'test_user');
    const dailyManager = new DailyManager(eventBus, gameState, 'test_user');

    // 设置今日数据
    gameState.set('fuelCoins', 100);
    gameState.set('daily.todayQuizzes', 3);
    gameState.set('daily.todayFuelCoins', 50);

    // 执行重置今日
    dailyManager.reset();

    // 验证今日统计清零，金币保留
    expect(gameState.get('fuelCoins')).toBe(100);
    expect(gameState.get('daily.todayQuizzes')).toBe(0);
    expect(gameState.get('daily.todayFuelCoins')).toBe(0);
  });
});
```

#### TC 4.3: 重置本周

```javascript
describe('Reset this week history', () => {
  it('should clear 7-day history but keep coins', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus, 'test_user');
    const dailyManager = new DailyManager(eventBus, gameState, 'test_user');

    // 模拟历史数据
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    dailyManager.completeQuiz({ totalQuestions: 10, correctCount: 10, fuelCoins: 40 });

    // 执行重置本周
    dailyManager.clearHistory(7);

    // 验证历史清空
    const history = dailyManager.getHistory(7);
    expect(history.length).toBe(0);

    // 金币保留
    expect(gameState.get('fuelCoins')).toBe(40);
  });
});
```

#### TC 4.4: 调试命令

```javascript
describe('Debug commands', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('wr_current_user', 'test_user');
  });

  it('should unlock track via debug command', () => {
    window.debugUnlockTrack('monaco-2d');

    const state = JSON.parse(localStorage.getItem('wr_game_state_test_user'));
    expect(state.unlockedTracks).toContain('monaco-2d');
  });

  it('should add fuel coins via debug command', () => {
    window.debugAddFuelCoins(1000);

    const state = JSON.parse(localStorage.getItem('wr_game_state_test_user'));
    expect(state.fuelCoins).toBe(1000);
  });
});
```

---

### 📝 技术注意事项

1. **确认弹窗**: 所有重置操作必须二次确认，防止误操作
2. **数据备份**: 重置前可选备份到临时文件（后续可提供恢复功能）
3. **调试命令安全**: 仅在开发环境加载 `debug-commands.js`
4. **重置范围**: 明确区分三种重置的范围，避免混淆
5. **UI提示**: 重置后显示成功提示，并刷新页面

---

### 🔄 重置功能对比表

| 重置类型 | 金币 | 装备币 | 氮气 | 学习统计 | 单词进度 | 成就 | 赛道解锁 |
|---------|------|--------|------|---------|---------|------|---------|
| 全部重置 | ❌ 清零 | ❌ 清零 | ❌ 清零 | ❌ 清零 | ❌ 清空 | ❌ 清空 | ❌ 仅默认 |
| 重置今日 | ✅ 保留 | ✅ 保留 | ✅ 保留 | ❌ 清零今日 | ✅ 保留 | ✅ 保留 | ✅ 保留 |
| 重置本周 | ✅ 保留 | ✅ 保留 | ✅ 保留 | ❌ 清空7天 | ✅ 保留 | ✅ 保留 | ✅ 保留 |

---

### 🎯 后续优化

1. **数据导出**: 允许用户导出所有数据到JSON文件
2. **数据导入**: 允许用户导入之前导出的数据
3. **恢复功能**: 重置后30天内可恢复（临时备份）
4. **云端同步**: 后期微信登录后支持云端备份
