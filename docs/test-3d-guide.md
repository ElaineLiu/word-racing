# 3D 赛道测试指南

## 快速开始（推荐）

### 步骤 1：打开游戏
```
http://localhost:3000/index.html
```

### 步骤 2：打开浏览器控制台
- Windows/Linux: 按 `F12` 或 `Ctrl+Shift+I`
- Mac: 按 `Cmd+Option+I`

### 步骤 3：复制粘贴以下脚本

**一键设置（推荐）：**
```javascript
(function() {
  const STORAGE_KEY = 'wr_game_state';
  const FLAGS_KEY = 'wr_feature_flags';

  // 1. 启用 3D 功能
  const flags = JSON.parse(localStorage.getItem(FLAGS_KEY) || '{}');
  flags['3d-track'] = true;
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));

  // 2. 设置游戏状态
  const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  state.unlockedTracks = ['shanghai-2d', 'shanghai-3d'];
  state.selectedTrackId = 'shanghai-3d';
  state.fuelCoins = 10000;
  state.learning = state.learning || {};
  state.learning.totalWordsMastered = 250;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  console.log('✅ 3D 赛道测试环境已就绪！');
  console.log('📍 请刷新页面（F5），然后点击 "Race" 开始测试');
})();
```

或者**加载脚本文件：**
```javascript
const script = document.createElement('script');
script.src = './quick-test-3d.js';
document.body.appendChild(script);
```

### 步骤 4：刷新页面
按 `F5` 或 `Ctrl+R`

### 步骤 5：开始测试
1. 点击顶部导航 **"Race"**
2. 直接点击 **"START RACE"** 按钮
   - （已自动选择上海 3D 赛道）

## 手动设置（备用方案）

如果脚本不工作，可以手动修改：

1. 打开开发者工具 → **Application** 标签页
2. 左侧 **Storage** → **Local Storage** → `http://localhost:3000`
3. 找到 `wr_game_state` 键
4. 编辑值，确保包含：
   ```json
   {
     "fuelCoins": 10000,
     "unlockedTracks": ["shanghai-2d", "shanghai-3d"],
     "selectedTrackId": "shanghai-3d",
     "learning": {
       "totalWordsMastered": 250
     }
   }
   ```
5. 刷新页面
       "monaco-2d",
       "silverstone-2d",
       "shanghai-3d"
     ],
     "learning": {
       "totalWordsMastered": 250,
       "totalQuizzes": 20,
       "totalWordsSeen": 300
     }
   }
   ```
5. 刷新页面

## 测试清单

### ✅ 倒计时测试
- [ ] 倒计时时能看到赛车和赛道（无黑色遮罩）
- [ ] 能看到 AI 对手（3 辆车）
- [ ] 相机位于起点后方（能看到所有赛车）
- [ ] 倒计时数字清晰可见

### ✅ 比赛测试
- [ ] 比赛开始后能正常驾驶
- [ ] AI 对手正常移动
- [ ] 能完成比赛
- [ ] 结果页面正常显示

### ✅ UI 测试
- [ ] HUD 信息清晰（速度、圈数、排名）
- [ ] 小地图正常显示
- [ ] 模式切换（Chase ↔ Cockpit）正常

## 已知问题

如果遇到问题，检查以下内容：

### 问题：看不到 3D 赛道
**原因**：Three.js 未加载
**解决**：确保 `node_modules/three` 存在，运行 `npm install`

### 问题：赛道未解锁
**原因**：GameState 未正确设置
**解决**：重新运行 `test-3d-setup.js` 脚本

### 问题：金币不足
**原因**：3D 赛道消耗 10 金币
**解决**：脚本已设置 10000 金币，足够测试

## 调试技巧

### 检查游戏状态
```javascript
// 在控制台运行
console.log(window.game._gameState.serialize());
```

### 检查解锁状态
```javascript
console.log(window.game._trackUnlockManager.getUnlockProgress('shanghai-3d'));
```

### 检查 3D 会话
```javascript
console.log(window.game._raceSession3D);
```

### 强制进入比赛
```javascript
window.game._prepareRaceAfterCost('shanghai-3d', { type: '3d', cost: 10 });
```

## 清理测试数据

如需重置所有数据：
```javascript
localStorage.clear();
location.reload();
```

## 相关文档

- [3D 赛道开发进度](./design/3d-track/README.md)
- [架构设计](./design/3d design prompt.md)
- [测试设计原则](./docs/testing-principles.md)
