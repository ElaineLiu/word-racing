# 3D 赛车模块架构评审报告

## 一、架构评审结论

### 总体评价
原架构设计思路正确，模块划分合理，但存在以下问题需要改进：

| 问题 | 风险等级 | 说明 |
|------|----------|------|
| 缺少 AssetManager | 中 | 资源加载分散，无统一管理 |
| HUD 渲染方式未定义 | 高 | 应使用 HTML/CSS 而非 Three.js，降低复杂度 |
| 无 WebGL 降级方案 | 高 | 部分设备不支持 WebGL，需降级到 2D |
| 缺少错误边界 | 中 | 加载失败、渲染崩溃无处理机制 |
| 测试设计缺失 | 中 | 应同步设计测试用例 |
| 性能预算未定义 | 低 | 应明确 FPS 目标和内存限制 |

---

## 二、改进后的架构

### 2.1 新增模块

```
racing3d/
├── core/
│   ├── RacingGame3D.js        # 主控制器
│   ├── GameLoop.js            # 独立游戏循环
│   ├── PhysicsEngine.js       # 简化物理
│   ├── InputManager3D.js      # 输入管理
│   └── AssetManager.js        # 【新增】资源加载管理
├── entities/
│   ├── BaseEntity.js          # 【新增】实体基类
│   ├── Car3D.js               # 玩家赛车
│   ├── AIOpponent.js          # AI 对手
│   ├── Track3D.js             # 3D 赛道
│   ├── Coin3D.js              # 金币
│   ├── PowerUp3D.js           # 加速道具
│   └── Obstacle3D.js          # 障碍物
├── renderer/
│   ├── SceneSetup.js          # Three.js 场景
│   ├── CameraController.js    # 多视角摄像机
│   ├── LightingSetup.js       # 光照
│   └── LowPolyFactory.js      # 【新增】程序化模型生成
├── systems/                    # 【新增】游戏系统
│   ├── RaceSystem.js          # 比赛逻辑
│   ├── CollisionSystem.js     # 碰撞检测
│   └── RankingSystem.js       # 排名系统
├── config/
│   └── racing3d-config.js     # 3D 配置
└── utils/                      # 【新增】工具函数
    ├── MathUtils.js           # 数学工具
    └── DebugUtils.js          # 调试工具
```

### 2.2 HUD 独立（HTML/CSS 实现）

```
css/
└── racing3d.css               # 3D 赛车专用样式

views/
└── race3d-view.js             # 包含 HTML HUD 渲染
```

**决策**：HUD 使用 HTML/CSS 而非 Three.js，理由：
1. 开发效率高，无需 3D 渲染知识
2. 响应式布局更容易实现
3. 文字渲染更清晰
4. 与现有 2D 界面风格一致

### 2.3 状态机完善

```
┌─────────────────────────────────────────────────────────┐
│                   RacingGame3D 状态机                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   LOADING ──→ IDLE ──→ COUNTDOWN ──→ RACING ──→ FINISHED│
│      │          │           │           │          │    │
│      │          │           │           │          │    │
│      ▼          ▼           ▼           ▼          ▼    │
│   (加载资源)  (等待开始)  (3-2-1倒计时) (竞速中)  (结算) │
│                                                         │
│   ERROR ◄───────────────────────────────────────────────│
│      │                                                  │
│      ▼                                                  │
│   (错误处理，显示降级方案)                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.4 WebGL 降级方案

```javascript
// 检测 WebGL 支持
function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

// 不支持时降级
if (!checkWebGLSupport()) {
  // 显示提示信息，引导用户使用 2D 模式
  showWebGLFallback();
}
```

---

## 三、核心类接口定义

### 3.1 RacingGame3D（主控制器）

```javascript
/**
 * RacingGame3D - 3D 赛车主控制器
 * 
 * 职责：
 * - 管理 Three.js 场景生命周期
 * - 协调各子系统
 * - 状态机控制
 * - 与外部系统集成（GameState、EventBus）
 */
export class RacingGame3D {
  // ========== 构造函数 ==========
  
  /**
   * @param {HTMLElement} container - 渲染容器
   * @param {Object} options - 配置选项
   * @param {EventBus} options.eventBus - 事件总线
   * @param {GameState} options.gameState - 游戏状态
   */
  constructor(container, options)

  // ========== 生命周期 ==========
  
  /** 初始化场景和资源 */
  async init(): Promise<boolean>
  
  /** 销毁资源 */
  dispose(): void

  // ========== 游戏控制 ==========
  
  /** 开始比赛 */
  startRace(config?: RaceConfig): boolean
  
  /** 暂停 */
  pause(): void
  
  /** 继续 */
  resume(): void
  
  /** 退出比赛 */
  exitRace(): void

  // ========== 状态查询 ==========
  
  /** 获取当前状态 */
  getState(): RacingState
  
