# 问题日志 - Issue Log

> 记录开发过程中发现的问题、原因、解决方案和预防措施，避免重复犯错。

## 使用说明

- **每发现一个 bug/问题** → 立即记录到"待分析"区
- **分析出原因后** → 移动到"已分析"区，填写原因和解决方案
- **问题解决后** → 移动到"已解决"区，补充预防措施
- **后续开发时** → 先查阅此日志，避免重蹈覆辙

---

## 待分析问题

*（新发现的问题暂时放在这里）*

---

## 已分析问题

*（原因已找到，待解决方案）*

---

## 已解决问题

### #012 - Event Listener 累积导致多次触发
**发现时间**: 2026-06-06
**问题类型**: 架构设计缺陷
**严重程度**: 高

**问题描述**:
用户在quiz状态下点击"我不认识"按钮，出现学习面板后，点击"我知道了"按钮，quiz意外结束。

**原因分析**:
1. BaseView.onClick() 使用 addEventListener 但不清理监听器
2. View 多次 mount/unmount 后监听器累积
3. 一次点击触发多个监听器 → 多次调用处理函数
4. 第二次调用时 getCurrentQuestion() 返回 null → 触发 showComplete()

**解决方案**:
1. BaseView 跟踪所有 DOM 监听器，unmount 时移除
2. LearningController.submitAnswer() 检查 question.answered 标志
3. QuizView.#handleAnswer() 添加 #isProcessingAnswer 防抖标志
4. 添加调试日志帮助排查

**预防措施**:
1. ✅ **DOM 事件监听器必须清理**：所有 View 在 unmount 时必须移除 DOM 监听器
2. ✅ **状态标志双重保护**：业务逻辑层和 UI层都要有防重复标志
3. ✅ **测试必须覆盖多次 mount/unmount**：所有 View 的测试都要验证监听器不累积
4. ✅ **快速点击场景必须测试**：UI 交互测试要包含连续点击场景

**相关文件**:
- `views/base-view.js`
- `views/quiz-view.js`
- `learning/learning-controller.js`

---

### #011 - 双重 EventBus 导致学习系统事件隔离
**发现时间**: 2026-06-02
**问题类型**: 架构设计缺陷
**严重程度**: 中

**问题描述**:
LearningController 自建独立 EventBus，导致学习系统的事件（ACHIEVEMENT_UNLOCKED、SESSION_START、QUIZ_COMPLETE）无法被其他模块监听。之前 LearningUI 发出 VIEW_CHANGE 事件没有响应，就是因为它在内部 EventBus 上。

**原因分析**:
1. LearningController 构造函数直接 `new EventBus()`，不接受外部注入
2. main-v2.js 后创建主 EventBus，两个总线完全隔离
3. 事件隔离导致模块间通信失败

**解决方案**:
1. LearningController 构造函数接受可选的 `eventBus` 参数：`constructor(eventBus = null)`
2. main-v2.js 调整初始化顺序：先创建 EventBus，再注入给 LearningController
3. 保持向后兼容：不传参数时仍自建 EventBus（测试环境继续工作）

**预防措施**:
1. ✅ 整个应用必须使用单一 EventBus，避免自建独立总线
2. ✅ 初始化顺序强制：EventBus → LearningController → Game → ViewManager
3. ✅ 构造函数不能发事件，避免未完全初始化时触发回调
4. ✅ 已更新 CLAUDE.md 架构原则，明确 EventBus 单一原则

**相关文件**:
- `learning/learning-controller.js`
- `js/main-v2.js`
- `CLAUDE.md`

---

### #010 - F5 后续答链路被旁路入口覆盖导致仍从 Q1 开始
**发现时间**: 2026-06-02
**问题类型**: 多入口竞争 / 导航事件错位
**严重程度**: 高

**问题描述**:
用户手测：答一道题后 F5 刷新 → 进入 Quiz → Continue Quiz → 仍然从 Q1 开始，而不是 Q2。

**原因分析**:
1. `LearningUI.showResumePrompt()` 发出的 `VIEW_CHANGE` 事件走的是学习系统内部 EventBus，和 `ViewManager` 的主 EventBus 不一致，导航不会被响应。
2. `ViewManager` 在 `QUIZ_START` 事件里调用 `game.startNewQuiz()`，这是一个旁路入口，会绕过 `LearningController.startNewQuiz()`，导致旧 session 被清空或状态不一致。
3. Continue/Restart 回调没有明确触发 `QuizView.showQuestion()`，而是依赖导航事件自动渲染。

