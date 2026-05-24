# Word Racing MVP 技术架构设计 - 多页面导航

> **文档版本**: v1.0
> **架构师**: Qi (主理人)
> **日期**: 2026-05-11
> **设计目标**: 将 Word Racing 从 overlay 模式改造成多页面自由切换模式（MVP）

---

## 一、MVP 范围定义

### 包含（MVP 核心）
1. **简单的顶部导航栏**: [首页] [答题] [商店] [比赛]
2. **4 个页面视图**: 点击导航切换显示/隐藏（用 CSS display 控制）
3. **基础布局**: 每个页面有基本的内容展示
4. **状态保持**: 切换页面不丢失数据

### 不包含（后续迭代）
- ❌ 复杂的仪表盘（成就系统、详细统计）
- ❌ 赛车 3D 预览
- ❌ 改装系统 UI
- ❌ 响应式设计（先固定桌面端）

---

## 二、核心设计思路

**关键原则：最小改动，最大复用**
- 不重写 `game.js` / `car.js` / `track.js` / `quiz.js`
- 利用现有 Game 类的状态机
- 用 CSS 显示/隐藏代替 Canvas 渲染 UI
- 全局共享一个 Game 实例

---

## 三、新的 HTML 结构

### 3.1 整体结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Word Racing</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <!-- 顶部导航栏 -->
    <nav id="top-nav">
        <button class="nav-btn active" data-page="home">首页</button>
        <button class="nav-btn" data-page="quiz">答题</button>
        <button class="nav-btn" data-page="shop">商店</button>
        <button class="nav-btn" data-page="race">比赛</button>
    </nav>

    <!-- 页面1: 首页 -->
    <div id="page-home" class="page active">
        <div class="home-content">
            <h1>WORD RACING</h1>
            <p>Back words, drive fast!</p>
            <div id="home-stats">
                <div>金币: <span id="home-coins">0</span></div>
                <div>燃油: <span id="home-fuel">100</span>/100</div>
                <div>Nitro: <span id="home-nitro">0</span></div>
            </div>
            <div id="home-leaderboard">
                <!-- 排行榜 -->
            </div>
        </div>
    </div>

    <!-- 页面2: 答题 -->
    <div id="page-quiz" class="page">
        <div id="quiz-container">
            <!-- 复用现有 quiz-overlay 结构 -->
            <div id="quiz-type-selector">
                <button id="quiz-type-simple" class="quiz-type-btn active">简单题</button>
                <button id="quiz-type-complex" class="quiz-type-btn">复杂题</button>
            </div>
            <div id="quiz-question-area">
                <div id="quiz-progress"></div>
                <div id="quiz-word"></div>
                <div id="quiz-meaning-en"></div>
                <div id="quiz-sentence"></div>
                <div id="quiz-options"></div>
            </div>
            <div id="quiz-complete" style="display:none;">
                <h3>答题完成!</h3>
                <div id="quiz-result-accuracy"></div>
                <div id="quiz-result-fuel"></div>
                <div id="quiz-result-gear"></div>
                <div id="quiz-lap-select"></div>
                <button id="quiz-shop-btn">去商店</button>
                <button id="quiz-start-btn">开始比赛</button>
            </div>
        </div>
    </div>

    <!-- 页面3: 商店 -->
    <div id="page-shop" class="page">
        <div id="shop-container">
            <!-- 复用现有 SHOP 逻辑 -->
            <div id="shop-tabs">
                <button class="shop-tab active" data-tab="fuel">燃油</button>
                <button class="shop-tab" data-tab="gear">装备</button>
                <button class="shop-tab" data-tab="upgrade">改装</button>
            </div>
            <div id="shop-items"></div>
            <div id="shop-preview"></div>
        </div>
    </div>

    <!-- 页面4: 比赛 -->
    <div id="page-race" class="page">
        <canvas id="gameCanvas"></canvas>
        <div id="touch-controls">
            <!-- 触控按钮 -->
        </div>
    </div>

    <script src="js/quiz.js"></script>
    <script src="js/track.js"></script>
    <script src="js/car.js"></script>
    <script src="js/game.js"></script>
    <script src="js/nav.js"></script>
    <script>
        // 初始化代码
        const canvas = document.getElementById('gameCanvas');
        const game = new Game(canvas);
        const nav = new NavManager(game);
        window.game = game;  // 全局可访问
    </script>