  /** 获取比赛数据 */
  getRaceData(): RaceData | null
  
  /** 是否初始化完成 */
  isReady(): boolean

  // ========== 事件 ==========
  
  on(event: string, callback: Function): void
  off(event: string, callback: Function): void
}

// ========== 类型定义 ==========

/**
 * @typedef {'LOADING' | 'IDLE' | 'COUNTDOWN' | 'RACING' | 'FINISHED' | 'ERROR'} RacingState
 */

/**
 * @typedef {Object} RaceConfig
 * @property {number} lapCount - 圈数，默认 3
 * @property {number} entryFee - 入场费（Fuel Coins），默认 20
 * @property {number} aiCount - AI 数量，默认 3
 */

/**
 * @typedef {Object} RaceData
 * @property {number} currentLap - 当前圈数
 * @property {number} totalLaps - 总圈数
 * @property {number} elapsedTime - 已用时间（秒）
 * @property {number} bestLapTime - 最快单圈
 * @property {number} coinsCollected - 收集的金币数
 * @property {number} rank - 当前排名
 */
```

### 3.2 SceneSetup（场景配置）

```javascript
/**
 * SceneSetup - Three.js 场景配置
 * 
 * 职责：
 * - 创建场景、相机、渲染器
 * - 配置光照
 * - 处理窗口缩放
 */
export class SceneSetup {
  constructor(container: HTMLElement, config: SceneConfig)
  
  // ========== 属性访问 ==========
  get scene(): THREE.Scene
  get camera(): THREE.PerspectiveCamera
  get renderer(): THREE.WebGLRenderer
  
  // ========== 方法 ==========
  
  /** 处理窗口缩放 */
  handleResize(): void
  
  /** 渲染一帧 */
  render(): void
  
  /** 销毁资源 */
  dispose(): void
  
  /** 设置背景 */
  setBackground(color: string | THREE.Color): void
  
  /** 启用/禁用雾效 */
  setFog(enabled: boolean, config?: FogConfig): void
}

/**
 * @typedef {Object} SceneConfig
 * @property {number} width - 宽度
 * @property {number} height - 高度
 * @property {string} backgroundColor - 背景色
 * @property {number} fov - 视角，默认 75
 * @property {number} near - 近裁面，默认 0.1
 * @property {number} far - 远裁面，默认 1000
 */
```

### 3.3 LowPolyFactory（模型工厂）

```javascript
/**
 * LowPolyFactory - Low-Poly 模型工厂
 * 
 * 职责：
 * - 程序化生成 3D 模型
 * - 统一材质管理
 * - 几何体缓存
 */
export class LowPolyFactory {
  // ========== 赛车 ==========
  
  /**
   * 创建 Low-Poly 赛车
   * @param {Object} options
   * @param {string} options.color - 车身颜色
   * @param {string} options.wheelColor - 轮子颜色
   * @param {number} options.scale - 缩放比例
   * @returns {THREE.Group}
   */
  static createCar(options?: CarOptions): THREE.Group
  
  // ========== 赛道 ==========
  
  /**
   * 创建赛道
   * @param {THREE.CatmullRomCurve3} path - 赛道路径
   * @param {number} width - 赛道宽度
   * @returns {THREE.Mesh}
   */
  static createTrack(path: THREE.CatmullRomCurve3, width: number): THREE.Mesh
  
  /**
   * 创建赛道护栏
   * @param {THREE.CatmullRomCurve3} path - 赛道路径
   * @param {number} trackWidth - 赛道宽度
   * @returns {THREE.Group}
   */
  static createBarriers(path: THREE.CatmullRomCurve3, trackWidth: number): THREE.Group
  
  // ========== 道具 ==========
  
  /**
   * 创建金币
   * @returns {THREE.Mesh}
   */
  static createCoin(): THREE.Mesh
  
  /**
   * 创建加速道具
   * @returns {THREE.Group}
   */
  static createPowerUp(): THREE.Group
  
  /**
   * 创建障碍物（轮胎堆）
   * @returns {THREE.Group}
   */
  static createObstacle(): THREE.Group
  
  // ========== 场景装饰 ==========
  
  /**
   * 创建树木
   * @param {Object} options
   * @returns {THREE.Group}
   */
  static createTree(options?: TreeOptions): THREE.Group
  
  /**
   * 创建地面
   * @param {number} size - 地面大小
   * @returns {THREE.Mesh}
   */
  static createGround(size: number): THREE.Mesh
}
```

### 3.4 InputManager3D（输入管理）

```javascript
/**
 * InputManager3D - 3D 输入管理器
 * 
 * 职责：
 * - 键盘输入处理
 * - 触控输入处理
 * - 输入状态维护
 */
export class InputManager3D {
  constructor()
  
  // ========== 状态查询 ==========
  
  /** 获取当前输入状态 */
  getInputState(): InputState
  
