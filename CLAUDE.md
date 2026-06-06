# Word Racing 项目约束

## 项目定位
词汇学习游戏，结合赛车玩法和自适应学习系统。

## 技术栈
- ES6 Modules（无框架）
- Vitest 测试框架
- Canvas 2D 渲染
- 纯前端（localStorage 持久化）

## 开发流程强制要求

### 开始新功能前**必须**做：
1. **查阅 ISSUE_LOG.md**：阅读所有"已解决"条目，特别关注预防措施
2. **查阅设计文档**：`design/` 目录下相关设计文档，理解完整 Use Case
3. **使用开发检查清单**：复制 `docs/dev-checklist.md`，逐项勾选

### 编写代码时**必须**做：
1. **对照设计文档**：每个 Use Case 步骤是否都有对应实现？
2. **公开方法检查**：设计文档提到的公开方法，实现中是否都存在？
3. **事件监听检查**：UI 组件是否正确订阅了事件？（参考 ISSUE_LOG #005）
4. **数据流向检查**：数据是否通过正确的 API 流动？（参考 ISSUE_LOG #003）

### 编写测试时**必须**做：
1. **Main Scenario + Alternative Scenarios**：正常和异常场景都要覆盖
2. **集成测试策略**：
   - 单元测试：可以用 mock 隔离依赖
   - **集成测试：禁止完全 mock，必须使用真实对象或部分 mock**（参考 #005、#007）
   - E2E 测试：必须走完整调用链
3. **测试隔离**：beforeEach 必须清理 localStorage（参考 #003）

### 提交代码前**必须**做：
1. **运行完整测试套件**：`npx vitest run`，确认无回归
2. **手动测试**：至少测试一次完整流程
3. **更新 ISSUE_LOG**：如果有新问题或新经验，立即记录

## ISSUE_LOG 重要条目索引

### 测试设计类（最容易犯错）
- **#003**: 测试隔离问题 → beforeEach 清理 localStorage
- **#005**: 集成遗漏（方法未被调用）→ 集成测试必须验证方法被调用
- **#007**: 集成遗漏（方法不存在）→ 集成测试必须使用真实对象

### 数据迁移类
- **#002**: GameState 扩展字段未迁移 → 版本号 + 默认值

### 业务逻辑类
- **#003**: 赛道选择未验证金币 → Alternative Scenario 必须测试

## 架构原则

### 单一数据源
- 所有游戏状态通过 `GameState` 管理
- Game 类通过 getter/setter 访问 GameState
- LearningController 和 Game 共享同一个 GameState 实例

### EventBus 单一原则
- 整个应用使用单一 EventBus（在 main-v2.js 创建）
- LearningController 接受 EventBus 注入，不自建独立总线
- 所有模块的事件都在同一总线上，避免事件隔离
- 构造函数不能发事件，避免未完全初始化时触发回调

### 初始化顺序（强制）
1. **EventBus**（最先创建）
2. **LearningController**（注入 EventBus）
3. **Game**（共享 LearningController 的 GameState）
4. **ViewManager**（注入 EventBus + Game + LearningController）

### 依赖注入
- 通过构造函数注入依赖（EventBus, GameState）
- 保持向后兼容（可选参数 + 默认值）

### 事件驱动
- 跨模块通信通过 EventBus
- UI 组件订阅事件，不直接依赖业务逻辑

## 测试命令

```bash
# 运行所有测试
npx vitest run

# 运行单个测试文件
npx vitest run tests/achievement-panel.test.js

# 运行测试并生成覆盖率
npx vitest run --coverage
```

## 启动开发服务器

```bash
# 在项目根目录运行
npx http-server . -p 3000

# 访问
http://localhost:3000/index.html
```
