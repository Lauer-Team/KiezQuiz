/* KiezQuiz — Landing / Hub (CI Redesign 2026 + legacy city tiles) */
(function () {
  const DTINTS = ['#FF5233', '#C6F24E', '#5AA9FF', '#9B7BFF', '#F4B53C', '#2BC4B4', '#FF8A5B', '#E36BA6'];
  const PREVIEW_DISTRICTS = {
    hamburg: ['Altona', 'Ottensen', 'St. Pauli', 'Eimsbüttel', 'Eppendorf', 'Winterhude', 'Barmbek', 'St. Georg', 'HafenCity', 'Wilhelmsburg', 'Blankenese', 'Harburg'],
    berlin: ['Mitte', 'Wedding', 'Pankow', 'Pr. Berg', 'Friedrichshain', 'Kreuzberg', 'Neukölln', 'Schöneberg', 'Charlottenburg', 'Tempelhof', 'Spandau', 'Lichtenberg'],
    frankfurt: ['Innenstadt', 'Bahnhofsv.', 'Gallus', 'Bockenheim', 'Westend', 'Nordend', 'Bornheim', 'Ostend', 'Sachsenh.', 'Niederrad', 'Höchst', 'Bergen'],
    europe: ['Paris', 'London', 'Berlin', 'Madrid', 'Rom', 'Wien', 'Amsterdam', 'Brüssel', 'Prag', 'Warschau', 'Stockholm', 'Oslo']
  };
  const PREVIEW_IDX = { hamburg: 4, berlin: 1, frankfurt: 6, europe: 2 };
  const PREVIEW_LAKE = { hamburg: true };
  const MAP_PREVIEW_CACHE = new Map();

  const HUB_SECTIONS = [
    { id: 'hub-spielmodi', navKey: 'hub.navModes' },
    { id: 'hub-staedte', navKey: 'hub.navCities' },
    { id: 'hub-bestenliste', navKey: 'hub.navLeaderboard' },
    { id: 'hub-ueber-uns', navKey: 'hub.navAbout' }
  ];

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function citySegmentCount(city) {
    if (!city?.levels?.length) return 0;
    return city.levels.reduce((sum, lv) => sum + (lv.count || 0), 0);
  }

  function totalSegmentCount(cities) {
    return cities.filter((c) => c.status === 'playable').reduce((sum, c) => sum + citySegmentCount(c), 0);
  }

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
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;font-size:${size * 0.26}px;color:var(--text-primary)">${pct}%</div>
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

  function previewMapHtml(cityId, activeIdx) {
    const districts = PREVIEW_DISTRICTS[cityId] || PREVIEW_DISTRICTS.hamburg;
    const idx = activeIdx ?? PREVIEW_IDX[cityId] ?? 4;
    const VX = [
      [[0, 0], [25, 2], [50, 0], [75, 3], [100, 0]],
      [[0, 20], [27, 17], [52, 23], [72, 18], [100, 21]],
      [[2, 43], [24, 46], [49, 41], [76, 46], [98, 43]],
      [[0, 66], [25, 66], [50, 66], [75, 66], [100, 66]]
    ];
    const cells = [];
    let n = 0;
    for (let r = 0; r < 3; r++) {
      for (let col = 0; col < 4; col++) {
        const p = [VX[r][col], VX[r][col + 1], VX[r + 1][col + 1], VX[r + 1][col]];
        const cx = (p[0][0] + p[1][0] + p[2][0] + p[3][0]) / 4;
        const cy = (p[0][1] + p[1][1] + p[2][1] + p[3][1]) / 4;
        cells.push({
          pts: p.map((q) => q.join(',')).join(' '),
          cx, cy, idx: n,
          tint: DTINTS[n % DTINTS.length],
          name: districts[n] || ''
        });
        n++;
      }
    }
    const act = cells[idx] || cells[0];
    const river = cityId === 'europe'
      ? 'M -4 38 C 20 32, 40 28, 60 34 C 80 40, 90 48, 104 42'
      : 'M -4 30 C 18 24, 30 40, 50 36 C 72 32, 84 50, 104 44';
    const cellPolys = cells.map((cl) =>
      `<polygon class="cell" points="${cl.pts}" fill="${cl.tint}" fill-opacity="${cl.idx === idx ? 0.34 : 0.17}" stroke="${cl.tint}" stroke-opacity="${cl.idx === idx ? 0.9 : 0.42}" stroke-width="0.5"/>`
    ).join('');
    const labels = cells.map((cl) =>
      `<text class="clabel" x="${cl.cx}" y="${cl.cy + 1}">${escapeHtml(cl.name)}</text>`
    ).join('');
    const lake = PREVIEW_LAKE[cityId]
      ? '<circle cx="40" cy="34" r="6.5" fill="#5AA9FF" fill-opacity="0.5" stroke="#5AA9FF" stroke-opacity="0.8" stroke-width="0.5"/>'
      : '';

    return `
      <div class="kq-map hub-map-preview" data-preview-city="${cityId}">
        <svg class="field" viewBox="0 0 100 66" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <g class="topo" stroke="var(--line)" fill="none" opacity=".35" stroke-width="0.4">
            <path d="M10 8 C 30 14, 26 30, 44 30 C 64 30, 60 12, 86 18"/>
            <path d="M8 54 C 28 50, 34 62, 56 56 C 76 51, 80 60, 96 56"/>
          </g>
          ${cellPolys}
          ${labels}
          <path class="water" d="${river}" fill="none" stroke="#5AA9FF" stroke-opacity="0.55" stroke-width="3.4" stroke-linecap="round"/>
          <path class="water" d="${river}" fill="none" stroke="#5AA9FF" stroke-opacity="0.9" stroke-width="1.1" stroke-linecap="round"/>
          ${lake}
          <circle class="pulse" cx="${act.cx}" cy="${act.cy}" r="4" fill="#FF5233" fill-opacity="0.5"/>
          <g class="actpin blink" transform="translate(${act.cx - 2.6} ${act.cy - 6}) scale(0.052)">
            <path fill="#FF5233" fill-rule="evenodd" d="M50 4 C25.7 4 6 23.7 6 48 C6 80 50 120 50 120 C50 120 94 80 94 48 C94 23.7 74.3 4 50 4 Z M50 30 C40 30 31.9 38.1 31.9 48.1 C31.9 58.1 40 66.2 50 66.2 C60 66.2 68.1 58.1 68.1 48.1 C68.1 38.1 60 30 50 30 Z"/>
            <line x1="54" y1="50" x2="73" y2="69" stroke="#FF5233" stroke-width="13.5" stroke-linecap="round"/>
          </g>
        </svg>
        <div class="kq-maptag"><span class="kq-pill"><span class="dot" style="background:var(--signal)"></span><span class="hub-map-tag-label"></span></span></div>
        <div class="kq-legend" aria-hidden="true">
          <span class="lg"><i style="background:#FF5233"></i>${escapeHtml(t('hub.mapLegendLearned'))}</span>
          <span class="lg"><i style="background:#5AA9FF"></i>${escapeHtml(t('hub.mapLegendOpen'))}</span>
          <span class="lg"><i style="background:#C6F24E"></i>${escapeHtml(t('hub.mapLegendStreak'))}</span>
        </div>
      </div>`;
  }

  function mapPreviewChrome(cityId) {
    const loc = window.cityRegistry.localizeCity(window.cityRegistry.getCity(cityId));
    const name = loc?.name || cityId;
    return `
      <div class="kq-maptag"><span class="kq-pill"><span class="dot" style="background:var(--signal)"></span><span class="hub-map-tag-label">${escapeHtml(name)}</span></span></div>
      <div class="kq-legend" aria-hidden="true">
        <span class="lg"><i style="background:#FF5233"></i>${escapeHtml(t('hub.mapLegendLearned'))}</span>
        <span class="lg"><i style="background:#5AA9FF"></i>${escapeHtml(t('hub.mapLegendOpen'))}</span>
        <span class="lg"><i style="background:#C6F24E"></i>${escapeHtml(t('hub.mapLegendStreak'))}</span>
      </div>`;
  }

  async function setMapPreview(frame, cityId) {
    if (!frame) return;
    const city = window.cityRegistry.getCity(cityId);
    const url = window.cityRegistry.resolveMapSvgUrl(city?.mapSvg);
    frame.dataset.previewCity = cityId;

    if (!url) {
      frame.innerHTML = previewMapHtml(cityId, PREVIEW_IDX[cityId] ?? 4);
      return;
    }

    frame.innerHTML = `<div class="kq-map hub-map-preview hub-map-live" data-preview-city="${cityId}"><p class="hub-map-loading mono">${escapeHtml(t('hub.mapLoading'))}</p></div>`;

    try {
      if (!MAP_PREVIEW_CACHE.has(url)) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('map fetch failed');
        MAP_PREVIEW_CACHE.set(url, await resp.text());
      }
      if (frame.dataset.previewCity !== cityId) return;

      const temp = document.createElement('div');
      temp.innerHTML = MAP_PREVIEW_CACHE.get(url).trim();
      const svg = temp.querySelector('svg');
      const wrap = document.createElement('div');
      wrap.className = 'kq-map hub-map-preview hub-map-live';
      wrap.dataset.previewCity = cityId;
      if (svg) {
        svg.classList.add('hub-preview-svg');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svg.setAttribute('aria-hidden', 'true');
        wrap.appendChild(svg);
      } else {
        wrap.innerHTML = previewMapHtml(cityId, PREVIEW_IDX[cityId] ?? 4).trim();
        frame.innerHTML = wrap.outerHTML;
        return;
      }
      wrap.insertAdjacentHTML('beforeend', mapPreviewChrome(cityId));
      frame.innerHTML = '';
      frame.appendChild(wrap);
    } catch (_err) {
      if (frame.dataset.previewCity !== cityId) return;
      frame.innerHTML = previewMapHtml(cityId, PREVIEW_IDX[cityId] ?? 4);
    }
  }

  function cityTabsHtml(cities, activeId) {
    const playable = cities.filter((c) => c.status === 'playable');
    return `<div class="kq-cities hub-city-tabs" role="tablist">${playable.map((c) => {
      const loc = window.cityRegistry.localizeCity(c);
      const n = citySegmentCount(c);
      return `<button type="button" class="kq-citytab${c.id === activeId ? ' on' : ''}" data-hub-city="${c.id}" role="tab" aria-selected="${c.id === activeId}">
        ${escapeHtml(loc.name)}<span class="n">${n}</span>
      </button>`;
    }).join('')}</div>`;
  }

  function modesStripHtml() {
    const modes = [
      { id: 'EXPLORER', labelKey: 'modes.explorer.label', descKey: 'modes.explorer.desc' },
      { id: 'LOCATE', labelKey: 'modes.locate.label', descKey: 'modes.locate.desc' },
      { id: 'QUIZ', labelKey: 'modes.quiz.label', descKey: 'modes.quiz.desc' },
      { id: 'TYPE_NAME', labelKey: 'modes.typeName.label', descKey: 'modes.typeName.desc' },
      { id: 'NAME_ALL', labelKey: 'modes.nameAll.label', descKey: 'modes.nameAll.desc' }
    ];
    const icons = window.kiezIcons?.ModeIcon || {};
    return modes.map((m) => `
      <div class="kq-mode hub-mode-card">
        <span class="mi" style="color:var(--signal)">${icons[m.id] || ''}</span>
        <span>
          <span class="mt">${escapeHtml(t(m.labelKey))}</span>
          <span class="md">${escapeHtml(t(m.descKey))}</span>
        </span>
      </div>`).join('');
  }

  function renderCityTile(city, stats) {
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
          ${isComingSoon ? '<div class="city-tile-soon-icon">🗺️</div>' : progressRingHtml(stats.completion, 62, 6)}
          <div class="city-tile-id">
            <div class="city-tile-name">${loc.name}${city.home ? `<span class="home-dot" title="${escapeHtml(t('hub.homeCity'))}">★</span>` : ''} ${badge}</div>
            <div class="city-tile-greet">${loc.greeting}</div>
            <div class="city-tile-blurb">${loc.blurb}</div>
          </div>
          ${!isComingSoon ? `<div class="city-tile-trophies" title="${escapeHtml(t('hub.trophyHint'))}"><span class="ctt-icon">🏆</span><span class="ctt-count">${stats.trophies.won}/${stats.trophies.total}</span></div>` : ''}
        </div>
        ${!isComingSoon ? `<div class="city-tile-levels">${levelBars}</div>` : `<p class="city-tile-soon-text">${escapeHtml(t('hub.comingSoonHint'))}</p>`}
        <div class="city-tile-cta ${isComingSoon ? 'is-disabled' : ''}">
          <span>${cta}</span>
          ${!isComingSoon ? '<span class="cta-arrow">→</span>' : ''}
        </div>
      </button>`;
  }

  function renderWishTile() {
    return `
      <button type="button" class="city-tile wish-tile" id="hub-wish-tile-cards">
        <div class="wish-plus">＋</div>
        <div class="wish-title">${escapeHtml(t('hub.wishTitle'))}</div>
        <div class="wish-sub">${escapeHtml(t('hub.wishSub'))}</div>
      </button>`;
  }

  function guideSectionHtml() {
    const steps = [
      'hub.guideStep1', 'hub.guideStep2', 'hub.guideStep3', 'hub.guideStep4',
      'hub.guideStep5', 'hub.guideStep6', 'hub.guideStep7', 'hub.guideStep8'
    ];
    return `
      <section class="hub-landing-section hub-section-guide hub-section-bleed" id="hub-spielanleitung">
        <div class="hub-section-bleed-inner">
          <div class="hub-section-head">
            <span class="hub-section-eyebrow mono">${escapeHtml(t('hub.sectionGuideKicker'))}</span>
            <h3>${escapeHtml(t('hub.guideTitle'))}</h3>
          </div>
          <p class="hub-section-lead">${escapeHtml(t('hub.guideLead'))}</p>
          <div class="hub-guide-steps kq-card hub-section-pill">${steps.map((key, i) => {
            const parts = t(key).split(' — ');
            const title = parts[0] || t(key);
            const body = parts.slice(1).join(' — ') || '';
            return `<div class="hub-guide-step kq-card"><span class="hub-step-num mono">${i + 1}</span><div><strong>${escapeHtml(title)}</strong>${body ? `<span>${escapeHtml(body)}</span>` : ''}</div></div>`;
          }).join('')}</div>
        </div>
      </section>`;
  }

  function leaderboardSectionHtml() {
    const perks = ['hub.leaderboardPerk1', 'hub.leaderboardPerk2', 'hub.leaderboardPerk3'];
    return `
      <section class="hub-landing-section hub-section-leaderboard hub-section-bleed" id="hub-bestenliste">
        <div class="hub-section-panel kq-card hub-section-bleed-inner hub-section-pill">
          <div class="hub-section-head">
            <span class="hub-section-eyebrow mono">${escapeHtml(t('hub.sectionLbKicker'))}</span>
            <h3>${escapeHtml(t('hub.navLeaderboard'))}</h3>
          </div>
          <p class="hub-section-lead">${escapeHtml(t('hub.leaderboardLead'))}</p>
          <ul class="hub-perk-list">${perks.map((k) => `<li>${escapeHtml(t(k))}</li>`).join('')}</ul>
          <a href="/profile/" class="kq-btn sig sm">${escapeHtml(t('header.profileLink'))} →</a>
        </div>
      </section>`;
  }

  function aboutSectionHtml() {
    return `
      <section class="hub-landing-section hub-section-about hub-section-bleed" id="hub-ueber-uns">
        <div class="hub-about-unified kq-card hub-section-bleed-inner hub-section-pill">
          <div class="hub-about-grid">
            <div class="hub-about-copy">
              <div class="hub-section-head">
                <span class="hub-section-eyebrow mono">${escapeHtml(t('hub.sectionAboutKicker'))}</span>
                <h3>${escapeHtml(t('hub.navAbout'))}</h3>
              </div>
              <p class="hub-section-lead">${escapeHtml(t('aboutPage.whatBody'))}</p>
              <p class="hub-about-kalle-line"><strong>${escapeHtml(t('aboutPage.kalleIntro'))}</strong> ${escapeHtml(t('aboutPage.kalleBody1'))}</p>
              <a href="/about/" class="kq-btn ghost sm">${escapeHtml(t('footer.about'))} →</a>
            </div>
            <div class="hub-about-visual" aria-hidden="true">
              <img class="hub-about-kalle" src="assets/brand/mascot/kalle-about.png" width="420" height="420" alt="">
            </div>
          </div>
        </div>
      </section>`;
  }

  function extraSectionsHtml(game, cities) {
    const tiles = cities.map((city) => renderCityTile(city, computeCityStats(game, city))).join('');
    return `
      <section class="hub-landing-section" id="hub-staedte">
        <h3>${escapeHtml(t('hub.citiesSectionTitle'))}</h3>
        <p class="hub-section-lead">${escapeHtml(t('hub.citiesSectionLead'))}</p>
        <div class="hub-tiles">${tiles}${renderWishTile()}</div>
      </section>
      ${guideSectionHtml()}
      ${leaderboardSectionHtml()}
      ${aboutSectionHtml()}`;
  }

  function hubNavHref(sectionId) {
    const onHub = window.location.pathname === '/' || window.location.pathname.endsWith('/index.html');
    return onHub ? `#${sectionId}` : `/#${sectionId}`;
  }

  function shouldShowDashboardLink() {
    if (/^\/profile\/?/.test(window.location.pathname)) return false;
    if (window.authManager?.isLoggedIn?.()) return true;
    try {
      const save = window.saveManager?.loadSave?.();
      return !!(save && window.saveManager?.hasAnyProgress?.(save));
    } catch (e) {
      return false;
    }
  }

  function dashboardNavLinkHtml() {
    if (!shouldShowDashboardLink()) return '';
    const label = escapeHtml(t('header.dashboardLink'));
    const title = escapeHtml(t('header.dashboardTitle'));
    return `<a href="/profile/" class="hub-nav-dashboard" data-i18n="header.dashboardLink" title="${title}" data-i18n-title="header.dashboardTitle">${label}</a>`;
  }

  function renderHubNav(opts = {}) {
    const nav = document.getElementById('header-hub-nav');
    if (!nav) return;
    const useHomeLinks = opts.homeLinks === true;
    nav.hidden = false;
    const sectionLinks = HUB_SECTIONS.map((s) => {
      const href = hubNavHref(s.id);
      if (useHomeLinks) {
        return `<a href="${href}">${escapeHtml(t(s.navKey))}</a>`;
      }
      return `<a href="${href}" data-hub-scroll="${s.id}">${escapeHtml(t(s.navKey))}</a>`;
    }).join('');
    nav.innerHTML = sectionLinks + dashboardNavLinkHtml();
    if (useHomeLinks) return;
    if (nav.dataset.bound !== 'true') {
      nav.dataset.bound = 'true';
      nav.addEventListener('click', (e) => {
        const link = e.target.closest('[data-hub-scroll]');
        if (!link) return;
        e.preventDefault();
        scrollToSection(link.dataset.hubScroll);
      });
    }
  }

  function hideHubNav() {
    const nav = document.getElementById('header-hub-nav');
    if (nav) {
      nav.hidden = true;
      nav.innerHTML = '';
    }
  }

  function bindLandingInteractions(container, game) {
    let activeCity = game.activeCityId || game._save?.lastCity || 'hamburg';
    const cities = window.cityRegistry.getAllCities().filter((c) => c.status === 'playable');
    if (!cities.find((c) => c.id === activeCity)) activeCity = cities[0]?.id || 'hamburg';

    function updatePreview(cityId) {
      activeCity = cityId;
      const loc = window.cityRegistry.localizeCity(window.cityRegistry.getCity(cityId));
      const frame = container.querySelector('.hub-map-frame');
      void setMapPreview(frame, cityId);
      container.querySelectorAll('[data-hub-city]').forEach((btn) => {
        btn.classList.toggle('on', btn.dataset.hubCity === cityId);
        btn.setAttribute('aria-selected', btn.dataset.hubCity === cityId ? 'true' : 'false');
      });
      const lead = container.querySelector('[data-hub-lead-count]');
      const leadCity = container.querySelector('[data-hub-lead-city]');
      const city = window.cityRegistry.getCity(cityId);
      if (lead) lead.textContent = String(citySegmentCount(city));
      if (leadCity) leadCity.textContent = loc?.name || cityId;
    }

    if (container.dataset.hubLandingBound !== 'true') {
      container.dataset.hubLandingBound = 'true';
      container.addEventListener('click', (e) => {
        const cityTab = e.target.closest('[data-hub-city]');
        if (cityTab) {
          e.preventDefault();
          updatePreview(cityTab.dataset.hubCity);
          return;
        }
        const howBtn = e.target.closest('#hub-about-btn');
        if (howBtn) {
          e.preventDefault();
          scrollToSection('hub-spielanleitung');
          return;
        }
        const playBtn = e.target.closest('#hub-play-btn, #hub-wisch-los');
        if (playBtn) {
          const city = window.cityRegistry.getCity(activeCity);
          if (city?.status === 'playable') game.enterCity(activeCity);
          else game.showComingSoonToast(activeCity);
          return;
        }
        const wishBtn = e.target.closest('#hub-wish-tile, #hub-wish-tile-cards');
        if (wishBtn) {
          const open = () => window.kiezModals?.showWishModal?.();
          if (typeof window.loadGameBundle === 'function') window.loadGameBundle().then(open);
          else open();
          return;
        }
        const tile = e.target.closest('.city-tile[data-city-id]');
        if (tile) {
          const cityId = tile.dataset.cityId;
          if (tile.dataset.playable !== 'true') {
            game.showComingSoonToast(cityId);
            return;
          }
          game.enterCity(cityId);
        }
      });
    }

    updatePreview(activeCity);
  }

  function render(game, container) {
    if (!container) return;
    const cities = window.cityRegistry.getAllCities();
    const playable = cities.filter((c) => c.status === 'playable');
    const defaultCity = game.activeCityId || game._save?.lastCity || playable[0]?.id || 'hamburg';
    const loc = window.cityRegistry.localizeCity(window.cityRegistry.getCity(defaultCity));
    const segCount = citySegmentCount(window.cityRegistry.getCity(defaultCity));
    const totalSegs = totalSegmentCount(cities);
    const cityCount = playable.length;
    const playIcon = window.kiezIcons?.Ico?.play || '';

    container.innerHTML = `
      <div class="hub-landing" data-hub-shell="live">
        <div class="hub-landing-hero">
          <div class="hub-landing-copy">
            <span class="eyebrow">${escapeHtml(t('hub.landingEyebrow'))}</span>
            <h2>${escapeHtml(t('hub.landingHeadline'))}</h2>
            <p class="hub-landing-claim">${escapeHtml(t('hub.landingClaim'))}</p>
            <p class="hub-landing-lead"><span data-i18n="hub.landingLeadIntro">${escapeHtml(t('hub.landingLeadIntro'))}</span> <strong data-hub-lead-count>${segCount}</strong> <span data-i18n="hub.landingLeadMid">${escapeHtml(t('hub.landingLeadMid'))}</span> <strong data-hub-lead-city>${escapeHtml(loc?.name || '')}</strong>. <span data-i18n="hub.landingLeadOutro">${escapeHtml(t('hub.landingLeadOutro'))}</span></p>
            <div class="hub-landing-actions">
              <button type="button" class="kq-btn sig" id="hub-play-btn">${playIcon}<span>${escapeHtml(t('hub.landingPlay'))}</span></button>
              <button type="button" class="kq-btn ghost" id="hub-about-btn">${escapeHtml(t('hub.landingHow'))}</button>
            </div>
            <div class="hub-landing-picker">
              <div class="hub-landing-picker-label">${escapeHtml(t('hub.landingPickCity'))}</div>
              ${cityTabsHtml(cities, defaultCity)}
            </div>
            <div class="hub-landing-meta">
              <span>${totalSegs} ${escapeHtml(t('hub.landingMetaSegments'))}</span>
              <span class="hub-landing-meta-sep">·</span>
              <span>${cityCount} ${escapeHtml(t('hub.landingMetaCities'))}</span>
              <span class="hub-landing-meta-sep">·</span>
              <span>${escapeHtml(t('hub.landingMetaFree'))}</span>
            </div>
          </div>
          <div class="hub-landing-visual">
            <div class="hub-map-frame">${previewMapHtml(defaultCity, PREVIEW_IDX[defaultCity] ?? 4)}</div>
            <div class="kq-card hub-xp-float">
              <span class="kq-stat" style="border:none;padding:0">
                <span class="ic" style="background:color-mix(in srgb,var(--strom) 20%,transparent);color:var(--strom)">${window.kiezIcons?.Ico?.bolt || ''}</span>
                <span class="lv"><span class="v">${escapeHtml(t('hub.landingXpHint'))}</span><span class="l">${escapeHtml(t('hub.landingXpSub'))}</span></span>
              </span>
            </div>
          </div>
        </div>
        <div class="hub-modes-strip" id="hub-spielmodi">
          <div class="hub-modes-head">
            <h3>${escapeHtml(t('hub.landingModesTitle'))}</h3>
            <button type="button" class="hub-wisch-los mono" id="hub-wisch-los">${escapeHtml(t('hub.landingModesKicker'))}</button>
          </div>
          <div class="hub-modes-grid">${modesStripHtml()}</div>
        </div>
        ${extraSectionsHtml(game, cities)}
      </div>`;

    const frame = container.querySelector('.hub-map-frame');
    void setMapPreview(frame, defaultCity);

    bindLandingInteractions(container, game);
    window.kiezHubScrollTop?.bind?.();
    window.kiezHubScrollTop?.syncVisibility?.();
    renderHubNav();

    game.updateLangButton();

    document.querySelector('.app-shell')?.classList.add('view-hub');
    document.querySelector('.app-shell')?.classList.remove('view-city');
    game.renderStats();
    window.kiezGlobalHeader?.sync?.(game);
    if (typeof applyToDom === 'function') applyToDom(container);
    window.kiezChangelog?.bindTriggers?.(container);
  }

  function computeCityStats(game, city) {
    if (window.kiezProgress?.getBranchState) {
      const progression = window.cityRegistry.getBezirkeProgression(city.id);
      const state = window.kiezProgress.getBranchState(game, city.id);
      let mastered = 0;
      let total = 0;
      const levels = {};
      city.levels.forEach((lv) => {
        if (lv.key === 'bezirke' || window.cityRegistry.levelKeyToSegment(lv.key) === 'BEZIRKE') {
          const unlocked = state.unlockedBezirkIndex + 1;
          levels[lv.key] = Math.round((unlocked / lv.count) * 100);
          mastered += unlocked;
          total += lv.count;
        } else {
          let solved = 0;
          progression.forEach((bz) => { solved += state.bezirkProgress[bz.name]?.solved?.size || 0; });
          levels[lv.key] = lv.count > 0 ? Math.round((solved / lv.count) * 100) : 0;
          mastered += solved;
          total += lv.count;
        }
      });
      const trophyTotal = typeof getTrophyCatalog === 'function' ? getTrophyCatalog(city.id).length : (city.totalTrophies || 0);
      return { completion: total ? Math.round((mastered / total) * 100) : 0, trophies: { won: state.trophies.size, total: trophyTotal }, levels };
    }
    return { completion: 0, trophies: { won: 0, total: city.totalTrophies || 0 }, levels: {} };
  }

  function updateStats() { /* stats via game.renderStats */ }

  function refreshHubNav() {
    const nav = document.getElementById('header-hub-nav');
    if (!nav || nav.hidden) return;
    const game = window.kiezQuizGame || window.hamburgGame;
    const onGameHub = game?.view === 'hub';
    renderHubNav(onGameHub ? {} : { homeLinks: true });
  }

  window.kiezHub = {
    render,
    updateStats,
    computeCityStats,
    progressRingHtml,
    hideHubNav,
    renderHubNav,
    refreshHubNav,
    scrollToSection
  };
})();
