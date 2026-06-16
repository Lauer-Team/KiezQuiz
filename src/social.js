/**
 * Friends & leaderboards — Supabase RPC wrappers (authenticated).
 */
(function () {
  function getSupabase() {
    return window.authManager?.supabase || null;
  }

  function isEnabled() {
    return window.authManager?.isConfigured?.()
      && window.authManager?.isLoggedIn?.()
      && getSupabase();
  }

  function normalizeUsernameInput(value) {
    return String(value || '').trim().replace(/^@+/, '');
  }

  function hasSupabaseClient() {
    return window.authManager?.isConfigured?.() && getSupabase();
  }

  async function ensureAuthReady() {
    await window.authManager?.waitForPendingAuthTasks?.();
  }

  async function rpc(name, params) {
    if (!isEnabled()) return { data: null, error: new Error('not_configured') };
    try {
      await ensureAuthReady();
      const { data, error } = await getSupabase().rpc(name, params || {});
      return { data, error: error || null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function rpcPublic(name, params) {
    if (!hasSupabaseClient()) return { data: null, error: new Error('not_configured') };
    try {
      await ensureAuthReady();
      const { data, error } = await getSupabase().rpc(name, params || {});
      return { data, error: error || null };
    } catch (err) {
      return { data: null, error: err };
    }
  }

  async function searchProfiles(query) {
    const { data, error } = await rpc('search_profiles_by_username', {
      p_query: normalizeUsernameInput(query)
    });
    if (error) return { rows: [], error };
    return { rows: Array.isArray(data) ? data : [], error: null };
  }

  async function sendFriendRequest(username) {
    const { data, error } = await rpc('send_friend_request', {
      p_username: normalizeUsernameInput(username)
    });
    if (error) return { ok: false, error };
    return { ...(data || {}), error: null };
  }

  async function respondFriendRequest(requestId, accept) {
    const { data, error } = await rpc('respond_friend_request', {
      p_request_id: requestId,
      p_accept: !!accept
    });
    if (error) return { ok: false, error };
    return { ...(data || {}), error: null };
  }

  async function listFriendRequests() {
    const { data, error } = await rpc('list_friend_requests');
    if (error) return { rows: [], error };
    return { rows: Array.isArray(data) ? data : [], error: null };
  }

  async function listFriends() {
    const { data, error } = await rpc('list_friends');
    if (error) return { rows: [], error };
    return { rows: Array.isArray(data) ? data : [], error: null };
  }

  const LEADERBOARD_CITIES = new Set(['hamburg', 'berlin', 'frankfurt', 'muenchen', 'duesseldorf', 'ravensburg']);

  async function getCityLeaderboard(cityId, limit) {
    const city = String(cityId || '').toLowerCase().trim();
    if (!LEADERBOARD_CITIES.has(city)) {
      return { rows: [], error: null };
    }
    const { data, error } = await rpcPublic('get_city_leaderboard', {
      p_city_id: city,
      p_limit: limit || 50
    });
    if (error) return { rows: [], error };
    return { rows: Array.isArray(data) ? data : [], error: null };
  }

  async function getFriendsLeaderboard(cityId, limit) {
    const { data, error } = await rpc('get_friends_leaderboard', {
      p_city_id: cityId,
      p_limit: limit || 50
    });
    if (error) return { rows: [], error };
    return { rows: Array.isArray(data) ? data : [], error: null };
  }

  async function deleteMyAccount() {
    const { data, error } = await rpc('delete_my_account');
    if (error) return { ok: false, error };
    return { ...(data || {}), error: null };
  }

  window.kiezSocial = {
    isEnabled,
    searchProfiles,
    sendFriendRequest,
    respondFriendRequest,
    listFriendRequests,
    listFriends,
    getCityLeaderboard,
    getFriendsLeaderboard,
    deleteMyAccount
  };
})();
