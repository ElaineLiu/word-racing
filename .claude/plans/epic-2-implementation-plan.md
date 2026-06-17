# Epic 2: 数据清理与结构调整 - 详细实施方案

## 1. 实施顺序建议

**推荐顺序**: UC 2.3 → UC 2.1 → UC 2.2 → UC 2.5 → UC 2.4 → UC 2.6 → UC 2.7

**理由**:

1. **UC 2.3（数据迁移）优先** - 确保旧数据能正确迁移到新结构，这是所有其他变更的基础
2. **UC 2.1 & UC 2.2（删除字段）顺序执行** - 删除燃油和升级系统是独立操作
3. **UC 2.5（赛道解锁）紧随其后** - 依赖燃油系统删除，需要调整成本管理逻辑
4. **UC 2.4（清理调试数据）** - 已集成到 UC 2.3 的迁移逻辑中
5. **UC 2.6（功能开关）** - 清理不再使用的功能开关
6. **UC 2.7（更新测试）** - 最后统一更新所有测试用例

**风险控制**: 每个UC完成后立即运行测试，确保系统稳定。

---

## 2. UC分组和优先级

### 并行执行组

**组 1 - 数据迁移（最高优先级）**:
- UC 2.3: 升级数据版本到 v4

**组 2 - 字段删除（高优先级，顺序执行）**:
- UC 2.1: 删除燃油系统
- UC 2.2: 删除升级系统

**组 3 - 业务逻辑调整（中优先级）**:
- UC 2.5: 调整赛道解锁逻辑

**组 4 - 清理和维护（低优先级）**:
- UC 2.4: 清理调试数据（已集成到 UC 2.3）
- UC 2.6: 清理功能开关
- UC 2.7: 更新所有测试用例

---

## 3. 详细实施步骤

### UC 2.3: 升级数据版本到 v4

**优先级**: 🔴 最高（基础设施）

**实施步骤**:

#### 步骤 1: 在 game-state.js 的 #load() 方法中添加版本迁移逻辑

关键逻辑：
- 检测 `version < 4`
- 删除 `fuel` 和 `upgrades` 字段
- 清理调试数据（金币 > 1000，已解锁赛道 > 5，成就 > 10）
- 设置 `version: 4`
- 保存迁移后的数据

#### 步骤 2: 更新 DEFAULT_STATE

删除 `fuel: 0` 和 `upgrades` 字段，version 改为 4。

#### 步骤 3: 废弃方法处理

`setFuel()` 和 `upgrade()` 方法抛出明确的错误信息。

#### 步骤 4: 创建迁移测试

创建 `tests/game-state-migration-v4.test.js`，测试：
- v3 数据正确迁移到 v4
- 调试数据被重置
- 其他数据保持不变
- 迁移幂等性
- 废弃方法抛出错误

**验证清单**:
- [ ] 迁移逻辑正确处理 v3 数据
- [ ] 迁移后 version = 4
- [ ] fuel 和 upgrades 字段被删除
- [ ] 其他数据保持不变
- [ ] 调试数据被重置
- [ ] 迁移幂等（可重复运行）
- [ ] 所有测试通过

---

### UC 2.1: 删除燃油系统

**优先级**: 🔴 高

**前置条件**: UC 2.3 完成

**影响文件**:

**核心文件**:
- `core/game-state.js` - 删除 fuel 字段、setFuel() 方法
- `core/event-bus.js` - 删除 Events.FUEL_CHANGED
- `core/validators.js` - 删除 isValidFuel()
- `config/game-config.js` - 删除 ECONOMY 中的燃油配置

**业务逻辑**:
- `js/game.js` - 删除燃油相关逻辑（getter/setter、扣除、检查）
- `systems/shop-system.js` - 删除燃油购买商品
- `rendering/render-system.js` - 删除燃油条渲染
- `learning/quiz-session.js` - 删除燃油奖励

**UI层**:
- `views/home-view.js` - 删除燃油显示
- `views/shop-view.js` - 删除燃油显示和购买
- `index.html` - 删除燃油相关HTML

**实施步骤**:

1. 在 `game-state.js` 的 DEFAULT_STATE 中删除 `fuel: 0`
2. 删除 `setFuel()` 方法
3. 在 `event-bus.js` 中删除 `Events.FUEL_CHANGED`
4. 在 `game-config.js` 中删除燃油配置和燃油商品
5. 在 `game.js` 中删除燃油 getter/setter 和所有燃油逻辑
6. 在 `shop-system.js` 中删除燃油购买逻辑
7. 在 `render-system.js` 中删除燃油条渲染
8. 在 UI 文件中删除燃油显示
9. 更新所有测试文件

