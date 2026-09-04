# Word Racing 当前架构、功能与优化分析

> 分析基线：当前工作区代码（`package.json` 版本 2.1.0）  
> 分析方法：从实际入口、调用链、状态读写、事件、配置、数据文件和测试反向推导。本文描述“代码当前实际行为”；历史设计文档只作为背景，不作为事实来源。

## 1. 产品定位与核心循环

Word Racing 是面向约 12 岁孩子的英语词汇学习游戏。它把学习反馈和赛车奖励连接起来，核心动机循环是：

```text
选择词库与难度
    ↓
完成自适应单词题（获得燃油币，按正确率获得装备币）
    ↓
累计学习进度、错词、连续答对和成就
    ↓
用燃油币支付跑圈成本，用装备币购买氮气
    ↓
解锁并驾驶不同的 2D / 3D 赛道
    ↓
查看学习报告、排行榜和下一阶段目标
```

产品价值有两条并行主线：

- 学习线：接触单词 → 简单题通过 → 复杂题通过 → 掌握 → 遗忘后复习。
- 游戏线：答题赚币 → 解锁赛道与购买氮气 → 跑圈 → 获得成绩与持续动力。

当前实现中，学习进度是长期成长主轴；赛车主要消耗学习奖励并提供即时娱乐反馈，赛车成绩尚未反向影响学习策略。

## 2. 技术概览

| 项目 | 当前实现 |
|---|---|
| 应用形态 | 纯前端单页应用，无框架、无构建步骤即可运行 |
| 模块系统 | 原生 ES Modules |
| UI | HTML + CSS + DOM View 类 |
| 2D 赛车 | Canvas 2D |
| 3D 赛车 | Three.js 0.184，Import Map 加载 |
| 持久化 | localStorage；可选 File System Access API 自动保存 |
| 测试 | Vitest + jsdom，约 60 个测试文件 |
| 代码规模 | 约 27,262 行 JavaScript（含测试与脚本） |
| 默认词库 | 上海中考考纲，1,982 词 |
| 运行时词库 | 仅上海中考 1,982 词；旧词库位于归档目录且不参与运行或构建 |

## 3. 运行时总体架构

### 3.1 分层结构

```text
index.html
└─ js/main-v2.js                         组合根 / 应用启动
   ├─ core/UserManager                   当前玩家与多用户
   ├─ core/DataManager                   导入、导出、自动保存
   ├─ core/EventBus                      跨模块消息总线
   ├─ learning/LearningController        学习用例门面
   │  ├─ core/GameState                  游戏状态单一数据源
   │  ├─ ProgressTracker                 单词掌握状态
   │  ├─ DailyManager                    每日目标与历史
   │  ├─ QuizSessionManager              未完成套题和答案
   │  ├─ AdaptiveSelector                自适应选词与题型
   │  └─ AchievementManager              成就与奖励
   ├─ js/Game                            赛车与经济用例协调器
   │  ├─ VocabularyQuiz                  旧/独立答题引擎
   │  ├─ ShopSystem                      商店交易
   │  ├─ TrackUnlockManager              赛道解锁状态
   │  ├─ TrackFactory                    2D/3D 赛道创建
   │  └─ RenderSystem                    2D 场景和结果页绘制
   └─ views/ViewManager                  页面生命周期与导航
      ├─ HomeView
      ├─ QuizView
      ├─ ShopView
      ├─ RaceView
      └─ ReportView
```

### 3.2 启动和依赖注入顺序

真实启动入口是 `index.html` 中的 `js/main-v2.js`。DOMContentLoaded 后按以下顺序执行：

1. 创建全局唯一 `EventBus`。
2. 初始化 `DataManager`，优先恢复文件存档。
3. 初始化 `UserManager`，创建或选择当前用户，并迁移旧数据。
4. 创建 `LearningController`；它为当前用户创建 `GameState`。
5. 创建 `Game`，把同一个 `GameState` 和 `EventBus` 注入进去。
6. `Game.init()` 加载词库、赛道和输入系统。
7. 创建 `ViewManager`、成就 UI、用户切换器和全局设置菜单。

