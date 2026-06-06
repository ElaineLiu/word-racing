# Phase 1 实现提示词

## 使用说明

将以下提示词逐个发送给 AI 助手，按顺序完成每个步骤。

---

## Prompt 1: 创建配置文件

```
创建 3D 赛车模块的配置文件。

文件路径: racing3d/config/racing3d-config.js

要求:
1. 导出 RACING3D 常量对象
2. 包含以下配置节:
   - SCENE: 背景颜色、雾效配置
   - CAMERA: FOV、近远裁面、初始位置
   - CAR: 玩家颜色、轮子颜色、缩放
   - TRACK: 宽度、半径
   - ITEMS: 金币相关
   - RACE: 圈数、入场费、AI数量
   - PERFORMANCE: 目标FPS、像素比

配色方案（十六进制）:
- 背景天空: 0x87CEEB
- 玩家赛车: 0xE53935
- 轮子: 0x212121
- 金币: 0xFFD700
- 赛道: 0x333333
- 草地: 0x4CAF50

完成后运行测试确认语法正确。
```

---

## Prompt 2: 创建模型工厂 - 赛车

```
创建 LowPolyFactory 模型工厂，实现赛车生成方法。

文件路径: racing3d/renderer/LowPolyFactory.js

要求:
1. 导入 Three.js (使用 import * as THREE from 'three')
2. 导出 LowPolyFactory 类，所有方法为静态方法
3. 实现 createCar(options) 方法:
   - 接受 color, wheelColor, scale 参数
   - 返回 THREE.Group
   - 车身: BoxGeometry(2, 0.6, 4)
   - 驾驶舱: BoxGeometry(1.4, 0.5, 1.8)，深色
   - 前翼: BoxGeometry(2.4, 0.1, 0.4)
   - 后翼: BoxGeometry(2.2, 0.4, 0.15)
   - 4个轮子: CylinderGeometry(0.35, 0.35, 0.3, 8)
   - 车号标记: 黄色圆点
   - 所有材质使用 MeshLambertMaterial，flatShading: true
   - 启用 castShadow

4. 从 '../config/racing3d-config.js' 导入默认颜色

测试方法:
- 创建测试文件 tests/lowpoly-factory.test.js
- 验证 createCar() 返回 Group
- 验证包含 4 个轮子
```

---

## Prompt 3: 创建模型工厂 - 赛道和地面

```
在 LowPolyFactory 中添加赛道路径和地面生成方法。

文件: racing3d/renderer/LowPolyFactory.js (继续编辑)

要求:
1. 实现 createTestTrack() 静态方法:
   - 使用 THREE.EllipseCurve 创建椭圆路径
   - 半径: rx=60, ry=40
   - 使用 THREE.Shape 创建赛道形状
   - 内部挖空（hole）形成赛道宽度
   - 使用 ExtrudeGeometry 挤出，深度 0.2
   - 旋转到 XZ 平面
   - 添加红白相间的路肩（间隔放置小方块）
   - 材质: 沥青灰 0x333333
   - 启用 receiveShadow

2. 实现 #createKerbs(curve, scale, rx, ry) 私有方法:
   - 创建路肩装饰
   - 红白相间

3. 实现 createGround(size) 静态方法:
   - 创建大地面
   - PlaneGeometry(size, size)
   - 颜色: 草地绿 0x4CAF50
   - 启用 receiveShadow

测试方法:
- 验证 createTestTrack() 返回 Group
- 验证 createGround() 返回 Mesh
```

---

## Prompt 4: 创建场景配置类

```
创建 SceneSetup 类，管理 Three.js 场景初始化。

文件路径: racing3d/renderer/SceneSetup.js

要求:
1. 导入 Three.js
2. 导出 SceneSetup 类
3. 私有属性:
   - #container
   - #scene
   - #camera
   - #renderer

4. 构造函数接受 container 和 config 参数:
   - 创建 Scene，设置背景色
   - 配置 Fog（如果 config.fog 存在）
   - 创建 PerspectiveCamera
   - 创建 WebGLRenderer，配置:
     - antialias: true
     - setPixelRatio: Math.min(devicePixelRatio, 2)
     - shadowMap.enabled: true
     - shadowMap.type: PCFSoftShadowMap
   - 将 canvas 添加到 container

5. Getter: scene, camera, renderer

6. 方法:
   - render(): 执行渲染
   - handleResize(): 处理窗口缩放
   - dispose(): 销毁资源，清理事件监听，遍历释放 geometry/material

7. 初始相机位置: (0, 10, 20)，看向原点

注意:
- 使用 arrow function 或 bind 保持 this 上下文
- dispose 必须清理所有 Three.js 资源防止内存泄漏
```

---

## Prompt 5: 创建主控制器

