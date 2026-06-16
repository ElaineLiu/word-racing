## Epic 1: 多用户系统

### 🎬 Vision

**目标**: 实现多用户数据隔离，支持用户创建、切换，每个用户独立的学习进度和游戏状态。

**功能**:
- 用户创建：首次启动创建默认用户，允许后续创建新用户
- 用户切换：在用户列表中选择切换
- 数据隔离：每个用户独立存储，互不影响
- 自动迁移：旧版数据自动迁移到默认用户

**作用**:
- 为家庭场景提供基础（多个孩子使用同一设备）
- 为后期微信登录预留扩展点
- 数据隔离确保学习进度不混淆

**依赖**: 无（首个Epic）

**状态**: ⏸️ 待开始

---

### 📦 Use Cases

#### UC 1.1: 创建UserManager类

**描述**: 实现用户管理器，负责用户创建、切换、列表管理

**Acceptance Criteria**:
- [ ] 创建 `core/user-manager.js`
- [ ] 提供 `createUser(username)` 方法创建新用户
  - 用户名长度 2-20 字符
  - 不允许重名
  - 自动生成唯一 userId（时间戳+随机数）
- [ ] 提供 `switchUser(userId)` 方法切换用户
- [ ] 提供 `getCurrentUser()` 方法获取当前用户信息
- [ ] 提供 `getUserList()` 方法获取用户列表
- [ ] 提供 `init()` 方法初始化（检测旧数据并迁移）
- [ ] 持久化用户列表到 `wr_user_list`
- [ ] 持久化当前用户到 `wr_current_user`

**接口**:
```javascript
class UserManager {
  constructor(eventBus)
  init()                                    // 初始化（迁移旧数据）
  createUser(username) → User              // 创建新用户
  switchUser(userId) → boolean             // 切换用户
  getCurrentUser() → User | null           // 获取当前用户
  getUserList() → User[]                   // 获取用户列表
}

interface User {
  id: string;         // userId（唯一）
  username: string;   // 用户名
  createdAt: string;  // 创建时间
}
```

**测试文件**: `tests/user-manager.test.js`

**状态**: ⏸️ 待开始

---

#### UC 1.2: 改造GameState支持多用户

**描述**: 修改 GameState 类，构造函数接受 userId 参数，使用不同的存储键

**Acceptance Criteria**:
- [ ] 修改 `core/game-state.js` 构造函数签名：`constructor(eventBus, userId = 'default')`
- [ ] 存储键改为 `wr_game_state_${userId}`
- [ ] 向后兼容：userId 不传时使用 `'default'`（用于测试）
- [ ] 保持所有现有方法不变（get/set/modify/replace/reset）
- [ ] 更新所有测试用例适配新签名

**测试文件**: `tests/game-state.test.js`（更新现有测试）

**状态**: ⏸️ 待开始

---

#### UC 1.3: 改造ProgressTracker支持多用户

**描述**: 修改 ProgressTracker 类，构造函数接受 userId 参数

**Acceptance Criteria**:
- [ ] 修改 `learning/progress-tracker.js` 构造函数签名：`constructor(eventBus, wordSetId, userId = 'default')`
- [ ] 存储键改为 `wr_word_progress_${userId}`
- [ ] 向后兼容：userId 不传时使用 `'default'`
- [ ] 保持所有现有方法不变
- [ ] 更新所有测试用例

**测试文件**: `tests/progress-tracker.test.js`（更新现有测试）

**状态**: ⏸️ 待开始

---

#### UC 1.4: 改造DailyManager支持多用户

**描述**: 修改 DailyManager 类，构造函数接受 userId 参数

**Acceptance Criteria**:
- [ ] 修改 `learning/daily-manager.js` 构造函数签名：`constructor(eventBus, gameState, userId = 'default')`
- [ ] 存储键改为 `wr_daily_stats_${userId}`
- [ ] 向后兼容：userId 不传时使用 `'default'`
- [ ] 保持所有现有方法不变
- [ ] 更新所有测试用例

