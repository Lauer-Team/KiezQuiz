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
      if (window.kiezPlayerRedirect?.shouldRedirectToDashboard?.(window.authManager) && game.view === 'hub') {
        window.kiezPlayerRedirect.redirectToDashboard();
        return;
      }
      game.reRenderCurrentView();
      if (game.view === 'city') {
        game.updateMapStates();
        game.updateIslandBadges();
      }
    } else if (_previousAuthUser) {
      game.resetToGuestState();
    }
    _previousAuthUser = user;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && window.cloudSync?.isEnabled()) {
      window.cloudSync.flushSaveNow();
    }
  });

  onLocaleChange(() => game.reRenderCurrentView());

  const deferHubForAuth = window.kiezPlayerRedirect?.isHomePath?.() && !window.kiezViewRouter?.cityFromPathname?.(window.location.pathname);

  function startGameViews() {
    game.init();
    window.kiezAppHistory?.bind?.(game);
  }

  if (deferHubForAuth) {
    void (async () => {
      try {
        await window.authManager.init();
        if (window.kiezPlayerRedirect?.shouldRedirectToDashboard?.(window.authManager)) {
          await window.cloudSync.handleLoginMerge();
          window.kiezPlayerRedirect.redirectToDashboard();
          return;
        }
        startGameViews();
        await window.authManager.waitForPendingAuthTasks();
        window.authManager.initUI();
        window.kiezAdminBar?.scheduleRender?.();
      } catch (err) {
        console.warn('Auth startup failed:', err);
        startGameViews();
        window.authManager.initUI();
      }
    })();
    return;
  }

  // City deep links: start immediately — do not block on Supabase (can hang on slow networks).
  startGameViews();

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
    } catch (err) {
      console.warn('Auth startup failed:', err);
      window.authManager.initUI();
    }
  })();
};
