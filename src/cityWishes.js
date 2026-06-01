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

  function mapAdminRow(row) {
    return {
      id: row.id,
      cityName: row.city_name,
      username: row.username ?? row.profiles?.username ?? null,
      guestId: row.guest_id,
      userId: row.user_id,
      requestType: row.request_type,
      createdAt: row.created_at
    };
  }

  function getUserKey(row) {
    if (row.userId) return `user:${row.userId}`;
    if (row.guestId) return `guest:${row.guestId}`;
    return 'unknown';
  }

  function getUserLabel(row) {
    if (row.username) return `@${row.username}`;
    if (row.guestId) return row.guestId.slice(0, 8) + '…';
    return '';
  }

  async function fetchAdminList() {
    if (!isCloudEnabled() || !(await isAdmin())) return { rows: [], error: null };

    const supabase = getSupabase();

    try {
      const { data, error } = await supabase.rpc('get_city_wish_admin_list');
      if (!error && Array.isArray(data)) {
        return { rows: data.map(mapAdminRow), error: null };
      }
      if (error && error.code !== 'PGRST202') throw error;
    } catch (e) {
      if (e?.code !== 'PGRST202') {
        console.warn('City wish admin RPC failed, falling back to direct select:', e);
      }
    }

    try {
      const pageSize = 1000;
      let from = 0;
      const all = [];

      while (true) {
        const { data, error } = await supabase
          .from('city_wish_requests')
          .select('id, city_name, user_id, guest_id, request_type, created_at')
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data?.length) break;
        all.push(...data.map(mapAdminRow));
        if (data.length < pageSize) break;
        from += pageSize;
      }

      return { rows: all, error: null };
    } catch (e) {
      console.warn('City wish admin list failed:', e);
      return { rows: [], error: e?.message || String(e) };
    }
  }

  function aggregateByCity(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const name = row.cityName?.trim();
      if (!name) return;
      const entry = map.get(name) || { cityName: name, votes: 0, proposals: 0, total: 0 };
      if (row.requestType === 'proposal') {
        entry.proposals += 1;
      } else {
        entry.votes += 1;
      }
      entry.total += 1;
      map.set(name, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total || a.cityName.localeCompare(b.cityName, 'de'));
  }

  function aggregateByUser(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const key = getUserKey(row);
      let entry = map.get(key);
      if (!entry) {
        entry = {
          userKey: key,
          label: getUserLabel(row),
          username: row.username,
          isGuest: !row.userId,
          totalRequests: 0,
          cities: new Map()
        };
        map.set(key, entry);
      }
      entry.totalRequests += 1;
      const cityName = row.cityName?.trim();
      if (!cityName) return;
      const cityEntry = entry.cities.get(cityName) || { cityName, votes: 0, proposals: 0, total: 0 };
      if (row.requestType === 'proposal') {
        cityEntry.proposals += 1;
      } else {
        cityEntry.votes += 1;
      }
      cityEntry.total += 1;
      entry.cities.set(cityName, cityEntry);
    });

    return Array.from(map.values())
      .map((entry) => ({
        userKey: entry.userKey,
        label: entry.label,
        username: entry.username,
        isGuest: entry.isGuest,
        totalRequests: entry.totalRequests,
        cities: Array.from(entry.cities.values()).sort((a, b) => b.total - a.total || a.cityName.localeCompare(b.cityName, 'de'))
      }))
      .sort((a, b) => b.totalRequests - a.totalRequests || a.label.localeCompare(b.label, 'de'));
  }

  window.cityWishes = {
    fetchTotals,
    submitWish,
    isAdmin,
    fetchAdminList,
    aggregateByCity,
    aggregateByUser,
    getGuestId
  };
})();