**解决方案**:
1. 移除 `LearningUI` 里不必要发出的 `VIEW_CHANGE` 事件，续答弹窗只在 Quiz 页出现。
2. `ViewManager` 的 `QUIZ_START` 处理只做页面切换，不再调用 `game.startNewQuiz()`，答题入口统一走 `QuizView/LearningController`。
3. `QuizView.#initializeQuiz()` 在 Continue/Restart 回调里显式调用 `this.showQuestion()`，确保渲染恢复或新开的题目。
4. `LearningController.promptResumeQuiz()` 支持传递 `onRestart` 回调，保证重开也能触发 UI 渲染。

**预防措施**:
1. ✅ 单一入口：答题流程必须只有一个入口，避免旁路覆盖主状态。
2. ✅ UI 组件不在自己无法控制的 EventBus 上发导航事件，导航应由当前页面或 ViewManager 统一处理。
3. ✅ 续答/重开的回调链必须显式验证渲染，不能假设导航会自动触发渲染。

**相关文件**:
- `views/view-manager.js`
- `views/quiz-view.js`
- `learning/learning-controller.js`
- `ui/learning-ui.js`

---

### #009 - Continue Quiz 恢复数据后没有渲染题目
**发现时间**: 2026-06-01
**问题类型**: UI 回调链遗漏
**严重程度**: 高

**问题描述**:
用户答两题后刷新，进入 Quiz 点击 Continue Quiz，弹窗消失但页面没有自动显示第三题；继续点击 Retry Quiz 时可能看到空题目。

**原因分析**:
1. `LearningController.resumeSession()` 已经把题目恢复到内存，但调用方没有触发 `QuizView.showQuestion()`
2. `LearningUI.showResumePrompt()` 只负责关闭弹窗和发事件，不知道当前页面实例，也不能可靠渲染 QuizView
3. 之前测试只断言 controller 当前题索引和题目数据，没断言页面是否渲染了进度和选项

**解决方案**:
1. `LearningController.promptResumeQuiz()` 支持传入 `onContinue` 回调
2. `QuizView.#initializeQuiz()` 在 Continue 成功恢复后调用 `this.showQuestion()`
3. `resume-prompt-flow` 测试新增 UI 断言：Continue 后 `#quiz-progress` 显示恢复进度，`#quiz-options` 渲染选项按钮

**预防措施**:
1. ✅ 断点续答类测试必须同时验证数据状态和 UI 渲染状态
2. ✅ UI 入口触发业务恢复后，必须明确验证页面是否进入目标状态
3. ✅ 跨组件事件不能替代当前组件的显式回调，除非测试覆盖完整导航链

**相关文件**:
- `learning/learning-controller.js`
- `views/quiz-view.js`
- `ui/learning-ui.js`
- `tests/resume-prompt-flow.test.js`

---

### #008 - 断点续答只有入口，没有真实恢复
**发现时间**: 2026-06-01
**问题类型**: 假实现 / 持久化数据不完整
**严重程度**: 高

**问题描述**:
完整答完一套题后，刷新并进入 Quiz 仍出现 Continue Quiz 弹窗；中途退出后点击 Continue Quiz，并没有恢复到未答题，而是重新开了一套题。

**原因分析**:
1. `LearningController.resumeSession()` 调用 `resumeSession()` 后又清空 session 并 `startNewQuiz()`，方法名是 resume，行为实际是 restart
2. `QuizSessionManager.setQuestions()` 只保存 `wordId/word/meaning/mode`，丢失 `options/correctIndex/prompt/sentence` 等恢复渲染和判题所需字段
3. `QuizSessionManager.completeQuiz()` 设置 `completed = true` 后没有再次保存到 localStorage，刷新后可能仍被识别为未完成
4. 之前测试只验证弹窗出现，没有验证点击 Continue 后是否恢复到原题目

**解决方案**:
1. `setQuestions()` 改为保存完整可恢复题目字段
2. `hasUnfinishedSession()` 和 `resumeSession()` 只接受今天、未完成、题目完整且当前题可判题的 session
3. `completeQuiz()` 设置完成状态后立即保存
4. `LearningController.resumeSession()` 直接恢复 `session.questions`，不再重开新题

