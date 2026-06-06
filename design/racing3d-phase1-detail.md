# Phase 1 详细设计：基础框架

## 一、目标

**里程碑**: 在浏览器中显示一个 Low-Poly 风格的赛车和简单赛道。

**验收标准**:
1. 访问 `/race3d` 页面，Three.js 场景正常渲染
2. 显示一辆红色 Low-Poly 赛车
3. 显示一条简单的环形赛道
4. 响应窗口缩放
5. FPS ≥ 60

---

## 二、文件清单

### 2.1 新建文件

| 文件路径 | 职责 | 代码量预估 |
|----------|------|-----------|
| `racing3d/core/RacingGame3D.js` | 主控制器，管理生命周期 | ~150 行 |
| `racing3d/renderer/SceneSetup.js` | 场景、相机、渲染器 | ~100 行 |
| `racing3d/renderer/LowPolyFactory.js` | 程序化模型生成 | ~200 行 |
| `racing3d/config/racing3d-config.js` | 配置常量 | ~80 行 |
| `racing3d/utils/MathUtils.js` | 数学工具函数 | ~50 行 |
| `views/race3d-view.js` | 视图层，集成 ViewManager | ~100 行 |
| `css/racing3d.css` | 3D 赛车页面样式 | ~100 行 |

### 2.2 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `index.html` | 添加 importmap 和 page-race3d 容器 |
| `views/view-manager.js` | 注册 Race3DView |
| `views/home-view.js` | 添加 3D Race 入口按钮 |
| `config/game-config.js` | 添加 RACING3D 配置节 |

### 2.3 文件依赖关系

```
index.html (importmap)
    │
    ▼
views/race3d-view.js
    │
    ├── racing3d/core/RacingGame3D.js
    │       │
    │       ├── racing3d/renderer/SceneSetup.js
    │       │       └── three (CDN)
    │       │
    │       ├── racing3d/renderer/LowPolyFactory.js
    │       │       └── three (CDN)
    │       │
    │       └── racing3d/config/racing3d-config.js
    │
    └── views/base-view.js (继承)
```

---

## 三、类详细设计

### 3.1 RacingGame3D（主控制器）

```javascript
// racing3d/core/RacingGame3D.js

import * as THREE from 'three';
import { SceneSetup } from '../renderer/SceneSetup.js';
import { LowPolyFactory } from '../renderer/LowPolyFactory.js';
import { RACING3D } from '../config/racing3d-config.js';

/**
 * RacingGame3D - 3D 赛车主控制器
 */
export class RacingGame3D {
  // 私有属性
  #container;
  #sceneSetup;
  #state = 'LOADING';
  #eventBus;
  #gameState;
  #playerCar;
  #track;
  #animationId = null;
  #lastTime = 0;
  #isReady = false;

  constructor(container, options = {}) {
    this.#container = container;
    this.#eventBus = options.eventBus;
    this.#gameState = options.gameState;
  }

  // ========== 生命周期 ==========

  /**
   * 初始化
   * @returns {Promise<boolean>}
   */
  async init() {
    try {
      // 1. 创建场景
      this.#sceneSetup = new SceneSetup(this.#container, {
        backgroundColor: RACING3D.SCENE.BACKGROUND_COLOR,
        fov: RACING3D.CAMERA.FOV,
        fog: RACING3D.SCENE.FOG
      });

      // 2. 创建赛车
      this.#playerCar = LowPolyFactory.createCar({
        color: RACING3D.CAR.PLAYER_COLOR
      });
      this.#playerCar.position.set(0, 0.5, 0);
      this.#sceneSetup.scene.add(this.#playerCar);

      // 3. 创建赛道
      this.#track = LowPolyFactory.createTestTrack();
      this.#sceneSetup.scene.add(this.#track);

      // 4. 创建地面
      const ground = LowPolyFactory.createGround(500);
      this.#sceneSetup.scene.add(ground);

      // 5. 创建光照
      this.#setupLighting();

      // 6. 状态更新
      this.#state = 'IDLE';
      this.#isReady = true;

      // 7. 开始渲染循环
      this.#startLoop();

      return true;
    } catch (error) {
      console.error('[RacingGame3D] Init failed:', error);
      this.#state = 'ERROR';
      return false;
    }
  }

  /**
   * 设置光照
   */
  #setupLighting() {
    const scene = this.#sceneSetup.scene;

    // 环境光
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    // 方向光（模拟太阳）
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(50, 100, 50);
    directional.castShadow = true;
    scene.add(directional);

    // 半球光（天空/地面渐变）
    const hemisphere = new THREE.HemisphereLight(0x87CEEB, 0x4CAF50, 0.3);
    scene.add(hemisphere);
  }

  /**
   * 开始渲染循环
   */
  #startLoop() {
    const loop = (time) => {
      this.#animationId = requestAnimationFrame(loop);
      
      const deltaTime = (time - this.#lastTime) / 1000;
      this.#lastTime = time;

      // 更新（Phase 1 只渲染，不更新物理）
      this.#update(deltaTime);
      
      // 渲染
      this.#sceneSetup.render();
    };

    this.#animationId = requestAnimationFrame(loop);
  }

  /**
   * 更新逻辑
   */
  #update(deltaTime) {
    // Phase 1: 仅旋转赛车展示
    if (this.#playerCar && this.#state === 'IDLE') {
      this.#playerCar.rotation.y += deltaTime * 0.5;
    }
  }

  /**
   * 销毁
   */
  dispose() {
    // 停止渲染循环
    if (this.#animationId) {
      cancelAnimationFrame(this.#animationId);
      this.#animationId = null;
    }

    // 销毁场景
    this.#sceneSetup?.dispose();
    this.#sceneSetup = null;

    this.#isReady = false;
    this.#state = 'LOADING';
  }

  // ========== 状态查询 ==========

  getState() {
    return this.#state;
  }

  isReady() {
    return this.#isReady;
  }
}
```