  /** 是否按了加速 */
  isAccelerating(): boolean
  
  /** 是否按了刹车 */
  isBraking(): boolean
  
  /** 获取转向值 (-1 到 1) */
  getSteering(): number
  
  /** 是否按了氮气 */
  isNitroActive(): boolean

  // ========== 控制 ==========
  
  /** 启用/禁用输入 */
  setEnabled(enabled: boolean): void
  
  /** 重置输入状态 */
  reset(): void
  
  /** 销毁 */
  dispose(): void
}

/**
 * @typedef {Object} InputState
 * @property {boolean} up - 前进
 * @property {boolean} down - 后退/刹车
 * @property {boolean} left - 左转
 * @property {boolean} right - 右转
 * @property {boolean} nitro - 氮气
 * @property {boolean} reset - 重置
 * @property {boolean} camera - 切换视角
 * @property {boolean} auto - 自动模式
 */
```

---

## 四、配色方案

### 4.1 主题色板

```
┌─────────────────────────────────────────────────────────┐
│                  Low-Poly 配色方案                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  天空/背景                                               │
│  ├─ Sky Blue:      #87CEEB (淡蓝)                       │
│  ├─ Sky Gradient:  #4A90D9 → #87CEEB                   │
│  └─ Horizon:       #FF6B35 (橙色地平线)                  │
│                                                         │
│  赛道                                                   │
│  ├─ Asphalt:       #333333 (沥青灰)                     │
│  ├─ Kerb Red:      #E53935 (路肩红)                     │
│  ├─ Kerb White:    #FFFFFF (路肩白)                     │
│  └─ Start Line:    #FFFFFF (起跑线)                     │
│                                                         │
│  赛车                                                   │
│  ├─ Player:        #E53935 (红色 - 主角)                │
│  ├─ AI Easy:       #4CAF50 (绿色)                       │
│  ├─ AI Medium:     #2196F3 (蓝色)                       │
│  ├─ AI Hard:       #FF9800 (橙色)                       │
│  └─ Wheel:         #212121 (轮子黑)                     │
│                                                         │
│  道具                                                   │
│  ├─ Coin:          #FFD700 (金色)                       │
│  ├─ PowerUp:       #00BCD4 (青色 - 加速)                │
│  └─ Obstacle:      #795548 (棕色 - 轮胎)                │
│                                                         │
│  环境                                                   │
│  ├─ Grass:         #4CAF50 (草地绿)                     │
│  ├─ Tree:          #2E7D32 (树深绿)                     │
│  └─ Ground:        #8D6E63 (土地棕)                     │
│                                                         │
│  UI/HUD                                                 │
│  ├─ Panel BG:      rgba(0, 0, 0, 0.7)                   │
│  ├─ Text Primary:  #FFFFFF                              │
│  ├─ Text Accent:   #FFD700                              │
│  └─ Warning:       #FF5722                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2 视觉风格指南

| 元素 | 风格 | 说明 |
|------|------|------|
| 几何体 | 低面数 + 平面着色 | `flatShading: true` |
| 边缘 | 无平滑 | 保持 Low-Poly 特征 |
| 阴影 | 简化 | 仅关键物体投射阴影 |
| 材质 | MeshLambertMaterial | 性能与效果平衡 |
| 雾效 | 线性雾 | 增加深度感 |

---

## 五、性能预算

| 指标 | 目标值 | 说明 |
|------|--------|------|
| FPS | 60 | 桌面设备 |
| FPS (移动) | 30 | 移动设备最低 |
| 首次加载 | < 3s | 含 Three.js 库 |
| 内存 | < 100MB | 峰值 |
| Draw Calls | < 100 | 优化目标 |
| 三角面数 | < 50K | 总场景 |

---

## 六、风险与缓解措施

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| WebGL 不支持 | 低 | 高 | 降级到 2D 模式 |
| 移动端性能差 | 中 | 中 | 自动降画质 |
| Three.js 加载失败 | 低 | 高 | CDN + 本地备份 |
| 用户燃油不足 | 高 | 低 | 友好提示 + 引导答题 |

---

## 七、测试策略

### 7.1 单元测试

| 模块 | 测试重点 |
|------|----------|
| LowPolyFactory | 模型生成正确性 |
| InputManager3D | 输入状态转换 |
| PhysicsEngine | 物理计算准确性 |

### 7.2 集成测试

| 场景 | 测试内容 |
|------|----------|
| 场景初始化 | Three.js 正确渲染 |
| 比赛流程 | 开始→结束完整流程 |
| 金币系统 | 扣费和奖励正确 |

### 7.3 E2E 测试

| 测试用例 | 步骤 |
|----------|------|
| 进入比赛 | 首页 → 点击按钮 → 显示场景 |
| 完成比赛 | 开始 → 完成3圈 → 显示结果 |
| 燃油不足 | 燃油 < 20 → 显示提示 |
