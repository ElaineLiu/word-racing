## Epic 2: 数据清理与结构调整

### 🎬 Vision

**目标**: 清理旧数据结构，删除燃油和升级系统，清理调试数据，升级数据版本到 v4。

**功能**:
- 删除 `fuel` 字段（燃油系统）
- 删除 `upgrades` 字段（升级系统）
- 升级数据版本 `v3 → v4`
- 清理调试数据（几千金币、已解锁赛道等）
- 调整赛道解锁逻辑（移除金币购买）

**作用**:
- 简化游戏机制（按新设计文档）
- 清理开发阶段的临时数据
- 为新奖励机制做准备

**依赖**: Epic 1（多用户系统）

**状态**: ⏸️ 待开始

---

### 📦 Use Cases

#### UC 2.1: 删除燃油系统

**描述**: 从 GameState 中删除 `fuel` 字段，清理相关代码

**Acceptance Criteria**:
- [ ] 从 `core/game-state.js` DEFAULT_STATE 中删除 `fuel: 0`
- [ ] 删除 `setFuel()` 方法
- [ ] 删除 `Events.FUEL_CHANGED` 事件
- [ ] 删除 `ECONOMY.MAX_FUEL`、`ECONOMY.FUEL_PER_LAP` 等配置
- [ ] 更新所有引用燃油的代码
- [ ] 更新测试用例

**影响文件**:
- `core/game-state.js`
- `core/event-bus.js`
- `config/game-config.js`
- `js/game.js`
- `views/home-view.js`
- 所有测试文件

**状态**: ⏸️ 待开始

---

#### UC 2.2: 删除升级系统

**描述**: 从 GameState 中删除 `upgrades` 字段，清理相关代码

**Acceptance Criteria**:
- [ ] 从 `core/game-state.js` DEFAULT_STATE 中删除 `upgrades` 字段
- [ ] 删除 `upgrade()` 方法
- [ ] 删除 `Events.UPGRADE_CHANGED` 事件
- [ ] 删除升级相关UI（如有）
- [ ] 更新所有引用升级的代码
- [ ] 更新测试用例

**影响文件**:
- `core/game-state.js`
- `core/event-bus.js`
- `js/game.js`
- `js/car.js`（如果有升级效果代码）
- 所有测试文件

**状态**: ⏸️ 待开始

---

#### UC 2.3: 升级数据版本到 v4

**描述**: 实现 v3 → v4 数据迁移脚本

**Acceptance Criteria**:
- [ ] 在 `core/game-state.js` 中添加迁移逻辑
- [ ] 检测 `version: 3` 时自动迁移到 v4
- [ ] 迁移时删除 `fuel` 和 `upgrades` 字段
- [ ] 迁移后设置 `version: 4`
- [ ] 保持其他数据不变

**迁移脚本**:
```javascript
#load() {
  const saved = localStorage.getItem(this.#storageKey);
  if (saved) {
    const parsed = JSON.parse(saved);

    // v3 → v4 迁移
    if (parsed.version === 3) {
      delete parsed.fuel;
      delete parsed.upgrades;
      parsed.version = 4;
    }

    this.#state = { ...DEFAULT_STATE, ...parsed };
    this.#save(); // 保存迁移后的数据
  }
}
```

**测试文件**: `tests/game-state-migration.test.js`

**状态**: ⏸️ 待开始

---

#### UC 2.4: 清理调试数据

**描述**: 重置所有用户的调试数据（几千金币、已解锁赛道等）

**Acceptance Criteria**:
- [ ] 创建清理脚本 `scripts/clean-debug-data.js`（Node.js脚本）
- [ ] 清理内容：
  - `fuelCoins` → 重置为合理值（如100）
  - `gearCoins` → 重置为合理值（如50）
  - `nitroCharges` → 重置为 0
  - `unlockedTracks` → 重置为 `['shanghai-2d']`
  - `achievements` → 清空
- [ ] 保留数据：
  - `learning` 统计数据
  - 单词掌握进度
- [ ] 脚本可重复运行（幂等性）
- [ ] 清理前备份到临时文件

