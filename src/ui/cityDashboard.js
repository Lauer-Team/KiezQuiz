/* KiezQuiz — City dashboard: context bar, switcher, breadcrumb */
(function () {
  let switcherOpen = false;

  function getModeLabelForBreadcrumb(game) {
    const city = window.cityRegistry.getCity(game.activeCityId);
    const levelKey = window.cityRegistry.segmentToLevelKey(game.activeSegment, game.activeCityId);
    const level = city?.levels.find((l) => l.key === levelKey) || city?.levels[0];
    const singular = level ? t(level.singularKey) : t('cities.hamburg.singular.stadtteil');
    if (game.currentMode === 'LOCATE') {
      return game.activeSegment === 'BEZIRKE' ? t('modes.LOCATE_BEZIRKE') : t('modes.LOCATE');
    }
    return t(`modes.${game.currentMode}`) || game.currentMode;
  }

  function renderContextBar(game, container) {
    if (!container) return;
    const city = window.cityRegistry.localizeCity(window.cityRegistry.getCity(game.activeCityId));
    if (!city) return;

    const levelKey = window.cityRegistry.segmentToLevelKey(game.activeSegment, game.activeCityId);
    const level = city.levels.find((l) => l.key === levelKey) || city.levels[0];
    const modeLabel = getModeLabelForBreadcrumb(game);
    const cities = window.cityRegistry.getAllCities();

    const switcherItems = cities.map((c) => {
      const loc = window.cityRegistry.localizeCity(c);
      const stats = window.kiezHub?.computeCityStats(game, c);
      const pct = stats?.completion ?? 0;
      const soon = c.status === 'coming_soon' ? ` · ${t('hub.comingSoonBadge')}` : '';
      return `
        <button type="button" class="city-switcher-item${c.id === game.activeCityId ? ' active' : ''}${c.status === 'coming_soon' ? ' is-soon' : ''}"
          data-switch-city="${c.id}" data-playable="${c.status === 'playable'}"
          style="${Object.entries(window.cityRegistry.accentVars(c.hue)).map(([k, v]) => `${k}:${v}`).join(';')}">
          <span class="csi-dot"></span>
          <span class="csi-name">${loc.name}${soon}</span>
          <span class="csi-meta">${c.status === 'playable' ? `${pct}%` : '—'}</span>
          ${c.id === game.activeCityId ? '<span class="csi-check">✓</span>' : ''}
        </button>`;
    }).join('');

    container.innerHTML = `
      <div class="city-context-bar" id="city-context-bar-inner">
        <div class="ccb-left">
          <button type="button" class="ccb-hub-btn" id="btn-back-hub" title="${t('hub.backToHub')}">
            <span style="font-size:1rem">◀</span> ${t('hub.citiesNav')}
          </button>
          <div class="ccb-switch-wrap">
            <button type="button" class="city-pill" id="btn-city-switcher">
              <span class="city-pill-dot"></span>
              <span class="city-pill-name">${city.name}</span>
              <span class="city-pill-greet">${city.greeting}</span>
              <span class="city-pill-chev" id="city-pill-chev" style="transform:${switcherOpen ? 'rotate(180deg)' : 'none'}">▾</span>
            </button>
            <div class="city-switcher${switcherOpen ? ' is-open' : ''}" id="city-switcher-menu" ${switcherOpen ? '' : 'hidden'}>
              <div class="city-switcher-title">${t('hub.switchCity')}</div>
              ${switcherItems}
              <button type="button" class="city-switcher-hub" id="btn-switcher-hub">${t('hub.viewAllCities')}</button>
            </div>
          </div>
        </div>
        <div class="ccb-breadcrumb" id="city-breadcrumb">
          <span class="bc-step bc-city">${city.name}</span>
          <span class="bc-sep">›</span>
          <span class="bc-step bc-level"><span class="bc-tier">${level.tier}</span> ${level.label}</span>
          <span class="bc-sep">›</span>
          <span class="bc-step bc-mode">${modeLabel}</span>
        </div>
      </div>`;

    window.cityRegistry.applyAccentVars(container.querySelector('.city-context-bar'), city.hue);

    container.querySelector('#btn-back-hub')?.addEventListener('click', () => game.showHub());
    container.querySelector('#btn-switcher-hub')?.addEventListener('click', () => {
      switcherOpen = false;
      game.showHub();
    });

    const pill = container.querySelector('#btn-city-switcher');
    pill?.addEventListener('click', (e) => {
      e.stopPropagation();
      switcherOpen = !switcherOpen;
      renderContextBar(game, container);
    });

    container.querySelectorAll('[data-switch-city]').forEach((btn) => {
      btn.addEventListener('click', () => {
        switcherOpen = false;
        const id = btn.dataset.switchCity;
        if (btn.dataset.playable !== 'true') {
          game.showComingSoonToast(id);
          return;
        }
        if (id !== game.activeCityId) game.enterCity(id);
      });
    });
  }

  function updateBreadcrumb(game) {
    const bc = document.getElementById('city-breadcrumb');
    if (!bc) return;
    const city = window.cityRegistry.localizeCity(window.cityRegistry.getCity(game.activeCityId));
    const levelKey = window.cityRegistry.segmentToLevelKey(game.activeSegment, game.activeCityId);
    const level = city.levels.find((l) => l.key === levelKey) || city.levels[0];
    const modeLabel = getModeLabelForBreadcrumb(game);
    bc.innerHTML = `
      <span class="bc-step bc-city">${city.name}</span>
      <span class="bc-sep">›</span>
      <span class="bc-step bc-level"><span class="bc-tier">${level.tier}</span> ${level.label}</span>
      <span class="bc-sep">›</span>
      <span class="bc-step bc-mode">${modeLabel}</span>`;
  }

  function closeSwitcher() {
    switcherOpen = false;
    const menu = document.getElementById('city-switcher-menu');
    if (menu) menu.hidden = true;
  }

  document.addEventListener('click', (e) => {
    if (!switcherOpen) return;
    if (e.target.closest('.ccb-switch-wrap')) return;
    switcherOpen = false;
    const menu = document.getElementById('city-switcher-menu');
    if (menu) menu.hidden = true;
    const chev = document.getElementById('city-pill-chev');
    if (chev) chev.style.transform = 'none';
  });

  function enhanceSegmentSelector() {
    const selector = document.querySelector('#city-view .segment-selector');
    if (!selector || selector.dataset.adaptive === 'true') return;

    const game = window.hamburgGame || window.kiezQuizGame;
    if (!game) return;
    const city = window.cityRegistry.localizeCity(window.cityRegistry.getCity(game.activeCityId));
    if (!city) return;

    selector.classList.add('adaptive');
    selector.dataset.adaptive = 'true';
    selector.dataset.bound = 'false';
    selector.innerHTML = city.levels.map((lv, i) => {
      const segment = window.cityRegistry.levelKeyToSegment(lv.key);
      const active = game.activeSegment === segment ? ' active' : '';
      const btnId = segment === 'STADTTEILE' ? 'btn-segment-stadtteile' : 'btn-segment-bezirke';
      return `
        <button type="button" class="segment-btn${active}" id="${btnId}" data-segment="${segment}">
          <span class="seg-num">${i + 1}</span>
          <span class="seg-text">
            <span class="seg-tier">${lv.tier}</span>
            <span class="seg-label">${lv.label}</span>
          </span>
          <span class="seg-count">${lv.count}</span>
        </button>`;
    }).join('');
  }

  window.kiezCityDashboard = {
    renderContextBar,
    updateBreadcrumb,
    closeSwitcher,
    enhanceSegmentSelector
  };
})();