### 3.2 SceneSetup（场景配置）

```javascript
// racing3d/renderer/SceneSetup.js

import * as THREE from 'three';

/**
 * SceneSetup - Three.js 场景配置
 */
export class SceneSetup {
  #container;
  #scene;
  #camera;
  #renderer;

  constructor(container, config = {}) {
    this.#container = container;
    
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 创建场景
    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color(config.backgroundColor || 0x87CEEB);

    // 雾效
    if (config.fog) {
      this.#scene.fog = new THREE.Fog(
        config.fog.color || 0x87CEEB,
        config.fog.near || 100,
        config.fog.far || 500
      );
    }

    // 创建相机
    this.#camera = new THREE.PerspectiveCamera(
      config.fov || 75,
      width / height,
      config.near || 0.1,
      config.far || 1000
    );
    this.#camera.position.set(0, 10, 20);
    this.#camera.lookAt(0, 0, 0);

    // 创建渲染器
    this.#renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.#renderer.setSize(width, height);
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    container.appendChild(this.#renderer.domElement);

    // 窗口缩放监听
    this.#bindResize();
  }

  // ========== 属性访问 ==========

  get scene() {
    return this.#scene;
  }

  get camera() {
    return this.#camera;
  }

  get renderer() {
    return this.#renderer;
  }

  // ========== 方法 ==========

  render() {
    this.#renderer.render(this.#scene, this.#camera);
  }

  #bindResize() {
    this.#resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this.#resizeHandler);
  }

  handleResize() {
    const width = this.#container.clientWidth;
    const height = this.#container.clientHeight;

    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();

    this.#renderer.setSize(width, height);
  }

  dispose() {
    window.removeEventListener('resize', this.#resizeHandler);
    
    this.#renderer.dispose();
    this.#renderer.domElement.remove();
    
    // 清理场景中的对象
    this.#scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
```

### 3.3 LowPolyFactory（模型工厂）