</body>
</html>
```

### 3.2 关键改动点

1. **新增 `<nav id="top-nav">`**: 固定顶部，50px 高度
2. **新增 4 个 `.page` div**: 每个页面对应一个 div
3. **Canvas 移入 `page-race`**: 比赛页面才显示 Canvas
4. **Quiz overlay 移入 `page-quiz`**: 答题页面显示题目
5. **商店逻辑移入 `page-shop`**: 商店页面显示商品

---

## 四、CSS 设计方案

### 4.1 核心思路

**用 CSS class 切换控制页面显示/隐藏**
- `.page`: 默认 `display: none`
- `.page.active`: `display: block`（当前页面）
- 导航栏固定顶部，页面 `top: 50px` 避开导航栏

### 4.2 完整 CSS 代码

```css
/* css/style.css - 新增部分 */

/* 基础重置 */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    background: #1B5E20;
    color: #FFF;
    overflow: hidden;
    height: 100vh;
}

/* ==================== 顶部导航栏 ==================== */
#top-nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 50px;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    z-index: 1000;
    border-bottom: 2px solid #FFD700;
}

.nav-btn {
    padding: 8px 20px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    color: #FFF;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s;
}

.nav-btn:hover {
    background: rgba(255, 215, 0, 0.2);
}

.nav-btn.active {
    background: #FFD700;
    color: #1B5E20;
    font-weight: bold;
}

/* ==================== 页面基础样式 ==================== */
.page {
    display: none;  /* 默认隐藏 */
    position: fixed;
    top: 50px;  /* 避开导航栏 */
    left: 0;
    right: 0;
    bottom: 0;
    overflow-y: auto;  /* 内容溢出可滚动 */
}

.page.active {
    display: block;  /* 当前页面显示 */
}

/* ==================== 首页 ==================== */
#page-home {
    background: linear-gradient(135deg, #1B5E20, #0D4715);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.home-content {
    text-align: center;
}

.home-content h1 {
    font-size: 48px;
    color: #FFD700;
    margin-bottom: 10px;
}

.home-content p {
    font-size: 18px;
    margin-bottom: 30px;
    opacity: 0.8;
}

#home-stats {
    background: rgba(0, 0, 0, 0.5);
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 20px;
}

#home-stats div {
    margin: 10px 0;
    font-size: 16px;
}

#home-leaderboard {
    background: rgba(0, 0, 0, 0.3);
    padding: 15px;
    border-radius: 8px;
    max-width: 400px;
    margin: 0 auto;
}

/* ==================== 答题页面 ==================== */
#page-quiz {
    background: rgba(0, 0, 0, 0.95);
}

#quiz-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

/* 复用现有 quiz-overlay 样式 */
#quiz-type-selector {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.quiz-type-btn {
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    color: #FFF;
    cursor: pointer;
}

.quiz-type-btn.active {
    background: #FFD700;
    color: #1B5E20;
}

#quiz-question-area {
    background: rgba(255, 255, 255, 0.05);
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 20px;
}

#quiz-word {
    font-size: 36px;
    color: #FFD700;
    text-align: center;
    margin: 20px 0;
}

#quiz-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 20px;
}

.quiz-option {
    padding: 15px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    color: #FFF;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.3s;
}

.quiz-option:hover {
    background: rgba(255, 215, 0, 0.2);
}

.quiz-option.correct {
    background: #4CAF50;
    border-color: #4CAF50;
}

.quiz-option.wrong {
    background: #F44336;
    border-color: #F44336;
}