这保证学习系统和赛车系统共享金币、氮气、解锁赛道、成就与统计，不会各持一份状态。

### 3.3 模块通信方式

系统同时使用三种通信方式：

- 直接方法调用：同一业务边界内，例如 `QuizView → LearningController.submitAnswer()`。
- 依赖注入：`EventBus`、`GameState` 通过构造函数传入。
- 事件总线：跨页面或跨系统通知，例如 `QUIZ_COMPLETE`、`RACE_FINISH`、`RESOURCE_CHANGED`。

事件总线有助于解耦，但目前事件名一部分使用 `Events` 常量，一部分直接写字符串（如 `rank:changed`、`user:switched`），类型和载荷契约没有集中管理。

## 4. 数据与持久化架构

### 4.1 GameState

`GameState` 是通用游戏状态的主要事实来源，按用户写入：

```text
wr_game_state_<userId>
```

当前版本为 v4，主要字段包括：

- 资源：`fuelCoins`、`gearCoins`、`nitroCharges`。
- 答题设置：`quizMode`、`maxLevel`、`currentWordSetId`。
- 学习汇总：已见词数、掌握词数、套题数、题目数、正确数。
- 游戏进度：成就、解锁赛道、当前赛道、排行榜。
- 兼容字段：`wrongWords` 和 `daily` 仍在 GameState 中，但学习子系统也各自维护相关状态。

### 4.2 学习子系统存储

学习数据分为三份用户级存储：

- `wr_word_progress_<userId>`：逐词掌握状态。
- `wr_daily_stats_<userId>`：每日套题、收益、复习和连续答对数据。
- `wr_quiz_session_<userId>`：未完成套题、题目、答案和当前位置。

逐词状态使用单词文本作为 Map 键，并记录 wordId、简单/复杂题通过情况、错误次数以及首次/最近出现日期。

### 4.3 用户与备份

`UserManager` 管理玩家列表和当前玩家。每名玩家拥有独立状态键。`DataManager` 支持：

- 从 localStorage 导出 JSON。
- 导入 JSON 并覆盖本地存档。
- 在支持 File System Access API 的浏览器中选择文件并自动保存。

这对家庭共用电脑非常合适，但目前没有云同步、跨设备冲突解决、备份版本回滚和家长只读视图。

## 5. 功能说明

### 5.1 多用户

- 首次启动创建默认用户。
- 支持新建、切换玩家。
- 用户切换后刷新页面，按用户 ID 加载独立学习和游戏数据。
- 对历史无用户后缀的存储键提供一次性迁移。

### 5.2 词库与难度

阶段 A1 后配置只声明上海中考考纲 1,982 词。沪教六年级和旧版默认词库保留在 `data/archive/legacy-wordsets/`，加载器、构建和发布包均不引用归档文件。

旧用户保存的 `shanghai-grade6` 或其他无效 ID 会幂等迁移为 `shanghai-zhongkao`。词库请求失败会中止初始化并显示明确错误，不再使用临时十词词库继续记录学习进度。难度仍分 1–5 级，学习配置默认最低 2 级、最高 5 级。

### 5.3 题型

题目工厂支持：

| 模式 | 交互 | 当前学习分类 |
|---|---|---|
| PIT_BOARD | 英文词 → 选择释义 | 简单题 |
| STRATEGY | 释义 → 选择英文词 | 简单题 |
| RADIO_MSG | 句子填空 | 复杂题 |
| QUALIFYING | 音标 → 选择英文词 | 题目工厂支持，但未纳入当前学习掌握分类 |
| LAP_REVIEW | 错词复习包装模式 | 复习模式 |

题目由 `QuestionFactory` 生成，干扰项优先考虑同分类、相同或相邻难度和词形相似度。

### 5.4 自适应学习

`AdaptiveSelector` 按以下优先级选词：

1. 当前有错误、需要复习的词。
2. 只通过一种题型、需要检查另一种题型的词。
3. 尚未学习的新词。
4. 其他符合难度范围的词作为补足。

每套题默认 10 题，最多放入 3 个复习词和 2 个检查词。当前每日上限为 20 套题，而 README 仍写“每日 3 套”，文档与实现不一致。

