/* KiezQuiz — player redirect helpers (auto-redirect disabled; use hub nav Dashboard link) */
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

  function shouldRedirectToDashboard() {
    return false;
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
