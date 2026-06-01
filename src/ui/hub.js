/* KiezQuiz — Städte-Hub (Vanilla JS) */
(function () {
  function progressRingHtml(pct, size, stroke) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const off = c - (pct / 100) * c;
    return `
      <div class="progress-ring" style="position:relative;width:${size}px;height:${size}px;flex-shrink:0">
        <svg width="${size}" height="${size}" style="transform:rotate(-90deg)">
          <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${stroke}"/>
          <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--acc)" stroke-width="${stroke}"
            stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="round"
            style="transition:stroke-dashoffset 0.6s ease;filter:drop-shadow(0 0 4px var(--acc-glow))"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;font-size:${size * 0.26}px;color:#fff">${pct}%</div>
      </div>`;
  }

  function levelBarHtml(label, tier, pct) {
    return `
      <div class="hub-level-bar">
        <div class="hub-level-bar-head">
          <span><span class="hub-level-tier">${tier}</span> · ${label}</span>
          <span class="hub-level-pct">${pct}%</span>
        </div>
        <div class="hub-level-track"><div class="hub-level-fill" style="width:${pct}%"></div></div>
      </div>`;
  }

  function getBranchState(game, cityId) {
    if (window.kiezProgress && window.kiezProgress.getBranchState) {
      return window.kiezProgress.getBranchState(game, cityId);
    }
    const branch = game._save?.cities?.[cityId];
    const progression = window.cityRegistry.getBezirkeProgression(cityId);
    const bezirkProgress = {};
    progression.forEach((bz) => {
      bezirkProgress[bz.name] = {
        solved: new Set(branch?.regionProgress?.[bz.name] || [])
      };
    });
    return {
      unlockedBezirkIndex: parseInt(branch?.unlockedRegionIndex, 10) || 0,
      bezirkProgress,
      trophies: new Set(branch?.trophies || [])
    };
  }

  function computeCityStats(game, city) {
    if (city.status !== 'playable') {
      return { completion: 0, trophies: { won: 0, total: city.totalTrophies || 0 }, levels: {} };
    }
    const progression = window.cityRegistry.getBezirkeProgression(city.id);
    const cityData = window[city.dataGlobal] || [];
    const state = getBranchState(game, city.id);
    let mastered = 0;
    let total = 0;
    const levels = {};

    city.levels.forEach((lv) => {
      if (lv.key === 'bezirke' || window.cityRegistry.levelKeyToSegment(lv.key) === 'BEZIRKE') {
        const unlocked = state.unlockedBezirkIndex + 1;
        const pct = Math.round((unlocked / lv.count) * 100);
        levels[lv.key] = pct;
        mastered += unlocked;
        total += lv.count;
      } else {
        let solved = 0;
        progression.forEach((bz) => {
          solved += state.bezirkProgress[bz.name]?.solved?.size || 0;
        });
        const pct = lv.count > 0 ? Math.round((solved / lv.count) * 100) : 0;
        levels[lv.key] = pct;
        mastered += solved;
        total += lv.count;
      }
    });

    const trophyTotal = typeof getTrophyCatalog === 'function'
      ? getTrophyCatalog(city.id).length
      : (city.totalTrophies || 0);
    return {
      completion: total ? Math.round((mastered / total) * 100) : 0,
      trophies: { won: state.trophies.size, total: trophyTotal },
      levels
    };
  }

  function renderHubHeader(game) {
    if (window.kiezGlobalHeader) return window.kiezGlobalHeader.renderHubHeader(game);
    return '';
  }

  function renderCityTile(city, stats, onEnter) {
    const loc = window.cityRegistry.localizeCity(city);
    const isComingSoon = city.status === 'coming_soon';
    const isFresh = stats.completion === 0;
    const cta = isComingSoon ? t('hub.comingSoon') : (isFresh ? t('hub.startCity') : t('hub.continueCity'));
    const badge = isComingSoon ? `<span class="badge coming-soon-badge">${t('hub.comingSoonBadge')}</span>` : '';

    const levelBars = loc.levels.map((lv) =>
      levelBarHtml(lv.label, lv.tier, stats.levels[lv.key] || 0)
    ).join('');

    const tileClass = ['city-tile', isFresh && !isComingSoon ? 'is-fresh' : '', isComingSoon ? 'is-coming-soon' : ''].filter(Boolean).join(' ');

    return `
      <button type="button" class="${tileClass}" data-city-id="${city.id}" data-playable="${city.status === 'playable'}" style="${Object.entries(window.cityRegistry.accentVars(city.hue)).map(([k, v]) => `${k}:${v}`).join(';')}">
        <div class="city-tile-head">
          ${isComingSoon ? `<div class="city-tile-soon-icon">🗺️</div>` : progressRingHtml(stats.completion, 62, 6)}
          <div class="city-tile-id">
            <div class="city-tile-name">${loc.name}${city.home ? `<span class="home-dot" title="${t('hub.homeCity')}">★</span>` : ''} ${badge}</div>
            <div class="city-tile-greet">${loc.greeting}</div>
            <div class="city-tile-blurb">${loc.blurb}</div>
          </div>
          ${!isComingSoon ? `<div class="city-tile-trophies" title="${t('hub.trophyHint')}"><span class="ctt-icon">🏆</span><span class="ctt-count">${stats.trophies.won}/${stats.trophies.total}</span></div>` : ''}
        </div>
        ${!isComingSoon ? `<div class="city-tile-levels">${levelBars}</div>` : `<p class="city-tile-soon-text">${t('hub.comingSoonHint')}</p>`}
        <div class="city-tile-cta ${isComingSoon ? 'is-disabled' : ''}">
          <span>${cta}</span>
          ${!isComingSoon ? '<span class="cta-arrow">→</span>' : ''}
        </div>
      </button>`;
  }

  function renderWishTile() {
    return `
      <button type="button" class="city-tile wish-tile" id="hub-wish-tile">
        <div class="wish-plus">＋</div>
        <div class="wish-title">${t('hub.wishTitle')}</div>
        <div class="wish-sub">${t('hub.wishSub')}</div>
      </button>`;
  }

  function render(game, container) {
    if (!container) return;
    const cities = window.cityRegistry.getAllCities();
    const tiles = cities.map((city) => {
      const stats = computeCityStats(game, city);
      return renderCityTile(city, stats);
    }).join('');

    container.innerHTML = `
      <div class="city-hub">
        ${renderHubHeader(game)}
        <div class="hub-intro">
          <h2>${t('hub.title')}</h2>
          <p>${t('hub.subtitle')}</p>
        </div>
        <div class="hub-tiles">${tiles}${renderWishTile()}</div>
      </div>`;

    container.querySelectorAll('.city-tile[data-city-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cityId = btn.dataset.cityId;
        const playable = btn.dataset.playable === 'true';
        if (!playable) {
          game.showComingSoonToast(cityId);
          return;
        }
        game.enterCity(cityId);
      });
    });

    const wishBtn = container.querySelector('#hub-wish-tile');
    if (wishBtn) {
      wishBtn.addEventListener('click', () => {
        const open = () => {
          if (window.kiezModals?.showWishModal) window.kiezModals.showWishModal();
        };
        if (typeof window.loadGameBundle === 'function') {
          window.loadGameBundle().then(open);
        } else {
          open();
        }
      });
    }

    const settingsBtn = container.querySelector('#hub-btn-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        const open = () => game.showSettings();
        if (typeof window.loadGameBundle === 'function') {
          window.loadGameBundle().then(open);
        } else {
          open();
        }
      });
    }

    const langBtn = container.querySelector('#hub-btn-lang');
    if (langBtn) {
      game.updateLangButton(langBtn);
      langBtn.addEventListener('click', () => {
        setLocale(getLocale() === 'de' ? 'en' : 'de');
      });
    }

    game.syncHubStats();
    if (typeof applyToDom === 'function') applyToDom(container);
    if (window.kiezChangelog?.bindTriggers) window.kiezChangelog.bindTriggers(container);
  }

  function updateStats(game) {
    const xpEl = document.getElementById('hub-stat-xp');
    const streakEl = document.getElementById('hub-stat-streak');
    if (xpEl) xpEl.textContent = game.xp;
    if (streakEl) streakEl.textContent = game.streak;
  }

  window.kiezHub = { render, updateStats, computeCityStats, progressRingHtml };
})();
