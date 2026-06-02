/* KiezQuiz — logged-in users use /profile/ as home, not the landing page */
(function () {
  function isHomePath() {
    return window.kiezViewRouter?.isHomePath?.(window.location.pathname) ?? false;
  }

  function shouldRedirectToDashboard(auth) {
    return !!(auth?.isLoggedIn?.() && isHomePath());
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
