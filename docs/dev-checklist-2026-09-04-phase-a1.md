# 阶段 A1 开发检查清单

> 任务：将运行时词库收口为唯一的“上海中考考纲”，归档旧词库，并迁移旧选择。

## 开始开发前

- [x] 查阅 `ISSUE_LOG.md` 全部已解决条目及预防措施
- [x] 查阅相关设计文档：自适应学习架构、学习系统 v2 的词库与存储设计
- [x] 确认测试策略：加载器单元测试 + 使用真实 `VocabularyQuiz` 的集成测试 + 构建产物校验

## 编写代码时

- [x] 对照阶段 A1 的 Main Scenario 和 Alternative Scenarios
- [x] 检查现有公开方法保持可用
- [x] 检查本阶段不新增或改变 EventBus 监听
- [x] 检查词库选择只通过加载器 API 和 `wr_wordset_config` 流动
- [x] 检查本阶段不新增 View 生命周期问题

## 编写测试时

- [x] Main Scenario：唯一词库加载并返回 1,982 词
- [x] Alternative Scenarios：旧 ID、任意无效 ID、配置离线、词库请求失败、损坏数据
- [x] 集成测试使用真实 `VocabularyQuiz`，不完全 mock 业务对象
- [x] 每个测试在 `beforeEach` 清理 localStorage
- [x] 测试重复迁移保持幂等
- [x] 验证归档词库不进入构建产物

## 提交代码前

- [x] 运行 `npx vitest run`（57 files / 777 tests passed）
- [x] 运行 `npm run build`
- [x] 运行 `npm run validate:data:strict`
- [x] 运行 `git diff --check`
- [ ] 手动测试至少一次完整加载与开始答题流程
- [x] 对照 ISSUE_LOG 预防措施
- [x] 如发现新问题或经验，更新 `ISSUE_LOG.md`（新增 #015）
