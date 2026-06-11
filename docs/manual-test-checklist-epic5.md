# Epic 5 手动冒烟测试清单

## 准备工作

1. 访问 http://localhost:3001/index.html
2. 打开浏览器开发者工具（F12）查看 Console 和 Network

---

## 测试场景 1：2D 回归测试

**目的**: 确保 3D 集成未破坏现有 2D 流程

**步骤**:
1. [ ] 点击 "START QUIZ" 开始答题
2. [ ] 完成一套题（或点击 "我不认识" 快速完成）
3. [ ] 在结果页点击 "GO TO SHOP"
4. [ ] 在 Shop 选择任一 2D 赛道（上海、蒙特卡洛、银石）
5. [ ] 点击 "START RACE"
6. [ ] 验证：
   - [ ] 倒计时正常显示
   - [ ] 2D 赛道正常渲染
   - [ ] 赛车可控制（键盘或触屏）
   - [ ] 完成 1 圈后显示结果页
   - [ ] 燃油正确扣除（默认 10 fuelCoins）

**预期结果**: 2D 流程完全正常，无报错

---

## 测试场景 2：3D 快乐路径

**目的**: 验证 3D 赛道完整流程

**前置条件**: 确保 localStorage 中有足够资源
```javascript
// 在浏览器 Console 执行
localStorage.setItem('wr_game_state', JSON.stringify({
  version: 3,
  fuel: 100,
  fuelCoins: 200,
  gearCoins: 100,
  nitroCharges: 5,
  upgrades: { engine: 1, tire: 1, body: 1 },
  unlockedTracks: ['shanghai-2d', 'monaco-2d', 'silverstone-2d', 'shanghai-3d'],
  selectedTrackId: 'shanghai-3d'
}));
location.reload();
```

**步骤**:
1. [ ] 刷新页面后，点击 "QUIZ" → "START QUIZ" 完成答题获取燃油
2. [ ] 进入 SHOP → Tracks 标签
3. [ ] 验证：
   - [ ] 看到 "经典赛道" 和 "3D沉浸赛道" 两个分组
   - [ ] shanghai-3d 显示为已解锁且可选择
4. [ ] 选择 shanghai-3d
5. [ ] 点击 "START RACE"
6. [ ] 验证：
   - [ ] 页面切换到 Race
   - [ ] WebGL canvas 显示（黑色背景出现 3D 场景）
   - [ ] 3D 赛道渲染正常
   - [ ] 玩家赛车出现
   - [ ] 3 辆 AI 赛车出现并开始移动
   - [ ] HUD 正常显示（圈数、时间、燃油、氮气）
   - [ ] 键盘/触屏可控制赛车
   - [ ] 排名实时更新（HUD 左上角）
7. [ ] 完成比赛或中途点击 Exit
8. [ ] 验证结果页：
   - [ ] 显示最终排名（1st/2nd/3rd/4th）
   - [ ] 显示完整排名榜
   - [ ] 燃油正确扣除（基于实际进度）
   - [ ] fuelCoins 已扣除（入场费 20）

**预期结果**: 3D 赛道完全可玩，排名正确，资源扣除正确

---

## 测试场景 3：Feature Flag 禁用

**目的**: 验证 3D 可通过 feature flag 完全禁用

**步骤**:
1. [ ] 在浏览器 Console 执行：
   ```javascript
   localStorage.setItem('featureFlags', JSON.stringify({ '3d-track': false }));
   location.reload();
   ```
2. [ ] 刷新后进入 SHOP → Tracks
3. [ ] 验证：
   - [ ] 只看到 "经典赛道" 分组
   - [ ] 没有 "3D沉浸赛道" 分组
   - [ ] 3D 赛道完全不显示

**预期结果**: 3D 功能完全隐藏

---

## 测试场景 4：资源不足保护

**目的**: 验证资源不足时的正确处理

