# 多用户系统与数据重构设计索引

**用途**: 作为 Claude Code 低 token 入口。不要默认读取完整旧文档；按当前任务只读取必要文件。

## 当前状态

- Epic 1: ⏸️ 多用户系统（用户创建、切换、数据隔离）
- Epic 2: ⏸️ 数据清理（删除燃油、升级系统、清理调试数据）
- Epic 3: ⏸️ 奖励机制调整（按新规则发放金币和装备币）
- Epic 4: ⏸️ 重置功能（全部重置、重置今日、重置本周）

## 阅读规则

### 每次开始 Epic 开发必读

1. `README.md`：确认当前状态和阅读入口
2. `01-architecture-constraints.md`：当前数据结构、存储键名、迁移风险
3. 当前 Epic 文件：Use Cases / AC / Test Cases / DoD

### 仅在需要产品背景时读取

- `game-mechanics-v2.md`（在上级目录）

## 文件索引

| 文件 | 内容 |
|------|------|
| `01-architecture-constraints.md` | 当前数据结构、存储键名、迁移风险、测试策略 |
| `epic-1-multi-user.md` | Epic 1 多用户系统（用户创建、切换、数据隔离） |
| `epic-2-data-cleanup.md` | Epic 2 数据清理（删除燃油、升级系统） |
| `epic-3-reward-mechanism.md` | Epic 3 奖励机制调整（答题奖励、比赛消耗） |
| `epic-4-reset-features.md` | Epic 4 重置功能（全部重置、重置今日、重置本周） |

## Token 预期收益

完整读取所有文档约 15k tokens。拆分后开发单个 Epic 通常读取：

- `README.md`: 约 1k tokens
- `01-architecture-constraints.md`: 约 3k tokens
- 当前 Epic 文件: 约 4k tokens

预计每个 Epic 节省约 7k tokens，4 个 Epic 合计节省约 28k tokens。

## 实施顺序

```
Epic 1: 多用户系统
    ↓
Epic 2: 数据清理
    ↓
Epic 3: 奖励机制调整
    ↓
Epic 4: 重置功能
```

**依赖关系**：
- Epic 1 必须先完成（提供用户ID作为数据隔离基础）
- Epic 2 清理旧数据结构
- Epic 3 调整奖励逻辑（依赖新数据结构）
- Epic 4 添加重置功能（依赖完整的新系统）
