/* KiezQuiz — Admin: AI-Management Dashboard (nur via Supabase Edge Function, Admin-only) */
(function () {
  const POLL_INTERVAL_MS = 8000;
  const POLL_TIMEOUT_MS = 180000;

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

  async function fetchDashboardHtml() {
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

    const html = await res.text();
    return {
      ok: true,
      html,
      updated: res.headers.get('X-Dashboard-Updated') || String(Date.now()),
    };
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
      const result = await fetchDashboardHtml();
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

  function showDashboard(root, html) {
    const mount = root.querySelector('#admin-ai-dashboard-mount');
    if (!mount) return;

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const styleText = doc.querySelector('style')?.textContent || '';
    const header = doc.querySelector('header');
    const main = doc.querySelector('main');
    if (!main) return;

    let shadow = mount.shadowRoot;
    if (!shadow) {
      shadow = mount.attachShadow({ mode: 'open' });
    }

    const embedCss = `
      :host { display: block; color: #1f2328; font: 15px/1.55 system-ui, sans-serif; }
      main { max-width: none; padding: 0; }
      @media (max-width: 900px) { .three, .stats { grid-template-columns: 1fr; } }
      @media (min-width: 720px) { .stats { grid-template-columns: repeat(4, 1fr); } }
    `;

    shadow.innerHTML = `
      <style>${styleText}\n${embedCss}</style>
      ${main.outerHTML}
    `;
  }

  async function loadDashboardIntoFrame(root) {
    const wrap = root.querySelector('.admin-ai-dashboard-mount-wrap');
    wrap?.classList.add('is-loading');
    setStatus(root, t('adminPage.loading'), false);

    const result = await fetchDashboardHtml();
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

    showDashboard(root, result.html);
    setStatus(root, '', false);
    return result.updated;
  }

  function renderAiDashboardSection() {
    return `
      <section class="admin-panel profile-panel admin-ai-dashboard" id="profile-section-admin-ai-dashboard">
        <div class="admin-panel-head admin-ai-dashboard-head">
          <div>
            <p class="admin-panel-intro">${t('adminPage.aiDashboardIntro')}</p>
          </div>
          <div class="admin-ai-dashboard-actions">
            <button type="button" class="kq-btn sig" id="admin-ai-dashboard-refresh">
              ${escapeHtml(t('adminPage.aiDashboardRefreshBtn'))}
            </button>
            <button type="button" class="kq-btn ghost" id="admin-ai-dashboard-open-tab">
              ${escapeHtml(t('adminPage.aiDashboardOpenNewTab'))}
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

    const before = await fetchDashboardHtml();
    const previousUpdated = before.ok ? before.updated : null;
    const remote = await triggerRemoteRefresh();

    if (remote.ok) {
      setStatus(root, remote.message, false);
      const next = await waitForDashboardUpdate(previousUpdated);
      if (next?.html) {
        showDashboard(root, next.html);
        setStatus(root, t('adminPage.aiDashboardRefreshDone'), false);
      } else {
        await loadDashboardIntoFrame(root);
        setStatus(root, t('adminPage.aiDashboardRefreshDone'), false);
      }
    } else if (remote.reason === 'pat_missing') {
      await loadDashboardIntoFrame(root);
      setStatus(root, t('adminPage.aiDashboardPatMissing'), true);
    } else if (remote.reason === 'login') {
      setStatus(root, t('adminPage.loginRequiredBody'), true);
    } else {
      await loadDashboardIntoFrame(root);
      setStatus(root, t('adminPage.aiDashboardReloadOnly'), false);
    }

    btn.disabled = false;
  }

  async function handleOpenTabClick(root) {
    setStatus(root, t('adminPage.loading'), false);
    const result = await fetchDashboardHtml();
    if (!result.ok) {
      setStatus(root, t('adminPage.aiDashboardLoadError'), true);
      return;
    }
    const blob = new Blob([result.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const tab = window.open(url, '_blank', 'noopener,noreferrer');
    if (!tab) {
      setStatus(root, t('adminPage.aiDashboardPopupBlocked'), true);
      URL.revokeObjectURL(url);
      return;
    }
    setStatus(root, '', false);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function bindAiDashboardSectionEvents(root) {
    const section = root.querySelector('#profile-section-admin-ai-dashboard');
    if (!section || section.dataset.bound === 'true') return;
    section.dataset.bound = 'true';

    section.querySelector('#admin-ai-dashboard-refresh')
      ?.addEventListener('click', () => { void handleRefreshClick(section); });
    section.querySelector('#admin-ai-dashboard-open-tab')
      ?.addEventListener('click', () => { void handleOpenTabClick(section); });

    void loadDashboardIntoFrame(section);
  }

  window.kiezAdminAiDashboard = {
    renderAiDashboardSection,
    bindAiDashboardSectionEvents,
  };
})();
