## Epic 3: 奖励机制调整

### 🎬 Vision

**目标**: 按新游戏机制文档调整答题奖励和比赛消耗，实现正确的金币和装备币发放。

**功能**:
- 调整答题奖励：简单题3金币、复杂题5金币
- 新增正确率奖励：100%/80%/60% 发放装备币
- 删除套题奖励、连击奖励、部分每日目标奖励
- 调整比赛消耗：统一10金币/圈
- 保留氮气购买：1装备币 = 1氮气

**作用**:
- 符合新游戏机制设计
- 每天收益控制在15圈以内
- 鼓励正确率，而非刷题量

**依赖**: Epic 2（数据清理）

**状态**: ⏸️ 待开始

---

### 📦 Use Cases

#### UC 3.1: 调整答题奖励配置

**描述**: 修改 `config/learning-config.js` 中的奖励配置

**Acceptance Criteria**:
- [ ] 修改 `REWARDS.perCorrectSimple`: `{ fuel: 3, gear: 0 }`
- [ ] 修改 `REWARDS.perCorrectComplex`: `{ fuel: 5, gear: 0 }`
- [ ] 删除 `REWARDS.perQuizComplete`
- [ ] 删除 `REWARDS.combo`
- [ ] 新增 `REWARDS.accuracyBonus`:
  ```javascript
  accuracyBonus: {
    100: { gear: 3 },  // 100%正确率
    80: { gear: 2 },   // ≥80%
    60: { gear: 1 },   // ≥60%
  }
  ```
- [ ] 修改 `REWARDS.dailyGoals`:
  - 删除 `allThree`
  - 删除 `newWords10`
  - 保留 `accuracy80` 改为 `accuracy100` 和 `accuracy80`
  ```javascript
  dailyGoals: {
    accuracy100: { fuel: 30 },  // 当日全对
    accuracy80: { fuel: 20 },   // 当日≥80%
  }
  ```

**测试文件**: `tests/learning-config.test.js`（新增）

**状态**: ⏸️ 待开始

---

#### UC 3.2: 修改LearningController答题奖励逻辑

**描述**: 修改 `learning/learning-controller.js` 中的 `submitAnswer()` 方法

**Acceptance Criteria**:
- [ ] 删除套题奖励发放逻辑
- [ ] 删除连击奖励发放逻辑
- [ ] 修改答题奖励为：
  - 简单题答对：`fuelCoins = 3`
  - 复杂题答对：`fuelCoins = 5`
- [ ] 保存答案时传递正确的金币和装备币

**代码示例**:
```javascript
submitAnswer(selectedIndex) {
  const question = this.getCurrentQuestion();
  if (!question || question.answered) return null;

  const correct = selectedIndex === question.correctIndex;
  let fuelCoins = 0;
  let gearCoins = 0;

  // 新逻辑：只看题型，不看连击
  if (correct) {
    if (isSimpleMode(question.mode)) {
      fuelCoins = REWARDS.perCorrectSimple.fuel;  // 3
    } else {
      fuelCoins = REWARDS.perCorrectComplex.fuel;  // 5
    }
  }

  const result = this.#sessionManager.saveAnswer({
    correct,
    fuelCoins,
    gearCoins,
  });

  // 更新单词进度...
  // 更新每日进度...
}
```

**测试文件**: `tests/learning-controller.test.js`（更新）

**状态**: ⏸️ 待开始

---

#### UC 3.3: 实现正确率奖励逻辑

**描述**: 在 `learning/learning-controller.js` 的 `completeQuiz()` 方法中添加正确率奖励

**Acceptance Criteria**:
- [ ] 计算套题正确率：`correctCount / totalQuestions`
- [ ] 根据正确率发放装备币：
  - 100%：+3装备币
  - ≥80%：+2装备币
  - ≥60%：+1装备币
- [ ] 更新 `gearCoins` 到 GameState
- [ ] 发送事件通知UI显示奖励

**代码示例**:
```javascript
completeQuiz() {
  const result = this.#sessionManager.completeQuiz();
  if (!result) return null;

  const accuracy = result.correctCount / result.totalQuestions;
  let accuracyBonus = { gear: 0 };

  if (accuracy >= 1.0) {
    accuracyBonus = REWARDS.accuracyBonus[100];
  } else if (accuracy >= 0.8) {
    accuracyBonus = REWARDS.accuracyBonus[80];
  } else if (accuracy >= 0.6) {
    accuracyBonus = REWARDS.accuracyBonus[60];
  }

  if (accuracyBonus.gear > 0) {
    this.#gameState.modify('gearCoins', accuracyBonus.gear);
  }

  // 检查成就...
  // 更新UI...
}
```

