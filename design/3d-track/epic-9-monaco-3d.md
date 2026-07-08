## Epic 9: 3D 蒙特卡洛赛道与赛道解锁条件重构

### 🎬 Vision

**目标**: 新增 `monaco-3d` 3D 赛道（复用 monaco-2d waypoints + 独有 sceneConfig），同时重构 3D 赛道解锁条件：从基于掌握单词数改为基于累计完成 quiz 套数。上海 3D 需要 20 套，蒙特卡洛 3D 需要 50 套。

**功能**:
- 在 `track-registry.js` 中注册 `monaco-3d`（含场景配置、解锁条件）
- 修改 `shanghai-3d` 解锁条件：`masteryCount: 200` → `quizzesCompleted: 20`
- 新增成就：`quiz-master-20` → 解锁 `shanghai-3d`
- 新增成就：`quiz-master-50` → 解锁 `monaco-3d`
- 调整 `word-master-100` 成就奖励（不再解锁赛道）

**作用**:
- 对齐解锁逻辑与答题进度，而非单词掌握量
- 3D 赛道是游戏体验升级奖励，解锁门槛应与游戏活跃度（答题量）挂钩
- 蒙特卡洛 3D 的高门槛（50 套）保证了玩家有足够游戏经验后才进入终极赛道

**依赖**: Epic 2（track-registry 已有 3D 赛道注册基础）、Epic 6+7（3D 赛道功能完整可用）

**状态**: ⏸️ 未开始

---

### 📦 Use Cases

#### UC 9.1: 修改 shanghai-3d 解锁条件（mastery → quizzes）

**描述**: 将 `shanghai-3d` 的解锁条件从 `masteryCount: 200` 改为 `quizzesCompleted: 20`。更新 `track-registry.js` 配置。

**Acceptance Criteria**:
- [ ] `track-registry.js` 中 `shanghai-3d.unlockRequirements` 改为 `{ quizzesCompleted: 20 }`
- [ ] 删除 `masteryCount` 字段
- [ ] 现有 `shanghai-3d` 的 `waypoints`、`trackWidth`、`sceneConfig`、`type` 保持不变
- [ ] `TrackUnlockManager.getUnlockProgress('shanghai-3d')` 返回的进度中 `quizzesCompleted.required` 为 20

**影响文件**:
- `config/track-registry.js`

**测试文件**: `tests/config/track-registry.test.js`

**状态**: ⏸️ 未开始

---

#### UC 9.2: 新增 monaco-3d 赛道注册

**描述**: 在 `track-registry.js` 中添加 `monaco-3d` 赛道，复用 `monaco-2d` 的 waypoints，添加 3D 场景配置。

**Acceptance Criteria**:
- [ ] `TRACK_REGISTRY` 新增 `'monaco-3d'` 条目
- [ ] `id`: `'monaco-3d'`
- [ ] `name`: `'Monte Carlo Street Circuit 3D'`
- [ ] `type`: `'3d'`
- [ ] `description`: `'Narrow street circuit with hairpins and tunnel'`
- [ ] `waypoints`: 复用 `monaco-2d` 全部 waypoints（14 个点，含发卡弯和隧道区）
- [ ] `trackWidth`: `50`（与 monaco-2d 一致的窄街道）
- [ ] `unlockRequirements`: `{ quizzesCompleted: 50 }`
- [ ] `sceneConfig` 包含摄像机、光照、特殊标记（地中海日照、街道赛氛围）
- [ ] 现有 `monaco-2d` 配置完全不变

**`monaco-3d` 配置**:
```javascript
'monaco-3d': {
  id: 'monaco-3d',
  name: 'Monte Carlo Street Circuit 3D',
  type: '3d',
  description: 'Narrow street circuit with hairpins and tunnel',
  waypoints: [
    { x: 200, y: 100 }, { x: 380, y: 105 },
    { x: 480, y: 130 }, { x: 540, y: 200 },
    { x: 560, y: 280 }, { x: 620, y: 320 },
    { x: 740, y: 340 }, { x: 830, y: 370 },
    { x: 850, y: 430 }, { x: 880, y: 500 },
    { x: 920, y: 550 }, { x: 935, y: 590 },
    { x: 900, y: 620 }, { x: 830, y: 600 },
    { x: 760, y: 570 }, { x: 700, y: 590 },
    { x: 640, y: 630 }, { x: 580, y: 670 },
    { x: 520, y: 640 }, { x: 460, y: 670 },
    { x: 400, y: 700 }, { x: 340, y: 730 },
    { x: 270, y: 710 }, { x: 230, y: 740 },
    { x: 170, y: 700 }, { x: 140, y: 630 },
    { x: 120, y: 570 }, { x: 160, y: 510 },
    { x: 250, y: 450 }, { x: 230, y: 340 },
    { x: 230, y: 220 }
  ],
  trackWidth: 50,
  unlockRequirements: {
    quizzesCompleted: 50
  },
  sceneConfig: {
    camera: {
      fov: 75,
      near: 0.1,
      far: 2000,
      position: [700, 500, 800]
    },
    lighting: {
      ambientColor: 0x707070,
      directionalColor: 0xfff5e6,
      directionalPosition: [500, 700, 300]
    },
    ambient: {
      skyColor: 0x87CEEB,
      hazeColor: 0xcce0ff,
      groundColor: 0x8B7355
    }
  }
}
```

