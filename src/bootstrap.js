/* KiezQuiz — hub-first bootstrap; lazy game bundle on city entry */
(function () {
  var GAME_CORE = [
    'src/leaderboard.js',
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

  function loadScripts(urls) {
    return window.kiezLoadScript.loadScripts(urls);
  }

  function loadGameCore() {
    if (window.KiezQuizGame) return Promise.resolve();
    if (!corePromise) corePromise = loadScripts(GAME_CORE);
    return corePromise;
  }

  function loadCityStyles() {
    var ids = ['kiez-city-styles', 'kiez-modals-styles'];
    var hrefs = ['src/styles/city.css', 'src/styles/modals.css'];
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

  function needsCityOnBoot() {
    var cityEl = document.getElementById('city-view');
    return !!(cityEl && !cityEl.hidden);
  }

  function needsHubOnBoot() {
    var hubEl = document.getElementById('hub-view');
    return !!(hubEl && !hubEl.hidden);
  }

  window.addEventListener('DOMContentLoaded', function () {
    void (async function () {
      var hubBoot = needsHubOnBoot() && typeof window.loadGameCore === 'function'
        ? window.loadGameCore()
        : Promise.resolve();

      await initI18n();
      if (window.kiezChangelog?.bindTriggers) {
        window.kiezChangelog.bindTriggers(document);
      }
      if (typeof onLocaleChange === 'function' && window.kiezChangelog?.bindTriggers) {
        onLocaleChange(function () {
          window.kiezChangelog.bindTriggers(document);
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

      document.addEventListener('pointerdown', function primeKqAudio() {
        const game = window.kiezQuizGame || window.hamburgGame;
        game?.sounds?.init();
      }, { once: true, capture: true });
    })();
  });
})();
