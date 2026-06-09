## Epic 0: 项目脚手架与独立测试入口

### 🎬 Vision

**目标**: 在动手开发任何3D功能前，搭建好开发环境与独立测试入口，让后续每个Epic都能脱离主游戏流程独立验证。

**功能**:
- 安装Three.js依赖
- 创建`3d/`目录结构
- 创建独立测试页面`test-3d.html`
- 提供测试用GameState模拟数据

**作用**:
- 隔离开发：开发3D无需启动主游戏
- 快速验证：无需经过答题/商店流程即可测试3D功能
- 调试支持：提供FPS、位置等调试信息

**依赖**: 无

**状态**: ✅ 已完成（2026-06-07）

---

### 📦 Use Cases

#### UC 0.1: 安装Three.js与建立目录结构

**描述**: 安装Three.js npm包，创建3D模块所需的所有目录

**Acceptance Criteria**:
- [x] 使用 `npm install three` 添加到 `dependencies`（运行时依赖，非 devDependency），当前版本 0.184.0
- [x] 创建目录：`3d/core/`、`3d/controllers/`、`3d/systems/`、`3d/rendering/`、`3d/models/`、`3d/utils/`
- [x] 创建测试目录：`tests/3d/`（`tests/integration/` 已存在，无需新建）
- [x] `ui/` 目录已存在（含 achievement-panel.js 等），无需创建
- [x] 在 `3d/README.md` 中说明各目录用途、Three.js 版本、importmap 约定、`test-3d.html` 入口

**测试**: 手动验证目录创建成功，`npm install` 无错误

**状态**: ✅ 已完成

---

#### UC 0.2: 创建独立测试入口页面

**描述**: 创建`test-3d.html`，提供脱离主游戏流程的3D测试环境

**Acceptance Criteria**:
- [x] 在项目根目录创建 `test-3d.html`
- [x] 页面包含全屏 Canvas（`#three-canvas`）
- [x] 页面包含调试面板（FPS、Renderer、Three.js Revision、Mock GameState 字段）
- [x] 提供键盘快捷键说明（R/C/Tab，标注后续 Epic 启用）
- [x] 使用 `<script type="importmap">` 把 `"three"` 映射到 `./node_modules/three/build/three.module.js`，以 ES6 Module 加载
- [x] Epic 0 冒烟测试：渲染一个旋转立方体证明整条加载链路打通（Three.js + importmap + ES Module + 模拟数据）。**Epic 1 UC 1.3 完成 Scene3D 后将整段替换**
- [x] 启动 `npx serve .`（项目脚本 `npm start` 同义）后可通过 `http://localhost:3000/test-3d.html` 访问
- [x] 不影响 `index.html` 主游戏入口

**访问路径**:
```
npm start
# 或 npx serve .
# 浏览器打开 http://localhost:3000/test-3d.html
```

**测试**: 手动验证 - 页面可打开、立方体旋转、FPS ~60、调试面板显示数据、无 JS 错误

**状态**: ✅ 已完成

---

#### UC 0.3: 创建测试用GameState模拟数据

**描述**: 在`test-3d.html`中提供一组模拟单词数据，供单词泡泡等功能测试使用

**Acceptance Criteria**:
- [x] 创建 `3d/utils/test-fixtures.js`
- [x] 导出 `createMockGameState()` 函数返回模拟GameState
- [x] 模拟对象**形状对齐真实 GameState 字段**（`fuel/fuelCoins/gearCoins/upgrades/learning/unlockedTracks/...`）
- [x] 真实 GameState **没有** `words` 顶层字段（单词数据由 learning 模块管理）—— 夹具中使用专用字段名 `wordsFixture` 明确这是测试数据
- [x] 模拟数据包含：
  - 32 个不同 status 的单词（exposed/simple_passed/complex_passed/mastered 均覆盖）
  - `learning.totalWordsMastered: 250`（已超过 3D 解锁门槛 200）
  - `fuelCoins: 100`、`fuel: 60`、`gearCoins: 50`、`unlockedTracks` 含 `shanghai-3d`
  - 每个单词含 `id/en/zh/status/exposureCount`
- [x] 在 `test-3d.html` 中使用该模拟数据，调试面板可见
- [x] 真实 GameState 完全不受影响（mock 是纯对象，不实例化 GameState 类，不触碰 localStorage）
- [x] 每次调用返回新对象（避免测试间状态污染）

**测试**: `tests/3d/test-fixtures.test.js`（8 个用例）验证结构、解锁门槛、字段覆盖、引用隔离

**状态**: ✅ 已完成

---

### ✅ Definition of Done

**代码完成**:
- [x] 所有Use Case的AC全部勾选
- [x] Three.js 依赖安装成功（v0.184.0）
- [x] 目录结构创建完成（`3d/{core,controllers,systems,rendering,models,utils}/` + `tests/3d/`）
- [x] `test-3d.html` 可访问，旋转立方体冒烟测试通过

**测试完成**:
- [x] 手动验证测试页面可打开（立方体旋转、FPS ~60、调试面板显示 mock 数据）
- [x] `npm install` 无错误
- [x] `npx vitest run` 528 个测试全部通过（原 520 + 新增 8 个 fixture 测试，无回归）

**文档完成**:
- [x] 本 Epic 状态更新为 ✅
- [x] `3d/README.md` 已写入开发指南
- [x] Git 提交：`feat(epic-0): 3D scaffolding and test entry`（已提交）

---

### 🧪 Test Cases

#### TC 0.1: 测试入口可访问
```javascript
// 手动测试步骤
// 1. npx http-server . -p 3000
// 2. 浏览器访问 http://localhost:3000/test-3d.html
// 3. 验证页面打开、Canvas可见、调试面板显示
```

#### TC 0.2: 模拟数据结构正确
```javascript
describe('createMockGameState', () => {
  it('should provide valid mock GameState for 3D testing', () => {
    const mockState = createMockGameState();

    expect(mockState.words.length).toBeGreaterThanOrEqual(30);
    expect(mockState.learning.totalWordsMastered).toBeGreaterThanOrEqual(200);
    expect(mockState.fuelCoins).toBeGreaterThan(0);
  });
});
```

---
