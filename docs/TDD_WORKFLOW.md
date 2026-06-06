# TDD 开发流程 - 赛道解锁系统

> 基于 tdd-workflow skill，采用测试驱动开发，确保代码质量和测试覆盖率。

## 开发循环：Red → Green → Refactor

### Phase 1: 基础架构

#### 1.1 成就定义 (config/achievements.js)

**Red - 先写测试**:
```javascript
// tests/achievements.test.js
describe('Achievements Config', () => {
  it('should define required achievement fields', () => {
    const achievements = Object.values(ACHIEVEMENTS);
    achievements.forEach(ach => {
      expect(ach).toHaveProperty('id');
      expect(ach).toHaveProperty('name');
      expect(ach).toHaveProperty('description');
      expect(ach).toHaveProperty('check');
      expect(ach).toHaveProperty('reward');
    });
  });

  it('should have valid check function', () => {
    const state = { learning: { totalQuizzes: 1 } };
    const firstQuiz = ACHIEVEMENTS['first-quiz'];
    expect(firstQuiz.check(state)).toBe(true);
  });
});
```

**Green - 实现最小代码**:
```javascript
// config/achievements.js
export const ACHIEVEMENTS = {
  'first-quiz': {
    id: 'first-quiz',
    name: '初次上阵',
    description: '完成第一套题',
    check: (state) => state.learning.totalQuizzes >= 1,
    reward: { track: 'shanghai-2d' }
  }
};
```

**Refactor - 优化代码**:
- 添加更多成就
- 优化检查逻辑
- 添加 JSDoc 注释

---

#### 1.2 赛道注册表 (config/track-registry.js)

**Red - 先写测试**:
```javascript
// tests/track-registry.test.js
describe('Track Registry', () => {
  it('should define required track fields', () => {
    const tracks = Object.values(TRACK_REGISTRY);
    tracks.forEach(track => {
      expect(track).toHaveProperty('id');
      expect(track).toHaveProperty('name');
      expect(track).toHaveProperty('type');
      expect(track).toHaveProperty('cost');
    });
  });

  it('should have default track shanghai-2d', () => {
    expect(TRACK_REGISTRY['shanghai-2d']).toBeDefined();
    expect(TRACK_REGISTRY['shanghai-2d'].type).toBe('2d');
  });
});
```

**Green - 实现最小代码**:
```javascript
// config/track-registry.js
export const TRACK_REGISTRY = {
  'shanghai-2d': {
    id: 'shanghai-2d',
    name: '上海国际赛车场',
    type: '2d',
    description: '经典F1赛道',
    cost: 10,
    waypoints: [],
    trackWidth: 76
  }
};
```

---

#### 1.3 成就管理器 (systems/achievement-manager.js)

**Red - 先写测试**:
```javascript
// tests/achievement-manager.test.js
describe('AchievementManager', () => {
  let eventBus, gameState, manager;

  beforeEach(() => {
    eventBus = new EventBus();
    gameState = new GameState(eventBus);
    manager = new AchievementManager(eventBus, gameState);
  });

  describe('checkAll()', () => {
    it('should unlock achievement when condition met', () => {
      gameState.set('learning.totalQuizzes', 1);
      manager.checkAll();
      expect(gameState.get('achievements')).toContain('first-quiz');
    });

    it('should not unlock achievement when condition not met', () => {
      gameState.set('learning.totalQuizzes', 0);
      manager.checkAll();
      expect(gameState.get('achievements')).not.toContain('first-quiz');
    });
  });
});
```

**Green - 实现最小代码**:
```javascript
// systems/achievement-manager.js
export class AchievementManager {
  #eventBus;
  #gameState;

  constructor(eventBus, gameState) {
    this.#eventBus = eventBus;
    this.#gameState = gameState;
  }

  checkAll() {
    const state = this.#gameState.getAll();
    const unlocked = state.achievements || [];

    for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
      if (unlocked.includes(id)) continue;
      if (achievement.check(state)) {
        this.#unlock(achievement);
      }
    }
  }

  #unlock(achievement) {
    const state = this.#gameState.getAll();
    state.achievements.push(achievement.id);
    this.#gameState.set('achievements', state.achievements);
  }
}
```

**Refactor - 优化**:
- 添加错误处理
- 添加事件发送
- 添加奖励发放逻辑