/* ==================== 商店页面 ==================== */
#page-shop {
    background: rgba(0, 0, 0, 0.95);
}

#shop-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 20px;
}

#shop-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    grid-column: 1 / -1;
}

.shop-tab {
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    color: #FFF;
    cursor: pointer;
}

.shop-tab.active {
    background: #FFD700;
    color: #1B5E20;
}

#shop-items {
    background: rgba(255, 255, 255, 0.05);
    padding: 20px;
    border-radius: 12px;
}

.shop-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    margin-bottom: 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
}

.shop-item button {
    padding: 8px 16px;
    background: #4CAF50;
    border: none;
    border-radius: 6px;
    color: #FFF;
    cursor: pointer;
    font-weight: bold;
}

.shop-item button:disabled {
    background: #666;
    cursor: not-allowed;
}

#shop-preview {
    background: rgba(255, 255, 255, 0.05);
    padding: 20px;
    border-radius: 12px;
}

/* ==================== 比赛页面 ==================== */
#page-race {
    background: #000;
}

#page-race.active {
    display: flex;
    align-items: center;
    justify-content: center;
}

#gameCanvas {
    border: 2px solid #FFD700;
    border-radius: 8px;
}

/* 触控按钮 */
#touch-controls {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: none;  /* 默认隐藏，触屏设备显示 */
}

/* 响应式：触屏设备显示触控按钮 */
@media (pointer: coarse) {
    #touch-controls {
        display: flex;
    }
}
```

---

## 五、JavaScript 导航管理器

### 5.1 文件：`js/nav.js`（约 50 行）

```javascript
/**
 * Navigation Manager - 多页面导航管理器
 * 职责: 页面切换、状态保持、导航按钮高亮
 */
class NavManager {
    constructor(game) {
        this.game = game;
        this.currentPage = 'home';
        
        this.init();
    }
    
    /**
     * 初始化导航
     */
    init() {
        // 绑定导航按钮点击
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const page = btn.dataset.page;
                this.switchPage(page);
            });
        });
        
        // 默认显示首页
        this.switchPage('home');
    }
    
    /**
     * 切换页面
     * @param {string} pageName - 页面名称 (home/quiz/shop/race)
     */
    switchPage(pageName) {
        // 1. 隐藏所有页面
        const pages = document.querySelectorAll('.page');
        pages.forEach(p => p.classList.remove('active'));
        
        // 2. 显示目标页面
        const targetPage = document.getElementById(`page-${pageName}`);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        
        // 3. 更新导航按钮状态
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageName);
        });
        
        // 4. 处理特殊页面逻辑
        if (pageName === 'race') {
            // 比赛页面：启动游戏循环
            if (this.game.state !== 'RACING' && this.game.state !== 'COUNTDOWN') {
                this.game.state = 'RACING';
                this.game.continueToRace();
            }
        } else if (pageName === 'quiz') {
            // 答题页面：启动答题
            if (this.game.state !== 'QUIZ') {
                this.game.state = 'QUIZ';
                this.game.startNewQuiz();
            }
        } else if (pageName === 'shop') {
            // 商店页面：显示商店
            this.game.state = 'SHOP';
            this.renderShop();
        }
        
        // 5. 更新当前页面
        this.currentPage = pageName;
        
        // 6. 更新首页统计数据
        if (pageName === 'home') {
            this.updateHomeStats();
        }
    }
    
    /**
     * 更新首页统计数据
     */
    updateHomeStats() {
        document.getElementById('home-coins').textContent = this.game.coins;
        document.getElementById('home-fuel').textContent = Math.round(this.game.fuel);
        document.getElementById('home-nitro').textContent = this.game.nitroCharges;
    }
    
    /**
     * 渲染商店页面
     */
    renderShop() {
        // 复用 game.js 中的 _renderShop() 逻辑
        // 或者直接调用 game.handleShopClick()
        // 具体实现根据现有代码调整
    }
}

