## Epic 1: 3D基础架构

### 🎬 Vision

**目标**: 建立Three.js基础设施，提供稳定的场景管理、摄像机控制、渲染循环，作为所有3D功能的根基。

**功能**:
- Scene3D：Three.js场景/摄像机/渲染器封装
- CameraController：追尾视角与驾驶舱视角切换
- 光照系统：环境光+方向光
- 渲染循环：与游戏主循环对接

**作用**:
- 隔离Three.js复杂性，对外提供简洁API
- 为Epic 2-8提供3D渲染基础

**依赖**: Epic 0

**状态**: ✅ 已完成（2026-06-07）

---

### 📦 Use Cases

#### UC 1.1: 创建Scene3D类

**描述**: 实现Three.js场景管理器，封装场景、摄像机、渲染器初始化

**Acceptance Criteria**:
- [x] 创建 `3d/core/scene-3d.js`
- [x] 构造函数接受 `config` 对象（camera、lighting配置）
- [x] 构造函数接受可选 `{ rendererFactory }` 注入项（便于 jsdom 单测使用 fake renderer）
- [x] 初始化 `THREE.Scene`、`THREE.PerspectiveCamera`、`THREE.WebGLRenderer`
- [x] WebGLRenderer 设置 `alpha: true`（透明背景方便HUD叠加）
- [x] 添加环境光 + 方向光
- [x] 提供 `render()` 方法触发渲染
- [x] 提供 `update(deltaTime)` 方法更新动画（占位，未来扩展）
- [x] 提供 `resize(width, height)` 方法处理画布大小变化（由外部显式触发，不自动绑定 window.resize）
- [x] 提供 `dispose()` 方法清理资源（避免内存泄漏）

**接口**:
```javascript
class Scene3D {
  constructor(config, { rendererFactory } = {})  // rendererFactory 可选，默认产生 WebGLRenderer
  get scene() → THREE.Scene
  get camera() → THREE.Camera
  get renderer() → { setSize, render, dispose, domElement }
  render()
  update(deltaTime)
  resize(width, height)
  dispose()
}
```

> **依赖注入说明**：jsdom 环境无法实例化 `WebGLRenderer`，因此构造函数接受可选 `rendererFactory(config) → renderer-like` 用于单测注入 fake renderer。生产环境不传参，使用默认工厂创建真正的 `WebGLRenderer`。

**测试文件**: `tests/3d/scene-3d.test.js`（9 个测试用例，全绿）

**状态**: ✅ 已完成（2026-06-07）

---

#### UC 1.2: 创建CameraController类

**描述**: 实现摄像机控制器，支持追尾视角与驾驶舱视角切换，平滑跟随赛车

**Acceptance Criteria**:
- [x] 创建 `3d/controllers/camera-controller.js`
- [x] 构造函数接受 `THREE.Camera` 实例 + 可选 `{ positionLerpFactor = 0.1 }`
- [x] 支持两种模式：`'chase'`（追尾）、`'cockpit'`（驾驶舱），默认 `'chase'`
- [x] 追尾视角：赛车后上方（距离50单位，高20单位）
- [x] 驾驶视角：驾驶舱内（高3单位）
- [x] `update(carLike)` 接受任意 `{ x, y, angle }` 对象（2D y → 3D z），不强依赖 Car3D 类
- [x] 使用 lerp 平滑插值（`positionLerpFactor=0.1`），单帧不瞬移
- [x] `toggleMode()` 在 chase / cockpit 之间切换
- [x] `setMode(mode)` 设置模式，无效模式抛错
- [x] 响应 C 键切换视角（事件由测试入口或Game类发起）

**接口**:
```javascript
class CameraController {
  constructor(camera, { positionLerpFactor = 0.1 } = {})
  update(carLike)         // carLike: { x, y, angle }
  toggleMode()
  setMode(mode)           // 'chase' | 'cockpit'
  get mode() → string
}
```

**测试文件**: `tests/3d/camera-controller.test.js`（7 个测试用例，全绿）

**状态**: ✅ 已完成（2026-06-07）

---

#### UC 1.3: 在测试入口集成Scene3D + CameraController

**描述**: 在 `test-3d.html` 中用 Scene3D + CameraController 驱动一个占位赛车（红色 Box）+ 绿色地面，验证两套基础设施在浏览器里联调正常。占位赛车是 Epic 1 的临时输入，Epic 3 引入 Car3D 后会被替换。

**Acceptance Criteria**:
- [x] `test-3d.html` 创建 `Scene3D` 实例（注入自定义 rendererFactory 绑定到 #three-canvas）
- [x] 场景包含一个绿色地面 Plane（10000×10000）+ GridHelper 网格，提供前进时的视觉参照
- [x] 场景包含一个红色 Box 占位赛车（4×4×8），标注"TEMP for Epic 1 only"
- [x] 渲染循环 60fps 运行，FPS 显示在调试面板
- [x] 方向键 ↑↓←→ 驱动占位赛车，CameraController 平滑跟随
- [x] 按 C 键切换 chase / cockpit 视角，调试面板显示当前模式
- [x] `window.resize` 调用 `scene3d.resize(w, h)`，画面不变形
- [x] 调试面板显示：FPS、Three.js 版本、camera mode、Box 位置、Box 角度、mock mastered/coins

**测试**: 手动验证（视觉检查，2026-06-07 通过）

**状态**: ✅ 已完成（2026-06-07）

---

### ✅ Definition of Done

**代码完成**:
- [x] 所有UC的AC全部勾选
- [x] 所有类有JSDoc注释
- [x] 无console错误或警告

**测试完成**:
- [x] Scene3D 单元测试通过（9 个用例全绿）
- [x] CameraController 单元测试通过（8 个用例全绿，含 cockpit 朝向回归）
- [x] 手动验证：占位赛车 + 摄像机切换 + 网格参照 + resize 全部正常

**文档完成**:
- [x] 更新本Epic状态为 ✅
- [x] Git 历史包含 docs / red / green / fix 多个独立 commit，体现 TDD 流程

---

### 🧪 Test Cases

#### TC 1.1: Scene3D初始化
```javascript
describe('Scene3D', () => {
  it('should initialize Three.js scene', () => {
    const scene3D = new Scene3D({
      camera: { fov: 75, near: 0.1, far: 1000 },
      lighting: { ambient: 0x404040, directional: 0xffffff }
    });

    expect(scene3D.scene).toBeInstanceOf(THREE.Scene);
    expect(scene3D.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(scene3D.renderer).toBeInstanceOf(THREE.WebGLRenderer);
  });
});
```

#### TC 1.2: CameraController模式切换
```javascript
describe('CameraController', () => {
  it('should toggle camera mode', () => {
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const controller = new CameraController(camera);

    expect(controller.mode).toBe('chase');
    controller.toggleMode();
    expect(controller.mode).toBe('cockpit');
  });

  it('should follow car position in chase mode', () => {
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const controller = new CameraController(camera);
    const car = { x: 100, y: 0, angle: 0 };

    controller.update(car);
    // 经过多次update后摄像机应接近目标位置
    for (let i = 0; i < 100; i++) controller.update(car);

    expect(camera.position.y).toBeCloseTo(20, 1);
  });
});
```

---
