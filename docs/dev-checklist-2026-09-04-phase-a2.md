# 阶段 A2 开发检查清单

> 任务：统一奖励与题型规则，修复长期只出简单题导致 mastered words 为 0，并校验状态持久化。

## 开始开发前

- [x] 查阅 `ISSUE_LOG.md` 全部已解决条目，重点复核 #003、#005、#007、#008、#012
- [x] 查阅 `design/game-mechanics-v2.md`、自适应学习设计及架构文档
- [x] 确认使用策略单元测试、真实 Controller/View 集成测试和刷新恢复测试

## 编写代码时

- [x] 唯一策略实现 `getMasteryGroup`、`calculateQuestionReward`、`calculateAccuracyBonus`
- [x] 默认自适应模式不被 UI 强制覆盖
- [x] QUALIFYING 属于复杂掌握能力但不进入默认自适应分布
- [x] LAP_REVIEW 使用 `originalMode` 计算掌握状态和奖励
- [x] 重复提交、重复结算和恢复会话保持幂等
- [x] `ProgressTracker` 持久化状态与 `GameState` 学习汇总一致
- [x] 不改变赛道价格、氮气价格、余额或门槛

## 编写测试时

- [x] 每种题型与奖励边界均覆盖
- [x] Main Scenario：同一单词通过简单和复杂题后成为 mastered
- [x] Alternative Scenarios：答错、重复提交、重复结算、恢复会话
- [x] 集成测试使用真实 `LearningController`、`ProgressTracker` 和 `QuizView`
- [x] `beforeEach` 清理 localStorage
- [x] 刷新后 mastered 状态与首页汇总恢复正确

## 提交代码前

- [x] `npx vitest run`（59 files / 787 tests passed）
- [x] `npm run build`
- [x] `npm run validate:data:strict`
- [x] `git diff --check`
- [x] 手动验证完整简单题→复杂题→掌握流程（用户于 2026-09-04 确认通过）
- [x] 对照 ISSUE_LOG 并记录新问题/经验（新增 #016、#017）