**设计说明**:
- 摄像机位置比上赛更低（y=500 vs 上赛 y=650），营造街道赛的压迫感
- 暖色调光线（`0xfff5e6`）模拟地中海日照
- trackWidth=50 体现蒙特卡洛街道赛极窄特征（上赛 90）
- 保留所有发卡弯 waypoints（Grand Hotel 发卡、Rascasse 发卡）
- 后续可由 TrackBuilder 在隧道段添加半透明顶棚装饰

**影响文件**:
- `config/track-registry.js`

**测试文件**: `tests/config/track-registry.test.js`

**状态**: ⏸️ 未开始

---

#### UC 9.3: 新增成就 quiz-master-20（解锁上海 3D）

**描述**: 在 `config/achievements.js` 中新增成就，累计完成 20 套 quiz 解锁 `shanghai-3d`。

**Acceptance Criteria**:
- [ ] 新增成就 `'quiz-master-20'`
- [ ] `name`: `'Quiz Streak 20'`
- [ ] `description`: `'Complete 20 quizzes.'`
- [ ] `check`: `(state) => (state.learning?.totalQuizzes || 0) >= 20`
- [ ] `reward`: `{ track: 'shanghai-3d' }`
- [ ] 成就列表顺序：排在 `quiz-master-10` 之后、`word-collector-50` 之前

**成就配置**:
```javascript
'quiz-master-20': {
  id: 'quiz-master-20',
  name: 'Quiz Streak 20',
  description: 'Complete 20 quizzes.',
  check: (state) => (state.learning?.totalQuizzes || 0) >= 20,
  reward: { track: 'shanghai-3d' }
}
```

**影响文件**:
- `config/achievements.js`

**测试文件**: `tests/config/achievements.test.js`

**状态**: ⏸️ 未开始

---

#### UC 9.4: 新增成就 quiz-master-50（解锁蒙特卡洛 3D）

**描述**: 在 `config/achievements.js` 中新增成就，累计完成 50 套 quiz 解锁 `monaco-3d`。

**Acceptance Criteria**:
- [ ] 新增成就 `'quiz-master-50'`
- [ ] `name`: `'Quiz Streak 50'`
- [ ] `description`: `'Complete 50 quizzes.'`
- [ ] `check`: `(state) => (state.learning?.totalQuizzes || 0) >= 50`
- [ ] `reward`: `{ track: 'monaco-3d' }`
- [ ] 成就列表顺序：排在 `word-master-100` 之后、`perfect-streak` 之前

**成就配置**:
```javascript
'quiz-master-50': {
  id: 'quiz-master-50',
  name: 'Quiz Streak 50',
  description: 'Complete 50 quizzes.',
  check: (state) => (state.learning?.totalQuizzes || 0) >= 50,
  reward: { track: 'monaco-3d' }
}
```

**影响文件**:
- `config/achievements.js`

**测试文件**: `tests/config/achievements.test.js`

**状态**: ⏸️ 未开始

---

#### UC 9.5: 调整 word-master-100 成就奖励

**描述**: `word-master-100` 不再解锁赛道，改为燃油币奖励。因为 `shanghai-3d` 的解锁已移交给 `quiz-master-20`。

**Acceptance Criteria**:
- [ ] `word-master-100` 的 `reward` 从 `{ track: 'shanghai-3d' }` 改为 `{ fuelCoins: 100 }`
- [ ] 成就不删除：保留 `name`、`description`、`check` 不变
- [ ] 成就 ID `'word-master-100'` 保持不变

**影响文件**:
- `config/achievements.js`

**测试文件**: `tests/config/achievements.test.js`

**状态**: ⏸️ 未开始

---

#### UC 9.6: 更新 unlockRequirements 对齐检查

**描述**: 确保 `track-registry.js` 中所有 3D 赛道的 `unlockRequirements` 与对应成就的检查逻辑一致。