### 5.5 单词掌握状态机

```text
UNLEARNED
   ↓ 首次出现
EXPOSED
   ├─ 简单题通过 ─→ SIMPLE_PASSED ─┐
   └─ 复杂题通过 ─→ COMPLEX_PASSED ─┤
                                     ↓ 两类都通过
                                  MASTERED
                                     ↓ 任一类再次答错
                                  FORGOTTEN
                                     ↓ 再次学习
                                   EXPOSED
```

这个模型清楚、易向孩子解释，但“某类题答对一次即永久通过，直到以后答错”的规则不足以表示间隔记忆强度。

### 5.6 奖励经济

当前实际学习流程由 `LearningController` 发放奖励：

- 简单题答对：3 燃油币。
- 复杂题答对：5 燃油币。
- 单套正确率 60% / 80% / 100%：额外 1 / 2 / 3 装备币。
- 答错：无币。

装备币目前主要用于购买氮气：1 枚买 1 次，3 枚买 3 次。配置里仍存在引擎、轮胎、车身升级商品，但 GameState v4 已删除 upgrades 字段，属于未完成清理的旧功能。

赛车按实际圈数消耗燃油币，每圈 10 枚，圈数可选 1–5。提前退出时按实际完成圈数结算或退还未使用部分。

### 5.7 成就与赛道解锁

已配置的主赛道 progression：

| 累计完成套题 | 解锁赛道 |
|---:|---|
| 初始 | Shanghai 2D |
| 10 | Monaco 2D |
| 20 | Silverstone 2D |
| 30 | Shanghai 3D |
| 50 | Monaco 3D |
| 100 | Silverstone 3D |

成就系统还包含掌握单词数、首次答题和满分等目标，可发放赛道、燃油币或装备币。`night-race-3d` 有注册项，但当前未形成完整解锁路径。

### 5.8 2D 赛车

- Canvas 绘制赛道、赛车、粒子、轮胎痕迹、HUD 和结算页。
- `Track` 使用 Catmull-Rom 插值生成中心线。
- `Car` 处理加速、转向、摩擦、氮气、碰撞、离轨救援和圈数。
- `Game` 使用 `requestAnimationFrame` 驱动状态机：倒计时、比赛、结果。
- 支持键盘和触摸输入。

### 5.9 3D 赛车

- `RaceSession3D` 组合赛道、玩家车、3 辆 AI、相机和排名系统。
- `Track3D` 复用 2D `Track` 的几何查询，并用 Three.js 构建路面、护栏、路肩、起终点和装饰。
- `Car3D` 继承 2D `Car`，复用物理后同步 Three.js 模型。
- AI 使用路径跟随、个性参数和简单的失误/恢复状态机。
- 排名按完赛顺序，或按圈数与赛道进度实时计算。
- HUD 显示速度、档位、转速、圈数、排名、氮气和小地图。

### 5.10 报告、排行榜和数据管理

- 首页展示金币、每日进度、学习统计和最快圈速。
- 报告页展示掌握状态、待复习词以及逐词详情。
- 排行榜保留最快 20 条记录。
- 设置菜单支持清除当日、清除历史、重置全部、导入和导出。

## 6. 当前架构的优点

1. 业务主题统一。学习奖励和赛车消耗形成明确闭环，适合儿童建立短期反馈。
2. 无后端依赖。打开本地服务器即可使用，部署成本和隐私风险低。
3. 学习状态模型明确。单词掌握、错词和会话恢复都有独立模型。
4. 2D/3D 复用良好。3D 赛车复用已有 2D 物理和几何，降低两套规则漂移。
5. 依赖注入与事件总线方向正确。核心模块可单测，跨模块耦合相对可控。
6. 测试资产丰富。测试覆盖学习、经济、赛道、视图、3D、迁移和集成链路。
7. 多用户和备份符合家庭场景。不同孩子可独立使用，家长可手动备份。

## 7. 待优化问题与建议

### 7.1 P0：功能正确性与数据一致性

#### 7.1.1 奖励规则存在两套配置

