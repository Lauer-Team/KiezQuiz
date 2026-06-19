/* KiezQuiz — Admin: AI-Management Dashboard (JSON via Supabase Edge Function, Admin-only) */
(function () {
  const STATUS_CLASS = {
    '🟢': 'ok',
    '🟡': 'warn',
    '🔴': 'urgent',
    '⏸️': 'paused',
    '⚪': 'neutral',
  };

  let dashState = { tab: 'overview', deskFilter: 'open', deskSort: 'due' };

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

  async function triggerAgentRefresh(agentId) {
    const config = getConfig();
    const token = await getAccessToken();
    const url = functionUrl('refresh-ai-dashboard');
    if (!token || !url || !config.anonKey) {
      return { ok: false, error: 'login' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: config.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agentId: agentId || null }),
    });

    try {
      return await res.json();
    } catch (_) {
      return { ok: false, error: 'invalid_response' };
    }
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

  function runStatusClass(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'ok') return 'ok';
    if (s === 'warn') return 'warn';
    if (s === 'error') return 'urgent';
    return 'neutral';
  }

  function dueRelLabel(daysUntil) {
    if (typeof daysUntil !== 'number') return '';
    if (daysUntil < 0) return t('adminPage.aiDashOverdue');
    if (daysUntil === 0) return t('adminPage.aiDashDueToday');
    return t('adminPage.aiDashInDays', { n: daysUntil });
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

  function renderWeekBarChart(chart) {
    if (!chart?.bars?.length) return '';
    const values = chart.bars.map((b) => (b.pending ? 0 : (b.clicks ?? 0)));
    const max = Math.max(...values, 1);
    const bars = chart.bars.map((b) => {
      const clicks = b.pending ? null : (b.clicks ?? 0);
      const height = clicks == null ? 4 : Math.max(6, Math.round((clicks / max) * 100));
      const title = b.pending
        ? `${b.weekdayFull} (${b.date}) — ${t('adminPage.aiDashGscPending')}`
        : `${b.weekdayFull} (${b.date}): ${clicks} ${t('adminPage.aiDashGscClicks')}`;
      return `
        <div class="ai-dash-bar-col${b.pending ? ' is-pending' : ''}" title="${escapeHtml(title)}">
          <span class="ai-dash-bar-val">${b.pending ? '·' : escapeHtml(String(clicks))}</span>
          <span class="ai-dash-bar" style="height:${height}%"></span>
          <span class="ai-dash-bar-label">${escapeHtml(b.weekday)}</span>
        </div>`;
    }).join('');

    const lag = chart.latestDataDate
      ? t('adminPage.aiDashGscDataThrough', { date: chart.latestDataDate })
      : '';
    const total = typeof chart.total === 'number' ? chart.total : '—';

    return `
      <section class="ai-dash-block ai-dash-chart-block">
        <div class="ai-dash-chart-head">
          <h4>${escapeHtml(t('adminPage.aiDashGscWeekTitle'))}</h4>
          <span class="ai-dash-src ai-dash-src--live">${escapeHtml(chart.source || 'GSC')}</span>
        </div>
        <p class="ai-dash-chart-meta">
          ${escapeHtml(chart.weekLabel || '')}
          · ${escapeHtml(t('adminPage.aiDashGscWeekTotal', { n: total }))}
          ${lag ? ` · ${escapeHtml(lag)}` : ''}
        </p>
        <div class="ai-dash-bar-chart" role="img" aria-label="${escapeHtml(t('adminPage.aiDashGscWeekTitle'))}">
          ${bars}
        </div>
      </section>`;
  }

  function renderAgentCharts(agent) {
    const chart = agent?.charts?.gscClicksWeek;
    if (!chart) return '';
    return renderWeekBarChart(chart);
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

  function renderRoutinePills(pills) {
    if (!pills?.length) return '';
    return `
      <div class="ai-dash-routine-pills" aria-label="${escapeHtml(t('adminPage.aiDashRoutinePills'))}">
        ${pills.map((p) => {
          const rs = runStatusClass(p.lastStatus);
          return `
            <span class="ai-dash-routine-pill ai-dash-run-badge--${rs}" title="${escapeHtml(p.label || p.name || '')}">
              ♻️ ${escapeHtml(p.name || p.slug || t('adminPage.aiDashRoutinePills'))}
            </span>`;
        }).join('')}
      </div>`;
  }

  function renderProjects(projects, detailed) {
    if (!projects?.length) {
      return `<p class="ai-dash-empty">${escapeHtml(t('adminPage.aiDashNoProjects'))}</p>`;
    }
    return `<ul class="ai-dash-projects">${projects.map((p) => `
      <li class="ai-dash-project">
        <div class="ai-dash-project-head">
          <span class="ai-dash-project-title">${escapeHtml(p.title)}</span>
          <span class="ai-dash-project-meta">${escapeHtml(p.status || '')}${p.due ? ` · ${escapeHtml(p.due)}` : ''}</span>
        </div>
        ${detailed && p.summary ? `<p class="ai-dash-project-summary">${escapeHtml(p.summary)}</p>` : ''}
        ${detailed && p.note ? `<p class="ai-dash-project-note">${escapeHtml(p.note)}</p>` : ''}
        <div class="ai-dash-progress" role="progressbar" aria-valuenow="${escapeHtml(String(p.progress || 0))}" aria-valuemin="0" aria-valuemax="100">
          <span class="ai-dash-progress-bar" style="width:${Math.max(0, Math.min(100, p.progress || 0))}%"></span>
          <span class="ai-dash-progress-val">${escapeHtml(String(p.progress || 0))}%</span>
        </div>
      </li>`).join('')}</ul>`;
  }

  function filterDeskItems(items) {
    let list = [...(items || [])];
    if (dashState.deskFilter === 'open') {
      list = list.filter((x) => x.status !== 'done');
    } else if (dashState.deskFilter === 'done') {
      list = list.filter((x) => x.status === 'done');
    }
    if (dashState.deskSort === 'priority') {
      const order = { urgent: 0, warn: 1, normal: 2 };
      list.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
    } else {
      list.sort((a, b) => {
        const da = a.daysUntil;
        const db = b.daysUntil;
        if (da == null && db == null) return 0;
        if (da == null) return -1;
        if (db == null) return 1;
        return da - db;
      });
    }
    return list;
  }

  function renderDesk(data) {
    const items = filterDeskItems(data.myDeskItems || data.ceo?.myDeskItems || []);
    const filter = dashState.deskFilter;
    const sort = dashState.deskSort;

    return `
      <section class="ai-dash-desk">
        <div class="ai-dash-desk-head">
          <h2 class="ai-dash-h2">${escapeHtml(t('adminPage.aiDashDeskMergedTitle'))}</h2>
          <p class="ai-dash-hint">${escapeHtml(t('adminPage.aiDashDeskMergedHint'))}</p>
        </div>
        <div class="ai-dash-desk-toolbar">
          <div class="ai-dash-filter-group" role="group" aria-label="${escapeHtml(t('adminPage.aiDashFilterStatus'))}">
            <button type="button" class="ai-dash-filter-btn${filter === 'open' ? ' is-active' : ''}" data-desk-filter="open">${escapeHtml(t('adminPage.aiDashFilterOpen'))}</button>
            <button type="button" class="ai-dash-filter-btn${filter === 'all' ? ' is-active' : ''}" data-desk-filter="all">${escapeHtml(t('adminPage.aiDashFilterAll'))}</button>
            <button type="button" class="ai-dash-filter-btn${filter === 'done' ? ' is-active' : ''}" data-desk-filter="done">${escapeHtml(t('adminPage.aiDashFilterDone'))}</button>
          </div>
          <div class="ai-dash-filter-group" role="group" aria-label="${escapeHtml(t('adminPage.aiDashFilterSort'))}">
            <button type="button" class="ai-dash-filter-btn${sort === 'due' ? ' is-active' : ''}" data-desk-sort="due">${escapeHtml(t('adminPage.aiDashSortDue'))}</button>
            <button type="button" class="ai-dash-filter-btn${sort === 'priority' ? ' is-active' : ''}" data-desk-sort="priority">${escapeHtml(t('adminPage.aiDashSortPrio'))}</button>
          </div>
        </div>
        ${!items.length ? `<p class="ai-dash-empty">${escapeHtml(t('adminPage.aiDashDeskEmpty'))}</p>` : `
        <div class="ai-dash-table-wrap">
          <table class="ai-dash-table ai-dash-todo-table">
            <thead>
              <tr>
                <th>${escapeHtml(t('adminPage.aiDashColTask'))}</th>
                <th>${escapeHtml(t('adminPage.aiDashColDue'))}</th>
                <th>${escapeHtml(t('adminPage.aiDashColPrio'))}</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item) => {
                const rel = dueRelLabel(item.daysUntil);
                const relCls = item.daysUntil != null && item.daysUntil <= 14 ? ' is-soon' : '';
                const overCls = item.daysUntil != null && item.daysUntil < 0 ? ' is-over' : '';
                return `
                  <tr>
                    <td class="ai-dash-todo-task">
                      ${item.kind === 'deadline' ? '⏰ ' : '✅ '}${escapeHtml(item.title)}
                      ${item.note ? `<span class="ai-dash-muted ai-dash-todo-note">${escapeHtml(item.note)}</span>` : ''}
                    </td>
                    <td class="ai-dash-due-cell">
                      ${item.due ? `<span class="ai-dash-due">${escapeHtml(item.due)}</span>` : '<span class="ai-dash-muted">—</span>'}
                      ${rel ? `<span class="ai-dash-due-rel${relCls}${overCls}">${escapeHtml(rel)}</span>` : ''}
                    </td>
                    <td><span class="ai-dash-prio ai-dash-prio--${escapeHtml(item.priority || 'normal')}">${escapeHtml(item.priorityLabel || item.priority || '')}</span></td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`}
      </section>`;
  }

  function renderDataOverview(data) {
    const rows = data.dataCollectionOverview || [];
    if (!rows.length) return '';
    return `
      <section class="ai-dash-section ai-dash-data-overview">
        <h2 class="ai-dash-h2">${escapeHtml(t('adminPage.aiDashDataOverviewTitle'))}</h2>
        <p class="ai-dash-hint">${escapeHtml(t('adminPage.aiDashDataOverviewHint'))}</p>
        <div class="ai-dash-table-wrap">
          <table class="ai-dash-table">
            <thead>
              <tr>
                <th>${escapeHtml(t('adminPage.aiDashColOwner'))}</th>
                <th>${escapeHtml(t('adminPage.aiDashDataCollects'))}</th>
                <th>${escapeHtml(t('adminPage.aiDashDataFrequency'))}</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r) => `
                <tr>
                  <td>${escapeHtml(r.emoji || '')} ${escapeHtml(r.name || r.agentId || '')}</td>
                  <td>${escapeHtml(r.collects || '')}${r.note ? ` <span class="ai-dash-muted">(${escapeHtml(r.note)})</span>` : ''}</td>
                  <td>${escapeHtml(r.frequency || '')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>`;
  }

  function renderTeamNavCards(data) {
    const ceo = data.ceo;
    const agents = data.agents || [];
    const all = [ceo, ...agents].filter(Boolean);
    return `
      <section class="ai-dash-section">
        <h2 class="ai-dash-h2">${escapeHtml(t('adminPage.aiDashTeamNavTitle'))}</h2>
        <p class="ai-dash-hint">${escapeHtml(t('adminPage.aiDashTeamNavHint'))}</p>
        <div class="ai-dash-team-nav">
          ${all.map((a) => {
            const sc = statusClass(a.status);
            const isCeo = a.id === data.ceo?.id;
            return `
              <button type="button" class="ai-dash-team-card ai-dash-status--${sc}${isCeo ? ' is-ceo' : ''}" data-dash-tab="${escapeHtml(a.id)}">
                <span class="ai-dash-emoji">${escapeHtml(a.emoji || '🤖')}</span>
                <strong>${escapeHtml(a.name)}</strong>
                <span class="ai-dash-muted">${escapeHtml(a.role || '')}</span>
                <span class="ai-dash-badge ai-dash-badge--${sc}">${escapeHtml(a.status)} ${escapeHtml(a.statusLabel || '')}</span>
                ${a.lage ? `<span class="ai-dash-team-card-lage">${escapeHtml(a.lage.slice(0, 120))}${a.lage.length > 120 ? '…' : ''}</span>` : ''}
              </button>`;
          }).join('')}
        </div>
      </section>`;
  }

  function renderRefreshButton(agentId, label) {
    return `
      <button type="button" class="kq-btn kq-btn--secondary ai-dash-agent-refresh" data-agent-refresh="${escapeHtml(agentId)}" title="${escapeHtml(t('adminPage.aiDashAgentRefreshHint'))}">
        ${escapeHtml(label || t('adminPage.aiDashAgentRefresh'))}
      </button>`;
  }

  function renderMember(agent, options) {
    if (!agent) return '';
    const { isCeo = false, compact = false, minimal = false } = options || {};
    const sc = statusClass(agent.status);
    const detailed = !compact && !minimal;

    return `
      <article class="ai-dash-member ai-dash-status--${sc}${isCeo ? ' is-ceo' : ''}" data-agent-id="${escapeHtml(agent.id)}">
        <header class="ai-dash-member-head">
          <span class="ai-dash-emoji" aria-hidden="true">${escapeHtml(agent.emoji || '🤖')}</span>
          <div class="ai-dash-member-id">
            <h3 class="ai-dash-member-name">${escapeHtml(agent.name)}</h3>
            <p class="ai-dash-role">${escapeHtml(agent.role || '')}</p>
            ${agent.roleExplain ? `<p class="ai-dash-explain">${escapeHtml(agent.roleExplain)}</p>` : ''}
          </div>
          <div class="ai-dash-member-actions">
            ${renderRefreshButton(agent.id)}
            <span class="ai-dash-badge ai-dash-badge--${sc}">${escapeHtml(agent.status)} ${escapeHtml(agent.statusLabel || '')}</span>
          </div>
        </header>
        ${agent.lage ? `<p class="ai-dash-lage">${escapeHtml(agent.lage)}</p>` : ''}
        ${renderRoutinePills(agent.routinePills)}
        ${minimal ? '' : renderKpis(agent.kpis)}
        ${detailed ? renderAgentCharts(agent) : ''}
        ${minimal ? '' : `
        <section class="ai-dash-block">
          <h4>${escapeHtml(t('adminPage.aiDashProjects'))}</h4>
          ${renderProjects(agent.projects, detailed)}
        </section>`}
      </article>`;
  }

  function renderCeoBigPicture(data) {
    const ceo = data.ceo;
    if (!ceo) return '';
    const refs = (data.agents || []).map((a) => {
      const sc = statusClass(a.status);
      return `
        <button type="button" class="ai-dash-ceo-ref ai-dash-status--${sc}" data-dash-tab="${escapeHtml(a.id)}">
          <span>${escapeHtml(a.emoji || '')} ${escapeHtml(a.name)}</span>
          <span class="ai-dash-muted">${escapeHtml(a.lage ? a.lage.slice(0, 80) : a.role)}${a.lage && a.lage.length > 80 ? '…' : ''}</span>
        </button>`;
    }).join('');

    return `
      <section class="ai-dash-section">
        <h2 class="ai-dash-h2">${escapeHtml(t('adminPage.aiDashCeoTitle'))}</h2>
        <p class="ai-dash-hint">${escapeHtml(t('adminPage.aiDashCeoHint'))}</p>
        ${renderMember(ceo, { isCeo: true, minimal: true })}
        <div class="ai-dash-ceo-refs">
          <h3 class="ai-dash-h3">${escapeHtml(t('adminPage.aiDashCeoRefs'))}</h3>
          ${refs || `<p class="ai-dash-empty">${escapeHtml(t('adminPage.aiDashNoKpis'))}</p>`}
        </div>
      </section>`;
  }

  function renderStats(data) {
    const stats = data.stats || {};
    const opsConnected = data.opsDb?.connected === true;
    return `
      <div class="ai-dash-stats">
        <div class="ai-dash-stat"><span class="ai-dash-stat-num">${escapeHtml(String(stats.agentsOk ?? '—'))}/${escapeHtml(String(stats.agentsTotal ?? '—'))}</span><span class="ai-dash-stat-label">${escapeHtml(t('adminPage.aiDashStatAgents'))}</span></div>
        <div class="ai-dash-stat ai-dash-stat--accent"><span class="ai-dash-stat-num">${escapeHtml(String(stats.yourTasks ?? '—'))}</span><span class="ai-dash-stat-label">${escapeHtml(t('adminPage.aiDashStatYourTasks'))}</span></div>
        <div class="ai-dash-stat"><span class="ai-dash-stat-num">${escapeHtml(String(stats.openDeadlines ?? '—'))}</span><span class="ai-dash-stat-label">${escapeHtml(t('adminPage.aiDashStatDeadlines'))}</span></div>
        <div class="ai-dash-stat"><span class="ai-dash-stat-num">${escapeHtml(String(stats.automationsOk ?? stats.automationsLive ?? '—'))}/${escapeHtml(String(stats.automationsLive ?? '—'))}</span><span class="ai-dash-stat-label">${escapeHtml(t('adminPage.aiDashStatAutoOk'))}</span></div>
        <span class="ai-dash-ops-pill ai-dash-ops-pill--${opsConnected ? 'ok' : 'off'}">${escapeHtml(opsConnected ? t('adminPage.aiDashOpsLive') : t('adminPage.aiDashOpsOffline'))}</span>
      </div>`;
  }

  function allTabs(data) {
    const tabs = [{ id: 'overview', label: t('adminPage.aiDashTabOverview'), emoji: '📋' }];
    if (data.ceo) {
      tabs.push({ id: data.ceo.id, label: data.ceo.name, emoji: data.ceo.emoji || '🕊️' });
    }
    (data.agents || []).forEach((a) => {
      tabs.push({ id: a.id, label: a.name, emoji: a.emoji || '🤖' });
    });
    return tabs;
  }

  function renderTabBar(data) {
    const tabs = allTabs(data);
    const active = dashState.tab;
    return `
      <nav class="ai-dash-tabs" aria-label="${escapeHtml(t('adminPage.aiDashTabNav'))}">
        ${tabs.map((tab) => `
          <button type="button" class="ai-dash-tab${active === tab.id ? ' is-active' : ''}" data-dash-tab="${escapeHtml(tab.id)}">
            <span aria-hidden="true">${escapeHtml(tab.emoji)}</span>
            <span>${escapeHtml(tab.label)}</span>
          </button>`).join('')}
      </nav>`;
  }

  function renderTabContent(data) {
    const tab = dashState.tab;
    if (tab === 'overview') {
      return `
        ${renderDesk(data)}
        ${renderDataOverview(data)}
        ${renderTeamNavCards(data)}`;
    }
    if (tab === data.ceo?.id) {
      return renderCeoBigPicture(data);
    }
    const agent = (data.agents || []).find((a) => a.id === tab);
    if (agent) {
      return renderMember(agent, { isCeo: false, compact: false });
    }
    return `<p class="ai-dash-empty">${escapeHtml(t('adminPage.aiDashboardLoadError'))}</p>`;
  }

  function renderDashboard(data) {
    return `
      <div class="ai-dash-root">
        <p class="ai-dash-meta">
          ${escapeHtml(t('adminPage.aiDashGenerated'))}: ${escapeHtml(data.generatedAtDe || data.generatedAt || '')}
          ${data.pipeline?.stage1 ? `<span class="ai-dash-muted"> · ${escapeHtml(data.pipeline.stage1)}</span>` : ''}
        </p>
        ${renderStats(data)}
        ${renderTabBar(data)}
        <div class="ai-dash-tab-panel">${renderTabContent(data)}</div>
      </div>`;
  }

  function showDashboard(root, data) {
    const mount = root.querySelector('#admin-ai-dashboard-mount');
    if (!mount || !data) return;
    mount.innerHTML = renderDashboard(data);
    bindDashboardInteractions(root, data);
  }

  function bindDashboardInteractions(root, data) {
    const mount = root.querySelector('#admin-ai-dashboard-mount');
    if (!mount) return;

    mount.querySelectorAll('[data-dash-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        dashState.tab = btn.getAttribute('data-dash-tab') || 'overview';
        showDashboard(root, data);
      });
    });

    mount.querySelectorAll('[data-desk-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        dashState.deskFilter = btn.getAttribute('data-desk-filter') || 'open';
        showDashboard(root, data);
      });
    });

    mount.querySelectorAll('[data-desk-sort]').forEach((btn) => {
      btn.addEventListener('click', () => {
        dashState.deskSort = btn.getAttribute('data-desk-sort') || 'due';
        showDashboard(root, data);
      });
    });

    mount.querySelectorAll('[data-agent-refresh]').forEach((btn) => {
      btn.addEventListener('click', () => {
        void handleAgentRefresh(root, btn.getAttribute('data-agent-refresh'), data);
      });
    });
  }

  async function handleAgentRefresh(root, agentId, data) {
    const btn = root.querySelector(`[data-agent-refresh="${agentId}"]`);
    if (btn) btn.disabled = true;
    setStatus(root, t('adminPage.aiDashboardRefreshing'), false);

    const result = await triggerAgentRefresh(agentId);
    if (!result.ok) {
      const msg = result.message || result.error || t('adminPage.aiDashboardLoadError');
      setStatus(root, msg, true);
      if (btn) btn.disabled = false;
      return;
    }

    setStatus(root, result.message || t('adminPage.aiDashboardRefreshStarted'), false);

    await new Promise((r) => setTimeout(r, 8000));
    const fresh = await loadDashboardIntoMount(root);
    if (fresh) {
      setStatus(root, t('adminPage.aiDashboardRefreshDone'), false);
    }
    if (btn) btn.disabled = false;
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
          <div class="admin-ai-dashboard-actions">
            <button type="button" class="kq-btn kq-btn--secondary" id="admin-ai-dashboard-refresh">${escapeHtml(t('adminPage.aiDashboardReloadBtn'))}</button>
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