```javascript
// racing3d/renderer/LowPolyFactory.js

import * as THREE from 'three';

/**
 * LowPolyFactory - Low-Poly 模型工厂
 */
export class LowPolyFactory {
  
  /**
   * 创建 Low-Poly 赛车
   */
  static createCar(options = {}) {
    const {
      color = 0xE53935,
      wheelColor = 0x212121,
      scale = 1
    } = options;

    const car = new THREE.Group();

    // 材质
    const bodyMat = new THREE.MeshLambertMaterial({ 
      color, 
      flatShading: true 
    });
    const wheelMat = new THREE.MeshLambertMaterial({ 
      color: wheelColor, 
      flatShading: true 
    });
    const darkMat = new THREE.MeshLambertMaterial({ 
      color: 0x333333, 
      flatShading: true 
    });

    // 车身主体
    const bodyGeom = new THREE.BoxGeometry(2, 0.6, 4);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    car.add(body);

    // 车顶/驾驶舱
    const cabinGeom = new THREE.BoxGeometry(1.4, 0.5, 1.8);
    const cabin = new THREE.Mesh(cabinGeom, darkMat);
    cabin.position.set(0, 1.05, -0.3);
    cabin.castShadow = true;
    car.add(cabin);

    // 前翼
    const frontWingGeom = new THREE.BoxGeometry(2.4, 0.1, 0.4);
    const frontWing = new THREE.Mesh(frontWingGeom, bodyMat);
    frontWing.position.set(0, 0.25, 2.1);
    car.add(frontWing);

    // 后翼
    const rearWingGeom = new THREE.BoxGeometry(2.2, 0.4, 0.15);
    const rearWing = new THREE.Mesh(rearWingGeom, bodyMat);
    rearWing.position.set(0, 1.1, -1.9);
    car.add(rearWing);

    // 轮子
    const wheelGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 8);
    const wheelPositions = [
      [-1, 0.35, 1.3],   // 前左
      [1, 0.35, 1.3],    // 前右
      [-1, 0.35, -1.3],  // 后左
      [1, 0.35, -1.3]    // 后右
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeom, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      car.add(wheel);
    });

    // 车号标记（黄色圆点）
    const numberGeom = new THREE.CircleGeometry(0.25, 8);
    const numberMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
    const number = new THREE.Mesh(numberGeom, numberMat);
    number.position.set(0, 0.81, 1);
    number.rotation.x = -Math.PI / 2;
    car.add(number);

    car.scale.setScalar(scale);
    return car;
  }

  /**
   * 创建测试赛道（简单的椭圆形）
   */
  static createTestTrack() {
    const track = new THREE.Group();

    // 赛道路径（椭圆）
    const curve = new THREE.EllipseCurve(
      0, 0,            // 中心
      60, 40,          // 半径
      0, 2 * Math.PI,  // 起止角度
      false,           // 是否顺时针
      0                // 旋转
    );

    // 获取点并转换为 3D
    const points = curve.getPoints(100);
    const shape = new THREE.Shape();
    
    // 外边界
    points.forEach((p, i) => {
      if (i === 0) shape.moveTo(p.x, p.y);
      else shape.lineTo(p.x, p.y);
    });

    // 内边界（挖空）
    const hole = new THREE.Path();
    const innerPoints = curve.getPoints(100).map(p => ({
      x: p.x * 0.7,
      y: p.y * 0.7
    }));
    innerPoints.forEach((p, i) => {
      if (i === 0) hole.moveTo(p.x, p.y);
      else hole.lineTo(p.x, p.y);
    });
    shape.holes.push(hole);

    // 挤出几何体
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.2,
      bevelEnabled: false
    });

    // 旋转到 XZ 平面
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshLambertMaterial({
      color: 0x333333,
      flatShading: true
    });

    const trackMesh = new THREE.Mesh(geometry, material);
    trackMesh.receiveShadow = true;
    track.add(trackMesh);

    // 路肩（红色条纹）
    track.add(this.#createKerbs(curve, 1.05, 60, 40));
    track.add(this.#createKerbs(curve, 0.65, 60 * 0.7, 40 * 0.7));

    return track;
  }

  /**
   * 创建路肩
   */
  static #createKerbs(curve, scale, rx, ry) {
    const kerbs = new THREE.Group();
    const points = curve.getPoints(50);

    points.forEach((p, i) => {
      if (i % 4 < 2) { // 间隔放置
        const kerbGeom = new THREE.BoxGeometry(3, 0.15, 1.5);
        const kerbMat = new THREE.MeshLambertMaterial({
          color: i % 8 < 4 ? 0xE53935 : 0xFFFFFF,
          flatShading: true
        });
        const kerb = new THREE.Mesh(kerbGeom, kerbMat);
        
        kerb.position.set(p.x * scale, 0.1, p.y * scale);
        
        // 计算切线方向
        const tangent = curve.getTangent(i / 50);
        kerb.rotation.y = Math.atan2(tangent.y, tangent.x);
        
        kerbs.add(kerb);
      }
    });

    return kerbs;
  }

  /**
   * 创建地面
   */
  static createGround(size = 500) {
    const geometry = new THREE.PlaneGeometry(size, size, 10, 10);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshLambertMaterial({
      color: 0x4CAF50,
      flatShading: true
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.position.y = -0.01;
    ground.receiveShadow = true;

    return ground;
  }
}
```