**测试文件**: `tests/learning-controller.test.js`（更新）

**状态**: ⏸️ 待开始

---

#### UC 3.4: 修改每日目标奖励逻辑

**描述**: 修改 `learning/daily-manager.js` 的 `settleDailyRewards()` 方法

**Acceptance Criteria**:
- [ ] 删除"完成三套"奖励检查
- [ ] 删除"新词10个"奖励检查
- [ ] 修改正确率奖励逻辑：
  - 当日所有套题全部答对（100%）：+30金币
  - 当日整体正确率≥80%：+20金币
  - 取最高奖励，不重复发放
- [ ] 发送事件通知UI

**代码示例**:
```javascript
settleDailyRewards() {
  const progress = this.getTodayProgress();
  const totalCorrect = progress.correctAnswers;
  const totalQuestions = progress.totalQuestions;
  const accuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

  let rewards = { fuel: 0, gear: 0 };
  let achieved = [];

  // 检查是否全对
  const allCorrect = this.#checkAllCorrect();  // 新增方法

  if (allCorrect) {
    rewards.fuel += REWARDS.dailyGoals.accuracy100.fuel;
    achieved.push('accuracy100');
  } else if (accuracy >= 0.8) {
    rewards.fuel += REWARDS.dailyGoals.accuracy80.fuel;
    achieved.push('accuracy80');
  }

  // 发放奖励...
}
```

**测试文件**: `tests/daily-manager.test.js`（更新）

**状态**: ⏸️ 待开始

---

#### UC 3.5: 调整比赛消耗逻辑

**描述**: 修改比赛入场费逻辑，统一为10金币/圈

**Acceptance Criteria**:
- [ ] 修改 `js/game.js` 中的入场费计算：
  ```javascript
  const cost = selectedLaps * 10;  // 圈数 × 10金币
  ```
- [ ] 删除按赛道不同价格的逻辑
- [ ] 删除 `RacingCostManager` 的使用（或改为空实现）
- [ ] 修改 `views/track-selection-view.js`：
  - 显示"每圈消耗10金币"
  - 允许选择圈数（1-10圈）
  - 显示总费用 = 圈数 × 10

**影响文件**:
- `js/game.js`
- `views/track-selection-view.js`
- `config/track-registry.js`（删除cost字段）

**测试文件**: `tests/game.test.js`（更新）

**状态**: ⏸️ 待开始

---

#### UC 3.6: 创建奖励计算测试

**描述**: 创建完整的奖励计算测试，验证所有场景

**Acceptance Criteria**:
- [ ] 测试场景1：一套题全对
  - 5简单 + 5复杂全对
  - 期望收益：40金币 + 3装备币
- [ ] 测试场景2：一套题答对8题（80%）
  - 期望收益：32金币 + 2装备币
- [ ] 测试场景3：每天完成3套题，全部答对
  - 期望收益：150金币 + 9装备币
- [ ] 测试场景4：每天完成3套题，正确率80%
  - 期望收益：120金币（约）+ 6装备币（约）+ 20金币每日奖励
- [ ] 测试场景5：比赛消耗
  - 跑3圈：消耗30金币
  - 跑10圈：消耗100金币

**测试文件**: `tests/reward-calculation.test.js`（新增）

**状态**: ⏸️ 待开始

---

#### UC 3.7: 更新UI显示

**描述**: 更新所有UI组件，显示正确的奖励信息

**Acceptance Criteria**:
- [ ] 答题页面：
  - 显示每题奖励（简单题+3金币，复杂题+5金币）
  - 完成套题时显示正确率奖励（装备币）
- [ ] 学习报告页面：
  - 显示今日收益（金币、装备币）
  - 显示正确率
- [ ] 赛道选择页面：
  - 显示"每圈消耗10金币"
  - 显示圈数选择器（1-10圈）
  - 显示总费用
- [ ] 首页：
  - 显示当前金币、装备币、氮气

**影响文件**:
- `ui/learning-ui.js`
- `views/home-view.js`
- `views/track-selection-view.js`

**测试**: 手动验证UI显示正确

**状态**: ⏸️ 待开始

---

### ✅ Definition of Done

**代码完成**:
- [ ] 所有UC的AC全部勾选
- [ ] 无console错误或警告
- [ ] 所有废弃代码已删除

**测试完成**:
- [ ] 所有测试用例通过（`npx vitest run`）
- [ ] 测试覆盖率 > 80%
- [ ] 奖励计算测试覆盖所有场景
- [ ] 手动验证：答题收益符合预期

**文档完成**:
- [ ] 更新本Epic状态为 ✅
- [ ] 更新 `game-mechanics-v2.md` 中的奖励示例
- [ ] Git历史清晰，每个UC独立commit

