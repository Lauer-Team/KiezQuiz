/* KiezQuiz — sync view before paint (SEO hub vs. resume city). No save writes. */
(function () {
  var SAVE_KEY = 'kiezquiz_save_v2';
  var PLAYABLE = { hamburg: true, berlin: true, frankfurt: true };

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

  function applyView() {
    var hub = document.getElementById('hub-view');
    var city = document.getElementById('city-view');
    if (!hub || !city) return;

    var params = new URLSearchParams(window.location.search);
    var cityParam = (params.get('city') || '').trim().toLowerCase();

    if (cityParam && PLAYABLE[cityParam]) {
      hub.hidden = true;
      city.hidden = false;
      city.dataset.city = cityParam;
      return;
    }

    var save = loadSaveSnapshot();
    var view = 'hub';
    var lastCity = 'hamburg';

    if (save) {
      view = getInitialViewFromSave(save);
      lastCity = save.lastCity || 'hamburg';
    } else if (hasV1Save()) {
      view = 'city';
      lastCity = 'hamburg';
    }

    if (view === 'city') {
      hub.hidden = true;
      city.hidden = false;
      city.dataset.city = lastCity;
    } else {
      hub.hidden = false;
      city.hidden = true;
    }
  }

  if (document.getElementById('hub-view')) {
    applyView();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyView);
  } else {
    applyView();
  }
})();