### 3.4 配置文件

```javascript
// racing3d/config/racing3d-config.js

/**
 * 3D 赛车配置
 */
export const RACING3D = {
  // 场景配置
  SCENE: {
    BACKGROUND_COLOR: 0x87CEEB,
    FOG: {
      color: 0x87CEEB,
      near: 100,
      far: 400
    }
  },

  // 相机配置
  CAMERA: {
    FOV: 75,
    NEAR: 0.1,
    FAR: 1000,
    INITIAL_POSITION: { x: 0, y: 10, z: 20 }
  },

  // 赛车配置
  CAR: {
    PLAYER_COLOR: 0xE53935,
    WHEEL_COLOR: 0x212121,
    SCALE: 1
  },

  // 赛道配置
  TRACK: {
    WIDTH: 12,
    RADIUS_X: 60,
    RADIUS_Z: 40
  },

  // 道具配置
  ITEMS: {
    COINS_PER_LAP: 35,
    COIN_VALUE: 2,
    COIN_COLOR: 0xFFD700
  },

  // 比赛配置
  RACE: {
    LAP_COUNT: 3,
    ENTRY_FEE: 20,
    AI_COUNT: 3
  },

  // 性能配置
  PERFORMANCE: {
    TARGET_FPS: 60,
    PIXEL_RATIO_MAX: 2
  }
};
```

### 3.5 视图层

```javascript
// views/race3d-view.js

import { BaseView } from './base-view.js';
import { Events } from '../core/event-bus.js';
import { RacingGame3D } from '../racing3d/core/RacingGame3D.js';

/**
 * Race3DView - 3D 赛车视图
 */
export class Race3DView extends BaseView {
  #game;
  #racingGame3D;
  #eventBus;

  constructor(eventBus, game) {
    super('page-race3d', eventBus);
    this.#game = game;
  }

  mount() {
    super.mount();
    this.#initRacingGame();
  }

  unmount() {
    super.unmount();
    this.#racingGame3D?.dispose();
    this.#racingGame3D = null;
  }

  async #initRacingGame() {
    const container = this.$('#race3d-canvas');
    if (!container) {
      console.error('[Race3DView] Container not found');
      return;
    }

    // 显示加载状态
    this.#showLoading();

    // 创建 3D 游戏实例
    this.#racingGame3D = new RacingGame3D(container, {
      eventBus: this.getEventBus(),
      gameState: {
        fuelCoins: this.#game.fuelCoins,
        gearCoins: this.#game.gearCoins
      }
    });

    const success = await this.#racingGame3D.init();

    if (success) {
      this.#hideLoading();
    } else {
      this.#showError('Failed to initialize 3D engine');
    }
  }

  #showLoading() {
    const loading = this.$('#race3d-loading');
    if (loading) loading.style.display = 'flex';
  }

  #hideLoading() {
    const loading = this.$('#race3d-loading');
    if (loading) loading.style.display = 'none';
  }

  #showError(message) {
    const error = this.$('#race3d-error');
    if (error) {
      error.textContent = message;
      error.style.display = 'block';
    }
    this.#hideLoading();
  }
}
```

---

## 四、UI 布局设计

### 4.1 HTML 结构