**预防措施**:
1. ✅ 凡是 `resume/restore/continue` 功能，测试必须验证恢复后的业务状态，不只验证 UI 入口
2. ✅ 持久化恢复类功能必须模拟刷新：新建真实 controller/manager 后恢复
3. ✅ 完成态写入必须有 localStorage 断言，防止内存状态和持久化状态不一致
4. ✅ 旧格式/不完整 session 必须作为不可恢复场景测试，避免半恢复导致错误答题

**相关文件**:
- `learning/quiz-session.js`
- `learning/learning-controller.js`
- `tests/quiz-session.test.js`
- `tests/learning-resume.test.js`
- `tests/resume-prompt-flow.test.js`

---

### #007 - LearningController 缺少 getAchievements() 方法
**发现时间**: 2026-06-01
**问题类型**: 集成遗漏
**严重程度**: 高

**问题描述**:
刷新页面时出现 JS 错误：`LearningController.getAchievements is not a function`，导致 AchievementPanel 初始化失败。

**原因分析**:
1. 设计文档（UC-04）明确定义 `learningController.getAchievements()` 方法
2. LearningController 内部已有 `#achievementManager`，但忘记暴露公开方法
3. 测试时使用 mock 对象，没有发现真实 LearningController 缺少该方法
4. 这是 ISSUE_LOG #005（集成遗漏）的典型场景：单元测试通过但集成时失败

**解决方案**:
```javascript
// learning/learning-controller.js
getAchievements() {
  return this.#achievementManager.getAllStatus();
}
```

**预防措施**:
1. ✅ **集成测试必须使用真实对象**：测试 AchievementPanel 时应该使用真实的 LearningController，而不是完全 mock
2. ✅ **对照设计文档检查公开方法**：每个 Use Case 提到的公开方法都要在实现中存在
3. ✅ **测试清单对照法**：UC-04 步骤3提到"调用 learningController.getAchievements()"，实现时应该逐项检查

**如何避免重复犯错（流程改进）**:
1. ✅ **强制查阅 ISSUE_LOG**：开发新功能前，必须先查阅相关 ISSUE_LOG 条目（已创建 `docs/dev-checklist.md`）
2. ✅ **代码注释提醒**：在关键文件头部添加 ISSUE_LOG 引用（已在 `learning-controller.js` 添加）
3. ✅ **集成测试策略改进**：
   - 单元测试可以用 mock
   - **集成测试禁止完全 mock**，必须使用真实对象
   - 必须验证"方法被调用"，不能只验证"方法存在"
4. ✅ **开发检查清单强制执行**：每次开发时逐项勾选 `docs/dev-checklist.md`

**根本原因**:
- ISSUE_LOG 存在但未被主动查阅
- 测试策略有缺陷：过度依赖 mock，没有验证真实集成
- 开发流程中缺少"对照 ISSUE_LOG 检查"这个强制步骤

**这次犯错的反思**:
虽然 ISSUE_LOG #005 已经记录了同类问题，但在实现 #007 时**没有主动查阅 ISSUE_LOG**，导致重复犯错。这说明：
- ISSUE_LOG 不能只是"记录"，必须有"强制查阅"的机制
- 预防措施不能只是"建议"，必须有"强制执行"的流程
- 测试策略必须明确区分"单元测试"和"集成测试"的 mock 使用规范

**相关文件**:
- `learning/learning-controller.js`
- `tests/achievement-panel.test.js`
- `design/赛道解锁系统详细设计.md` (UC-04)

---

### #006 - 赛道系统实现完整流程（Phase 3 总结）
**发现时间**: 2026-06-01
**问题类型**: 最佳实践记录
**严重程度**: N/A（成功案例）

**问题描述**:
完整实现赛道解锁系统（Phase 3.1a ~ 3.6），包括：
- GameState 单一数据源（fuelCoins/gearCoins/unlockedTracks/selectedTrackId）
- Game.selectTrack/startRace/getAvailableTracks
- ShopView 赛道标签页
- AchievementToast 通知组件
- AchievementPanel 成就面板

**成功经验总结**:

1. **TDD 严格实践**：
   - 先写测试（Red）→ 再实现（Green）→ 重构（Refactor）
   - 每个阶段都运行完整测试套件，确保无回归
   - 测试覆盖 Main Scenario + 所有 Alternative Scenarios

2. **ISSUE_LOG 经验复用**：
   - #003（测试隔离）：所有涉及 GameState 的测试都在 beforeEach 中清理 localStorage
   - #001（解锁≠免费）：测试正确区分"已解锁"和"可购买"状态
   - #005（集成遗漏）：每个 UI 组件都测试事件监听是否正确绑定

