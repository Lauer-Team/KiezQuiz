/* KiezQuiz — static hub shell (instant paint before hub.js hydrates) */
(function () {
  function previewMapStatic(cityId) {
    return (
      '<div class="hub-map-preview kq-map">' +
      '<svg class="field" viewBox="0 0 100 66" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<rect width="100" height="66" fill="var(--map-bg,#0c0e15)"/>' +
      '<circle cx="50" cy="33" r="18" fill="#FF5233" fill-opacity="0.2"/>' +
      '</svg></div>'
    );
  }

  var HUB_SHELL_HTML =
    '<div class="hub-landing" data-hub-shell="static">' +
    '<div class="hub-landing-hero">' +
    '<div class="hub-landing-copy">' +
    '<span class="eyebrow" data-i18n="hub.landingEyebrow">Das Karten-Quiz für deinen Kiez</span>' +
    '<h2 data-i18n="hub.landingHeadline">Kennst du deinen Kiez?</h2>' +
    '<p class="hub-landing-claim" data-i18n="hub.landingClaim">„Besser wissen als Besserwissen."</p>' +
    '<p class="hub-landing-lead" data-i18n-html="hub.landingLeadStatic">Wisch dich schlau durch Stadtteile — mit XP, Serien und Trivia.</p>' +
    '<div class="hub-landing-actions">' +
    '<button type="button" class="kq-btn sig" id="hub-play-btn-static"><span data-i18n="hub.landingPlay">Jetzt spielen</span></button>' +
    '</div>' +
    '</div>' +
    '<div class="hub-landing-visual"><div class="hub-map-frame">' + previewMapStatic('hamburg') + '</div></div>' +
    '</div></div>';

  function getGame() {
    return window.kiezQuizGame || window.hamburgGame || null;
  }

  function waitForDomReady() {
    if (document.readyState !== 'loading') return Promise.resolve();
    return new Promise(function (resolve) {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    });
  }

  function waitForLoadScript() {
    if (window.kiezLoadScript) return Promise.resolve();
    return waitForDomReady().then(function () {
      return new Promise(function (resolve) {
        var elapsed = 0;
        var timer = setInterval(function () {
          if (window.kiezLoadScript) { clearInterval(timer); resolve(); return; }
          elapsed += 25;
          if (elapsed >= 10000) { clearInterval(timer); resolve(); }
        }, 25);
      });
    });
  }

  var bootPromise = null;

  function ensureGameReady() {
    if (getGame()) return Promise.resolve(getGame());
    if (!bootPromise) {
      bootPromise = waitForLoadScript()
        .then(function () {
          if (typeof window.loadGameCore === 'function') return window.loadGameCore();
          if (typeof window.loadGameBundle === 'function') return window.loadGameBundle();
        })
        .then(function () {
          if (!getGame() && typeof window.startKiezQuizGame === 'function') window.startKiezQuizGame();
          return getGame();
        })
        .finally(function () { bootPromise = null; });
    }
    return bootPromise;
  }

  function bindHubInteractions(root) {
    if (!root || root.dataset.hubShellBound === 'true') return;
    root.dataset.hubShellBound = 'true';

    root.addEventListener('click', function (e) {
      if (!root.querySelector('[data-hub-shell="static"]')) return;
      var playBtn = e.target.closest('#hub-play-btn-static, .city-tile[data-city-id]');
      if (!playBtn) return;
      e.preventDefault();
      var cityId = playBtn.dataset.cityId || 'hamburg';
      void ensureGameReady().then(function (game) {
        if (!game) return;
        if (playBtn.dataset.playable === 'false') { game.showComingSoonToast(cityId); return; }
        game.enterCity(cityId);
      });
    });
  }

  function inject(container) {
    if (!container) return;
    if (!container.querySelector('[data-hub-shell]')) {
      container.insertAdjacentHTML('beforeend', HUB_SHELL_HTML);
    }
    bindHubInteractions(container);
  }

  window.kiezHubShell = { inject: inject, bindHubInteractions: bindHubInteractions };
})();
