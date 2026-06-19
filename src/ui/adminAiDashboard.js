/* KiezQuiz — Admin: AI-Management Dashboard (JSON via Supabase Edge Function, Admin-only) */
(function () {
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

  function renderSparkline(spark, sc) {
    if (!Array.isArray(spark) || spark.length < 2) return '';
    const w = 100;
    const h = 28;
    const max = Math.max(...spark);
    const min = Math.min(...spark);
    const range = max - min || 1;
    const step = w / (spark.length - 1);
    const pts = spark.map((v, i) => {
      const x = i * step;
      const y = h - 3 - ((v - min) / range) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const last = pts[pts.length - 1].split(',');
    return `
      <svg class="ai-dash-spark ai-dash-spark--${sc}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
        <polyline points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" />
        <circle cx="${last[0]}" cy="${last[1]}" r="2.5" fill="currentColor" />
      </svg>`;
  }

  function sourceTag(kpi) {
    if (!kpi.sourceLabel) return '';
    const cls = kpi.source === 'ausstehend' ? 'pending' : (kpi.source || 'neutral');
    return `<span class="ai-dash-src ai-dash-src--${escapeHtml(cls)}">${escapeHtml(kpi.sourceLabel)}</span>`;
  }

  function renderKpis(kpis) {
    if (!kpis?.length) {
      return `<p class="ai-dash-empty">${escapeHtml(t('adminPage.aiDashNoKpis'))}</p>`;
    }
    return `<div class="ai-dash-kpis">${kpis.map((k) => {
      const sc = statusClass(k.status);
      return `
        <div class="ai-dash-kpi ai-dash-status--${sc}">
          <div class="ai-dash-kpi-top">
            <span class="ai-dash-kpi-label">${escapeHtml(k.label)}</span>
            ${sourceTag(k)}
          </div>
          <div class="ai-dash-kpi-figure">
            <span class="ai-dash-kpi-value">${escapeHtml(k.value)}</span>
            ${renderSparkline(k.spark, sc)}
          </div>
          ${k.target ? `<span class="ai-dash-kpi-target">${escapeHtml(t('adminPage.aiDashTarget'))}: ${escapeHtml(k.target)}</span>` : ''}
        </div>`;
    }).join('')}</div>`;
  }

  function renderProjects(projects) {
    if (!projects?.length) {
      return `<p class="ai-dash-empty">${escapeHtml(t('adminPage.aiDashNoProjects'))}</p>`;
    }
    return `<ul class="ai-dash-projects">${projects.map((p) => `
      <li class="ai-dash-project">
        <div class="ai-dash-project-head">
          <span class="ai-dash-project-title">${escapeHtml(p.title)}</span>
          <span class="ai-dash-project-meta">${escapeHtml(p.status || '')}${p.due ? ` · ${escapeHtml(p.due)}` : ''}</span>
        </div>
        <div class="ai-dash-progress" role="progressbar" aria-valuenow="${escapeHtml(String(p.progress || 0))}" aria-valuemin="0" aria-valuemax="100">
          <span class="ai-dash-progress-bar" style="width:${Math.max(0, Math.min(100, p.progress || 0))}%"></span>
          <span class="ai-dash-progress-val">${escapeHtml(String(p.progress || 0))}%</span>
        </div>
      </li>`).join('')}</ul>`;
  }

  function renderAgentAutomations(agent) {
    const autos = agent?.automations || [];
    if (!autos.length) {
      return `<p class="ai-dash-empty">${escapeHtml(t('adminPage.aiDashNoAutomations'))}</p>`;
    }
    return `<ul class="ai-dash-auto-list">${autos.map((a) => {
      const daysHint = a.daysUntil != null
        ? ` <span class="ai-dash-muted">(${escapeHtml(t('adminPage.aiDashInDays', { n: a.daysUntil }))})</span>`
        : '';
      return `
        <li>
          <span class="ai-dash-auto-name">${a.num ? `#${escapeHtml(a.num)} · ` : ''}${escapeHtml(a.name)}</span>
          ${a.task ? `<span class="ai-dash-muted">${escapeHtml(a.task)}</span>` : ''}
          ${a.nextRun ? `<span class="ai-dash-auto-next">${escapeHtml(t('adminPage.aiDashNextRun'))}: ${escapeHtml(a.nextRun)}${daysHint}</span>` : ''}
        </li>`;
    }).join('')}</ul>`;
  }

  function renderMember(agent, isCeo) {
    if (!agent) return '';
    const sc = statusClass(agent.status);
    return `
      <article class="ai-dash-member ai-dash-status--${sc}${isCeo ? ' is-ceo' : ''}" data-agent-id="${escapeHtml(agent.id)}">
        <header class="ai-dash-member-head">
          <span class="ai-dash-emoji" aria-hidden="true">${escapeHtml(agent.emoji || '🤖')}</span>
          <div class="ai-dash-member-id">
            <h3 class="ai-dash-member-name">${escapeHtml(agent.name)}</h3>
            <p class="ai-dash-role">${escapeHtml(agent.role || '')}</p>
          </div>
          <span class="ai-dash-badge ai-dash-badge--${sc}">${escapeHtml(agent.status)} ${escapeHtml(agent.statusLabel || '')}</span>
        </header>
        ${agent.lage ? `<p class="ai-dash-lage">${escapeHtml(agent.lage)}</p>` : ''}
        ${renderKpis(agent.kpis)}
        <section class="ai-dash-block">
          <h4>${escapeHtml(t('adminPage.aiDashProjects'))}</h4>
          ${renderProjects(agent.projects)}
        </section>
        <section class="ai-dash-block">
          <h4>${escapeHtml(t('adminPage.aiDashAutomations'))}</h4>
          ${renderAgentAutomations(agent)}
        </section>
      </article>`;
  }

  function renderDesk(ceo, openDeadlines) {
    const human = ceo?.humanTodos || [];
    const approvals = ceo?.approvalGates || [];
    const upcoming = (openDeadlines || []).filter(
      (d) => d.status === '🔴' || (typeof d.daysUntil === 'number' && d.daysUntil <= 30)
    );
    const hasContent = human.length || approvals.length || upcoming.length;
    return `
      <section class="ai-dash-desk">
        <div class="ai-dash-desk-head">
          <h2 class="ai-dash-h2">${escapeHtml(t('adminPage.aiDashDeskTitle'))}</h2>
          <p class="ai-dash-hint">${escapeHtml(t('adminPage.aiDashDeskHint'))}</p>
        </div>
        ${!hasContent ? `<p class="ai-dash-empty">${escapeHtml(t('adminPage.aiDashDeskEmpty'))}</p>` : `
        <div class="ai-dash-desk-grid">
          ${human.length ? `
            <div class="ai-dash-desk-card">
              <h3>✅ ${escapeHtml(t('adminPage.aiDashYourTasks'))}</h3>
              <ul class="ai-dash-list">${human.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
            </div>` : ''}
          ${upcoming.length ? `
            <div class="ai-dash-desk-card">
              <h3>⏰ ${escapeHtml(t('adminPage.aiDashUpcoming'))}</h3>
              <ul class="ai-dash-list">${upcoming.map((d) => `<li><strong>${escapeHtml(d.what)}</strong> — ${escapeHtml(d.due || '')}${typeof d.daysUntil === 'number' ? ` <span class="ai-dash-muted">(${escapeHtml(t('adminPage.aiDashInDays', { n: d.daysUntil }))})</span>` : ''}</li>`).join('')}</ul>
            </div>` : ''}
          ${approvals.length ? `
            <div class="ai-dash-desk-card">
              <h3>🔑 ${escapeHtml(t('adminPage.aiDashApprovals'))}</h3>
              <div class="ai-dash-chips">${approvals.map((x) => `<span class="ai-dash-chip">${escapeHtml(x)}</span>`).join('')}</div>
            </div>` : ''}
        </div>`}
      </section>`;
  }

  function renderOrgAgentNode(agent) {
    const sc = statusClass(agent.status);
    return `
      <div class="ai-dash-org-agent ai-dash-status--${sc}" title="${escapeHtml(agent.roleExplain || agent.role || '')}">
        <span class="ai-dash-emoji" aria-hidden="true">${escapeHtml(agent.emoji || '🤖')}</span>
        <div class="ai-dash-org-agent-text">
          <strong>${escapeHtml(agent.name)}</strong>
          <span class="ai-dash-muted">${escapeHtml(agent.role || '')}</span>
          ${agent.roleExplain ? `<span class="ai-dash-org-role-desc">${escapeHtml(agent.roleExplain)}</span>` : ''}
        </div>
        <span class="ai-dash-badge ai-dash-badge--${sc}">${escapeHtml(agent.status)} ${escapeHtml(agent.statusLabel || '')}</span>
      </div>`;
  }

  function renderOrgChart(data) {
    const ceo = data.ceo;
    const agents = data.agents || [];

    return `
      <section class="ai-dash-section ai-dash-org-section">
        <h2 class="ai-dash-h2">${escapeHtml(t('adminPage.aiDashOrgTitle'))}</h2>
        <p class="ai-dash-hint">${escapeHtml(t('adminPage.aiDashOrgHint'))}</p>
        <div class="ai-dash-org-tree">
          <div class="ai-dash-org-tier">
            <span class="ai-dash-org-node ai-dash-org-node--owner">${escapeHtml(data.orgChart?.owner?.emoji || '👤')} ${escapeHtml(t('adminPage.aiDashOwner'))}</span>
          </div>
          <div class="ai-dash-org-vline" aria-hidden="true"></div>
          <div class="ai-dash-org-tier">
            <span class="ai-dash-org-node ai-dash-org-node--ceo">${escapeHtml(ceo?.emoji || '🕊️')} ${escapeHtml(ceo?.name || 'Kalle')}</span>
            ${ceo?.roleExplain ? `<p class="ai-dash-org-ceo-desc">${escapeHtml(ceo.roleExplain)}</p>` : ''}
          </div>
          <div class="ai-dash-org-vline" aria-hidden="true"></div>
          <p class="ai-dash-org-branch-label">${escapeHtml(t('adminPage.aiDashTeamNodes', { n: agents.length }))}</p>
          <div class="ai-dash-org-grid">${agents.map((a) => renderOrgAgentNode(a)).join('')}</div>
        </div>
      </section>`;
  }

  function renderDashboard(data) {
    const stats = data.stats || {};
    const ceo = data.ceo;
    const agents = data.agents || [];

    const statsHtml = `
      <div class="ai-dash-stats">
        <div class="ai-dash-stat"><span class="ai-dash-stat-num">${escapeHtml(String(stats.agentsOk ?? '—'))}/${escapeHtml(String(stats.agentsTotal ?? '—'))}</span><span class="ai-dash-stat-label">${escapeHtml(t('adminPage.aiDashStatAgents'))}</span></div>
        <div class="ai-dash-stat ai-dash-stat--accent"><span class="ai-dash-stat-num">${escapeHtml(String(stats.yourTasks ?? '—'))}</span><span class="ai-dash-stat-label">${escapeHtml(t('adminPage.aiDashStatYourTasks'))}</span></div>
        <div class="ai-dash-stat"><span class="ai-dash-stat-num">${escapeHtml(String(stats.openDeadlines ?? '—'))}</span><span class="ai-dash-stat-label">${escapeHtml(t('adminPage.aiDashStatDeadlines'))}</span></div>
        <div class="ai-dash-stat"><span class="ai-dash-stat-num">${escapeHtml(String(stats.automationsLive ?? '—'))}</span><span class="ai-dash-stat-label">${escapeHtml(t('adminPage.aiDashStatAutomations'))}</span></div>
      </div>`;

    return `
      <div class="ai-dash-root">
        <p class="ai-dash-meta">${escapeHtml(t('adminPage.aiDashGenerated'))}: ${escapeHtml(data.generatedAtDe || data.generatedAt || '')}</p>
        ${statsHtml}
        ${renderDesk(ceo, data.openDeadlines || data.deadlines)}
        <section class="ai-dash-section">
          <h2 class="ai-dash-h2">${escapeHtml(t('adminPage.aiDashExecTitle'))}</h2>
          <p class="ai-dash-hint">${escapeHtml(t('adminPage.aiDashExecHint'))}</p>
          <div class="ai-dash-members">
            ${renderMember(ceo, true)}
            ${agents.map((a) => renderMember(a, false)).join('')}
          </div>
        </section>
        ${renderOrgChart(data)}
      </div>`;
  }

  function showDashboard(root, data) {
    const mount = root.querySelector('#admin-ai-dashboard-mount');
    if (!mount || !data) return;
    mount.innerHTML = renderDashboard(data);
  }

  function renderMaintenance() {
    return `
      <div class="ai-dash-root ai-dash-maintenance">
        <div class="ai-dash-desk">
          <div class="ai-dash-desk-head">
            <h2 class="ai-dash-h2">${escapeHtml(t('adminPage.aiDashboardMaintenanceTitle'))}</h2>
            <p class="ai-dash-hint">${escapeHtml(t('adminPage.aiDashboardMaintenanceBody'))}</p>
          </div>
        </div>
        <section class="ai-dash-section">
          <p class="ai-dash-empty">${escapeHtml(t('adminPage.aiDashboardMaintenanceNote'))}</p>
        </section>
      </div>`;
  }

  function showMaintenance(root) {
    const mount = root.querySelector('#admin-ai-dashboard-mount');
    if (!mount) return;
    mount.innerHTML = renderMaintenance();
  }

  async function loadDashboardIntoMount(root) {
    const wrap = root.querySelector('.admin-ai-dashboard-mount-wrap');
    wrap?.classList.add('is-loading');
    setStatus(root, '', false);

    const result = await fetchDashboardData();
    wrap?.classList.remove('is-loading');

    if (!result.ok) {
      if (result.reason === 'login') {
        setStatus(root, t('adminPage.loginRequired') || 'Bitte einloggen.', true);
      } else if (result.reason === 'forbidden') {
        setStatus(root, t('adminPage.forbidden') || 'Kein Zugriff.', true);
      } else {
        const hint = result.message ? ` (${result.message})` : '';
        setStatus(root, `${t('adminPage.aiDashboardLoadError')}${hint}`, true);
        showMaintenance(root);
      }
      return null;
    }

    showDashboard(root, result.data);
    return result.data;
  }

  function renderAiDashboardSection() {
    return `
      <section class="admin-panel profile-panel admin-ai-dashboard" id="profile-section-admin-ai-dashboard">
        <div class="admin-panel-head admin-ai-dashboard-head">
          <div>
            <p class="admin-panel-intro">${t('adminPage.aiDashboardIntro')}</p>
            <p class="admin-panel-hint ai-dash-hint">${escapeHtml(t('adminPage.aiDashboardHint'))}</p>
          </div>
        </div>
        <p class="profile-feedback admin-ai-dashboard-status" id="admin-ai-dashboard-status" hidden></p>
        <div class="admin-ai-dashboard-mount-wrap" id="admin-ai-dashboard-mount-wrap">
          <div id="admin-ai-dashboard-mount" class="admin-ai-dashboard-mount" role="region" aria-label="${escapeHtml(t('adminPage.navAiDashboard'))}"></div>
        </div>
      </section>`;
  }

  async function handleReloadClick(root) {
    const btn = root.querySelector('#admin-ai-dashboard-refresh');
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    await loadDashboardIntoMount(root);
    btn.disabled = false;
  }

  function bindAiDashboardSectionEvents(root) {
    const section = root.querySelector('#profile-section-admin-ai-dashboard');
    if (!section || section.dataset.bound === 'true') return;
    section.dataset.bound = 'true';

    section.querySelector('#admin-ai-dashboard-refresh')
      ?.addEventListener('click', () => { void handleReloadClick(section); });

    void loadDashboardIntoMount(section);
  }

  window.kiezAdminAiDashboard = {
    renderAiDashboardSection,
    bindAiDashboardSectionEvents,
  };
})();