**测试文件**: `tests/daily-manager.test.js`（更新现有测试）

**状态**: ⏸️ 待开始

---

#### UC 1.5: 改造QuizSessionManager支持多用户

**描述**: 修改 QuizSessionManager 类，构造函数接受 userId 参数

**Acceptance Criteria**:
- [ ] 修改 `learning/quiz-session.js` 构造函数签名接受 userId
- [ ] 存储键改为 `wr_quiz_session_${userId}`
- [ ] 向后兼容：userId 不传时使用 `'default'`
- [ ] 保持所有现有方法不变
- [ ] 更新所有测试用例

**测试文件**: `tests/quiz-session.test.js`（更新现有测试）

**状态**: ⏸️ 待开始

---

#### UC 1.6: 改造LearningController支持多用户

**描述**: 修改 LearningController 类，构造函数接受 userId 参数，并传递给各子模块

**Acceptance Criteria**:
- [ ] 修改 `learning/learning-controller.js` 构造函数签名：`constructor(eventBus, userId = 'default')`
- [ ] 创建 GameState、ProgressTracker、DailyManager、QuizSessionManager 时传递 userId
- [ ] 向后兼容：userId 不传时使用 `'default'`
- [ ] 保持所有现有方法不变
- [ ] 更新所有测试用例

**测试文件**: `tests/learning-controller.test.js`（更新现有测试）

**状态**: ⏸️ 待开始

---

#### UC 1.7: 改造main-v2.js集成UserManager

**描述**: 修改应用入口，初始化 UserManager，根据当前用户创建所有模块

**Acceptance Criteria**:
- [ ] 在 `js/main-v2.js` 中创建 UserManager 实例
- [ ] 调用 `userManager.init()` 初始化（自动迁移旧数据）
- [ ] 获取当前用户 `userId`
- [ ] 创建 LearningController 和 Game 时传递 `userId`
- [ ] 测试旧数据迁移逻辑（首次启动）

**测试文件**: 手动测试（浏览器验证）

**状态**: ⏸️ 待开始

---

#### UC 1.8: 创建用户切换UI组件

**描述**: 创建 UserSwitcher UI 组件，显示在首页顶部，支持用户切换

**Acceptance Criteria**:
- [ ] 创建 `ui/user-switcher.js`
- [ ] 显示当前用户名
- [ ] 点击弹出用户列表
- [ ] 选择其他用户后立即切换并刷新页面
- [ ] 提供"新建用户"按钮（文本框输入用户名）
- [ ] 新建用户后自动切换到新用户
- [ ] 样式简洁，不干扰主要功能

**测试文件**: 手动测试（UI验证）

**状态**: ⏸️ 待开始

---

#### UC 1.9: 数据迁移测试

**描述**: 验证旧版单用户数据正确迁移到新版多用户结构

**Acceptance Criteria**:
- [ ] 创建集成测试 `tests/integration/user-migration.test.js`
- [ ] 测试场景1：无旧数据，首次启动
  - 自动创建默认用户
  - 用户名：`"Player 1"`
  - 所有数据初始化为默认值
- [ ] 测试场景2：有旧数据（v3版本）
  - 自动创建默认用户
  - 旧数据迁移到 `wr_game_state_user_001`
  - `wr_user_list = ['user_001']`
  - `wr_current_user = 'user_001'`
- [ ] 测试场景3：已有多个用户
  - 保持现有用户列表
  - 直接加载当前用户数据

**测试文件**: `tests/integration/user-migration.test.js`

**状态**: ⏸️ 待开始

---

### ✅ Definition of Done

**代码完成**:
- [ ] 所有UC的AC全部勾选
- [ ] 所有类有JSDoc注释
- [ ] 无console错误或警告
- [ ] localStorage键名符合规范

