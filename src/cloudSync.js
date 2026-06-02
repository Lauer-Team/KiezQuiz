/**
 * CloudSync — debounced Supabase-Spielstand-Synchronisation (v2 schema).
 */
class CloudSync {
  constructor(authManager, game) {
    this.auth = authManager;
    this.game = game;
    this._saveTimer = null;
    this._pendingData = null;
    this._saveInFlight = false;
    this._lastMergeToastAt = 0;
    this.SAVE_DEBOUNCE_MS = 2000;
    this.MERGE_TOAST_COOLDOWN_MS = 60000;
  }

  isEnabled() {
    return this.auth.isConfigured() && this.auth.isLoggedIn();
  }

  _isV2(data) {
    return data && (data.saveVersion === 2 || data.cities);
  }

  _normalizeToV2(data) {
    if (!data) return window.saveManager.createEmptySave();
    if (this._isV2(data)) {
      const save = { ...window.saveManager.createEmptySave(), ...data, saveVersion: 2 };
      save.cities = save.cities || {};
      window.saveManager.ensureCityBranch(save, 'hamburg');
      if (save.cities.hamburg) {
        save.cities.hamburg.trophies = window.saveManager.normalizeTrophyIds(save.cities.hamburg.trophies);
      }
      return save;
    }
    const progression = window.cityRegistry?.getBezirkeProgression('hamburg') || [];
    const regionProgress = data.bezirkProgress || {};
    return {
      saveVersion: 2,
      global: {
        xp: parseInt(data.xp, 10) || 0,
        streak: parseInt(data.streak, 10) || 0,
        bestStreak: parseInt(data.bestStreak, 10) || 0,
        rankSeen: 1,
        muted: !!data.muted
      },
      lastCity: 'hamburg',
      lastLevelKey: window.cityRegistry?.segmentToLevelKey(data.activeSegment || 'STADTTEILE', 'hamburg') || 'stadtteile',
      lastMode: data.currentMode || 'EXPLORER',
      cities: {
        hamburg: {
          unlockedRegionIndex: data.unlockedBezirkIndex,
          progressionMode: data.progressionMode !== false,
          highScore: parseInt(data.highScore, 10) || 0,
          trophies: window.saveManager.normalizeTrophyIds(data.trophies || []),
          regionProgress,
          gameHistory: Array.isArray(data.gameHistory) ? data.gameHistory : []
        }
      },
      savedAt: data.savedAt || new Date().toISOString()
    };
  }