// 导出
window.NavManager = NavManager;
```

### 5.2 关键设计点

1. **页面切换逻辑**：
   - 隐藏所有 `.page`
   - 显示目标页面（添加 `.active`）
   - 更新导航按钮状态

2. **特殊页面处理**：
   - 比赛页面：设置 `game.state = 'RACING'`，启动游戏循环
   - 答题页面：设置 `game.state = 'QUIZ'`，调用 `startNewQuiz()`
   - 商店页面：设置 `game.state = 'SHOP'`，渲染商店

3. **状态保持**：
   - `game` 实例是同一个，所有状态自动保持
   - 切换页面只是改变哪个页面可见

---

## 六、数据流转方案

### 6.1 方案：全局 Game 实例 + 各页面直接访问

```javascript
// 在 index.html 的 <script> 中
const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);
const nav = new NavManager(game);

// 挂载到 window，全局可访问
window.game = game;
```

### 6.2 数据流向图

```
┌─────────────────────────────────────────────────┐
│              window.game (Game 实例)            │
│  - coins, fuel, nitroCharges                  │
│  - quiz, car, track                          │
│  - state (MENU/QUIZ/SHOP/RACING/RESULTS)    │
└─────────────────────────────────────────────────┘
          ↑         ↑         ↑         ↑
          |         |         |         |
    ┌─────┴─────┐ ┌┴─────┐ ┌┴─────┐ ┌┴─────┐
    │  首页     │ │ 答题  │ │ 商店  │ │ 比赛  │
    └──────────┘ └───────┘ └───────┘ └───────┘
```

### 6.3 状态保持关键点

1. **游戏属性持久化**：
   - `game.coins`, `game.fuel`, `game.nitroCharges` 在页面切换时保持不变
   - 这些属性存储在 `window.game` 中，不受页面切换影响

2. **答题进度管理**：
   - `quiz.js` 中的答题进度在切换到其他页面时**可以选择保持或重置**
   - MVP 建议：切换到非答题页面时，重置答题进度（符合游戏逻辑）

3. **赛车状态管理**：
   - `car.js` 中的赛车状态在比赛页面激活时才更新
   - 其他页面时，游戏循环可以继续运行（但不渲染）

---

## 七、文件修改清单

| 文件 | 操作 | 工作量 | 说明 |
|------|------|--------|------|
| `index.html` | 重构 | 大（2-3小时） | 重写 HTML 结构，新增导航栏和页面 div |
| `css/style.css` | 修改 | 中（1-2小时） | 新增导航栏样式、页面切换样式、调整现有样式 |
| `js/nav.js` | 新增 | 小（30-45分钟） | 导航管理器，约 50 行 |
| `js/game.js` | 修改 | 小（30-45分钟） | 适配多页面模式，新增 `switchToPage()` 方法 |
| `js/quiz.js` | 不变 | - | 无需修改，保持现有逻辑 |
| `js/car.js` | 不变 | - | 无需修改 |
| `js/track.js` | 不变 | - | 无需修改 |
| `data/words.json` | 不变 | - | 无需修改 |

**总工作量评估**：约 3-4 小时

---

## 八、实施步骤（有序推进）

### 步骤 1: 创建导航管理器 `js/nav.js`（30-45分钟）

**任务**：
1. 创建 `NavManager` 类
2. 实现 `switchPage()` 方法
3. 绑定导航按钮点击事件
4. 实现 `updateHomeStats()` 方法

**验证标准**：
- 控制台打印页面切换日志
- 点击导航按钮，能切换 `.active` class

**代码示例**（已完成，见第五章）

---

### 步骤 2: 重构 `index.html`（2-3小时）

**任务**：
1. 新增顶部导航栏 `<nav id="top-nav">`
2. 新增 4 个页面 div (`page-home`, `page-quiz`, `page-shop`, `page-race`)
3. 将现有 Canvas 移入 `page-race`
4. 将现有 quiz-overlay 移入 `page-quiz`
5. 将现有商店逻辑移入 `page-shop`
6. 引入 `nav.js`
7. 初始化 `NavManager`

**验证标准**：
- 点击导航按钮，页面能切换
- 页面切换时，导航按钮高亮正确
- 首页能显示统计数据

**注意**：此步骤工作量较大，建议分步验证：
1. 先完成 HTML 结构改造
2. 再引入 `nav.js` 测试页面切换
3. 最后调整样式

---

### 步骤 3: 编写 CSS 样式 `css/style.css`（1-2小时）

**任务**：
1. 新增 `.page` 和 `.page.active` 样式
2. 新增 `#top-nav` 样式
3. 新增 `.nav-btn` 和 `.nav-btn.active` 样式
4. 新增首页、答题、商店、比赛页面的样式
5. 调整现有样式以适应新布局

