/* KiezQuiz — Full-screen profile (logged-in users) */
(function () {
  let activeSection = 'achievements';
  let leaderboardCity = 'hamburg';
  let friends = [];
  let friendRequests = [];
  let searchResults = [];
  let loadError = null;
  let searchDebounceTimer = null;
  let leaderboardLoadToken = 0;

  const SECTION_TITLES = {
    achievements: 'profilePage.navAchievements',
    friends: 'profilePage.navFriends',
    leaderboard: 'profilePage.navLeaderboard',
    account: 'profilePage.navAccount'
  };

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
      <button type="button" class="primary-btn" id="profile-btn-login">${t('profilePage.loginBtn')}</button>
      <p style="margin-top:1rem;"><a href="/" class="profile-link-btn secondary-btn">${t('profilePage.backToApp')}</a></p>
    `);
    document.getElementById('profile-btn-login')?.addEventListener('click', () => {
      window.authManager?.showAuthModal?.();
    });
  }

  function renderNoCloud() {
    renderGate('locked', `
      <h2>${t('profilePage.noCloudTitle')}</h2>
      <p>${t('profilePage.noCloudBody')}</p>
      <a href="/" class="profile-link-btn secondary-btn">${t('profilePage.backToApp')}</a>
    `);
  }

  function renderAchievementsSection() {
    const save = window.saveManager?.loadSave?.() || window.saveManager?.createEmptySave?.();
    const game = buildProfileGameContext(save);
    const cards = getPlayableCities().map((city) => {
      window.saveManager?.ensureCityBranch?.(save, city.id);
      const branch = save.cities[city.id] || {};
      const level = window.kiezProgress?.calculateCityLevel?.(game, city.id) || 1;
      const totals = window.kiezProgress?.getCityRankTotals?.(game, city.id) || {};
      const highScore = parseInt(branch.highScore, 10) || 0;
      const history = getCityBranchHistory(city.id, save).slice(0, 3);
      const historyHtml = history.length
        ? `<div class="profile-history-list">${history.map((item) => formatHistoryItem(item)).join('')}</div>`
        : `<p class="profile-empty">${t('profilePage.noHistory')}</p>`;

      return `
        <article class="profile-city-card">
          <h3>${escapeHtml(city.name)}</h3>
          <p class="profile-stat-line">${t('profilePage.cityLevel', { level })}</p>
          <p class="profile-stat-line">${t('profilePage.cityDistricts', { unlocked: totals.unlockedDistricts, total: totals.totalDistricts })}</p>
          <p class="profile-stat-line">${t('profilePage.cityTrophies', { won: totals.trophies, total: totals.totalTrophies })}</p>
          <p class="profile-stat-line">${t('profilePage.cityHighScore', { score: formatNumber(highScore) })}</p>
          <p class="profile-section-title" style="margin-top:0.75rem;font-size:0.8rem;">${t('profilePage.recentRuns')}</p>
          ${historyHtml}
        </article>`;
    }).join('');

    return `
      <section class="profile-panel" id="profile-section-achievements">
        <p class="profile-panel-intro">${t('profilePage.achievementsIntro')}</p>
        <div class="profile-city-grid">${cards}</div>
      </section>`;
  }

  function renderFriendsSection() {
    const incoming = friendRequests.filter((r) => r.direction === 'incoming');
    const outgoing = friendRequests.filter((r) => r.direction === 'outgoing');

    const incomingHtml = incoming.length
      ? incoming.map((r) => `
        <div class="profile-request-row">
          <span>@${escapeHtml(r.other_username || r.otherUsername || '')}</span>
          <div class="profile-request-actions">
            <button type="button" class="primary-btn profile-btn-accept" data-id="${escapeHtml(r.id)}">${t('profilePage.accept')}</button>
            <button type="button" class="secondary-btn profile-btn-reject" data-id="${escapeHtml(r.id)}">${t('profilePage.reject')}</button>
          </div>
        </div>`).join('')
      : `<p class="profile-empty">${t('profilePage.noIncoming')}</p>`;

    const outgoingHtml = outgoing.length
      ? outgoing.map((r) => `
        <div class="profile-request-row">
          <span>@${escapeHtml(r.other_username || r.otherUsername || '')}</span>
          <span class="profile-stat-line">${t('profilePage.pending')}</span>
        </div>`).join('')
      : `<p class="profile-empty">${t('profilePage.noOutgoing')}</p>`;

    const friendsHtml = friends.length
      ? friends.map((f) => `
        <div class="profile-request-row">
          <span>@${escapeHtml(f.username || '')}</span>
        </div>`).join('')
      : `<p class="profile-empty">${t('profilePage.noFriends')}</p>`;

    const searchHtml = searchResults.length
      ? `<div class="profile-request-list">${searchResults.map((u) => `
        <div class="profile-request-row">
          <span>@${escapeHtml(u.username || '')}</span>
          <button type="button" class="secondary-btn profile-btn-add-friend" data-username="${escapeHtml(u.username)}">${t('profilePage.sendRequest')}</button>
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
        <div class="profile-request-list">${incomingHtml}</div>

        <h3 class="profile-section-title">${t('profilePage.outgoingTitle')}</h3>
        <div class="profile-request-list">${outgoingHtml}</div>

        <h3 class="profile-section-title">${t('profilePage.friendsListTitle')}</h3>
        <div class="profile-friend-list">${friendsHtml}</div>
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
    const cities = getPlayableCities();
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
    return `
      <section class="profile-panel" id="profile-section-account">
        <p class="profile-panel-intro">${t('profilePage.accountIntro', { name: escapeHtml(name) })}</p>
        <div class="profile-account-actions">
          <button type="button" class="secondary-btn profile-btn-signout" id="profile-btn-signout">${t('profilePage.signOut')}</button>
        </div>
        <div class="profile-danger-zone">
          <h3 class="profile-section-title">${t('profilePage.deleteTitle')}</h3>
          <p>${t('profilePage.deleteBody')}</p>
          <button type="button" class="profile-btn-danger" id="profile-btn-delete">${t('profilePage.deleteBtn')}</button>
        </div>
      </section>`;
  }

  function renderSectionContent() {
    switch (activeSection) {
      case 'friends': return renderFriendsSection();
      case 'leaderboard': return renderLeaderboardSection();
      case 'account': return renderAccountSection();
      default: return renderAchievementsSection();
    }
  }

  function renderDashboard() {
    setShellVisible(true);
    const main = document.getElementById('profile-main');
    if (!main) return;
    main.innerHTML = renderSectionContent();
    bindSectionEvents();
    if (activeSection === 'leaderboard') {
      void loadLeaderboards();
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
      const [pub, fr] = await Promise.all([
        Promise.race([
          window.kiezSocial?.getCityLeaderboard?.(leaderboardCity, 50) ?? Promise.resolve(emptyResult),
          new Promise((resolve) => setTimeout(() => resolve({ rows: [], error: new Error('timeout') }), timeoutMs))
        ]),
        Promise.race([
          window.kiezSocial?.getFriendsLeaderboard?.(leaderboardCity, 50) ?? Promise.resolve(emptyResult),
          new Promise((resolve) => setTimeout(() => resolve({ rows: [], error: new Error('timeout') }), timeoutMs))
        ])
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

    main.querySelector('#profile-btn-signout')?.addEventListener('click', async () => {
      await window.authManager?.signOut?.();
      window.location.href = '/';
    });

    main.querySelector('#profile-btn-delete')?.addEventListener('click', () => {
      showDeleteConfirmModal();
    });

    bindFriendSearchAutocomplete(main);

    main.querySelectorAll('.profile-btn-accept').forEach((btn) => {
      btn.addEventListener('click', () => void respondRequest(btn.dataset.id, true));
    });
    main.querySelectorAll('.profile-btn-reject').forEach((btn) => {
      btn.addEventListener('click', () => void respondRequest(btn.dataset.id, false));
    });
    main.querySelectorAll('.profile-btn-add-friend').forEach((btn) => {
      btn.addEventListener('click', () => void sendRequest(btn.dataset.username));
    });

    main.querySelector('#profile-leaderboard-city')?.addEventListener('change', (e) => {
      leaderboardCity = e.target.value;
      void loadLeaderboards();
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
            <button type="button" class="secondary-btn profile-btn-add-friend" data-username="${escapeHtml(user.username)}">${t('profilePage.sendRequest')}</button>
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

    const queueSearch = () => {
      clearTimeout(searchDebounceTimer);
      const q = input.value.trim();
      if (q.length < 2) {
        searchResults = [];
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
      showFeedback(t('profilePage.requestSent'), false);
      await loadSocialData();
      if (activeSection === 'friends') renderDashboard();
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
    if (activeSection === 'friends') renderDashboard();
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
          <button type="button" class="secondary-btn" id="profile-delete-cancel">${t('profilePage.deleteCancel')}</button>
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
        openOverlayModal(`<div class="modal-content"><p>${t('profilePage.deleteFailed')}</p><button class="primary-btn" id="profile-delete-err-close">${t('profilePage.close')}</button></div>`, { closeOnBackdrop: true })
          .querySelector('#profile-delete-err-close')
          ?.addEventListener('click', function () { closeOverlayModal(this.closest('.overlay-modal')); });
      }
    });
  }

  function setActiveNav(section) {
    activeSection = section;
    document.querySelectorAll('.profile-nav-item').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.section === section);
    });
    const titleKey = SECTION_TITLES[section] || SECTION_TITLES.achievements;
    const titleEl = document.getElementById('profile-page-title');
    if (titleEl) {
      titleEl.textContent = t(titleKey);
      titleEl.setAttribute('data-i18n', titleKey);
    }
  }

  async function refreshAccess() {
    if (!window.authManager?.isConfigured?.()) {
      renderNoCloud();
      return;
    }
    if (!window.authManager.isLoggedIn()) {
      renderLoginPrompt();
      return;
    }
    await loadSocialData();
    renderDashboard();
  }

  async function boot() {
    await initI18n();
    document.title = t('profilePage.title') + ' – KiezQuiz';
    applyToDom();

    document.querySelectorAll('.profile-nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        setActiveNav(btn.dataset.section);
        renderDashboard();
      });
    });

    window.authManager = new AuthManager(window.SUPABASE_CONFIG || {});
    window.authManager.onAuthChange(async () => {
      window.authManager.updateHeaderUI();
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