**测试完成**:
- [ ] UserManager 单元测试通过
- [ ] 所有改造类测试通过（GameState、ProgressTracker等）
- [ ] 数据迁移集成测试通过
- [ ] 手动验证：多用户切换、数据隔离

**文档完成**:
- [ ] 更新本Epic状态为 ✅
- [ ] 更新 `CLAUDE.md` 中的存储键名说明
- [ ] Git历史清晰，每个UC独立commit

---

### 🧪 Test Cases

#### TC 1.1: UserManager创建用户

```javascript
describe('UserManager', () => {
  it('should create user with valid username', () => {
    const userManager = new UserManager(eventBus);
    userManager.init();

    const user = userManager.createUser('Alice');
    expect(user.username).toBe('Alice');
    expect(user.id).toMatch(/^user_\d+_[a-z0-9]+$/);
    expect(userManager.getUserList().length).toBe(2); // 默认用户 + 新用户
  });

  it('should reject duplicate username', () => {
    const userManager = new UserManager(eventBus);
    userManager.init();
    userManager.createUser('Alice');

    expect(() => userManager.createUser('Alice')).toThrow('Username already exists');
  });

  it('should reject invalid username length', () => {
    const userManager = new UserManager(eventBus);
    userManager.init();

    expect(() => userManager.createUser('A')).toThrow('Username must be 2-20 characters');
    expect(() => userManager.createUser('A'.repeat(21))).toThrow('Username must be 2-20 characters');
  });
});
```

#### TC 1.2: 数据隔离验证

```javascript
describe('Multi-user data isolation', () => {
  it('should isolate GameState between users', () => {
    const state1 = new GameState(eventBus, 'user_001');
    const state2 = new GameState(eventBus, 'user_002');

    state1.set('fuelCoins', 100);
    state2.set('fuelCoins', 200);

    expect(state1.get('fuelCoins')).toBe(100);
    expect(state2.get('fuelCoins')).toBe(200);
  });

  it('should not affect other user after switching', () => {
    const userManager = new UserManager(eventBus);
    userManager.init();

    const user1 = userManager.createUser('Alice');
    userManager.switchUser(user1.id);

    const state1 = new GameState(eventBus, user1.id);
    state1.set('fuelCoins', 100);

    const user2 = userManager.createUser('Bob');
    userManager.switchUser(user2.id);

    const state2 = new GameState(eventBus, user2.id);
    expect(state2.get('fuelCoins')).toBe(0); // 新用户默认0

    userManager.switchUser(user1.id);
    const state1Reload = new GameState(eventBus, user1.id);
    expect(state1Reload.get('fuelCoins')).toBe(100); // 切换回来数据还在
  });
});
```

#### TC 1.3: 旧数据迁移

```javascript
describe('Data migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should migrate old single-user data to default user', () => {
    // 模拟旧数据
    const oldState = { version: 3, fuelCoins: 500, gearCoins: 100 };
    localStorage.setItem('wr_game_state', JSON.stringify(oldState));

    const userManager = new UserManager(eventBus);
    userManager.init();

    const currentUser = userManager.getCurrentUser();
    expect(currentUser.username).toBe('Player 1');

    const state = new GameState(eventBus, currentUser.id);
    expect(state.get('fuelCoins')).toBe(500);
    expect(state.get('gearCoins')).toBe(100);

    // 旧键应保留（备份）
    expect(localStorage.getItem('wr_game_state')).toBeTruthy();
  });
});
```

---

### 📝 技术注意事项

1. **userId 生成规则**: `user_<timestamp>_<randomHex>`，例如 `user_1718345678901_a3f2b1`
2. **默认用户名**: 首次迁移时创建 `"Player 1"`
3. **不允许删除/重命名用户**（简化逻辑）
4. **切换用户后刷新页面**（重新初始化所有模块）
5. **向后兼容测试**: 所有现有测试需更新签名，但测试逻辑不变