---

### 🧪 Test Cases

#### TC 3.1: 答题奖励计算

```javascript
describe('Reward calculation - new mechanism', () => {
  it('should reward 40 fuel + 3 gear for perfect quiz', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus, 'test_user');
    const learningController = new LearningController(eventBus, 'test_user');
    learningController.init(mockWordSet);

    // 开始一套题
    learningController.startNewQuiz();

    // 模拟10题全对（5简单+5复杂）
    for (let i = 0; i < 10; i++) {
      const question = learningController.getCurrentQuestion();
      const correctIndex = question.correctIndex;
      learningController.submitAnswer(correctIndex);
    }

    // 完成套题
    learningController.completeQuiz();

    // 验证收益
    expect(gameState.get('fuelCoins')).toBe(40);  // 5×3 + 5×5
    expect(gameState.get('gearCoins')).toBe(3);   // 100%正确率奖励
  });

  it('should reward 32 fuel + 2 gear for 80% accuracy', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus, 'test_user');
    const learningController = new LearningController(eventBus, 'test_user');
    learningController.init(mockWordSet);

    learningController.startNewQuiz();

    // 模拟答对8题（80%）
    let correctCount = 0;
    for (let i = 0; i < 10; i++) {
      const question = learningController.getCurrentQuestion();
      if (correctCount < 8) {
        learningController.submitAnswer(question.correctIndex);
        correctCount++;
      } else {
        learningController.submitAnswer((question.correctIndex + 1) % 4);
      }
    }

    learningController.completeQuiz();

    // 验证收益（假设答对4简单+4复杂）
    expect(gameState.get('fuelCoins')).toBe(32);  // 4×3 + 4×5
    expect(gameState.get('gearCoins')).toBe(2);   // 80%正确率奖励
  });
});
```

#### TC 3.2: 每日目标奖励

```javascript
describe('Daily goal rewards', () => {
  it('should reward 30 fuel for 100% accuracy', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus, 'test_user');
    const dailyManager = new DailyManager(eventBus, gameState, 'test_user');

    // 模拟3套题全对
    for (let i = 0; i < 3; i++) {
      dailyManager.completeQuiz({
        totalQuestions: 10,
        correctCount: 10,
        fuelCoins: 40,
        gearCoins: 3,
      });
    }

    const result = dailyManager.settleDailyRewards();

    expect(result.rewards.fuel).toBe(30);
    expect(result.achieved).toContain('accuracy100');
  });

  it('should reward 20 fuel for 80% accuracy', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus, 'test_user');
    const dailyManager = new DailyManager(eventBus, gameState, 'test_user');

    // 模拟3套题，正确率80%
    for (let i = 0; i < 3; i++) {
      dailyManager.completeQuiz({
        totalQuestions: 10,
        correctCount: 8,
        fuelCoins: 32,
        gearCoins: 2,
      });
    }

    const result = dailyManager.settleDailyRewards();

    expect(result.rewards.fuel).toBe(20);
    expect(result.achieved).toContain('accuracy80');
  });
});
```

#### TC 3.3: 比赛消耗

```javascript
describe('Race cost - per lap', () => {
  it('should cost 30 fuel for 3 laps', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus, 'test_user');
    gameState.set('fuelCoins', 100);

    // 选择3圈
    const laps = 3;
    const cost = laps * 10;

    gameState.modify('fuelCoins', -cost);

    expect(gameState.get('fuelCoins')).toBe(70);
  });

  it('should not allow race if insufficient fuel', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus, 'test_user');
    gameState.set('fuelCoins', 20);

    const laps = 3;
    const cost = laps * 10;

    const canAfford = gameState.get('fuelCoins') >= cost;
    expect(canAfford).toBe(false);
  });
});
```

---

### 📝 技术注意事项

1. **正确率计算**: 使用 `(correctCount / totalQuestions).toFixed(2)` 避免浮点误差
2. **装备币奖励**: 只在套题完成时发放，不在每题发放
3. **每日目标**: 取最高奖励，不重复发放（全对奖励30金币，不叠加80%的20金币）
4. **圈数限制**: 1-10圈，UI需要验证输入
5. **氮气购买**: 保持1:1兑换，不受此Epic影响

---

### 📊 收益验证表

| 场景 | 金币收益 | 装备币收益 | 可跑圈数 |
|------|---------|-----------|---------|
| 一套题全对 | 40 | 3 | 4圈 |
| 一套题80% | 32 | 2 | 3圈 |
| 一套题60% | 24 | 1 | 2圈 |
| 3套全对（含每日奖励） | 150 | 9 | 15圈 |
| 3套80%（含每日奖励） | 120 | 6 | 12圈 |