**Acceptance Criteria**:
- [ ] `shanghai-3d.unlockRequirements` = `{ quizzesCompleted: 20 }` ↔ `quiz-master-20.check()` 检查 `totalQuizzes >= 20`
- [ ] `monaco-3d.unlockRequirements` = `{ quizzesCompleted: 50 }` ↔ `quiz-master-50.check()` 检查 `totalQuizzes >= 50`
- [ ] `TrackUnlockManager.getUnlockProgress()` 的 `quizzesCompleted.current` 读取 `learning.totalQuizzes`
- [ ] 通过 `TrackUnlockManager.isUnlocked()` 验证：已解锁用户判断正确

**影响文件**:
- `config/track-registry.js`
- `config/achievements.js`

**测试文件**: `tests/systems/track-unlock-manager.test.js`

**状态**: ⏸️ 未开始

---

### ✅ Definition of Done

**代码完成**:
- [ ] 所有 UC 的 AC 全部勾选
- [ ] `monaco-3d` 已在 `track-registry.js` 中注册，包含完整 sceneConfig
- [ ] `shanghai-3d` 解锁条件已改为 `quizzesCompleted: 20`
- [ ] 三个成就（quiz-master-20, quiz-master-50, word-master-100 调整）配置正确
- [ ] 现有 2D 赛道和成就完全不变

**测试完成**:
- [ ] `npx vitest run` 全部通过（无回归）
- [ ] 新成就的单元测试覆盖 check 函数和 reward
- [ ] TrackUnlockManager 对新 unlockRequirements 的 getUnlockProgress 正确
- [ ] 手动验证：答题完成后成就按正确顺序解锁（20套→上海3D，50套→蒙特卡洛3D）

**文档完成**:
- [ ] 更新本 Epic 状态为 ✅
- [ ] 更新 `design/3d-track/README.md` 添加本 Epic 条目
- [ ] Git 提交：`feat(epic-9): add monaco-3d track and refactor unlock conditions`

---

### 🧪 Test Cases

#### TC 9.1: shanghai-3d 解锁条件验证

```javascript
describe('shanghai-3d unlock - quizzes based', () => {
  it('should be locked when quizzes < 20', () => {
    const state = new GameState(mockEventBus, 'test_user');
    state.set('learning', { totalQuizzes: 19, totalWordsMastered: 0 });

    const unlockManager = new TrackUnlockManager(mockEventBus, state);
    // 此时 unlockedTracks 只有 'shanghai-2d'（默认）
    expect(unlockManager.isUnlocked('shanghai-3d')).toBe(false);
  });

  it('should show progress with quizzesCompleted', () => {
    const state = new GameState(mockEventBus, 'test_user');
    state.set('learning', { totalQuizzes: 15 });

    const unlockManager = new TrackUnlockManager(mockEventBus, state);
    const progress = unlockManager.getUnlockProgress('shanghai-3d');

    expect(progress.requirements.quizzesCompleted.current).toBe(15);
    expect(progress.requirements.quizzesCompleted.required).toBe(20);
  });
});
```

#### TC 9.2: monaco-3d 赛道注册验证

```javascript
describe('track-registry monaco-3d', () => {
  it('should have monaco-3d registered', () => {
    const track = TRACK_REGISTRY['monaco-3d'];
    expect(track).toBeDefined();
    expect(track.id).toBe('monaco-3d');
    expect(track.type).toBe('3d');
  });

  it('should reuse monaco-2d waypoints', () => {
    const monaco3d = TRACK_REGISTRY['monaco-3d'];
    const monaco2d = TRACK_REGISTRY['monaco-2d'];
    expect(monaco3d.waypoints).toEqual(monaco2d.waypoints);
  });

  it('should have narrower trackWidth for street circuit', () => {
    const track = TRACK_REGISTRY['monaco-3d'];
    expect(track.trackWidth).toBe(50);
  });

  it('should have sceneConfig with camera and lighting', () => {
    const track = TRACK_REGISTRY['monaco-3d'];
    expect(track.sceneConfig).toBeDefined();
    expect(track.sceneConfig.camera).toBeDefined();
    expect(track.sceneConfig.lighting).toBeDefined();
  });

  it('should not modify monaco-2d', () => {
    const monaco2d = TRACK_REGISTRY['monaco-2d'];
    expect(monaco2d.sceneConfig).toBeUndefined();
    expect(monaco2d.type).toBe('2d');
  });
});
```

#### TC 9.3: 新成就验证

