/* KiezQuiz core game controller */
// Core Game Controller
class KiezQuizGame {
  constructor() {
    this.sounds = new SoundManager();
    this.mapNav = null;
    this.view = 'hub';
    this.activeCityId = 'hamburg';
    this._save = null;
    
    // Game States
    this.xp = 0;
    this.level = 1;
    this.streak = 0;
    this.bestStreak = 0;
    this.highScore = 0;
    this.unlockedBezirkIndex = 0;
    this.progressionMode = true; // false for unlocking all at once
    this.currentMode = 'EXPLORER'; // EXPLORER, LOCATE, QUIZ, TYPE_NAME, NAME_ALL
    this.activeSegment = 'STADTTEILE'; // STADTTEILE or BEZIRKE
    
    // Progress per Bezirk: { Altona: { solved: Set() }, ... }
    this.bezirkProgress = {};
    
    // Session states
    this.currentTarget = null; 
    this.currentChoices = [];
    this.achievements = new Set();
    this.trophies = new Set();
    this.activeSelectPath = null;
    
    // --- SPORCLE ROUND STATES ---
    this.inRound = false;
    this.roundTimeLeft = ROUND_TIME_LIMIT;
    this.roundStartedAt = null;
    this.roundQuestions = [];
    this.roundIndex = 0;
    this.roundCorrect = 0;
    this.roundIncorrect = 0;
    this.roundDistrict = 'Altona'; // Currently active round district
    this.roundHistory = {}; // stadtteilName -> { correct: bool, clickedName: string }
    
    // --- TYPE_NAME Autocomplete index ---
    this.autocompleteIndex = -1;
    this.nameAllInputTimer = null;
    this._alertStyleInjected = false;
    
    // --- NAME_ALL (Sporcle Countdown Challenge) States ---
    this.timerInterval = null;
    this.nameAllTimeLeft = ROUND_TIME_LIMIT;
    this.nameAllFound = new Set();
    this.nameAllIsActive = false;
    this.nameAllActiveBezirke = [];
    
    this._sessionCityOverride = null;
    this._loadedMapCityId = null;
    this.loadState();
  }

  getProgression() {
    return window.cityRegistry.getBezirkeProgression(this.activeCityId);
  }

  getCityData() {
    return getCityDataArray(this.activeCityId);
  }

