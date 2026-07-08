## Epic 10: 银石赛道 2D 重构 + 新增 3D 银石赛道

### 🎬 Vision

**目标**: 重新设计 `silverstone-2d` 的 waypoints，匹配真实银石赛道特征（高速弯道、Copse→Maggots→Becketts S 弯组、弧形长弯），同时新增 `silverstone-3d` 赛道。

**功能**:
- 重新设计 silverstone-2d waypoints（从椭圆改为真实银石布局）
- 在 `track-registry.js` 中新增 `silverstone-3d`（含场景配置、解锁条件）
- 新增成就 `word-master-200` → 解锁 `silverstone-3d`

**作用**:
- 银石赛道是目前唯一缺少真实赛道特征的 2D 赛道，重构后每个赛道都有独特驾驶体验
- 银石 3D 填补了 mastered-based 解锁的高端赛道空缺（200 词 vs shanghai-3d 的 20 套 quiz）
- 对齐真实 F1 赛道布局，提升赛道多样性和驾驶乐趣

**依赖**: Epic 9（monaco-3d 注册模式）、Epic 2（track-registry + TrackBuilder 基础）

**状态**: ⏸️ 未开始

---

### 📦 Use Cases

#### UC 10.1: 重新设计 silverstone-2d waypoints

**描述**: 替换 `silverstone-2d` 的 waypoints 数组，从圆角椭圆改为模拟真实银石 GP 赛道布局。保留 trackWidth=90、解锁条件 `masteryCount: 50` 不变。

**Acceptance Criteria**:
- [ ] 重新设计 waypoints（约 20-24 个点），模拟以下银石特征：
  - 长直道（Wellington Straight 对应段）
  - Copse 高速右弯 → Maggots → Becketts S 弯组（赛道标志性特征）
  - Stowe 长右弯
  - Vale → Club → Abbey → Farm 连续弯
  - Village → The Loop 发夹弯
  - Brooklands → Luffield → Woodcote 回起点的过渡弯
- [ ] 画布范围 1400×800 内不越界
- [ ] `trackWidth`: `90`（不变）
- [ ] `unlockRequirements`: `{ masteryCount: 50 }`（不变）
- [ ] `id`, `name`, `type`, `description` 不变
- [ ] 通过几何安全测试：不自交、非相邻 segment 间距 > trackWidth、左右转平衡

**waypoints 设计（草稿）**:
```javascript
// 银石 GP 赛道 - 1400×800 画布
// 特征：左下方起跑 → 右上 S 弯组 → 底部直道 → 左下发夹 → 回起点
waypoints: [
  // === Wellington Straight（左下起跑，向右上延伸）===
  { x: 260, y: 580 },  // Start / Finish
  { x: 400, y: 500 },
  { x: 560, y: 440 },
  { x: 720, y: 420 },  // 直道末端

  // === Copse → Maggots → Becketts（右上 S 弯）===
  { x: 860, y: 430 },  // Copse 高速右弯入口
  { x: 960, y: 470 },  // Maggots 右弧
  { x: 1040, y: 530 }, // Becketts 左
  { x: 1080, y: 600 }, // Becketts 右

  // === Chapel → Stowe（右边缘向下）===
  { x: 1060, y: 670 }, // Chapel 左拐
  { x: 990, y: 720 },  // Stowe 右长弯
  { x: 860, y: 740 },

  // === 底部：Vale → Club → Abbey ===
  { x: 720, y: 730 },  // Vale
  { x: 580, y: 690 },  // Club
  { x: 460, y: 650 },  // Abbey

  // === 左侧：Farm → Village → The Loop（发夹）===
  { x: 360, y: 600 },  // Farm
  { x: 270, y: 550 },  // Village 右弯
  { x: 200, y: 490 },  // The Loop 发夹左弯（赛道最左点）

  // === Aintree → Brooklands → Luffield → Woodcote（回起点）===
  { x: 220, y: 420 },  // Aintree 右弧
  { x: 300, y: 400 },  // Brooklands 左
  { x: 370, y: 430 },  // Luffield 右
  { x: 370, y: 510 },  // Woodcote 右弧
  { x: 310, y: 560 },  // 回到起跑线区域
]
```