**清理脚本示例**:
```javascript
// scripts/clean-debug-data.js
const fs = require('fs');

// 遍历 localStorage 的 JSON 备份文件
const backupData = JSON.parse(fs.readFileSync('backup.json'));

for (const key in backupData) {
  if (key.startsWith('wr_game_state_')) {
    const state = JSON.parse(backupData[key]);

    // 清理调试数据
    state.fuelCoins = 100;
    state.gearCoins = 50;
    state.nitroCharges = 0;
    state.unlockedTracks = ['shanghai-2d'];
    state.achievements = [];

    backupData[key] = JSON.stringify(state);
  }
}

// 保存清理后的数据
fs.writeFileSync('backup-cleaned.json', JSON.stringify(backupData));
```

**测试**: 手动运行脚本，验证 localStorage 数据正确

**状态**: ⏸️ 待开始

---

#### UC 2.5: 调整赛道解锁逻辑

**描述**: 修改赛道解锁逻辑，移除金币购买，仅看学习成就

**Acceptance Criteria**:
- [ ] 修改 `systems/racing-cost-manager.js`
  - 删除 `canAfford()` 方法（不再检查金币）
  - 删除 `deductCost()` 方法（不再扣金币）
  - 保留 `refund()` 方法（空实现或删除）
- [ ] 修改 `systems/track-unlock-manager.js`
  - 确保 `isUnlocked()` 只检查 `unlockedTracks` 列表
  - 确保 `getUnlockProgress()` 只返回成就进度
- [ ] 修改 `config/track-registry.js`
  - 删除所有赛道的 `cost` 字段
  - 保留 `unlockRequirements` 字段
- [ ] 更新UI：赛道选择页面不显示入场费
- [ ] 更新测试用例

**影响文件**:
- `systems/racing-cost-manager.js`
- `systems/track-unlock-manager.js`
- `config/track-registry.js`
- `views/track-selection-view.js`
- 所有测试文件

**状态**: ⏸️ 待开始

---

#### UC 2.6: 清理功能开关

**描述**: 清理调试用的功能开关，保留必要的开关

**Acceptance Criteria**:
- [ ] 删除 `wr_feature_flags` 和 `featureFlags` 旧键
- [ ] 保留 `config/feature-flags.js` 中的默认开关
- [ ] 清理不再使用的开关（如 `multiple-tracks` 已稳定）
- [ ] 更新测试用例

**保留开关**:
- `2d-track`: true（始终启用）
- `3d-track`: true（启用3D赛道）

**删除开关**:
- `multiple-tracks`（已稳定，不再需要开关）

**状态**: ⏸️ 待开始

---

#### UC 2.7: 更新所有测试用例

**描述**: 更新所有测试用例，适配新的数据结构

**Acceptance Criteria**:
- [ ] 所有测试文件中删除 `fuel` 和 `upgrades` 相关断言
- [ ] 所有测试文件中删除 `ECONOMY.FUEL_PER_LAP` 等引用
- [ ] 所有测试文件中删除 `upgrade()` 方法调用
- [ ] 所有测试文件中更新 GameState 初始化逻辑
- [ ] 运行完整测试套件：`npx vitest run`，确保全部通过
- [ ] 测试覆盖率 > 80%

**测试命令**:
```bash
npx vitest run
npx vitest run --coverage
```

**状态**: ⏸️ 待开始

---

### ✅ Definition of Done

**代码完成**:
- [ ] 所有UC的AC全部勾选
- [ ] 无console错误或警告
- [ ] 所有废弃代码已删除（不注释）
- [ ] 数据版本已升级到 v4

**测试完成**:
- [ ] 所有测试用例通过（`npx vitest run`）
- [ ] 测试覆盖率 > 80%
- [ ] 手动验证：旧数据迁移正确
- [ ] 手动验证：调试数据已清理

**文档完成**:
- [ ] 更新本Epic状态为 ✅
- [ ] 更新 `game-mechanics-v2.md` 中的数据结构说明
- [ ] Git历史清晰，每个UC独立commit

---

### 🧪 Test Cases

#### TC 2.1: 燃油字段删除验证