  init() {
    this._save = window.saveManager.loadSave();
    const route = window.kiezViewRouter?.resolveInitialView({ save: this._save }) || {};
    this.view = route.view || window.saveManager.getInitialView(this._save);
    this.activeCityId = route.cityId || this._save.lastCity || 'hamburg';

    const params = new URLSearchParams(window.location.search);
    const cityParam = (params.get('city') || window.kiezViewRouter?.cityFromPathname(window.location.pathname) || '').trim().toLowerCase();
    if (cityParam && window.cityRegistry.isPlayable(cityParam)) {
      this.view = 'city';
      this.activeCityId = cityParam;
      this._sessionCityOverride = cityParam;
      window.saveManager.ensureCityBranch(this._save, cityParam);
      this._applyCityBranch(this._save.cities[cityParam]);
      const hadProgress = window.saveManager.hasAnyProgress(this._save);
      const prevLastCity = this._save.lastCity;
      // Deep link: open city for this session; only persist lastCity for new users
      // or when it already matches — avoids overriding returning players' home city.
      if (!hadProgress || !prevLastCity || prevLastCity === cityParam) {
        this._save.lastCity = cityParam;
        window.saveManager.persistSave(this._save);
      }
      if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname || '/');
      }
      this.updateHeaderBadge();
      window.kiezCityDashboard?.renderContextBar(this, document.getElementById('city-context-bar'));
      this._initCityPlay();
      return;
    }

    const hubEl = document.getElementById('hub-view');
    const cityEl = document.getElementById('city-view');

    if (this.view === 'hub') {
      if (hubEl) hubEl.hidden = false;
      if (cityEl) cityEl.hidden = true;
      this.updateHeaderBadge();
      this.renderStats();
      window.kiezHub?.render(this, hubEl);
      if (window.authManager) window.authManager.updateHeaderUI();
      this._maybeShowAppNews();
      return;
    }

    this._initCityPlay();
  }

  _swapMapSvg(svgHtml, wrapper) {
    const old = wrapper.querySelector('.city-map-svg, .hamburg-map-svg');
    const temp = document.createElement('div');
    temp.innerHTML = svgHtml.trim();
    const newSvg = temp.querySelector('svg');
    if (!newSvg) return;
    if (old) {
      old.replaceWith(newSvg);
      return;
    }
    const tooltip = wrapper.querySelector('#map-tooltip');
    if (tooltip) wrapper.insertBefore(newSvg, tooltip);
    else wrapper.appendChild(newSvg);
  }

  ensureMapLabelsGroup() {
    if (!this.svg) return null;
    let labels = this.svg.querySelector('#map-labels-group');
    if (!labels) {
      labels = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      labels.setAttribute('id', 'map-labels-group');
      labels.setAttribute('style', 'pointer-events: none;');
      this.svg.appendChild(labels);
    }
    return labels;
  }

  _loadCityMap() {
    return new Promise(async (resolve) => {
      const wrapper = document.getElementById('map-wrapper');
      const city = window.cityRegistry.getCity(this.activeCityId);
      const nw = document.getElementById('neuwerk-anchor');
      const pf = document.getElementById('pfaueninsel-anchor');
      const europeStack = document.getElementById('europe-islands-stack');
      const islandEgg = city?.islandEasterEgg;
      if (nw) nw.hidden = islandEgg !== 'neuwerk';
      if (pf) pf.hidden = islandEgg !== 'pfaueninsel';
      if (europeStack) {
        europeStack.hidden = islandEgg !== 'europe';
        if (islandEgg === 'europe') this.renderEuropeIslandEggs(europeStack);
      }
      this.updateEuropeMicrostatesUI();

      if (!wrapper || !city) {
        this.svg = document.querySelector('.city-map-svg, .hamburg-map-svg');
        this.ensureMapLabelsGroup();
        resolve();
        return;
      }

      const url = city.mapSvg;
      try {
        if (!MAP_SVG_CACHE.has(url)) {
          const resp = await fetch(url);
          MAP_SVG_CACHE.set(url, await resp.text());
        }
        this._swapMapSvg(MAP_SVG_CACHE.get(url), wrapper);
        this.svg = wrapper.querySelector('.city-map-svg, .hamburg-map-svg');
      } catch (err) {
        console.error('Failed to load city map', err);
        this.svg = wrapper.querySelector('.city-map-svg, .hamburg-map-svg');
      }
      this.ensureMapLabelsGroup();
      this._loadedMapCityId = this.activeCityId;
      resolve();
    });
  }

  _initCityPlay() {
    const hubEl = document.getElementById('hub-view');
    const cityEl = document.getElementById('city-view');
    if (hubEl) hubEl.hidden = true;
    if (cityEl) {
      cityEl.hidden = false;
      const city = window.cityRegistry.getCity(this.activeCityId);
      if (city) window.cityRegistry.applyAccentVars(cityEl, city.hue);
      cityEl.dataset.city = this.activeCityId;
    }
    this.updateHeaderBadge();

    this._loadCityMap().then(() => {
      this.mapWrapper = document.querySelector('.map-container-wrapper');
      this.tooltip = document.getElementById('map-tooltip');

      if (this.svg && this.mapWrapper) {
        this.mapNav = new MapNavigator(this.svg, this.mapWrapper);
        this.reorderMapLayers();
      }

      if (this.tooltip && this.tooltip.parentElement !== document.body) {
        document.body.appendChild(this.tooltip);
      }

      window.kiezCityDashboard?.enhanceSegmentSelector();
      window.kiezCityDashboard?.renderContextBar(this, document.getElementById('city-context-bar'));

      this.setupUIListeners();
      this.setupMobileMapHint();
      if (this.svg) {
        this.initMapPaths();
        if (this.activeCityId === 'europe') {
          this.enhanceEuropeMicrostateHits();
        }
        this.buildBezirkBoundaries();
      }
      if (this.activeCityId === 'europe') {
        this.renderEuropeMicrostatesBar();
      }
      this.renderStats();

      this.setupSegmentSelectors();
      if (!this.isModeAllowedForSegment(this.currentMode)) {
        this.currentMode = 'EXPLORER';
      }
      this.applySegmentUI();
      this.updateModeLabels();
      this.syncSegmentBodyClass();
      this.setMode(this.resolveModeForCurrentSegment(this.currentMode));

      this.updateMapStates();
      this.updateIslandBadges();

      if (!this._audioPrimed) {
        const primeAudio = () => this.sounds.init();
        document.addEventListener('click', primeAudio);
        document.addEventListener('keydown', primeAudio);
        document.addEventListener('touchstart', primeAudio, { passive: true });
        document.addEventListener('keydown', (e) => this.handleQuizKeydown(e));
        this._audioPrimed = true;
      }

      this._maybeShowAppNews();
    });
  }

  _hasAppNewsContent() {
    const title = t('appNews.title');
    return !!(title && title !== 'appNews.title' && String(title).trim());
  }

  shouldShowAppNews() {
    const version = typeof APP_NEWS_VERSION === 'number' ? APP_NEWS_VERSION : 0;
    if (!version || !this._hasAppNewsContent()) return false;
    const seen = parseInt(this._save?.global?.newsVersionSeen, 10) || 0;
    return seen < version;
  }

  markAppNewsSeen() {
    const version = typeof APP_NEWS_VERSION === 'number' ? APP_NEWS_VERSION : 0;
    if (!this._save.global) this._save.global = {};
    this._save.global.newsVersionSeen = version;
    window.saveManager.persistSave(this._save);
  }

  _maybeShowAppNews() {
    if (this._appNewsShownThisSession) return;
    if (!this.shouldShowAppNews()) return;
    this._appNewsShownThisSession = true;
    this.showAppNews();
  }

  showHub(persistNav = true) {
    if (this.inRound || this.nameAllIsActive) {
      if (!confirm(t('game.confirmSegmentSwitch'))) return;
      this.endRound(false);
      this.stopNameAllChallenge(false);
    }
    this.view = 'hub';
    if (persistNav) {
      this._syncToSaveObject();
      this._save.lastCity = this.activeCityId;
      window.saveManager.persistSave(this._save);
    }
    window.kiezCityDashboard?.closeSwitcher();
    const hubEl = document.getElementById('hub-view');
    const cityEl = document.getElementById('city-view');
    if (cityEl) cityEl.hidden = true;
    if (hubEl) {
      hubEl.hidden = false;
      window.kiezHub?.render(this, hubEl);
    }
    if (window.authManager) window.authManager.updateHeaderUI();
  }

  enterCity(cityId, persistNav = true) {
    const run = () => {
      const city = window.cityRegistry.getCity(cityId);
      if (!city || city.status !== 'playable') {
        this.showComingSoonToast(cityId);
        return;
      }
      if (this.view === 'city' && cityId !== this.activeCityId) {
        this._syncToSaveObject();
      }
      this.activeCityId = cityId;
      this._sessionCityOverride = null;
      this.view = 'city';
      window.saveManager.ensureCityBranch(this._save, cityId);
      this._applyCityBranch(this._save.cities[cityId]);
      if (persistNav) {
        this._save.lastCity = cityId;
        window.saveManager.persistSave(this._save);
      }
      this._initCityPlay();
    };
    if (typeof window.loadGameBundle === 'function') {
      window.loadGameBundle().then(run);
      return;
    }
    run();
  }

  showComingSoonToast(cityId) {
    const city = window.cityRegistry.getCity(cityId);
    const name = city?.name || cityId;
    this.showSyncToast(t('hub.comingSoonToast', { city: name }));
  }

  syncHubStats() {
    window.kiezHub?.updateStats(this);
  }

  switchSegment(segment) {
    if (this.activeSegment === segment) return;
    this.playSelectionSound();
    this.activeSegment = segment;
    this.saveState();
    this.applySegmentUI();
    this.resetMapClasses();
    this.clearMapTextLabels();
    this.updateMapStates();
    this.syncSegmentBodyClass();
    this.setMode(this.resolveModeForCurrentSegment(this.currentMode));
    window.kiezCityDashboard?.updateBreadcrumb(this);
  }

  setupSegmentSelectors() {
    const selector = document.querySelector('#city-view .segment-selector');
    if (!selector || selector.dataset.bound === 'true') return;

    const btnSt = document.getElementById('btn-segment-stadtteile');
    const btnBz = document.getElementById('btn-segment-bezirke');
    if (btnSt && btnBz) {
      selector.dataset.bound = 'true';
      btnSt.addEventListener('click', () => {
        if (this.inRound || this.nameAllIsActive) {
          if (!confirm(t('game.confirmSegmentSwitch'))) return;
          this.endRound(false);
          this.stopNameAllChallenge(false);
        }
        this.switchSegment('STADTTEILE');
      });

      btnBz.addEventListener('click', () => {
        if (this.inRound || this.nameAllIsActive) {
          if (!confirm(t('game.confirmSegmentSwitch'))) return;
          this.endRound(false);
          this.stopNameAllChallenge(false);
        }
        this.switchSegment('BEZIRKE');
      });
    }
  }

  setupMobileMapHint() {
    const hint = document.getElementById('map-hint-text');
    if (!hint) return;
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    hint.textContent = isTouch ? t('map.hintTouch') : t('map.hintDesktop');
  }

  setupUIListeners() {
    // Mode Buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        
        if (this.inRound || this.nameAllIsActive) {
          if (!confirm(t('game.confirmModeSwitch'))) return;
          this.endRound(false);
          this.stopNameAllChallenge(false);
        }
        
        this.playSelectionSound();
        this.setMode(mode);
      });
    });

    // Zoom Buttons
    document.getElementById('btn-zoom-in').addEventListener('click', () => this.mapNav.zoomIn());
    document.getElementById('btn-zoom-out').addEventListener('click', () => this.mapNav.zoomOut());
    document.getElementById('btn-zoom-reset').addEventListener('click', () => {
      if (this.inRound || this.nameAllIsActive) this.zoomMapToGameArea();
      else this.mapNav.reset();
    });

    // Game history & Settings
    const historyBtn = document.getElementById('btn-history');
    if (historyBtn && historyBtn.dataset.bound !== 'true') {
      historyBtn.dataset.bound = 'true';
      historyBtn.addEventListener('click', () => this.showGameHistory());
    }
    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn && settingsBtn.dataset.bound !== 'true') {
      settingsBtn.dataset.bound = 'true';
      settingsBtn.addEventListener('click', () => this.showSettings());
    }

    const langBtn = document.getElementById('btn-lang');
    if (langBtn && langBtn.dataset.bound !== 'true') {
      langBtn.dataset.bound = 'true';
      this.updateLangButton(langBtn);
      langBtn.addEventListener('click', () => {
        setLocale(getLocale() === 'de' ? 'en' : 'de');
      });
    }

    // Sound Toggle
    const muteBtn = document.getElementById('btn-mute');
    muteBtn.innerHTML = this.sounds.muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', () => {
      const isMuted = this.sounds.toggleMute();
      muteBtn.innerHTML = isMuted ? '🔇' : '🔊';
    });
    
    const nwAnchor = document.getElementById('neuwerk-anchor');
    if (nwAnchor && nwAnchor.dataset.bound !== 'true') {
      nwAnchor.dataset.bound = 'true';
      nwAnchor.addEventListener('click', () => {
        this.playSelectionSound();
        if (this.activeSegment === 'BEZIRKE') {
          this.activeSegment = 'STADTTEILE';
          const btnSt = document.getElementById('btn-segment-stadtteile');
          const btnBz = document.getElementById('btn-segment-bezirke');
          if (btnSt) btnSt.classList.add('active');
          if (btnBz) btnBz.classList.remove('active');
        }
        this.selectNeighbourhoodByName('Neuwerk');
        this.unlockTrophy('neuwerk_island', t('trophies.neuwerk_island.unlockTitle'), t('trophies.neuwerk_island.unlockDesc'));
      });
    }

    const pfAnchor = document.getElementById('pfaueninsel-anchor');
    if (pfAnchor && pfAnchor.dataset.bound !== 'true') {
      pfAnchor.dataset.bound = 'true';
      pfAnchor.addEventListener('click', () => {
        this.playSelectionSound();
        if (this.activeSegment === 'BEZIRKE') {
          this.activeSegment = 'STADTTEILE';
          const btnSt = document.getElementById('btn-segment-stadtteile');
          const btnBz = document.getElementById('btn-segment-bezirke');
          if (btnSt) btnSt.classList.add('active');
          if (btnBz) btnBz.classList.remove('active');
        }
        this.selectNeighbourhoodByName('Pfaueninsel');
        this.unlockTrophy('pfaueninsel_island', t('trophies.pfaueninsel_island.unlockTitle'), t('trophies.pfaueninsel_island.unlockDesc'));
      });
    }

    // Toggle Progression / All mode
    const toggleProgBtn = document.getElementById('toggle-progression');
    if (toggleProgBtn) {
      toggleProgBtn.checked = !this.progressionMode;
      toggleProgBtn.addEventListener('change', (e) => {
        this.progressionMode = !e.target.checked;
        this.updateMapStates();
        this.renderStats();
        if (this.currentMode !== 'EXPLORER' && !this.inRound && !this.nameAllIsActive) {
          this.nextQuestion();
        }
      });
    }
  }

  _syncToSaveObject() {
    if (!this._save) this._save = window.saveManager.loadSave();
    const progression = this.getProgression();
    const regionProgress = {};
    progression.forEach((bz) => {
      regionProgress[bz.name] = [...(this.bezirkProgress[bz.name]?.solved || [])];
    });
    this._save.global = {
      ...this._save.global,
      xp: this.xp,
      streak: this.streak,
      bestStreak: this.bestStreak,
      rankSeen: this.level,
      muted: this.sounds.muted
    };
    this._save.lastCity = this.activeCityId;
    this._save.lastLevelKey = window.cityRegistry.segmentToLevelKey(this.activeSegment, this.activeCityId);
    this._save.lastMode = this.currentMode;
    window.saveManager.ensureCityBranch(this._save, this.activeCityId);
    this._save.cities[this.activeCityId] = {
      ...this._save.cities[this.activeCityId],
      unlockedRegionIndex: this.unlockedBezirkIndex,
      progressionMode: this.progressionMode,
      highScore: this.highScore,
      trophies: window.saveManager.normalizeTrophyIds([...this.trophies]),
      regionProgress,
      gameHistory: this.loadGameHistory()
    };
    this._save.savedAt = new Date().toISOString();
  }

  serializeState() {
    this._syncToSaveObject();
    return JSON.parse(JSON.stringify(this._save));
  }

  _applyCityBranch(cityData) {
    if (!cityData) return;
    this.unlockedBezirkIndex = 0;
    if (cityData.unlockedRegionIndex != null) {
      this.unlockedBezirkIndex = Math.min(
        parseInt(cityData.unlockedRegionIndex, 10) || 0,
        this.getProgression().length - 1
      );
    } else if (this.xp > 0) {
      for (let i = this.getProgression().length - 1; i >= 0; i--) {
        if (this.xp >= this.getProgression()[i].xpNeeded) {
          this.unlockedBezirkIndex = i;
          break;
        }
      }
    }
    this.progressionMode = cityData.progressionMode !== false;
    this.highScore = parseInt(cityData.highScore, 10) || 0;

    this.trophies = new Set();
    this.achievements = new Set();
    if (Array.isArray(cityData.trophies)) {
      window.saveManager.normalizeTrophyIds(cityData.trophies).forEach((id) => {
        this.trophies.add(id);
        this.achievements.add(id);
      });
    }

    this.getProgression().forEach((bz) => {
      this.bezirkProgress[bz.name] = { solved: new Set() };
      const saved = cityData.regionProgress?.[bz.name] ?? cityData.bezirkProgress?.[bz.name];
      if (Array.isArray(saved)) {
        saved.forEach((st) => this.bezirkProgress[bz.name].solved.add(st));
      }
    });

    if (Array.isArray(cityData.gameHistory)) {
      const key = this.activeCityId === 'hamburg' ? 'hh_game_history' : `kq_history_${this.activeCityId}`;
      localStorage.setItem(key, JSON.stringify(cityData.gameHistory));
    }
  }

  deserializeState(data) {
    if (!data) return;

    if (data.saveVersion === 2 || data.cities) {
      this._save = data.saveVersion === 2 ? data : { ...window.saveManager.createEmptySave(), ...data, saveVersion: 2 };
      const g = this._save.global || {};
      this.xp = parseInt(g.xp, 10) || 0;
      this.streak = parseInt(g.streak, 10) || 0;
      this.bestStreak = parseInt(g.bestStreak, 10) || 0;
      this.level = this.calculateLevel(this.xp);
      const storedRankSeen = parseInt(g.rankSeen, 10) || 1;
      if (storedRankSeen < this.level && this._save.global) {
        this._save.global.rankSeen = this.level;
      }
      this.activeCityId = this._sessionCityOverride || this._save.lastCity || 'hamburg';
      const savedMode = this._save.lastMode || 'EXPLORER';
      this.currentMode = savedMode === 'BEZIRK_MATCH' ? 'EXPLORER' : savedMode;
      this.activeSegment = window.cityRegistry.levelKeyToSegment(this._save.lastLevelKey || 'stadtteile');
      this._applyCityBranch(
        this._save.cities[this.activeCityId] || this._save.cities.hamburg
      );
      if (typeof g.muted === 'boolean') {
        this.sounds.muted = g.muted;
        const muteBtn = document.getElementById('btn-mute');
        if (muteBtn) muteBtn.innerHTML = g.muted ? '🔇' : '🔊';
      }
      return;
    }

    this.xp = parseInt(data.xp, 10) || 0;
    this.streak = parseInt(data.streak, 10) || 0;
    this.bestStreak = parseInt(data.bestStreak, 10) || 0;
    this.level = this.calculateLevel(this.xp);
    this.progressionMode = data.progressionMode !== false;

    if (data.unlockedBezirkIndex != null) {
      this.unlockedBezirkIndex = Math.min(
        parseInt(data.unlockedBezirkIndex, 10) || 0,
        this.getProgression().length - 1
      );
    } else {
      this.unlockedBezirkIndex = 0;
      for (let i = this.getProgression().length - 1; i >= 0; i--) {
        if (this.xp >= this.getProgression()[i].xpNeeded) {
          this.unlockedBezirkIndex = i;
          break;
        }
      }
    }

    const savedMode = data.currentMode || 'EXPLORER';
    this.currentMode = savedMode === 'BEZIRK_MATCH' ? 'EXPLORER' : savedMode;
    this.activeSegment = data.activeSegment || 'STADTTEILE';

    this.trophies = new Set();
    this.achievements = new Set();
    if (Array.isArray(data.trophies)) {
      window.saveManager.normalizeTrophyIds(data.trophies).forEach((id) => {
        this.trophies.add(id);
        this.achievements.add(id);
      });
    }

    this.getProgression().forEach((bz) => {
      this.bezirkProgress[bz.name] = { solved: new Set() };
      const saved = data.bezirkProgress?.[bz.name];
      if (Array.isArray(saved)) {
        saved.forEach((st) => this.bezirkProgress[bz.name].solved.add(st));
      }
    });

    if (Array.isArray(data.gameHistory)) {
      localStorage.setItem('hh_game_history', JSON.stringify(data.gameHistory));
    }

    if (typeof data.muted === 'boolean') {
      this.sounds.muted = data.muted;
      localStorage.setItem('hamburg_muted', data.muted ? 'true' : 'false');
      const muteBtn = document.getElementById('btn-mute');
      if (muteBtn) muteBtn.innerHTML = data.muted ? '🔇' : '🔊';
    }

    this._save = window.saveManager.createEmptySave();
    this._syncToSaveObject();
  }

  loadState() {
    const save = window.saveManager.loadSave();
    this._save = save;
    this.deserializeState(save);
  }

  saveState() {
    this._syncToSaveObject();
    window.saveManager.persistSave(this._save);
    if (window.cloudSync) {
      window.cloudSync.scheduleSave(this.serializeState());
    }
  }

  calculateLevel(xp) {
    let currentLvl = 1;
    for (const rank of getRanks()) {
      if (xp >= rank.minXp) {
        currentLvl = rank.level;
      }
    }
    return currentLvl;
  }

  // Award XP to player and handle leveling up
  addXp(amount, options = {}) {
    const { quiet = false } = options;
    const gained = amount * (this.streak >= 5 ? 2 : (this.streak >= 3 ? 1.5 : 1));
    const roundedGained = Math.round(gained);
    this.xp += roundedGained;
    
    if (this.xp > this.highScore) {
      this.highScore = this.xp;
    }
    
    const newLvl = this.calculateLevel(this.xp);
    if (newLvl > this.level) {
      this.level = newLvl;
      this.sounds.playLevelUp();
      if (!quiet) this.showLevelUpModal(newLvl);
    }
    
    this.saveState();
    if (!quiet) this.renderStats();
    return roundedGained;
  }

  resetStreak() {
    this.streak = 0;
    this.renderStats();
    this.saveState();
  }

  incrementStreak() {
    this.streak++;
    if (this.streak > this.bestStreak) {
      this.bestStreak = this.streak;
    }
    this.renderStats();
    this.saveState();
  }

  getLastUnlockedBezirk() {
    return this.getProgression()[this.unlockedBezirkIndex]?.name || this.getProgression()[0].name;
  }

  tryUnlockNextBezirk(frontierCorrect, frontierTotal) {
    if (!this.progressionMode) return null;
    if (frontierTotal <= 0) return null;
    const frontierPercent = Math.round((frontierCorrect / frontierTotal) * 100);
    if (frontierPercent < 75) return null;
    if (this.unlockedBezirkIndex >= this.getProgression().length - 1) return null;

    const nextBezirk = this.getProgression()[this.unlockedBezirkIndex + 1];
    this.unlockedBezirkIndex++;
    this.saveState();
    this.updateMapStates();
    return nextBezirk.name;
  }

  getFrontierRoundScore() {
    const frontierBezirk = this.getLastUnlockedBezirk();
    let correct = 0;
    let total = 0;

    for (const q of this.roundQuestions) {
      const belongsToFrontier = this.activeSegment === 'BEZIRKE'
        ? q.name === frontierBezirk
        : q.bezirk === frontierBezirk;
      if (!belongsToFrontier) continue;
      total++;
      if (this.roundHistory[q.name]?.correct) correct++;
    }
    return { correct, total };
  }

  // Get list of currently unlocked Bezirke based on progression
  getUnlockedBezirke() {
    if (!this.progressionMode) {
      return this.getProgression().map(b => b.name);
    }
    if (this.activeSegment === 'BEZIRKE') {
      return this.getProgression().map(b => b.name);
    }
    // Europe capitals: all countries available without Bezirk progression
    if (this.activeCityId === 'europe' && this.activeSegment === 'STADTTEILE') {
      return this.getProgression().map(b => b.name);
    }
    return this.getProgression()
      .slice(0, this.unlockedBezirkIndex + 1)
      .map(b => b.name);
  }

  // Check if a specific stadtteil name is in unlocked Bezirke
  isStadtteilUnlocked(name) {
    const info = this.getCityData().find(d => d.name === name);
    if (!info) return false;
    return this.getUnlockedBezirke().includes(info.bezirk);
  }

  getPathByNeighbourhoodName(name) {
    if (!name || !this.svg) return null;
    return this.svg.querySelector(
      `.stadtteil-path[data-name="${CSS.escape(name)}"]`
    );
  }

  markStadtteilSolved(name) {
    const info = this.getCityData().find(d => d.name === name);
    if (!info || info.is_island) return;
    const progress = this.bezirkProgress[info.bezirk];
    if (!progress) return;
    progress.solved.add(name);
    this.saveState();
  }

  getBezirkCssKey(bezirkName) {
    const map = {
      Altona: 'altona',
      Bergedorf: 'bergedorf',
      'Eimsbüttel': 'eimsbuettel',
      'Hamburg-Mitte': 'hamburg-mitte',
      'Hamburg-Nord': 'hamburg-nord',
      Harburg: 'harburg',
      Wandsbek: 'wandsbek'
    };
    return map[bezirkName] || bezirkName.toLowerCase().replace(/\s+/g, '-');
  }

  isModeAllowedForSegment(mode) {
    if (this.activeSegment === 'BEZIRKE') {
      return !BEZIRKE_SEGMENT_HIDDEN_MODES.includes(mode);
    }
    const cfg = getCityConfig(this.activeCityId);
    if (cfg.hideLocateInCapitals && mode === 'LOCATE') return false;
    return true;
  }

  resolveModeForCurrentSegment(mode = this.currentMode) {
    return this.isModeAllowedForSegment(mode) ? mode : 'EXPLORER';
  }

  updateModeVisibility() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      const mode = btn.dataset.mode;
      const hidden = !this.isModeAllowedForSegment(mode);
      btn.style.display = hidden ? 'none' : '';
    });
  }

  syncSegmentBodyClass() {
    document.body.classList.toggle('segment-bezirke', this.activeSegment === 'BEZIRKE');
    document.body.classList.toggle('segment-stadtteile', this.activeSegment === 'STADTTEILE');
  }

  applySegmentUI() {
    const btnSt = document.getElementById('btn-segment-stadtteile');
    const btnBz = document.getElementById('btn-segment-bezirke');
    const lockCard = document.getElementById('unlocker-card-container');
    if (btnSt && btnBz) {
      if (this.activeSegment === 'BEZIRKE') {
        btnBz.classList.add('active');
        btnSt.classList.remove('active');
        if (lockCard) lockCard.style.display = 'none';
      } else {
        btnSt.classList.add('active');
        btnBz.classList.remove('active');
        const hideUnlock = this.activeCityId === 'europe';
        if (lockCard) lockCard.style.display = hideUnlock ? 'none' : 'block';
      }
    }
    this.updateModeVisibility();
    this.updateLocateModeLabel();
  }

  getDetailUnitSuffix() {
    return getCityConfig(this.activeCityId).detailUnit;
  }

  updateLocateModeLabel() {
    const locateBtn = document.getElementById('mode-locate');
    if (!locateBtn) return;
    const labelRow = locateBtn.querySelector('div');
    if (!labelRow) return;
    const spans = labelRow.querySelectorAll('span');
    if (spans[0]) {
      if (this.activeSegment === 'BEZIRKE') {
        spans[0].textContent = this.isEuropeCountriesMode()
          ? t('modes.locate.labelCountry')
          : t('modes.locate.labelBezirk');
      } else if (getCityConfig(this.activeCityId).detailUnit === 'Ortsteil') {
        spans[0].textContent = t('modes.locate.labelOrtsteil');
      } else if (getCityConfig(this.activeCityId).detailUnit === 'Capital') {
        spans[0].textContent = t('modes.locate.labelCapital');
      } else {
        spans[0].textContent = t('modes.locate.label');
      }
    }
    if (spans[1]) {
      if (this.activeSegment === 'BEZIRKE') {
        spans[1].textContent = this.isEuropeCountriesMode()
          ? t('modes.locate.descCountry')
          : t('modes.locate.descBezirk');
      } else if (getCityConfig(this.activeCityId).detailUnit === 'Ortsteil') {
        spans[1].textContent = t('modes.locate.descOrtsteil');
      } else if (getCityConfig(this.activeCityId).detailUnit === 'Capital') {
        spans[1].textContent = t('modes.locate.descCapital');
      } else {
        spans[1].textContent = t('modes.locate.desc');
      }
    }
  }

  updateModeLabels() {
    const map = {
      EXPLORER: ['modes.explorer.label', 'modes.explorer.desc'],
      LOCATE: ['modes.locate.label', 'modes.locate.desc'],
      QUIZ: ['modes.quiz.label', 'modes.quiz.desc'],
      TYPE_NAME: ['modes.typeName.label', 'modes.typeName.desc'],
      NAME_ALL: ['modes.nameAll.label', 'modes.nameAll.desc']
    };
    document.querySelectorAll('.mode-btn').forEach(btn => {
      const mode = btn.dataset.mode;
      const keys = map[mode];
      if (!keys) return;
      const icon = btn.querySelector('.mode-icon');
      if (icon && MODE_ICONS[mode]) icon.textContent = MODE_ICONS[mode];
      const col = btn.querySelector(':scope > div');
      if (!col) return;
      const spans = col.querySelectorAll(':scope > span');
      if (spans[0]) spans[0].textContent = t(keys[0]);
      if (spans[1]) spans[1].textContent = t(keys[1]);
    });
    if (this.isEuropeCapitalsMode()) {
      const quizBtn = document.getElementById('mode-quiz');
      const col = quizBtn?.querySelector(':scope > div');
      const spans = col?.querySelectorAll(':scope > span');
      if (spans?.[0]) spans[0].textContent = t('modes.quiz.labelCapital');
      if (spans?.[1]) spans[1].textContent = t('modes.quiz.descCapital');
    }
    this.updateLocateModeLabel();
  }

  reRenderCurrentView() {
    applyToDom();
    if (window.authManager) window.authManager.updateHeaderUI();
    if (this.view === 'hub') {
      const hubEl = document.getElementById('hub-view');
      if (hubEl && !hubEl.hidden) window.kiezHub?.render(this, hubEl);
      return;
    }
    if (this._loadedMapCityId !== this.activeCityId) {
      this._initCityPlay();
      return;
    }
    this.updateHeaderBadge();
    window.kiezCityDashboard?.renderContextBar(this, document.getElementById('city-context-bar'));
    window.kiezCityDashboard?.enhanceSegmentSelector();
    this.setupSegmentSelectors();
    this.renderStats();
    this.applySegmentUI();
    this.updateModeLabels();
    this.updateIslandBadges();
    this.setupMobileMapHint();
    window.kiezCityDashboard?.updateBreadcrumb(this);
    if (!this.inRound && !this.nameAllIsActive) {
      this.nextQuestion();
    }
  }

  recordRoundProgress(stadtteilName, options = {}) {
    if (!stadtteilName) return;
    const { skipMapRefresh = false, skipStats = false } = options;
    this.markStadtteilSolved(stadtteilName);
    if (!skipMapRefresh) this.updateMapStates();
    if (!skipStats) this.renderStats();
  }

  nextQuestion() {
    const playArea = document.getElementById('game-play-area');
    if (!playArea || this.inRound || this.nameAllIsActive) return;
    const mode = this.resolveModeForCurrentSegment(this.currentMode);
    if (mode === 'EXPLORER') this.initExplorerMode(playArea);
    else if (mode === 'NAME_ALL') this.initNameAllMode(playArea);
    else this.initGameMode(playArea);
  }

  updateHeaderBadge() {
    const badge = document.getElementById('header-badge');
    if (!badge) return;
    if (this.view === 'hub') {
      badge.textContent = t('hub.badge');
      return;
    }
    const city = window.cityRegistry.localizeCity(window.cityRegistry.getCity(this.activeCityId));
    badge.textContent = city?.name || this.activeCityId;
  }

  updateLangButton(btn) {
    const el = btn || document.getElementById('btn-lang');
    if (!el) return;
    el.textContent = getLocale() === 'de' ? '🇩🇪' : '🇬🇧';
    el.title = getLocale() === 'de' ? t('header.langSwitchToEn') : t('header.langSwitchToDe');
  }

  // Render score, progress-fill, XP etc.
  renderStats() {
    const xpVal = document.getElementById('stat-xp');
    const streakVal = document.getElementById('stat-streak');
    const bestStreakVal = document.getElementById('stat-best-streak');
    const rankName = document.getElementById('stat-rank');
    const progFill = document.getElementById('progress-fill');
    
    xpVal && (xpVal.textContent = this.xp);
    streakVal && (streakVal.textContent = `${this.streak}x`);
    if (bestStreakVal) bestStreakVal.textContent = t('header.streakBest', { count: this.bestStreak });
    
    const currentRank = getRanks().find(r => r.level === this.level);
    rankName && (rankName.textContent = currentRank ? currentRank.name : t('ranks.fallback'));
    
    // Global rank progress bar (XP-based)
    const nextRank = getRanks().find(r => r.level === this.level + 1);
    if (progFill && currentRank) {
      if (nextRank) {
        const span = nextRank.minXp - currentRank.minXp;
        const progressPercent = span > 0 ? ((this.xp - currentRank.minXp) / span) * 100 : 0;
        progFill.style.width = `${Math.min(progressPercent, 100)}%`;
      } else {
        progFill.style.width = '100%';
      }
    }

    this.updateHeaderBadge();
    this.updateLangButton();

    // Progression Unlock Panel Update
    this.renderUnlockProgress();
    if (this.view === 'hub') this.syncHubStats();
    else {
      window.kiezCityDashboard?.updateBreadcrumb(this);
      window.kiezCityDashboard?.renderCityProgressCard(this);
    }
  }

  renderUnlockProgress() {
    const listContainer = document.getElementById('district-progress-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    const unlocked = this.getUnlockedBezirke();
    
    this.getProgression().forEach(bz => {
      const isUnlocked = unlocked.includes(bz.name);
      
      // Calculate how many stadtteile are solved out of total in this district
      const totalInDistrict = this.getCityData().filter(d => d.bezirk === bz.name && !d.is_island).length;
      const solvedInDistrict = this.bezirkProgress[bz.name].solved.size;
      const percent = totalInDistrict > 0 ? Math.round((solvedInDistrict / totalInDistrict) * 100) : 0;
      
      const row = document.createElement('div');
      row.className = `district-progress-row ${isUnlocked ? 'unlocked' : 'locked'}`;
      if (isUnlocked && solvedInDistrict < totalInDistrict) {
        row.classList.add('active-unlock');
      }
      
      const cssKey = this.getBezirkCssKey(bz.name);
      
      row.innerHTML = `
        <div class="dp-indicator" style="background: var(--color-${cssKey}); box-shadow: 0 0 6px var(--color-${cssKey});"></div>
        <div class="dp-name">${bz.name}</div>
        ${isUnlocked ? 
          `<div class="dp-score">${solvedInDistrict}/${totalInDistrict} (${percent}%)</div>` : 
          `<div class="dp-lock">${t('progress.lockHint')}</div>`
        }
      `;
      
      listContainer.appendChild(row);
      
      // Award special District Completion achievements
      if (solvedInDistrict === totalInDistrict && totalInDistrict > 0) {
        const trophyTexts = getBezirkTrophyTexts(this.activeCityId, bz.name);
        this.unlockAchievement(
          trophyTexts.id,
          `${trophyTexts.name} 🏆`,
          trophyTexts.desc
        );
      }
    });
  }

  unlockTrophy(id, title, desc) {
    if (this.trophies.has(id)) return;
    this.trophies.add(id);
    this.achievements.add(id);
    this.saveState();
    this.showAchievementAlert(title, desc);
    this.updateIslandBadges();
  }

  updateIslandBadges() {
    const city = window.cityRegistry.getCity(this.activeCityId);
    const islandEgg = city?.islandEasterEgg;
    const nwAnchor = document.getElementById('neuwerk-anchor');
    const pfAnchor = document.getElementById('pfaueninsel-anchor');
    const europeStack = document.getElementById('europe-islands-stack');
    if (nwAnchor) nwAnchor.hidden = islandEgg !== 'neuwerk';
    if (pfAnchor) pfAnchor.hidden = islandEgg !== 'pfaueninsel';
    if (europeStack) europeStack.hidden = islandEgg !== 'europe';
    const nwBadge = nwAnchor?.querySelector('.no-badge');
    if (nwAnchor && nwBadge) {
      const unlocked = this.trophies.has('neuwerk_island');
      nwBadge.classList.toggle('is-unlocked', unlocked);
      nwAnchor.title = unlocked ? t('map.neuwerkTitleUnlocked') : t('map.neuwerkTitle');
    }
    const pfBadge = pfAnchor?.querySelector('.no-badge');
    if (pfAnchor && pfBadge) {
      const unlocked = this.trophies.has('pfaueninsel_island');
      pfBadge.classList.toggle('is-unlocked', unlocked);
      pfAnchor.title = unlocked ? t('map.pfaueninselTitleUnlocked') : t('map.pfaueninselTitle');
    }
    if (europeStack && islandEgg === 'europe') {
      europeStack.querySelectorAll('.island-overlay[data-island-id]').forEach((anchor) => {
        const id = anchor.dataset.islandId;
        const badge = anchor.querySelector('.no-badge');
        const unlocked = this.trophies.has(id);
        if (badge) badge.classList.toggle('is-unlocked', unlocked);
        anchor.title = unlocked
          ? t(`map.europeIslandTitleUnlocked.${id}`)
          : t(`map.europeIslandTitle.${id}`);
      });
    }
  }

  renderEuropeIslandEggs(container) {
    if (!container || container.dataset.rendered === 'true') return;
    const eggs = typeof EUROPE_ISLAND_EGGS !== 'undefined' ? EUROPE_ISLAND_EGGS : [];
    const icons = {
      canary_islands: '🌋',
      azores_madeira: '🌊',
      caribbean_nl: '🦜',
      french_overseas: '🗼',
      svalbard: '🐻‍❄️'
    };
    container.innerHTML = eggs.map((egg) => `
      <div class="island-overlay europe-island-overlay" data-island-id="${egg.id}" title="${t(`map.europeIslandTitle.${egg.id}`)}">
        <div class="no-badge"></div>
        <span>${egg.name} ${icons[egg.id] || '🏝️'}</span>
      </div>
    `).join('');
    container.dataset.rendered = 'true';
    eggs.forEach((egg) => {
      const anchor = container.querySelector(`[data-island-id="${egg.id}"]`);
      if (!anchor || anchor.dataset.bound === 'true') return;
      anchor.dataset.bound = 'true';
      anchor.addEventListener('click', () => {
        this.playSelectionSound();
        this.selectEuropeIsland(egg);
        const ns = getCityConfig('europe').trophyNs;
        this.unlockTrophy(
          egg.id,
          t(`${ns}.${egg.id}.unlockTitle`),
          t(`${ns}.${egg.id}.unlockDesc`)
        );
      });
    });
    this.updateIslandBadges();
    this.updateEuropeMicrostatesUI();
  }

  isEuropeMicrostate(bezirk) {
    return typeof EUROPE_MICROSTATES !== 'undefined' && EUROPE_MICROSTATES.includes(bezirk);
  }

  updateEuropeMicrostatesUI() {
    const bar = document.getElementById('europe-microstates-bar');
    if (!bar) return;
    const show = this.activeCityId === 'europe';
    bar.hidden = !show;
    if (show && !bar.dataset.rendered) {
      this.renderEuropeMicrostatesBar();
      bar.dataset.rendered = '1';
    }
  }

  renderEuropeMicrostatesBar() {
    const bar = document.getElementById('europe-microstates-bar');
    if (!bar || typeof EUROPE_MICROSTATES === 'undefined') return;
    const flags = typeof EUROPE_MICROSTATE_FLAGS !== 'undefined' ? EUROPE_MICROSTATE_FLAGS : {};
    bar.innerHTML = `
      <span class="europe-microstates-label">${t('map.europeMicrostatesLabel')}</span>
      <div class="europe-microstates-chips" role="list">
        ${EUROPE_MICROSTATES.map((name) => {
          const flag = flags[name] || '';
          const title = t('map.europeMicrostateTitle', { name });
          return `<button type="button" class="europe-microstate-chip" data-bezirk="${name}" title="${title}"><span aria-hidden="true">${flag}</span><span>${name}</span></button>`;
        }).join('')}
      </div>
    `;
    bar.querySelectorAll('.europe-microstate-chip').forEach((btn) => {
      btn.addEventListener('click', () => this.activateEuropeMicrostate(btn.dataset.bezirk));
    });
  }

  enhanceEuropeMicrostateHits() {
    if (!this.svg || this.activeCityId !== 'europe') return;

    this.svg.querySelectorAll('.micro-hit-target').forEach((el) => el.remove());
    document.querySelectorAll('.stadtteil-path.micro-state-visible').forEach((p) => {
      p.classList.remove('micro-state-visible');
    });

    const minArea = typeof EUROPE_MICRO_HIT_MIN_AREA === 'number' ? EUROPE_MICRO_HIT_MIN_AREA : 220;
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const minRadius = isTouch
      ? (typeof EUROPE_MICRO_HIT_MIN_RADIUS_TOUCH === 'number' ? EUROPE_MICRO_HIT_MIN_RADIUS_TOUCH : 28)
      : (typeof EUROPE_MICRO_HIT_MIN_RADIUS === 'number' ? EUROPE_MICRO_HIT_MIN_RADIUS : 20);
    const byBezirk = new Map();

    document.querySelectorAll('.stadtteil-path:not(.micro-hit-target)').forEach((path) => {
      const bezirk = path.getAttribute('data-bezirk');
      if (!bezirk) return;
      const b = path.getBBox();
      let entry = byBezirk.get(bezirk);
      if (!entry) {
        entry = { paths: [], ux: Infinity, uy: Infinity, ux2: -Infinity, uy2: -Infinity };
        byBezirk.set(bezirk, entry);
      }
      entry.paths.push(path);
      entry.ux = Math.min(entry.ux, b.x);
      entry.uy = Math.min(entry.uy, b.y);
      entry.ux2 = Math.max(entry.ux2, b.x + b.width);
      entry.uy2 = Math.max(entry.uy2, b.y + b.height);
    });

    let group = this.svg.querySelector('.micro-hit-group');
    if (!group) {
      group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'micro-hit-group');
    }
    const labels = this.svg.querySelector('#map-labels-group');
    if (labels) {
      this.svg.insertBefore(group, labels);
    } else {
      this.svg.appendChild(group);
    }

    byBezirk.forEach((entry, bezirk) => {
      const bw = entry.ux2 - entry.ux;
      const bh = entry.uy2 - entry.uy;
      const area = bw * bh;
      const needsHit = this.isEuropeMicrostate(bezirk) || area < minArea;
      if (!needsHit) return;

      const cx = entry.ux + bw / 2;
      const cy = entry.uy + bh / 2;
      const radius = Math.max(minRadius, Math.max(bw, bh) * 0.95 + 6);
      const ref = entry.paths[0];

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'stadtteil-path micro-hit-target');
      circle.setAttribute('data-name', ref.getAttribute('data-name'));
      circle.setAttribute('data-bezirk', bezirk);
      if (ref.getAttribute('data-iso')) circle.setAttribute('data-iso', ref.getAttribute('data-iso'));
      circle.setAttribute('cx', String(cx));
      circle.setAttribute('cy', String(cy));
      circle.setAttribute('r', String(radius));
      group.appendChild(circle);
      this.bindMapPath(circle);

      entry.paths.forEach((p) => p.classList.add('micro-state-visible'));
    });
  }

  _resolveMapPath(path) {
    if (!path?.classList.contains('micro-hit-target')) return path;
    const bezirk = path.getAttribute('data-bezirk');
    const real = document.querySelector(`.stadtteil-path[data-bezirk="${bezirk}"]:not(.micro-hit-target)`);
    return real || path;
  }

  activateEuropeMicrostate(bezirk) {
    if (!bezirk) return;
    if (this.mapNav) this.mapNav.didDrag = false;

    const paths = [...document.querySelectorAll(`.stadtteil-path[data-bezirk="${bezirk}"]:not(.micro-hit-target)`)];
    const hitPaths = paths.length
      ? paths
      : [...document.querySelectorAll(`.stadtteil-path[data-bezirk="${bezirk}"]`)];
    if (!hitPaths.length) return;

    if (this.mapNav) {
      requestAnimationFrame(() => this.mapNav.zoomToPaths(hitPaths, { padding: 1.55, maxZoom: 14, minZoom: 0.9 }));
    }

    const microBar = document.getElementById('europe-microstates-bar');
    if (microBar) {
      microBar.querySelectorAll('.europe-microstate-chip').forEach((c) => {
        c.classList.toggle('active', c.dataset.bezirk === bezirk);
      });
    }

    const ref = paths[0] || hitPaths[0];
    const name = ref.getAttribute('data-name');

    if (this.currentMode === 'EXPLORER') {
      if (this.activeSegment === 'BEZIRKE') {
        this.selectBezirk(bezirk);
      } else {
        this.selectNeighbourhood(ref, name, bezirk);
      }
      return;
    }
    if (!this.inRound) return;

    if (this.currentMode === 'LOCATE') {
      if (this.activeSegment === 'BEZIRKE') {
        this.handleBezirkLocateClick(bezirk);
      } else {
        this.handleLocateClick(ref, name, bezirk);
      }
    } else if (this.currentMode === 'QUIZ') {
      const answer = this.activeSegment === 'BEZIRKE' ? bezirk : name;
      this.handleRoundAnswer(answer, null);
    }
  }

  selectEuropeIsland(island) {
    this.resetMapClasses();
    let density = t('explorer.na');
    const popInt = parseInt(String(island.population).replace(/\./g, '').replace(/,/g, ''));
    const areaFloat = parseFloat(String(island.area_km2).replace(/,/g, '.'));
    if (!isNaN(popInt) && !isNaN(areaFloat) && areaFloat > 0) {
      density = `${formatNumber(Math.round(popInt / areaFloat))} ${t('explorer.densityUnit')}`;
    }

    const container = document.getElementById('game-play-area');
    container.innerHTML = `
      <div class="info-details">
        <div class="detail-header">
          <h2>${island.name}</h2>
          <span class="bezirk-tag" style="background: hsla(${this.getBezirkHue(island.country)}, 100%, 65%, 0.15); color: hsla(${this.getBezirkHue(island.country)}, 100%, 65%, 1); border: 1px solid hsla(${this.getBezirkHue(island.country)}, 100%, 65%, 0.3)">
            ${island.country}
          </span>
        </div>
        <div class="detail-stats-grid">
          <div class="detail-stat">
            <div class="ds-label">${t('explorer.residents')}</div>
            <div class="ds-value">${island.population}</div>
          </div>
          <div class="detail-stat">
            <div class="ds-label">${t('explorer.area')}</div>
            <div class="ds-value">${island.area_km2} km²</div>
          </div>
          <div class="detail-stat" style="grid-column: span 2;">
            <div class="ds-label">${t('explorer.density')}</div>
            <div class="ds-value">${density}</div>
          </div>
        </div>
        <div class="detail-trivia">
          ${island.trivia}
        </div>
      </div>
    `;
  }

  playSelectionSound() {
    this.sounds.init();
    this.sounds.playSelect();
  }

  syncMapPromptBar({ title, target, sub, highlight = false, isHtml = false }) {
    const bar = document.getElementById('map-prompt-bar');
    if (!bar) return;

    const mapTitle = document.getElementById('map-prompt-title');
    const mapTarget = document.getElementById('map-prompt-target');
    const mapSub = document.getElementById('map-prompt-sub');

    if (mapTitle) mapTitle.textContent = title;
    if (mapTarget) {
      if (isHtml) mapTarget.innerHTML = target;
      else mapTarget.textContent = target;
      mapTarget.classList.toggle('highlight', highlight);
    }
    if (mapSub) mapSub.textContent = sub;

    if (this.inRound) bar.hidden = false;
  }

  hideMapPromptBar() {
    const bar = document.getElementById('map-prompt-bar');
    if (bar) bar.hidden = true;
  }

  setInRoundUI(active) {
    document.body.classList.toggle('in-round', active);
    if (!active) this.hideMapPromptBar();
  }

  unlockAchievement(id, title, desc) {
    this.unlockTrophy(id, title, desc);
  }

  checkParadiseTrophy(stadtteilName) {
    const city = window.cityRegistry.getCity(this.activeCityId);
    const target = city?.paradiseTarget;
    if (target && stadtteilName === target) {
      const ns = getCityConfig(this.activeCityId).trophyNs;
      this.unlockTrophy(
        'paradise_explorer',
        t(`${ns}.paradise_explorer.unlockTitle`),
        t(`${ns}.paradise_explorer.unlockDesc`)
      );
    }
  }

  isEuropeCapitalsMode() {
    return this.activeCityId === 'europe' && this.activeSegment === 'STADTTEILE';
  }

  isEuropeCountriesMode() {
    return this.activeCityId === 'europe' && this.activeSegment === 'BEZIRKE';
  }

  blinkRoundTarget() {
    if (!this.currentTarget) return;
    const isBz = this.activeSegment === 'BEZIRKE';
    if (isBz) {
      document.querySelectorAll(`.stadtteil-path[data-bezirk="${this.currentTarget.name}"]`).forEach(p => p.classList.add('blink'));
    } else if (this.isEuropeCapitalsMode()) {
      document.querySelectorAll(`.stadtteil-path[data-bezirk="${this.currentTarget.bezirk}"]`).forEach(p => p.classList.add('blink'));
    } else {
      const targetPath = this.getPathByNeighbourhoodName(this.currentTarget.name);
      if (targetPath) targetPath.classList.add('blink');
    }
  }

  unblinkRoundTarget() {
    if (!this.currentTarget) return;
    const isBz = this.activeSegment === 'BEZIRKE';
    if (isBz) {
      document.querySelectorAll(`.stadtteil-path[data-bezirk="${this.currentTarget.name}"]`).forEach(p => p.classList.remove('blink'));
    } else if (this.isEuropeCapitalsMode()) {
      document.querySelectorAll(`.stadtteil-path[data-bezirk="${this.currentTarget.bezirk}"]`).forEach(p => p.classList.remove('blink'));
    } else {
      const targetPath = this.getPathByNeighbourhoodName(this.currentTarget.name);
      if (targetPath) targetPath.classList.remove('blink', 'selected');
    }
  }

  checkEuropeGroupTrophies(correctNames, poolNames) {
    if (this.activeCityId !== 'europe' || !poolNames?.length) return;
    const ns = getCityConfig('europe').trophyNs;
    const data = this.getCityData();
    const isCountries = this.activeSegment === 'BEZIRKE';

    const toCountry = (name) => {
      if (isCountries) return name;
      return data.find(d => d.name === name)?.bezirk || null;
    };

    const poolCountries = new Set(poolNames.map(toCountry).filter(Boolean));
    const correctCountries = new Set(correctNames.map(toCountry).filter(Boolean));

    const checkCountryGroup = (id, countryNames) => {
      if (!countryNames.every(c => poolCountries.has(c))) return;
      if (countryNames.every(c => correctCountries.has(c))) {
        this.unlockAchievement(
          id,
          t(`${ns}.${id}.unlockTitle`),
          t(`${ns}.${id}.unlockDesc`)
        );
      }
    };

    checkCountryGroup('eu_founding_perfect', data.filter(d => d.eu_founding).map(d => d.bezirk));
    checkCountryGroup('eu_members_perfect', data.filter(d => d.eu_member).map(d => d.bezirk));
    checkCountryGroup('nordic_master', ['Dänemark', 'Schweden', 'Norwegen', 'Finnland', 'Island']);
    checkCountryGroup('baltic_master', ['Estland', 'Lettland', 'Litauen']);
    checkCountryGroup('benelux_master', ['Belgien', 'Niederlande', 'Luxemburg']);
  }

  getEuropeRoundPrompts(mode) {
    const isBz = this.activeSegment === 'BEZIRKE';
    if (mode === 'LOCATE') {
      return isBz
        ? { title: t('game.locateCountry'), target: this.currentTarget.name, sub: t('game.locateClickCountry'), highlight: true }
        : null;
    }
    if (mode === 'QUIZ') {
      return isBz
        ? { title: t('game.quizCountry'), target: t('game.quizBlinkCountry'), sub: t('game.quizChooseCountry'), highlight: false, isHtml: true }
        : { title: t('game.quizCapital'), target: t('game.quizBlinkCapitalCountry'), sub: t('game.quizChooseCapital'), highlight: false, isHtml: true };
    }
    if (mode === 'TYPE_NAME') {
      return isBz
        ? { title: t('game.typeCountry'), target: t('game.quizCountry'), sub: t('game.typeHint'), highlight: false }
        : { title: t('game.typeCapital'), target: t('game.quizCapital'), sub: t('game.typeCapitalHint'), highlight: false };
    }
    return null;
  }

  normalizeGuess(str) {
    return (str || '').toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9äöüß]/g, '');
  }

  stopActiveTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateRoundTimerDisplay() {
    const display = document.getElementById('round-timer-display');
    if (!display) return;
    const minutes = Math.floor(this.roundTimeLeft / 60);
    const seconds = this.roundTimeLeft % 60;
    display.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    display.classList.toggle('timer-warning', this.roundTimeLeft <= 60);
  }

  startRoundTimer() {
    this.stopActiveTimer();
    this.roundTimeLeft = ROUND_TIME_LIMIT;
    this.roundStartedAt = Date.now();
    this.updateRoundTimerDisplay();
    this.timerInterval = setInterval(() => {
      this.roundTimeLeft--;
      this.updateRoundTimerDisplay();
      if (this.roundTimeLeft <= 0) {
        this.stopActiveTimer();
        if (this.inRound) this.finishRound({ timedOut: true });
      }
    }, 1000);
  }

  getRoundElapsedSeconds() {
    if (this.roundStartedAt) {
      return Math.min(ROUND_TIME_LIMIT, Math.round((Date.now() - this.roundStartedAt) / 1000));
    }
    return ROUND_TIME_LIMIT - this.roundTimeLeft;
  }

  getShareUrl() {
    const city = this.activeCityId || 'hamburg';
    return `https://kiezquiz.de/?city=${encodeURIComponent(city)}`;
  }

  async shareMilestone(kind, extra = {}) {
    if (!navigator.share) return;
    const city = window.cityRegistry.getCity(this.activeCityId);
    const cityName = city?.name || this.activeCityId;
    let title;
    let text;
    if (kind === 'levelUp') {
      title = t('share.levelUpTitle');
      text = t('share.levelUpText');
    } else {
      title = t('share.trophyTitle');
      text = extra.trophyName
        ? `${t('share.trophyText')} (${cityName}: ${extra.trophyName})`
        : `${t('share.trophyText')} (${cityName})`;
    }
    try {
      await navigator.share({ title, text, url: this.getShareUrl() });
    } catch (err) {
      if (err?.name !== 'AbortError') console.warn('Share failed:', err);
    }
  }

  appendShareButton(container, kind, extra = {}) {
    if (!navigator.share || !container) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary-btn share-milestone-btn';
    btn.textContent = t('share.button');
    btn.addEventListener('click', () => this.shareMilestone(kind, extra));
    container.appendChild(btn);
  }

  showAchievementAlert(title, desc) {
    // Create an elegant glass sliding panel alert
    const alertBox = document.createElement('div');
    alertBox.className = 'glass-card achievement-alert';
    alertBox.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 10000;
      border-color: var(--color-xp);
      box-shadow: 0 10px 30px rgba(255, 191, 0, 0.2);
      max-width: 320px;
      display: flex;
      flex-direction: row;
      gap: 0.75rem;
      align-items: center;
      padding: 1rem;
      animation: alertSlideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      background: rgba(17, 24, 39, 0.9);
    `;
    
    alertBox.innerHTML = `
      <div style="font-size: 2rem;">🏆</div>
      <div>
        <div style="font-weight:700; color:#fff; font-size:0.95rem; margin-bottom: 0.15rem;">${t('achievement.unlocked')}</div>
        <div style="font-weight:700; color:var(--color-xp); font-size:0.85rem; margin-bottom: 0.15rem;">${title}</div>
        <div style="font-size:0.75rem; color:var(--text-secondary);">${desc}</div>
      </div>
    `;

    this.appendShareButton(alertBox, 'trophy', { trophyName: title });
    
    document.body.appendChild(alertBox);
    
    if (!this._alertStyleInjected) {
      const style = document.createElement('style');
      style.id = 'alert-style';
      style.innerHTML = `
        @keyframes alertSlideIn {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes alertSlideOut {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100px); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
      this._alertStyleInjected = true;
    }

    setTimeout(() => {
      alertBox.style.animation = 'alertSlideOut 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
      setTimeout(() => alertBox.remove(), 500);
    }, 5000);
  }

  showLevelUpModal(lvl) {
    const rank = getRanks().find(r => r.level === lvl);
    const modal = openOverlayModal(`
      <div class="modal-content">
        <h2 style="font-size: 2.2rem; color: var(--color-xp); text-shadow: 0 0 15px rgba(255, 191, 0, 0.3);">${t('levelUp.title')}</h2>
        <p style="margin-top:0.5rem; font-weight:700; font-size: 1.1rem; color:#fff;">${t('levelUp.rank', { name: rank.name })}</p>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem;">${t('levelUp.body')}</p>
        <div class="round-end-actions" style="display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap;">
          <button class="primary-btn" id="btn-lvl-dismiss">${t('levelUp.dismiss')}</button>
          <button class="secondary-btn" id="btn-lvl-share" hidden>${t('levelUp.share')}</button>
        </div>
      </div>
    `);
    launchConfetti(this.sounds);
    document.getElementById('btn-lvl-dismiss').addEventListener('click', () => closeOverlayModal(modal));
    const shareBtn = document.getElementById('btn-lvl-share');
    if (shareBtn && navigator.share) {
      shareBtn.hidden = false;
      shareBtn.addEventListener('click', () => this.shareMilestone('levelUp'));
    }
  }

  async resetGame() {
    if (!confirm(t('game.confirmReset'))) return;
    if (window.cloudSync?.isEnabled()) {
      await window.cloudSync.clearCloudSave();
    }
    this.resetToGuestState(true);
    location.reload();
  }

  resetToGuestState(clearLocalOnly = false) {
    window.saveManager.clearSave();
    const keysToRemove = Object.keys(localStorage).filter(
      (k) => k.startsWith('hh_') || k === 'hh_game_history' || k.startsWith('kq_history_')
    );
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    this._save = window.saveManager.createEmptySave();
    this.activeCityId = 'hamburg';
    this.view = 'hub';

    this.deserializeState({
      saveVersion: 2,
      global: { xp: 0, streak: 0, bestStreak: 0, rankSeen: 1, newsVersionSeen: 0, muted: false },
      lastCity: null,
      lastLevelKey: 'stadtteile',
      lastMode: 'EXPLORER',
      cities: { hamburg: window.saveManager.emptyCityState(window.cityRegistry.getBezirkeProgression('hamburg')) }
    });

    if (!clearLocalOnly) {
      this.setMode('EXPLORER');
      this.renderStats();
      this.updateMapStates();
      this.updateIslandBadges();
    }
  }

  _gameHistoryKey() {
    const cityId = this.activeCityId || 'hamburg';
    return window.kiezLeaderboard?.gameHistoryStorageKey?.(cityId)
      || (cityId === 'hamburg' ? 'hh_game_history' : `kq_history_${cityId}`);
  }

  loadGameHistory() {
    try {
      const raw = localStorage.getItem(this._gameHistoryKey());
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  recordGameHistory(entry) {
    const history = this.loadGameHistory();
    history.unshift({ ...entry, date: new Date().toISOString() });
    if (history.length > 50) history.length = 50;
    localStorage.setItem(this._gameHistoryKey(), JSON.stringify(history));
    this.saveState();
  }

  _submitLeaderboardBest(correct, total, durationSec, mode) {
    const cityId = this.activeCityId || 'hamburg';
    void window.kiezLeaderboard?.submitBestScore?.(cityId, {
      correct,
      total,
      durationSec,
      mode: mode || this.currentMode || ''
    });
  }

  getModeDisplayName(mode, segment) {
    const seg = segment || this.activeSegment;
    return getModeLabel(mode, seg) || mode;
  }

  formatDuration(seconds) {
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  getRankProgressInfo() {
    const currentRank = getRanks().find(r => r.level === this.level) || getRanks()[0];
    const nextRank = getRanks().find(r => r.level === this.level + 1);
    let percent = 100;
    if (nextRank) {
      const span = nextRank.minXp - currentRank.minXp;
      percent = span > 0 ? Math.min(100, ((this.xp - currentRank.minXp) / span) * 100) : 0;
    }
    return { currentRank, nextRank, percent };
  }

  getCityRankProgressInfo(cityId = this.activeCityId) {
    const cityLevel = calculateCityLevel(this, cityId);
    const ranks = getCityRanks(cityId);
    const currentRank = ranks.find(r => r.level === cityLevel) || ranks[0];
    const nextRank = ranks.find(r => r.level === cityLevel + 1);
    const totals = getCityRankTotals(this, cityId);
    let percent = 100;
    if (nextRank) {
      const nextDistricts = nextRank.level === CITY_RANK_THRESHOLDS.length
        ? totals.totalDistricts
        : Math.min(nextRank.minDistricts, totals.totalDistricts);
      const nextTrophies = nextRank.level === CITY_RANK_THRESHOLDS.length
        ? totals.totalTrophies
        : Math.min(nextRank.minTrophies, totals.totalTrophies);
      const curDistricts = currentRank.level === CITY_RANK_THRESHOLDS.length
        ? totals.totalDistricts
        : Math.min(currentRank.minDistricts, totals.totalDistricts);
      const curTrophies = currentRank.level === CITY_RANK_THRESHOLDS.length
        ? totals.totalTrophies
        : Math.min(currentRank.minTrophies, totals.totalTrophies);
      const districtSpan = Math.max(nextDistricts - curDistricts, 1);
      const trophySpan = Math.max(nextTrophies - curTrophies, 1);
      const districtPct = Math.min(100, ((totals.unlockedDistricts - curDistricts) / districtSpan) * 100);
      const trophyPct = Math.min(100, ((totals.trophies - curTrophies) / trophySpan) * 100);
      percent = Math.min(districtPct, trophyPct);
    }
    return { currentRank, nextRank, percent, cityLevel, totals };
  }

  renderRankLadderHtml() {
    const { currentRank, nextRank, percent } = this.getRankProgressInfo();
    const steps = getRanks().map(rank => {
      let state = 'upcoming';
      if (rank.level < this.level) state = 'passed';
      else if (rank.level === this.level) state = 'current';
      const xpHint = rank.level < RANK_THRESHOLDS.length
        ? `${rank.minXp} XP`
        : t('log.xpPlus', { xp: rank.minXp });
      return `
        <div class="rank-ladder-step rank-ladder-step--${state}">
          <div class="rank-ladder-dot"></div>
          <div class="rank-ladder-label">
            <span class="rank-ladder-name">${rank.name}</span>
            <span class="rank-ladder-xp">${xpHint}</span>
          </div>
        </div>
      `;
    }).join('');

    const progressNote = nextRank
      ? t('ranks.progressTo', { percent: Math.round(percent), name: nextRank.name, xp: nextRank.minXp })
      : t('ranks.maxReached');

    return `
      <div class="log-rank-section">
        <h3 class="log-section-title">${t('log.yourRank')}</h3>
        <p class="log-rank-current"><strong>${currentRank.name}</strong> · ${this.xp} XP</p>
        <div class="rank-ladder">${steps}</div>
        <div class="rank-xp-bar"><div class="rank-xp-bar-fill" style="width:${percent}%"></div></div>
        <p class="log-rank-progress-note">${progressNote}</p>
        <div class="log-xp-hints">
          <p class="log-xp-hint">${t('log.xpHint1')}</p>
          <p class="log-xp-hint">${t('log.xpHint2')}</p>
          <p class="log-xp-hint">${t('log.xpHint3')}</p>
        </div>
      </div>
    `;
  }

  renderTrophyGalleryHtml() {
    const won = this.trophies.size;
    const total = getTrophyCatalog().length;
    const tiles = getTrophyCatalog().map(trophy => {
      const earned = this.trophies.has(trophy.id);
      return `
        <button type="button" class="trophy-tile ${earned ? 'trophy-tile--earned' : 'trophy-tile--locked'}" data-trophy-id="${trophy.id}" aria-label="${trophy.name}">
          <span class="trophy-icon">${trophy.icon}</span>
          <span class="trophy-name">${trophy.name}</span>
        </button>
      `;
    }).join('');

    return `
      <div class="log-trophy-section">
        <h3 class="log-section-title">${t('log.trophies', { won, total })}</h3>
        <div class="trophy-gallery">${tiles}</div>
      </div>
    `;
  }

  showGameHistory() {
    if (window.kiezModals?.showLogModal) {
      window.kiezModals.showLogModal(this);
      return;
    }
    const history = this.loadGameHistory();

    let listHtml;
    if (history.length === 0) {
      listHtml = `<p class="log-empty-hint">${t('log.emptyHistory')}</p>`;
    } else {
      listHtml = `<div class="game-history-list">${history.map(item => {
        const date = new Date(item.date);
        const dateStr = formatDate(date, { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = formatTime(date, { hour: '2-digit', minute: '2-digit' });
        const scoreColor = item.percent >= 75 ? 'var(--color-correct)' : 'var(--color-incorrect)';
        const districts = item.districts?.length ? item.districts.join(', ') : '—';
        const durationHtml = item.durationSec != null
          ? `<div class="gh-duration">⏱ ${this.formatDuration(item.durationSec)}</div>`
          : '';
        return `
          <div class="game-history-item">
            <div class="gh-date">${dateStr} · ${timeStr}</div>
            <div class="gh-mode">${this.getModeDisplayName(item.mode, item.segment)}${item.segment === 'BEZIRKE' ? t('log.bezirkeSegment') : ''}</div>
            <div class="gh-districts">${districts}</div>
            <div class="gh-score" style="color:${scoreColor};">${item.correct} / ${item.total} (${item.percent}%)</div>
            ${durationHtml}
          </div>
        `;
      }).join('')}</div>`;
    }

    const modal = openOverlayModal(`
      <div class="modal-content log-modal-content">
        <h2>${t('log.title')}</h2>
        ${this.renderTrophyGalleryHtml()}
        ${this.renderRankLadderHtml()}
        <div class="log-history-section">
          <h3 class="log-section-title">${t('log.historyTitle')}</h3>
          ${listHtml}
        </div>
        <button class="primary-btn" id="btn-history-close">${t('log.close')}</button>
      </div>
    `, { closeOnBackdrop: true });
    document.getElementById('btn-history-close').addEventListener('click', () => closeOverlayModal(modal));
    window.kiezModals?.bindTrophyClicks?.(modal.querySelector('.trophy-gallery'), this);
  }

  showSyncToast(message) {
    if (!message) return;
    const now = Date.now();
    if (!this._syncToastState) this._syncToastState = { lastMsg: '', lastAt: 0 };
    if (this._syncToastState.lastMsg === message && now - this._syncToastState.lastAt < 8000) return;
    this._syncToastState = { lastMsg: message, lastAt: now };

    const existing = document.querySelector('.sync-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'sync-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('sync-toast--visible'));
    setTimeout(() => {
      toast.classList.remove('sync-toast--visible');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  showSettings() {
    const auth = window.authManager;
    const cloudConfigured = auth?.isConfigured();
    const loggedIn = auth?.isLoggedIn();
    let cloudStatusHtml;
    if (!cloudConfigured) {
      cloudStatusHtml = `<p class="settings-cloud-status">${t('settings.cloudNotConfigured')}</p>`;
    } else if (loggedIn) {
      cloudStatusHtml = `<p class="settings-cloud-status settings-cloud-status--active">${t('settings.cloudLoggedIn', { name: auth._escapeHtml(auth.getDisplayName()) })}</p>`;
    } else {
      cloudStatusHtml = `<p class="settings-cloud-status">${t('settings.cloudGuest')}</p>`;
    }

    const resetCloudSuffix = loggedIn ? t('settings.resetCloudSuffix') : '';

    const modal = openOverlayModal(`
      <div class="modal-content" style="max-width: 400px;">
        <h2>${t('settings.title')}</h2>
        <hr style="border-color: rgba(255,255,255,0.1); margin: 1rem 0;">
        <div class="settings-cloud-block" style="margin-bottom: 1.2rem;">
          <strong style="display:block; margin-bottom: 0.4rem;">${t('settings.cloudTitle')}</strong>
          ${cloudStatusHtml}
        </div>
        <div id="settings-wish-admin-slot" style="margin-bottom: 1.2rem;"></div>
        <div class="settings-changelog-block" style="margin-bottom: 1.2rem;">
          <strong style="display:block; margin-bottom: 0.4rem;">${t('settings.changelogTitle')}</strong>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0 0 0.8rem 0;">${t('settings.changelogBody')}</p>
          <button type="button" class="secondary-btn" id="btn-settings-changelog">${t('settings.changelogBtn')}</button>
        </div>
        <div class="settings-privacy-block" style="margin-bottom: 1.2rem;">
          <strong style="display:block; margin-bottom: 0.4rem;">${t('settings.privacyTitle')}</strong>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0; line-height: 1.5;">${t('settings.privacyBody')}</p>
        </div>
        <div style="margin-bottom: 1.2rem;">
          <strong style="display:block; margin-bottom: 0.4rem;">${t('settings.resetTitle')}</strong>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0 0 0.8rem 0;">${t('settings.resetBody', { cloudSuffix: resetCloudSuffix })}</p>
          <button id="btn-settings-reset" style="background: rgba(220,50,50,0.2); border: 1px solid rgba(220,50,50,0.5); color: #ff6b6b; padding: 0.5rem 1.2rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">${t('settings.resetBtn')}</button>
        </div>
        <button class="primary-btn" id="btn-settings-close" style="margin-top: 0.5rem;">${t('settings.close')}</button>
      </div>
    `, { closeOnBackdrop: true });
    modal.querySelector('#btn-settings-close')?.addEventListener('click', () => closeOverlayModal(modal));
    modal.querySelector('#btn-settings-reset')?.addEventListener('click', () => this.resetGame());
    modal.querySelector('#btn-settings-changelog')?.addEventListener('click', () => {
      closeOverlayModal(modal);
      window.kiezChangelog?.show?.();
    });

    if (loggedIn) {
      const profileSlot = document.createElement('div');
      profileSlot.style.marginBottom = '1.2rem';
      profileSlot.innerHTML = `
        <strong style="display:block; margin-bottom: 0.4rem;">${t('settings.profileTitle')}</strong>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0 0 0.8rem 0;">${t('settings.profileBody')}</p>
        <a href="/profile/" class="secondary-btn" style="display:inline-block;text-decoration:none;text-align:center;">${t('settings.profileBtn')}</a>`;
      const cloudBlock = modal.querySelector('.settings-cloud-block');
      cloudBlock?.insertAdjacentElement('afterend', profileSlot);
    }

    window.cityWishes?.isAdmin?.().then((isAdmin) => {
      if (!isAdmin) return;
      const slot = modal.querySelector('#settings-wish-admin-slot');
      if (!slot) return;
      slot.innerHTML = `
        <strong style="display:block; margin-bottom: 0.4rem;">${t('settings.wishAdminTitle')}</strong>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0 0 0.8rem 0;">${t('settings.wishAdminBody')}</p>
        <a href="/admin/" class="secondary-btn" style="display:inline-block;text-decoration:none;text-align:center;">${t('settings.wishAdminBtn')}</a>`;
    });
  }

  showAppNews() {
    const modal = openOverlayModal(`
      <div class="modal-content" style="max-width: 550px;">
        <h2>${t('appNews.title')}</h2>
        <p>${t('appNews.intro')}</p>
        
        <div class="modal-features">
          <div class="mf-item">
            <span class="mf-icon">${t('appNews.feature1Icon')}</span>
            <span class="mf-text">
              <strong>${t('appNews.feature1Title')}</strong>
              ${t('appNews.feature1Text')}
            </span>
          </div>
          <div class="mf-item">
            <span class="mf-icon">${t('appNews.feature2Icon')}</span>
            <span class="mf-text">
              <strong>${t('appNews.feature2Title')}</strong>
              ${t('appNews.feature2Text')}
            </span>
          </div>
          <div class="mf-item">
            <span class="mf-icon">${t('appNews.feature3Icon')}</span>
            <span class="mf-text">
              <strong>${t('appNews.feature3Title')}</strong>
              ${t('appNews.feature3Text')}
            </span>
          </div>
        </div>

        <p style="font-size: 0.8rem; color: var(--text-muted);">${t('appNews.footerTip')}</p>
        <button class="primary-btn" id="btn-app-news-dismiss">${t('appNews.dismiss')}</button>
      </div>
    `);
    document.getElementById('btn-app-news-dismiss').addEventListener('click', () => {
      this.markAppNewsSeen();
      closeOverlayModal(modal);
    });
  }

  // Mode Setter
  setMode(mode) {
    mode = this.resolveModeForCurrentSegment(mode);
    this.currentMode = mode;
    this.saveState();
    
    // Update active button state
    document.querySelectorAll('.mode-btn').forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Reset temporary classes
    this.resetMapClasses();
    this.clearMapTextLabels();
    
    // Stop round / timer when switching modes
    if (this.inRound) this.endRound(false);
    if (this.nameAllIsActive) this.stopNameAllChallenge(false);

    // Configure specific Mode details
    const playArea = document.getElementById('game-play-area');
    playArea.innerHTML = '';
    
    this.currentTarget = null;
    
    if (mode === 'EXPLORER') {
      this.initExplorerMode(playArea);
    } else if (mode === 'NAME_ALL') {
      this.initNameAllMode(playArea);
    } else {
      this.initGameMode(playArea);
    }

    this.updateModeVisibility();
    window.kiezCityDashboard?.updateBreadcrumb(this);
  }
  updateMapStates() {
    const unlockedBezirke = this.getUnlockedBezirke();
    
    document.querySelectorAll('.stadtteil-path').forEach(path => {
      const name = path.getAttribute('data-name');
      const bezirk = path.getAttribute('data-bezirk');
      path.style.pointerEvents = '';

      const isUnlocked = unlockedBezirke.includes(bezirk);
      
      // Update unlocked borders
      if (isUnlocked) {
        path.classList.remove('locked-path');
        path.classList.add('unlocked-bezirk');
        
        // Persistent tint only in explorer (not during active games)
        const showDiscovered = this.currentMode === 'EXPLORER' && !this.inRound && !this.nameAllIsActive;
        if (showDiscovered && this.bezirkProgress[bezirk] && this.bezirkProgress[bezirk].solved.has(name)) {
          path.classList.add('discovered');
        } else {
          path.classList.remove('discovered');
        }
      } else {
        path.classList.add('locked-path');
        path.classList.remove('unlocked-bezirk');
        path.classList.remove('discovered');
      }
    });
  }

  resetMapClasses() {
    document.querySelectorAll('.stadtteil-path').forEach(path => {
      path.classList.remove('selected', 'blink', 'correct-flash', 'incorrect-flash', 'bezirk-hover-highlight', 'round-correct', 'round-incorrect', 'bezirk-excluded');
      path.style.pointerEvents = '';
      path.style.removeProperty('--map-h');
    });
    document.getElementById('europe-microstates-bar')?.querySelectorAll('.europe-microstate-chip.active').forEach((c) => {
      c.classList.remove('active');
    });
    this.activeSelectPath = null;
  }

  /** Visible explorer highlight on Europe map (no per-country CSS rules). */
  applyExplorerMapHighlight(paths, hueSource) {
    const hue = this.getBezirkHue(hueSource);
    paths.forEach((p) => {
      p.classList.add('selected');
      p.style.setProperty('--map-h', String(hue));
    });
  }

  applyActiveBezirkFilter(activeBezirke) {
    if (!activeBezirke?.length) return;
    const allUnlocked = this.getUnlockedBezirke();
    const isSubset = activeBezirke.length < allUnlocked.length;
    if (!isSubset) return;

    document.querySelectorAll('.stadtteil-path').forEach(path => {
      const bezirk = path.getAttribute('data-bezirk');
      if (!activeBezirke.includes(bezirk)) {
        path.classList.add('bezirk-excluded');
        path.style.pointerEvents = 'none';
      } else {
        path.classList.remove('bezirk-excluded');
      }
    });
  }

  buildBezirkBoundaries() {
    if (!this.svg) return;

    const existing = this.svg.querySelector('.bezirk-boundaries-group');
    if (existing) existing.remove();

    const segmentBezirke = new Map();
    document.querySelectorAll('.stadtteil-path').forEach(path => {
      const bezirk = path.getAttribute('data-bezirk');
      parsePathSegments(path.getAttribute('d')).forEach(([x1, y1, x2, y2]) => {
        const key = segmentKey(x1, y1, x2, y2);
        if (!segmentBezirke.has(key)) segmentBezirke.set(key, new Set());
        segmentBezirke.get(key).add(bezirk);
      });
    });

    const boundaryLines = [];
    segmentBezirke.forEach((bezirke, key) => {
      if (bezirke.size > 1) {
        const [a, b] = key.split('|');
        const [x1, y1] = a.split(',').map(Number);
        const [x2, y2] = b.split(',').map(Number);
        boundaryLines.push([x1, y1, x2, y2]);
      }
    });

    if (!boundaryLines.length) return;

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'bezirk-boundaries-group');

    const d = boundaryLines
      .map(([x1, y1, x2, y2]) => `M ${snapCoord(x1)} ${snapCoord(y1)} L ${snapCoord(x2)} ${snapCoord(y2)}`)
      .join(' ');

    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    linePath.setAttribute('class', 'bezirk-boundary-line');
    linePath.setAttribute('d', d);
    group.appendChild(linePath);

    const labels = this.svg.querySelector('#map-labels-group');
    this.svg.insertBefore(group, labels || null);
  }

  /** On wrong map click: highlight only the correct target in red; wrong pick stays neutral */
  revealMissedTarget(targetName, isBezirk = false) {
    if (isBezirk) {
      document.querySelectorAll(`.stadtteil-path[data-bezirk="${targetName}"]`).forEach(p => {
        p.classList.add('round-incorrect');
      });
      this.addMapTextLabel(targetName, targetName, 'incorrect');
    } else {
      const path = this.getPathByNeighbourhoodName(targetName);
      if (path) path.classList.add('round-incorrect');
      this.addMapTextLabel(targetName, targetName, 'incorrect');
    }
  }

  handleQuizKeydown(e) {
    if (!this.inRound || this.currentMode !== 'QUIZ') return;
    if (e.target.matches('input, textarea, select')) return;

    const idx = { a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()];
    if (idx === undefined || !this.currentChoices || idx >= this.currentChoices.length) return;

    const buttons = document.querySelectorAll('#game-options-container .choice-btn');
    const btn = buttons[idx];
    if (!btn || btn.style.pointerEvents === 'none') return;

    e.preventDefault();
    this.sounds.init();
    this.handleRoundAnswer(this.currentChoices[idx], btn);
  }

  // Initialize Map paths and binding event listeners
  initMapPaths() {
    document.querySelectorAll('.stadtteil-path').forEach((path) => this.bindMapPath(path));
  }

  bindMapPath(path) {
    path.addEventListener('mousemove', (e) => {
      this.showMapTooltipForPath(path, e.clientX, e.clientY);
    });

    path.addEventListener('mouseleave', () => {
      this.tooltip.style.display = 'none';
    });

    path.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      this.showMapTooltipForPath(path, e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    path.addEventListener('mouseenter', () => {
      if (this.activeSegment === 'BEZIRKE' && !path.classList.contains('locked-path')) {
        const bz = path.getAttribute('data-bezirk');
        document.querySelectorAll(`.stadtteil-path[data-bezirk="${bz}"]`).forEach((p) => {
          p.classList.add('bezirk-hover-highlight');
        });
      }
    });

    path.addEventListener('mouseleave', () => {
      if (this.activeSegment === 'BEZIRKE') {
        const bz = path.getAttribute('data-bezirk');
        document.querySelectorAll(`.stadtteil-path[data-bezirk="${bz}"]`).forEach((p) => {
          p.classList.remove('bezirk-hover-highlight');
        });
      }
    });

    path.addEventListener('mousedown', () => {
      if (this.mapNav) this.mapNav.didDrag = false;
    });

    path.addEventListener('click', () => {
      if (this.mapNav && this.mapNav.didDrag) return;
      const name = path.getAttribute('data-name');
      const bezirk = path.getAttribute('data-bezirk');
      const mapPath = this._resolveMapPath(path);

      if (path.classList.contains('locked-path') && !this.nameAllIsActive) {
        this.sounds.init();
        this.sounds.playIncorrect();
        return;
      }

      if (this.currentMode === 'EXPLORER') {
        if (this.activeSegment === 'BEZIRKE') {
          this.selectBezirk(bezirk);
        } else {
          this.selectNeighbourhood(mapPath, name, bezirk);
        }
      } else if (this.inRound && this.currentMode === 'LOCATE') {
        if (this.activeSegment === 'BEZIRKE') {
          this.handleBezirkLocateClick(bezirk);
        } else {
          this.handleLocateClick(mapPath, name, bezirk);
        }
      } else if (this.inRound && this.currentMode === 'QUIZ') {
        this.handleRoundAnswer(name, null);
      }
    });
  }

  reorderMapLayers() {
    if (!this.svg) return;
    this.ensureMapLabelsGroup();
    const water = this.svg.querySelector('.water-group');
    const stadtteile = this.svg.querySelector('.stadtteile-group');
    const boundaries = this.svg.querySelector('.bezirk-boundaries-group');
    const labels = this.svg.querySelector('#map-labels-group');
    if (water && stadtteile) {
      this.svg.insertBefore(water, stadtteile);
    }
    if (boundaries && labels) {
      this.svg.insertBefore(boundaries, labels);
    } else if (boundaries) {
      this.svg.appendChild(boundaries);
    }
    if (labels) {
      this.svg.appendChild(labels);
    }
  }

  raiseWaterLayerForNameAll() {
    if (!this.svg) return;
    const water = this.svg.querySelector('.water-group');
    const boundaries = this.svg.querySelector('.bezirk-boundaries-group');
    const labels = this.svg.querySelector('#map-labels-group');
    if (water) {
      this.svg.insertBefore(water, boundaries || labels || null);
    }
    if (boundaries && labels) {
      this.svg.insertBefore(boundaries, labels);
    }
  }

  shouldShowMapTooltip() {
    if (this.nameAllIsActive) return false;
    if (this.mapNav?.isDragging || this.mapNav?.isPinching) return false;
    if (this.inRound) return false;
    return true;
  }

  showMapTooltipForPath(path, clientX, clientY) {
    if (!this.shouldShowMapTooltip() || !this.tooltip) {
      if (this.tooltip) this.tooltip.style.display = 'none';
      return;
    }
    const name = path.getAttribute('data-name');
    const bezirk = path.getAttribute('data-bezirk');
    if (path.classList.contains('locked-path') && !this.nameAllIsActive) {
      this.tooltip.innerHTML = `<div>${t('map.tooltipLocked')}</div><div class="tooltip-bezirk">${t('map.tooltipLockedHint')}</div>`;
    } else if (this.activeSegment === 'BEZIRKE') {
      const label = this.isEuropeCountriesMode()
        ? bezirk
        : t('map.tooltipBezirk', { bezirk });
      this.tooltip.innerHTML = `<div>${label}</div><div class="tooltip-bezirk">${t('map.tooltipTapLearn')}</div>`;
    } else if (this.isEuropeCapitalsMode()) {
      this.tooltip.innerHTML = `<div>${name}</div><div class="tooltip-bezirk">${bezirk}</div>`;
    } else {
      this.tooltip.innerHTML = `<div>${name}</div><div class="tooltip-bezirk">${bezirk}</div>`;
    }
    this.positionMapTooltip(clientX, clientY);
    this.tooltip.style.display = 'block';
  }

  positionMapTooltip(clientX, clientY) {
    if (!this.tooltip) return;
    const offsetX = 14;
    const offsetY = 12;
    this.tooltip.style.visibility = 'hidden';
    this.tooltip.style.display = 'block';
    this.tooltip.style.position = 'fixed';
    const rect = this.tooltip.getBoundingClientRect();
    const w = rect.width || 160;
    const h = rect.height || 40;
    let x = clientX + offsetX;
    let y = clientY - h - offsetY;
    x = Math.max(8, Math.min(x, window.innerWidth - w - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - h - 8));
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
    this.tooltip.style.transform = 'none';
    this.tooltip.style.visibility = 'visible';
  }

  // --- MODE: EXPLORER (ENTDECKER) ---
  initExplorerMode(container) {
    const isBz = this.activeSegment === 'BEZIRKE';
    const cfg = getCityConfig(this.activeCityId);
    const emptyKey = isBz ? cfg.emptyBezirk : cfg.emptyDetail;
    const icon = this.isEuropeCountriesMode() ? '🌍' : (isBz ? '🏢' : '🗺️');
    container.innerHTML = `
      <div id="explorer-details" class="empty-info">
        <div class="ei-icon">${icon}</div>
        <p>${t(emptyKey)}</p>
      </div>
    `;
    this.updateMapStates();
  }

  selectNeighbourhoodByName(name) {
    const paths = document.querySelectorAll('.stadtteil-path');
    for (const path of paths) {
      if (path.getAttribute('data-name') === name) {
        this.selectNeighbourhood(path, name, path.getAttribute('data-bezirk'));
        break;
      }
    }
  }

  selectNeighbourhood(path, name, bezirk) {
    this.playSelectionSound();
    this.resetMapClasses();
    if (this.activeCityId === 'europe') {
      this.applyExplorerMapHighlight([path], bezirk);
    } else {
      path.classList.add('selected');
    }
    this.activeSelectPath = path;
    
    // Find detailed stadtteil data
    const info = this.getCityData().find(d => d.name === name) || {
      population: t('explorer.na'),
      area_km2: t('explorer.na'),
      bezirk: bezirk
    };
    
    // Compute population density
    let density = t('explorer.na');
    if (info.population && info.area_km2) {
      const popInt = parseInt(info.population.replace(/\./g, '').replace(/,/g, ''));
      const areaFloat = parseFloat(info.area_km2.replace(/,/g, '.'));
      if (!isNaN(popInt) && !isNaN(areaFloat) && areaFloat > 0) {
        density = `${formatNumber(Math.round(popInt / areaFloat))} ${t('explorer.densityUnit')}`;
      }
    }

    let trivia = getSpecificTrivia(name);
    if (!trivia) {
      const templates = getTriviaTemplates(bezirk) || [t('trivia.defaultStadtteil')];
      const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      trivia = `${t('trivia.locatedIn', { name, bezirk })} ${templates[hash % templates.length]}`;
    }

    const container = document.getElementById('game-play-area');
    container.innerHTML = `
      <div class="info-details">
        <div class="detail-header">
          <h2>${name}</h2>
          <span class="bezirk-tag" style="background: hsla(${this.getBezirkHue(bezirk)}, 100%, 65%, 0.15); color: hsla(${this.getBezirkHue(bezirk)}, 100%, 65%, 1); border: 1px solid hsla(${this.getBezirkHue(bezirk)}, 100%, 65%, 0.3)">
            ${bezirk}
          </span>
        </div>
        <div class="detail-stats-grid">
          <div class="detail-stat">
            <div class="ds-label">${t('explorer.residents')}</div>
            <div class="ds-value">${info.population}</div>
          </div>
          <div class="detail-stat">
            <div class="ds-label">${t('explorer.area')}</div>
            <div class="ds-value">${info.area_km2} km²</div>
          </div>
          <div class="detail-stat" style="grid-column: span 2;">
            <div class="ds-label">${t('explorer.density')}</div>
            <div class="ds-value">${density}</div>
          </div>
        </div>
        <div class="detail-trivia">
          ${trivia}
        </div>
      </div>
    `;
  }

  selectBezirk(bezirkName) {
    if (this.isEuropeCountriesMode()) {
      this.selectCountry(bezirkName);
      return;
    }
    this.playSelectionSound();
    this.resetMapClasses();
    
    const paths = document.querySelectorAll(`.stadtteil-path[data-bezirk="${bezirkName}"]`);
    if (this.activeCityId === 'europe') {
      this.applyExplorerMapHighlight(paths, bezirkName);
    } else {
      paths.forEach((p) => p.classList.add('selected'));
    }

    // Compute collective statistics for Bezirk
    const bzStadtteile = this.getCityData().filter(d => d.bezirk === bezirkName);
    
    let totalPop = 0;
    let totalArea = 0;
    bzStadtteile.forEach(d => {
      const popVal = parseInt(d.population.replace(/\./g, '').replace(/,/g, ''));
      const areaVal = parseFloat(d.area_km2.replace(/,/g, '.'));
      if (!isNaN(popVal)) totalPop += popVal;
      if (!isNaN(areaVal)) totalArea += areaVal;
    });

    const formattedPop = formatNumber(totalPop);
    const formattedArea = totalArea.toLocaleString(getFormatLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const density = totalArea > 0 ? `${formatNumber(Math.round(totalPop / totalArea))} ${t('explorer.densityUnit')}` : t('explorer.na');

    const templates = getTriviaTemplates(bezirkName) || [t('trivia.defaultBezirk')];
    const trivia = templates[0];

    const subKey = getCityConfig(this.activeCityId).subdistricts;
    const container = document.getElementById('game-play-area');
    container.innerHTML = `
      <div class="info-details">
        <div class="detail-header">
          <h2>${t('explorer.bezirkTitle', { name: bezirkName })}</h2>
          <span class="bezirk-tag" style="background: hsla(${this.getBezirkHue(bezirkName)}, 100%, 65%, 0.15); color: hsla(${this.getBezirkHue(bezirkName)}, 100%, 65%, 1); border: 1px solid hsla(${this.getBezirkHue(bezirkName)}, 100%, 65%, 0.3)">
            ${t('explorer.mainDistrict')}
          </span>
        </div>
        <div class="detail-stats-grid">
          <div class="detail-stat">
            <div class="ds-label">${t('explorer.totalResidents')}</div>
            <div class="ds-value">${formattedPop}</div>
          </div>
          <div class="detail-stat">
            <div class="ds-label">${t('explorer.totalArea')}</div>
            <div class="ds-value">${formattedArea} km²</div>
          </div>
          <div class="detail-stat" style="grid-column: span 2;">
            <div class="ds-label">${t('explorer.avgDensity')}</div>
            <div class="ds-value">${density}</div>
          </div>
        </div>
        <div class="detail-stat" style="margin-top:0.25rem;">
          <div class="ds-label">${t(subKey, { count: bzStadtteile.length })}</div>
          <div style="font-size:0.78rem; max-height: 80px; overflow-y:auto; color: var(--text-secondary); line-height: 1.35; padding-top:0.2rem;">
            ${bzStadtteile.map(s => s.name).sort().join(', ')}
          </div>
        </div>
        <div class="detail-trivia">
          ${trivia}
        </div>
      </div>
    `;
  }

  selectCountry(countryName) {
    this.playSelectionSound();
    this.resetMapClasses();

    const paths = document.querySelectorAll(`.stadtteil-path[data-bezirk="${countryName}"]`);
    this.applyExplorerMapHighlight(paths, countryName);

    const countryData = this.getCityData().filter(d => d.bezirk === countryName);
    const info = countryData[0] || {};

    let totalPop = 0;
    let totalArea = 0;
    countryData.forEach(d => {
      const popVal = parseInt(d.population.replace(/\./g, '').replace(/,/g, ''));
      const areaVal = parseFloat(d.area_km2.replace(/,/g, '.'));
      if (!isNaN(popVal)) totalPop += popVal;
      if (!isNaN(areaVal)) totalArea += areaVal;
    });

    const formattedPop = formatNumber(totalPop);
    const formattedArea = totalArea.toLocaleString(getFormatLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const density = totalArea > 0 ? `${formatNumber(Math.round(totalPop / totalArea))} ${t('explorer.densityUnit')}` : t('explorer.na');
    const capital = info.name || countryData.map(d => d.name).join(', ');
    const templates = getTriviaTemplates(countryName) || [t(getCityConfig(this.activeCityId).defaultBezirkTrivia)];
    const trivia = templates[0];

    const container = document.getElementById('game-play-area');
    container.innerHTML = `
      <div class="info-details">
        <div class="detail-header">
          <h2>${countryName}</h2>
          <span class="bezirk-tag" style="background: hsla(${this.getBezirkHue(countryName)}, 100%, 65%, 0.15); color: hsla(${this.getBezirkHue(countryName)}, 100%, 65%, 1); border: 1px solid hsla(${this.getBezirkHue(countryName)}, 100%, 65%, 0.3)">
            ${t('explorer.capitalsEurope')}: ${capital}
          </span>
        </div>
        <div class="detail-stats-grid">
          <div class="detail-stat">
            <div class="ds-label">${t('explorer.totalResidents')}</div>
            <div class="ds-value">${formattedPop}</div>
          </div>
          <div class="detail-stat">
            <div class="ds-label">${t('explorer.totalArea')}</div>
            <div class="ds-value">${formattedArea} km²</div>
          </div>
          <div class="detail-stat" style="grid-column: span 2;">
            <div class="ds-label">${t('explorer.avgDensity')}</div>
            <div class="ds-value">${density}</div>
          </div>
        </div>
        <div class="detail-trivia">
          ${trivia}
        </div>
      </div>
    `;
  }

  getBezirkHue(bezirk) {
    const hues = {
      Altona: 295, Bergedorf: 32, 'Eimsbüttel': 175, 'Hamburg-Mitte': 345,
      'Hamburg-Nord': 210, Harburg: 100, Wandsbek: 260,
      Mitte: 38, 'Friedrichshain-Kreuzberg': 350, Pankow: 160,
      'Charlottenburg-Wilmersdorf': 280, Spandau: 200, 'Steglitz-Zehlendorf': 120,
      'Tempelhof-Schöneberg': 310, Neukölln: 45, 'Treptow-Köpenick': 85,
      'Marzahn-Hellersdorf': 15, Lichtenberg: 330, Reinickendorf: 190,
      'Innenstadt I': 352, 'Innenstadt II': 5, 'Innenstadt III': 20,
      'Bornheim/Ostend': 340, Süd: 25, West: 210, 'Mitte-West': 280,
      'Nord-West': 175, 'Mitte-Nord': 310, 'Nord-Ost': 45, Ost: 185,
      'Kalbach-Riedberg': 130, 'Nieder-Erlenbach': 95, Harheim: 160,
      'Nieder-Eschbach': 220, 'Bergen-Enkheim': 15
    };
    if (hues[bezirk] !== undefined) return hues[bezirk];
    let hash = 0;
    for (let i = 0; i < bezirk.length; i++) {
      hash = bezirk.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
  }

  // --- CORE GAME MODES & SPORCLE ROUNDS ---
  initGameMode(container) {
    const isBz = this.activeSegment === 'BEZIRKE';
    
    container.innerHTML = `
      <div class="game-play-area">
        <!-- Play / Round Controls -->
        <div class="round-setup-card" id="round-setup-ui" style="display: flex; flex-direction: column; gap: 0.75rem; text-align: center;">
          <div style="font-size: 1.8rem;">🎮</div>
          <h4 style="font-family: var(--font-display); font-weight:700; color: #fff;">${t('game.roundStartTitle')}</h4>
          <p style="font-size:0.82rem; color: var(--text-secondary);">
            ${t('game.roundStartDesc')}
            <br><strong>${t('game.timeLimit')}</strong>
            ${this.progressionMode && !isBz ? `<br><strong style="color: var(--color-xp);">${t('game.unlockHint')}</strong>` : ''}
          </p>
          
          ${!isBz ? this.renderBezirkPickerHtml('bezirk-picker', this.getUnlockedBezirke(), {
            allChecked: this.isEuropeCapitalsMode(),
            showBulkActions: this.isEuropeCapitalsMode()
          }) : ''}

          <button class="primary-btn" id="btn-start-round" style="margin-top:0.4rem; padding: 0.75rem;">${t('game.begin')}</button>
        </div>

        <!-- Active round dashboard (hidden initially) -->
        <div id="round-active-ui" style="display:none; flex-direction:column;">
          <div class="prompt-box" style="margin-bottom:1rem;">
            <div class="prompt-title" id="game-prompt-title">...</div>
            <div class="prompt-target" id="game-prompt-target">${t('game.ready')}</div>
            <div class="prompt-sub" id="game-prompt-sub">${t('game.chooseBezirk')}</div>
          </div>
          
          <div class="timer-display" id="round-timer-display">10:00</div>
          <!-- Round Indicators -->
          <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.6rem; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; margin-bottom: 0.75rem;">
            <div id="round-questions-count" style="font-weight: 700; color: #fff;">${t('game.questionCount', { current: 0, total: 0 })}</div>
            <div style="display:flex; gap:0.75rem;">
              <span style="color: var(--color-correct); font-weight:700;">🟢 <span id="round-correct-count">0</span></span>
              <span style="color: var(--color-incorrect); font-weight:700;">🔴 <span id="round-incorrect-count">0</span></span>
            </div>
          </div>
          <div class="round-progress-bar">
            <div class="round-progress-fill" id="round-progress-fill"></div>
          </div>
          
          <div id="game-options-container" class="choices-grid">
            <!-- Options or text input will be injected here -->
          </div>

          <button type="button" class="secondary-btn danger-outline" id="btn-cancel-round" style="margin-top: 1rem;">${t('game.cancelRound')}</button>
        </div>
      </div>
    `;

    const startBtn = document.getElementById('btn-start-round');
    startBtn.addEventListener('click', () => {
      this.sounds.init();
      if (this.activeSegment === 'BEZIRKE') {
        this.startRound(null);
        return;
      }
      const selected = this.getSelectedRoundBezirke();
      if (!selected.length) {
        alert(t('game.selectBezirkAlert'));
        return;
      }
      this.startRound(selected);
    });

    this.bindBezirkPickerSound('bezirk-picker');
    if (this.isEuropeCapitalsMode()) this.bindBezirkPickerBulkActions('bezirk-picker');
  }

  getSelectedRoundBezirke() {
    const picker = document.getElementById('bezirk-picker');
    if (!picker) return [];
    return Array.from(picker.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
  }

  renderBezirkPickerHtml(pickerId, bezirke, { allChecked = false, showBulkActions = false } = {}) {
    const pickerLabel = this.isEuropeCapitalsMode() ? t('game.countryPicker') : t('game.bezirkPicker');
    const bulkActions = showBulkActions ? `
      <div class="bezirk-picker-actions">
        <button type="button" class="secondary-btn bezirk-picker-action" id="${pickerId}-select-all">${t('game.selectAllCountries')}</button>
        <button type="button" class="secondary-btn bezirk-picker-action" id="${pickerId}-deselect-all">${t('game.deselectAllCountries')}</button>
      </div>` : '';
    return `
      <div style="text-align: left; display:flex; flex-direction:column; gap:0.35rem;">
        <label style="font-size:0.75rem; color: var(--text-muted); font-weight:600;">${pickerLabel}</label>
        ${bulkActions}
        <div class="bezirk-picker" id="${pickerId}">
          ${bezirke.map((b, i) => `
            <label class="bezirk-picker-item">
              <input type="checkbox" value="${b}" ${allChecked || i === 0 ? 'checked' : ''}>
              <span>${b}</span>
            </label>
          `).join('')}
        </div>
      </div>`;
  }

  bindBezirkPickerBulkActions(pickerId) {
    const picker = document.getElementById(pickerId);
    if (!picker) return;
    document.getElementById(`${pickerId}-select-all`)?.addEventListener('click', () => {
      picker.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = true; });
      this.playSelectionSound();
    });
    document.getElementById(`${pickerId}-deselect-all`)?.addEventListener('click', () => {
      picker.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
      this.playSelectionSound();
    });
  }

  bindBezirkPickerSound(pickerId) {
    const picker = document.getElementById(pickerId);
    if (!picker) return;
    picker.addEventListener('change', (e) => {
      if (e.target.matches('input[type="checkbox"]')) this.playSelectionSound();
    });
  }

  // --- SPORCLE ROUND CONTROL FUNCTIONS ---
  startRound(districtSelection) {
    if (this.inRound) return;

    if (!document.getElementById('round-setup-ui')) {
      const playArea = document.getElementById('game-play-area');
      if (playArea) this.initGameMode(playArea);
    }

    this.sounds.init();
    this.resetMapClasses();
    this.clearMapTextLabels();
    this.updateMapStates();
    
    this.inRound = true;
    this.roundDistrict = districtSelection;
    this.roundCorrect = 0;
    this.roundIncorrect = 0;
    this.roundIndex = 0;
    this.roundHistory = {};

    // Build question pool
    if (this.activeSegment === 'BEZIRKE') {
      this.roundQuestions = this.getProgression().map(b => ({ name: b.name, type: 'Bezirk' })).sort(() => Math.random() - 0.5);
    } else {
      const bezirke = Array.isArray(districtSelection) ? districtSelection : [districtSelection];
      const pool = this.getCityData().filter(d => !d.is_island && bezirke.includes(d.bezirk));
      this.roundQuestions = pool.sort(() => Math.random() - 0.5);
    }

    if (this.roundQuestions.length === 0) {
      alert(t('game.noQuestionsAlert'));
      this.inRound = false;
      return;
    }

    if (this.activeSegment === 'STADTTEILE' && Array.isArray(districtSelection)) {
      this.applyActiveBezirkFilter(districtSelection);
    }

    // Toggle UI Card elements
    document.getElementById('round-setup-ui').style.display = 'none';
    document.getElementById('round-active-ui').style.display = 'flex';

    this.setInRoundUI(true);
    
    this.startRoundTimer();
    this.nextRoundQuestion();
  }

  nextRoundQuestion() {
    this.activeSelectPath = null;
    
    // Remove blink state
    document.querySelectorAll('.stadtteil-path').forEach(p => p.classList.remove('blink', 'selected'));

    if (this.roundIndex >= this.roundQuestions.length) {
      this.finishRound();
      return;
    }

    this.currentTarget = this.roundQuestions[this.roundIndex];
    
    // Update counters
    document.getElementById('round-questions-count').textContent = t('game.placeCount', { current: this.roundIndex + 1, total: this.roundQuestions.length });
    document.getElementById('round-correct-count').textContent = this.roundCorrect;
    document.getElementById('round-incorrect-count').textContent = this.roundIncorrect;
    
    const fillPercent = (this.roundIndex / this.roundQuestions.length) * 100;
    document.getElementById('round-progress-fill').style.width = `${fillPercent}%`;

    const promptTitle = document.getElementById('game-prompt-title');
    const promptTarget = document.getElementById('game-prompt-target');
    const promptSub = document.getElementById('game-prompt-sub');
    const optionsContainer = document.getElementById('game-options-container');
    
    optionsContainer.innerHTML = '';
    
    // Mode specific prompt loading
    const isBz = this.activeSegment === 'BEZIRKE';
    let promptData = { title: '', target: '', sub: '', highlight: false, isHtml: false };

    const unit = this.getDetailUnitSuffix();
    if (this.currentMode === 'LOCATE') {
      promptData = this.activeCityId === 'europe'
        ? this.getEuropeRoundPrompts('LOCATE')
        : {
          title: isBz ? t('game.locateBezirk') : t(`game.locate${unit}`),
          target: this.currentTarget.name,
          sub: isBz ? t('game.locateClickBezirk') : t(`game.locateClick${unit}`, { bezirk: this.currentTarget.bezirk }),
          highlight: true
        };
    }
    else if (this.currentMode === 'QUIZ') {
      promptData = this.activeCityId === 'europe'
        ? this.getEuropeRoundPrompts('QUIZ')
        : {
          title: isBz ? t('game.quizBezirk') : t(`game.quiz${unit}`),
          target: isBz ? t('game.quizBlinkBezirk') : t(`game.quizBlink${unit}`),
          sub: t('game.quizChoose'),
          highlight: false,
          isHtml: true
        };

      this.blinkRoundTarget();
      this.generateMCROptions(optionsContainer);
    }
    else if (this.currentMode === 'TYPE_NAME') {
      promptData = this.activeCityId === 'europe'
        ? this.getEuropeRoundPrompts('TYPE_NAME')
        : {
          title: isBz ? t('game.typeBezirk') : t(`game.type${unit}`),
          target: isBz ? t('game.quizBezirk') : t(`game.quiz${unit}`),
          sub: t('game.typeHint'),
          highlight: false
        };

      this.blinkRoundTarget();
      this.generateTypingField(optionsContainer);
    }

    promptTitle.textContent = promptData.title;
    if (promptData.isHtml) promptTarget.innerHTML = promptData.target;
    else promptTarget.textContent = promptData.target;
    promptTarget.classList.toggle('highlight', promptData.highlight);
    promptSub.textContent = promptData.sub;
    this.syncMapPromptBar(promptData);
    this.zoomMapToGameArea();

    // Bind Cancel round button
    document.getElementById('btn-cancel-round').onclick = () => this.endRound(true);
  }

  getPathsForBezirke(bezirke) {
    if (!this.svg || !bezirke?.length) return [];
    const paths = [];
    bezirke.forEach((bezirk) => {
      this.svg.querySelectorAll(
        `.stadtteil-path:not(.bezirk-excluded)[data-bezirk="${CSS.escape(bezirk)}"]`
      ).forEach((p) => paths.push(p));
    });
    return paths;
  }

  /** Bezirke whose combined bounds should fill the map viewport edge-to-edge. */
  getMapZoomBezirke() {
    if (this.nameAllIsActive && this.nameAllActiveBezirke?.length) {
      return [...this.nameAllActiveBezirke];
    }
    if (!this.inRound || !this.currentTarget) return [];

    // Detective mode: continent overview — except tiny countries that are hard to tap
    if (this.currentMode === 'LOCATE') {
      if (this.activeCityId === 'europe' && this.currentTarget) {
        const microBz = this.activeSegment === 'BEZIRKE'
          ? this.currentTarget.name
          : this.currentTarget.bezirk;
        if (this.isEuropeMicrostate(microBz)) {
          return [microBz];
        }
      }
      if (Array.isArray(this.roundDistrict) && this.roundDistrict.length > 0) {
        const allUnlocked = this.getUnlockedBezirke();
        if (this.roundDistrict.length < allUnlocked.length) {
          return [...this.roundDistrict];
        }
      }
      return [];
    }

    const isBz = this.activeSegment === 'BEZIRKE';
    if (isBz) return [this.currentTarget.name];

    if (this.activeCityId === 'europe' && this.isEuropeMicrostate(this.currentTarget.bezirk)) {
      return [this.currentTarget.bezirk];
    }

    if (Array.isArray(this.roundDistrict) && this.roundDistrict.length > 0) {
      const allUnlocked = this.getUnlockedBezirke();
      if (this.roundDistrict.length < allUnlocked.length) {
        return [...this.roundDistrict];
      }
    }
    return this.currentTarget.bezirk ? [this.currentTarget.bezirk] : [];
  }

  zoomMapToGameArea() {
    if (!this.mapNav || !this.svg) return;
    const paths = this.getPathsForBezirke(this.getMapZoomBezirke());
    if (paths.length) {
      requestAnimationFrame(() => this.mapNav.zoomToPaths(paths));
    }
  }

  zoomMapToCurrentTarget() {
    this.zoomMapToGameArea();
  }

  getAlreadyAnsweredInRound() {
    const answered = new Set();
    const isBz = this.activeSegment === 'BEZIRKE';
    document.querySelectorAll('.stadtteil-path.round-correct, .stadtteil-path.round-incorrect').forEach(p => {
      if (isBz) {
        answered.add(p.getAttribute('data-bezirk'));
      } else {
        answered.add(p.getAttribute('data-name'));
      }
    });
    Object.keys(this.roundHistory).forEach(name => answered.add(name));
    return answered;
  }

  // Generate MC Choices for QUIZ
  generateMCROptions(container) {
    const isBz = this.activeSegment === 'BEZIRKE';
    const answered = this.getAlreadyAnsweredInRound();
    const choices = new Set([this.currentTarget.name]);

    let pool = [];
    if (isBz) {
      pool = this.getProgression().map(b => b.name).filter(n => !answered.has(n) && n !== this.currentTarget.name);
    } else {
      pool = this.roundQuestions.map(q => q.name).filter(n => !answered.has(n) && n !== this.currentTarget.name);
      if (pool.length < 3) {
        pool = this.getCityData().filter(d => !d.is_island && !answered.has(d.name) && d.name !== this.currentTarget.name).map(d => d.name);
      }
    }

    const maxChoices = Math.min(4, pool.length + 1);
    while (choices.size < maxChoices && pool.length > 0) {
      const pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      choices.add(pick);
    }

    this.currentChoices = Array.from(choices).sort(() => Math.random() - 0.5);
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    this.currentChoices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `<span>${choice}</span><span class="choice-letter">${letters[idx] || ''}</span>`;
      btn.addEventListener('click', () => this.handleRoundAnswer(choice, btn));
      container.appendChild(btn);
    });
  }

  // Generate typing guess field (no name suggestions — pure recall)
  generateTypingField(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'autocomplete-container';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'text-input-field';
    input.placeholder = this.activeSegment === 'BEZIRKE'
      ? (this.isEuropeCountriesMode() ? t('game.placeholderCountry') : t('game.placeholderBezirk'))
      : t(`game.placeholder${this.getDetailUnitSuffix()}`);
    input.id = 'type-name-input';
    input.setAttribute('autocomplete', 'off');
    
    wrapper.appendChild(input);
    container.appendChild(wrapper);

    input.focus();

    const cleanStr = str => this.normalizeGuess(str);

    input.addEventListener('input', () => {
      const val = input.value.trim();
      if (!val || !this.currentTarget || input.style.pointerEvents === 'none') return;
      if (cleanStr(val) === cleanStr(this.currentTarget.name)) {
        this.submitTypingGuess(val);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submitTypingGuess(input.value.trim());
      }
    });
  }

  handleAutocompleteInput(input, dropdown) {
    const text = input.value.trim().toLowerCase();
    dropdown.innerHTML = '';
    this.autocompleteIndex = -1;

    if (text.length < 1) {
      dropdown.style.display = 'none';
      return;
    }

    // Build suggestion list
    let pool = [];
    if (this.activeSegment === 'BEZIRKE') {
      pool = this.getProgression().map(b => b.name);
    } else {
      pool = this.getCityData().filter(d => !d.is_island).map(d => d.name);
    }

    const matches = pool.filter(name => name.toLowerCase().includes(text)).slice(0, 5);

    if (matches.length === 0) {
      dropdown.style.display = 'none';
      return;
    }

    matches.forEach((match, idx) => {
      const div = document.createElement('div');
      div.className = 'autocomplete-item';
      div.textContent = match;
      div.onclick = () => {
        input.value = match;
        dropdown.style.display = 'none';
        input.focus();
      };
      dropdown.appendChild(div);
    });

    dropdown.style.display = 'block';
  }

  handleAutocompleteKeys(e, input, dropdown) {
    const items = dropdown.querySelectorAll('.autocomplete-item');
    
    if (dropdown.style.display === 'block' && items.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.autocompleteIndex = (this.autocompleteIndex + 1) % items.length;
        this.updateActiveSuggestion(items);
      }
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.autocompleteIndex = (this.autocompleteIndex - 1 + items.length) % items.length;
        this.updateActiveSuggestion(items);
      }
      else if (e.key === 'Enter' && this.autocompleteIndex >= 0) {
        e.preventDefault();
        input.value = items[this.autocompleteIndex].textContent;
        dropdown.style.display = 'none';
        this.autocompleteIndex = -1;
      }
      else if (e.key === 'Enter') {
        e.preventDefault();
        this.submitTypingGuess(input.value.trim());
      }
      else if (e.key === 'Escape') {
        dropdown.style.display = 'none';
        this.autocompleteIndex = -1;
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submitTypingGuess(input.value.trim());
      }
    }
  }

  updateActiveSuggestion(items) {
    items.forEach((item, idx) => {
      if (idx === this.autocompleteIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  submitTypingGuess(typedValue) {
    if (!typedValue || !this.currentTarget) return;
    this.sounds.init();

    const correctAnswer = this.currentTarget.name;
    const cleanStr = str => this.normalizeGuess(str);
    const isCorrect = cleanStr(typedValue) === cleanStr(correctAnswer);
    const input = document.getElementById('type-name-input');
    const isBz = this.activeSegment === 'BEZIRKE';

    if (!isCorrect) {
      this.sounds.playIncorrect();
      this.resetStreak();
      this.roundIncorrect++;
      document.getElementById('round-incorrect-count').textContent = this.roundIncorrect;
      this.revealMissedTarget(correctAnswer, isBz);
      if (input) {
        input.style.pointerEvents = 'none';
        input.classList.add('input-shake');
      }
      document.getElementById('game-prompt-sub').innerHTML =
        `<span style="color: var(--color-incorrect); font-weight:700;">${t('game.wrongAnswer', { answer: correctAnswer })}</span>`;
      this.roundHistory[correctAnswer] = { correct: false };
      this.roundIndex++;
      setTimeout(() => this.nextRoundQuestion(), 2400);
      return;
    }

    if (input) input.style.pointerEvents = 'none';
    this.sounds.init();
    this.roundCorrect++;
    this.incrementStreak();
    const xp = this.addXp(10);
    this.sounds.playCorrect();

    if (isBz) {
      document.querySelectorAll(`.stadtteil-path[data-bezirk="${correctAnswer}"]`).forEach(p => {
        p.classList.add('round-correct');
      });
      this.addMapTextLabel(correctAnswer, correctAnswer, 'correct');
    } else {
      const correctPath = this.getPathByNeighbourhoodName(correctAnswer);
      if (correctPath) correctPath.classList.add('round-correct');
      this.addMapTextLabel(correctAnswer, correctAnswer, 'correct');
      this.recordRoundProgress(correctAnswer);
      this.checkParadiseTrophy(correctAnswer);
    }

    document.getElementById('game-prompt-sub').innerHTML = `<span style="color: var(--color-correct); font-weight:700;">${t('game.correctXp', { xp })}</span>`;

    this.roundHistory[correctAnswer] = { correct: true };
    this.roundIndex++;
    setTimeout(() => this.nextRoundQuestion(), 1200);
  }

  // Answer handler for MCQ (and map clicks in QUIZ)
  handleRoundAnswer(selectedAnswer, chosenBtn) {
    if (!this.inRound || !this.currentTarget) return;
    this.sounds.init();

    const correctAnswer = this.currentTarget.name;
    const isCorrect = selectedAnswer === correctAnswer;

    document.querySelectorAll('.choice-btn').forEach(btn => {
      btn.style.pointerEvents = 'none';
      const textSpan = btn.querySelector('span');
      if (textSpan && textSpan.textContent === correctAnswer) btn.classList.add('correct');
    });
    if (chosenBtn) chosenBtn.style.pointerEvents = 'none';

    const isBz = this.activeSegment === 'BEZIRKE';
    
    this.unblinkRoundTarget();

    if (isCorrect) {
      this.roundCorrect++;
      this.incrementStreak();
      const xp = this.addXp(10);
      this.sounds.playCorrect();

      // Highlight map
      if (isBz) {
        document.querySelectorAll(`.stadtteil-path[data-bezirk="${correctAnswer}"]`).forEach(p => p.classList.add('round-correct'));
        this.addMapTextLabel(correctAnswer, correctAnswer, 'correct');
      } else {
        const correctPath = this.getPathByNeighbourhoodName(correctAnswer);
        if (correctPath) correctPath.classList.add('round-correct');
        this.addMapTextLabel(correctAnswer, correctAnswer, 'correct');
        this.recordRoundProgress(correctAnswer);
        this.checkParadiseTrophy(correctAnswer);
      }

      document.getElementById('game-prompt-sub').innerHTML = `<span style="color: var(--color-correct); font-weight:700;">${t('game.correctXp', { xp })}</span>`;
      
      this.roundHistory[correctAnswer] = { correct: true };
      this.roundIndex++;
      setTimeout(() => this.nextRoundQuestion(), 1200);
    } else {
      this.roundIncorrect++;
      this.resetStreak();
      this.sounds.playIncorrect();

      if (chosenBtn) chosenBtn.classList.add('incorrect');

      this.revealMissedTarget(correctAnswer, isBz);

      document.getElementById('game-prompt-sub').innerHTML = `<span style="color: var(--color-incorrect); font-weight:700;">${t('game.wrongAnswer', { answer: correctAnswer })}</span>`;
      
      this.roundHistory[correctAnswer] = { correct: false };
      this.roundIndex++;
      setTimeout(() => this.nextRoundQuestion(), 2400);
    }
  }

  // Answer handler for Locate click on map
  handleLocateClick(path, name, bezirk) {
    if (!this.inRound) return;
    this.sounds.init();
    const isCorrect = name === this.currentTarget.name;
    
    // Disable map temporary clicks
    document.querySelectorAll('.stadtteil-path').forEach(p => p.style.pointerEvents = 'none');

    if (isCorrect) {
      this.roundCorrect++;
      this.incrementStreak();
      const xp = this.addXp(15);
      this.sounds.playCorrect();

      path.classList.add('round-correct');
      this.addMapTextLabel(name, name, 'correct');
      this.recordRoundProgress(name);
      this.checkParadiseTrophy(name);

      document.getElementById('game-prompt-sub').innerHTML = `<span style="color: var(--color-correct); font-weight:700;">${t('game.locateCorrect', { xp })}</span>`;
      
      this.roundHistory[name] = { correct: true };
      this.roundIndex++;
      setTimeout(() => {
        document.querySelectorAll('.stadtteil-path').forEach(p => p.style.pointerEvents = 'auto');
        this.nextRoundQuestion();
      }, 1200);
    } else {
      this.roundIncorrect++;
      this.resetStreak();
      this.sounds.playIncorrect();

      this.revealMissedTarget(this.currentTarget.name, false);

      document.getElementById('game-prompt-sub').innerHTML = `<span style="color: var(--color-incorrect); font-weight:700;">${t('game.wrongAnswer', { answer: this.currentTarget.name })}</span>`;
      
      this.roundHistory[this.currentTarget.name] = { correct: false };
      this.roundIndex++;
      setTimeout(() => {
        document.querySelectorAll('.stadtteil-path').forEach(p => p.style.pointerEvents = 'auto');
        this.nextRoundQuestion();
      }, 2500);
    }
  }

  handleBezirkLocateClick(bezirkClicked) {
    if (!this.inRound) return;
    this.sounds.init();
    const isCorrect = bezirkClicked === this.currentTarget.name;

    document.querySelectorAll('.stadtteil-path').forEach(p => p.style.pointerEvents = 'none');

    if (isCorrect) {
      this.roundCorrect++;
      this.incrementStreak();
      const xp = this.addXp(15);
      this.sounds.playCorrect();

      document.querySelectorAll(`.stadtteil-path[data-bezirk="${bezirkClicked}"]`).forEach(p => p.classList.add('round-correct'));
      this.addMapTextLabel(bezirkClicked, bezirkClicked, 'correct');

      document.getElementById('game-prompt-sub').innerHTML = `<span style="color: var(--color-correct); font-weight:700;">${t('game.bezirkCorrect', { xp })}</span>`;
      
      this.roundHistory[bezirkClicked] = { correct: true };
      this.roundIndex++;
      setTimeout(() => {
        document.querySelectorAll('.stadtteil-path').forEach(p => p.style.pointerEvents = 'auto');
        this.nextRoundQuestion();
      }, 1200);
    } else {
      this.roundIncorrect++;
      this.resetStreak();
      this.sounds.playIncorrect();

      this.revealMissedTarget(this.currentTarget.name, true);

      document.getElementById('game-prompt-sub').innerHTML = `<span style="color: var(--color-incorrect); font-weight:700;">${t('game.wrongAnswer', { answer: this.currentTarget.name })}</span>`;
      
      this.roundHistory[this.currentTarget.name] = { correct: false };
      this.roundIndex++;
      setTimeout(() => {
        document.querySelectorAll('.stadtteil-path').forEach(p => p.style.pointerEvents = 'auto');
        this.nextRoundQuestion();
      }, 2500);
    }
  }

  getPathCentroid(path) {
    if (!path) return { x: 300, y: 300 };
    try {
      const box = path.getBBox();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    } catch (e) {
      return { x: 300, y: 300 };
    }
  }

  getBezirkCentroid(bezirkName) {
    const paths = this.svg.querySelectorAll(
      `.stadtteil-path[data-bezirk="${CSS.escape(bezirkName)}"]`
    );
    if (!paths.length) return { x: 300, y: 300 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    paths.forEach(path => {
      try {
        const box = path.getBBox();
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
      } catch (e) { /* skip */ }
    });
    if (!Number.isFinite(minX)) return { x: 300, y: 300 };
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }

  labelIdForKey(key) {
    return `lbl-${String(key).replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  // --- SVG LABEL OVERLAY SYSTEM ---
  addMapTextLabel(targetKey, labelText, variant = 'neutral') {
    const labelGroup = this.ensureMapLabelsGroup();
    if (!labelGroup) return;

    const id = this.labelIdForKey(targetKey);
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    let centroid;
    const path = this.getPathByNeighbourhoodName(targetKey);
    if (path) {
      centroid = this.getPathCentroid(path);
    } else if (this.getProgression().some(b => b.name === targetKey)) {
      centroid = this.getBezirkCentroid(targetKey);
    } else {
      return;
    }

    const shortLabel = labelText.length > 18 ? `${labelText.slice(0, 16)}…` : labelText;
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', centroid.x.toFixed(2));
    text.setAttribute('y', centroid.y.toFixed(2));
    text.setAttribute('class', `map-text-label label-${variant}`);
    text.setAttribute('id', id);
    text.textContent = shortLabel;
    labelGroup.appendChild(text);
  }

  clearMapTextLabels() {
    const labelGroup = this.svg?.querySelector('#map-labels-group');
    if (labelGroup) labelGroup.innerHTML = '';
  }

  // --- ROUND FINISHED SUMMARY ENGINE ---
  finishRound(options = {}) {
    const { timedOut = false } = options;
    if (!this.inRound) return;
    this.stopActiveTimer();
    const durationSec = this.getRoundElapsedSeconds();
    this.inRound = false;
    this.setInRoundUI(false);
    
    const total = this.roundQuestions.length;
    const percent = Math.round((this.roundCorrect / total) * 100);
    const passed = percent >= 75;

    // progression: unlock next Bezirk when frontier Bezirk scored ≥75% in any mode
    let unlockCongrat = '';
    const isBz = this.activeSegment === 'BEZIRKE';
    const roundBezirke = Array.isArray(this.roundDistrict) ? this.roundDistrict : [this.roundDistrict];

    const useBezirkProgression = this.progressionMode
      && !(this.activeCityId === 'europe' && this.activeSegment === 'STADTTEILE');
    if (useBezirkProgression) {
      const { correct: fCorrect, total: fTotal } = this.getFrontierRoundScore();
      const frontierPercent = fTotal > 0 ? Math.round((fCorrect / fTotal) * 100) : 0;
      const unlockedNext = this.tryUnlockNextBezirk(fCorrect, fTotal);

      if (unlockedNext) {
        unlockCongrat = `<br><h3 style="color: var(--color-xp); margin: 0.5rem 0;">${t('game.bezirkUnlocked', { name: unlockedNext })}</h3>`;
      } else if (fTotal > 0 && frontierPercent < 75 && this.unlockedBezirkIndex < this.getProgression().length - 1) {
        unlockCongrat = `<br><span style="color: var(--color-incorrect); font-weight:700;">${t('game.bezirkNeed75', { bezirk: this.getLastUnlockedBezirk(), percent: frontierPercent })}</span>`;
      }
    }

    const container = document.getElementById('game-play-area');
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; text-align: center; padding: 0.5rem;">
        <div style="font-size: 2.2rem;">🏁</div>
        <h3 style="font-family: var(--font-display); font-weight:700; color: #fff;">${t('game.roundEnded')}</h3>
        ${timedOut ? `<p style="font-size:0.85rem; color:var(--color-incorrect); font-weight:700;">${t('game.timeUp')}</p>` : ''}
        <p style="font-size:0.85rem; color:var(--text-secondary);">${t('game.playDuration')} <strong>${this.formatDuration(durationSec)}</strong></p>
        
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem; display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; margin-top:0.4rem;">
          <div>
            <div style="font-size:0.75rem; color: var(--text-muted);">${t('game.result')}</div>
            <div style="font-size:1.4rem; font-weight:700; color: ${passed ? 'var(--color-correct)' : 'var(--color-incorrect)'};">${this.roundCorrect} / ${total}</div>
          </div>
          <div>
            <div style="font-size:0.75rem; color: var(--text-muted);">${t('game.successRate')}</div>
            <div style="font-size:1.4rem; font-weight:700; color: ${passed ? 'var(--color-correct)' : 'var(--color-incorrect)'};">${percent}%</div>
          </div>
        </div>

        ${unlockCongrat}

        <div class="round-end-actions">
          <button class="primary-btn" id="btn-restart-round">${t('game.playAgain')}</button>
          <button class="secondary-btn" id="btn-exit-round">${t('game.exit')}</button>
        </div>
      </div>
    `;

    if (percent === 100) launchConfetti(this.sounds);
    else if (percent < 50) launchSadEffects(this.sounds);

    if (percent === 100 && this.activeCityId === 'europe') {
      const correctNames = Object.entries(this.roundHistory)
        .filter(([, v]) => v.correct)
        .map(([name]) => name);
      const poolNames = this.roundQuestions.map(q => q.name);
      this.checkEuropeGroupTrophies(correctNames, poolNames);
    }

    this.recordGameHistory({
      mode: this.currentMode,
      segment: this.activeSegment,
      districts: roundBezirke,
      correct: this.roundCorrect,
      total,
      percent,
      passed,
      durationSec
    });
    this._submitLeaderboardBest(this.roundCorrect, total, durationSec, this.currentMode);

    document.getElementById('btn-restart-round').onclick = () => {
      this.resetMapClasses();
      this.clearMapTextLabels();
      this.updateMapStates();
      const playArea = document.getElementById('game-play-area');
      if (playArea) this.initGameMode(playArea);
    };
    document.getElementById('btn-exit-round').onclick = () => this.setMode(this.currentMode);

    this.renderStats();
    this.saveState();
  }

  // End active round immediately
  endRound(showUI = true) {
    this.stopActiveTimer();
    this.inRound = false;
    this.setInRoundUI(false);
    this.resetMapClasses();
    this.clearMapTextLabels();
    if (showUI) this.setMode(this.currentMode);
  }


  // --- MODE: NAME_ALL (SPORCLE COUNTDOWN CHALLENGE) ---
  initNameAllMode(container) {
    this.nameAllFound.clear();
    this.nameAllIsActive = false;
    this.nameAllTimeLeft = ROUND_TIME_LIMIT;
    const isBz = this.activeSegment === 'BEZIRKE';
    const pickerBezirke = isBz ? this.getProgression().map(b => b.name) : this.getUnlockedBezirke();

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.75rem; text-align:center;" id="name-all-setup">
        <div style="font-size:2.2rem;">⏱️</div>
        <h4 style="font-family:var(--font-display); font-weight:700; color:#fff;">${isBz ? t('nameAll.titleBezirke') : t('nameAll.titleStadtteile')}</h4>
        <p style="font-size:0.82rem; color:var(--text-secondary);">
          ${isBz ? t('nameAll.introBezirke') : t('nameAll.introStadtteile')}
          ${t('nameAll.introSuffix')}
          <br><strong>${t('nameAll.timeLimit')}</strong>
        </p>
        ${!isBz ? this.renderBezirkPickerHtml('nameall-bezirk-picker', pickerBezirke, {
          allChecked: true,
          showBulkActions: this.isEuropeCapitalsMode()
        }) : ''}
        <button class="primary-btn" id="btn-start-nameall" style="padding:0.75rem;">${t('game.begin')}</button>
      </div>

      <div style="display:none; flex-direction:column; gap:0.6rem;" id="name-all-active">
        <div class="timer-display" id="timer-display">10:00</div>
        
        <div style="background: rgba(0,0,0,0.15); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.5rem; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
          <span style="font-weight:700; color:#fff;">${t('nameAll.found')}</span>
          <span style="font-weight:700; color:var(--color-correct);" id="name-all-counter">0 / 104</span>
        </div>

        <input type="text" class="text-input-field" id="name-all-input" placeholder="${t('nameAll.placeholder')}" autocomplete="off">

        <div class="action-btn-row" style="margin-top:0.4rem;">
          <button type="button" class="secondary-btn" id="btn-pause-nameall">${t('nameAll.pause')}</button>
          <button type="button" class="secondary-btn danger-outline" id="btn-giveup-nameall">${t('nameAll.giveUp')}</button>
        </div>
      </div>
    `;

    document.getElementById('btn-start-nameall').onclick = () => {
      const selected = isBz ? this.getProgression().map(b => b.name) : this.getSelectedNameAllBezirke();
      if (!selected.length) {
        alert(t('game.selectBezirkAlert'));
        return;
      }
      this.startNameAllChallenge(selected);
    };

    this.bindBezirkPickerSound('nameall-bezirk-picker');
    if (this.isEuropeCapitalsMode()) this.bindBezirkPickerBulkActions('nameall-bezirk-picker');
  }

  getSelectedNameAllBezirke() {
    const picker = document.getElementById('nameall-bezirk-picker');
    if (!picker) return [];
    return Array.from(picker.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
  }

  getNameAllPool(bezirke) {
    if (this.activeSegment === 'BEZIRKE') {
      return bezirke.map(name => ({ name, bezirk: name }));
    }
    return this.getCityData().filter(d => !d.is_island && bezirke.includes(d.bezirk));
  }

  startNameAllChallenge(selectedBezirke) {
    this.sounds.init();
    this.resetMapClasses();
    this.clearMapTextLabels();

    this.nameAllActiveBezirke = selectedBezirke;
    
    // Hide unlocked segment overlays if progression is on, to make it completely blank
    document.querySelectorAll('.stadtteil-path').forEach(p => {
      p.classList.remove('locked-path', 'unlocked-bezirk', 'discovered');
      p.style.fill = '';
      p.style.stroke = '';
      p.style.pointerEvents = 'none';
    });
    this.applyActiveBezirkFilter(selectedBezirke);
    this.svg?.classList.add('name-all-active');
    this.raiseWaterLayerForNameAll();

    this.nameAllFound.clear();
    this.nameAllIsActive = true;
    this.nameAllTimeLeft = ROUND_TIME_LIMIT;

    document.getElementById('name-all-setup').style.display = 'none';
    document.getElementById('name-all-active').style.display = 'flex';

    const countLabel = document.getElementById('name-all-counter');
    const totalCount = this.getNameAllPool(selectedBezirke).length;
    countLabel.textContent = `0 / ${totalCount}`;

    const input = document.getElementById('name-all-input');
    input.value = '';
    input.focus();

    if (this._nameAllInputHandler) {
      input.removeEventListener('input', this._nameAllInputHandler);
    }
    this._nameAllInputHandler = () => {
      clearTimeout(this.nameAllInputTimer);
      this.nameAllInputTimer = setTimeout(() => this.checkNameAllInput(input, totalCount), 150);
    };
    input.addEventListener('input', this._nameAllInputHandler);

    // Bind Controls
    const pauseBtn = document.getElementById('btn-pause-nameall');
    pauseBtn.onclick = () => this.toggleNameAllPause(pauseBtn);

    const giveupBtn = document.getElementById('btn-giveup-nameall');
    giveupBtn.onclick = () => this.stopNameAllChallenge(true); // surrender

    // Start Timer
    this.stopActiveTimer();
    this.timerInterval = setInterval(() => this.tickNameAll(), 1000);
    requestAnimationFrame(() => this.zoomMapToGameArea());
  }

  tickNameAll() {
    if (!this.nameAllIsActive) return;

    this.nameAllTimeLeft--;
    
    const minutes = Math.floor(this.nameAllTimeLeft / 60);
    const seconds = this.nameAllTimeLeft % 60;
    const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const display = document.getElementById('timer-display');
    if (display) {
      display.textContent = formatted;
      display.classList.toggle('timer-warning', this.nameAllTimeLeft <= 60);
    }

    if (this.nameAllTimeLeft <= 0) {
      this.stopNameAllChallenge(true); // time out
    }
  }

  toggleNameAllPause(btn) {
    this.nameAllIsActive = !this.nameAllIsActive;
    
    const input = document.getElementById('name-all-input');
    if (this.nameAllIsActive) {
      btn.textContent = t('nameAll.pause');
      if (input) {
        input.disabled = false;
        input.focus();
      }
      this.timerInterval = setInterval(() => this.tickNameAll(), 1000);
    } else {
      btn.textContent = t('nameAll.resume');
      if (input) input.disabled = true;
      this.stopActiveTimer();
    }
  }

  checkNameAllInput(input, totalCount) {
    if (!this.nameAllIsActive) return;
    const val = input.value.trim();
    if (val.length < 2) return;

    const cleanStr = str => this.normalizeGuess(str);
    const cleanVal = cleanStr(val);
    const isBz = this.activeSegment === 'BEZIRKE';

    let matchName = null;
    if (isBz) {
      const bz = this.getProgression().find(b =>
        cleanStr(b.name) === cleanVal && this.nameAllActiveBezirke.includes(b.name)
      );
      if (bz) matchName = bz.name;
    } else {
      const match = this.getCityData().find(d =>
        cleanStr(d.name) === cleanVal &&
        !d.is_island &&
        this.nameAllActiveBezirke.includes(d.bezirk)
      );
      if (match) matchName = match.name;
    }
    
    if (matchName && !this.nameAllFound.has(matchName)) {
      this.nameAllFound.add(matchName);
      this.sounds.playCorrect();
      this.incrementStreak();

      if (isBz) {
        document.querySelectorAll(`.stadtteil-path[data-bezirk="${matchName}"]`).forEach(p => {
          p.classList.add('round-correct');
        });
        this.addMapTextLabel(matchName, matchName, 'correct');
      } else {
        const correctPath = this.getPathByNeighbourhoodName(matchName);
        if (correctPath) {
          correctPath.classList.add('round-correct');
          this.addMapTextLabel(matchName, matchName, 'correct');
        }
        this.recordRoundProgress(matchName, { skipMapRefresh: true, skipStats: true });
        this.checkParadiseTrophy(matchName);
      }

      this.addXp(6, { quiet: true });

      document.getElementById('name-all-counter').textContent = `${this.nameAllFound.size} / ${totalCount}`;

      input.value = '';
      
      if (this.nameAllFound.size === totalCount) {
        this.stopNameAllChallenge(false);
      }
    }
  }

  stopNameAllChallenge(surrender = true) {
    this.nameAllIsActive = false;
    this.svg?.classList.remove('name-all-active');
    this.reorderMapLayers();
    const durationSec = ROUND_TIME_LIMIT - this.nameAllTimeLeft;
    this.stopActiveTimer();

    const totalCount = this.getNameAllPool(this.nameAllActiveBezirke).length;
    const foundCount = this.nameAllFound.size;
    const percent = totalCount > 0 ? Math.round((foundCount / totalCount) * 100) : 0;

    // If surrender or timeout, reveal all missing in red and label them!
    if (surrender) {
      const missing = this.getNameAllPool(this.nameAllActiveBezirke).filter(d => !this.nameAllFound.has(d.name));
      let idx = 0;
      const revealBatch = () => {
        const slice = missing.slice(idx, idx + 12);
        slice.forEach(d => {
          if (this.activeSegment === 'BEZIRKE') {
            document.querySelectorAll(`.stadtteil-path[data-bezirk="${d.name}"]`).forEach(p => {
              p.classList.add('round-incorrect');
            });
            this.addMapTextLabel(d.name, d.name, 'incorrect');
          } else {
            const path = this.getPathByNeighbourhoodName(d.name);
            if (path) {
              path.classList.add('round-incorrect');
              this.addMapTextLabel(d.name, d.name, 'incorrect');
            }
          }
        });
        idx += 12;
        if (idx < missing.length) {
          requestAnimationFrame(revealBatch);
        }
      };
      requestAnimationFrame(revealBatch);
      this.sounds.playIncorrect();
      this.resetStreak();
    } else {
      this.sounds.playLevelUp();
      launchConfetti(this.sounds);
      if (this.activeSegment === 'STADTTEILE') {
        const ns = getCityConfig(this.activeCityId).trophyNs;
        this.unlockAchievement(
          'meister_alle_stadtteile',
          t(`${ns}.meister_alle_stadtteile.unlockTitle`),
          t(`${ns}.meister_alle_stadtteile.unlockDesc`)
        );
      } else {
        const ns = getCityConfig(this.activeCityId).trophyNs;
        this.unlockAchievement(
          'meister_alle_bezirke',
          t(`${ns}.meister_alle_bezirke.unlockTitle`),
          t(`${ns}.meister_alle_bezirke.unlockDesc`)
        );
      }
      if (this.activeCityId === 'europe') {
        const pool = this.getNameAllPool(this.nameAllActiveBezirke);
        this.checkEuropeGroupTrophies([...this.nameAllFound], pool.map(d => d.name));
      }
    }

    if (this.progressionMode && this.activeSegment === 'STADTTEILE' && this.activeCityId !== 'europe') {
      const frontierBezirk = this.getLastUnlockedBezirk();
      const frontierPool = this.getNameAllPool([frontierBezirk]);
      const frontierFound = frontierPool.filter(d => this.nameAllFound.has(d.name)).length;
      this.tryUnlockNextBezirk(frontierFound, frontierPool.length);
    }

    if (percent < 50 && (surrender || percent < 100)) {
      launchSadEffects(this.sounds);
    }

    this.recordGameHistory({
      mode: 'NAME_ALL',
      segment: this.activeSegment,
      districts: this.nameAllActiveBezirke.length ? this.nameAllActiveBezirke : [t('nameAll.allStadtteile')],
      correct: foundCount,
      total: totalCount,
      percent,
      passed: !surrender && foundCount === totalCount,
      durationSec
    });
    this._submitLeaderboardBest(foundCount, totalCount, durationSec, 'NAME_ALL');

    const container = document.getElementById('game-play-area');
    const isBzSegment = this.activeSegment === 'BEZIRKE';
    const resultMsg = surrender
      ? t('nameAll.surrenderMsg')
      : (isBzSegment ? t('nameAll.perfectMsgBezirke') : t('nameAll.perfectMsgStadtteile'));

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.75rem; text-align:center; padding: 0.5rem;">
        <div style="font-size:2.2rem;">⏱️</div>
        <h3 style="font-family:var(--font-display); font-weight:700; color:#fff;">${t('nameAll.challengeEnded')}</h3>
        
        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.25rem;">
          ${resultMsg}
        </p>
        <p style="font-size:0.85rem; color:var(--text-secondary);">${t('game.playDuration')} <strong>${this.formatDuration(durationSec)}</strong></p>

        <div style="background: rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem; display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${t('nameAll.foundLabel')}</div>
            <div style="font-size:1.4rem; font-weight:700; color:var(--color-correct);">${foundCount} / ${totalCount}</div>
          </div>
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${t('nameAll.quoteLabel')}</div>
            <div style="font-size:1.4rem; font-weight:700; color:var(--color-correct);">${percent}%</div>
          </div>
        </div>

        <div class="round-end-actions" style="margin-top:0.5rem;">
          <button class="secondary-btn" id="btn-exit-nameall">${t('nameAll.exitCleanup')}</button>
        </div>
      </div>
    `;

    document.getElementById('btn-exit-nameall').onclick = () => {
      this.resetMapClasses();
      this.clearMapTextLabels();
      this.setMode(this.currentMode);
    };

    this.updateMapStates();
    this.renderStats();
    this.saveState();
  }
}
