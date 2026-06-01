/* KiezQuiz — Save schema v2 + v1 migration */
(function () {
  const SAVE_KEY = 'kiezquiz_save_v2';
  const V1_XP_KEY = 'hh_xp';

  function normalizeTrophyIds(ids) {
    if (!Array.isArray(ids)) return [];
    const set = new Set(ids);
    if (set.has('island_finder')) {
      set.delete('island_finder');
      set.add('neuwerk_island');
    }
    return [...set];
  }

  function emptyCityState(progression) {
    const regionProgress = {};
    (progression || []).forEach((bz) => {
      regionProgress[bz.name] = [];
    });
    return {
      unlockedRegionIndex: 0,
      progressionMode: true,
      highScore: 0,
      trophies: [],
      regionProgress,
      gameHistory: [],
      onboardingVersionSeen: 0
    };
  }

  function createEmptySave() {
    const progression = window.cityRegistry?.getBezirkeProgression('hamburg') || [];
    return {
      saveVersion: 2,
      global: {
        xp: 0,
        streak: 0,
        bestStreak: 0,
        rankSeen: 1,
        muted: false
      },
      lastCity: null,
      lastLevelKey: 'stadtteile',
      lastMode: 'EXPLORER',
      cities: {
        hamburg: emptyCityState(progression)
      },
      savedAt: new Date().toISOString()
    };
  }

  function readV1LocalSave() {
    if (localStorage.getItem(V1_XP_KEY) === null &&
        localStorage.getItem('hh_trophies') === null &&
        localStorage.getItem('hh_achievements') === null) {
      return null;
    }

    const progression = window.cityRegistry?.getBezirkeProgression('hamburg') || [];
    const savedUnlockIdx = localStorage.getItem('hh_unlocked_bz_idx');
    let unlockedRegionIndex = 0;
    if (savedUnlockIdx !== null) {
      unlockedRegionIndex = Math.min(
        parseInt(savedUnlockIdx, 10) || 0,
        progression.length - 1
      );
    }

    const trophyRaw = localStorage.getItem('hh_trophies') || localStorage.getItem('hh_achievements');
    let trophies = [];
    if (trophyRaw) {
      try { trophies = JSON.parse(trophyRaw); } catch (e) { /* ignore */ }
    }

    const regionProgress = {};
    progression.forEach((bz) => {
      regionProgress[bz.name] = [];
      const saved = localStorage.getItem(`hh_progress_${bz.name}`);
      if (saved) {
        try { regionProgress[bz.name] = JSON.parse(saved); } catch (e) { /* ignore */ }
      }
    });

    let gameHistory = [];
    try {
      const raw = localStorage.getItem('hh_game_history');
      gameHistory = raw ? JSON.parse(raw) : [];
    } catch (e) { /* ignore */ }

    const segment = localStorage.getItem('hh_segment') || 'STADTTEILE';
    const levelKey = window.cityRegistry?.segmentToLevelKey(segment, 'hamburg') || 'stadtteile';

    return {
      saveVersion: 2,
      global: {
        xp: parseInt(localStorage.getItem('hh_xp'), 10) || 0,
        streak: parseInt(localStorage.getItem('hh_streak'), 10) || 0,
        bestStreak: parseInt(localStorage.getItem('hh_best_streak'), 10) || 0,
        rankSeen: 1,
        muted: localStorage.getItem('hamburg_muted') === 'true'
      },
      lastCity: 'hamburg',
      lastLevelKey: levelKey,
      lastMode: localStorage.getItem('hh_mode') || 'EXPLORER',
      cities: {
        hamburg: {
          unlockedRegionIndex: savedUnlockIdx !== null ? unlockedRegionIndex : undefined,
          progressionMode: localStorage.getItem('hh_progression') !== 'false',
          highScore: parseInt(localStorage.getItem('hh_highscore'), 10) || 0,
          trophies: normalizeTrophyIds(trophies),
          regionProgress,
          gameHistory,
          onboardingVersionSeen: 1
        }
      },
      migratedFromV1: true,
      savedAt: new Date().toISOString()
    };
  }

  function ensureCityBranch(save, cityId) {
    if (!save.cities[cityId]) {
      const city = window.cityRegistry?.getCity(cityId);
      save.cities[cityId] = emptyCityState(city?.progression);
    }
    return save.cities[cityId];
  }

  function loadSave() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.saveVersion === 2) {
          parsed.cities = parsed.cities || {};
          ensureCityBranch(parsed, 'hamburg');
          ensureCityBranch(parsed, 'berlin');
          ensureCityBranch(parsed, 'frankfurt');
          if (parsed.cities.hamburg) {
            parsed.cities.hamburg.trophies = normalizeTrophyIds(parsed.cities.hamburg.trophies);
          }
          return parsed;
        }
      } catch (e) { /* fall through to migration */ }
    }

    const migrated = readV1LocalSave();
    if (migrated) {
      persistSave(migrated, { skipLegacyMirror: false });
      return migrated;
    }

    const empty = createEmptySave();
    persistSave(empty, { skipLegacyMirror: true });
    return empty;
  }

  function mirrorToLegacyV1(save) {
    const hamburg = save.cities?.hamburg;
    if (!hamburg) return;

    localStorage.setItem('hh_xp', String(save.global.xp || 0));
    localStorage.setItem('hh_streak', String(save.global.streak || 0));
    localStorage.setItem('hh_best_streak', String(save.global.bestStreak || 0));
    localStorage.setItem('hh_highscore', String(hamburg.highScore || 0));
    localStorage.setItem('hh_unlocked_bz_idx', String(hamburg.unlockedRegionIndex || 0));
    localStorage.setItem('hh_progression', hamburg.progressionMode !== false ? 'true' : 'false');
    localStorage.setItem('hh_mode', save.lastMode || 'EXPLORER');
    const segment = window.cityRegistry?.levelKeyToSegment(save.lastLevelKey) || 'STADTTEILE';
    localStorage.setItem('hh_segment', segment);
    const trophies = normalizeTrophyIds(hamburg.trophies);
    localStorage.setItem('hh_trophies', JSON.stringify(trophies));
    localStorage.setItem('hh_achievements', JSON.stringify(trophies));
    localStorage.setItem('hamburg_muted', save.global.muted ? 'true' : 'false');

    const progression = window.cityRegistry?.getBezirkeProgression('hamburg') || [];
    progression.forEach((bz) => {
      const solved = hamburg.regionProgress?.[bz.name] || [];
      localStorage.setItem(`hh_progress_${bz.name}`, JSON.stringify(solved));
    });

    if (Array.isArray(hamburg.gameHistory)) {
      localStorage.setItem('hh_game_history', JSON.stringify(hamburg.gameHistory));
    }
  }

  function persistSave(save, { skipLegacyMirror = false } = {}) {
    save.saveVersion = 2;
    save.savedAt = new Date().toISOString();
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    if (!skipLegacyMirror) {
      mirrorToLegacyV1(save);
    }
  }

  function hasAnyProgress(save) {
    if (!save) return false;
    if ((save.global?.xp || 0) > 0) return true;
    return Object.values(save.cities || {}).some((city) => {
      if (!city) return false;
      if ((city.highScore || 0) > 0) return true;
      if (Array.isArray(city.trophies) && city.trophies.length > 0) return true;
      if (Array.isArray(city.gameHistory) && city.gameHistory.length > 0) return true;
      return Object.values(city.regionProgress || {}).some(
        (arr) => Array.isArray(arr) && arr.length > 0
      );
    });
  }

  function getInitialView(save) {
    if (window.kiezViewRouter) {
      return window.kiezViewRouter.getInitialViewFromSave(save);
    }
    if (save.migratedFromV1 && save.lastCity) return 'city';
    if (save.lastCity && hasAnyProgress(save)) return 'city';
    return 'hub';
  }

  function clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  window.saveManager = {
    SAVE_KEY,
    loadSave,
    persistSave,
    createEmptySave,
    emptyCityState,
    normalizeTrophyIds,
    ensureCityBranch,
    hasAnyProgress,
    getInitialView,
    clearSave,
    readV1LocalSave,
    mirrorToLegacyV1
  };
})();
