/* KiezQuiz — logged-in users use /profile/ as home, not the landing page */
(function () {
  function isHomePath() {
    return window.kiezViewRouter?.isHomePath?.(window.location.pathname) ?? false;
  }

  function hasLocalProgress() {
    try {
      const save = window.saveManager?.loadSave?.();
      return !!(save && window.saveManager?.hasAnyProgress?.(save));
    } catch (e) {
      return false;
    }
  }

  function shouldRedirectToDashboard(auth) {
    if (!isHomePath()) return false;
    if (auth?.isLoggedIn?.()) return true;
    return hasLocalProgress();
  }

  function redirectToDashboard() {
    if (window.location.pathname.replace(/\/+$/, '') === '/profile') return;
    window.location.replace('/profile/');
  }

  window.kiezPlayerRedirect = {
    isHomePath: isHomePath,
    shouldRedirectToDashboard: shouldRedirectToDashboard,
    redirectToDashboard: redirectToDashboard
  };
})();
