# 3D 赛道系统设计索引

**用途**: 作为 Claude Code 低 token 入口。不要默认读取完整旧文档；按当前任务只读取必要文件。

## 当前状态

- Epic 0: ✅ 项目脚手架与独立测试入口
- Epic 1: ✅ 3D基础架构
- Epic 2: ✅ 3D赛道几何
- Epic 3: ✅ 3D赛车物理
- Epic 4: ⏸️ AI对手系统
- Epic 5: ⏸️ 比赛流程与系统集成
- Epic 6: ⏸️ 单词泡泡系统（核心教育价值）
- Epic 7: ⏸️ HUD与UI系统
- Epic 8: ⏸️ 性能优化

## 阅读规则

### 每次开始 3D Epic 开发必读

1. `README.md`：确认当前状态和阅读入口
2. `01-architecture-constraints.md`：代码基线、游戏流程、架构约束、风险
3. 当前 Epic 文件：Use Cases / AC / Test Cases / DoD

### 仅在需要产品背景时读取

- `00-product-vision.md`

### 仅在阶段规划或调整优先级时读取

- `02-roadmap.md`
- `99-success-maintenance.md`

## 文件索引

| 文件 | 内容 |
|---|---|
| `00-product-vision.md` | 整体设计意图、产品 Vision、技术选型 |
| `01-architecture-constraints.md` | 当前代码基线、完整游戏流程、架构原则、风险对策 |
| `02-roadmap.md` | Epic 关系图与实施顺序 |
| `epic-0-scaffolding.md` | Epic 0 项目脚手架与测试入口 |
| `epic-1-scene-camera.md` | Epic 1 Scene3D / CameraController |
| `epic-2-track-geometry.md` | Epic 2 Track3D / TrackBuilder / 解锁注册 |
| `epic-3-car-physics.md` | Epic 3 Car3D / 时间基础物理 / 碰撞惩罚 |
| `epic-4-ai-opponents.md` | Epic 4 AIController / PathFollower / 排名 |
| `epic-5-game-integration.md` | Epic 5 TrackFactory / Game / UI 集成 |
| `epic-6-word-bubbles.md` | Epic 6 单词泡泡与学习强化闭环 |
| `epic-7-hud-minimap.md` | Epic 7 HUD / 速度表 / 小地图 |
| `epic-8-performance.md` | Epic 8 LOD / InstancedMesh / 性能优化 |
| `99-success-maintenance.md` | 成功标准、文档维护规范、参考资料 |

## Token 预期收益

旧单文件约 2167 行，完整读取约 25k tokens。拆分后开发单个 Epic 通常读取：

- `README.md`: 约 1k tokens
- `01-architecture-constraints.md`: 约 4k–6k tokens
- 当前 Epic 文件: 约 3k–5k tokens

预计每个 Epic 节省约 12k–17k tokens，后续 Epic 4–8 合计节省约 60k–150k tokens，取决于每个 Epic 中重复读取设计文档的次数。
