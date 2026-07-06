/**
 * Debug Commands - Development Tools
 *
 * These commands are only available in development mode (localhost/127.0.0.1)
 * Access them via the browser console
 */

(function() {
  // Helper to get current user ID
  function getCurrentUserId() {
    return localStorage.getItem('wr_current_user') || 'default';
  }

  // Helper to get game state storage key
  function getGameStateKey(userId) {
    return `wr_game_state_${userId}`;
  }

  // Helper to get word progress storage key
  function getWordProgressKey(userId) {
    return `wr_word_progress_${userId}`;
  }

  // Helper to get daily stats storage key
  function getDailyStatsKey(userId) {
    return `wr_daily_stats_${userId}`;
  }

  // Helper to get quiz session storage key
  function getQuizSessionKey(userId) {
    return `wr_quiz_session_${userId}`;
  }

  /**
   * Unlock a specific track
   * @param {string} trackId - Track ID to unlock (e.g., 'monaco-2d', 'shanghai-3d', 'monte-carlo-3d')
   */
  window.debugUnlockTrack = function(trackId) {
    const userId = getCurrentUserId();
    const key = getGameStateKey(userId);
    const state = JSON.parse(localStorage.getItem(key) || '{}');

    if (!state.unlockedTracks) {
      state.unlockedTracks = ['shanghai-2d'];
    }

    if (!state.unlockedTracks.includes(trackId)) {
      state.unlockedTracks.push(trackId);
    }

    localStorage.setItem(key, JSON.stringify(state));
    console.log(`✅ Track "${trackId}" unlocked! Refreshing...`);
    setTimeout(() => location.reload(), 500);
  };

  /**
   * Add fuel coins
   * @param {number} amount - Amount of fuel coins to add
   */
  window.debugAddFuelCoins = function(amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      console.error('❌ Please provide a valid positive number');
      return;
    }

    const userId = getCurrentUserId();
    const key = getGameStateKey(userId);
    const state = JSON.parse(localStorage.getItem(key) || '{}');

    state.fuelCoins = (state.fuelCoins || 0) + amount;

    localStorage.setItem(key, JSON.stringify(state));
    console.log(`✅ Added ${amount} fuel coins! Total: ${state.fuelCoins}. Refreshing...`);
    setTimeout(() => location.reload(), 500);
  };

  /**
   * Add gear coins
   * @param {number} amount - Amount of gear coins to add
   */
  window.debugAddGearCoins = function(amount) {
    if (typeof amount !== 'number' || amount <= 0) {
      console.error('❌ Please provide a valid positive number');
      return;
    }

    const userId = getCurrentUserId();
    const key = getGameStateKey(userId);
    const state = JSON.parse(localStorage.getItem(key) || '{}');

    state.gearCoins = (state.gearCoins || 0) + amount;

    localStorage.setItem(key, JSON.stringify(state));
    console.log(`✅ Added ${amount} gear coins! Total: ${state.gearCoins}. Refreshing...`);
    setTimeout(() => location.reload(), 500);
  };

  /**
   * Unlock all tracks
   */
  window.debugUnlockAllTracks = function() {
    const userId = getCurrentUserId();
    const key = getGameStateKey(userId);
    const state = JSON.parse(localStorage.getItem(key) || '{}');

    state.unlockedTracks = ['shanghai-2d', 'monaco-2d', 'silverstone-2d', 'shanghai-3d', 'night-race-3d'];

    localStorage.setItem(key, JSON.stringify(state));
    console.log('✅ All tracks unlocked! Refreshing...');
    setTimeout(() => location.reload(), 500);
  };

  /**
   * Reset to default state (keep word progress)
   */
  window.debugResetToDefault = function() {
    const userId = getCurrentUserId();

    // Reset game state but keep word progress
    const state = {
      version: 4,
      fuelCoins: 0,
      gearCoins: 0,
      nitroCharges: 0,
      quizMode: 'basic',
      wrongWords: [],
      daily: {
        lastActiveDate: null,
        todayQuizzes: 0,
        todayFuelCoins: 0,
        todayGearCoins: 0
      },
      learning: {
        totalWordsSeen: 0,
        totalWordsMastered: 0,
        totalQuizzes: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        lastPerfectQuiz: false
      },
      achievements: [],
      unlockedTracks: ['shanghai-2d'],
      selectedTrackId: 'shanghai-2d'
    };

    localStorage.setItem(getGameStateKey(userId), JSON.stringify(state));
    localStorage.removeItem(getDailyStatsKey(userId));
    localStorage.removeItem(getQuizSessionKey(userId));

    console.log('✅ Reset to default state (word progress preserved). Refreshing...');
    setTimeout(() => location.reload(), 500);
  };

  /**
   * Display help information
   */
  window.debugHelp = function() {
    console.log(`
🎮 Word Racing Debug Commands

Available commands:
  debugUnlockTrack(trackId)      - Unlock a specific track
  debugAddFuelCoins(amount)      - Add fuel coins
  debugAddGearCoins(amount)      - Add gear coins
  debugUnlockAllTracks()         - Unlock all tracks
  debugResetToDefault()          - Reset to default state (keep word progress)
  debugHelp()                    - Show this help message

Example usage:
  > debugAddFuelCoins(1000)
  > debugUnlockTrack('monaco-2d')
  > debugUnlockAllTracks()
    `);
  };

  // Log welcome message
  console.log(`
🎮 Word Racing Debug Mode Active!
Type "debugHelp()" to see available commands.
  `);
})();