`config/learning-config.js` 的实际奖励是简单题 3、复杂题 5；`config/game-config.js` 和 `quiz/mode-registry.js` 又定义 10/15 等另一套奖励。`VocabularyQuiz`、`QuizEngine` 和 `LearningController` 并存，使维护者很难判断哪套生效。

建议：建立唯一 `EconomyService` 或唯一奖励配置；所有答题入口只调用 `calculateReward(question, context)`，删除重复表和旧答题链路。

#### 7.1.2 题型分类不完整

`QuestionFactory` 和模式注册表支持 QUALIFYING，但学习掌握分类的复杂题只有 RADIO_MSG。QUALIFYING 答题不会可靠推进 simple/complex 掌握状态；LAP_REVIEW 也需要明确使用其内部真实题型更新掌握度。

建议：把掌握维度从二元 simple/complex 改为能力标签，例如 recognition、recall、context、pronunciation；短期至少把全部模式映射到明确分类并加集成测试。

#### 7.1.3 词库配置与构建漂移（阶段 A1 已解决）

运行时配置已收口为唯一的上海中考词库；校验脚本检查固定 ID、文件、1,982 词、必要字段和唯一 ID，构建脚本只内联该词库。历史词库已归档且禁止作为 fallback。

#### 7.1.4 状态有重复事实来源

错词同时存在于 `GameState.wrongWords`、`VocabularyQuiz.wrongWords` 和 `ProgressTracker`；每日数据也同时存在 GameState.daily 和 DailyManager。重复状态会在恢复、重置、导入和用户迁移时产生不一致。

建议：逐词学习事实全部归 `ProgressRepository`；每日统计归 `DailyRepository`；GameState 只保留经济、赛道、成就和轻量设置。派生统计在读取时计算或缓存。

#### 7.1.5 深层状态合并不安全

`GameState.replace()` 仅对顶层做展开。如果导入存档中的 `learning` 或 `daily` 缺少子字段，默认子字段会整体丢失。`set(path)` 遇到缺失中间对象也会报错。

建议：引入显式 schema、深合并和逐版本迁移；导入前校验，迁移后再原子替换；损坏存档保留备份。

#### 7.1.6 成就条件依赖描述文字解析

成就进度通过从英文 description 中正则提取数字推断目标。修改文案或本地化后可能失效。

建议：成就配置加入结构化条件，如 `{ metric: 'totalQuizzes', operator: 'gte', target: 10 }`，显示文案只负责展示。

### 7.2 P1：产品与学习效果

#### 7.2.1 从“一次答对”升级为间隔重复

当前掌握规则不能区分刚刚答对和一个月后仍会答。建议记录每词的 `ease`、`interval`、`dueAt`、`consecutiveCorrect` 和最近若干次结果，采用简化版 SM-2 或 Leitner 箱。每日优先选择到期词，其次错词，再选新词。

#### 7.2.2 控制奖励通胀并增强目标感

按当前 10 题/套、20 套/日，燃油币产量明显高于每圈 10 枚的消耗，长期可能失去稀缺感。建议建立经济模拟：按典型正确率计算 7/30 天收入、赛道消耗和氮气消费，再调整产消比。

可增加：连续学习奖励、每日首次比赛优惠、完赛奖励、个人最佳奖励，但避免用大量币替代真实学习反馈。

#### 7.2.3 赛车与学习目前连接较浅

赛车只消费币，比赛过程没有调用词汇记忆。可加入不打断驾驶的轻量连接：赛前展示本轮 3 个重点词、赛后用比赛事件生成例句、维修区复习、正确掌握词作为赛车贴纸或收藏品。不要在高速驾驶中弹出必须阅读的题目。

#### 7.2.4 增加家长视图

建议提供只读周报：学习天数、到期复习完成率、新掌握词、遗忘词、易错题型、平均正确率、实际学习时长。减少只看“金币和套题数”造成的刷题激励。

#### 7.2.5 年龄适配和可访问性

补充音频发音、键盘焦点、色盲安全配色、字体大小选项、减少动态效果选项和触摸按钮尺寸检查。QUALIFYING 应真正播放音频，否则只是音标识别。

### 7.3 P1：架构与可维护性

