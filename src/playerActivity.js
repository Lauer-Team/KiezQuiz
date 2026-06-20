/**
 * Player game volume — log rounds + admin analytics RPCs.
 */
(function () {
  const VALID_CITIES = new Set([
    'hamburg', 'berlin', 'frankfurt', 'muenchen', 'duesseldorf', 'ravensburg', 'europe', 'mississippi', 'wien', 'paris'
  ]);

  function getSupabase() {
    return window.authManager?.supabase || null;
  }

  function isCloudEnabled() {
    return window.authManager?.isConfigured?.() && getSupabase();
  }

  function mapAdminRow(row) {
    return window.kiezAnalytics?.mapActorRow?.(row) || {
      actorKey: row.actor_key || '',
      actorType: row.actor_type || 'unknown',
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

  function mapVolume(data) {
    if (!data || data.ok === false) return null;
    return {
      timezone: data.timezone || 'Europe/Berlin',
      today: parseInt(data.today, 10) || 0,
      week: parseInt(data.week, 10) || 0,
      month: parseInt(data.month, 10) || 0,
      year: parseInt(data.year, 10) || 0,
      allTime: parseInt(data.all_time, 10) || 0,
      playersToday: parseInt(data.players_today, 10) || 0,
      playersWeek: parseInt(data.players_week, 10) || 0,
      playersMonth: parseInt(data.players_month, 10) || 0,
      playersYear: parseInt(data.players_year, 10) || 0,
      playersAllTime: parseInt(data.players_all_time, 10) || 0,
      accounts: parseInt(data.accounts, 10) || 0,
      pageViewsToday: parseInt(data.page_views_today, 10) || 0,
      visitorsToday: parseInt(data.visitors_today, 10) || 0,
      pageViewsWeek: parseInt(data.page_views_week, 10) || 0,
      visitorsWeek: parseInt(data.visitors_week, 10) || 0,
      gscClicks7d: parseInt(data.gsc_clicks_7d, 10) || 0,
      gscImpressions7d: parseInt(data.gsc_impressions_7d, 10) || 0
    };
  }

  async function logGame(cityId, { correct, total, durationSec, mode, playedAt } = {}) {
    if (!isCloudEnabled()) return { ok: false, skipped: true };

    const city = (cityId || '').toLowerCase().trim();
    if (!VALID_CITIES.has(city)) return { ok: false, reason: 'invalid_city' };

    const guestId = !window.authManager?.isLoggedIn?.()
      ? window.cityWishes?.getGuestId?.() || null
      : null;
    if (!window.authManager?.isLoggedIn?.() && !guestId) {
      return { ok: false, skipped: true, reason: 'missing_actor' };
    }

    try {
      const { data, error } = await getSupabase().rpc('log_player_game', {
        p_city_id: city,
        p_mode: mode || '',
        p_correct: Number.isFinite(correct) ? correct : null,
        p_total: Number.isFinite(total) ? total : null,
        p_duration_sec: Number.isFinite(durationSec) ? durationSec : null,
        p_played_at: playedAt || new Date().toISOString(),
        p_guest_id: guestId
      });
      if (error) throw error;
      const payload = data && typeof data === 'object' ? data : { ok: true };
      if (payload.ok !== false) {
        window.kiezAnalytics?.trackPageView?.(`/${city}/`, city);
        void window.kiezAnalytics?.flush?.();
      }
      return payload;
    } catch (err) {
      console.warn('log_player_game failed:', err.message || err);
      return { ok: false, error: err.message || String(err) };
    }
  }

  async function fetchAdminVolume() {
    if (!isCloudEnabled() || !(await window.cityWishes?.isAdmin?.())) {
      return { volume: null, error: null };
    }

    try {
      const { data, error } = await getSupabase().rpc('get_admin_play_volume');
      if (error) throw error;
      return { volume: mapVolume(data), error: null };
    } catch (e) {
      console.warn('Admin play volume load failed:', e);
      return { volume: null, error: e?.message || String(e) };
    }
  }

  async function fetchAdminList() {
    if (!isCloudEnabled() || !(await window.cityWishes?.isAdmin?.())) {
      return { rows: [], error: null };
    }

    try {
      const { data, error } = await getSupabase().rpc('get_admin_player_activity');
      if (error) throw error;
      return {
        rows: Array.isArray(data) ? data.map(mapAdminRow) : [],
        error: null
      };
    } catch (e) {
      console.warn('Admin player activity load failed:', e);
      return { rows: [], error: e?.message || String(e) };
    }
  }

  window.kiezPlayerActivity = {
    logGame,
    fetchAdminVolume,
    fetchAdminList,
    mapAdminRow,
    mapVolume
  };
})();