```javascript
describe('GameState v4 - fuel removed', () => {
  it('should not have fuel field in DEFAULT_STATE', () => {
    const state = new GameState(eventBus, 'test_user');
    expect(state.get('fuel')).toBeUndefined();
  });

  it('should remove fuel during migration', () => {
    // 模拟 v3 数据
    localStorage.setItem('wr_game_state_test_user', JSON.stringify({
      version: 3,
      fuel: 50,
      fuelCoins: 100,
    }));

    const state = new GameState(eventBus, 'test_user');
    expect(state.get('fuel')).toBeUndefined();
    expect(state.get('version')).toBe(4);
    expect(state.get('fuelCoins')).toBe(100);
  });
});
```

#### TC 2.2: 升级系统删除验证

```javascript
describe('GameState v4 - upgrades removed', () => {
  it('should not have upgrades field', () => {
    const state = new GameState(eventBus, 'test_user');
    expect(state.get('upgrades')).toBeUndefined();
  });

  it('should throw error when calling removed upgrade() method', () => {
    const state = new GameState(eventBus, 'test_user');
    expect(() => state.upgrade('engine')).toThrow('upgrade() method has been removed');
  });
});
```

#### TC 2.3: 数据迁移验证

```javascript
describe('v3 to v4 migration', () => {
  it('should migrate all existing users', () => {
    // 创建两个用户的数据
    localStorage.setItem('wr_game_state_user_001', JSON.stringify({
      version: 3,
      fuel: 100,
      upgrades: { engine: 2, tire: 1, body: 1 },
      fuelCoins: 500,
    }));
    localStorage.setItem('wr_game_state_user_002', JSON.stringify({
      version: 3,
      fuel: 50,
      upgrades: { engine: 1, tire: 2, body: 3 },
      fuelCoins: 300,
    }));

    // 加载两个用户的数据（触发迁移）
    const state1 = new GameState(eventBus, 'user_001');
    const state2 = new GameState(eventBus, 'user_002');

    expect(state1.get('version')).toBe(4);
    expect(state1.get('fuel')).toBeUndefined();
    expect(state1.get('upgrades')).toBeUndefined();
    expect(state1.get('fuelCoins')).toBe(500);

    expect(state2.get('version')).toBe(4);
    expect(state2.get('fuel')).toBeUndefined();
    expect(state2.get('upgrades')).toBeUndefined();
    expect(state2.get('fuelCoins')).toBe(300);
  });
});
```

#### TC 2.4: 赛道解锁逻辑验证

```javascript
describe('Track unlock - no gold cost', () => {
  it('should not check gold coins for unlocking', () => {
    const gameState = new GameState(eventBus, 'test_user');
    gameState.set('fuelCoins', 0);
    gameState.set('unlockedTracks', ['shanghai-2d', 'monaco-2d']);

    const unlockManager = new TrackUnlockManager(eventBus, gameState);

    expect(unlockManager.isUnlocked('monaco-2d')).toBe(true);
    expect(unlockManager.isUnlocked('silverstone-2d')).toBe(false);
  });

  it('should only check achievement progress', () => {
    const gameState = new GameState(eventBus, 'test_user');
    gameState.set('learning.totalQuizzes', 10);

    const unlockManager = new TrackUnlockManager(eventBus, gameState);
    const progress = unlockManager.getUnlockProgress('monaco-2d');

    expect(progress.requirements.quizzesCompleted.current).toBe(10);
    expect(progress.requirements.quizzesCompleted.required).toBe(10);
  });
});
```

---

### 📝 技术注意事项

1. **向后兼容**: 迁移逻辑必须兼容 v3 数据，不能丢失用户数据
2. **幂等性**: 迁移脚本可重复运行，多次运行结果一致
3. **数据备份**: 清理调试数据前备份到临时文件
4. **废弃方法**: 删除的方法应该抛出明确的错误信息
5. **测试优先**: 先写测试，再修改代码（TDD）
6. **渐进迁移**: 先迁移数据结构，再清理代码

---

### 🔄 迁移清单

**迁移前备份**:
```bash
# 导出 localStorage 到 JSON 文件
# 在浏览器控制台运行
const backup = {};
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  backup[key] = localStorage.getItem(key);
}
console.log(JSON.stringify(backup));
# 复制输出并保存到文件
```

**迁移后验证**:
- [ ] 所有用户的 `version: 4`
- [ ] 所有用户无 `fuel` 字段
- [ ] 所有用户无 `upgrades` 字段
- [ ] 所有用户 `unlockedTracks = ['shanghai-2d']`
- [ ] 所有用户金币和装备币合理（< 1000）