**步骤**:
1. [ ] 清空资源：
   ```javascript
   localStorage.setItem('wr_game_state', JSON.stringify({
     version: 3,
     fuel: 100,
     fuelCoins: 5,  // 不足以支付任何赛道
     gearCoins: 0,
     nitroCharges: 0,
     upgrades: { engine: 1, tire: 1, body: 1 },
     unlockedTracks: ['shanghai-2d', 'shanghai-3d'],
     selectedTrackId: 'shanghai-3d'
   }));
   location.reload();
   ```
2. [ ] 刷新后进入 SHOP → Tracks
3. [ ] 验证：
   - [ ] shanghai-3d 显示为 "金币不足" 状态
   - [ ] 点击 shanghai-3d 不应触发选择
4. [ ] 尝试直接点击 "START RACE"
5. [ ] 验证：
   - [ ] 弹出错误提示："Insufficient fuel coins"
   - [ ] 未切换到 Race 页面
   - [ ] fuelCoins 未扣除

**预期结果**: 资源不足时阻止比赛，不扣费

---

## 测试场景 5：中途退赛

**目的**: 验证中途退出的资源扣除

**步骤**:
1. [ ] 重置充足资源：
   ```javascript
   localStorage.setItem('wr_game_state', JSON.stringify({
     version: 3,
     fuel: 100,
     fuelCoins: 200,
     gearCoins: 100,
     nitroCharges: 5,
     upgrades: { engine: 1, tire: 1, body: 1 },
     unlockedTracks: ['shanghai-2d', 'shanghai-3d'],
     selectedTrackId: 'shanghai-3d'
   }));
   location.reload();
   ```
2. [ ] 进入 SHOP → 选择 shanghai-3d → START RACE
3. [ ] 等待比赛开始，行驶一段距离（观察 HUD 显示当前圈数和进度）
4. [ ] 点击 Exit 按钮退出
5. [ ] 验证：
   - [ ] 返回 Home 页面
   - [ ] Console 无报错
   - [ ] 检查 fuelCoins 和 fuel 扣除：
     ```javascript
     const state = JSON.parse(localStorage.getItem('wr_game_state'));
     console.log('fuelCoins:', state.fuelCoins, 'fuel:', state.fuel);
     // fuelCoins 应扣 20（入场费）
     // fuel 应按实际圈数和进度扣除，而非满额
     ```

**预期结果**: 按实际进度扣燃油，入场费正常扣除，无内存泄漏

---

## 测试场景 6：窗口缩放

**目的**: 验证 3D canvas 响应式布局

**步骤**:
1. [ ] 启动 3D 比赛（shanghai-3d）
2. [ ] 在比赛过程中调整浏览器窗口大小
3. [ ] 验证：
   - [ ] 3D canvas 自适应调整
   - [ ] HUD overlay 跟随调整
   - [ ] 无拉伸或变形
   - [ ] 触控按钮位置正确

**预期结果**: 响应式布局正常

---

## 测试场景 7：连续比赛

**目的**: 验证多次比赛的内存和状态管理

**步骤**:
1. [ ] 确保有足够资源（fuelCoins: 500）
2. [ ] 连续进行 3 场 3D 比赛：
   - [ ] 第一场：完整完成比赛
   - [ ] 第二场：中途退出
   - [ ] 第三场：完整完成比赛
3. [ ] 每场比赛后检查：
   - [ ] Console 无 WebGL 上下文丢失警告
   - [ ] 无内存持续增长（Chrome Task Manager）
   - [ ] fuelCoins 正确累计扣除

**预期结果**: 无内存泄漏，状态管理正确

---

## 回收测试

**清理测试数据**:
```javascript
localStorage.removeItem('wr_game_state');
localStorage.removeItem('featureFlags');
location.reload();
```

---

## 已知问题记录

在此记录测试中发现的问题：

| 编号 | 描述 | 严重程度 | 状态 |
|------|------|---------|------|
|      |      |         |      |

---

## 测试完成标准

- [ ] 所有 7 个场景通过
- [ ] 无 Critical/High 级别问题
- [ ] Console 无错误日志
- [ ] 资源扣除逻辑正确
- [ ] 2D 流程无回归

测试人员：_________
测试时间：_________
测试环境：Chrome/Edge/Firefox _________
