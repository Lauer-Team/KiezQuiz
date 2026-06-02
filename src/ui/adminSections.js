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
      filtered = list.filter((row) => row.username.toLowerCase().includes(q));
    }
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (activitySort === 'lastPlayed') {
        return Date.parse(b.lastPlayedAt || 0) - Date.parse(a.lastPlayedAt || 0)
          || a.username.localeCompare(b.username);
      }
      if (activitySort === 'today') return b.gamesToday - a.gamesToday || a.username.localeCompare(b.username);
      if (activitySort === 'month') return b.gamesMonth - a.gamesMonth || a.username.localeCompare(b.username);
      if (activitySort === 'allTime') return b.gamesAllTime - a.gamesAllTime || a.username.localeCompare(b.username);
      return b.gamesWeek - a.gamesWeek || a.username.localeCompare(b.username);
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

    return `
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
          <tr class="${row.gamesAllTime > 0 ? '' : 'admin-row-muted'}">
            <td><strong>@${escapeHtml(row.username)}</strong></td>
            <td class="admin-num-col">${formatNumber(row.gamesToday)}</td>
            <td class="admin-num-col">${formatNumber(row.gamesWeek)}</td>
            <td class="admin-num-col">${formatNumber(row.gamesMonth)}</td>
            <td class="admin-num-col">${formatNumber(row.gamesAllTime)}</td>
            <td>${escapeHtml(formatActivityTimestamp(row.lastPlayedAt))}</td>
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

  window.kiezAdminSections = {
    renderCityWishesSection,
    renderPlayerActivitySection,
    bindSectionEvents,
    bindActivitySectionEvents,
    loadAdminData,
    loadActivityData,
    fetchWishCount,
    resetFilters
  };
})();
