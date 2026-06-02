/* KiezQuiz — shared app header (#app-header): hub vs. city chrome */
(function () {
  let xpPopoverEl = null;
  let xpBound = false;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function closeXpPopover() {
    if (!xpPopoverEl) return;
    xpPopoverEl.remove();
    xpPopoverEl = null;
    document.getElementById('btn-xp-pill')?.setAttribute('aria-expanded', 'false');
  }

  function buildGlobalProgressHtml(game) {
    if (typeof game.renderRankLadderHtml === 'function') {
      return game.renderRankLadderHtml();
    }
    const { currentRank, nextRank, percent } = game.getRankProgressInfo();
    const progressNote = nextRank
      ? t('ranks.progressTo', { percent: Math.round(percent), name: nextRank.name, xp: nextRank.minXp })
      : t('ranks.maxReached');
    return `
      <p class="log-rank-current"><strong>${escapeHtml(currentRank.name)}</strong> · ${game.xp} XP</p>
      <div class="rank-xp-bar"><div class="rank-xp-bar-fill" style="width:${percent}%"></div></div>
      <p class="log-rank-progress-note">${escapeHtml(progressNote)}</p>`;
  }

  function showXpPopover(game, anchor) {
    closeXpPopover();
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const pop = document.createElement('div');
    pop.className = 'xp-global-popover';
    pop.id = 'xp-global-popover';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', t('header.globalRankLabel'));
    pop.innerHTML = `
      <button type="button" class="xp-global-popover-x" aria-label="${escapeHtml(t('log.close'))}">✕</button>
      <div class="xp-global-popover-head">
        <span class="log-zone-tag global">${escapeHtml(t('log.zoneGlobal'))}</span>
        <span class="log-zone-note">${escapeHtml(t('log.zoneGlobalNote'))}</span>
      </div>
      ${buildGlobalProgressHtml(game)}
      <a href="/profile/" class="xp-global-popover-profile">${escapeHtml(t('header.profileLink'))} →</a>`;

    document.body.appendChild(pop);
    xpPopoverEl = pop;

    const popRect = pop.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - popRect.width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - popRect.width - 12));
    const top = rect.bottom + 10;
    pop.style.left = `${left}px`;
    pop.style.top = `${Math.min(top, window.innerHeight - popRect.height - 12)}px`;

    anchor.setAttribute('aria-expanded', 'true');
    pop.querySelector('.xp-global-popover-x')?.addEventListener('click', closeXpPopover);
  }

  function bindXpPill(game) {
    const xpPill = document.getElementById('btn-xp-pill');
    if (!xpPill || xpBound) return;
    xpBound = true;

    xpPill.addEventListener('click', (e) => {
      const g = window.kiezQuizGame || window.hamburgGame || game;
      if (g.view !== 'hub') {
        e.preventDefault();
        window.location.assign('/profile/');
        return;
      }
      e.preventDefault();
      if (xpPopoverEl) {
        closeXpPopover();
        return;
      }
      showXpPopover(g, xpPill);
    });
  }

  function citySegmentCount(city) {
    if (!city?.levels?.length) return 0;
    return city.levels.reduce((sum, lv) => sum + (lv.count || 0), 0);
  }

  let headerCityMenuOpen = false;

  function closeHeaderCityMenu() {
    headerCityMenuOpen = false;
    const menu = document.getElementById('header-city-menu');
    const toggle = document.getElementById('header-city-toggle');
    if (menu) menu.hidden = true;
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function renderCityTabs(game) {
    const slot = document.getElementById('header-city-tabs');
    if (!slot) return;
    if (game.view !== 'city') {
      slot.hidden = true;
      slot.innerHTML = '';
      closeHeaderCityMenu();
      return;
    }

    const current = window.cityRegistry.localizeCity(window.cityRegistry.getCity(game.activeCityId));
    if (!current) {
      slot.hidden = true;
      slot.innerHTML = '';
      return;
    }

    slot.hidden = false;
    const cities = window.cityRegistry.getAllCities().filter((c) => c.status === 'playable');
    const menuItems = cities.map((c) => {
      const loc = window.cityRegistry.localizeCity(c);
      const n = citySegmentCount(c);
      const on = c.id === game.activeCityId;
      return `<button type="button" class="header-city-item${on ? ' active' : ''}" data-header-city="${c.id}" role="menuitem"${on ? ' aria-current="true"' : ''}>
        <span class="header-city-item-name">${escapeHtml(loc.name)}</span>
        <span class="header-city-item-count">${n}</span>
        ${on ? '<span class="header-city-item-check" aria-hidden="true">✓</span>' : ''}
      </button>`;
    }).join('');

    slot.innerHTML = `
      <div class="header-city-picker">
        <button type="button" class="header-city-toggle" id="header-city-toggle" aria-haspopup="menu" aria-expanded="${headerCityMenuOpen ? 'true' : 'false'}" aria-controls="header-city-menu">
          <span class="header-city-toggle-name">${escapeHtml(current.name)}</span>
          <span class="header-city-toggle-count">${citySegmentCount(window.cityRegistry.getCity(game.activeCityId))}</span>
          <span class="header-city-toggle-chev" aria-hidden="true">▾</span>
        </button>
        <div class="header-city-menu" id="header-city-menu" role="menu" ${headerCityMenuOpen ? '' : 'hidden'}>
          <div class="header-city-menu-title">${escapeHtml(t('hub.switchCity'))}</div>
          ${menuItems}
        </div>
      </div>`;

    if (slot.dataset.bound !== 'true') {
      slot.dataset.bound = 'true';
      slot.addEventListener('click', (e) => {
        const toggle = e.target.closest('#header-city-toggle');
        if (toggle) {
          e.preventDefault();
          e.stopPropagation();
          headerCityMenuOpen = !headerCityMenuOpen;
          renderCityTabs(window.kiezQuizGame || window.hamburgGame || game);
          return;
        }
        const btn = e.target.closest('[data-header-city]');
        if (!btn) return;
        const id = btn.dataset.headerCity;
        const g = window.kiezQuizGame || window.hamburgGame;
        closeHeaderCityMenu();
        if (g && id !== g.activeCityId) g.enterCity(id);
      });
    }
  }

  function logoPathForTheme(theme) {
    const light = theme === 'light';
    const file = light ? 'wortmarke-primaer.svg' : 'wortmarke-invers.svg';
    return `/assets/brand/logo/${file}`;
  }

  function syncBrandTheme() {
    const theme = window.kiezTheme?.getTheme?.() || document.documentElement.dataset.theme || 'dark';
    document.querySelectorAll('.brand-logo').forEach((img) => {
      img.src = logoPathForTheme(theme);
    });
  }

  function applyWordmark() {
    syncBrandTheme();
    document.querySelectorAll('.brand-link .brand-logo').forEach((img) => {
      const link = img.closest('.brand-link');
      img.style.display = '';
      img.removeAttribute('hidden');
      link?.querySelector('.kq-wm')?.remove();
    });
    document.querySelectorAll('.brand-link .kq-wm').forEach((el) => el.remove());
  }

  function sync(game) {
    if (!game) return;

    applyWordmark();
    renderCityTabs(game);

    const shell = document.querySelector('.app-shell');
    if (shell) {
      shell.classList.toggle('view-hub', game.view === 'hub');
      shell.classList.toggle('view-city', game.view === 'city');
    }

    const hubNav = document.getElementById('header-hub-nav');
    if (hubNav) {
      if (game.view === 'hub') {
        window.kiezHub?.renderHubNav?.();
      } else {
        window.kiezHub?.hideHubNav?.();
      }
    }

    const historyBtn = document.getElementById('btn-history');
    if (historyBtn) {
      historyBtn.hidden = true;
      historyBtn.setAttribute('aria-hidden', 'true');
    }

    const xpPill = document.getElementById('btn-xp-pill');
    if (xpPill) {
      const onHub = game.view === 'hub';
      xpPill.classList.toggle('xp-pill--hub', onHub);
      if (onHub) {
        xpPill.setAttribute('href', '#');
        xpPill.setAttribute('role', 'button');
        xpPill.setAttribute('aria-haspopup', 'dialog');
        xpPill.dataset.i18nTitle = 'header.xpTitle';
        xpPill.title = t('header.xpTitle');
      } else {
        closeXpPopover();
        xpPill.removeAttribute('href');
        xpPill.setAttribute('role', 'button');
        xpPill.removeAttribute('aria-haspopup');
        xpPill.removeAttribute('aria-expanded');
        xpPill.dataset.i18nTitle = 'header.profileTitle';
        xpPill.title = t('header.profileTitle');
      }
    }

    bindXpPill(game);
    syncHeaderOffset();
  }

  if (!document.documentElement.dataset.kqHeaderCityMenuBound) {
    document.documentElement.dataset.kqHeaderCityMenuBound = 'true';
    document.addEventListener('click', (e) => {
      if (!headerCityMenuOpen) return;
      if (e.target.closest('.header-city-picker')) return;
      closeHeaderCityMenu();
      const g = window.kiezQuizGame || window.hamburgGame;
      if (g?.view === 'city') renderCityTabs(g);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && headerCityMenuOpen) {
        closeHeaderCityMenu();
        const g = window.kiezQuizGame || window.hamburgGame;
        if (g?.view === 'city') renderCityTabs(g);
      }
    });
  }

  if (!document.documentElement.dataset.kqHeaderOffsetBound) {
    document.documentElement.dataset.kqHeaderOffsetBound = 'true';
    window.addEventListener('resize', syncHeaderOffset, { passive: true });
  }

  if (!document.documentElement.dataset.kqXpPopoverBound) {
    document.documentElement.dataset.kqXpPopoverBound = 'true';
    document.addEventListener('click', (e) => {
      if (!xpPopoverEl) return;
      if (e.target.closest('#btn-xp-pill') || e.target.closest('#xp-global-popover')) return;
      closeXpPopover();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && xpPopoverEl) closeXpPopover();
    });
  }

  function syncHeaderOffset() {
    const shell = document.querySelector('.app-shell.kq');
    const header = document.getElementById('app-header');
    if (!shell || !header) return;
    const h = Math.ceil(header.getBoundingClientRect().height);
    shell.style.setProperty('--kq-header-offset', `${h}px`);
    shell.classList.add('kq-header-padded');
  }

  function renderStaticChrome() {
    applyWordmark();
    const hubNav = document.getElementById('header-hub-nav');
    if (hubNav && window.kiezHub?.renderHubNav) {
      window.kiezHub.renderHubNav({ homeLinks: true });
    }
    const aboutLink = hubNav?.querySelector('a[href="/#hub-ueber-uns"], a[href="#hub-ueber-uns"]');
    if (aboutLink && /\/about\/?$/.test(window.location.pathname)) {
      aboutLink.classList.add('on');
      aboutLink.setAttribute('aria-current', 'page');
    }
    syncHeaderOffset();
  }

  if (typeof onLocaleChange === 'function') {
    onLocaleChange(() => window.kiezHub?.refreshHubNav?.());
  }

  window.kiezGlobalHeader = {
    renderHubHeader: function () { return ''; },
    sync,
    closeXpPopover,
    closeHeaderCityMenu,
    renderCityTabs,
    applyWordmark,
    syncBrandTheme,
    logoPathForTheme,
    renderStaticChrome,
    syncHeaderOffset
  };
})();
