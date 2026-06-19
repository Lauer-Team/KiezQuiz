/**
 * First-party analytics — page views + session (Supabase RPC batch).
 * Opt-out: localStorage kiezquiz_analytics_optout = '1'
 */
(function () {
  const OPT_OUT_KEY = 'kiezquiz_analytics_optout';
  const SESSION_KEY = 'kiezquiz_session_id';
  const QUEUE_KEY = 'kiez_analytics_queue';
  const FLUSH_MS = 4000;
  const MAX_QUEUE = 20;

  let flushTimer = null;
  let flushing = false;
  let sessionStarted = false;

  function isOptedOut() {
    try {
      return localStorage.getItem(OPT_OUT_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function setOptOut(optOut) {
    try {
      if (optOut) localStorage.setItem(OPT_OUT_KEY, '1');
      else localStorage.removeItem(OPT_OUT_KEY);
    } catch (_) { /* ignore */ }
  }

  function isEnabled() {
    return !isOptedOut()
      && window.authManager?.isConfigured?.()
      && window.authManager?.supabase;
  }

  function getGuestId() {
    return window.cityWishes?.getGuestId?.() || null;
  }

  function getSessionId() {
    try {
      let id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = crypto.randomUUID?.() || `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch (_) {
      return `sess-${Date.now()}`;
    }
  }

  function normalizePath(path) {
    const raw = (path || '/').split('?')[0].split('#')[0] || '/';
    if (raw.length > 1 && raw.endsWith('/')) return raw.slice(0, -1) + '/';
    return raw || '/';
  }

  function referrerHost() {
    try {
      if (!document.referrer) return null;
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (!host || host === window.location.hostname) return null;
      return host.slice(0, 120);
    } catch (_) {
      return null;
    }
  }

  function cityFromPath(path) {
    const segment = normalizePath(path).replace(/^\/+/, '').split('/')[0] || '';
    const playable = window.kiezViewRouter?.PLAYABLE || {};
    return playable[segment] ? segment : null;
  }

  function buildEvent(eventType, path, cityId) {
    const normalized = normalizePath(path || window.location.pathname || '/');
    return {
      event_type: eventType,
      path: normalized,
      referrer_host: referrerHost(),
      guest_id: getGuestId(),
      session_id: getSessionId(),
      city_id: cityId || cityFromPath(normalized),
      occurred_at: new Date().toISOString()
    };
  }

  function readQueue() {
    try {
      const raw = sessionStorage.getItem(QUEUE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeQueue(items) {
    try {
      if (!items.length) sessionStorage.removeItem(QUEUE_KEY);
      else sessionStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
    } catch (_) { /* ignore */ }
  }

  function enqueue(event) {
    if (!isEnabled() || !event) return;
    const queue = readQueue();
    queue.push(event);
    writeQueue(queue);
    scheduleFlush();
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = window.setTimeout(() => {
      flushTimer = null;
      void flush();
    }, FLUSH_MS);
  }

  async function flush() {
    if (!isEnabled() || flushing) return { ok: false, skipped: true };
    const queue = readQueue();
    if (!queue.length) return { ok: true, inserted: 0 };

    flushing = true;
    const batch = queue.slice(0, MAX_QUEUE);
    try {
      const { data, error } = await window.authManager.supabase.rpc('log_analytics_batch', {
        p_events: batch
      });
      if (error) throw error;
      const remaining = queue.slice(batch.length);
      writeQueue(remaining);
      if (remaining.length) scheduleFlush();
      return data && typeof data === 'object' ? data : { ok: true };
    } catch (err) {
      console.warn('log_analytics_batch failed:', err.message || err);
      return { ok: false, error: err.message || String(err) };
    } finally {
      flushing = false;
    }
  }

  function trackPageView(path, cityId) {
    enqueue(buildEvent('page_view', path, cityId));
  }

  function trackSessionStart() {
    if (sessionStarted) return;
    sessionStarted = true;
    enqueue(buildEvent('session_start', window.location.pathname, null));
  }

  function trackCurrentView(detail) {
    const view = detail?.view;
    const cityId = detail?.cityId || null;
    if (view === 'city' && cityId) {
      trackPageView(`/${cityId}/`, cityId);
      return;
    }
    trackPageView(window.location.pathname || '/', null);
  }

  function bindLifecycle() {
    trackSessionStart();
    trackPageView(window.location.pathname || '/', cityFromPath(window.location.pathname));

    document.addEventListener('kiez:viewchange', (ev) => {
      trackCurrentView(ev.detail || {});
    });

    window.addEventListener('pagehide', () => {
      void flush();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flush();
    });
  }

  async function linkGuestToUser() {
    if (!window.authManager?.isLoggedIn?.() || !isEnabled()) return;
    const guestId = getGuestId();
    if (!guestId) return;
    try {
      await window.authManager.supabase.rpc('link_guest_analytics', { p_guest_id: guestId });
    } catch (err) {
      console.warn('link_guest_analytics failed:', err.message || err);
    }
  }

  async function fetchAdminOverview() {
    if (!isEnabled() || !(await window.cityWishes?.isAdmin?.())) {
      return { overview: null, error: null };
    }
    try {
      const { data, error } = await window.authManager.supabase.rpc('get_admin_analytics_overview');
      if (error) throw error;
      return { overview: data?.ok === false ? null : data, error: null };
    } catch (e) {
      return { overview: null, error: e?.message || String(e) };
    }
  }

  async function fetchAdminByDay(days) {
    if (!isEnabled() || !(await window.cityWishes?.isAdmin?.())) {
      return { series: [], error: null };
    }
    try {
      const { data, error } = await window.authManager.supabase.rpc('get_admin_analytics_by_day', {
        p_days: days || 30
      });
      if (error) throw error;
      const series = Array.isArray(data?.days) ? data.days : [];
      return { series, error: null };
    } catch (e) {
      return { series: [], error: e?.message || String(e) };
    }
  }

  function legacySeriesFromByDay(series, range) {
    const dayMap = { today: 1, week: 7, month: 30, '90d': 90 };
    const slice = dayMap[range] || 7;
    const points = (series || []).slice(-slice).map((row) => ({
      t: row.day,
      label: row.day ? String(row.day).slice(5).replace('-', '.') : '',
      visitors: row.visitors || 0,
      page_views: row.page_views || 0,
      games: row.games || 0,
      gsc_clicks: row.gsc_clicks ?? 0,
      gsc_impressions: row.gsc_impressions ?? 0,
    }));
    return {
      points,
      granularity: range === 'today' ? 'hour' : 'day',
      gsc_available: true,
      range,
      legacy: true,
    };
  }

  async function fetchAdminSeries(range, actorKey) {
    if (!isEnabled() || !(await window.cityWishes?.isAdmin?.())) {
      return { meta: null, error: null };
    }
    const pRange = range || 'week';
    const pActor = actorKey || null;
    try {
      const { data, error } = await window.authManager.supabase.rpc('get_admin_analytics_series', {
        p_range: pRange,
        p_actor_key: pActor,
      });
      if (error) throw error;
      if (data?.ok === false) {
        return { meta: null, error: data.reason || 'forbidden' };
      }
      return {
        meta: {
          points: Array.isArray(data?.points) ? data.points : [],
          totals: data?.totals && typeof data.totals === 'object' ? data.totals : null,
          granularity: data?.granularity || 'day',
          gsc_available: data?.gsc_available !== false,
          range: data?.range || pRange,
          actor_key: data?.actor_key || pActor,
          legacy: false,
        },
        error: null,
      };
    } catch (e) {
      const msg = e?.message || String(e);
      if (!/get_admin_analytics_series|42883|does not exist/i.test(msg)) {
        return { meta: null, error: msg };
      }
      const days = pRange === 'today' ? 1 : pRange === 'week' ? 7 : pRange === 'month' ? 30 : 90;
      const legacy = await fetchAdminByDay(days);
      if (legacy.error) return { meta: null, error: legacy.error };
      return {
        meta: legacySeriesFromByDay(legacy.series, pRange),
        error: null,
      };
    }
  }

  async function fetchAdminActors() {
    if (!isEnabled() || !(await window.cityWishes?.isAdmin?.())) {
      return { rows: [], error: null };
    }
    try {
      const { data, error } = await window.authManager.supabase.rpc('get_admin_player_activity');
      if (error) throw error;
      return {
        rows: Array.isArray(data) ? data.map(mapActorRow) : [],
        error: null
      };
    } catch (e) {
      return { rows: [], error: e?.message || String(e) };
    }
  }

  function mapActorRow(row) {
    return {
      actorKey: row.actor_key,
      actorType: row.actor_type,
      userId: row.user_id,
      guestId: row.guest_id,
      username: row.username || '',
      registeredAt: row.registered_at || null,
      pageViewsToday: parseInt(row.page_views_today, 10) || 0,
      pageViewsWeek: parseInt(row.page_views_week, 10) || 0,
      pageViewsMonth: parseInt(row.page_views_month, 10) || 0,
      pageViewsAllTime: parseInt(row.page_views_all_time, 10) || 0,
      gamesToday: parseInt(row.games_today, 10) || 0,
      gamesWeek: parseInt(row.games_week, 10) || 0,
      gamesMonth: parseInt(row.games_month, 10) || 0,
      gamesYear: parseInt(row.games_year, 10) || 0,
      gamesAllTime: parseInt(row.games_all_time, 10) || 0,
      lastPageViewAt: row.last_page_view_at || null,
      lastPlayedAt: row.last_played_at || null
    };
  }

  window.kiezAnalytics = {
    isOptedOut,
    setOptOut,
    trackPageView,
    trackCurrentView,
    flush,
    linkGuestToUser,
    fetchAdminOverview,
    fetchAdminByDay,
    fetchAdminSeries,
    fetchAdminActors,
    mapActorRow
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindLifecycle);
  } else {
    bindLifecycle();
  }
})();
