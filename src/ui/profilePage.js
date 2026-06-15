/* KiezQuiz — Full-screen profile (logged-in users) */
(function () {
  let activeSection = 'dashboard';
  let isAdmin = false;
  let adminWishCount = 0;
  let leaderboardCity = 'hamburg';
  let friends = [];
  let friendRequests = [];
  let searchResults = [];
  let loadError = null;
  let searchDebounceTimer = null;
  let leaderboardLoadToken = 0;

  const SECTION_TITLES = {
    dashboard: 'profilePage.navDashboard',
    friends: 'profilePage.navFriends',
    leaderboard: 'profilePage.navLeaderboard',
    account: 'profilePage.navAccount',
    settings: 'profilePage.navSettings',
    'admin-city-wishes': 'adminPage.navCityWishes',
    'admin-player-activity': 'adminPage.navPlayerActivity',
    'admin-changelog': 'header.adminChangelog',
    'admin-ai-dashboard': 'adminPage.navAiDashboard'
  };

  const ADMIN_SECTIONS = new Set([
    'admin-city-wishes',
    'admin-player-activity',
    'admin-changelog',
    'admin-ai-dashboard'
  ]);

  function parseInitialSection() {
    try {
      const section = new URLSearchParams(window.location.search).get('section') || '';
      if (section && (SECTION_TITLES[section] || ADMIN_SECTIONS.has(section))) {
        return section;
      }
    } catch (_) { /* ignore */ }
    return 'dashboard';
  }

  function isAdminSection(section) {
    return ADMIN_SECTIONS.has(section);
  }

  function updateSectionUrl(section) {
    try {
      const url = new URL(window.location.href);
      if (!section || section === 'dashboard') url.searchParams.delete('section');
      else url.searchParams.set('section', section);
      const qs = url.searchParams.toString();
      history.replaceState(null, '', url.pathname + (qs ? `?${qs}` : ''));
    } catch (_) { /* ignore */ }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(seconds || 0));
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  function getPlayableCities() {
    return (window.KQ_DATA?.cities || []).filter((c) => c.status === 'playable');
  }

  function getLeaderboardCities() {
    return getPlayableCities().filter((c) => ['hamburg', 'berlin', 'frankfurt', 'muenchen', 'duesseldorf'].includes(c.id));
  }

  function buildProfileGameContext(save) {
    return {
      _save: save,
      activeCityId: 'hamburg',
      view: 'hub',
      unlockedBezirkIndex: 0,
      trophies: new Set(),
      bezirkProgress: {}
    };
  }

  function calculateGlobalLevel(xp) {
    let level = 1;
    for (const rank of getRanks()) {
      if (xp >= rank.minXp) level = rank.level;
    }
    return level;
  }

  function getGlobalRankProgressFromSave(save) {
    const xp = parseInt(save?.global?.xp, 10) || 0;
    const level = calculateGlobalLevel(xp);
    const currentRank = getRanks().find((r) => r.level === level) || getRanks()[0];
    const nextRank = getRanks().find((r) => r.level === level + 1);
    let percent = 100;
    if (nextRank) {
      const span = nextRank.minXp - currentRank.minXp;
      percent = span > 0 ? Math.min(100, ((xp - currentRank.minXp) / span) * 100) : 0;
    }
    return { xp, level, currentRank, nextRank, percent };
  }

  function getProfileCityRankInfo(game, cityId) {
    const cityLevel = window.kiezProgress.calculateCityLevel(game, cityId);
    const ranks = getCityRanks(cityId);
    const currentRank = ranks.find((r) => r.level === cityLevel) || ranks[0];
    const nextRank = ranks.find((r) => r.level === cityLevel + 1);
    const totals = window.kiezProgress.getCityRankTotals(game, cityId);
    let percent = 100;
    if (nextRank) {
      const nextDistricts = nextRank.level === CITY_RANK_THRESHOLDS.length
        ? totals.totalDistricts
        : Math.min(nextRank.minDistricts, totals.totalDistricts);
      const nextTrophies = nextRank.level === CITY_RANK_THRESHOLDS.length
        ? totals.totalTrophies
        : Math.min(nextRank.minTrophies, totals.totalTrophies);
      const curDistricts = currentRank.level === CITY_RANK_THRESHOLDS.length
        ? totals.totalDistricts
        : Math.min(currentRank.minDistricts, totals.totalDistricts);
      const curTrophies = currentRank.level === CITY_RANK_THRESHOLDS.length
        ? totals.totalTrophies
        : Math.min(currentRank.minTrophies, totals.totalTrophies);
      const districtSpan = Math.max(nextDistricts - curDistricts, 1);
      const trophySpan = Math.max(nextTrophies - curTrophies, 1);
      const districtPct = Math.min(100, ((totals.unlockedDistricts - curDistricts) / districtSpan) * 100);
      const trophyPct = Math.min(100, ((totals.trophies - curTrophies) / trophySpan) * 100);
      percent = Math.min(districtPct, trophyPct);
    }
    return { currentRank, nextRank, percent, totals };
  }

  function renderRankLadderMarkup(ranks, currentLevel, hintForRank) {
    return ranks.map((rank) => {
      let state = 'upcoming';
      if (rank.level < currentLevel) state = 'passed';
      else if (rank.level === currentLevel) state = 'current';
      const hint = hintForRank(rank);
      return `
        <div class="rank-ladder-step rank-ladder-step--${state}">
          <span class="rank-ladder-dot"></span>
          <span class="rank-ladder-label">
            <span class="rank-ladder-name">${escapeHtml(rank.name)}</span>
            <span class="rank-ladder-xp">${escapeHtml(hint)}</span>
          </span>
        </div>`;
    }).join('');
  }

  function renderTrophyGalleryMarkup(cityId, earnedIds) {
    const catalog = typeof getTrophyCatalog === 'function' ? getTrophyCatalog(cityId) : [];
    const earned = new Set(earnedIds || []);
    if (!catalog.length) return `<p class="profile-empty">${t('profilePage.noTrophies')}</p>`;
    return `<div class="trophy-gallery profile-trophy-gallery" data-city-id="${escapeHtml(cityId)}">${catalog.map((tr) => `
      <button type="button" class="trophy-tile ${earned.has(tr.id) ? 'trophy-tile--earned' : 'trophy-tile--locked'}" data-trophy-id="${escapeHtml(tr.id)}" aria-label="${escapeHtml(tr.name)}">
        <span class="trophy-icon">${tr.icon}</span>
        <span class="trophy-name">${escapeHtml(tr.name)}</span>
      </button>`).join('')}</div>`;
  }

  function bindProfileTrophyClicks(root, save) {
    if (!root || !window.kiezModals?.bindTrophyClicks) return;
    root.querySelectorAll('.profile-trophy-gallery[data-city-id]').forEach((gallery) => {
      const cityId = gallery.dataset.cityId;
      const branch = save?.cities?.[cityId] || {};
      const gameCtx = {
        activeCityId: cityId,
        trophies: new Set(Array.isArray(branch.trophies) ? branch.trophies : [])
      };
      window.kiezModals.bindTrophyClicks(gallery, gameCtx);
    });
  }

  function updateHeaderStatsFromSave() {
    const save = window.saveManager?.loadSave?.();
    if (!save) return;
    const xp = parseInt(save.global?.xp, 10) || 0;
    const streak = parseInt(save.global?.streak, 10) || 0;
    const bestStreak = parseInt(save.global?.bestStreak, 10) || 0;
    const level = calculateGlobalLevel(xp);
    const currentRank = getRanks().find((r) => r.level === level) || getRanks()[0];
    const nextRank = getRanks().find((r) => r.level === level + 1);

    const xpVal = document.getElementById('stat-xp');
    const streakVal = document.getElementById('stat-streak');
    const bestStreakVal = document.getElementById('stat-best-streak');
    const rankName = document.getElementById('stat-rank');
    const progFill = document.getElementById('progress-fill');
    const xpPill = document.getElementById('btn-xp-pill');

    if (xpVal) xpVal.textContent = formatNumber(xp);
    if (streakVal) streakVal.textContent = `${streak}x`;
    if (bestStreakVal) bestStreakVal.textContent = t('header.streakBest', { count: bestStreak });
    if (rankName) rankName.textContent = currentRank.name;

    let pct = 100;
    if (nextRank && currentRank) {
      const span = nextRank.minXp - currentRank.minXp;
      pct = span > 0 ? Math.min(100, ((xp - currentRank.minXp) / span) * 100) : 0;
    }
    if (xpPill) {
      xpPill.style.setProperty('--xp-rank-pct', `${pct}%`);
      xpPill.title = nextRank
        ? t('ranks.progressTo', { percent: Math.round(pct), name: nextRank.name, xp: nextRank.minXp })
        : t('ranks.maxReached');
    }
    if (progFill) progFill.style.width = `${pct}%`;
    window.kiezGlobalHeader?.renderProfileCityPicker?.();
  }

  async function runGameReset() {
    const chain = typeof window.loadGameCore === 'function'
      ? window.loadGameCore()
      : Promise.resolve();
    await chain;
    if (!window.kiezQuizGame && typeof KiezQuizGame === 'function') {
      window.kiezQuizGame = new KiezQuizGame();
      window.hamburgGame = window.kiezQuizGame;
    }
    await window.kiezQuizGame?.resetGame?.();
  }

  function initProfileChrome() {
    try {
      window.kiezGlobalHeader?.renderStaticChrome?.();
      window.kiezGlobalHeader?.syncBrandTheme?.();
      window.kiezChangelog?.bindTriggers?.(document);
    } catch (err) {
      console.warn('Profile chrome init failed:', err);
    }

    const langBtn = document.getElementById('btn-lang');
    if (langBtn && langBtn.dataset.kqLangBound !== 'true') {
      langBtn.dataset.kqLangBound = 'true';
      langBtn.addEventListener('click', () => {
        if (typeof setLocale === 'function') {
          setLocale(getLocale() === 'de' ? 'en' : 'de');
        }
      });
    }

    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn && muteBtn.dataset.kqMuteBound !== 'true') {
      muteBtn.dataset.kqMuteBound = 'true';
      muteBtn.addEventListener('click', () => {
        const nextMuted = localStorage.getItem('hamburg_muted') !== 'true';
        localStorage.setItem('hamburg_muted', nextMuted ? 'true' : 'false');
        muteBtn.classList.toggle('is-muted', nextMuted);
      });
    }

    function syncTheme() {
      const theme = window.kiezTheme?.getTheme?.() || 'dark';
      document.querySelectorAll('.profile-app-shell').forEach((el) => {
        el.dataset.theme = theme;
      });
      window.kiezGlobalHeader?.syncBrandTheme?.();
    }

    window.addEventListener('kiezthemechange', () => {
      syncTheme();
      syncSettingsThemeControls(document);
    });
    syncTheme();
    syncProfileLangButton();
  }

  function syncProfileLangButton() {
    const btn = document.getElementById('btn-lang');
    if (!btn || typeof getLocale !== 'function') return;
    btn.textContent = getLocale() === 'de' ? '🇩🇪' : '🇬🇧';
    const titleKey = getLocale() === 'de' ? 'header.langSwitchToEn' : 'header.langSwitchToDe';
    btn.dataset.i18nTitle = titleKey;
    btn.title = t(titleKey);
  }

  function renderGlobalAchievementsBlock(save) {
    const { xp, level, currentRank, nextRank, percent } = getGlobalRankProgressFromSave(save);
    const steps = renderRankLadderMarkup(getRanks(), level, (rank) => (
      rank.maxXp !== Infinity ? `${rank.minXp} XP` : t('log.xpPlus', { xp: rank.minXp })
    ));
    const progressNote = nextRank
      ? t('ranks.progressTo', { percent: Math.round(percent), name: nextRank.name, xp: nextRank.minXp })
      : t('ranks.maxReached');

    return `
      <section class="profile-global-rank-card log-zone log-zone-global">
        <div class="log-zone-head">
          <span class="log-zone-tag global">${t('log.zoneGlobal')}</span>
          <span class="log-zone-note">${t('log.zoneGlobalNote')}</span>
        </div>
        <p class="log-rank-current">${t('log.yourGlobalRank')}: <strong>${escapeHtml(currentRank.name)}</strong> · ${xp} XP</p>
        <div class="rank-ladder">${steps}</div>
        <div class="rank-xp-bar"><div class="rank-xp-bar-fill" style="width:${percent}%"></div></div>
        <p class="log-rank-progress-note">${escapeHtml(progressNote)}</p>
      </section>`;
  }

  function computeCityStats(game, city) {
    if (window.kiezHub?.computeCityStats) {
      return window.kiezHub.computeCityStats(game, city);
    }
    return { completion: 0, trophies: { won: 0, total: city.totalTrophies || 0 }, levels: {} };
  }

  function renderCityAchievementsDetails(city, save, game) {
    const branch = save.cities[city.id] || {};
    const stats = computeCityStats(game, city);
    const rankInfo = getProfileCityRankInfo(game, city.id);
    const cityRankKey = typeof getCityRankLocaleKey === 'function'
      ? getCityRankLocaleKey(city.id)
      : 'cityRanks';
    const ranks = getCityRanks(city.id);
    const steps = renderRankLadderMarkup(ranks, rankInfo.currentRank.level, (rank) => {
      const isMax = rank.level === ranks.length;
      const reqDistricts = isMax ? rankInfo.totals.totalDistricts : Math.min(rank.minDistricts, rankInfo.totals.totalDistricts);
      const reqTrophies = isMax ? rankInfo.totals.totalTrophies : Math.min(rank.minTrophies, rankInfo.totals.totalTrophies);
      return t(`${cityRankKey}.progressHint`, {
        districts: reqDistricts,
        totalDistricts: rankInfo.totals.totalDistricts,
        trophies: reqTrophies,
        totalTrophies: rankInfo.totals.totalTrophies
      });
    });
    const progressNote = rankInfo.nextRank
      ? t(`${cityRankKey}.progressTo`, { percent: Math.round(rankInfo.percent), name: rankInfo.nextRank.name })
      : t(`${cityRankKey}.maxReached`);
    const highScore = parseInt(branch.highScore, 10) || 0;
    const history = getCityBranchHistory(city.id, save).slice(0, 5);
    const historyHtml = history.length
      ? `<div class="game-history-list profile-history-list">${history.map((item) => formatHistoryItem(item)).join('')}</div>`
      : `<p class="profile-empty">${t('profilePage.noHistory')}</p>`;
    const trophyIds = Array.isArray(branch.trophies) ? branch.trophies : [];
    const accentStyle = Object.entries(window.cityRegistry.accentVars(city.hue))
      .map(([k, v]) => `${k}:${v}`).join(';');
    const lastCity = save?.lastCity === city.id;
    const openAttr = lastCity ? ' open' : '';
    const tileHtml = window.kiezHub?.renderCityTile
      ? window.kiezHub.renderCityTile(city, stats)
      : '';

    return `
      <div class="profile-city-module">
        ${tileHtml}
        <details class="profile-city-details"${openAttr} style="${accentStyle}">
          <summary class="profile-city-details-toggle">
            <span class="profile-city-details-toggle-label">${escapeHtml(t('profilePage.dashboardCityDetails'))}</span>
            <span class="profile-city-details-toggle-meta">${escapeHtml(rankInfo.currentRank.name)} · 🏆 ${rankInfo.totals.trophies}/${rankInfo.totals.totalTrophies}</span>
          </summary>
          <div class="profile-city-details-body log-zone log-zone-city">
            <div class="rank-ladder rank-ladder-city">${steps}</div>
            <div class="rank-xp-bar rank-city-bar"><div class="rank-xp-bar-fill" style="width:${rankInfo.percent}%"></div></div>
            <p class="log-rank-progress-note">${escapeHtml(progressNote)}</p>
            <p class="profile-stat-line">${t('profilePage.cityHighScore', { score: formatNumber(highScore) })}</p>
            <h4 class="profile-section-title">${t('log.trophies', { won: rankInfo.totals.trophies, total: rankInfo.totals.totalTrophies })}</h4>
            ${renderTrophyGalleryMarkup(city.id, trophyIds)}
            <h4 class="profile-section-title">${t('profilePage.recentRuns')}</h4>
            ${historyHtml}
          </div>
        </details>
      </div>`;
  }

  function getModeDisplayLabel(mode, segment) {
    if (typeof getModeLabel === 'function') {
      return getModeLabel(mode, segment) || mode || '—';
    }
    return mode || '—';
  }

  function formatHistoryItem(item) {
    const pct = item.percent != null
      ? item.percent
      : (item.total ? Math.round((item.correct / item.total) * 100) : 0);
    const modeLabel = getModeDisplayLabel(item.mode, item.segment);
    const segmentSuffix = item.segment === 'BEZIRKE' ? t('log.bezirkeSegment') : '';
    const districts = item.districts?.length ? item.districts.join(', ') : '';
    let dateHtml = '';
    if (item.date) {
      const date = new Date(item.date);
      const dateStr = formatDate(date, { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = formatTime(date, { hour: '2-digit', minute: '2-digit' });
      dateHtml = `<div class="profile-history-date">${escapeHtml(dateStr)} · ${escapeHtml(timeStr)}</div>`;
    }
    const scoreLine = t('profilePage.historyScore', {
      correct: item.correct ?? 0,
      total: item.total ?? 0,
      percent: pct
    });

    return `
      <div class="profile-history-item">
        ${dateHtml}
        <div class="profile-history-mode">${escapeHtml(modeLabel)}${segmentSuffix}</div>
        ${districts ? `<div class="profile-history-districts">${escapeHtml(districts)}</div>` : ''}
        <div class="profile-history-score">${escapeHtml(scoreLine)}${item.durationSec != null ? ` · ⏱ ${formatDuration(item.durationSec)}` : ''}</div>
      </div>`;
  }

  function renderLeaderboardMode(mode) {
    return escapeHtml(getModeDisplayLabel(mode, null));
  }

  function getCityBranchHistory(cityId, save) {
    const branch = save?.cities?.[cityId];
    if (Array.isArray(branch?.gameHistory) && branch.gameHistory.length) {
      return branch.gameHistory;
    }
    try {
      const key = window.kiezLeaderboard?.gameHistoryStorageKey?.(cityId)
        || (cityId === 'hamburg' ? 'hh_game_history' : `kq_history_${cityId}`);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function setShellVisible(show) {
    document.getElementById('profile-sidebar')?.toggleAttribute('hidden', !show);
    document.getElementById('profile-app')?.classList.toggle('profile-app--ready', show);
  }

  function renderGate(state, extraHtml) {
    setShellVisible(false);
    const main = document.getElementById('profile-main');
    if (!main) return;
    main.innerHTML = `
      <div class="profile-state profile-state--${state}">
        ${extraHtml || ''}
      </div>`;
  }

  function renderLoginPrompt() {
    renderGate('locked', `
      <h2>${t('profilePage.loginRequiredTitle')}</h2>
      <p>${t('profilePage.loginRequiredBody')}</p>
      <button type="button" class="kq-btn sig" id="profile-btn-login">${t('profilePage.loginBtn')}</button>
    `);
    document.getElementById('profile-btn-login')?.addEventListener('click', () => {
      window.authManager?.showAuthModal?.();
    });
  }

  function renderNoCloud() {
    renderGate('locked', `
      <h2>${t('profilePage.noCloudTitle')}</h2>
      <p>${t('profilePage.noCloudBody')}</p>
    `);
  }

  function renderDashboardFriendsWidget() {
    const isLoggedIn = window.authManager?.isLoggedIn?.();
    const incoming = friendRequests.filter((r) => r.direction === 'incoming');
    const pendingBadge = incoming.length
      ? `<p class="profile-widget-badge">${t('profilePage.dashboardPendingRequests', { count: incoming.length })}</p>`
      : '';

    if (!isLoggedIn) {
      return `
        <div class="profile-widget profile-widget--friends">
          <h3 class="profile-widget-title">${t('profilePage.dashboardFriendsHeading')}</h3>
          <p class="profile-widget-lead">${t('profilePage.dashboardFriendsLogin')}</p>
          <button type="button" class="kq-btn ghost sm profile-btn-login-widget">${t('profilePage.loginBtn')}</button>
        </div>`;
    }

    const friendChips = friends.length
      ? friends.slice(0, 8).map((f) => `
        <span class="profile-friend-chip">@${escapeHtml(f.username || '')}</span>`).join('')
      : `<p class="profile-empty profile-widget-empty">${t('profilePage.noFriends')}</p>`;

    return `
      <div class="profile-widget profile-widget--friends">
        <h3 class="profile-widget-title">${t('profilePage.dashboardFriendsHeading')}</h3>
        <p class="profile-widget-lead">${t('profilePage.dashboardFriendsLead')}</p>
        ${pendingBadge}
        <div class="profile-friend-chips">${friendChips}</div>
        <button type="button" class="profile-widget-link" data-goto-section="friends">${t('profilePage.dashboardViewFriends')}</button>
      </div>`;
  }

  function renderDashboardLeaderboardWidget(save) {
    const cities = getLeaderboardCities();
    const defaultCity = save?.lastCity && cities.some((c) => c.id === save.lastCity)
      ? save.lastCity
      : (cities[0]?.id || 'hamburg');
    const cityName = cities.find((c) => c.id === defaultCity)?.name || defaultCity;

    return `
      <div class="profile-widget profile-widget--leaderboard">
        <h3 class="profile-widget-title">${t('profilePage.dashboardLeaderboardHeading')}</h3>
        <p class="profile-widget-lead">${t('profilePage.dashboardLeaderboardLead', { city: cityName })}</p>
        <div class="profile-widget-lb" id="profile-dashboard-lb-mini">${t('profilePage.loading')}</div>
        <button type="button" class="profile-widget-link" data-goto-section="leaderboard">${t('profilePage.dashboardViewLeaderboard')}</button>
      </div>`;
  }

  async function loadDashboardLeaderboardMini(save) {
    const el = document.getElementById('profile-dashboard-lb-mini');
    if (!el || !window.authManager?.isConfigured?.()) {
      if (el) el.innerHTML = `<p class="profile-empty">${t('profilePage.noCloudBody')}</p>`;
      return;
    }
    const cities = getLeaderboardCities();
    const cityId = save?.lastCity && cities.some((c) => c.id === save.lastCity)
      ? save.lastCity
      : (cities[0]?.id || 'hamburg');
    el.textContent = t('profilePage.loading');
    try {
      const pub = await window.kiezSocial?.getCityLeaderboard?.(cityId, 5);
      const rows = pub?.rows || [];
      if (!rows.length) {
        el.innerHTML = `<p class="profile-empty">${t('profilePage.emptyLeaderboard')}</p>`;
        return;
      }
      el.innerHTML = `
        <ol class="profile-mini-lb">
          ${rows.map((row) => `
            <li class="profile-mini-lb-row">
              <span class="profile-mini-lb-rank">${row.rank ?? row.rn ?? '—'}</span>
              <span class="profile-mini-lb-user">@${escapeHtml(row.username || '')}</span>
              <span class="profile-mini-lb-score">${row.correct}/${(row.correct || 0) + (row.incorrect || 0)}</span>
            </li>`).join('')}
        </ol>`;
    } catch (e) {
      el.innerHTML = `<p class="profile-empty">${t('profilePage.loadError')}</p>`;
    }
  }

  function renderDashboardSection() {
    const save = window.saveManager?.loadSave?.() || window.saveManager?.createEmptySave?.();
    const game = buildProfileGameContext(save);
    getPlayableCities().forEach((city) => {
      window.saveManager?.ensureCityBranch?.(save, city.id);
    });
    const name = window.authManager?.isLoggedIn?.()
      ? (window.authManager.getDisplayName() || t('auth.player'))
      : t('header.guest');
    const { xp, currentRank, nextRank, percent } = getGlobalRankProgressFromSave(save);
    const streak = parseInt(save?.global?.streak, 10) || 0;
    const bestStreak = parseInt(save?.global?.bestStreak, 10) || 0;
    const citiesWithProgress = getPlayableCities().filter((city) => {
      const stats = computeCityStats(game, city);
      return stats.completion > 0 || stats.trophies.won > 0;
    }).length;
    const progressNote = nextRank
      ? t('ranks.progressTo', { percent: Math.round(percent), name: nextRank.name, xp: nextRank.minXp })
      : t('ranks.maxReached');
    const cities = window.cityRegistry?.getAllCities?.() || getPlayableCities();
    const cityBlocks = cities
      .map((city) => renderCityAchievementsDetails(city, save, game))
      .join('');
    const wishTile = window.kiezHub?.renderWishTile ? window.kiezHub.renderWishTile() : '';

    return `
      <section class="profile-panel profile-dashboard" id="profile-section-dashboard">
        <div class="profile-dashboard-hero">
          <p class="profile-dashboard-greeting">${t('profilePage.dashboardGreeting', { name: escapeHtml(name) })}</p>
          <p class="profile-panel-intro">${t('profilePage.dashboardIntro')}</p>
        </div>
        <div class="profile-dashboard-stats">
          <div class="profile-stat-card profile-stat-card--xp">
            <span class="profile-stat-label">${t('header.xpLabel')}</span>
            <span class="profile-stat-value">${formatNumber(xp)}</span>
            <span class="profile-stat-meta">${escapeHtml(currentRank.name)}</span>
            <div class="rank-xp-bar profile-stat-bar"><div class="rank-xp-bar-fill" style="width:${percent}%"></div></div>
            <span class="profile-stat-hint">${escapeHtml(progressNote)}</span>
          </div>
          <div class="profile-stat-card">
            <span class="profile-stat-label">${t('header.streakLabel')}</span>
            <span class="profile-stat-value">${streak}x</span>
            <span class="profile-stat-meta">${t('profilePage.dashboardBestStreak', { count: bestStreak })}</span>
          </div>
          <div class="profile-stat-card">
            <span class="profile-stat-label">${t('profilePage.dashboardCitiesLabel')}</span>
            <span class="profile-stat-value">${citiesWithProgress}/${getPlayableCities().length}</span>
            <span class="profile-stat-meta">${t('profilePage.dashboardCitiesMeta')}</span>
          </div>
        </div>
        <div class="profile-dashboard-layout">
          <div class="profile-dashboard-main">
            ${renderGlobalAchievementsBlock(save)}
            <h3 class="profile-section-title profile-cities-heading">${t('hub.citiesSectionTitle')}</h3>
            <p class="profile-panel-intro profile-dashboard-cities-lead">${t('hub.citiesSectionLead')}</p>
            <div class="hub-tiles profile-dashboard-cities">${cityBlocks}${wishTile}</div>
          </div>
          <aside class="profile-dashboard-aside">
            ${renderDashboardFriendsWidget()}
            ${renderDashboardLeaderboardWidget(save)}
          </aside>
        </div>
      </section>`;
  }

  function renderFriendsSection() {
    const searchHtml = searchResults.length
      ? `<div class="profile-request-list">${searchResults.map((u) => `
        <div class="profile-request-row">
          <span>@${escapeHtml(u.username || '')}</span>
          <button type="button" class="kq-btn ghost sm profile-btn-add-friend" data-username="${escapeHtml(u.username)}">${t('profilePage.sendRequest')}</button>
        </div>`).join('')}</div>`
      : '';

    return `
      <section class="profile-panel" id="profile-section-friends">
        <p class="profile-panel-intro">${t('profilePage.friendsIntro')}</p>
        <div class="profile-search-row">
          <label class="profile-field profile-search-field">
            <span class="profile-field-label">${t('profilePage.searchLabel')}</span>
            <div class="autocomplete-container profile-autocomplete-container">
              <input type="search" class="text-input-field" id="profile-friend-search" placeholder="${t('profilePage.searchPlaceholder')}" autocomplete="off" spellcheck="false">
              <div class="autocomplete-dropdown profile-autocomplete-dropdown" id="profile-friend-suggestions"></div>
            </div>
          </label>
        </div>
        <div id="profile-search-results">${searchHtml}</div>
        <p id="profile-friend-feedback" class="profile-feedback" hidden></p>

        <h3 class="profile-section-title">${t('profilePage.incomingTitle')}</h3>
        <div class="profile-request-list" id="profile-incoming-requests">${renderIncomingRequestsHtml()}</div>

        <h3 class="profile-section-title">${t('profilePage.outgoingTitle')}</h3>
        <div class="profile-request-list" id="profile-outgoing-requests">${renderOutgoingRequestsHtml()}</div>

        <h3 class="profile-section-title">${t('profilePage.friendsListTitle')}</h3>
        <div class="profile-friend-list" id="profile-friends-list">${renderFriendsListHtml()}</div>
      </section>`;
  }

  function renderLeaderboardTable(rows, emptyKey) {
    if (!rows.length) {
      return `<p class="profile-empty">${t(emptyKey)}</p>`;
    }
    return `
      <table class="profile-data-table">
        <thead><tr>
          <th>${t('profilePage.colRank')}</th>
          <th>${t('profilePage.colUser')}</th>
          <th class="profile-num-col">${t('profilePage.colScore')}</th>
          <th class="profile-num-col">${t('profilePage.colTime')}</th>
          <th>${t('profilePage.colMode')}</th>
        </tr></thead>
        <tbody>${rows.map((row) => `
          <tr>
            <td>${row.rank ?? row.rn ?? '—'}</td>
            <td>@${escapeHtml(row.username || '')}</td>
            <td class="profile-num-col">${row.correct} / ${(row.correct || 0) + (row.incorrect || 0)}</td>
            <td class="profile-num-col">${formatDuration(row.duration_sec ?? row.durationSec)}</td>
            <td>${renderLeaderboardMode(row.mode)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function renderLeaderboardSection() {
    const cities = getLeaderboardCities();
    if (!cities.some((c) => c.id === leaderboardCity)) {
      leaderboardCity = cities[0]?.id || 'hamburg';
    }
    const options = cities.map((c) =>
      `<option value="${escapeHtml(c.id)}" ${c.id === leaderboardCity ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
    ).join('');

    return `
      <section class="profile-panel" id="profile-section-leaderboard">
        <p class="profile-panel-intro">${t('profilePage.leaderboardIntro')}</p>
        <div class="profile-toolbar">
          <label class="profile-field">
            <span class="profile-field-label">${t('profilePage.cityLabel')}</span>
            <select class="text-input-field" id="profile-leaderboard-city">${options}</select>
          </label>
        </div>
        ${loadError ? `<p class="profile-feedback profile-feedback--error profile-lb-error">${t('profilePage.loadError')}</p>` : ''}
        <h3 class="profile-section-title">${t('profilePage.publicLeaderboard')}</h3>
        <div class="profile-table-wrap" id="profile-public-lb">${t('profilePage.loading')}</div>
        <h3 class="profile-section-title" style="margin-top:1.25rem;">${t('profilePage.friendsLeaderboard')}</h3>
        <div class="profile-table-wrap" id="profile-friends-lb">${t('profilePage.loading')}</div>
      </section>`;
  }

  function renderAccountSection() {
    const name = window.authManager?.getDisplayName?.() || '';
    const email = window.authManager?.user?.email || '';
    return `
      <section class="profile-panel" id="profile-section-account">
        <p class="profile-panel-intro">${t('profilePage.accountIntro', { name: escapeHtml(name) })}</p>

        <div class="profile-account-block">
          <h3 class="profile-section-title">${t('profilePage.emailTitle')}</h3>
          <p class="profile-settings-hint">${t('profilePage.emailCurrent', { email: escapeHtml(email) })}</p>
          <form class="profile-account-form" id="profile-change-email-form">
            <label class="auth-field">
              <span>${t('profilePage.emailNew')}</span>
              <input type="email" id="profile-new-email" autocomplete="email" required>
            </label>
            <p class="profile-settings-hint">${t('profilePage.emailChangeHint')}</p>
            <p class="profile-feedback" id="profile-email-feedback" hidden></p>
            <button type="submit" class="kq-btn ghost">${t('profilePage.emailChangeBtn')}</button>
          </form>
        </div>

        <div class="profile-account-block">
          <h3 class="profile-section-title">${t('profilePage.passwordTitle')}</h3>
          <form class="profile-account-form" id="profile-change-password-form">
            <label class="auth-field">
              <span>${t('auth.newPassword')}</span>
              <input type="password" id="profile-new-password" autocomplete="new-password" required minlength="6">
            </label>
            <label class="auth-field">
              <span>${t('auth.confirmPassword')}</span>
              <input type="password" id="profile-confirm-password" autocomplete="new-password" required minlength="6">
            </label>
            <p class="profile-feedback" id="profile-password-feedback" hidden></p>
            <button type="submit" class="kq-btn ghost">${t('profilePage.passwordChangeBtn')}</button>
          </form>
        </div>

        <div class="profile-account-actions">
          <button type="button" class="kq-btn ghost profile-btn-signout" id="profile-btn-signout">${t('profilePage.signOut')}</button>
        </div>
        <p class="profile-legal-hint profile-account-legal">${t('profilePage.accountLegal')}</p>
        <div class="profile-danger-zone">
          <h3 class="profile-section-title">${t('profilePage.deleteTitle')}</h3>
          <p>${t('profilePage.deleteBody')}</p>
          <button type="button" class="profile-btn-danger" id="profile-btn-delete">${t('profilePage.deleteBtn')}</button>
        </div>
      </section>`;
  }

  function renderGuestLoginSection() {
    return `
      <section class="profile-panel">
        <p class="profile-panel-intro">${t('profilePage.loginRequiredBody')}</p>
        <button type="button" class="kq-btn sig" id="profile-btn-login">${t('profilePage.loginBtn')}</button>
      </section>`;
  }

  function renderAdminGate(kind) {
    if (kind === 'login') {
      return `
        <section class="profile-panel profile-admin-gate">
          <h2>${t('adminPage.loginRequiredTitle')}</h2>
          <p class="profile-panel-intro">${t('adminPage.loginRequiredBody')}</p>
          <button type="button" class="kq-btn sig" id="profile-btn-login">${t('adminPage.loginBtn')}</button>
        </section>`;
    }
    if (kind === 'denied') {
      return `
        <section class="profile-panel profile-admin-gate">
          <h2>${t('adminPage.deniedTitle')}</h2>
          <p class="profile-panel-intro">${t('adminPage.deniedBody')}</p>
          <a href="/" class="kq-btn ghost">${t('adminPage.backToApp')}</a>
        </section>`;
    }
    return `
      <section class="profile-panel profile-admin-gate">
        <h2>${t('adminPage.noCloudTitle')}</h2>
        <p class="profile-panel-intro">${t('adminPage.noCloudBody')}</p>
      </section>`;
  }

  function renderAdminChangelogSection() {
    return `
      <section class="profile-panel profile-admin-action" id="profile-section-admin-changelog">
        <p class="profile-panel-intro">${t('profilePage.adminChangelogIntro')}</p>
        <button type="button" class="kq-btn sig" id="profile-admin-open-changelog">${t('header.adminChangelog')}</button>
      </section>`;
  }

  function renderSettingsCloudStatus() {
    const auth = window.authManager;
    if (!auth?.isConfigured?.()) {
      return `<p class="settings-cloud-status">${t('settings.cloudNotConfigured')}</p>`;
    }
    if (auth.isLoggedIn?.()) {
      return `<p class="settings-cloud-status settings-cloud-status--active">${t('settings.cloudLoggedIn', { name: auth._escapeHtml(auth.getDisplayName()) })}</p>`;
    }
    return `<p class="settings-cloud-status">${t('settings.cloudGuest')}</p>`;
  }

  function renderSettingsSection() {
    const loggedIn = window.authManager?.isLoggedIn?.();
    const resetCloudSuffix = loggedIn ? t('settings.resetCloudSuffix') : '';
    const themeAuto = window.kiezTheme?.isThemeAuto?.() !== false;
    const manual = window.kiezTheme?.getManualTheme?.() || 'dark';

    return `
      <section class="profile-panel profile-settings-panel" id="profile-section-settings">
        <p class="profile-panel-intro">${t('profilePage.settingsIntro')}</p>

        <div class="profile-settings-block">
          <h3 class="profile-section-title">${t('settings.themeAutoTitle')}</h3>
          <div class="profile-settings-row">
            <p class="profile-settings-hint">${t('settings.themeAutoBody')}</p>
            <button type="button" class="profile-settings-switch ${themeAuto ? 'is-on' : ''}" id="profile-theme-auto" role="switch" aria-checked="${themeAuto ? 'true' : 'false'}" aria-label="${escapeHtml(t('settings.themeAutoTitle'))}"></button>
          </div>
          <div class="profile-settings-manual ${themeAuto ? 'is-hidden' : ''}" id="profile-theme-manual" ${themeAuto ? 'hidden' : ''}>
            <p class="profile-settings-manual-label">${t('settings.themeManualTitle')}</p>
            <div class="profile-settings-segment" role="group" aria-label="${escapeHtml(t('settings.themeManualTitle'))}">
              <button type="button" class="profile-settings-segment-btn ${manual === 'light' ? 'is-active' : ''}" data-theme-pick="light">${escapeHtml(t('settings.themeLight'))}</button>
              <button type="button" class="profile-settings-segment-btn ${manual === 'dark' ? 'is-active' : ''}" data-theme-pick="dark">${escapeHtml(t('settings.themeDark'))}</button>
            </div>
          </div>
        </div>

        <div class="profile-settings-block">
          <h3 class="profile-section-title">${t('settings.cloudTitle')}</h3>
          ${renderSettingsCloudStatus()}
        </div>

        <div class="profile-settings-block">
          <h3 class="profile-section-title">${t('settings.privacyTitle')}</h3>
          <p class="profile-settings-hint profile-legal-hint">${t('settings.privacyBody')}</p>
        </div>

        <div class="profile-settings-block profile-settings-block--danger">
          <h3 class="profile-section-title">${t('settings.resetTitle')}</h3>
          <p class="profile-settings-hint">${t('settings.resetBody', { cloudSuffix: resetCloudSuffix })}</p>
          <button type="button" class="profile-btn-danger" id="profile-settings-reset">${t('settings.resetBtn')}</button>
        </div>
      </section>`;
  }

  function syncSettingsThemeControls(root) {
    const section = root?.querySelector?.('#profile-section-settings')
      || document.getElementById('profile-section-settings');
    if (!section) return;
    const themeAuto = window.kiezTheme?.isThemeAuto?.() !== false;
    const manual = window.kiezTheme?.getManualTheme?.() || 'dark';
    const autoBtn = section.querySelector('#profile-theme-auto');
    const manualWrap = section.querySelector('#profile-theme-manual');
    if (autoBtn) {
      autoBtn.classList.toggle('is-on', themeAuto);
      autoBtn.setAttribute('aria-checked', themeAuto ? 'true' : 'false');
    }
    if (manualWrap) {
      manualWrap.classList.toggle('is-hidden', themeAuto);
      manualWrap.hidden = themeAuto;
    }
    section.querySelectorAll('[data-theme-pick]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.themePick === manual);
    });
  }

  function bindSettingsSectionEvents(root) {
    const section = root?.querySelector?.('#profile-section-settings');
    if (!section) return;

    section.querySelector('#profile-theme-auto')?.addEventListener('click', () => {
      const nextAuto = !window.kiezTheme?.isThemeAuto?.();
      window.kiezTheme?.setThemeAuto?.(nextAuto);
      syncSettingsThemeControls(section);
    });

    section.querySelectorAll('[data-theme-pick]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.kiezTheme?.setManualTheme?.(btn.dataset.themePick);
        syncSettingsThemeControls(section);
      });
    });

    section.querySelector('#profile-settings-reset')?.addEventListener('click', () => {
      void runGameReset();
    });
  }

  async function loadAdminWishCount() {
    if (!isAdmin) {
      adminWishCount = 0;
      return;
    }
    adminWishCount = await window.kiezAdminSections?.fetchWishCount?.() || 0;
  }

  function renderAdminNav() {
    const wrap = document.getElementById('profile-admin-nav');
    const nav = document.getElementById('profile-admin-nav-list');
    if (!wrap || !nav) return;

    if (!isAdmin) {
      wrap.hidden = true;
      nav.innerHTML = '';
      if (isAdminSection(activeSection)) {
        activeSection = 'dashboard';
        setActiveNav('dashboard');
      }
      return;
    }

    wrap.hidden = false;
    const badge = adminWishCount > 0
      ? `<span class="profile-admin-badge">${adminWishCount}</span>`
      : '';
    const items = [
      { section: 'admin-ai-dashboard', labelKey: 'adminPage.navAiDashboard', badge: '' },
      { section: 'admin-city-wishes', labelKey: 'adminPage.navCityWishes', badge },
      { section: 'admin-player-activity', labelKey: 'adminPage.navPlayerActivity', badge: '' },
      { section: 'admin-changelog', labelKey: 'header.adminChangelog', badge: '' }
    ];

    nav.innerHTML = items.map((item) => `
      <button type="button" class="profile-nav-item profile-nav-item--admin ${activeSection === item.section ? 'is-active' : ''}" data-section="${item.section}">
        ${escapeHtml(t(item.labelKey))}${item.badge}
      </button>`).join('');

    nav.querySelectorAll('.profile-nav-item').forEach((btn) => {
      btn.addEventListener('click', async () => {
        setActiveNav(btn.dataset.section);
        await refreshAccess();
      });
    });
  }

  function renderSectionContent() {
    const needsLogin = window.authManager?.isConfigured?.()
      && !window.authManager?.isLoggedIn?.()
      && (activeSection === 'friends' || activeSection === 'account');
    if (needsLogin) {
      return renderGuestLoginSection();
    }
    if (!window.authManager?.isConfigured?.()
      && (activeSection === 'friends' || activeSection === 'account' || activeSection === 'leaderboard')) {
      return `
        <section class="profile-panel">
          <h3 class="profile-section-title">${t('profilePage.noCloudTitle')}</h3>
          <p class="profile-panel-intro">${t('profilePage.noCloudBody')}</p>
        </section>`;
    }
    if (isAdminSection(activeSection)) {
      if (!window.authManager?.isConfigured?.()) return renderAdminGate('nocloud');
      if (!window.authManager?.isLoggedIn?.()) return renderAdminGate('login');
      if (!isAdmin) return renderAdminGate('denied');
      if (activeSection === 'admin-city-wishes') {
        return window.kiezAdminSections?.renderCityWishesSection?.() || '';
      }
      if (activeSection === 'admin-player-activity') {
        return window.kiezAdminSections?.renderPlayerActivitySection?.() || '';
      }
      if (activeSection === 'admin-changelog') return renderAdminChangelogSection();
      if (activeSection === 'admin-ai-dashboard') {
        return window.kiezAdminAiDashboard?.renderAiDashboardSection?.() || '';
      }
    }
    switch (activeSection) {
      case 'dashboard': return renderDashboardSection();
      case 'friends': return renderFriendsSection();
      case 'leaderboard': return renderLeaderboardSection();
      case 'account': return renderAccountSection();
      case 'settings': return renderSettingsSection();
      default: return renderDashboardSection();
    }
  }

  function clearFriendSearchTimer() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }

  function resetFriendSearchUI() {
    clearFriendSearchTimer();
    searchResults = [];
    const resultsEl = document.getElementById('profile-search-results');
    if (resultsEl) resultsEl.innerHTML = '';
    const input = document.getElementById('profile-friend-search');
    if (input) input.value = '';
    const dropdown = document.getElementById('profile-friend-suggestions');
    if (dropdown) {
      dropdown.innerHTML = '';
      dropdown.style.display = 'none';
    }
  }

  function renderIncomingRequestsHtml() {
    const incoming = friendRequests.filter((r) => r.direction === 'incoming');
    return incoming.length
      ? incoming.map((r) => `
        <div class="profile-request-row">
          <span>@${escapeHtml(r.other_username || r.otherUsername || '')}</span>
          <div class="profile-request-actions">
            <button type="button" class="kq-btn sig sm profile-btn-accept" data-id="${escapeHtml(r.id)}">${t('profilePage.accept')}</button>
            <button type="button" class="kq-btn ghost sm profile-btn-reject" data-id="${escapeHtml(r.id)}">${t('profilePage.reject')}</button>
          </div>
        </div>`).join('')
      : `<p class="profile-empty">${t('profilePage.noIncoming')}</p>`;
  }

  function renderOutgoingRequestsHtml() {
    const outgoing = friendRequests.filter((r) => r.direction === 'outgoing');
    return outgoing.length
      ? outgoing.map((r) => `
        <div class="profile-request-row">
          <span>@${escapeHtml(r.other_username || r.otherUsername || '')}</span>
          <span class="profile-stat-line">${t('profilePage.pending')}</span>
        </div>`).join('')
      : `<p class="profile-empty">${t('profilePage.noOutgoing')}</p>`;
  }

  function renderFriendsListHtml() {
    return friends.length
      ? friends.map((f) => `
        <div class="profile-request-row">
          <span>@${escapeHtml(f.username || '')}</span>
        </div>`).join('')
      : `<p class="profile-empty">${t('profilePage.noFriends')}</p>`;
  }

  function bindFriendRequestActions(root) {
    root.querySelectorAll('.profile-btn-accept').forEach((btn) => {
      btn.addEventListener('click', () => void respondRequest(btn.dataset.id, true));
    });
    root.querySelectorAll('.profile-btn-reject').forEach((btn) => {
      btn.addEventListener('click', () => void respondRequest(btn.dataset.id, false));
    });
    root.querySelectorAll('.profile-btn-add-friend').forEach((btn) => {
      btn.addEventListener('click', () => void sendRequest(btn.dataset.username));
    });
  }

  function updateFriendsListsInDom() {
    const section = document.getElementById('profile-section-friends');
    if (!section) return false;

    const incomingEl = section.querySelector('#profile-incoming-requests');
    const outgoingEl = section.querySelector('#profile-outgoing-requests');
    const friendsEl = section.querySelector('#profile-friends-list');
    if (!incomingEl || !outgoingEl || !friendsEl) return false;

    incomingEl.innerHTML = renderIncomingRequestsHtml();
    outgoingEl.innerHTML = renderOutgoingRequestsHtml();
    friendsEl.innerHTML = renderFriendsListHtml();
    bindFriendRequestActions(section);
    return true;
  }

  function renderDashboard() {
    setShellVisible(true);
    const main = document.getElementById('profile-main');
    if (!main) return;
    let save;
    try {
      clearFriendSearchTimer();
      save = window.saveManager?.loadSave?.() || window.saveManager?.createEmptySave?.();
      main.innerHTML = renderSectionContent();
      bindSectionEvents();
      bindProfileTrophyClicks(main, save);
      updateHeaderStatsFromSave();
    } catch (err) {
      console.error('Profile render failed:', err);
      main.innerHTML = `
        <div class="profile-state profile-state--error">
          <h2>${t('profilePage.loadError')}</h2>
          <p>${t('profilePage.noCloudBody')}</p>
        </div>`;
      return;
    }
    const needsSocial = activeSection === 'dashboard'
      || activeSection === 'friends'
      || activeSection === 'leaderboard';
    if (needsSocial && window.authManager?.isConfigured?.()) {
      void loadSocialData().then(() => {
        if (activeSection === 'dashboard') {
          const aside = document.getElementById('profile-section-dashboard');
          if (aside) {
            const friendsCol = aside.querySelector('.profile-dashboard-aside');
            if (friendsCol) {
              friendsCol.innerHTML = renderDashboardFriendsWidget() + renderDashboardLeaderboardWidget(save);
              bindSectionEvents();
            }
          }
          void loadDashboardLeaderboardMini(save);
        } else if (activeSection === 'friends') {
          updateFriendsListsInDom();
        } else if (activeSection === 'leaderboard') {
          void loadLeaderboards();
        }
      });
    } else if (activeSection === 'dashboard') {
      void loadDashboardLeaderboardMini(save);
    }

    if (activeSection === 'admin-changelog') {
      requestAnimationFrame(() => window.kiezChangelog?.show?.());
    }
  }

  async function loadSocialData() {
    const [reqRes, friendsRes] = await Promise.all([
      window.kiezSocial?.listFriendRequests?.(),
      window.kiezSocial?.listFriends?.()
    ]);
    friendRequests = reqRes?.rows || [];
    friends = friendsRes?.rows || [];
  }

  async function loadLeaderboards() {
    const publicEl = document.getElementById('profile-public-lb');
    const friendsEl = document.getElementById('profile-friends-lb');
    if (!publicEl || !friendsEl) return;

    const loadToken = ++leaderboardLoadToken;
    loadError = null;
    publicEl.textContent = t('profilePage.loading');
    friendsEl.textContent = t('profilePage.loading');

    const emptyResult = { rows: [], error: new Error('unavailable') };
    const timeoutMs = 15000;

    try {
      await window.authManager?.waitForPendingAuthTasks?.();

      const [pub, fr] = await Promise.all([
        Promise.race([
          window.kiezSocial?.getCityLeaderboard?.(leaderboardCity, 50) ?? Promise.resolve(emptyResult),
          new Promise((resolve) => setTimeout(() => resolve({ rows: [], error: new Error('timeout') }), timeoutMs))
        ]),
        window.authManager?.isLoggedIn?.()
          ? Promise.race([
            window.kiezSocial?.getFriendsLeaderboard?.(leaderboardCity, 50) ?? Promise.resolve(emptyResult),
            new Promise((resolve) => setTimeout(() => resolve({ rows: [], error: new Error('timeout') }), timeoutMs))
          ])
          : Promise.resolve({ rows: [], error: null })
      ]);

      if (loadToken !== leaderboardLoadToken) return;

      if (pub?.error || fr?.error) loadError = true;

      publicEl.innerHTML = renderLeaderboardTable(pub?.rows || [], 'profilePage.emptyLeaderboard');
      friendsEl.innerHTML = friends.length
        ? renderLeaderboardTable(fr?.rows || [], 'profilePage.emptyFriendsLeaderboard')
        : `<p class="profile-empty">${t('profilePage.noFriendsForLb')}</p>`;

      const section = document.getElementById('profile-section-leaderboard');
      section?.querySelector('.profile-lb-error')?.remove();
      if (loadError && section) {
        section.insertAdjacentHTML('afterbegin', `<p class="profile-feedback profile-feedback--error profile-lb-error">${t('profilePage.loadError')}</p>`);
      }
    } catch (err) {
      console.warn('Leaderboard load failed:', err);
      if (loadToken !== leaderboardLoadToken) return;
      publicEl.innerHTML = `<p class="profile-empty">${t('profilePage.loadError')}</p>`;
      friendsEl.innerHTML = `<p class="profile-empty">${t('profilePage.loadError')}</p>`;
    }
  }

  function showFeedback(msg, isError) {
    const el = document.getElementById('profile-friend-feedback');
    if (!el) return;
    el.textContent = msg;
    el.hidden = !msg;
    el.classList.toggle('profile-feedback--error', !!isError);
  }

  function bindSectionEvents() {
    const main = document.getElementById('profile-main');
    if (!main) return;

    main.querySelector('#profile-btn-login')?.addEventListener('click', () => {
      window.authManager?.showAuthModal?.();
    });
    main.querySelectorAll('.profile-btn-login-widget').forEach((btn) => {
      btn.addEventListener('click', () => window.authManager?.showAuthModal?.());
    });
    main.querySelectorAll('[data-goto-section]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const section = btn.dataset.gotoSection;
        if (!section) return;
        setActiveNav(section);
        await refreshAccess();
      });
    });

    main.querySelector('#profile-btn-signout')?.addEventListener('click', async () => {
      await window.authManager?.signOut?.();
      window.location.href = '/';
    });

    main.querySelector('#profile-btn-delete')?.addEventListener('click', () => {
      showDeleteConfirmModal();
    });

    bindAccountSectionEvents(main);

    bindFriendSearchAutocomplete(main);
    bindFriendRequestActions(main);

    main.querySelector('#profile-leaderboard-city')?.addEventListener('change', (e) => {
      leaderboardCity = e.target.value;
      void loadLeaderboards();
    });

    main.querySelector('#profile-admin-open-changelog')?.addEventListener('click', () => {
      window.kiezChangelog?.show?.();
    });

    if (activeSection === 'settings') {
      bindSettingsSectionEvents(main);
    }

    if (activeSection === 'admin-city-wishes' && isAdmin) {
      window.kiezAdminSections?.bindSectionEvents?.(main, () => renderDashboard());
    }
    if (activeSection === 'admin-player-activity' && isAdmin) {
      window.kiezAdminSections?.bindActivitySectionEvents?.(main, () => renderDashboard());
    }
    if (activeSection === 'admin-ai-dashboard' && isAdmin) {
      window.kiezAdminAiDashboard?.bindAiDashboardSectionEvents?.(main);
    }

    if (main.dataset.profileCityTilesBound !== 'true') {
      main.dataset.profileCityTilesBound = 'true';
      main.addEventListener('click', (e) => {
        const wishBtn = e.target.closest('#hub-wish-tile-cards');
        if (wishBtn) {
          e.preventDefault();
          const open = () => window.kiezModals?.showWishModal?.();
          if (typeof window.loadGameBundle === 'function') window.loadGameBundle().then(open);
          else open();
          return;
        }
        const tile = e.target.closest('.city-tile[data-city-id]');
        if (!tile || e.target.closest('.profile-city-details')) return;
        const cityId = tile.dataset.cityId;
        if (tile.dataset.playable !== 'true') {
          window.kiezQuizGame?.showComingSoonToast?.(cityId);
          return;
        }
        window.location.href = `/${cityId}/`;
      });
    }
  }

  function bindAccountSectionEvents(root) {
    const emailForm = root.querySelector('#profile-change-email-form');
    const passwordForm = root.querySelector('#profile-change-password-form');
    if (!emailForm && !passwordForm) return;

    emailForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const feedback = root.querySelector('#profile-email-feedback');
      const input = root.querySelector('#profile-new-email');
      const submitBtn = emailForm.querySelector('button[type="submit"]');
      if (!feedback || !input || !submitBtn) return;

      feedback.hidden = true;
      feedback.classList.remove('profile-feedback--error');
      submitBtn.disabled = true;

      const { error } = await window.authManager?.changeEmail?.(input.value);
      submitBtn.disabled = false;

      if (error) {
        feedback.textContent = error;
        feedback.classList.add('profile-feedback--error');
        feedback.hidden = false;
        return;
      }
      feedback.textContent = t('profilePage.emailChangePending');
      feedback.hidden = false;
      input.value = '';
    });

    passwordForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const feedback = root.querySelector('#profile-password-feedback');
      const password = root.querySelector('#profile-new-password')?.value || '';
      const confirm = root.querySelector('#profile-confirm-password')?.value || '';
      const submitBtn = passwordForm.querySelector('button[type="submit"]');
      if (!feedback || !submitBtn) return;

      feedback.hidden = true;
      feedback.classList.remove('profile-feedback--error');

      if (password !== confirm) {
        feedback.textContent = t('auth.passwordMismatch');
        feedback.classList.add('profile-feedback--error');
        feedback.hidden = false;
        return;
      }

      submitBtn.disabled = true;
      const { error } = await window.authManager?.updatePassword?.(password);
      submitBtn.disabled = false;

      if (error) {
        feedback.textContent = error;
        feedback.classList.add('profile-feedback--error');
        feedback.hidden = false;
        return;
      }
      feedback.textContent = t('profilePage.passwordChangeSuccess');
      feedback.hidden = false;
      root.querySelector('#profile-new-password').value = '';
      root.querySelector('#profile-confirm-password').value = '';
    });
  }

  function bindFriendSearchAutocomplete(root) {
    const input = root.querySelector('#profile-friend-search');
    const dropdown = root.querySelector('#profile-friend-suggestions');
    if (!input || !dropdown) return;

    const hideSuggestions = () => {
      dropdown.innerHTML = '';
      dropdown.style.display = 'none';
    };

    const showSelectedUser = (user) => {
      const container = root.querySelector('#profile-search-results')
        || document.getElementById('profile-search-results');
      if (!container || !user?.username) return;
      container.innerHTML = `
        <div class="profile-request-list">
          <div class="profile-request-row">
            <span>@${escapeHtml(user.username)}</span>
            <button type="button" class="kq-btn ghost sm profile-btn-add-friend" data-username="${escapeHtml(user.username)}">${t('profilePage.sendRequest')}</button>
          </div>
        </div>`;
      container.querySelector('.profile-btn-add-friend')
        ?.addEventListener('click', () => void sendRequest(user.username));
    };

    const renderSuggestions = (rows) => {
      dropdown.innerHTML = '';
      if (!rows.length) {
        dropdown.style.display = 'none';
        return;
      }
      rows.forEach((user) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'autocomplete-item profile-autocomplete-item';
        item.textContent = `@${user.username || ''}`;
        item.addEventListener('mousedown', (e) => e.preventDefault());
        item.addEventListener('click', () => {
          input.value = user.username || '';
          hideSuggestions();
          showSelectedUser(user);
        });
        dropdown.appendChild(item);
      });
      dropdown.style.display = 'block';
    };

    const clearSearchResults = () => {
      searchResults = [];
      const container = root.querySelector('#profile-search-results')
        || document.getElementById('profile-search-results');
      if (container) container.innerHTML = '';
    };

    const queueSearch = () => {
      clearFriendSearchTimer();
      const q = input.value.trim();
      if (q.length < 2) {
        clearSearchResults();
        hideSuggestions();
        if (q.length === 0) showFeedback('', false);
        else showFeedback(t('profilePage.searchTooShort'), true);
        return;
      }
      showFeedback('', false);
      searchDebounceTimer = setTimeout(async () => {
        const res = await window.kiezSocial?.searchProfiles?.(q);
        searchResults = res?.rows || [];
        renderSuggestions(searchResults);
        if (!searchResults.length) {
          showFeedback(t('profilePage.noSearchResults'), false);
        }
      }, 280);
    };

    input.addEventListener('input', queueSearch);
    input.addEventListener('focus', queueSearch);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideSuggestions();
    });
    input.addEventListener('blur', () => {
      setTimeout(hideSuggestions, 150);
    });
  }

  async function sendRequest(username) {
    const res = await window.kiezSocial?.sendFriendRequest?.(username);
    if (res?.ok) {
      await loadSocialData();
      resetFriendSearchUI();
      if (activeSection === 'friends' && !updateFriendsListsInDom()) {
        renderDashboard();
      }
      showFeedback(t('profilePage.requestSent'), false);
      return;
    }
    const reason = res?.reason || 'error';
    const msgKey = `profilePage.friendError.${reason}`;
    const msg = t(msgKey);
    showFeedback(msg === msgKey ? t('profilePage.friendError.error') : msg, true);
  }

  async function respondRequest(id, accept) {
    await window.kiezSocial?.respondFriendRequest?.(id, accept);
    await loadSocialData();
    if (activeSection === 'friends' && !updateFriendsListsInDom()) {
      renderDashboard();
    }
  }

  function showDeleteConfirmModal() {
    if (typeof openOverlayModal !== 'function') return;
    const modal = openOverlayModal(`
      <div class="modal-content profile-delete-modal">
        <div class="profile-danger-banner">${t('profilePage.deleteDangerZone')}</div>
        <h2>${t('profilePage.deleteConfirmTitle')}</h2>
        <p>${t('profilePage.deleteConfirmBody')}</p>
        <label class="profile-delete-confirm-label">
          <input type="checkbox" id="profile-delete-understand">
          <span>${t('profilePage.deleteConfirmCheckbox')}</span>
        </label>
        <div class="profile-delete-actions">
          <button type="button" class="profile-btn-danger" id="profile-delete-confirm" disabled>${t('profilePage.deleteConfirmBtn')}</button>
          <button type="button" class="kq-btn ghost" id="profile-delete-cancel">${t('profilePage.deleteCancel')}</button>
        </div>
      </div>
    `, { closeOnBackdrop: true });

    const confirmBtn = modal.querySelector('#profile-delete-confirm');
    const checkbox = modal.querySelector('#profile-delete-understand');

    checkbox?.addEventListener('change', () => {
      if (confirmBtn) confirmBtn.disabled = !checkbox.checked;
    });

    modal.querySelector('#profile-delete-cancel')?.addEventListener('click', () => closeOverlayModal(modal));
    confirmBtn?.addEventListener('click', async () => {
      if (!checkbox?.checked) return;
      closeOverlayModal(modal);
      const res = await window.kiezSocial?.deleteMyAccount?.();
      if (res?.ok) {
        await window.authManager?.signOut?.();
        window.location.href = '/';
        return;
      }
      if (typeof openOverlayModal === 'function') {
        openOverlayModal(`<div class="modal-content"><p>${t('profilePage.deleteFailed')}</p><button class="kq-btn sig" id="profile-delete-err-close">${t('profilePage.close')}</button></div>`, { closeOnBackdrop: true })
          .querySelector('#profile-delete-err-close')
          ?.addEventListener('click', function () { closeOverlayModal(this.closest('.overlay-modal')); });
      }
    });
  }

  function setActiveNav(section) {
    activeSection = section || 'dashboard';
    document.querySelectorAll('.profile-nav:not(.profile-nav--admin) .profile-nav-item').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.section === activeSection);
    });
    document.querySelectorAll('.profile-nav--admin .profile-nav-item').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.section === activeSection);
    });
    const titleKey = SECTION_TITLES[activeSection] || SECTION_TITLES.dashboard;
    const titleEl = document.getElementById('profile-page-title');
    const eyebrowEl = document.querySelector('.profile-page-eyebrow');
    if (titleEl) {
      titleEl.textContent = t(titleKey);
      titleEl.setAttribute('data-i18n', titleKey);
    }
    if (eyebrowEl) {
      const eyebrowKey = isAdminSection(activeSection) ? 'adminPage.subtitle' : 'profilePage.subtitle';
      eyebrowEl.textContent = t(eyebrowKey);
      eyebrowEl.setAttribute('data-i18n', eyebrowKey);
    }
    updateSectionUrl(activeSection);
    renderAdminNav();
  }

  async function refreshAdminState() {
    isAdmin = !!(await window.cityWishes?.isAdmin?.());
    await loadAdminWishCount();
    renderAdminNav();
  }

  async function refreshAccess() {
    await refreshAdminState();

    if (isAdminSection(activeSection) && isAdmin && activeSection === 'admin-city-wishes') {
      await window.kiezAdminSections?.loadAdminData?.();
      adminWishCount = await window.kiezAdminSections?.fetchWishCount?.() || adminWishCount;
      renderAdminNav();
    }
    if (isAdminSection(activeSection) && isAdmin && activeSection === 'admin-player-activity') {
      await window.kiezAdminSections?.loadActivityData?.();
    }

    if (window.authManager?.isConfigured?.()
      && window.authManager.isLoggedIn()
      && (activeSection === 'friends' || activeSection === 'leaderboard' || activeSection === 'dashboard')) {
      await loadSocialData();
    }
    renderDashboard();
    updateHeaderStatsFromSave();
  }

  async function boot() {
    window.loadGameCore = function () {
      if (window.KiezQuizGame) return Promise.resolve();
      const urls = [
        '../src/game/SoundManager.js',
        '../src/game/MapNavigator.js',
        '../src/game/KiezQuizGame.js'
      ];
      return window.kiezLoadScript.loadScripts(urls);
    };

    try {
      await initI18n();
      applyPageMeta('profilePage');
      applyToDom();
      initProfileChrome();
      setShellVisible(true);
      setActiveNav(parseInitialSection());

      document.querySelectorAll('.profile-nav:not(.profile-nav--admin) .profile-nav-item').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const prev = activeSection;
          setActiveNav(btn.dataset.section);
          if (isAdminSection(prev)) {
            window.kiezAdminSections?.resetFilters?.();
          }
          await refreshAccess();
        });
      });

      window.authManager = new AuthManager(window.SUPABASE_CONFIG || {});
      const profileGameStub = {
        view: 'hub',
        activeCityId: 'hamburg',
        reRenderCurrentView() { void refreshAccess(); }
      };
      Object.defineProperty(profileGameStub, '_save', {
        get() { return window.saveManager.loadSave(); },
        set(v) { if (v) window.saveManager.persistSave(v); }
      });
      window.cloudSync = new CloudSync(window.authManager, profileGameStub);

      window.authManager.onAuthChange(async (user) => {
        window.authManager.updateHeaderUI();
        if (user) {
          await window.cloudSync.handleLoginMerge();
        }
        await refreshAccess();
      });

      try {
        await window.authManager.init();
        window.authManager.initUI();
      } catch (err) {
        console.warn('Profile auth startup failed:', err);
        window.authManager.initUI();
      }

      await refreshAccess();

      onLocaleChange(() => {
        applyPageMeta('profilePage');
        syncProfileLangButton();
        updateHeaderStatsFromSave();
        if (document.getElementById('profile-section-dashboard')
          || document.getElementById('profile-section-friends')
          || document.getElementById('profile-section-leaderboard')
          || document.getElementById('profile-section-account')
          || document.getElementById('profile-section-admin-city-wishes')
          || document.getElementById('profile-section-admin-player-activity')
          || document.getElementById('profile-section-admin-changelog')
          || document.getElementById('profile-section-admin-ai-dashboard')
          || document.getElementById('profile-section-settings')) {
          renderDashboard();
        }
        renderAdminNav();
      });
    } catch (err) {
      console.error('Profile boot failed:', err);
      setShellVisible(true);
      const main = document.getElementById('profile-main');
      if (main) {
        main.innerHTML = `
          <div class="profile-state profile-state--error">
            <h2>${typeof t === 'function' ? t('profilePage.loadError') : 'Laden fehlgeschlagen'}</h2>
          </div>`;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