**验证标准**：
- 页面切换有视觉反馈
- 导航按钮高亮正确
- 各页面布局合理、美观

**注意**：
- 优先保证功能，样式可以后续迭代优化
- 复用现有 Canvas 渲染的样式，避免冲突

---

### 步骤 4: 修改 `js/game.js` 适配多页面（30-45分钟）

**任务**：
1. 检查现有 `game.js` 是否有硬编码的 UI 逻辑
2. 如果有，改为调用 `NavManager.switchPage()`
3. 确保 `game.state` 与当前页面同步
4. 测试页面切换后，游戏状态是否正确

**可能需要的修改**：
- `_renderMenu()`: 改为设置 `page-home` 可见
- `_renderQuizOverlay()`: 改为设置 `page-quiz` 可见
- `_renderShop()`: 改为设置 `page-shop` 可见
- `_renderRace()`: 改为设置 `page-race` 可见

**验证标准**：
- 切换页面后，游戏状态正确
- 答题、商店、比赛功能正常工作

---

### 步骤 5: 集成测试（1小时）

**测试清单**：

#### 首页
- [ ] 显示统计数据（金币、燃油、Nitro）
- [ ] 显示排行榜（前5名）
- [ ] 点击导航按钮能切换到其他页面

#### 答题页面
- [ ] 显示题目类型选择器（简单题/复杂题）
- [ ] 显示题目和选项
- [ ] 答题完成后显示结果
- [ ] 能切换到商店或比赛页面

#### 商店页面
- [ ] 显示商品列表（燃油、装备、改装）
- [ ] 能购买商品
- [ ] 货币足够/不足时有正确提示
- [ ] 能切换到其他页面

#### 比赛页面
- [ ] 显示 Canvas 和赛车
- [ ] 能操控赛车（键盘/触控）
- [ ] 比赛结束后显示成绩
- [ ] 能切换到其他页面

**验证标准**：
- 所有功能在多页面模式下正常工作
- 页面切换流畅，无卡顿
- 状态保持正确，无数据丢失

---

## 九、关键技术点解析

### 9.1 如何保持 Canvas 游戏循环？

**问题**：切换页面后，Canvas 游戏循环会不会停止？

**方案**：游戏循环始终运行，只是 Canvas 在特定页面才可见

```javascript
// game.js - 修改 _startLoop()
_startLoop() {
    const loop = (timestamp) => {
        this._update(timestamp);
        
        // 只在比赛相关状态才渲染
        if (this.state === 'RACING' || this.state === 'COUNTDOWN') {
            this._render();
        }
        
        this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
}
```

**优化**：
- 非比赛页面时，可以暂停游戏循环以节省性能
- 切换到比赛页面时，恢复游戏循环

---

### 9.2 如何在不同页面间传递数据？

**方案 1：使用全局 `game` 实例**（推荐，MVP 使用）

```javascript
// 在 index.html 中
window.game = new Game(canvas);  // 挂载到 window，全局可访问

// 在 nav.js 中
this.game = game;  // 通过构造函数传入

// 在 page-shop 的按钮点击事件中
document.getElementById('buy-fuel-btn').addEventListener('click', () => {
    window.game.buyFuel(20);  // 直接访问
});
```

