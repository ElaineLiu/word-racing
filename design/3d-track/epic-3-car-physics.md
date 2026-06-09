## Epic 3: 3D赛车物理

### 🎬 Vision

**目标**: 实现 Car3D 类（继承现有 Car），将物理改为时间基础，添加重量感操控、3D模型同步、档位/转速系统，并实现护栏碰撞惩罚。

**功能**:
- Car 类改造为时间基础物理（向后兼容）
- Car3D 继承 Car，添加3D模型管理
- 重量感操控（非瞬时加速、转弯惯性）
- 低多边形赛车3D模型
- 档位/转速计算（用于HUD）
- 护栏碰撞惩罚（减速、弹开、失控）

**作用**:
- 提供真实感的赛车操控
- 为玩家和AI提供统一的物理基础
- 完成可驾驶的3D赛车

**依赖**: Epic 2

**状态**: ⏸️ 未开始

---

### 📦 Use Cases

#### UC 3.1: 改造Car类为时间基础物理

**描述**: 修改现有 `js/car.js` 的 `update()`方法，从帧基础改为时间基础

**Acceptance Criteria**:
- [ ] `update()` 增加 `deltaTime` 参数（默认 `1/60`）
- [ ] 所有物理计算使用 deltaTime（距离 = 速度 × dt × 60）
- [ ] 摩擦力使用 `Math.pow(friction, dt * 60)`
- [ ] 加速度计算使用 `accel * dt * 60`
- [ ] **向后兼容**：不传 deltaTime 时行为与原来完全一致
- [ ] **所有现有Car测试100%通过**（无回归）
- [ ] 新增对比测试：60fps和120fps下物理结果一致

**修改前后对比**:
```javascript
// 修改前（帧基础）
this.speed = Math.min(this.speed + accel, maxSpeed);
this.x += Math.cos(this.angle) * this.speed;

// 修改后（时间基础）
this.speed = Math.min(this.speed + accel * deltaTime * 60, maxSpeed);
this.x += Math.cos(this.angle) * this.speed * deltaTime * 60;
```

**测试文件**: `tests/car.test.js`（修改现有 + 新增）

**状态**: ⏸️ 未开始

---

#### UC 3.2: 创建Car3D类

**描述**: 创建 Car3D 类，继承现有 Car，添加3D模型管理

**Acceptance Criteria**:
- [ ] 创建 `3d/core/car-3d.js`
- [ ] 继承 `Car` 类
- [ ] 构造函数额外接受 `scene` 参数（Three.js场景）
- [ ] 创建 CarModel 实例并添加到场景
- [ ] override `update(track, totalLaps, deltaTime)` 调用父类后同步3D模型位置
- [ ] 提供 `sync3DPosition()` 方法同步位置和旋转
- [ ] 提供 `applySpeedBoost(multiplier, duration)` 方法（供单词泡泡使用）
- [ ] 2D坐标系到3D坐标系的转换正确（2D Y → 3D Z）

**接口**:
```javascript
class Car3D extends Car {
  constructor(x, y, angle, scene)
  update(track, totalLaps, deltaTime = 1/60)
  applySpeedBoost(multiplier, duration)  // 单词泡泡奖励
  get model() → CarModel
}
```

**测试文件**: `tests/3d/car-3d.test.js`

**状态**: ⏸️ 未开始

---

#### UC 3.3: 创建CarModel类（低多边形赛车）

**描述**: 创建低多边形风格的赛车3D模型

**Acceptance Criteria**:
- [ ] 创建 `3d/models/car-model.js`
- [ ] 使用 `THREE.Group` 组合多个几何体
- [ ] 车身：BoxGeometry（红色 #E53935）
- [ ] 驾驶舱：BoxGeometry（黑色 #222222）
- [ ] 前翼/后翼：BoxGeometry（深红 #B71C1C）
- [ ] 4个车轮：CylinderGeometry（黑色 #1A1A1A）
- [ ] `updateWheelRotation(speed)` 更新车轮旋转动画
- [ ] 总顶点数 < 100（低多边形）

**接口**:
```javascript
class CarModel {
  constructor()
  get mesh() → THREE.Group
  updateWheelRotation(speed)
}
```

**测试文件**: `tests/3d/car-model.test.js`

**状态**: ⏸️ 未开始

---

#### UC 3.4: 实现重量感操控

**描述**: 调整物理参数，让操控有重量感（非瞬时加速、转弯惯性）

**Acceptance Criteria**:
- [ ] 在 `config/game-config.js` 中添加 `WEIGHT_FACTOR` 配置：
  ```javascript
  WEIGHT_FACTOR: {
    accelerationRamp: 120,        // 加速到max所需帧数（~2秒@60fps）
    turnResponseAtMaxSpeed: 0.6   // 最高速时转向降低到60%
  }
  ```
- [ ] Car3D 物理参数调整：加速到maxSpeed需要约2秒
- [ ] 高速时转向响应降低：`turnFactor = min(abs(speed) / 1.2, 1) * factor`
- [ ] 转弯有惯性感（角度变化非瞬时）
- [ ] 2D Car（现有）行为不受影响（仅Car3D启用WEIGHT_FACTOR）