```
创建 RacingGame3D 主控制器。

文件路径: racing3d/core/RacingGame3D.js

要求:
1. 导入 Three.js、SceneSetup、LowPolyFactory、RACING3D 配置
2. 导出 RacingGame3D 类
3. 私有属性:
   - #container
   - #sceneSetup
   - #state: 'LOADING' | 'IDLE' | 'COUNTDOWN' | 'RACING' | 'FINISHED' | 'ERROR'
   - #eventBus
   - #gameState
   - #playerCar
   - #track
   - #animationId
   - #lastTime
   - #isReady

4. 构造函数接受 container 和 options (eventBus, gameState)

5. async init() 方法:
   - 创建 SceneSetup
   - 调用 LowPolyFactory.createCar() 创建赛车
   - 调用 LowPolyFactory.createTestTrack() 创建赛道
   - 调用 LowPolyFactory.createGround() 创建地面
   - 调用 #setupLighting() 添加光照:
     - AmbientLight(0xffffff, 0.6)
     - DirectionalLight(0xffffff, 0.8)，position(50,100,50)，castShadow
     - HemisphereLight(0x87CEEB, 0x4CAF50, 0.3)
   - 设置 state = 'IDLE'，isReady = true
   - 调用 #startLoop()
   - 返回 true/false 表示成功/失败
   - try-catch 捕获错误，设置 state = 'ERROR'

6. #startLoop() 方法:
   - 使用 requestAnimationFrame
   - 计算 deltaTime
   - 调用 #update(deltaTime)
   - 调用 sceneSetup.render()

7. #update(deltaTime) 方法:
   - Phase 1: 如果 state === 'IDLE'，让赛车缓慢旋转展示

8. dispose() 方法:
   - cancelAnimationFrame
   - sceneSetup.dispose()
   - 重置状态

9. Getter: getState(), isReady()
```

---

## Prompt 6: 创建视图层

```
创建 Race3DView 视图类。

文件路径: views/race3d-view.js

要求:
1. 导入 BaseView、Events、RacingGame3D
2. 导出 Race3DView 继承 BaseView
3. 构造函数接受 eventBus 和 game
4. 调用 super('page-race3d', eventBus)

5. mount() 方法:
   - 调用 super.mount()
   - 调用 #initRacingGame()

6. unmount() 方法:
   - 调用 super.unmount()
   - racingGame3D?.dispose()

7. #initRacingGame() 私有方法:
   - 获取 #race3d-canvas 容器
   - 显示 #race3d-loading
   - 创建 RacingGame3D 实例
   - 调用 init()
   - 成功则隐藏 loading，失败则显示 #race3d-error

8. 辅助方法:
   - #showLoading()
   - #hideLoading()
   - #showError(message)
```

---

## Prompt 7: 创建 CSS 样式

```
创建 3D 赛车页面的 CSS 样式。

文件路径: css/racing3d.css

要求:
1. #page-race3d:
   - position: relative
   - width: 100%, height: 100vh
   - background: #87CEEB
   - overflow: hidden

2. #race3d-canvas:
   - width: 100%, height: 100%
   - canvas 元素 display: block

3. .race3d-overlay:
   - 绝对定位，覆盖整个页面
   - flexbox 居中
   - background: rgba(0,0,0,0.7)
   - z-index: 100

4. .race3d-spinner:
   - 50x50px 旋转动画
   - 金色边框 top

5. .race3d-error:
   - 深红色背景
   - 显示错误信息和返回按钮

6. #race3d-debug:
   - 右上角固定
   - 绿色等宽字体
   - 半透明黑背景

7. .race3d-exit 按钮:
   - 左上角固定
   - 半透明黑背景
   - hover 变红色

8. 动画:
   - @keyframes spin { to { transform: rotate(360deg); } }
```

---

## Prompt 8: 修改 index.html

```
修改 index.html，添加 3D 赛车页面所需的 HTML 结构。

要求:
1. 在 <head> 中添加 importmap:
```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
  }
}
</script>
```

2. 在其他 .page 同级添加 page-race3d 容器:
```html
<div id="page-race3d" class="page">
  <!-- 加载状态 -->
  <div id="race3d-loading" class="race3d-overlay">
    <div class="race3d-loading-content">
      <div class="race3d-spinner"></div>
      <p>Loading Race...</p>
    </div>
  </div>

  <!-- 错误状态 -->
  <div id="race3d-error" class="race3d-overlay race3d-error" style="display: none;">
    <p id="race3d-error-message"></p>
    <button id="race3d-back-btn">Back to Home</button>
  </div>

  <!-- 3D 渲染容器 -->
  <div id="race3d-canvas"></div>

  <!-- 调试信息 -->
  <div id="race3d-debug">
    <span id="race3d-fps">FPS: --</span>
  </div>

  <!-- 退出按钮 -->
  <button id="race3d-exit-btn" class="race3d-btn race3d-exit">
    ✕ Exit
  </button>
