# 3D Track Module

3D 赛道系统的代码根目录。所有 Three.js 相关代码都在此目录下，与 2D 赛道 (`js/`、`rendering/`) 完全隔离。

## 目录结构

| 目录 | 用途 |
|------|------|
| `core/` | Scene3D / Track3D / Car3D 等核心抽象 |
| `controllers/` | CameraController / AIController |
| `systems/` | WordBubbleManager 等子系统 |
| `rendering/` | TrackBuilder（赛道几何生成） |
| `models/` | 低多边形 3D 模型（赛车、树、泡泡 …） |
| `utils/` | 工具函数、测试夹具（test-fixtures.js） |

> Epic 0 阶段大部分目录是空的，仅含 `.gitkeep`。代码在后续 Epic 中逐步填充。

## 技术栈

- **Three.js**：见 `package.json` 中的 `three` 版本
- **加载方式**：浏览器通过 `<script type="importmap">` 把 `"three"` 映射到 `./node_modules/three/build/three.module.js`；Vitest（Node）通过 `node_modules` 自动解析

## 开发入口

### 独立测试入口（推荐）

```bash
npm start        # 实际执行 npx serve .
# 打开 http://localhost:3000/test-3d.html
```

`test-3d.html` 提供一个脱离主游戏流程的 3D 调试页面。Epic 0 阶段它只渲染一个旋转立方体作为通路冒烟测试；后续 Epic 会逐步替换为真实场景。

### 主游戏入口

`http://localhost:3000/index.html` —— 完整游戏流程（答题 → 商店 → 比赛）。3D 赛道接入主游戏在 Epic 5 完成。

## 设计文档

- `design/3D赛道系统设计方案.md` —— 设计总文档（Epic / Use Case / DoD）
- `design/赛道系统松耦合架构设计.md` —— TrackInterface 等架构基础

## 状态约定

文档与代码必须同步。每完成一个 Use Case：
1. 勾选设计文档中对应 AC
2. 状态从 ⏸️ 改为 🚧 或 ✅
3. **先改文档，再改代码**