3. **单一数据源原则**：
   - Game 类通过 getter/setter 访问 GameState，保持数据一致性
   - LearningController 和 Game 共享同一个 GameState 实例
   - 所有状态变更都通过 GameState API，便于持久化和调试

4. **依赖注入与向后兼容**：
   - Game 构造函数支持可选的 gameState 参数，不破坏现有调用
   - Track 构造函数支持可选的 waypoints/trackWidth 参数，向后兼容

5. **UI 组件解耦**：
   - Toast/Panel 通过 EventBus 监听事件，不直接依赖 AchievementManager
   - ShopView 通过 Game API 访问数据，不直接操作 GameState

**预防措施**:
1. ✅ **TDD 是必须的，不是可选的**：所有新功能都必须先写测试
2. ✅ **每个 Phase 都要验证集成**：不仅要测单元，还要测集成
3. ✅ **Issue Log 要持续更新**：成功经验也要记录，不仅是失败教训

**相关文件**:
- `tests/game-gamestate-integration.test.js` (Phase 3.1a)
- `tests/game-track-selection.test.js` (Phase 3.2)
- `tests/shop-view-tracks.test.js` (Phase 3.4)
- `tests/achievement-toast.test.js` (Phase 3.3)
- `tests/achievement-panel.test.js` (Phase 3.5)
- `design/赛道解锁系统详细设计.md`

---

### #001 - 测试设计错误：期望免费赛道
**发现时间**: 2026-06-01
**问题类型**: 测试设计缺陷
**严重程度**: 低

**问题描述**:
测试用例期望有 cost=0 的免费赛道，但设计文档明确所有赛道都需要消耗金币。"默认解锁"不等于"免费"，解锁只是允许选择，选择后仍需付费。

**原因分析**:
1. 对"解锁"概念理解错误，混淆了"解锁（允许选择）"和"免费（无需付费）"
2. 未仔细阅读设计文档，设计文档中所有赛道都有 cost > 0
3. 测试用例编写时未与业务逻辑对齐

**解决方案**:
```javascript
// 错误的测试
it('cost 为 0 的赛道应该默认可用', () => {
  const freeTracks = Object.values(TRACK_REGISTRY).filter(t => t.cost === 0);
  expect(freeTracks.length).toBeGreaterThan(0);
});

// 修正后的测试
it('所有赛道都应该有成本', () => {
  const tracks = Object.values(TRACK_REGISTRY);
  tracks.forEach(track => {
    expect(track.cost).toBeGreaterThan(0);
  });
});
```

**预防措施**:
1. ✅ **测试用例编写前先理解业务逻辑**：仔细阅读设计文档，明确概念定义
2. ✅ **区分相似概念**：解锁 ≠ 免费，解锁是权限，免费是成本
3. ✅ **测试评审**：测试用例写完后，对照设计文档检查是否符合业务逻辑

**相关文件**:
- `tests/track-registry.test.js`
- `config/track-registry.js`
- `design/赛道解锁系统详细设计.md`

---

### #003 - 测试隔离问题：localStorage 持久化导致测试相互影响
**发现时间**: 2026-06-01
**问题类型**: 测试设计缺陷
**严重程度**: 中

**问题描述**:
成就管理器测试相互影响，前一个测试设置的 GameState 被持久化到 localStorage，导致后续测试的初始状态不正确。例如，测试期望 achievements 为空，但实际包含前一个测试解锁的成就。

**原因分析**:
1. GameState 自动持久化到 localStorage
2. 测试用例没有在 beforeEach/afterEach 中清理 localStorage
3. 测试之间共享了持久化状态

**解决方案**:
```javascript
// tests/achievement-manager.test.js
beforeEach(() => {
  localStorage.clear();  // 清理持久化状态
  eventBus = new EventBus();
  gameState = new GameState(eventBus);
  manager = new AchievementManager(eventBus, gameState);
});

afterEach(() => {
  localStorage.clear();  // 确保清理
});
```

**预防措施**:
1. ✅ **测试隔离强制要求**：所有涉及持久化的测试必须在 beforeEach/afterEach 中清理存储
2. ✅ **测试设计检查清单**：检查 localStorage、sessionStorage、全局变量等共享状态
3. ✅ **测试失败时检查持久化**：遇到"不该有数据但有数据"的错误，首先检查持久化清理

**相关文件**:
- `tests/achievement-manager.test.js`
- `core/game-state.js`