**优点**：简单、直接，无需额外代码

**缺点**：全局变量污染（但对于小项目可接受）

---

**方案 2：使用 CustomEvent 传递数据**（后续迭代可考虑）

```javascript
// 发布事件
document.dispatchEvent(new CustomEvent('game-state-changed', {
    detail: { state: 'QUIZ', coins: 100 }
}));

// 订阅事件
document.addEventListener('game-state-changed', (e) => {
    console.log('Game state changed:', e.detail);
});
```

**优点**：解耦，符合事件驱动架构

**缺点**：增加代码复杂度，MVP 不需要

---

### 9.3 如何处理浏览器后退按钮？

**MVP 不包含**，后续迭代可增加：

```javascript
// 监听 popstate 事件
window.addEventListener('popstate', (e) => {
    const page = e.state?.page || 'home';
    nav.switchPage(page);
});

// 页面切换时，pushState
switchPage(pageName) {
    // ... 现有逻辑 ...
    
    // 推入历史记录
    history.pushState({ page: pageName }, '', `#${pageName}`);
}
```

**优点**：支持浏览器后退/前进按钮

**缺点**：增加复杂度，MVP 不需要

---

## 十、风险与应对措施

| 风险 | 影响 | 应对措施 | 优先级 |
|------|------|----------|---------|
| 页面切换时游戏循环崩溃 | 比赛无法进行 | 确保游戏循环始终运行，只是不渲染；或暂停/恢复游戏循环 | 高 |
| CSS 样式冲突 | 页面显示异常 | 使用 BEM 命名规范，增加样式隔离；逐步迁移样式 | 中 |
| 现有代码耦合度高 | 重构困难 | 优先保持现有逻辑，只修改必要的接口；逐步解耦 | 中 |
| 状态不同步 | 数据丢失或错乱 | 确保 `game.state` 与当前页面同步；添加状态校验 | 高 |
| 性能问题 | 页面卡顿 | 非比赛页面暂停游戏循环；优化渲染逻辑 | 低 |

---

## 十一、后续迭代计划

### 迭代 2: 增强用户体验
- 添加页面切换动画（fade in/out）
- 优化触控设备体验
- 添加声音效果

### 迭代 3: 复杂功能
- 实现改装系统 UI
- 添加赛车 3D 预览（如果需要）
- 实现成就系统

### 迭代 4: 优化与发布
- 响应式设计（支持移动端）
- 性能优化
- 部署到服务器

---

## 十二、总结

### MVP 核心交付物
1. ✅ 简单的顶部导航栏（4 个按钮）
2. ✅ 4 个页面视图（首页/答题/商店/比赛）
3. ✅ CSS 控制页面切换（`display: none/block`）
4. ✅ 简单的 JS 导航管理器（约 50 行）
5. ✅ 数据通过全局 Game 实例共享
6. ✅ 状态保持：切换页面不丢失数据

### 不包含（后续迭代）
- ❌ 复杂仪表盘（成就系统、详细统计）
- ❌ 赛车 3D 预览
- ❌ 改装系统 UI
- ❌ 响应式设计（先固定桌面端）
- ❌ 浏览器历史记录管理

### 设计亮点
1. **简单优先**：能用 10 行代码实现的，不写 100 行
2. **复用现有代码**：不重写 `quiz.js`、`game.js` 等
3. **渐进增强**：MVP 先做核心，后续再迭代
4. **状态保持**：全局 Game 实例，自动保持状态

### 下一步
1. **确认设计方案**（等待您的反馈）
2. **按实施步骤开始编码**（预计 3-4 小时完成 MVP）
3. **每完成一个步骤立即验证**（确保质量）
4. **迭代优化**（根据测试结果调整）

---

**文档结束**

> 本文档为 Word Racing MVP 技术架构设计，详细描述了多页面导航的实现方案。遵循"简单优先、复用代码、渐进增强"原则，预计 3-4 小时完成 MVP 开发。
