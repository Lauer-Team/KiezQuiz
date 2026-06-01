/**
 * City best scores — Supabase RPC submit_best_score (logged-in users only).
 */
(function () {
  const VALID_CITIES = new Set(['hamburg', 'berlin', 'frankfurt']);

  function isBetterRun(a, b) {
    if (!b) return true;
    const ac = a.correct | 0;
    const bc = b.correct | 0;
    const ai = a.incorrect | 0;
    const bi = b.incorrect | 0;
    const ad = a.durationSec | 0;
    const bd = b.durationSec | 0;
    if (ac > bc) return true;
    if (ac < bc) return false;
    if (ai < bi) return true;
    if (ai > bi) return false;
    return ad < bd;
  }

  function getSupabase() {
    return window.authManager?.supabase || null;
  }

  function isEnabled() {
    return window.authManager?.isConfigured?.()
      && window.authManager?.isLoggedIn?.()
      && getSupabase();
  }

  function gameHistoryStorageKey(cityId) {
    return cityId === 'hamburg' ? 'hh_game_history' : `kq_history_${cityId}`;
  }

  async function submitBestScore(cityId, { correct, total, durationSec, mode }) {
    if (!isEnabled()) return { ok: false, skipped: true };
    const city = (cityId || '').toLowerCase().trim();
    if (!VALID_CITIES.has(city)) return { ok: false, reason: 'invalid_city' };

    const c = parseInt(correct, 10);
    const t = parseInt(total, 10);
    const d = parseInt(durationSec, 10);
    if (Number.isNaN(c) || Number.isNaN(t) || Number.isNaN(d) || t < c || c < 0 || d < 0) {
      return { ok: false, reason: 'invalid' };
    }

    try {
      const { data, error } = await getSupabase().rpc('submit_best_score', {
        p_city_id: city,
        p_correct: c,
        p_total: t,
        p_duration_sec: d,
        p_mode: mode || ''
      });
      if (error) throw error;
      return data && typeof data === 'object' ? data : { ok: true };
    } catch (err) {
      console.warn('submit_best_score failed:', err.message || err);
      return { ok: false, error: err.message || String(err) };
    }
  }

  window.kiezLeaderboard = {
    isBetterRun,
    gameHistoryStorageKey,
    submitBestScore,
    isEnabled
  };
})();
