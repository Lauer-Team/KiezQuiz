/**
 * CityWishes — Stadt-Wünsche (Gäste + Accounts) via Supabase.
 * Pro Stadt: max. 1 Wunsch/Vote alle 23 Stunden (unbegrenzt viele verschiedene Städte).
 * Fallback: localStorage wenn Supabase nicht konfiguriert ist.
 */
(function () {
  const GUEST_KEY = 'kiezquiz_guest_id';
  const LOCAL_VOTES_KEY = 'kiezquiz_city_wishes';
  const LOCAL_COOLDOWNS_KEY = 'kiezquiz_city_wish_cooldowns';
  const COOLDOWN_MS = 23 * 60 * 60 * 1000;
  const DEFAULT_VOTES = { Köln: 312, München: 287, Leipzig: 176, Stuttgart: 143, Dresden: 121 };

  function getSupabase() {
    return window.authManager?.supabase || null;
  }

  function isCloudEnabled() {
    return window.authManager?.isConfigured() && getSupabase();
  }

  function normalizeCityKey(name) {
    return name?.trim().toLowerCase() || '';
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

  function loadLocalCooldowns() {
    try {
      const saved = localStorage.getItem(LOCAL_COOLDOWNS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return {};
  }

  function persistLocalCooldowns(cooldowns) {
    try {
      localStorage.setItem(LOCAL_COOLDOWNS_KEY, JSON.stringify(cooldowns));
    } catch (e) { /* ignore */ }
  }

  function pruneLocalCooldowns(cooldowns) {
    const now = Date.now();
    const pruned = {};
    Object.entries(cooldowns || {}).forEach(([key, entry]) => {
      const nextAt = new Date(entry?.nextVoteAt || entry).getTime();
      if (nextAt > now) pruned[key] = entry;
    });
    return pruned;
  }

  function getLocalCooldownEntry(cooldowns, cityName) {
    const key = normalizeCityKey(cityName);
    const entry = cooldowns[key];
    if (!entry) return null;
    const nextAt = new Date(entry.nextVoteAt || entry);
    if (nextAt.getTime() <= Date.now()) return null;
    return {
      cityName: entry.cityName || cityName,
      nextVoteAt: nextAt.toISOString()
    };
  }

  function setLocalCooldown(cooldowns, cityName) {
    const key = normalizeCityKey(cityName);
    const nextVoteAt = new Date(Date.now() + COOLDOWN_MS).toISOString();
    cooldowns[key] = { cityName: cityName.trim(), nextVoteAt };
    return cooldowns;
  }

  function mapCooldownRows(rows) {
    const map = {};
    (rows || []).forEach((row) => {
      const name = row.city_name || row.cityName;
      const next = row.next_vote_at || row.nextVoteAt;
      if (!name || !next) return;
      const key = normalizeCityKey(name);
      map[key] = { cityName: name, nextVoteAt: next };
    });
    return map;
  }

  async function fetchCooldowns() {
    if (!isCloudEnabled()) {
      return pruneLocalCooldowns(loadLocalCooldowns());
    }

    const guestId = window.authManager?.user?.id ? null : getGuestId();
    try {
      const { data, error } = await getSupabase().rpc('get_my_city_wish_cooldowns', {
        p_guest_id: guestId
      });
      if (error) throw error;
      return mapCooldownRows(data);
    } catch (e) {
      console.warn('City wish cooldown fetch failed, using local fallback:', e);
      return pruneLocalCooldowns(loadLocalCooldowns());
    }
  }

  function isOnCooldown(cooldowns, cityName) {
    return !!getLocalCooldownEntry(cooldowns, cityName);
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
    if (!name) return { ok: false, reason: 'invalid' };

    let cooldowns = await fetchCooldowns();
    const blocked = getLocalCooldownEntry(cooldowns, name);
    if (blocked) {
      return { ok: false, reason: 'cooldown', nextVoteAt: blocked.nextVoteAt, cityName: blocked.cityName };
    }

    if (!isCloudEnabled()) {
      const votes = loadLocalVotes();
      votes[name] = (votes[name] || 0) + 1;
      persistLocal(votes);
      cooldowns = setLocalCooldown(cooldowns, name);
      persistLocalCooldowns(cooldowns);
      return { ok: true, votes, cooldowns };
    }

    const userId = window.authManager?.user?.id || null;
    const guestId = userId ? null : getGuestId();

    async function finishSuccess() {
      cooldowns = setLocalCooldown(cooldowns, name);
      if (!userId) persistLocalCooldowns(cooldowns);
      const votes = await fetchTotals();
      return { ok: true, votes, cooldowns };
    }

    try {
      const { data, error } = await getSupabase().rpc('submit_city_wish', {
        p_city_name: name,
        p_request_type: requestType,
        p_guest_id: guestId
      });
      if (error?.code === 'PGRST202') {
        const row = {
          city_name: name,
          user_id: userId,
          guest_id: guestId,
          request_type: requestType
        };
        const { error: insertError } = await getSupabase().from('city_wish_requests').insert(row);
        if (insertError) throw insertError;
        return finishSuccess();
      }
      if (error) throw error;

      const result = data || {};
      if (!result.ok) {
        if (result.reason === 'cooldown' && result.next_vote_at) {
          const key = normalizeCityKey(name);
          cooldowns[key] = { cityName: name, nextVoteAt: result.next_vote_at };
          if (!userId) persistLocalCooldowns(cooldowns);
          return {
            ok: false,
            reason: 'cooldown',
            nextVoteAt: result.next_vote_at,
            cityName: name,
            cooldowns
          };
        }
        return { ok: false, reason: result.reason || 'error' };
      }

      return finishSuccess();
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
    COOLDOWN_MS,
    normalizeCityKey,
    fetchTotals,
    fetchCooldowns,
    getCooldownEntry: getLocalCooldownEntry,
    isOnCooldown,
    submitWish,
    isAdmin,
    fetchAdminList,
    aggregateByCity,
    aggregateByUser,
    getGuestId
  };
})();