---

### #004 - null 值导致 achievement.check() 报错
**发现时间**: 2026-06-01
**问题类型**: 代码健壮性问题
**严重程度**: 中

**问题描述**:
当 state.learning 为 null 或 undefined 时，achievement.check() 函数访问 state.learning.totalQuizzes 会抛出 TypeError。

**原因分析**:
1. check 函数直接访问 state.learning.totalQuizzes，未考虑 null/undefined 情况
2. 测试用"应该在条件不满足时不解锁成就"设置了 totalQuizzes=0，但没设置 learning 对象
3. 错误处理虽然捕获了错误，但会导致该成就检查失败

**解决方案**:
```javascript
// 错误的写法
check: (state) => state.learning.totalQuizzes >= 1

// 修正的写法（使用可选链和默认值）
check: (state) => (state.learning?.totalQuizzes || 0) >= 1
```

**预防措施**:
1. ✅ **防御式编程**：访问嵌套对象属性时使用可选链（?.）和默认值
2. ✅ **边界条件测试**：测试 null、undefined、空对象等边界情况
3. ✅ **代码审查**：检查所有嵌套属性访问，确保健壮性

**相关文件**:
- `config/achievements.js`
- `tests/achievement-manager.test.js`

---

### #005 - 集成测试遗漏：成就检查未被调用
**发现时间**: 2026-06-01
**问题类型**: 测试设计缺陷
**严重程度**: 高

**问题描述**:
测试了 AchievementManager.checkAll() 能正确检查成就条件，但忘记测试 LearningController.completeQuiz() 会调用 checkAll()，导致集成时成就系统不工作。**手动测试时玩家完成一套题后 achievements 数组仍为空，没有任何成就解锁。**

**原因分析**:
1. 只关注单元测试，忽略了集成测试
2. AchievementManager 单独可工作，但 LearningController 从未实例化它、从未调用 checkAll()
3. learning.lastPerfectQuiz 字段也从未被更新（perfect-streak 永远不会触发）
4. 测试设计原则记忆不深刻："不仅要测功能存在，还要测功能被触发"

**解决方案**:
1. `LearningController` 构造函数实例化 `AchievementManager`
2. `LearningController.completeQuiz()` 中：
   - 设置 `learning.lastPerfectQuiz`（DailyManager 不负责此字段）
   - 调用 `#achievementManager.checkAll()`
3. 暴露 `gameState` 和 `achievementManager` 访问器
4. 新增 `tests/integration/achievement-flow.test.js`（12 个用例），覆盖：
   - 完成套题触发成就解锁与赛道解锁
   - perfect-streak 触发条件与 lastPerfectQuiz 重置
   - ACHIEVEMENT_UNLOCKED 事件发送
   - 重复解锁避免
   - 累计统计正确性

**特别注意 - 双重累加陷阱**：
DailyManager.completeQuiz() 内部已经调用了 `gameState.modify('learning.totalQuizzes', 1)` 等。
在 LearningController.completeQuiz() 中**不要再次累加**，否则会双倍递增。
（首次实现时踩了这个坑，集成测试立刻发现了。）

**预防措施**:
1. ✅ **测试清单对照法强制执行**：每个 Use Case 必须有测试清单，逐项勾选
2. ✅ **协调层测试强制要求**：Controller/Manager 类的入口方法必须测试，验证所有下游调用
3. ✅ **集成测试必须走完整调用链**：禁止绕过入口方法直接调用底层
4. ✅ **新增 GameState 字段时检查所有写入点**：避免多处重复累加同一字段

**相关文件**:
- `learning/learning-controller.js`
- `learning/daily-manager.js` (已在内部累加 totalQuizzes/totalQuestions/totalCorrect)
- `systems/achievement-manager.js`
- `tests/integration/achievement-flow.test.js`
- `design/赛道解锁系统详细设计.md` (测试设计原则章节)

**参考**:
- 记忆：`D:\cc\.claude\projects\D--cc-vibe-coding-word-racing\memory\testing-principles.md`

---

### #002 - GameState 扩展字段未迁移旧存档
**发现时间**: 2026-06-01
**问题类型**: 数据迁移缺陷
**严重程度**: 中

**问题描述**:
新增 `achievements`, `unlockedTracks`, `selectedTrackId` 字段后，旧存档加载失败或数据丢失。

**原因分析**:
1. GameState.#load() 直接合并旧数据，未填充默认值
2. 缺少版本检查和迁移逻辑
3. 未考虑向后兼容性