---

#### 1.4 GameState 扩展

**Red - 先写测试**:
```javascript
// tests/game-state.test.js (扩展)
describe('GameState - Achievement Fields', () => {
  it('should initialize achievements with empty array', () => {
    const state = new GameState(new EventBus());
    expect(state.get('achievements')).toEqual([]);
  });

  it('should migrate old saves without achievements', () => {
    const oldSave = { fuel: 100, version: 2 };
    localStorage.setItem('wr_game_state', JSON.stringify(oldSave));

    const state = new GameState(new EventBus());
    expect(state.get('achievements')).toEqual([]);
    expect(state.get('unlockedTracks')).toEqual(['shanghai-2d']);
  });
});
```

**Green - 实现最小代码**:
```javascript
// core/game-state.js (改动)
const DEFAULT_STATE = {
  // ... 现有字段 ...
  achievements: [],
  unlockedTracks: ['shanghai-2d'],
  selectedTrackId: 'shanghai-2d',
  learning: {
    // ... 现有字段 ...
    lastPerfectQuiz: false
  }
};

#load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);

      // 兼容性迁移
      if (!parsed.achievements) parsed.achievements = [];
      if (!parsed.unlockedTracks) parsed.unlockedTracks = ['shanghai-2d'];
      if (!parsed.selectedTrackId) parsed.selectedTrackId = 'shanghai-2d';

      this.#state = { ...this.#deepClone(DEFAULT_STATE), ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load game state:', e);
  }
}
```

---

### Phase 2: 集成测试

#### 2.1 LearningController 集成

**Red - 先写集成测试**:
```javascript
// tests/integration/achievement-flow.test.js
describe('Achievement Flow Integration', () => {
  it('should unlock achievement after completing quiz', () => {
    const controller = new LearningController();
    controller.init(mockWordSet, { skipUI: true });

    // 完成一套题
    controller.startQuiz();
    for (let i = 0; i < 10; i++) {
      controller.submitAnswer(0);
    }

    // 验证成就解锁
    const achievements = controller.getAchievements();
    expect(achievements.find(a => a.id === 'first-quiz').unlocked).toBe(true);
  });
});
```

**Green - 实现集成代码**:
```javascript
// learning/learning-controller.js (改动)
import { AchievementManager } from '../systems/achievement-manager.js';

constructor() {
  // ... 现有代码 ...
  this.#achievementManager = new AchievementManager(this.#eventBus, this.#gameState);
}

submitAnswer(index) {
  const result = this.#sessionManager.submitAnswer(index);

  // 检查是否全对
  if (this.#sessionManager.isComplete()) {
    const stats = this.#sessionManager.getStats();
    this.#gameState.set('learning.lastPerfectQuiz', stats.correct === stats.total);
  }

  // 检查成就
  this.#achievementManager.checkAll();

  return result;
}
```

---

## 测试清单对照法

每个 Use Case 实现后，执行测试清单：

### UC-01: 成就解锁检查
```
✓ AchievementManager.checkAll() 能正确检查条件
✓ LearningController.submitAnswer() 会调用 checkAll()
✓ 解锁后更新 GameState.achievements
✓ 解锁赛道后更新 GameState.unlockedTracks
✓ 发送 Events.ACHIEVEMENT_UNLOCKED 事件
✗ UI 显示 Toast 通知（需要浏览器环境，后续测试）
```

### UC-02: 赛道选择
```
✓ Game.selectTrack() 检查解锁状态
✓ Game.selectTrack() 检查金币余额
✓ 选择后更新 GameState.selectedTrackId
✗ 未解锁赛道点击无反应（UI测试）
✗ 金币不足时按钮 disabled（UI测试）
```

---

## 持续改进

**每次测试失败后**：
1. 记录到 ISSUE_LOG.md
2. 分析根本原因
3. 添加预防措施到检查清单
4. 更新测试设计原则

**每次重构后**：
1. 确保所有测试仍然通过
2. 检查测试覆盖率是否下降
3. 更新 ISSUE_LOG.md 的预防措施

---

## 验收标准

每个 Phase 完成后：
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 测试覆盖率 > 90%
- [ ] 无新增 ISSUE_LOG 条目
- [ ] 代码符合 coding-standards
- [ ] 通过 security-review（如适用）
