/* KiezQuiz game bootstrap (city bundle entry) */
window.startKiezQuizGame = async function startKiezQuizGame() {
  const game = new KiezQuizGame();
  window.kiezQuizGame = game;
  window.hamburgGame = game;

  window.authManager = new AuthManager(window.SUPABASE_CONFIG || {});
  window.cloudSync = new CloudSync(window.authManager, game);
  let _previousAuthUser;

  window.authManager.onAuthChange(async (user) => {
    window.authManager.updateHeaderUI();
    window.kiezAdminBar?.scheduleRender?.();
    if (user) {
      await window.cloudSync.handleLoginMerge();
      game.reRenderCurrentView();
      if (game.view === 'city') {
        game.updateMapStates();
        game.updateIslandBadges();
      }
    } else if (_previousAuthUser) {
      game.resetToGuestState();
    }
    window.kiezHub?.refreshHubNav?.();
    _previousAuthUser = user;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && window.cloudSync?.isEnabled()) {
      window.cloudSync.flushSaveNow();
    }
  });

  onLocaleChange(() => game.reRenderCurrentView());

  game.init();
  window.kiezAppHistory?.bind?.(game);

  void (async () => {
    try {
      await window.authManager.init();
      await window.authManager.waitForPendingAuthTasks();
      window.authManager.initUI();
      window.kiezAdminBar?.scheduleRender?.();
      if (window.authManager.isLoggedIn()) {
        game.reRenderCurrentView();
        if (game.view === 'city') {
          game.updateMapStates();
          game.updateIslandBadges();
        }
      }
      window.kiezHub?.refreshHubNav?.();
    } catch (err) {
      console.warn('Auth startup failed:', err);
      window.authManager.initUI();
    }
  })();
};
