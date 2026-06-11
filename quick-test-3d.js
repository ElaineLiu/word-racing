/**
 * 3D 赛道一键测试脚本（简化版）
 * 复制粘贴到浏览器控制台运行即可
 */

(function() {
  const STORAGE_KEY = 'wr_game_state';
  const FLAGS_KEY = 'wr_feature_flags';

  console.log('🎮 设置 3D 赛道测试环境...\n');

  // 1. 确保 3D 功能启用
  const flags = JSON.parse(localStorage.getItem(FLAGS_KEY) || '{}');
  flags['3d-track'] = true;
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));
  console.log('✓ 3D 功能已启用');

  // 2. 设置游戏状态
  const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

  // 解锁赛道
  state.unlockedTracks = ['shanghai-2d', 'shanghai-3d'];
  state.selectedTrackId = 'shanghai-3d';
  state.fuelCoins = 10000;

  // 设置学习进度（用于 UI 显示解锁条件）
  state.learning = state.learning || {};
  state.learning.totalWordsMastered = 250;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  console.log('✓ 已解锁: shanghai-3d');
  console.log('✓ 已选择: shanghai-3d');
  console.log('✓ 金币: 10000');
  console.log('\n📍 请刷新页面（F5），然后点击 "Race" 开始测试');
})();