```html
<!-- index.html 中添加 -->

<!-- importmap (在 <head> 中) -->
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
  }
}
</script>

<!-- 页面容器 (在其他 .page 同级) -->
<div id="page-race3d" class="page">
  <!-- 加载状态 -->
  <div id="race3d-loading" class="race3d-overlay">
    <div class="race3d-loading-content">
      <div class="race3d-spinner"></div>
      <p>Loading Race...</p>
    </div>
  </div>

  <!-- 错误状态 -->
  <div id="race3d-error" class="race3d-overlay race3d-error">
    <p id="race3d-error-message"></p>
    <button id="race3d-back-btn">Back to Home</button>
  </div>

  <!-- 3D 渲染容器 -->
  <div id="race3d-canvas"></div>

  <!-- 调试信息 -->
  <div id="race3d-debug">
    <span id="race3d-fps">FPS: --</span>
  </div>

  <!-- 返回按钮 -->
  <button id="race3d-exit-btn" class="race3d-btn race3d-exit">
    ✕ Exit
  </button>
</div>
```

### 4.2 CSS 样式

```css
/* css/racing3d.css */

/* ========== 页面容器 ========== */
#page-race3d {
  position: relative;
  width: 100%;
  height: 100vh;
  background: #87CEEB;
  overflow: hidden;
}

/* ========== 渲染容器 ========== */
#race3d-canvas {
  width: 100%;
  height: 100%;
}

#race3d-canvas canvas {
  display: block;
}

/* ========== 加载状态 ========== */
.race3d-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.7);
  z-index: 100;
}

.race3d-loading-content {
  text-align: center;
  color: white;
}

.race3d-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFD700;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ========== 错误状态 ========== */
.race3d-error {
  background: rgba(139, 0, 0, 0.8);
  color: white;
  flex-direction: column;
}

.race3d-error button {
  margin-top: 20px;
  padding: 12px 24px;
  background: #E53935;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.race3d-error button:hover {
  background: #C62828;
}

/* ========== 调试信息 ========== */
#race3d-debug {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: #00FF00;
  padding: 8px 12px;
  font-family: monospace;
  font-size: 12px;
  border-radius: 4px;
  z-index: 50;
}

/* ========== 退出按钮 ========== */
.race3d-exit {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  z-index: 50;
}

.race3d-exit:hover {
  background: rgba(229, 57, 53, 0.8);
}
```

### 4.3 首页入口按钮

```html
<!-- views/home-view.js 或 index.html 中添加 -->
<button id="home-race3d-btn" class="home-btn race3d">
  🏎️ START 3D RACE
  <span class="home-btn-cost">20 Fuel</span>
</button>
```

```css
/* 首页按钮样式 */
.home-btn.race3d {
  background: linear-gradient(135deg, #E53935, #C62828);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.home-btn-cost {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
}
```

---

## 五、交互逻辑

### 5.1 进入流程

```
用户点击 "START 3D RACE"
        │
        ▼
    检查燃油余额
        │
        ├── 不足 → 弹窗提示 "Need 20 Fuel Coins"
        │
        └── 充足 → 扣除 20 Fuel
                        │
                        ▼
                切换到 race3d 页面
                        │
                        ▼
                显示 Loading 状态
                        │
                        ▼
                初始化 RacingGame3D
                        │
                        ├── 成功 → 隐藏 Loading，显示场景
                        │
                        └── 失败 → 显示错误，提供返回按钮
```

### 5.2 事件流

```javascript
// home-view.js 中
this.onClick('#home-race3d-btn', () => {
  if (this.#game.fuelCoins < 20) {
    this.#showInsufficientFuelDialog();
    return;
  }
  
  // 扣费
  this.#game.fuelCoins -= 20;
  
  // 导航
  this.emit(Events.VIEW_CHANGE, { view: 'race3d' });
});
```

### 5.3 退出流程

```
用户点击 "Exit" 按钮
        │
        ▼
  确认对话框 "Leave the race?"
        │
        ├── 取消 → 继续
        │
        └── 确认 → dispose RacingGame3D
                        │
                        ▼
                返回首页
```

---

## 六、测试方案

### 6.1 测试文件

| 测试文件 | 测试内容 |
|----------|----------|
| `tests/racing3d-setup.test.js` | 场景初始化、模型生成 |
| `tests/lowpoly-factory.test.js` | 模型生成正确性 |

### 6.2 测试用例

