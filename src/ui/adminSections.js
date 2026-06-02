/* KiezQuiz — Admin panels (city wishes) for dashboard sidebar */
(function () {
  let rows = [];
  let viewMode = 'cities';
  let userFilter = '';
  let searchQuery = '';
  let loadError = null;

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
  }

  window.kiezAdminSections = {
    renderCityWishesSection,
    bindSectionEvents,
    loadAdminData,
    fetchWishCount,
    resetFilters
  };
})();