**影响文件**:
- `config/track-registry.js`

**测试文件**: `tests/track-registry.test.js`（更新几何安全测试）

**状态**: ⏸️ 未开始

---

#### UC 10.2: 调整现有的 silverstone-2d 配置

**描述**: 除了替换 waypoints，同步更新 `name` 和 `description` 以体现真实赛道特征，添加 `trackWidth` 注释更新。

**Acceptance Criteria**:
- [ ] `name`: 保留 `'Silverstone Circuit'`
- [ ] `description`: 从 `'High-speed corner challenge'` 改为基于真实银石描述的文本
- [ ] 其他字段（id, type, cost 等）保持不变

**配置示例**:
```javascript
'silverstone-2d': {
  id: 'silverstone-2d',
  name: 'Silverstone Circuit',
  type: '2d',
  description: 'Legendary GP circuit with high-speed S-curves',
  waypoints: [/* UC 10.1 新 waypoints */],
  trackWidth: 90,
  unlockRequirements: { masteryCount: 50 }
}
```

**影响文件**:
- `config/track-registry.js`

**状态**: ⏸️ 未开始

---

#### UC 10.3: 新增 silverstone-3d 赛道注册

**描述**: 在 `track-registry.js` 中添加 `silverstone-3d` 赛道，复用新的 silverstone-2d waypoints + 3D 场景配置。

**Acceptance Criteria**:
- [ ] `id`: `'silverstone-3d'`
- [ ] `name`: `'Silverstone Circuit 3D'`
- [ ] `type`: `'3d'`
- [ ] `description`: `'Immersive 3D high-speed GP experience'`
- [ ] `waypoints`: 复用 UC 10.1 新 waypoints（与 silverstone-2d 一致）
- [ ] `trackWidth`: `90`（高速赛道）
- [ ] `unlockRequirements`: `{ masteryCount: 200 }`（与对齐新成就 word-master-200）
- [ ] `sceneConfig` 包含摄像机/光照/环境配置（英伦乡村风格）

**`silverstone-3d` 配置**:
```javascript
'silverstone-3d': {
  id: 'silverstone-3d',
  name: 'Silverstone Circuit 3D',
  type: '3d',
  description: 'Immersive 3D high-speed GP experience',
  waypoints: [/* 与 silverstone-2d 一致 */],
  trackWidth: 90,
  unlockRequirements: {
    masteryCount: 200
  },
  sceneConfig: {
    camera: {
      fov: 75,
      near: 0.1,
      far: 2000,
      position: [650, 550, 850]
    },
    lighting: {
      ambientColor: 0x686868,
      directionalColor: 0xfffaf0,
      directionalPosition: [600, 700, 400]
    },
    ambient: {
      skyColor: 0x87CEEB,
      hazeColor: 0xd4e8ff,
      groundColor: 0x6B8E23  // 英伦乡村绿地
    }
  }
}
```

**sceneConfig 设计说明**:
- 摄像机视角（y=550）介于上海（y=650）和蒙特卡洛（y=500）之间，体现高速赛道开阔感
- 暖色光 `0xfffaf0` 模拟英伦夏日阳光
- `groundColor: 0x6B8E23`（橄榄绿）对应银石所在的北安普敦郡乡村绿地

**影响文件**:
- `config/track-registry.js`

**测试文件**: `tests/track-registry.test.js`

**状态**: ⏸️ 未开始

---

#### UC 10.4: 新增成就 word-master-200（解锁银石 3D）

**描述**: 在 `config/achievements.js` 中新增成就，掌握 200 个单词解锁 `silverstone-3d`。

**Acceptance Criteria**:
- [ ] 新增成就 `'word-master-200'`
- [ ] `name`: `'Word Master 200'`
- [ ] `description`: `'Master 200 words.'`
- [ ] `check`: `(state) => (state.learning?.totalWordsMastered || 0) >= 200`
- [ ] `reward`: `{ track: 'silverstone-3d' }`
- [ ] 成就列表顺序：排在 `quiz-master-50` 之后、`perfect-streak` 之前

