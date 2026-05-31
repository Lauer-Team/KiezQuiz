/**
 * CloudSync — debounced Supabase-Spielstand-Synchronisation.
 */
class CloudSync {
  constructor(authManager, game) {
    this.auth = authManager;
    this.game = game;
    this._saveTimer = null;
    this._pendingData = null;
    this._saveInFlight = false;
    this.SAVE_DEBOUNCE_MS = 2000;
  }

  isEnabled() {
    return this.auth.isConfigured() && this.auth.isLoggedIn();
  }

  _isCloudEmpty(data) {
    if (!data || typeof data !== 'object') return true;
    const xp = parseInt(data.xp, 10) || 0;
    const hasTrophies = Array.isArray(data.trophies) && data.trophies.length > 0;
    const hasHistory = Array.isArray(data.gameHistory) && data.gameHistory.length > 0;
    const hasBezirk = data.bezirkProgress && Object.values(data.bezirkProgress).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );
    return xp === 0 && !hasTrophies && !hasHistory && !hasBezirk;
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

    const data = this._pendingData;
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

    return data?.save_data || null;
  }

  async handleLoginMerge() {
    if (!this.isEnabled() || !this.game?.serializeState) return;

    const localState = this.game.serializeState();
    const cloudState = await this.loadCloudSave();
    const localXp = parseInt(localState.xp, 10) || 0;
    const cloudXp = parseInt(cloudState?.xp, 10) || 0;
    const cloudEmpty = this._isCloudEmpty(cloudState);

    if (localXp === 0 && !cloudEmpty) {
      this.game.deserializeState(cloudState);
      this.game.saveState();
      if (typeof this.game.showSyncToast === 'function') {
        this.game.showSyncToast(t('sync.restored'));
      }
      return;
    }

    if (localXp > 0 && cloudEmpty) {
      await this.flushSaveNow();
      return;
    }

    if (!cloudEmpty && cloudXp > localXp) {
      this.game.deserializeState(cloudState);
      this.game.saveState();
      if (typeof this.game.showSyncToast === 'function') {
        this.game.showSyncToast(t('sync.restored'));
      }
      return;
    }

    if (!cloudEmpty && localXp > cloudXp) {
      await this.flushSaveNow();
      if (typeof this.game.showSyncToast === 'function') {
        this.game.showSyncToast(t('sync.uploaded'));
      }
      return;
    }

    if (!cloudEmpty && localXp === cloudXp && cloudState) {
      const cloudTime = cloudState.savedAt ? Date.parse(cloudState.savedAt) : 0;
      const localTime = localState.savedAt ? Date.parse(localState.savedAt) : 0;
      if (cloudTime > localTime) {
        this.game.deserializeState(cloudState);
        this.game.saveState();
      } else if (localTime > cloudTime) {
        await this.flushSaveNow();
      }
    }
  }

  async clearCloudSave() {
    if (!this.isEnabled()) return;

    const emptySave = {
      xp: 0,
      streak: 0,
      bestStreak: 0,
      highScore: 0,
      unlockedBezirkIndex: 0,
      progressionMode: true,
      currentMode: 'EXPLORER',
      activeSegment: 'STADTTEILE',
      trophies: [],
      bezirkProgress: {},
      gameHistory: [],
      muted: false,
      savedAt: new Date().toISOString()
    };

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