```javascript
describe('quiz-master-20 achievement', () => {
  it('should not unlock before 20 quizzes', () => {
    const state = { learning: { totalQuizzes: 19 } };
    expect(ACHIEVEMENTS['quiz-master-20'].check(state)).toBe(false);
  });

  it('should unlock at exactly 20 quizzes', () => {
    const state = { learning: { totalQuizzes: 20 } };
    expect(ACHIEVEMENTS['quiz-master-20'].check(state)).toBe(true);
  });

  it('should reward shanghai-3d track', () => {
    expect(ACHIEVEMENTS['quiz-master-20'].reward.track).toBe('shanghai-3d');
  });
});

describe('quiz-master-50 achievement', () => {
  it('should not unlock before 50 quizzes', () => {
    const state = { learning: { totalQuizzes: 49 } };
    expect(ACHIEVEMENTS['quiz-master-50'].check(state)).toBe(false);
  });

  it('should unlock at exactly 50 quizzes', () => {
    const state = { learning: { totalQuizzes: 50 } };
    expect(ACHIEVEMENTS['quiz-master-50'].check(state)).toBe(true);
  });

  it('should reward monaco-3d track', () => {
    expect(ACHIEVEMENTS['quiz-master-50'].reward.track).toBe('monaco-3d');
  });
});

describe('word-master-100 adjusted reward', () => {
  it('should still check mastery >= 100', () => {
    const state = { learning: { totalWordsMastered: 100 } };
    expect(ACHIEVEMENTS['word-master-100'].check(state)).toBe(true);
  });

  it('should no longer unlock a track', () => {
    expect(ACHIEVEMENTS['word-master-100'].reward.track).toBeUndefined();
  });

  it('should reward fuelCoins instead', () => {
    expect(ACHIEVEMENTS['word-master-100'].reward.fuelCoins).toBe(100);
  });
});
```

#### TC 9.4: 集成测试 - 成就触发赛道解锁

```javascript
describe('achievement triggers track unlock', () => {
  beforeEach(() => {
    // 清理 localStorage
    localStorage.clear();
  });

  it('should unlock shanghai-3d when quiz-master-20 fires', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus, 'test_user');
    const achievementManager = new AchievementManager(eventBus, gameState);

    // 模拟 learning 数据
    const startState = gameState.get('learning') || {};
    gameState.set('learning', { ...startState, totalQuizzes: 20 });

    // 触发成就检查
    achievementManager.checkAll();

    const unlockedTracks = gameState.get('unlockedTracks') || [];
    expect(unlockedTracks).toContain('shanghai-3d');
    expect(unlockedTracks).not.toContain('monaco-3d');
  });

  it('should unlock monaco-3d when quiz-master-50 fires', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus, 'test_user');
    const achievementManager = new AchievementManager(eventBus, gameState);

    const startState = gameState.get('learning') || {};
    gameState.set('learning', { ...startState, totalQuizzes: 50 });

    achievementManager.checkAll();

    const unlockedTracks = gameState.get('unlockedTracks') || [];
    expect(unlockedTracks).toContain('shanghai-3d');
    expect(unlockedTracks).toContain('monaco-3d');
  });
});
```

#### TC 9.5: 无回归检查

```javascript
describe('no regression on existing tracks', () => {
  it('should still unlock monaco-2d at 10 quizzes', () => {
    const state = { learning: { totalQuizzes: 10 } };
    expect(ACHIEVEMENTS['quiz-master-10'].check(state)).toBe(true);
    expect(ACHIEVEMENTS['quiz-master-10'].reward.track).toBe('monaco-2d');
  });

  it('should still unlock silverstone-2d at mastery 50', () => {
    const state = { learning: { totalWordsMastered: 50 } };
    expect(ACHIEVEMENTS['word-collector-50'].check(state)).toBe(true);
    expect(ACHIEVEMENTS['word-collector-50'].reward.track).toBe('silverstone-2d');
  });

  it('should still default unlock shanghai-2d', () => {
    const state = new GameState(mockEventBus, 'test_user');
    expect(state.get('unlockedTracks')).toContain('shanghai-2d');
  });
});
```

---

### 📝 技术注意事项

1. **unlockRequirements vs 成就 reward.track 对齐**: `track-registry.js` 中的 `unlockRequirements` 用于 UI 进度显示，`achievements.js` 的 `reward.track` 用于实际解锁。两者必须对齐，否则 UI 显示门槛与实际解锁条件不一致（参考 ISSUE_LOG #003）。

2. **word-master-100 不删除**: 该成就保留，只改奖励类型（赛道→金币）。玩家已解锁的 `word-master-100` 不丢失，已解锁的 `shanghai-3d` 不收回。

3. **数据兼容性**:
   - 已解锁 `shanghai-3d` 的用户不受影响（`unlockedTracks` 列表不变）
   - `word-master-100` 已解锁的用户不丢失成就
   - 历史 `learning.totalQuizzes` 累计不变

4. **成就不需要数据迁移**: achievement 配置变化不影响已有数据。已解锁的 track 在 `unlockedTracks` 数组中持久化，即使关联的 achievement 变化也不会回退。

5. **成就顺序**: `achievements.js` 中的成就顺序影响 `AchievementManager.checkAll()` 的遍历顺序。虽然对功能无影响，但按数值升序排列可读性更好。
