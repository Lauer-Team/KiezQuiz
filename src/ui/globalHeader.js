/* KiezQuiz — shared header chrome for hub and city views */
(function () {
  function renderHubHeader(game) {
    var ranks = typeof getRanks === 'function' ? getRanks() : [];
    var currentRank = ranks.find(function (r) { return r.level === game.level; }) || ranks[0];
    return (
      '<div class="hub-top">' +
        '<div class="brand">' +
          '<span style="font-size:1.7rem">⚓</span>' +
          '<h1>KiezQuiz</h1>' +
          '<span class="badge">' + t('hub.badge') + '</span>' +
        '</div>' +
        '<div class="hub-account">' +
          '<div class="hub-account-rank">' +
            '<span class="hub-account-label">' + t('header.globalRankLabel') + '</span>' +
            '<span class="hub-account-value">' + (currentRank && currentRank.name ? currentRank.name : t('ranks.fallback')) + '</span>' +
          '</div>' +
          '<div class="stat-pill xp-pill"><span class="label">' + t('header.xpLabel').replace(':', '') + '</span><span class="value" id="hub-stat-xp">' + game.xp + '</span></div>' +
          '<div class="stat-pill streak-pill"><span style="font-size:1rem">🔥</span><span class="value" style="color:var(--color-hamburg-mitte)" id="hub-stat-streak">' + game.streak + '</span></div>' +
          '<button type="button" class="auth-pill hub-auth-pill" data-i18n-title="header.authTitle" title="">' +
            '<span class="auth-pill-icon">👤</span>' +
            '<span class="auth-pill-label" data-i18n="header.guest">Gast</span>' +
            '<span class="auth-pill-action" data-i18n="header.login">Anmelden</span>' +
          '</button>' +
          '<button type="button" class="changelog-header-btn hub-changelog-btn" data-changelog-trigger data-i18n-title="header.changelogTitle" title="">' +
            '<span class="changelog-header-icon" aria-hidden="true">✨</span>' +
            '<span class="changelog-header-label" data-i18n="footer.changelog">Was ist neu?</span>' +
          '</button>' +
          '<button class="audio-toggle lang-toggle" id="hub-btn-lang" title="">🇩🇪</button>' +
          '<button class="audio-toggle" id="hub-btn-settings" data-i18n-title="header.settingsTitle" title="">⚙️</button>' +
        '</div>' +
      '</div>'
    );
  }

  window.kiezGlobalHeader = { renderHubHeader: renderHubHeader };
})();