**验证清单**:
- [ ] 所有燃油字段、方法、事件已删除
- [ ] 所有燃油配置已删除
- [ ] 所有燃油UI元素已删除
- [ ] 游戏仍可正常启动和运行
- [ ] 商店不再显示燃油商品
- [ ] 比赛不再扣除燃油
- [ ] 所有测试通过

---

### UC 2.2: 删除升级系统

**优先级**: 🔴 高

**前置条件**: UC 2.3 完成

**影响文件**:

**核心文件**:
- `core/game-state.js` - 删除 upgrades 字段、upgrade() 方法
- `core/event-bus.js` - 删除 Events.UPGRADE_CHANGED
- `core/validators.js` - 删除 isValidUpgrades()
- `config/game-config.js` - 删除 UPGRADES 配置

**业务逻辑**:
- `js/car.js` - 删除 applyUpgrades() 方法和升级效果
- `js/game.js` - 删除升级相关逻辑
- `systems/shop-system.js` - 删除升级购买商品
- `3d/runtime/race-session-3d.js` - 删除升级应用

**实施步骤**:

1. 在 `game-state.js` 的 DEFAULT_STATE 中删除 `upgrades` 字段
2. 删除 `upgrade()` 方法（已在 UC 2.3 中标记为废弃）
3. 在 `event-bus.js` 中删除 `Events.UPGRADE_CHANGED`
4. 在 `game-config.js` 中删除 UPGRADES 配置和升级商品
5. 在 `car.js` 中删除升级相关属性和 `applyUpgrades()` 方法
6. 在 `game.js` 中删除升级 getter/setter 和所有升级逻辑
7. 在 `shop-system.js` 中删除升级购买逻辑
8. 在 `race-session-3d.js` 中删除升级应用
9. 更新所有测试文件

**验证清单**:
- [ ] 所有升级字段、方法、事件已删除
- [ ] 所有升级配置已删除
- [ ] Car 类不再有升级效果
- [ ] 商店不再显示升级商品
- [ ] 游戏仍可正常启动和运行
- [ ] 所有测试通过

---

### UC 2.5: 调整赛道解锁逻辑

**优先级**: 🟡 中

**前置条件**: UC 2.1 完成（燃油系统删除）

**影响文件**:
- `systems/racing-cost-manager.js` - 删除金币扣费逻辑
- `systems/track-unlock-manager.js` - 确保只检查成就进度
- `config/track-registry.js` - 删除 cost 字段
- `views/shop-view.js` - 更新赛道选择UI
- `js/game.js` - 更新赛道选择逻辑

**实施步骤**:

1. 在 `racing-cost-manager.js` 中：
   - `canAfford()` 总是返回 true
   - `deductCost()` 总是返回成功且不扣费
   - `refund()` 空操作

2. 在 `track-unlock-manager.js` 中：
   - 确保只检查 `unlockedTracks` 列表
   - `getUnlockProgress()` 不返回 cost

3. 在 `track-registry.js` 中删除所有赛道的 `cost` 字段

4. 在 `game.js` 中：
   - 删除 `selectTrack()` 中的金币检查
   - 删除 `startRace()` 中的扣费逻辑
   - 删除 `_prepareRaceAfterCost()` 中的退款逻辑

5. 在 `shop-view.js` 中：
   - 更新赛道显示，不显示入场费
   - 删除金币不足错误处理

6. 更新测试文件

**验证清单**:
- [ ] RacingCostManager 不再扣费
- [ ] TrackUnlockManager 只检查成就进度
- [ ] 所有赛道的 cost 字段已删除
- [ ] UI 不显示入场费
- [ ] 赛道选择不再检查金币
- [ ] 所有测试通过

---

## 4. 数据迁移策略

### 4.1 迁移位置

迁移逻辑嵌入在 `core/game-state.js` 的 `#load()` 方法中。

**优点**:
- 自动触发（用户加载游戏时）
- 幂等性（可重复运行）
- 无需手动干预

### 4.2 迁移步骤

```
加载 saved 数据
  ↓
检测 version
  ↓
如果 version < 4:
  ↓
  删除 fuel 字段
  ↓
  删除 upgrades 字段
  ↓
  清理调试数据
  ↓
  设置 version = 4
  ↓
  保存数据
```

### 4.3 幂等性保证

- 迁移逻辑只检查 `version < 4`
- 多次运行结果一致
- 已迁移的数据不会被重复处理

### 4.4 多用户数据处理

- 每个用户的数据独立存储在 `wr_game_state_${userId}` 键下
- 迁移逻辑在创建 GameState 实例时触发
- 所有用户数据都会被迁移