  _isCloudEmpty(data) {
    const v2 = this._normalizeToV2(data);
    const xp = parseInt(v2.global?.xp, 10) || 0;
    const hamburg = v2.cities?.hamburg || {};
    const hasTrophies = Array.isArray(hamburg.trophies) && hamburg.trophies.length > 0;
    const hasHistory = Array.isArray(hamburg.gameHistory) && hamburg.gameHistory.length > 0;
    const hasBezirk = hamburg.regionProgress && Object.values(hamburg.regionProgress).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );
    return xp === 0 && !hasTrophies && !hasHistory && !hasBezirk;
  }

  _mergeRegionProgress(a, b) {
    const out = { ...(a || {}) };
    Object.entries(b || {}).forEach(([name, arr]) => {
      const set = new Set(Array.isArray(out[name]) ? out[name] : []);
      (Array.isArray(arr) ? arr : []).forEach((x) => set.add(x));
      out[name] = [...set];
    });
    return out;
  }

  _mergeCity(localCity, cloudCity) {
    const a = localCity || window.saveManager.emptyCityState(window.cityRegistry.getBezirkeProgression('hamburg'));
    const b = cloudCity || window.saveManager.emptyCityState(window.cityRegistry.getBezirkeProgression('hamburg'));
    const trophies = window.saveManager.normalizeTrophyIds([
      ...(a.trophies || []),
      ...(b.trophies || [])
    ]);
    const histories = [...(a.gameHistory || []), ...(b.gameHistory || [])];
    histories.sort((x, y) => Date.parse(y.date || 0) - Date.parse(x.date || 0));
    const mergedHistory = histories.slice(0, 50);
    return {
      unlockedRegionIndex: Math.max(a.unlockedRegionIndex || 0, b.unlockedRegionIndex || 0),
      progressionMode: a.progressionMode !== false && b.progressionMode !== false,
      highScore: Math.max(parseInt(a.highScore, 10) || 0, parseInt(b.highScore, 10) || 0),
      trophies,
      regionProgress: this._mergeRegionProgress(a.regionProgress, b.regionProgress),
      gameHistory: mergedHistory
    };
  }

  mergeSaves(localRaw, cloudRaw) {
    const local = this._normalizeToV2(localRaw);
    const cloud = this._normalizeToV2(cloudRaw);
    const cityIds = new Set([
      ...Object.keys(local.cities || {}),
      ...Object.keys(cloud.cities || {})
    ]);

    const cities = {};
    cityIds.forEach((id) => {
      cities[id] = this._mergeCity(local.cities?.[id], cloud.cities?.[id]);
    });

    const localXp = parseInt(local.global?.xp, 10) || 0;
    const cloudXp = parseInt(cloud.global?.xp, 10) || 0;
    const localTime = local.savedAt ? Date.parse(local.savedAt) : 0;
    const cloudTime = cloud.savedAt ? Date.parse(cloud.savedAt) : 0;
    const useCloudNav = cloudXp > localXp || (cloudXp === localXp && cloudTime > localTime);
    const preferCloudStreak = cloudTime > localTime;

    return {
      saveVersion: 2,
      global: {
        xp: Math.max(localXp, cloudXp),
        streak: preferCloudStreak
          ? (parseInt(cloud.global?.streak, 10) || 0)
          : (parseInt(local.global?.streak, 10) || 0),
        bestStreak: Math.max(parseInt(local.global?.bestStreak, 10) || 0, parseInt(cloud.global?.bestStreak, 10) || 0),
        rankSeen: Math.max(parseInt(local.global?.rankSeen, 10) || 1, parseInt(cloud.global?.rankSeen, 10) || 1),
        newsVersionSeen: Math.max(
          parseInt(local.global?.newsVersionSeen, 10) || 0,
          parseInt(cloud.global?.newsVersionSeen, 10) || 0
        ),
        muted: local.global?.muted ?? cloud.global?.muted ?? false
      },
      lastCity: useCloudNav ? (cloud.lastCity || local.lastCity || 'hamburg') : (local.lastCity || cloud.lastCity || 'hamburg'),
      lastLevelKey: useCloudNav ? (cloud.lastLevelKey || local.lastLevelKey) : (local.lastLevelKey || cloud.lastLevelKey),
      lastMode: useCloudNav ? (cloud.lastMode || local.lastMode) : (local.lastMode || cloud.lastMode),
      cities,
      savedAt: new Date().toISOString()
    };
  }

  scheduleSave(stateData) {
    if (!this.isEnabled()) return;
    this._pendingData = stateData;
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => this._flushSave(), this.SAVE_DEBOUNCE_MS);
  }

  async flushSaveNow() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    if (!this.isEnabled()) return;

    if (!this._pendingData && this.game?.serializeState) {
      this._pendingData = this.game.serializeState();
    }
    await this._flushSave();
  }

  async _flushSave() {
    this._saveTimer = null;
    if (!this.isEnabled() || !this._pendingData) return;

    const data = this._normalizeToV2(this._pendingData);
    this._pendingData = null;

    if (this._saveInFlight) {
      this._pendingData = data;
      this.scheduleSave(data);
      return;
    }

    this._saveInFlight = true;
    try {
      const { error } = await this.auth.supabase
        .from('game_saves')
        .upsert({
          user_id: this.auth.user.id,
          save_data: data,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) {
        console.warn('Cloud-Speichern fehlgeschlagen:', error.message);
      }
    } catch (e) {
      console.warn('Cloud-Speichern fehlgeschlagen:', e);
    } finally {
      this._saveInFlight = false;
      if (this._pendingData) {
        this.scheduleSave(this._pendingData);
      }
    }
  }

  async loadCloudSave() {
    if (!this.isEnabled()) return null;

    const { data, error } = await this.auth.supabase
      .from('game_saves')
      .select('save_data')
      .eq('user_id', this.auth.user.id)
      .maybeSingle();

    if (error) {
      console.warn('Cloud-Laden fehlgeschlagen:', error.message);
      return null;
    }

    return data?.save_data ? this._normalizeToV2(data.save_data) : null;
  }

  _showMergeToast(message) {
    if (!message || typeof this.game?.showSyncToast !== 'function') return;
    const now = Date.now();
    if (now - this._lastMergeToastAt < this.MERGE_TOAST_COOLDOWN_MS) return;
    this._lastMergeToastAt = now;
    this.game.showSyncToast(message);
  }

  async handleLoginMerge() {
    if (!this.isEnabled() || !this.game?.serializeState) return;

    const localState = this._normalizeToV2(this.game.serializeState());
    const cloudState = await this.loadCloudSave();
    const cloudEmpty = this._isCloudEmpty(cloudState);
    const localEmpty = this._isCloudEmpty(localState);

    if (localEmpty && !cloudEmpty) {
      this.game.deserializeState(cloudState);
      this.game.saveState();
      if (typeof this.game.showSyncToast === 'function') {
        this._showMergeToast(t('sync.restored'));
      }
      return;
    }

    if (!localEmpty && cloudEmpty) {
      await this.flushSaveNow();
      return;
    }

    if (!cloudEmpty && !localEmpty) {
      const merged = this.mergeSaves(localState, cloudState);
      const localXp = parseInt(localState.global?.xp, 10) || 0;
      const cloudXp = parseInt(cloudState.global?.xp, 10) || 0;
      const localTime = localState.savedAt ? Date.parse(localState.savedAt) : 0;
      const cloudTime = cloudState.savedAt ? Date.parse(cloudState.savedAt) : 0;

      if (cloudXp > localXp || (cloudXp === localXp && cloudTime > localTime)) {
        this.game.deserializeState(merged);
        this.game.saveState();
        if (typeof this.game.showSyncToast === 'function') {
          this._showMergeToast(t('sync.restored'));
        }
      } else if (localXp > cloudXp || (localXp === cloudXp && localTime > cloudTime)) {
        this.game.deserializeState(merged);
        this.game.saveState();
        await this.flushSaveNow();
      } else {
        this.game.deserializeState(merged);
        this.game.saveState();
      }
    }
  }

  async clearCloudSave() {
    if (!this.isEnabled()) return;

    const emptySave = window.saveManager.createEmptySave();

    try {
      await this.auth.supabase
        .from('game_saves')
        .upsert({
          user_id: this.auth.user.id,
          save_data: emptySave,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (e) {
      console.warn('Cloud-Löschen fehlgeschlagen:', e);
    }
  }
}