```javascript
// tests/racing3d-setup.test.js

import { describe, it, expect, beforeEach } from 'vitest';
import { LowPolyFactory } from '../racing3d/renderer/LowPolyFactory.js';

describe('LowPolyFactory', () => {
  describe('createCar', () => {
    it('should create a car with default color', () => {
      const car = LowPolyFactory.createCar();
      expect(car).toBeDefined();
      expect(car.type).toBe('Group');
    });

    it('should create a car with custom color', () => {
      const car = LowPolyFactory.createCar({ color: 0x00FF00 });
      expect(car).toBeDefined();
    });

    it('should have wheels', () => {
      const car = LowPolyFactory.createCar();
      const wheels = car.children.filter(c => 
        c.geometry?.type === 'CylinderGeometry'
      );
      expect(wheels.length).toBe(4);
    });
  });

  describe('createTestTrack', () => {
    it('should create a track group', () => {
      const track = LowPolyFactory.createTestTrack();
      expect(track).toBeDefined();
      expect(track.type).toBe('Group');
    });

    it('should have track surface', () => {
      const track = LowPolyFactory.createTestTrack();
      expect(track.children.length).toBeGreaterThan(0);
    });
  });

  describe('createGround', () => {
    it('should create a ground plane', () => {
      const ground = LowPolyFactory.createGround(100);
      expect(ground).toBeDefined();
      expect(ground.geometry?.type).toBe('PlaneGeometry');
    });
  });
});
```

### 6.3 手动测试清单

| 测试项 | 操作 | 预期结果 |
|--------|------|----------|
| 页面加载 | 访问 `/index.html` | 显示首页，有 3D Race 按钮 |
| 进入场景 | 点击按钮 | Loading → 场景显示 |
| 赛车显示 | 观察场景 | 红色赛车在赛道上，缓慢旋转 |
| 赛道显示 | 观察场景 | 椭圆形赛道，红白路肩 |
| 窗口缩放 | 调整窗口大小 | 场景自适应，比例正确 |
| 退出 | 点击 Exit | 返回首页 |
| 燃油不足 | 设置 fuelCoins=10 再进入 | 弹窗提示不足 |

### 6.4 性能测试

```javascript
// 在 race3d-debug 中显示 FPS
let frameCount = 0;
let lastTime = performance.now();

function updateFPS() {
  frameCount++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    document.getElementById('race3d-fps').textContent = `FPS: ${frameCount}`;
    frameCount = 0;
    lastTime = now;
  }
  requestAnimationFrame(updateFPS);
}
```

---

## 七、实现步骤

### Step 1: 创建配置文件
- 创建 `racing3d/config/racing3d-config.js`
- 定义所有常量

### Step 2: 创建模型工厂
- 创建 `racing3d/renderer/LowPolyFactory.js`
- 实现 `createCar()` 方法
- 实现 `createTestTrack()` 方法
- 实现 `createGround()` 方法

### Step 3: 创建场景配置
- 创建 `racing3d/renderer/SceneSetup.js`
- 实现场景、相机、渲染器初始化
- 实现窗口缩放处理
- 实现资源销毁

### Step 4: 创建主控制器
- 创建 `racing3d/core/RacingGame3D.js`
- 实现生命周期方法（init、dispose）
- 实现渲染循环
- 集成场景和模型

### Step 5: 创建视图层
- 创建 `views/race3d-view.js`
- 创建 `css/racing3d.css`
- 实现加载和错误状态

### Step 6: 集成到应用
- 修改 `index.html`（添加 importmap 和容器）
- 修改 `views/view-manager.js`（注册视图）
- 修改 `views/home-view.js`（添加入口按钮）

### Step 7: 测试验证
- 编写单元测试
- 执行手动测试清单
- 性能测试

---

## 八、验收标准

| 标准 | 验证方法 |
|------|----------|
| 场景正常渲染 | 浏览器中看到赛车和赛道 |
| FPS ≥ 60 | 查看调试面板 |
| 响应窗口缩放 | 调整窗口，场景自适应 |
| 无内存泄漏 | 反复进入/退出，内存稳定 |
| 单元测试通过 | `npm test` 全部通过 |