**成就配置**:
```javascript
'word-master-200': {
  id: 'word-master-200',
  name: 'Word Master 200',
  description: 'Master 200 words.',
  check: (state) => (state.learning?.totalWordsMastered || 0) >= 200,
  reward: { track: 'silverstone-3d' }
}
```

**影响文件**:
- `config/achievements.js`

**测试文件**: `tests/achievements.test.js`

**状态**: ⏸️ 未开始

---

#### UC 10.5: 更新 debug-commands.js 解锁列表

**描述**: `debugUnlockAllTracks()` 的硬编码列表需要增加 `silverstone-3d`。

**Acceptance Criteria**:
- [ ] 在 `scripts/debug-commands.js` 的 `debugUnlockAllTracks` 列表中添加 `'silverstone-3d'`

**影响文件**:
- `scripts/debug-commands.js`

**状态**: ⏸️ 未开始

---

### ✅ Definition of Done

**代码完成**:
- [ ] 所有 UC 的 AC 全部勾选
- [ ] `silverstone-2d` waypoints 已更新，不再是椭圆
- [ ] `silverstone-3d` 已注册，包含完整 sceneConfig
- [ ] 成就 `word-master-200` 配置正确
- [ ] 现有赛道和成就完全不变（silverstone-2d 只改 waypoints + description）

**测试完成**:
- [ ] `npx vitest run` 全部通过（无回归）
- [ ] silverstone-2d 几何安全测试通过（不自交、距离 > trackWidth、左右转平衡）
- [ ] silverstone-3d 几何安全测试通过（复用相同 waypoints）
- [ ] 新成就 `word-master-200` 单元测试覆盖 check 函数和 reward
- [ ] TrackUnlockManager 对 silverstone-3d 的 `masteryCount: 200` 进度正确
- [ ] 手动验证：test-3d.html?track=silverstone-3d 渲染正常

**文档完成**:
- [ ] 更新本 Epic 状态为 ✅
- [ ] 更新 `design/3d-track/README.md` 添加本 Epic 条目

---

### 🧪 Test Cases

#### TC 10.1: silverstone-2d 新 waypoints 几何安全

```javascript
describe('silverstone-2d redesigned geometry', () => {
  it('中心线不应该自交或过近', () => {
    const track = TRACK_REGISTRY['silverstone-2d'];
    const points = generateSmoothCurve(track.waypoints);

    expect(hasCenterlineIntersection(points, track.waypoints.length)).toBe(false);
    expect(getMinimumNonAdjacentSegmentDistance(points, track.waypoints.length))
      .toBeGreaterThan(track.trackWidth);
  });

  it('应该有明显左右转变化（高速 S 弯特征）', () => {
    const track = TRACK_REGISTRY['silverstone-2d'];
    const points = generateSmoothCurve(track.waypoints);
    const turns = getTurnDirectionCounts(points);

    expect(turns.left).toBeGreaterThan(points.length * 0.2);
    expect(turns.right).toBeGreaterThan(points.length * 0.2);
    expect(getDirectionChanges(points)).toBeGreaterThanOrEqual(6);
  });

  it('不再是椭圆（waypoints 数量应显著多于之前的 14 个）', () => {
    const track = TRACK_REGISTRY['silverstone-2d'];
    expect(track.waypoints.length).toBeGreaterThan(18);
  });
});
```

#### TC 10.2: silverstone-3d 赛道注册验证

