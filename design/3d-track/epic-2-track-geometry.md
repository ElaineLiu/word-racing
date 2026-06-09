## Epic 2: 3D赛道几何

### 🎬 Vision

**目标**: 实现 Track3D 类，生成低多边形风格的3D赛道几何（路面、护栏、路缘石、起终点线、场景装饰），并将3D赛道注册到现有系统中（含解锁条件配置）。

**功能**:
- Track3D 实现 TrackInterface 接口
- 从2D waypoints生成3D赛道几何
- 添加护栏、路缘石、起终点线
- 添加场景装饰（树木、建筑、路灯）
- 在 `track-registry.js` 中注册3D赛道（含解锁条件）

**作用**:
- 提供可见的3D赛道环境
- 与现有解锁系统（TrackUnlockManager）打通
- 为Epic 3赛车物理提供赛道数据

**依赖**: Epic 1

**状态**: ⏸️ 未开始

---

### 📦 Use Cases

#### UC 2.1: 创建Track3D类（实现TrackInterface）

**描述**: 实现 Track3D 类，遵循 TrackInterface 接口规范

**Acceptance Criteria**:
- [ ] 创建 `3d/core/track-3d.js`
- [ ] 实现 `TrackInterface` 所有接口（id, name, type, description, cost, startPos, waypoints, trackWidth, render, update, checkCollision, getProgress, isOnTrack）
- [ ] `type` 返回 `'3d'`
- [ ] 构造函数接受 `trackData, eventBus, gameState`
- [ ] 将2D waypoints转换为3D（添加y轴高度=0）
- [ ] 内部创建 Scene3D 实例
- [ ] `render(ctx, car, gameState)` 忽略 ctx 参数，使用 Three.js 渲染
- [ ] 构造完成后发射 `track:selected` 事件

**接口**:
```javascript
class Track3D extends TrackInterface {
  constructor(trackData, eventBus, gameState)
  // 所有TrackInterface的getter和方法
  get scene() → THREE.Scene  // 额外暴露给Car3D使用
}
```

**测试文件**: `tests/3d/track-3d.test.js`

**状态**: ⏸️ 未开始

---

#### UC 2.2: 创建TrackBuilder类

**描述**: 实现 TrackBuilder 类，从 waypoints 生成3D赛道几何

**Acceptance Criteria**:
- [ ] 创建 `3d/rendering/track-builder.js`
- [ ] 构造函数接受 `THREE.Scene` 实例
- [ ] `buildTrack(waypoints, trackWidth)` 生成路面（ExtrudeGeometry 或自定义PlaneGeometry沿路径）
- [ ] 路面材质：低多边形深灰色（#2D2D2D）
- [ ] `addBarriers()` 添加护栏（BoxGeometry，白色）
- [ ] `addKerbs()` 添加路缘石（弯道处红白相间）
- [ ] `addStartFinishLine()` 添加起终点线（棋盘格纹理）
- [ ] `update(deltaTime)` 更新动画（如有）

**接口**:
```javascript
class TrackBuilder {
  constructor(scene)
  buildTrack(waypoints, trackWidth)
  addBarriers()
  addKerbs()
  addStartFinishLine()
  update(deltaTime)
}
```

**测试文件**: `tests/3d/track-builder.test.js`

**状态**: ⏸️ 未开始

---

#### UC 2.3: 添加场景装饰

**描述**: 在赛道周围添加低多边形装饰（树木、建筑、路灯）

**Acceptance Criteria**:
- [ ] 创建 `3d/models/tree-model.js`（圆锥+圆柱）
- [ ] 创建 `3d/models/building-model.js`（简单立方体组合）
- [ ] 使用 `THREE.InstancedMesh` 批量渲染树木（50-100棵）
- [ ] 建筑物随机分布5-10个
- [ ] 路灯沿赛道边缘分布20-30个
- [ ] 所有装饰使用低多边形材质（顶点数<20）
- [ ] 在 `TrackBuilder.addDecorations()` 中统一调用

**测试文件**: `tests/3d/decorations.test.js`

**状态**: ⏸️ 未开始

---

#### UC 2.4: 实现3D碰撞检测与进度计算

**描述**: 为Track3D实现`isOnTrack`、`getProgress`、`checkCollision`

**Acceptance Criteria**:
- [ ] `isOnTrack(x, y)`：使用距离检测（点到最近waypoint距离 < trackWidth/2）
- [ ] `getProgress(car)`：返回0-1之间的赛道进度
- [ ] `checkCollision(car)`：检测车辆是否碰到护栏
- [ ] 边界情况处理（起终点循环）
- [ ] 单元测试覆盖边界情况

