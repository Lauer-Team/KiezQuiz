/* KiezQuiz — Admin: AI-Management Dashboard (JSON via Supabase Edge Function, Admin-only) */
(function () {
  const POLL_INTERVAL_MS = 8000;
  const POLL_TIMEOUT_MS = 180000;

  const STATUS_CLASS = {
    '🟢': 'ok',
    '🟡': 'warn',
    '🔴': 'urgent',
    '⏸️': 'paused',
    '⚪': 'neutral',
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getConfig() {
    return window.SUPABASE_CONFIG || {};
  }

  async function getAccessToken() {
    const auth = window.authManager;
    if (!auth?.isLoggedIn?.() || !auth.supabase) return null;
    const { data } = await auth.supabase.auth.getSession();
    return data?.session?.access_token || null;
  }

  function functionUrl(name) {
    const config = getConfig();
    if (!config.url) return null;
    return `${config.url}/functions/v1/${name}`;
  }

  async function fetchDashboardData() {
    const config = getConfig();
    const token = await getAccessToken();
    const url = functionUrl('get-ai-dashboard');
    if (!token || !url || !config.anonKey) {
      return { ok: false, reason: 'login' };
    }

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: config.anonKey,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (res.status === 403) return { ok: false, reason: 'forbidden' };
    if (res.status === 401) return { ok: false, reason: 'login' };
    if (!res.ok) {
      let message = '';
      try {
        const payload = await res.json();
        message = payload.message || payload.error || '';
      } catch (_) { /* ignore */ }
      return { ok: false, reason: 'load_failed', message };
    }

    const contentType = res.headers.get('Content-Type') || '';
    const updated = res.headers.get('X-Dashboard-Updated') || String(Date.now());

    if (contentType.includes('application/json')) {
      const payload = await res.json();
      if (payload.ok && payload.data) {
        return { ok: true, data: payload.data, updated };
      }
      return { ok: false, reason: 'load_failed', message: payload.message || 'invalid_payload' };
    }

    return { ok: false, reason: 'load_failed', message: 'legacy_html_response' };
  }

  async function triggerRemoteRefresh() {
    const config = getConfig();
    const token = await getAccessToken();
    const url = functionUrl('refresh-ai-dashboard');
    if (!token || !url || !config.anonKey) {
      return { ok: false, reason: 'login' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: config.anonKey,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    let payload = {};
    try {
      payload = await res.json();
    } catch (_) { /* ignore */ }

    if (res.ok && payload.ok) {
      return { ok: true, message: payload.message || t('adminPage.aiDashboardRefreshStarted') };
    }

    if (payload.error === 'github_pat_missing') {
      return { ok: false, reason: 'pat_missing', message: payload.message };
    }

    return { ok: false, reason: 'remote_failed', status: res.status };
  }

  async function waitForDashboardUpdate(previousUpdated) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const result = await fetchDashboardData();
      if (result.ok && result.updated && result.updated !== previousUpdated) {
        return result;
      }
    }
    return null;
  }

  function setStatus(root, message, isError) {
    const el = root.querySelector('#admin-ai-dashboard-status');
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
    el.classList.toggle('profile-feedback--error', !!isError);
  }

  function statusClass(emoji) {
    return STATUS_CLASS[emoji] || 'neutral';
  }

  function renderTodoList(items, emptyKey) {
    if (!items?.length) {
      return `<p class="ai-dash-empty">${escapeHtml(t(emptyKey))}</p>`;
    }
    return `<ul class="ai-dash-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function renderAutomations(list) {
    if (!list?.length) {
      return `<p class="ai-dash-empty">${escapeHtml(t('adminPage.aiDashNoAutomations'))}</p>`;
    }
    return `<ul class="ai-dash-auto-list">${list.map((a) => `
      <li>
        <strong>${escapeHtml(a.name)}</strong>
        ${a.nextRun ? `<span class="ai-dash-muted">${escapeHtml(a.nextRun)}</span>` : ''}
        ${a.task ? `<span class="ai-dash-muted">${escapeHtml(a.task)}</span>` : ''}
      </li>`).join('')}</ul>`;
  }

  function renderCeoCard(ceo) {
    if (!ceo) return '';
    const sc = statusClass(ceo.status);
    return `
      <article class="ai-dash-ceo-card ai-dash-status--${sc}">
        <header class="ai-dash-ceo-head">
          <span class="ai-dash-emoji" aria-hidden="true">${escapeHtml(ceo.emoji || '🕊️')}</span>
          <div>
            <h3 class="ai-dash-ceo-name">${escapeHtml(ceo.name)}</h3>
            <p class="ai-dash-role">${escapeHtml(ceo.role || '')}</p>
          </div>
          <span class="ai-dash-badge ai-dash-badge--${sc}">${escapeHtml(ceo.status)} ${escapeHtml(ceo.statusLabel || '')}</span>
        </header>
        <p class="ai-dash-status-msg">${escapeHtml(ceo.statusMessage || '')}</p>
        ${ceo.heute ? `<p class="ai-dash-heute"><strong>${escapeHtml(t('adminPage.aiDashToday'))}</strong> ${escapeHtml(ceo.heute)}</p>` : ''}
        <div class="ai-dash-ceo-grid">
          <section>
            <h4>${escapeHtml(t('adminPage.aiDashYourTasks'))}</h4>
            ${renderTodoList(ceo.humanTodos, 'adminPage.aiDashNoHumanTodos')}
            ${ceo.approvalGates?.length ? `
              <h5>${escapeHtml(t('adminPage.aiDashApprovals'))}</h5>
              ${renderTodoList(ceo.approvalGates, 'adminPage.aiDashNoApprovals')}` : ''}
          </section>
          <section>
            <h4>${escapeHtml(t('adminPage.aiDashKalleTodos'))}</h4>
            ${renderTodoList(ceo.todos, 'adminPage.aiDashNoKalleTodos')}
          </section>
          <section>
            <h4>${escapeHtml(t('adminPage.aiDashAutomations'))}</h4>
            ${renderAutomations(ceo.automations)}
          </section>
        </div>
      </article>`;
  }

  function renderAgentCard(agent) {
    const sc = statusClass(agent.status);
    return `
      <article class="ai-dash-agent-card ai-dash-status--${sc}" data-agent-id="${escapeHtml(agent.id)}">
        <header class="ai-dash-agent-head">
          <span class="ai-dash-emoji" aria-hidden="true">${escapeHtml(agent.emoji || '')}</span>
          <div>
            <h4 class="ai-dash-agent-name">${escapeHtml(agent.name)}</h4>
            <p class="ai-dash-role">${escapeHtml(agent.role || '')}</p>
          </div>
          <span class="ai-dash-badge ai-dash-badge--${sc}">${escapeHtml(agent.status)}</span>
        </header>
        <p class="ai-dash-status-msg">${escapeHtml(agent.statusMessage || '')}</p>
        ${agent.todos?.length ? `
          <section class="ai-dash-agent-section">
            <h5>${escapeHtml(t('adminPage.aiDashTodos'))}</h5>
            ${renderTodoList(agent.todos, 'adminPage.aiDashNoTodos')}
          </section>` : ''}
        ${agent.automations?.length ? `
          <section class="ai-dash-agent-section">
            <h5>${escapeHtml(t('adminPage.aiDashAutomations'))}</h5>
            ${renderAutomations(agent.automations)}
          </section>` : ''}
        ${agent.reportsSummary ? `
          <p class="ai-dash-reports"><strong>${escapeHtml(t('adminPage.aiDashReports'))}</strong> ${escapeHtml(agent.reportsSummary)}</p>` : ''}
      </article>`;
  }

  function renderDeadlines(deadlines) {
    if (!deadlines?.length) {
      return `<p class="ai-dash-empty">${escapeHtml(t('adminPage.aiDashNoDeadlines'))}</p>`;
    }
    return `<ul class="ai-dash-deadline-list">${deadlines.map((d) => `
      <li class="ai-dash-deadline ai-dash-status--${statusClass(d.status)}">
        <span class="ai-dash-badge ai-dash-badge--${statusClass(d.status)}">${escapeHtml(d.status)}</span>
        <strong>${escapeHtml(d.what)}</strong>
        <span class="ai-dash-muted">${escapeHtml(d.due)} · ${escapeHtml(d.who)}</span>
        ${d.note ? `<span class="ai-dash-muted">${escapeHtml(d.note)}</span>` : ''}
      </li>`).join('')}</ul>`;
  }

  function renderGlobalAutomations(list) {
    if (!list?.length) return '';
    return `
      <section class="ai-dash-section">
        <h3>${escapeHtml(t('adminPage.aiDashGlobalAutomations'))}</h3>
        <div class="ai-dash-table-wrap">
          <table class="ai-dash-table">
            <thead>
              <tr>
                <th>${escapeHtml(t('adminPage.aiDashColName'))}</th>
                <th>${escapeHtml(t('adminPage.aiDashColNext'))}</th>
                <th>${escapeHtml(t('adminPage.aiDashColDays'))}</th>
              </tr>
            </thead>
            <tbody>${list.map((a) => `
              <tr>
                <td><strong>${escapeHtml(a.name)}</strong><br><span class="ai-dash-muted">${escapeHtml(a.task || '')}</span></td>
                <td>${escapeHtml(a.nextRun || '—')}</td>
                <td class="ai-dash-num">${a.daysUntil != null ? escapeHtml(String(a.daysUntil)) : '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>`;
  }

  function renderDashboard(data) {
    const stats = data.stats || {};
    const ceo = data.ceo;
    const agents = data.agents || [];

    const statsHtml = `
      <div class="ai-dash-stats">
        <div class="ai-dash-stat"><span class="ai-dash-stat-num">${escapeHtml(String(stats.automationsLive ?? '—'))}</span><span class="ai-dash-stat-label">${escapeHtml(t('adminPage.aiDashStatAutomations'))}</span></div>
        <div class="ai-dash-stat"><span class="ai-dash-stat-num">${escapeHtml(String(stats.agentsOk ?? '—'))}/${escapeHtml(String(stats.agentsTotal ?? '—'))}</span><span class="ai-dash-stat-label">${escapeHtml(t('adminPage.aiDashStatAgents'))}</span></div>
        <div class="ai-dash-stat"><span class="ai-dash-stat-num">${escapeHtml(String(stats.openDeadlines ?? '—'))}</span><span class="ai-dash-stat-label">${escapeHtml(t('adminPage.aiDashStatDeadlines'))}</span></div>
      </div>`;

    const orgHtml = `
      <section class="ai-dash-section">
        <h3>${escapeHtml(t('adminPage.aiDashOrgChart'))}</h3>
        <div class="ai-dash-org-lane">
          <div class="ai-dash-org-node ai-dash-org-node--owner">${escapeHtml(data.orgChart?.owner?.emoji || '👤')} ${escapeHtml(t('adminPage.aiDashOwner'))}</div>
          <div class="ai-dash-org-arrow" aria-hidden="true">↓</div>
          <div class="ai-dash-org-node ai-dash-org-node--ceo">${escapeHtml(ceo?.emoji || '🕊️')} ${escapeHtml(ceo?.name || 'Kalle')}</div>
          <div class="ai-dash-org-arrow" aria-hidden="true">↓</div>
        </div>
        <div class="ai-dash-agent-grid">${agents.map(renderAgentCard).join('')}</div>
      </section>`;

    return `
      <div class="ai-dash-root">
        <p class="ai-dash-meta">${escapeHtml(t('adminPage.aiDashGenerated'))}: ${escapeHtml(data.generatedAtDe || data.generatedAt || '')}</p>
        ${statsHtml}
        ${renderCeoCard(ceo)}
        ${orgHtml}
        <section class="ai-dash-section">
          <h3>${escapeHtml(t('adminPage.aiDashDeadlines'))}</h3>
          ${renderDeadlines(data.openDeadlines || data.deadlines)}
        </section>
        ${renderGlobalAutomations(data.automationsGlobal)}
      </div>`;
  }

  function showDashboard(root, data) {
    const mount = root.querySelector('#admin-ai-dashboard-mount');
    if (!mount || !data) return;
    mount.innerHTML = renderDashboard(data);
  }

  async function loadDashboardIntoMount(root) {
    const wrap = root.querySelector('.admin-ai-dashboard-mount-wrap');
    wrap?.classList.add('is-loading');
    setStatus(root, t('adminPage.loading'), false);

    const result = await fetchDashboardData();
    wrap?.classList.remove('is-loading');

    if (!result.ok) {
      if (result.reason === 'forbidden') {
        setStatus(root, t('adminPage.deniedBody'), true);
      } else if (result.reason === 'login') {
        setStatus(root, t('adminPage.loginRequiredBody'), true);
      } else {
        setStatus(root, result.message || t('adminPage.aiDashboardLoadError'), true);
      }
      return null;
    }

    showDashboard(root, result.data);
    setStatus(root, '', false);
    return result.updated;
  }

  function renderAiDashboardSection() {
    return `
      <section class="admin-panel profile-panel admin-ai-dashboard" id="profile-section-admin-ai-dashboard">
        <div class="admin-panel-head admin-ai-dashboard-head">
          <div>
            <p class="admin-panel-intro">${t('adminPage.aiDashboardIntro')}</p>
            <p class="admin-panel-hint ai-dash-hint">${escapeHtml(t('adminPage.aiDashboardHint'))}</p>
          </div>
          <div class="admin-ai-dashboard-actions">
            <button type="button" class="kq-btn sig" id="admin-ai-dashboard-refresh">
              ${escapeHtml(t('adminPage.aiDashboardRefreshBtn'))}
            </button>
          </div>
        </div>
        <p class="profile-feedback admin-ai-dashboard-status" id="admin-ai-dashboard-status" hidden></p>
        <div class="admin-ai-dashboard-mount-wrap" id="admin-ai-dashboard-mount-wrap">
          <div id="admin-ai-dashboard-mount" class="admin-ai-dashboard-mount" role="region" aria-label="${escapeHtml(t('adminPage.navAiDashboard'))}"></div>
        </div>
      </section>`;
  }

  async function handleRefreshClick(root) {
    const btn = root.querySelector('#admin-ai-dashboard-refresh');
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    setStatus(root, t('adminPage.aiDashboardRefreshing'), false);

    const before = await fetchDashboardData();
    const previousUpdated = before.ok ? before.updated : null;
    const remote = await triggerRemoteRefresh();

    if (remote.ok) {
      setStatus(root, remote.message, false);
      const next = await waitForDashboardUpdate(previousUpdated);
      if (next?.data) {
        showDashboard(root, next.data);
        setStatus(root, t('adminPage.aiDashboardRefreshDone'), false);
      } else {
        await loadDashboardIntoMount(root);
        setStatus(root, t('adminPage.aiDashboardRefreshDone'), false);
      }
    } else if (remote.reason === 'pat_missing') {
      await loadDashboardIntoMount(root);
      setStatus(root, t('adminPage.aiDashboardPatMissing'), true);
    } else if (remote.reason === 'login') {
      setStatus(root, t('adminPage.loginRequiredBody'), true);
    } else {
      await loadDashboardIntoMount(root);
      setStatus(root, t('adminPage.aiDashboardReloadOnly'), false);
    }

    btn.disabled = false;
  }

  function bindAiDashboardSectionEvents(root) {
    const section = root.querySelector('#profile-section-admin-ai-dashboard');
    if (!section || section.dataset.bound === 'true') return;
    section.dataset.bound = 'true';

    section.querySelector('#admin-ai-dashboard-refresh')
      ?.addEventListener('click', () => { void handleRefreshClick(section); });

    void loadDashboardIntoMount(section);
  }

  window.kiezAdminAiDashboard = {
    renderAiDashboardSection,
    bindAiDashboardSectionEvents,
  };
})();