**测试文件**: `tests/3d/car-physics.test.js`

**状态**: ⏸️ 未开始

---

#### UC 3.5: 实现档位/转速系统

**描述**: 实现档位和转速计算（仅用于HUD显示，不影响实际物理）

**Acceptance Criteria**:
- [ ] Car3D 添加 `getGear()` 返回档位（1-6）
- [ ] Car3D 添加 `getRPM()` 返回转速（0-8000）
- [ ] 档位划分（基于速度百分比）：
  - 1档：0-15%
  - 2档：15-30%
  - 3档：30-50%
  - 4档：50-70%
  - 5档：70-90%
  - 6档：90-100%
- [ ] 转速：基于档位内速度比例计算（每档0-8000循环）
- [ ] 提供 `getDisplaySpeed()` 返回km/h单位速度

**测试文件**: `tests/3d/car-gear-rpm.test.js`

**状态**: ⏸️ 未开始

---

#### UC 3.6: 实现护栏碰撞惩罚

**描述**: 碰撞护栏时施加惩罚（减速、弹开、短暂失控）

**Acceptance Criteria**:
- [ ] Car3D 添加 `collisionPenalty` 状态字段（剩余惩罚时间）
- [ ] 检测到 `track.checkCollision(this)` 返回true时触发：
  - 速度减少30%
  - 沿赛道法线方向弹开（反向推力）
  - 设置 `collisionPenalty = 1.0`（秒）
- [ ] 在 `collisionPenalty > 0` 期间，转向输入失效
- [ ] 每帧 `collisionPenalty -= deltaTime`
- [ ] 通过 EventBus 发射 `car:collision` 事件
- [ ] 视觉反馈：屏幕震动（轻微，0.3秒）

**测试文件**: `tests/3d/collision-penalty.test.js`

**状态**: ⏸️ 未开始

---

#### UC 3.7: 在测试入口集成Car3D

**描述**: 在 `test-3d.html` 中加载Car3D，可用WASD驾驶

**Acceptance Criteria**:
- [ ] 测试入口创建 Car3D 实例
- [ ] WASD/方向键控制赛车
- [ ] 摄像机自动跟随
- [ ] C键切换摄像机视角
- [ ] R键重置赛车到起点
- [ ] 调试面板显示速度、档位、转速、位置
- [ ] 碰撞护栏时有减速效果

**测试**: 手动驾驶验证

**状态**: ⏸️ 未开始

---

### ✅ Definition of Done

**代码完成**:
- [ ] 所有UC的AC全部勾选
- [ ] Car时间基础物理改造完成
- [ ] Car3D可在3D场景中驾驶
- [ ] 操控有重量感
- [ ] 碰撞惩罚生效

**测试完成**:
- [ ] Car时间基础物理测试通过（60fps/120fps结果一致）
- [ ] **现有Car测试100%通过（无回归）**
- [ ] Car3D 单元测试通过（覆盖率 > 80%）
- [ ] CarModel 测试通过
- [ ] 碰撞惩罚测试通过
- [ ] 手动驾驶测试通过

**文档完成**:
- [ ] 更新本Epic状态为 ✅
- [ ] Git提交：`feat(epic-3): 3D car physics with weight feel`

---

### 🧪 Test Cases

#### TC 3.1: 时间基础物理一致性
```javascript
describe('Car time-based physics', () => {
  it('should produce same result at different frame rates', () => {
    const car60 = new Car(0, 0, 0);
    const car120 = new Car(0, 0, 0);
    car60.input.up = true;
    car120.input.up = true;

    // 模拟1秒
    for (let i = 0; i < 60; i++) car60.update(mockTrack, 3, 1/60);
    for (let i = 0; i < 120; i++) car120.update(mockTrack, 3, 1/120);

    expect(car60.x).toBeCloseTo(car120.x, 1);
  });
});
```

#### TC 3.2: 重量感（加速时间）
```javascript
it('should take ~2 seconds to reach max speed', () => {
  const car = new Car3D(0, 0, 0, mockScene);
  car.input.up = true;

  for (let i = 0; i < 120; i++) {
    car.update(mockTrack, 3, 1/60);
  }

  expect(car.speed).toBeGreaterThanOrEqual(car.maxSpeed * 0.9);
});
```

#### TC 3.3: 碰撞惩罚
```javascript
it('should reduce speed by 30% on collision', () => {
  const car = new Car3D(0, 0, 0, mockScene);
  car.speed = 100;

  car.handleCollision();

  expect(car.speed).toBeCloseTo(70, 1);
  expect(car.collisionPenalty).toBeGreaterThan(0);
});
```

#### TC 3.4: 档位划分
```javascript
it('should calculate gear correctly', () => {
  const car = new Car3D(0, 0, 0, mockScene);
  car.maxSpeed = 100;

  car.speed = 10;  // 10%
  expect(car.getGear()).toBe(1);

  car.speed = 50;  // 50%
  expect(car.getGear()).toBe(4);

  car.speed = 95;  // 95%
  expect(car.getGear()).toBe(6);
});
```

---