**解决方案**:
```javascript
#load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);

      // 兼容旧版本：添加默认值
      if (!parsed.achievements) parsed.achievements = [];
      if (!parsed.unlockedTracks) parsed.unlockedTracks = ['shanghai-2d'];
      if (!parsed.selectedTrackId) parsed.selectedTrackId = 'shanghai-2d';

      this.#state = { ...this.#deepClone(DEFAULT_STATE), ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load game state:', e);
  }
}
```

**预防措施**:
1. ✅ **GameState 扩展必须添加默认值**：在 #load() 中检查新字段，不存在则初始化
2. ✅ **版本号管理**：每次结构变更时更新 `state.version`，可按版本执行迁移逻辑
3. ✅ **测试旧存档兼容性**：在测试中模拟旧版本存档，验证迁移逻辑

**相关文件**:
- `core/game-state.js`
- `tests/game-state.test.js`

---

### #003 - 赛道选择时未验证金币是否足够
**发现时间**: 2026-06-01
**问题类型**: 业务逻辑缺陷
**严重程度**: 高

**问题描述**:
Game.selectTrack() 只检查了赛道是否解锁，忘记检查金币是否足够，导致玩家可以免费玩付费赛道。

**原因分析**:
1. 详细设计文档写了检查金币，但实现时遗漏
2. 单元测试未覆盖"金币不足"场景
3. Use Case 的 Alternative Scenario 未完整测试

**解决方案**:
```javascript
selectTrack(trackId) {
  const track = TRACK_REGISTRY[trackId];
  if (!track) throw new Error('Unknown track');

  // 检查是否解锁
  const unlocked = this.#gameState.get('unlockedTracks') || [];
  if (!unlocked.includes(trackId)) {
    throw new Error('Track not unlocked');
  }

  // 检查金币（补充）
  const fuelCoins = this.#gameState.get('fuelCoins');
  if (fuelCoins < track.cost) {
    throw new Error('Insufficient fuel coins');
  }

  this.selectedTrackId = trackId;
  this.#gameState.set('selectedTrackId', trackId);
}
```

**预防措施**:
1. ✅ **Alternative Scenario 必须测试**：每个 Use Case 的异常场景都要有测试用例
2. ✅ **业务规则检查清单**：关键业务规则（如金币扣除）必须列出检查项
3. ✅ **代码审查对照设计文档**：实现完成后，对照设计文档逐项检查

**相关文件**:
- `js/game.js`
- `tests/game-track-selection.test.js`
- `design/赛道解锁系统详细设计.md` (UC-02)

---

## 统计数据

**总问题数**: 7
**待分析**: 0
**已分析**: 0
**已解决**: 7

**问题类型分布**:
- 测试设计缺陷: 3 (43%)
- 集成遗漏: 2 (29%)
- 数据迁移缺陷: 1 (14%)
- 业务逻辑缺陷: 1 (14%)

**严重程度分布**:
- 高: 3 (43%)
- 中: 2 (29%)
- 低: 1 (14%)
- N/A: 1 (14%)

---

## 问题预防检查清单

每次开发新功能时，先查阅此清单：

### 测试设计
- [ ] 测试清单对照法是否执行？
- [ ] 入口方法是否测试？
- [ ] 是否走了完整调用链？
- [ ] Alternative Scenario 是否测试？
- [ ] 所有下游调用是否验证？

### 数据迁移
- [ ] GameState 扩展是否添加默认值？
- [ ] 旧存档兼容性是否测试？
- [ ] 版本号是否更新？

### 业务逻辑
- [ ] 业务规则检查清单是否列出？
- [ ] 边界条件是否测试？
- [ ] 错误处理是否完整？

---

## 模板：新增问题

```markdown
### #NNN - 问题标题
**发现时间**: YYYY-MM-DD
**问题类型**: 测试设计缺陷 | 数据迁移缺陷 | 业务逻辑缺陷 | 性能问题 | UI/UX问题
**严重程度**: 高 | 中 | 低

**问题描述**:
（简明扼要描述问题现象）

**原因分析**:
1. （根本原因1）
2. （根本原因2）

**解决方案**:
（代码片段或步骤）

**预防措施**:
1. ✅ （具体措施1）
2. ✅ （具体措施2）

**相关文件**:
- `path/to/file.js`
- `tests/file.test.js`

**参考**:
- 相关设计文档链接
- 相关记忆文件链接
```