**测试文件**: `tests/3d/track-3d-collision.test.js`

**状态**: ⏸️ 未开始

---

#### UC 2.5: 在赛道注册表中注册3D赛道

**描述**: 在 `config/track-registry.js` 中添加3D赛道配置，包含解锁条件

**Acceptance Criteria**:
- [ ] 在 `TRACK_REGISTRY` 中添加 `'shanghai-3d'` 配置
- [ ] 配置包含：id、name、type='3d'、description、cost、waypoints、trackWidth
- [ ] 解锁条件：`unlockRequirements: { masteryCount: 200 }`
- [ ] 燃油币消耗：`cost: 10`（与2D上海一致）
- [ ] 添加 `sceneConfig`（摄像机/光照配置）
- [ ] 现有2D赛道配置完全不变
- [ ] 通过 `TrackUnlockManager.isUnlocked('shanghai-3d', gameState)` 可正确判断

**配置示例**:
```javascript
'shanghai-3d': {
  id: 'shanghai-3d',
  name: '上海国际赛车场 3D',
  type: '3d',
  description: '沉浸式3D驾驶体验',
  cost: 10,
  waypoints: [/* 复用2D waypoints或新设计 */],
  trackWidth: 90,
  unlockRequirements: {
    masteryCount: 200  // 掌握200个单词解锁
  },
  sceneConfig: {
    camera: { fov: 75, near: 0.1, far: 2000 },
    lighting: { ambient: 0x606060, directional: 0xffffff }
  }
}
```

**测试文件**: `tests/config/track-registry.test.js`（扩展现有测试）

**状态**: ⏸️ 未开始

---

#### UC 2.6: 在测试入口加载3D赛道

**描述**: 更新 `test-3d.html`，加载完整的3D赛道（无赛车）

**Acceptance Criteria**:
- [ ] 测试入口调用 `new Track3D(testTrackData, mockEventBus, mockGameState)`
- [ ] 赛道几何可见（路面、护栏、起终点线）
- [ ] 场景装饰可见（树木、建筑、路灯）
- [ ] 摄像机可绕赛道俯视
- [ ] FPS稳定60

**测试**: 手动验证

**状态**: ⏸️ 未开始

---

### ✅ Definition of Done

**代码完成**:
- [ ] 所有UC的AC全部勾选
- [ ] Track3D 实现完整的 TrackInterface
- [ ] 3D赛道在test-3d.html中可见

**测试完成**:
- [ ] Track3D 单元测试通过（覆盖率 > 80%）
- [ ] TrackBuilder 单元测试通过（覆盖率 > 80%）
- [ ] 碰撞检测测试通过
- [ ] TrackUnlockManager对3D赛道判断正确
- [ ] 现有2D赛道相关测试全部通过（无回归）
- [ ] 手动验证：3D赛道渲染正常

**文档完成**:
- [ ] 更新本Epic状态为 ✅
- [ ] Git提交：`feat(epic-2): 3D track geometry and registry`

---

### 🧪 Test Cases

#### TC 2.1: Track3D实现接口
```javascript
describe('Track3D', () => {
  it('should implement TrackInterface', () => {
    const track = new Track3D(trackData, eventBus, gameState);

    expect(track.id).toBe('shanghai-3d');
    expect(track.type).toBe('3d');
    expect(track.startPos).toHaveProperty('x');
    expect(track.startPos).toHaveProperty('angle');
    expect(typeof track.render).toBe('function');
    expect(typeof track.getProgress).toBe('function');
  });
});
```

#### TC 2.2: 解锁条件正确判断
```javascript
describe('3D track unlock', () => {
  it('should be locked when mastery < 200', () => {
    gameState.learning.totalWordsMastered = 150;
    expect(TrackUnlockManager.isUnlocked('shanghai-3d', gameState)).toBe(false);
  });

  it('should be unlocked when mastery >= 200', () => {
    gameState.learning.totalWordsMastered = 200;
    expect(TrackUnlockManager.isUnlocked('shanghai-3d', gameState)).toBe(true);
  });
});
```

#### TC 2.3: 进度计算
```javascript
it('should calculate progress correctly', () => {
  const track = new Track3D(trackData, eventBus, gameState);

  const progressAtStart = track.getProgress({ x: track.startPos.x, y: track.startPos.y });
  expect(progressAtStart).toBeCloseTo(0.0, 1);
});
```

---
