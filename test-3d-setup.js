/**
 * 3D 赛道测试准备脚本
 *
 * 在浏览器控制台中运行此脚本，解锁 3D 赛道测试所需的前置条件
 */

(function() {
  console.log('🎮 准备 3D 赛道测试环境...\n');

  // 存储键名（与 GameState.STORAGE_KEY 一致）
  const STORAGE_KEY = 'wr_game_state';

  // 读取当前 GameState
  const stateStr = localStorage.getItem(STORAGE_KEY);
  const state = stateStr ? JSON.parse(stateStr) : {};

  console.log('当前状态:', {
    金币: state.fuelCoins || 0,
    已解锁赛道: state.unlockedTracks || [],
    当前选择: state.selectedTrackId || '未选择'
  });

  // 设置测试条件
  state.fuelCoins = 10000; // 大量金币
  state.unlockedTracks = state.unlockedTracks || [];

  // 确保 shanghai-2d 和 shanghai-3d 都解锁
  if (!state.unlockedTracks.includes('shanghai-2d')) {
    state.unlockedTracks.push('shanghai-2d');
  }
  if (!state.unlockedTracks.includes('shanghai-3d')) {
    state.unlockedTracks.push('shanghai-3d');
  }

  // 设置当前选择为 3D 赛道
  state.selectedTrackId = 'shanghai-3d';

  // 设置学习进度（用于 UI 显示）
  state.learning = state.learning || {};
  state.learning.totalWordsMastered = 250; // 超过 shanghai-3d 的 200 要求
  state.learning.totalQuizzes = 20;
  state.learning.totalWordsSeen = 300;

  // 保存回 localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  console.log('\n✅ 测试环境已就绪！');
  console.log('-----------------------------------');
  console.log('💰 金币:', state.fuelCoins);
  console.log('🏁 已解锁赛道:', state.unlockedTracks);
  console.log('📍 当前选择:', state.selectedTrackId);
  console.log('📚 掌握单词:', state.learning.totalWordsMastered);
  console.log('-----------------------------------');
  console.log('\n📍 下一步：');
  console.log('1. 刷新页面（F5）');
  console.log('2. 点击顶部导航 "Race"');
  console.log('3. 点击 "START RACE" 按钮');
  console.log('   （已自动选择上海 3D 赛道）');
  console.log('\n💡 提示：倒计时时应该能看到赛车和赛道（无黑色遮罩）');
})();