#### 7.3.1 Game 和 QuizView 体积过大

`js/game.js` 约 901 行，混合输入、状态机、2D/3D 生命周期、经济扣费、排行榜和 DOM 交互；`views/quiz-view.js` 约 541 行，混合题型渲染、学习提示、答案状态和导航。

建议把 Game 拆成 `RaceCoordinator`、`InputController`、`RaceEconomy`、`RaceLifecycle`；把每种题型拆为独立 renderer，并由注册表映射。

#### 7.3.2 重构过渡模块未收口

`VocabularyQuiz` 与 `LearningController`、`QuizEngine`；`RenderSystem` 与 Game 内部渲染协调；旧 upgrades 商品与 v4 状态之间都存在交叠。

建议先画出“实际调用图”，给模块标记 active/deprecated；每次删除一条旧链路，并用真实对象集成测试保护。

#### 7.3.3 事件契约不统一

部分事件缺少常量，部分同一操作发出多个事件，载荷结构没有统一定义。`GameState` 还引用不存在的 `Events.FUEL_CHANGED`，虽对应旧字段路径，仍是明显残留。

建议集中定义事件名和 JSDoc payload；开发模式校验 payload；规定命令方法负责改变状态，事件只负责通知，避免事件触发业务写入形成循环。

#### 7.3.4 ViewManager 生命周期存在累积风险

View 自身通过 BaseView 清理订阅和 DOM listener，这个方向正确；但 ViewManager 和 main 的全局 document/window listener 没有对应销毁机制。热重载或重复初始化时可能叠加。

建议提供应用级 `dispose()`，统一登记全局监听器、动画帧和定时器。

#### 7.3.5 缺少静态类型和数据 schema

题目、赛道、存档、成就和事件载荷都是自由对象。建议优先引入 JSDoc typedef + JSON Schema；中期可渐进迁移 TypeScript，不必一次重写。

### 7.4 P1：性能

#### 7.4.1 赛道最近点查询为每帧全量扫描

`Track.getNearestDistance()`、`getProgress()`、`getTrackNormal()` 都遍历插值后的全部点。默认每段 200 个采样点，3D 中玩家和 3 辆 AI 每帧多次调用，复杂赛道上 CPU 成本会随采样点和车辆数线性上升。

建议按优先顺序：

1. 每辆车缓存上帧最近索引，只在附近窗口搜索。
2. 将一次最近点结果复用于碰撞、进度和法线。
3. 必要时建立均匀网格或空间索引。
4. 用 Performance API 记录 update/render 分项耗时。

#### 7.4.2 3D 像素比无上限

渲染器直接使用 `window.devicePixelRatio`。高 DPI 平板可能以 2–3 倍像素渲染，GPU 填充量显著增加。

建议 `Math.min(devicePixelRatio, 1.5或2)`，并提供 low/medium/high 画质；帧率持续低于阈值时动态降档。

#### 7.4.3 HUD 有独立动画循环

游戏循环和 3D HUD 都使用 requestAnimationFrame。虽然功能正确，但会重复调度和读取状态。

建议由唯一游戏循环调用 HUD.update；低频数据（排名、时间文本）可限制到 10–20Hz，小地图点位无需 60Hz 全量重绘。

#### 7.4.4 2D 静态赛道每帧重复绘制

赛道路面、草地、路肩和起终点大部分是静态内容。建议预渲染到 OffscreenCanvas/缓存 Canvas，每帧只绘制车辆、粒子和动态 HUD。

#### 7.4.5 Three.js 资源释放需继续验证

TrackBuilder 已处理几何体和材质 dispose，Scene3D 也释放 renderer；但车模型材质/几何、纹理、HUD 动画帧和事件监听需纳入统一资源审计。

建议增加连续进入/退出 3D 比赛 20 次的 E2E/手测，记录 renderer.info.memory、场景对象数和 JS heap。

#### 7.4.6 localStorage 写入过于细粒度

每次 `GameState.set/modify` 都同步 JSON.stringify 并写 localStorage；一道题会连续更新多个字段。主线程同步写入在低性能设备上可能造成抖动。

