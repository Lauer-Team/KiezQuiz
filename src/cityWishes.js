/**
 * CityWishes — Stadt-Wünsche (Gäste + Accounts) via Supabase.
 * Fallback: localStorage wenn Supabase nicht konfiguriert ist.
 */
(function () {
  const GUEST_KEY = 'kiezquiz_guest_id';
  const LOCAL_VOTES_KEY = 'kiezquiz_city_wishes';
  const DEFAULT_VOTES = { Köln: 312, München: 287, Leipzig: 176, Stuttgart: 143, Dresden: 121 };

  function getSupabase() {
    return window.authManager?.supabase || null;
  }

  function isCloudEnabled() {
    return window.authManager?.isConfigured() && getSupabase();
  }

  function getGuestId() {
    try {
      let id = localStorage.getItem(GUEST_KEY);
      if (!id) {
        id = crypto.randomUUID?.() || `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(GUEST_KEY, id);
      }
      return id;
    } catch (e) {
      return `guest-${Date.now()}`;
    }
  }

  function loadLocalVotes() {
    let votes = { ...DEFAULT_VOTES };
    try {
      const saved = localStorage.getItem(LOCAL_VOTES_KEY);
      if (saved) votes = { ...DEFAULT_VOTES, ...JSON.parse(saved) };
    } catch (e) { /* ignore */ }
    return votes;
  }

  function persistLocal(votes) {
    try {
      localStorage.setItem(LOCAL_VOTES_KEY, JSON.stringify(votes));
    } catch (e) { /* ignore */ }
  }

  async function fetchTotals() {
    if (!isCloudEnabled()) return loadLocalVotes();
    try {
      const { data, error } = await getSupabase().rpc('get_city_wish_totals');
      if (error) throw error;
      const votes = { ...DEFAULT_VOTES };
      (data || []).forEach((row) => {
        votes[row.city_name] = parseInt(row.vote_count, 10) || 0;
      });
      return votes;
    } catch (e) {
      console.warn('City wish totals fetch failed, using local fallback:', e);
      return loadLocalVotes();
    }
  }

  async function submitWish(cityName, requestType = 'vote') {
    const name = cityName?.trim();
    if (!name) return { ok: false };

    if (!isCloudEnabled()) {
      const votes = loadLocalVotes();
      votes[name] = (votes[name] || 0) + 1;
      persistLocal(votes);
      return { ok: true, votes };
    }

    const userId = window.authManager?.user?.id || null;
    const guestId = userId ? null : getGuestId();
    const row = {
      city_name: name,
      user_id: userId,
      guest_id: guestId,
      request_type: requestType
    };

    try {
      const { error } = await getSupabase().from('city_wish_requests').insert(row);
      if (error) throw error;
      const votes = await fetchTotals();
      return { ok: true, votes };
    } catch (e) {
      console.warn('City wish submit failed:', e);
      return { ok: false, reason: 'error' };
    }
  }

  async function isAdmin() {
    if (!isCloudEnabled() || !window.authManager?.isLoggedIn()) return false;
    const configIds = window.SUPABASE_CONFIG?.adminUserIds;
    if (Array.isArray(configIds) && configIds.includes(window.authManager.user.id)) return true;
    try {
      const { data, error } = await getSupabase().rpc('is_city_wish_admin');
      if (error) return false;
      return !!data;
    } catch (e) {
      return false;
    }
  }

  async function fetchAdminList() {
    if (!isCloudEnabled() || !(await isAdmin())) return [];
    try {
      const { data, error } = await getSupabase()
        .from('city_wish_requests')
        .select('id, city_name, user_id, guest_id, request_type, created_at, profiles(username)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        cityName: row.city_name,
        username: row.profiles?.username || null,
        guestId: row.guest_id,
        userId: row.user_id,
        requestType: row.request_type,
        createdAt: row.created_at
      }));
    } catch (e) {
      console.warn('City wish admin list failed:', e);
      return [];
    }
  }

  window.cityWishes = {
    fetchTotals,
    submitWish,
    isAdmin,
    fetchAdminList,
    getGuestId
  };
})();