```javascript
describe('track-registry silverstone-3d', () => {
  it('应该已注册且有正确的元数据', () => {
    const track = TRACK_REGISTRY['silverstone-3d'];
    expect(track).toBeDefined();
    expect(track.id).toBe('silverstone-3d');
    expect(track.type).toBe('3d');
    expect(track.trackWidth).toBe(90);
  });

  it('waypoints 应该与 silverstone-2d 一致', () => {
    const s3d = TRACK_REGISTRY['silverstone-3d'];
    const s2d = TRACK_REGISTRY['silverstone-2d'];
    expect(s3d.waypoints).toEqual(s2d.waypoints);
  });

  it('应该有 masteryCount: 200 解锁要求', () => {
    const track = TRACK_REGISTRY['silverstone-3d'];
    expect(track.unlockRequirements).toBeDefined();
    expect(track.unlockRequirements.masteryCount).toBe(200);
  });

  it('应该有有效的 sceneConfig', () => {
    const track = TRACK_REGISTRY['silverstone-3d'];
    expect(track.sceneConfig).toBeDefined();
    expect(track.sceneConfig.camera).toBeDefined();
    expect(track.sceneConfig.lighting).toBeDefined();
  });
});
```

#### TC 10.3: 新成就验证

```javascript
describe('word-master-200 achievement', () => {
  it('掌握少于 200 词不触发', () => {
    const state = { learning: { totalWordsMastered: 150 } };
    expect(ACHIEVEMENTS['word-master-200'].check(state)).toBe(false);
  });

  it('掌握 200 词触发', () => {
    const state = { learning: { totalWordsMastered: 200 } };
    expect(ACHIEVEMENTS['word-master-200'].check(state)).toBe(true);
  });

  it('应该奖励 silverstone-3d 赛道', () => {
    expect(ACHIEVEMENTS['word-master-200'].reward.track).toBe('silverstone-3d');
  });
});
```

#### TC 10.4: 集成测试

```javascript
describe('word-master-200 triggers silverstone-3d unlock', () => {
  beforeEach(() => { localStorage.clear(); });

  it('掌握 200 词时解锁 silverstone-3d', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus, 'test_user');
    const achievementManager = new AchievementManager(eventBus, gameState);

    const learning = gameState.get('learning') || {};
    gameState.set('learning', { ...learning, totalWordsMastered: 200 });

    achievementManager.checkAll();

    const unlockedTracks = gameState.get('unlockedTracks') || [];
    expect(unlockedTracks).toContain('silverstone-3d');
  });
});
```

#### TC 10.5: 无回归检查

```javascript
describe('no regression', () => {
  it('silverstone-2d 仍由 word-collector-50 解锁', () => {
    expect(ACHIEVEMENTS['word-collector-50'].reward.track).toBe('silverstone-2d');
    expect(ACHIEVEMENTS['word-collector-50'].check({ learning: { totalWordsMastered: 50 } })).toBe(true);
  });

  it('现有 2D 赛道 waypoints 不变', () => {
    // shanghai-2d 和 monaco-2d 的 waypoints 数量应保持不变
    expect(TRACK_REGISTRY['shanghai-2d'].waypoints.length).toBe(20);
    expect(TRACK_REGISTRY['monaco-2d'].waypoints.length).toBe(31);
  });
});
```

---

### 📝 技术注意事项

1. **waypoints 设计迭代**: 草稿 waypoints 需要在实现时通过几何安全测试验证。如果自交或最小距离不足，需要微调坐标。建议先写测试（Red），调试 waypoints 直到测试通过（Green）。

2. **silverstone-3d waypoints 与 silverstone-2d 一致**: 3D 版本直接引用 2D 的 waypoints 数组，确保两者使用完全相同的路径。修改 2D waypoints 时 3D 自动同步。

3. **word-master-100 不重复**: word-master-100 保留燃油币奖励，word-master-200 新增为赛道奖励。两者形成 mastery 梯度：50→银石2D，100→100币，200→银石3D。

4. **sceneConfig 不强制要求 ambient 字段**: 与 shanghai-3d 一致，`ambient` 为可选的扩展字段。TrackBuilder / Scene3D 需要兼容有/无 `ambient` 两种情况。

5. **test-3d.html 自动支持**: 由于 test-3d.html 已支持 `?track=` 参数，silverstone-3d 注册后即可通过 `?track=silverstone-3d` 直接测试。

6. **赛道特征验证**: 新增的 `expect(getDirectionChanges(points)).toBeGreaterThanOrEqual(6)` 测试确保银石有比上海更多的方向变化，反映其 S 弯特征。
