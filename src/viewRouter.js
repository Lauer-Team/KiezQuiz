/* KiezQuiz — single source for initial hub vs. city routing */
(function () {
  var SAVE_KEY = 'kiezquiz_save_v2';
  var PLAYABLE = { hamburg: true, berlin: true, frankfurt: true, muenchen: true, duesseldorf: true, europe: true };

  function hasV1Save() {
    return localStorage.getItem('hh_xp') !== null ||
      localStorage.getItem('hh_trophies') !== null ||
      localStorage.getItem('hh_achievements') !== null;
  }

  function hasProgressInSave(save) {
    if (!save) return false;
    if ((save.global && save.global.xp) > 0) return true;
    var cities = save.cities || {};
    for (var cid in cities) {
      if (!Object.prototype.hasOwnProperty.call(cities, cid)) continue;
      var c = cities[cid];
      if (!c) continue;
      if ((c.highScore || 0) > 0) return true;
      if (Array.isArray(c.trophies) && c.trophies.length > 0) return true;
      if (Array.isArray(c.gameHistory) && c.gameHistory.length > 0) return true;
      var rp = c.regionProgress || {};
      for (var bz in rp) {
        if (Object.prototype.hasOwnProperty.call(rp, bz) && Array.isArray(rp[bz]) && rp[bz].length > 0) {
          return true;
        }
      }
    }
    return false;
  }

  function getInitialViewFromSave(save) {
    if (save.migratedFromV1 && save.lastCity) return 'city';
    if (save.lastCity && hasProgressInSave(save)) return 'city';
    return 'hub';
  }

  function loadSaveSnapshot() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && parsed.saveVersion === 2 ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function cityFromPathname(pathname) {
    var path = (pathname || '/').replace(/\/+$/, '') || '/';
    var segment = path.split('/').filter(Boolean)[0] || '';
    return segment && PLAYABLE[segment] ? segment : '';
  }

  function isHomePath(pathname) {
    var path = (pathname || '/').replace(/\/+$/, '') || '/';
    return path === '/';
  }

  function resolveInitialView(opts) {
    opts = opts || {};
    var searchParams = opts.searchParams;
    if (!searchParams && typeof URLSearchParams !== 'undefined') {
      searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    }
    var save = opts.save !== undefined ? opts.save : loadSaveSnapshot();
    var v1 = opts.hasV1Save !== undefined ? opts.hasV1Save : hasV1Save();

    var cityParam = '';
    if (searchParams && searchParams.get) {
      cityParam = (searchParams.get('city') || '').trim().toLowerCase();
    }
    if (!cityParam && typeof window !== 'undefined') {
      cityParam = cityFromPathname(window.location.pathname);
    }
    if (cityParam && PLAYABLE[cityParam]) {
      return { view: 'city', cityId: cityParam };
    }

    if (typeof window !== 'undefined' && isHomePath(window.location.pathname)) {
      return { view: 'hub', cityId: (save && save.lastCity) || 'hamburg' };
    }

    var view = 'hub';
    var cityId = 'hamburg';

    if (save) {
      view = getInitialViewFromSave(save);
      cityId = save.lastCity || 'hamburg';
    } else if (v1) {
      view = 'city';
      cityId = 'hamburg';
    }

    return { view: view, cityId: cityId };
  }

  window.kiezViewRouter = {
    SAVE_KEY: SAVE_KEY,
    PLAYABLE: PLAYABLE,
    hasV1Save: hasV1Save,
    hasProgressInSave: hasProgressInSave,
    getInitialViewFromSave: getInitialViewFromSave,
    loadSaveSnapshot: loadSaveSnapshot,
    cityFromPathname: cityFromPathname,
    isHomePath: isHomePath,
    resolveInitialView: resolveInitialView
  };
})();