### 4.5 数据备份

**迁移前备份**（在浏览器控制台运行）:

```javascript
const backup = {};
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  backup[key] = localStorage.getItem(key);
}
console.log(JSON.stringify(backup));
// 复制输出并保存到文件
```

**迁移后验证**:

```javascript
// 检查所有用户数据
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key.startsWith('wr_game_state_')) {
    const state = JSON.parse(localStorage.getItem(key));
    console.log(key, {
      version: state.version,
      hasFuel: 'fuel' in state,
      hasUpgrades: 'upgrades' in state,
      fuelCoins: state.fuelCoins,
      gearCoins: state.gearCoins,
    });
  }
}
```

---

## 5. 测试策略

### 5.1 单元测试

每个UC都有对应的测试用例，详见各UC的测试章节。

**重点测试文件**:
- `tests/game-state-migration-v4.test.js` - 数据迁移测试
- `tests/game-state-extended.test.js` - 删除燃油和升级测试
- `tests/game.test.js` - 游戏主逻辑测试
- `tests/car.test.js` - 删除升级效果测试
- `tests/racing-cost-manager.test.js` - 不扣费测试
- `tests/track-unlock-manager.test.js` - 只检查成就测试

### 5.2 集成测试

**测试场景**:

1. **数据迁移集成测试**:
   - 创建 v3 数据 → 加载游戏 → 验证 v4 数据
   - 验证迁移后的游戏可正常运行

2. **游戏流程测试**:
   - 答题 → 赚金币 → 选择赛道 → 比赛 → 结果
   - 验证无燃油和升级系统时游戏仍可正常运行

3. **多用户测试**:
   - 创建多个用户 → 分别迁移 → 验证数据隔离

### 5.3 向后兼容性测试

**测试用例**:

1. **v3 数据加载**:
   - 准备 v3 格式的测试数据
   - 加载游戏
   - 验证迁移成功且数据完整

2. **部分迁移**:
   - 模拟迁移中断（部分用户已迁移，部分未迁移）
   - 验证所有用户都能正确加载

### 5.4 测试命令

```bash
# 运行所有测试
npx vitest run

# 运行特定测试
npx vitest run game-state-migration-v4

# 运行覆盖率
npx vitest run --coverage
```

---

## 6. 风险识别

### 6.1 数据丢失风险

**风险**: 迁移逻辑错误导致用户数据丢失

**缓解措施**:
- 迁移前提示用户备份
- 迁移逻辑只删除废弃字段，保留其他数据
- 充分的单元测试和集成测试
- 迁移后验证数据完整性

**回滚策略**:
- 从备份文件恢复 localStorage

### 6.2 功能影响风险

**风险**: 删除燃油和升级系统影响现有功能

**缓解措施**:
- 渐进式删除（先迁移数据，再清理代码）
- 每个UC完成后立即运行测试
- 充分的回归测试

**影响功能**:
- 商店系统（删除燃油和升级商品）
- 比赛系统（删除燃油扣除）
- UI显示（删除燃油和升级显示）

### 6.3 依赖关系风险

**风险**: 未发现的依赖导致运行时错误

**缓解措施**:
- 使用 `grep` 全面搜索燃油和升级的使用位置
- 逐个文件检查和清理
- 运行完整测试套件

**关键依赖文件**:
- `js/game.js` - 游戏主逻辑
- `systems/shop-system.js` - 商店系统
- `js/car.js` - 赛车物理
- `rendering/render-system.js` - 渲染系统
- 所有 UI view 文件

### 6.4 多用户数据风险

**风险**: 迁移逻辑只处理部分用户数据

**缓解措施**:
- 迁移逻辑在 GameState 构造函数中触发
- 每个用户加载时独立迁移
- 测试多用户场景

### 6.5 测试覆盖率风险

**风险**: 测试不充分导致遗漏bug

**缓解措施**:
- 覆盖率目标 > 80%
- 重点测试迁移逻辑
- 手动测试游戏完整流程

---

## 7. Critical Files for Implementation

以下是实施 Epic 2 最关键的文件：

- `D:\CC\vibe-coding\word-racing\core\game-state.js` - 数据状态管理核心，包含迁移逻辑
- `D:\CC\vibe-coding\word-racing\js\game.js` - 游戏主逻辑，包含燃油和升级使用
- `D:\CC\vibe-coding\word-racing\js\car.js` - 赛车实体，包含升级效果应用
- `D:\CC\vibe-coding\word-racing\config\game-config.js` - 游戏配置，包含燃油和升级配置
- `D:\CC\vibe-coding\word-racing\systems\shop-system.js` - 商店系统，包含燃油和升级购买逻辑