</div>
```

3. 引入 CSS:
```html
<link rel="stylesheet" href="css/racing3d.css">
```
```

---

## Prompt 9: 集成到 ViewManager

```
修改 views/view-manager.js，注册 Race3DView。

要求:
1. 在文件顶部添加导入:
```javascript
import { Race3DView } from './race3d-view.js';
```

2. 在 #createViews() 方法中添加:
```javascript
this.#views.set('race3d', new Race3DView(this.#eventBus, this.#game));
```

3. 确保页面切换时正确处理 race3d 视图的生命周期
```

---

## Prompt 10: 添加首页入口按钮

```
修改 views/home-view.js，添加 3D Race 入口按钮。

要求:
1. 在 render() 方法中添加按钮 HTML (或修改 index.html 中的 home 页面):
```html
<button id="home-race3d-btn" class="home-btn race3d">
  🏎️ START 3D RACE
  <span class="home-btn-cost">20 Fuel</span>
</button>
```

2. 在 #bindEvents() 或 mount() 中添加点击事件:
```javascript
this.onClick('#home-race3d-btn', () => {
  const ENTRY_FEE = 20;
  
  if (this.#game.fuelCoins < ENTRY_FEE) {
    alert(`Need ${ENTRY_FEE} Fuel Coins to enter 3D Race!\nComplete quizzes to earn more.`);
    return;
  }
  
  // 扣除入场费
  this.#game.fuelCoins -= ENTRY_FEE;
  
  // 导航到 3D 赛车页面
  this.emit(Events.VIEW_CHANGE, { view: 'race3d' });
});
```

3. 添加对应的 CSS 样式到 css/style.css:
```css
.home-btn.race3d {
  background: linear-gradient(135deg, #E53935, #C62828);
}

.home-btn-cost {
  font-size: 12px;
  opacity: 0.8;
}
```
```

---

## Prompt 11: 编写测试

```
创建测试文件验证 Phase 1 实现。

文件路径: tests/racing3d-phase1.test.js

要求:
1. 测试 LowPolyFactory:
   - createCar() 返回 THREE.Group
   - createCar() 包含正确数量的子对象（车身、驾驶舱、轮子、翼）
   - createCar() 使用正确的默认颜色
   - createTestTrack() 返回 THREE.Group
   - createGround() 返回 THREE.Mesh

2. 测试 SceneSetup (需要 mock):
   - 构造函数正确创建 scene/camera/renderer
   - render() 不抛出错误
   - dispose() 清理资源

3. 测试 RacingGame3D:
   - init() 成功返回 true
   - init() 后 isReady() 返回 true
   - dispose() 后 isReady() 返回 false
   - getState() 返回正确的状态

注意:
- Three.js 在 Node.js 环境需要 mock
- 可以使用简单的 HTMLDivElement 作为 container mock
```

---

## Prompt 12: 测试验证

```
执行以下测试验证 Phase 1 完成:

1. 运行单元测试:
```bash
npm test
```

2. 启动开发服务器:
```bash
npm start
```

3. 浏览器测试:
   - 打开 http://localhost:端口
   - 确认首页显示 "START 3D RACE" 按钮
   - 点击按钮
   - 确认:
     - Loading 状态显示
     - 3D 场景加载成功
     - 红色赛车显示
     - 椭圆形赛道显示
     - 赛车缓慢旋转
   - 点击 Exit 按钮
   - 确认返回首页

4. 测试燃油不足场景:
   - 在控制台执行: game.fuelCoins = 10
   - 点击 "START 3D RACE"
   - 确认弹出提示

5. 性能测试:
   - 观察右上角 FPS 显示
   - 确认 FPS ≥ 60

6. 窗口缩放测试:
   - 调整浏览器窗口大小
   - 确认场景自适应

报告测试结果。
```

---

## 检查清单

完成所有步骤后，确认以下内容:

- [ ] `racing3d/config/racing3d-config.js` 存在且导出正确
- [ ] `racing3d/renderer/LowPolyFactory.js` 能生成赛车、赛道、地面
- [ ] `racing3d/renderer/SceneSetup.js` 能创建场景和渲染器
- [ ] `racing3d/core/RacingGame3D.js` 能初始化和销毁
- [ ] `views/race3d-view.js` 能正确挂载和卸载
- [ ] `css/racing3d.css` 样式正确
- [ ] `index.html` 包含 importmap 和页面容器
- [ ] `views/view-manager.js` 注册了 race3d 视图
- [ ] `views/home-view.js` 有入口按钮和事件处理
- [ ] `tests/racing3d-phase1.test.js` 测试通过
- [ ] 浏览器中能看到赛车和赛道
- [ ] FPS ≥ 60
