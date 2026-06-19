/* KiezQuiz — Admin panels (city wishes) for dashboard sidebar */
(function () {
  let rows = [];
  let viewMode = 'cities';
  let userFilter = '';
  let searchQuery = '';
  let loadError = null;

  let activityRows = [];
  let activityVolume = null;
  let activitySearchQuery = '';
  let activitySort = 'week';
  let activityLoadError = null;

  let analyticsOverview = null;
  let analyticsSeriesMeta = null;
  let analyticsSeriesLoading = false;
  let analyticsActors = [];
  let analyticsSearchQuery = '';
  let analyticsSort = 'week';
  let analyticsLoadError = null;
  let analyticsRange = 'week';
  let analyticsMetrics = ['visitors', 'page_views', 'games', 'gsc_clicks'];
  let analyticsActorKey = '';
  let analyticsShowDataTable = false;

  const ANALYTICS_RANGES = ['today', 'week', 'month', '90d'];
  const ANALYTICS_METRIC_KEYS = ['visitors', 'page_views', 'games', 'gsc_clicks', 'gsc_impressions'];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatUserLabel(entry) {
    if (entry.username) return `@${entry.username}`;
    if (entry.isGuest) return t('adminPage.guestLabel', { id: entry.label.replace('…', '') });
    return t('adminPage.unknownUser');
  }

  function filterCities(cities) {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((entry) => entry.cityName.toLowerCase().includes(q));
  }

  function filterUsers(users) {
    const q = searchQuery.trim().toLowerCase();
    let list = users;
    if (q) {
      list = users.filter((entry) =>
        entry.label.toLowerCase().includes(q) ||
        (entry.username && entry.username.toLowerCase().includes(q))
      );
    }
    if (userFilter) {
      list = list.filter((entry) => entry.userKey === userFilter);
    }
    return list;
  }

  function renderCityTable(cities) {
    const filtered = filterCities(cities);
    if (!filtered.length) {
      return `<p class="admin-empty">${t('adminPage.emptyCities')}</p>`;
    }
    return `
      <table class="wish-admin-table admin-data-table">
        <thead><tr>
          <th>${t('adminPage.colCity')}</th>
          <th class="admin-num-col">${t('adminPage.colVotes')}</th>
          <th class="admin-num-col">${t('adminPage.colProposals')}</th>
          <th class="admin-num-col">${t('adminPage.colTotal')}</th>
        </tr></thead>
        <tbody>${filtered.map((entry) => `
          <tr>
            <td>${escapeHtml(entry.cityName)}</td>
            <td class="admin-num-col">${formatNumber(entry.votes)}</td>
            <td class="admin-num-col">${formatNumber(entry.proposals)}</td>
            <td class="admin-num-col"><strong>${formatNumber(entry.total)}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function renderUserSummary(users) {
    const filtered = filterUsers(users);
    if (!filtered.length) {
      return `<p class="admin-empty">${t('adminPage.emptyUsers')}</p>`;
    }

    const selected = userFilter ? filtered[0] : null;
    const summaryRows = filtered.map((entry) => `
      <button type="button" class="admin-user-row ${entry.userKey === userFilter ? 'is-active' : ''}" data-user-key="${escapeHtml(entry.userKey)}">
        <span class="admin-user-label">${escapeHtml(formatUserLabel(entry))}</span>
        <span class="admin-user-meta">${t('adminPage.userRequestCount', { count: formatNumber(entry.totalRequests) })}</span>
      </button>`).join('');

    let detailHtml = '';
    if (selected) {
      detailHtml = `
        <div class="admin-user-detail">
          <h3>${escapeHtml(formatUserLabel(selected))}</h3>
          <table class="wish-admin-table admin-data-table">
            <thead><tr>
              <th>${t('adminPage.colCity')}</th>
              <th class="admin-num-col">${t('adminPage.colVotes')}</th>
              <th class="admin-num-col">${t('adminPage.colProposals')}</th>
              <th class="admin-num-col">${t('adminPage.colTotal')}</th>
            </tr></thead>
            <tbody>${selected.cities.map((city) => `
              <tr>
                <td>${escapeHtml(city.cityName)}</td>
                <td class="admin-num-col">${formatNumber(city.votes)}</td>
                <td class="admin-num-col">${formatNumber(city.proposals)}</td>
                <td class="admin-num-col"><strong>${formatNumber(city.total)}</strong></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } else if (filtered.length === 1) {
      userFilter = filtered[0].userKey;
      return renderUserSummary(users);
    } else {
      detailHtml = `<p class="admin-hint">${t('adminPage.selectUserHint')}</p>`;
    }

    return `
      <div class="admin-user-layout">
        <div class="admin-user-list">${summaryRows}</div>
        ${detailHtml}
      </div>`;
  }

  function renderCityWishesSection() {
    const cities = window.cityWishes.aggregateByCity(rows);
    const users = window.cityWishes.aggregateByUser(rows);
    const content = viewMode === 'users'
      ? renderUserSummary(users)
      : renderCityTable(cities);

    const errorBanner = loadError
      ? `<div class="admin-error-banner" role="alert">${t('adminPage.loadErrorBody')}</div>`
      : '';

    return `
      <section class="admin-panel profile-panel" id="profile-section-admin-city-wishes">
        <div class="admin-panel-head">
          <div>
            <p class="admin-panel-intro">${t('adminPage.sectionIntro')}</p>
          </div>
          <p class="admin-stats-line">${t('adminPage.statsLine', {
            requests: formatNumber(rows.length),
            cities: formatNumber(cities.length),
            users: formatNumber(users.length)
          })}</p>
        </div>

        ${errorBanner}

        <div class="admin-toolbar">
          <div class="admin-view-tabs" role="tablist">
            <button type="button" class="admin-view-tab ${viewMode === 'cities' ? 'is-active' : ''}" data-view="cities">${t('adminPage.viewCities')}</button>
            <button type="button" class="admin-view-tab ${viewMode === 'users' ? 'is-active' : ''}" data-view="users">${t('adminPage.viewUsers')}</button>
          </div>
          <label class="admin-search">
            <span class="admin-search-label">${t('adminPage.searchLabel')}</span>
            <input type="search" class="text-input-field" id="admin-search" value="${escapeHtml(searchQuery)}" placeholder="${t('adminPage.searchPlaceholder')}">
          </label>
        </div>

        <div class="admin-table-wrap">${content}</div>
      </section>`;
  }

  function bindSectionEvents(main, onRerender) {
    if (!main) return;

    main.querySelectorAll('.admin-view-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        viewMode = tab.dataset.view;
        if (viewMode !== 'users') userFilter = '';
        onRerender();
      });
    });

    main.querySelector('#admin-search')?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      onRerender();
      const input = main.querySelector('#admin-search');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });

    main.querySelectorAll('.admin-user-row').forEach((btn) => {
      btn.addEventListener('click', () => {
        userFilter = btn.dataset.userKey || '';
        onRerender();
      });
    });
  }

  async function loadAdminData() {
    loadError = null;
    const result = await window.cityWishes.fetchAdminList();
    if (result && typeof result === 'object' && Array.isArray(result.rows)) {
      rows = result.rows;
      loadError = result.error || null;
    } else {
      rows = Array.isArray(result) ? result : [];
    }
    return rows.length;
  }

  async function fetchWishCount() {
    try {
      const result = await window.cityWishes?.fetchAdminList?.();
      const list = Array.isArray(result?.rows) ? result.rows : [];
      return list.length;
    } catch (_) {
      return 0;
    }
  }

  function resetFilters() {
    viewMode = 'cities';
    userFilter = '';
    searchQuery = '';
    loadError = null;
    activitySearchQuery = '';
    activitySort = 'week';
    activityLoadError = null;
    activityVolume = null;
    analyticsOverview = null;
    analyticsSeriesMeta = null;
    analyticsSeriesLoading = false;
    analyticsActors = [];
    analyticsSearchQuery = '';
    analyticsSort = 'week';
    analyticsLoadError = null;
    analyticsRange = 'week';
    analyticsMetrics = ['visitors', 'page_views', 'games', 'gsc_clicks'];
    analyticsActorKey = '';
    analyticsShowDataTable = false;
  }

  function formatActorLabel(row) {
    if (row.username) return `@${row.username}`;
    if (row.actorType === 'guest' && row.guestId) {
      return t('adminPage.guestLabel', { id: row.guestId.slice(0, 8) });
    }
    return t('adminPage.unknownUser');
  }

  function formatActivityTimestamp(iso) {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    const dateStr = formatDate(date, { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = formatTime(date, { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} · ${timeStr}`;
  }

  function filterActivityRows(list) {
    const q = activitySearchQuery.trim().toLowerCase();
    let filtered = list;
    if (q) {
      filtered = list.filter((row) =>
        (row.username || '').toLowerCase().includes(q)
        || (row.guestId || '').toLowerCase().includes(q)
        || formatActorLabel(row).toLowerCase().includes(q)
      );
    }
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (activitySort === 'lastPlayed') {
        return Date.parse(b.lastPlayedAt || b.lastPageViewAt || 0) - Date.parse(a.lastPlayedAt || a.lastPageViewAt || 0)
          || formatActorLabel(a).localeCompare(formatActorLabel(b));
      }
      if (activitySort === 'today') return b.gamesToday - a.gamesToday || formatActorLabel(a).localeCompare(formatActorLabel(b));
      if (activitySort === 'month') return b.gamesMonth - a.gamesMonth || formatActorLabel(a).localeCompare(formatActorLabel(b));
      if (activitySort === 'allTime') return b.gamesAllTime - a.gamesAllTime || formatActorLabel(a).localeCompare(formatActorLabel(b));
      return b.gamesWeek - a.gamesWeek || formatActorLabel(a).localeCompare(formatActorLabel(b));
    });
    return sorted;
  }

  function renderVolumeCards(volume) {
    if (!volume) {
      return `<p class="admin-hint">${t('adminPage.activityVolumePending')}</p>`;
    }

    const cards = [
      { key: 'today', games: volume.today, players: volume.playersToday, labelKey: 'adminPage.activityPeriodToday' },
      { key: 'week', games: volume.week, players: volume.playersWeek, labelKey: 'adminPage.activityPeriodWeek' },
      { key: 'month', games: volume.month, players: volume.playersMonth, labelKey: 'adminPage.activityPeriodMonth' },
      { key: 'year', games: volume.year, players: null, labelKey: 'adminPage.activityPeriodYear' },
      { key: 'allTime', games: volume.allTime, players: volume.accounts, labelKey: 'adminPage.activityPeriodAllTime', playersKey: 'adminPage.activityRegisteredAccounts' }
    ];

    const trafficCards = volume.pageViewsToday != null ? `
      <div class="admin-volume-grid admin-volume-grid--compact">
        <article class="admin-volume-card">
          <h3>${escapeHtml(t('adminPage.analyticsVisitorsToday'))}</h3>
          <p class="admin-volume-value">${formatNumber(volume.visitorsToday || 0)}</p>
          <p class="admin-volume-meta">${t('adminPage.analyticsPageViewsToday', { count: formatNumber(volume.pageViewsToday || 0) })}</p>
        </article>
        <article class="admin-volume-card">
          <h3>${escapeHtml(t('adminPage.analyticsGscClicks7d'))}</h3>
          <p class="admin-volume-value">${formatNumber(volume.gscClicks7d || 0)}</p>
          <p class="admin-volume-meta">${t('adminPage.analyticsGscImpressions7d', { count: formatNumber(volume.gscImpressions7d || 0) })}</p>
        </article>
      </div>` : '';

    return `
      ${trafficCards}
      <div class="admin-volume-grid">
        ${cards.map((card) => `
          <article class="admin-volume-card">
            <h3>${escapeHtml(t(card.labelKey))}</h3>
            <p class="admin-volume-value">${formatNumber(card.games)}</p>
            <p class="admin-volume-meta">${card.playersKey
              ? t(card.playersKey, { count: formatNumber(card.players) })
              : t('adminPage.activityUniquePlayers', { count: formatNumber(card.players || 0) })}
            </p>
          </article>`).join('')}
      </div>
      <p class="admin-volume-note">${t('adminPage.activityTimezoneNote')}</p>`;
  }

  function renderActivityTable(list) {
    const filtered = filterActivityRows(list);
    if (!filtered.length) {
      return `<p class="admin-empty">${t('adminPage.activityEmpty')}</p>`;
    }

    return `
      <table class="wish-admin-table admin-data-table">
        <thead><tr>
          <th>${t('adminPage.activityColUser')}</th>
          <th class="admin-num-col">${t('adminPage.activityColToday')}</th>
          <th class="admin-num-col">${t('adminPage.activityColWeek')}</th>
          <th class="admin-num-col">${t('adminPage.activityColMonth')}</th>
          <th class="admin-num-col">${t('adminPage.activityColAllTime')}</th>
          <th>${t('adminPage.activityColLastPlayed')}</th>
        </tr></thead>
        <tbody>${filtered.map((row) => `
          <tr class="${row.gamesAllTime > 0 || row.pageViewsAllTime > 0 ? '' : 'admin-row-muted'}">
            <td><strong>${escapeHtml(formatActorLabel(row))}</strong></td>
            <td class="admin-num-col">${formatNumber(row.gamesToday)}</td>
            <td class="admin-num-col">${formatNumber(row.gamesWeek)}</td>
            <td class="admin-num-col">${formatNumber(row.gamesMonth)}</td>
            <td class="admin-num-col">${formatNumber(row.gamesAllTime)}</td>
            <td>${escapeHtml(formatActivityTimestamp(row.lastPlayedAt || row.lastPageViewAt))}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function renderPlayerActivitySection() {
    const filtered = filterActivityRows(activityRows);
    const activeWeek = activityRows.filter((row) => row.gamesWeek > 0).length;

    const errorBanner = activityLoadError
      ? `<div class="admin-error-banner" role="alert">${t('adminPage.activityLoadError')}</div>`
      : '';

    return `
      <section class="admin-panel profile-panel" id="profile-section-admin-player-activity">
        <div class="admin-panel-head">
          <div>
            <p class="admin-panel-intro">${t('adminPage.activityIntro')}</p>
          </div>
          <p class="admin-stats-line">${t('adminPage.activityStatsLine', {
            accounts: formatNumber(activityVolume?.accounts ?? activityRows.length),
            active: formatNumber(activeWeek),
            shown: formatNumber(filtered.length)
          })}</p>
        </div>

        ${errorBanner}

        ${renderVolumeCards(activityVolume)}

        <div class="admin-toolbar">
          <div class="admin-view-tabs" role="tablist">
            <button type="button" class="admin-view-tab ${activitySort === 'week' ? 'is-active' : ''}" data-activity-sort="week">${t('adminPage.activitySortWeek')}</button>
            <button type="button" class="admin-view-tab ${activitySort === 'today' ? 'is-active' : ''}" data-activity-sort="today">${t('adminPage.activitySortToday')}</button>
            <button type="button" class="admin-view-tab ${activitySort === 'month' ? 'is-active' : ''}" data-activity-sort="month">${t('adminPage.activitySortMonth')}</button>
            <button type="button" class="admin-view-tab ${activitySort === 'allTime' ? 'is-active' : ''}" data-activity-sort="allTime">${t('adminPage.activitySortAllTime')}</button>
            <button type="button" class="admin-view-tab ${activitySort === 'lastPlayed' ? 'is-active' : ''}" data-activity-sort="lastPlayed">${t('adminPage.activitySortLastPlayed')}</button>
          </div>
          <label class="admin-search">
            <span class="admin-search-label">${t('adminPage.searchLabel')}</span>
            <input type="search" class="text-input-field" id="admin-activity-search" value="${escapeHtml(activitySearchQuery)}" placeholder="${t('adminPage.activitySearchPlaceholder')}">
          </label>
        </div>

        <div class="admin-table-wrap">${renderActivityTable(activityRows)}</div>
      </section>`;
  }

  function bindActivitySectionEvents(main, onRerender) {
    if (!main) return;

    main.querySelectorAll('[data-activity-sort]').forEach((tab) => {
      tab.addEventListener('click', () => {
        activitySort = tab.dataset.activitySort || 'week';
        onRerender();
      });
    });

    main.querySelector('#admin-activity-search')?.addEventListener('input', (e) => {
      activitySearchQuery = e.target.value;
      onRerender();
      const input = main.querySelector('#admin-activity-search');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  async function loadActivityData() {
    activityLoadError = null;
    activityVolume = null;
    const [volumeResult, listResult] = await Promise.all([
      window.kiezPlayerActivity?.fetchAdminVolume?.() || { volume: null, error: null },
      window.kiezPlayerActivity?.fetchAdminList?.() || { rows: [], error: null }
    ]);

    if (listResult && typeof listResult === 'object' && Array.isArray(listResult.rows)) {
      activityRows = listResult.rows;
      activityLoadError = listResult.error || volumeResult?.error || null;
    } else {
      activityRows = Array.isArray(listResult) ? listResult : [];
      activityLoadError = volumeResult?.error || null;
    }

    activityVolume = volumeResult?.volume || null;
    if (!activityLoadError && volumeResult?.error) activityLoadError = volumeResult.error;
    if (!activityLoadError && listResult?.error) activityLoadError = listResult.error;

    return activityRows.length;
  }

  function getAnalyticsPoints() {
    return analyticsSeriesMeta?.points || [];
  }

  function getActiveAnalyticsMetrics() {
    const gscOk = analyticsSeriesMeta?.gsc_available !== false && !analyticsActorKey;
    return analyticsMetrics.filter((key) => {
      if (key === 'gsc_clicks' || key === 'gsc_impressions') return gscOk;
      return true;
    });
  }

  function formatActorOptionLabel(row) {
    if (row.username) return `@${row.username}`;
    if (row.actorType === 'guest' && row.guestId) {
      return `${t('adminPage.guestLabel', { id: row.guestId.slice(0, 8) })}`;
    }
    return t('adminPage.unknownUser');
  }

  function renderAnalyticsKpiStrip(points, metrics, gscAvailable) {
    const kpis = window.kiezAdminAnalyticsChart?.computeKpis?.(points, metrics, gscAvailable) || [];
    if (!kpis.length) {
      return analyticsSeriesLoading
        ? `<p class="admin-hint">${t('adminPage.analyticsVolumePending')}</p>`
        : '';
    }
    return `
      <div class="admin-analytics-kpis">
        ${kpis.map((kpi) => `
          <article class="admin-analytics-kpi" style="--kpi-accent:${kpi.color || '#8b93a7'}">
            <span class="admin-analytics-kpi-label">${escapeHtml(kpi.label)}</span>
            <strong class="admin-analytics-kpi-value">${escapeHtml(String(kpi.value))}</strong>
            ${kpi.meta ? `<span class="admin-analytics-kpi-meta">${escapeHtml(kpi.meta)}</span>` : ''}
          </article>`).join('')}
      </div>`;
  }

  function renderAnalyticsRangePills() {
    const labels = {
      today: 'adminPage.analyticsRangeToday',
      week: 'adminPage.analyticsRangeWeek',
      month: 'adminPage.analyticsRangeMonth',
      '90d': 'adminPage.analyticsRange90d',
    };
    return ANALYTICS_RANGES.map((range) => `
      <button type="button" class="admin-pill ${analyticsRange === range ? 'is-active' : ''}" data-analytics-range="${range}">
        ${escapeHtml(t(labels[range] || range))}
      </button>`).join('');
  }

  function renderAnalyticsMetricPills() {
    const active = getActiveAnalyticsMetrics();
    const gscOk = analyticsSeriesMeta?.gsc_available !== false && !analyticsActorKey;
    return ANALYTICS_METRIC_KEYS.map((key) => {
      const isOn = analyticsMetrics.includes(key);
      const isGsc = key === 'gsc_clicks' || key === 'gsc_impressions';
      const disabled = isGsc && !gscOk;
      return `
        <button type="button"
          class="admin-pill admin-pill--metric ${isOn ? 'is-active' : ''}${disabled ? ' is-disabled' : ''}"
          data-analytics-metric="${key}"
          ${disabled ? 'disabled aria-disabled="true"' : ''}
          style="--pill-accent:${window.kiezAdminAnalyticsChart?.METRICS?.[key]?.color || '#8b93a7'}">
          ${escapeHtml(window.kiezAdminAnalyticsChart?.metricLabel?.(key) || key)}
        </button>`;
    }).join('');
  }

  function renderAnalyticsActorSelect() {
    const options = [
      `<option value="">${escapeHtml(t('adminPage.analyticsActorAll'))}</option>`,
      ...analyticsActors.map((row) => `
        <option value="${escapeHtml(row.actorKey)}" ${row.actorKey === analyticsActorKey ? 'selected' : ''}>
          ${escapeHtml(formatActorOptionLabel(row))}
        </option>`),
    ];
    return `
      <label class="admin-analytics-filter">
        <span class="admin-search-label">${escapeHtml(t('adminPage.analyticsActorFilter'))}</span>
        <select class="text-input-field admin-analytics-select" id="admin-analytics-actor">
          ${options.join('')}
        </select>
      </label>`;
  }

  function renderAnalyticsChartBlock() {
    if (analyticsSeriesLoading) {
      return `<div class="admin-analytics-chart-loading">${escapeHtml(t('adminPage.analyticsVolumePending'))}</div>`;
    }
    const points = getAnalyticsPoints();
    const metrics = getActiveAnalyticsMetrics();
    return window.kiezAdminAnalyticsChart?.renderChartHtml?.(
      points,
      metrics,
      analyticsSeriesMeta?.granularity || 'day'
    ) || '';
  }

  function renderAnalyticsDataTable(points, metrics) {
    if (!points.length) return '';
    const cols = metrics.filter((key) => window.kiezAdminAnalyticsChart?.METRICS?.[key]);
    const rows = [...points].reverse();
    return `
      <table class="wish-admin-table admin-data-table admin-analytics-data-table">
        <thead><tr>
          <th>${t('adminPage.analyticsColTime')}</th>
          ${cols.map((key) => `<th class="admin-num-col">${escapeHtml(window.kiezAdminAnalyticsChart.metricLabel(key))}</th>`).join('')}
        </tr></thead>
        <tbody>${rows.map((row) => `
          <tr>
            <td>${escapeHtml(row.label || row.t || '—')}</td>
            ${cols.map((key) => {
              const v = window.kiezAdminAnalyticsChart.readValue(row, key);
              return `<td class="admin-num-col">${v == null ? '—' : formatNumber(v)}</td>`;
            }).join('')}
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function renderAnalyticsLegacyHint() {
    if (!analyticsSeriesMeta?.legacy || analyticsRange !== 'today') return '';
    return `<p class="admin-hint admin-analytics-legacy-hint">${escapeHtml(t('adminPage.analyticsLegacyHint'))}</p>`;
  }

  function renderAnalyticsGscActorHint() {
    if (!analyticsActorKey) return '';
    return `<p class="admin-hint admin-analytics-gsc-hint">${escapeHtml(t('adminPage.analyticsGscActorHint'))}</p>`;
  }

  function filterAnalyticsActors(list) {
    const q = analyticsSearchQuery.trim().toLowerCase();
    let filtered = list;
    if (q) {
      filtered = list.filter((row) =>
        (row.username || '').toLowerCase().includes(q)
        || (row.guestId || '').toLowerCase().includes(q)
        || formatActorLabel(row).toLowerCase().includes(q)
      );
    }
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (analyticsSort === 'views') {
        return b.pageViewsWeek - a.pageViewsWeek || b.gamesWeek - a.gamesWeek;
      }
      if (analyticsSort === 'games') {
        return b.gamesWeek - a.gamesWeek || b.pageViewsWeek - a.pageViewsWeek;
      }
      if (analyticsSort === 'last') {
        return Date.parse(b.lastPageViewAt || b.lastPlayedAt || 0)
          - Date.parse(a.lastPageViewAt || a.lastPlayedAt || 0);
      }
      return b.pageViewsWeek + b.gamesWeek - (a.pageViewsWeek + a.gamesWeek);
    });
    return sorted;
  }

  function renderAnalyticsActorsTable(list) {
    const filtered = filterAnalyticsActors(list);
    if (!filtered.length) {
      return `<p class="admin-empty">${t('adminPage.analyticsActorsEmpty')}</p>`;
    }

    return `
      <table class="wish-admin-table admin-data-table">
        <thead><tr>
          <th>${t('adminPage.activityColUser')}</th>
          <th class="admin-num-col">${t('adminPage.analyticsColViewsWeek')}</th>
          <th class="admin-num-col">${t('adminPage.analyticsColGamesWeek')}</th>
          <th class="admin-num-col">${t('adminPage.analyticsColToday')}</th>
          <th class="admin-num-col">${t('adminPage.analyticsColAllTime')}</th>
          <th>${t('adminPage.analyticsColLastSeen')}</th>
        </tr></thead>
        <tbody>${filtered.map((row) => `
          <tr>
            <td><strong>${escapeHtml(formatActorLabel(row))}</strong></td>
            <td class="admin-num-col">${formatNumber(row.pageViewsWeek)}</td>
            <td class="admin-num-col">${formatNumber(row.gamesWeek)}</td>
            <td class="admin-num-col">${formatNumber(row.pageViewsToday)} / ${formatNumber(row.gamesToday)}</td>
            <td class="admin-num-col">${formatNumber(row.pageViewsAllTime)} / ${formatNumber(row.gamesAllTime)}</td>
            <td>${escapeHtml(formatActivityTimestamp(row.lastPageViewAt || row.lastPlayedAt))}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  function renderAnalyticsSection() {
    const filtered = filterAnalyticsActors(analyticsActors);
    const points = getAnalyticsPoints();
    const metrics = getActiveAnalyticsMetrics();
    const gscAvailable = analyticsSeriesMeta?.gsc_available !== false && !analyticsActorKey;
    const errorBanner = analyticsLoadError
      ? `<div class="admin-error-banner" role="alert">${escapeHtml(t('adminPage.analyticsLoadError'))}<br><span class="admin-error-detail">${escapeHtml(analyticsLoadError)}</span></div>`
      : '';

    const gscMeta = analyticsOverview?.gsc_latest_day
      ? t('adminPage.analyticsGscLatest', { date: analyticsOverview.gsc_latest_day })
      : '';

    return `
      <section class="admin-panel profile-panel admin-analytics-panel" id="profile-section-admin-analytics">
        <div class="admin-panel-head">
          <div>
            <p class="admin-panel-intro">${t('adminPage.analyticsIntro')}</p>
          </div>
          <p class="admin-stats-line">${t('adminPage.analyticsStatsLine', {
            days: formatNumber(points.length),
            actors: formatNumber(analyticsActors.length),
            shown: formatNumber(filtered.length)
          })}${gscMeta ? ` · ${escapeHtml(gscMeta)}` : ''}</p>
        </div>

        ${errorBanner}

        <div class="admin-analytics-controls">
          <div class="admin-analytics-control-group">
            <span class="admin-search-label">${escapeHtml(t('adminPage.analyticsRangeLabel'))}</span>
            <div class="admin-pill-row" role="tablist">${renderAnalyticsRangePills()}</div>
          </div>
          <div class="admin-analytics-control-group admin-analytics-control-group--grow">
            <span class="admin-search-label">${escapeHtml(t('adminPage.analyticsMetricLabel'))}</span>
            <div class="admin-pill-row admin-pill-row--wrap">${renderAnalyticsMetricPills()}</div>
          </div>
          ${renderAnalyticsActorSelect()}
        </div>

        ${renderAnalyticsGscActorHint()}
        ${renderAnalyticsLegacyHint()}

        ${renderAnalyticsKpiStrip(points, metrics, gscAvailable)}

        <div class="admin-analytics-chart-host" id="admin-analytics-chart-host">
          ${renderAnalyticsChartBlock()}
        </div>

        <div class="admin-analytics-table-toggle">
          <button type="button" class="admin-linkish-btn" id="admin-analytics-toggle-table" aria-expanded="${analyticsShowDataTable}">
            ${escapeHtml(analyticsShowDataTable ? t('adminPage.analyticsHideTable') : t('adminPage.analyticsShowTable'))}
          </button>
        </div>
        ${analyticsShowDataTable ? `<div class="admin-table-wrap">${renderAnalyticsDataTable(points, metrics)}</div>` : ''}

        <p class="admin-volume-note">${t('adminPage.activityTimezoneNote')}</p>

        <div class="admin-toolbar">
          <div class="admin-view-tabs" role="tablist">
            <button type="button" class="admin-view-tab ${analyticsSort === 'week' ? 'is-active' : ''}" data-analytics-sort="week">${t('adminPage.analyticsSortCombined')}</button>
            <button type="button" class="admin-view-tab ${analyticsSort === 'views' ? 'is-active' : ''}" data-analytics-sort="views">${t('adminPage.analyticsSortViews')}</button>
            <button type="button" class="admin-view-tab ${analyticsSort === 'games' ? 'is-active' : ''}" data-analytics-sort="games">${t('adminPage.analyticsSortGames')}</button>
            <button type="button" class="admin-view-tab ${analyticsSort === 'last' ? 'is-active' : ''}" data-analytics-sort="last">${t('adminPage.activitySortLastPlayed')}</button>
          </div>
          <label class="admin-search">
            <span class="admin-search-label">${t('adminPage.searchLabel')}</span>
            <input type="search" class="text-input-field" id="admin-analytics-search" value="${escapeHtml(analyticsSearchQuery)}" placeholder="${t('adminPage.activitySearchPlaceholder')}">
          </label>
        </div>

        <h3 class="admin-subsection-title">${t('adminPage.analyticsActorsTitle')}</h3>
        <div class="admin-table-wrap">${renderAnalyticsActorsTable(analyticsActors)}</div>
      </section>`;
  }

  async function reloadAnalyticsSeries() {
    analyticsSeriesLoading = true;
    const result = await window.kiezAnalytics?.fetchAdminSeries?.(analyticsRange, analyticsActorKey || null)
      || { meta: null, error: null };
    analyticsSeriesMeta = result.meta;
    if (result.error && !analyticsLoadError) analyticsLoadError = result.error;
    analyticsSeriesLoading = false;
    return analyticsSeriesMeta;
  }

  function bindAnalyticsSectionEvents(main, onRerender) {
    if (!main) return;

    const chartHost = main.querySelector('#admin-analytics-chart-host');
    if (chartHost && !analyticsSeriesLoading) {
      window.kiezAdminAnalyticsChart?.bindChart?.(
        chartHost,
        getAnalyticsPoints(),
        getActiveAnalyticsMetrics()
      );
    }

    main.querySelectorAll('[data-analytics-range]').forEach((pill) => {
      pill.addEventListener('click', async () => {
        const next = pill.dataset.analyticsRange;
        if (!next || next === analyticsRange) return;
        analyticsRange = next;
        onRerender();
        await reloadAnalyticsSeries();
        onRerender();
      });
    });

    main.querySelectorAll('[data-analytics-metric]').forEach((pill) => {
      pill.addEventListener('click', () => {
        const key = pill.dataset.analyticsMetric;
        if (!key || pill.disabled) return;
        const has = analyticsMetrics.includes(key);
        if (has && analyticsMetrics.length <= 1) return;
        analyticsMetrics = has
          ? analyticsMetrics.filter((k) => k !== key)
          : [...analyticsMetrics, key];
        onRerender();
      });
    });

    main.querySelector('#admin-analytics-actor')?.addEventListener('change', async (e) => {
      const next = e.target.value || '';
      if (next === analyticsActorKey) return;
      analyticsActorKey = next;
      onRerender();
      await reloadAnalyticsSeries();
      onRerender();
    });

    main.querySelector('#admin-analytics-toggle-table')?.addEventListener('click', () => {
      analyticsShowDataTable = !analyticsShowDataTable;
      onRerender();
    });

    main.querySelectorAll('[data-analytics-sort]').forEach((tab) => {
      tab.addEventListener('click', () => {
        analyticsSort = tab.dataset.analyticsSort || 'week';
        onRerender();
      });
    });

    main.querySelector('#admin-analytics-search')?.addEventListener('input', (e) => {
      analyticsSearchQuery = e.target.value;
      onRerender();
      const input = main.querySelector('#admin-analytics-search');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  }

  async function loadAnalyticsData() {
    analyticsLoadError = null;
    analyticsOverview = null;
    analyticsSeriesMeta = null;
    analyticsActors = [];
    analyticsSeriesLoading = true;

    const [overviewResult, actorsResult, seriesResult] = await Promise.all([
      window.kiezAnalytics?.fetchAdminOverview?.() || { overview: null, error: null },
      window.kiezAnalytics?.fetchAdminActors?.() || { rows: [], error: null },
      window.kiezAnalytics?.fetchAdminSeries?.(analyticsRange, analyticsActorKey || null)
        || { meta: null, error: null },
    ]);

    analyticsOverview = overviewResult?.overview || null;
    analyticsActors = actorsResult?.rows || [];
    analyticsSeriesMeta = seriesResult?.meta || null;
    analyticsLoadError = overviewResult?.error || actorsResult?.error || seriesResult?.error || null;
    analyticsSeriesLoading = false;

    return analyticsActors.length;
  }

  window.kiezAdminSections = {
    renderCityWishesSection,
    renderPlayerActivitySection,
    renderAnalyticsSection,
    bindSectionEvents,
    bindActivitySectionEvents,
    bindAnalyticsSectionEvents,
    loadAdminData,
    loadActivityData,
    loadAnalyticsData,
    fetchWishCount,
    resetFilters
  };
})();
