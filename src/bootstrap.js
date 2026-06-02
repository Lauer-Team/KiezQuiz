/* KiezQuiz — hub-first bootstrap; lazy game bundle on city entry */
(function () {
  var GAME_CORE = [
    'src/leaderboard.js',
    'src/playerActivity.js',
    'src/game/config.js',
    'src/game/progress.js',
    'src/districtColors.js',
    'src/game/SoundManager.js',
    'src/game/effects.js',
    'src/game/MapNavigator.js',
    'src/game/KiezQuizGame.js'
  ];

  var CITY_EXTRAS = [
    'src/data/hamburg_data.js',
    'src/data/berlin_data.js',
    'src/data/frankfurt_data.js',
    'src/data/europe_data.js',
    'src/data/europe_islands.js',
    'src/data/europe_microstates.js',
    'src/ui/cityDashboard.js',
    'src/ui/modals.js'
  ];

  var corePromise = null;
  var fullPromise = null;

  function assetHref(path) {
    return typeof window.kiezAssetUrl === 'function' ? window.kiezAssetUrl(path) : path;
  }

  function loadScripts(urls) {
    return window.kiezLoadScript.loadScripts(urls);
  }

  function loadGameCore() {
    if (window.KiezQuizGame) return Promise.resolve();
    if (!corePromise) corePromise = loadScripts(GAME_CORE);
    return corePromise;
  }

  function loadSharedOverlayStyles() {
    if (document.getElementById('kiez-modals-styles')) return Promise.resolve();
    return new Promise(function (resolve) {
      var link = document.createElement('link');
      link.id = 'kiez-modals-styles';
      link.rel = 'stylesheet';
      link.href = assetHref('src/styles/modals.css');
      link.onload = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
    });
  }

  function loadCityStyles() {
    var ids = ['kiez-city-styles', 'kiez-modals-styles'];
    var hrefs = ['src/styles/city.css', 'src/styles/modals.css'].map(assetHref);
    var chain = Promise.resolve();
    hrefs.forEach(function (href, i) {
      chain = chain.then(function () {
        if (document.getElementById(ids[i])) return;
        return new Promise(function (resolve) {
          var link = document.createElement('link');
          link.id = ids[i];
          link.rel = 'stylesheet';
          link.href = href;
          link.onload = resolve;
          link.onerror = resolve;
          document.head.appendChild(link);
        });
      });
    });
    return chain;
  }

  window.loadGameBundle = function () {
    if (fullPromise) return fullPromise;
    fullPromise = loadGameCore().then(function () {
      return loadScripts(CITY_EXTRAS);
    }).then(function () {
      return loadCityStyles();
    });
    return fullPromise;
  };

  window.loadGameCore = loadGameCore;

  function openSettingsModal() {
    var game = window.kiezQuizGame || window.hamburgGame;
    if (game && typeof game.showSettings === 'function') {
      game.showSettings();
      return;
    }
    var chain = typeof window.loadGameCore === 'function'
      ? window.loadGameCore()
      : Promise.resolve();
    chain.then(function () {
      if (!window.kiezQuizGame && !window.hamburgGame && typeof window.startKiezQuizGame === 'function') {
        return window.startKiezQuizGame();
      }
    }).then(function () {
      var g = window.kiezQuizGame || window.hamburgGame;
      if (g && typeof g.showSettings === 'function') g.showSettings();
    });
  }

  function syncLangButton() {
    var btn = document.getElementById('btn-lang');
    if (!btn || typeof getLocale !== 'function') return;
    btn.textContent = getLocale() === 'de' ? '🇩🇪' : '🇬🇧';
    var titleKey = getLocale() === 'de' ? 'header.langSwitchToEn' : 'header.langSwitchToDe';
    btn.dataset.i18nTitle = titleKey;
    if (typeof t === 'function') btn.title = t(titleKey);
  }

  function syncMuteButton() {
    var btn = document.getElementById('btn-mute');
    if (!btn) return;
    var game = window.kiezQuizGame || window.hamburgGame;
    var muted = game?.sounds
      ? !!game.sounds.muted
      : localStorage.getItem('hamburg_muted') === 'true';
    btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    btn.classList.toggle('is-muted', muted);
    if (typeof t === 'function') btn.title = t('header.soundTitle');
  }

  function bindHeaderControls() {
    var themeBtn = document.getElementById('btn-theme');
    if (themeBtn && !themeBtn.dataset.kqThemeBound && !themeBtn.dataset.bound) {
      themeBtn.dataset.kqThemeBound = 'true';
      themeBtn.addEventListener('click', function () {
        window.kiezTheme?.toggleTheme?.();
      });
    }
    var settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn && !settingsBtn.dataset.kqSettingsBound) {
      settingsBtn.dataset.kqSettingsBound = 'true';
      settingsBtn.addEventListener('click', function () {
        openSettingsModal();
      });
    }

    var langBtn = document.getElementById('btn-lang');
    if (langBtn && langBtn.dataset.kqLangBound !== 'true') {
      langBtn.dataset.kqLangBound = 'true';
      langBtn.addEventListener('click', function () {
        if (typeof setLocale === 'function') {
          setLocale(getLocale() === 'de' ? 'en' : 'de');
        }
      });
    }

    var muteBtn = document.getElementById('btn-mute');
    if (muteBtn && muteBtn.dataset.kqMuteBound !== 'true') {
      muteBtn.dataset.kqMuteBound = 'true';
      muteBtn.addEventListener('click', function () {
        var game = window.kiezQuizGame || window.hamburgGame;
        if (game?.sounds) {
          game.sounds.init();
          game.sounds.toggleMute();
          if (typeof game.syncMuteButton === 'function') game.syncMuteButton();
          else syncMuteButton();
          if (typeof game.saveState === 'function') game.saveState();
          return;
        }
        var nextMuted = localStorage.getItem('hamburg_muted') !== 'true';
        localStorage.setItem('hamburg_muted', nextMuted ? 'true' : 'false');
        syncMuteButton();
      });
    }
  }

  function bindGlobalMapControls() {
    if (document.documentElement.dataset.kqMapControlsBound === 'true') return;
    document.documentElement.dataset.kqMapControlsBound = 'true';
    document.addEventListener('click', function (e) {
      var resetBtn = e.target.closest('#btn-zoom-reset');
      if (resetBtn) {
        var game = window.kiezQuizGame || window.hamburgGame;
        if (game?.mapNav) game.mapNav.reset();
        return;
      }
      var zoomIn = e.target.closest('#btn-zoom-in');
      if (zoomIn) {
        (window.kiezQuizGame || window.hamburgGame)?.mapNav?.zoomIn?.();
        return;
      }
      var zoomOut = e.target.closest('#btn-zoom-out');
      if (zoomOut) {
        (window.kiezQuizGame || window.hamburgGame)?.mapNav?.zoomOut?.();
      }
    });
  }

  function applyRedesignChrome() {
    var icons = window.kiezIcons;
    if (icons && icons.ModeIcon) {
      document.querySelectorAll('[data-mode-icon]').forEach(function (el) {
        var key = el.getAttribute('data-mode-icon');
        if (icons.ModeIcon[key]) el.innerHTML = icons.ModeIcon[key];
      });
    }
    window.kiezGlobalHeader?.applyWordmark?.();
    window.kiezGlobalHeader?.syncBrandTheme?.();
    window.kiezGlobalHeader?.syncHeaderOffset?.();
    bindHeaderControls();
    syncLangButton();
    syncMuteButton();
    var game = window.kiezQuizGame || window.hamburgGame;
    var hubView = document.getElementById('hub-view');
    if (game && hubView && !hubView.hidden && window.kiezHub?.render) {
      window.kiezHub.render(game, hubView);
    }
  }

  window.applyRedesignChrome = applyRedesignChrome;
  window.kiezHeaderControls = { syncLangButton: syncLangButton, syncMuteButton: syncMuteButton };

  function needsCityOnBoot() {
    var cityEl = document.getElementById('city-view');
    return !!(cityEl && !cityEl.hidden);
  }

  function needsHubOnBoot() {
    var hubEl = document.getElementById('hub-view');
    return !!(hubEl && !hubEl.hidden);
  }

  window.addEventListener('DOMContentLoaded', function () {
    bindHeaderControls();
    bindGlobalMapControls();
    applyRedesignChrome();
    window.addEventListener('kiezthemechange', applyRedesignChrome);

    void (async function () {
      await loadSharedOverlayStyles();
      var hubBoot = needsHubOnBoot() && typeof window.loadGameCore === 'function'
        ? window.loadGameCore()
        : Promise.resolve();

      await initI18n();
      syncLangButton();
      syncMuteButton();
      if (window.kiezChangelog?.bindTriggers) {
        window.kiezChangelog.bindTriggers(document);
      }
      if (typeof onLocaleChange === 'function') {
        onLocaleChange(function () {
          syncLangButton();
          syncMuteButton();
          window.kiezChangelog?.bindTriggers?.(document);
        });
      }
      if (needsCityOnBoot()) {
        await window.loadGameBundle();
      } else {
        await hubBoot;
      }
      if (typeof window.startKiezQuizGame === 'function') {
        window.startKiezQuizGame();
      }
      window.applyRedesignChrome?.();

      document.addEventListener('pointerdown', function primeKqAudio() {
        const game = window.kiezQuizGame || window.hamburgGame;
        game?.sounds?.init();
      }, { once: true, capture: true });
    })();
  });
})();