建议在答题事务内批量更新，使用 100–300ms debounce；页面隐藏、套题完成和卸载前强制 flush。

### 7.5 P2：安全、可靠性与发布工程

- 多处 innerHTML 拼接词库或用户名内容。即使当前数据本地可信，导入文件可引入脚本内容。应优先使用 textContent，或对模板插值统一转义。
- 导入存档需要 schema 校验、大小限制和版本预览，覆盖前自动备份。
- Three.js 同时在 package dependencies 和浏览器 import map 中管理，应固定唯一来源与版本。
- 初次分析时没有锁文件和可用的 Node.js，因而无法执行 Vitest；阶段 A0 已将其列为首要基线任务，要求安装 Node LTS、提交 lockfile，并在 CI 固定执行完整测试。
- 初次分析时源码通过 GitHub 压缩包获取，工作区没有 `.git` 元数据；阶段 A0 已将恢复真实 Git 历史列为所有代码改动的前置条件。

## 8. 建议的目标架构

```text
Presentation
  Views + Quiz Renderers + HUD
        ↓ commands / view models
Application
  LearningService | RaceService | EconomyService | AchievementService
        ↓
Domain
  WordProgress | Quiz | RewardPolicy | TrackUnlockPolicy | RaceResult
        ↓
Infrastructure
  LocalStorageRepository | FileBackupRepository | WordSetLoader
        ↓
Platform
  DOM | Canvas | Three.js | File System Access API
```

关键原则：

- 奖励、解锁、掌握规则各自只有一个权威实现。
- View 不直接修改 localStorage，也不承担经济结算。
- Repository 负责 schema、迁移、批量保存和用户隔离。
- 2D/3D 都实现统一 RaceSession 接口，Game 只协调生命周期。
- 事件只通知已经发生的事实；业务命令通过明确服务调用。

## 9. 推荐迭代路线

### 阶段 A：稳定基线（优先）

1. 用真正的 git clone 恢复版本库。
2. 安装 Node LTS，生成 lockfile，运行全部测试并记录基线。
3. 增加词库配置校验，隐藏缺失词库。
4. 统一奖励配置，修正 QUALIFYING/LAP_REVIEW 的掌握映射。
5. 消除 GameState 与学习子系统中的重复错词/每日状态。

### 阶段 B：学习效果

1. 引入到期复习和简化间隔重复算法。
2. 建立家长周报和真实学习指标。
3. 增加发音音频、听音辨词和可访问性。
4. 用 7/30 天模拟校准燃油币和装备币经济。

### 阶段 C：赛车体验与性能

1. 缓存赛道最近点并合并几何查询。
2. 统一游戏与 HUD 动画循环。
3. 增加画质档位和动态像素比。
4. 预渲染 2D 静态赛道，做 3D 生命周期内存测试。

### 阶段 D：架构收口

1. 拆分 Game 和 QuizView。
2. 清理旧 QuizEngine、旧 upgrades 和重复配置。
3. 引入 schema、事件契约和 JSDoc/TypeScript 类型。
4. 建立 CI：单元测试、集成测试、数据校验、构建和基础 E2E。

## 10. 建议新增的质量指标

产品指标：

- 7 日学习留存、连续学习天数。
- 到期复习完成率。
- 7/30 天后单词保持率，而不只统计即时正确率。
- 每套题耗时、放弃率、不同题型正确率。
- 学习时间与赛车时间比例。

技术指标：

- 首页首次可交互时间。
- 2D/3D 平均帧率、P95 帧时间。
- 一次答题提交的同步存储耗时。
- 连续 20 次进入/退出比赛后的内存变化。
- 测试通过率、核心服务覆盖率和存档迁移成功率。

## 11. 总结

项目已经不是简单原型：它具备完整学习闭环、多用户、可恢复会话、成就、经济、2D/3D 赛车和较丰富测试。现阶段最大风险不是“功能不够多”，而是几次迭代后形成的双重配置、重复状态和新旧链路并存。最值得先做的是建立可执行测试基线、统一奖励和学习状态、补齐词库配置，然后再引入间隔重复和性能优化。这样既能保护孩子已有学习数据，也能让后续功能迭代更快、更可靠。
