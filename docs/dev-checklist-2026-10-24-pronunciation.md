# 发音功能开发检查清单

## 开始开发前

- [x] 查阅 ISSUE_LOG 所有已解决条目及预防措施
- [x] 查阅自适应学习设计与当前实现
- [x] 编写 `design/pronunciation-audio.md`
- [x] 确认单元、真实对象集成和浏览器端到端测试策略

## 编写代码时

- [x] 每个发音 Use Case 都有对应实现
- [x] 公开方法与设计文档一致
- [x] DOM 和 EventBus 监听器在 unmount 时清理
- [x] 设置通过共享 GameState 流动并按用户隔离
- [x] 反向题和语境题不泄露音标或发音
- [x] 音频生成、清单校验和离线构建使用同一路径规则

## 编写测试时

- [x] 覆盖正常播放、手动重播和停止
- [x] 覆盖播放失败与缺失音频
- [x] 集成测试使用真实 LearningController、GameState 和 LearningView
- [x] 每个 beforeEach 清理 localStorage
- [x] 覆盖重复 render、快速切题和多次 mount/unmount
- [x] 覆盖旧存档迁移、多用户隔离和导入保存
- [x] 覆盖反向题和语境题防泄露

## 提交前

- [x] 运行 `npx vitest run`
- [x] 运行词库和音频完整性校验
- [x] 完成离线构建
- [x] 手动完成新词、学习卡、正向题；反向与语境防泄露由真实对象集成测试覆盖
- [x] 对照 ISSUE_LOG 预防措施复核
- [x] 将新经验记录到 ISSUE_LOG
