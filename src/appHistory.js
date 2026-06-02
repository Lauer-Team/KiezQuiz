/* KiezQuiz — SPA history so browser back returns to hub, not stray pages */
(function () {
  const KEY = 'kq';

  function state(view, cityId) {
    return { [KEY]: { view, cityId: cityId || null } };
  }

  function readState(ev) {
    const raw = (ev && ev.state) || window.history.state;
    return raw && raw[KEY] ? raw[KEY] : null;
  }

  function hubUrl() {
    const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    return path === '/' ? '/' : path;
  }

  function cityUrl(cityId) {
    return `/${cityId}/`;
  }

  function bind(game) {
    if (!game || window.__kqHistoryBound) return;
    window.__kqHistoryBound = true;

    const seed = readState();
    if (!seed) {
      const initial = game.view === 'city'
        ? state('city', game.activeCityId)
        : state('hub');
      const url = game.view === 'city' ? cityUrl(game.activeCityId) : hubUrl();
      window.history.replaceState(initial, '', url);
    }

    window.addEventListener('popstate', (ev) => {
      const st = readState(ev);
      if (!st) {
        if (game.view === 'city') game.showHub(false);
        return;
      }
      if (st.view === 'hub') {
        if (game.view !== 'hub') game.showHub(false);
        return;
      }
      if (st.view === 'city' && st.cityId) {
        if (game.view !== 'city' || game.activeCityId !== st.cityId) {
          game.enterCity(st.cityId, false);
        }
      }
    });
  }

  function onEnterCity(game, cityId, fromHub) {
    if (!window.history.pushState) return;
    const next = state('city', cityId);
    const url = cityUrl(cityId);
    if (fromHub) {
      window.history.pushState(next, '', url);
    } else if (game.view === 'city') {
      window.history.replaceState(next, '', url);
    }
  }

  function onShowHub() {
    if (!window.history.pushState) return;
    window.history.pushState(state('hub'), '', '/');
  }

  window.kiezAppHistory = { bind, onEnterCity, onShowHub, hubUrl, cityUrl };
})();
