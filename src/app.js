/* -------------------------------------------------------------
 * Cyber-Alster Hamburg Stadtteile - Main Game Logic Engine V2
 * Pure modular JavaScript with Web Audio Synth and Custom SVG Zoom/Pan.
 * ------------------------------------------------------------- */

const RANK_THRESHOLDS = [
  { level: 1, minXp: 0, maxXp: 99 },
  { level: 2, minXp: 100, maxXp: 249 },
  { level: 3, minXp: 250, maxXp: 499 },
  { level: 4, minXp: 500, maxXp: 799 },
  { level: 5, minXp: 800, maxXp: 1199 },
  { level: 6, minXp: 1200, maxXp: 1699 },
  { level: 7, minXp: 1700, maxXp: 2299 },
  { level: 8, minXp: 2300, maxXp: 2999 },
  { level: 9, minXp: 3000, maxXp: 3999 },
  { level: 10, minXp: 4000, maxXp: Infinity }
];

const CITY_RANK_THRESHOLDS = [
  { level: 1, minDistricts: 0, minTrophies: 0 },
  { level: 2, minDistricts: 1, minTrophies: 0 },
  { level: 3, minDistricts: 2, minTrophies: 1 },
  { level: 4, minDistricts: 3, minTrophies: 2 },
  { level: 5, minDistricts: 4, minTrophies: 4 },
  { level: 6, minDistricts: 5, minTrophies: 6 },
  { level: 7, minDistricts: 6, minTrophies: 8 },
  { level: 8, minDistricts: 7, minTrophies: 11 }
];

const CITY_LOCALE_CONFIG = {
  hamburg: {
    rankKey: 'cityRanks',
    trophyNs: 'trophies',
    defaultBezirkTrivia: 'trivia.defaultBezirk',
    onboarding: 'onboarding',
    emptyBezirk: 'explorer.emptyBezirk',
    emptyDetail: 'explorer.emptyStadtteil',
    subdistricts: 'explorer.subdistricts',
    specialIds: ['neuwerk_island', 'paradise_explorer', 'meister_alle_stadtteile', 'meister_alle_bezirke'],
    detailUnit: 'Stadtteil'
  },
  berlin: {
    rankKey: 'cityRanksBerlin',
    trophyNs: 'trophiesBerlin',
    defaultBezirkTrivia: 'trivia.defaultBezirkBerlin',
    onboarding: 'onboardingBerlin',
    emptyBezirk: 'explorer.emptyBezirkBerlin',
    emptyDetail: 'explorer.emptyOrtsteil',
    subdistricts: 'explorer.subdistrictsBerlin',
    specialIds: ['pfaueninsel_island', 'paradise_explorer', 'meister_alle_stadtteile', 'meister_alle_bezirke'],
    detailUnit: 'Ortsteil'
  },
  frankfurt: {
    rankKey: 'cityRanksFrankfurt',
    trophyNs: 'trophiesFrankfurt',
    defaultBezirkTrivia: 'trivia.defaultBezirkFrankfurt',
    onboarding: 'onboardingFrankfurt',
    emptyBezirk: 'explorer.emptyBezirkFrankfurt',
    emptyDetail: 'explorer.emptyStadtteilFrankfurt',
    subdistricts: 'explorer.subdistrictsFrankfurt',
    specialIds: ['paradise_explorer', 'meister_alle_stadtteile', 'meister_alle_bezirke'],
    detailUnit: 'Stadtteil'
  }
};

function getCityConfig(cityId) {
  return CITY_LOCALE_CONFIG[cityId] || CITY_LOCALE_CONFIG.hamburg;
}

function getRanks() {
  return RANK_THRESHOLDS.map((rank) => ({
    ...rank,
    name: t(`ranks.${rank.level}.name`)
  }));
}

function getCityRankLocaleKey(cityId) {
  return getCityConfig(cityId).rankKey;
}

function getCityRanks(cityId) {
  const key = getCityRankLocaleKey(cityId || window.kiezQuizGame?.activeCityId || 'hamburg');
  return CITY_RANK_THRESHOLDS.map((rank) => ({
    ...rank,
    name: t(`${key}.${rank.level}.name`)
  }));
}

function getRankName(level) {
  return t(`ranks.${level}.name`) || t('ranks.fallback');
}

function getCityRankName(level, cityId) {
  const key = getCityRankLocaleKey(cityId || window.kiezQuizGame?.activeCityId || 'hamburg');
  return t(`${key}.${level}.name`) || t(`${key}.fallback`);
}

function getCityRankTotals(game, cityId) {
  const city = window.cityRegistry?.getCity(cityId);
  if (!city || city.status !== 'playable') {
    return { unlockedDistricts: 0, totalDistricts: 0, trophies: 0, totalTrophies: 0 };
  }
  const progression = window.cityRegistry.getBezirkeProgression(cityId);
  const totalDistricts = progression.length;
  const branch = game._save?.cities?.[cityId];
  const unlockedDistricts = cityId === game.activeCityId && game.view === 'city'
    ? game.unlockedBezirkIndex + 1
    : (parseInt(branch?.unlockedRegionIndex, 10) || 0) + 1;
  const totalTrophies = typeof getTrophyCatalog === 'function'
    ? getTrophyCatalog(cityId).length
    : (city.totalTrophies || 0);
  const trophies = cityId === game.activeCityId && game.view === 'city'
    ? (game.trophies?.size || 0)
    : (Array.isArray(branch?.trophies) ? branch.trophies.length : 0);
  return { unlockedDistricts, totalDistricts, trophies, totalTrophies };
}

function calculateCityLevel(game, cityId) {
  const totals = getCityRankTotals(game, cityId);
  if (totals.totalDistricts === 0 && totals.totalTrophies === 0) return 1;
  let currentLvl = 1;
  for (const rank of CITY_RANK_THRESHOLDS) {
    const minDistricts = rank.level === CITY_RANK_THRESHOLDS.length
      ? totals.totalDistricts
      : Math.min(rank.minDistricts, totals.totalDistricts);
    const minTrophies = rank.level === CITY_RANK_THRESHOLDS.length
      ? totals.totalTrophies
      : Math.min(rank.minTrophies, totals.totalTrophies);
    if (totals.unlockedDistricts >= minDistricts && totals.trophies >= minTrophies) {
      currentLvl = rank.level;
    }
  }
  return currentLvl;
}

function getTriviaTemplates(bezirk, cityId) {
  const templates = tMap('trivia.templates', bezirk);
  if (Array.isArray(templates)) return templates;
  const cid = cityId || window.kiezQuizGame?.activeCityId || 'hamburg';
  return [t(getCityConfig(cid).defaultBezirkTrivia)];
}

function getSpecificTrivia(name) {
  return tMap('trivia.specific', name) || null;
}

const MAP_SVG_CACHE = new Map();

const HAMBURG_BEZIRK_TROPHY_KEYS = {
  Altona: 'altona', Bergedorf: 'bergedorf', 'Eimsbüttel': 'eimsbuettel',
  'Hamburg-Mitte': 'hamburg-mitte', 'Hamburg-Nord': 'hamburg-nord',
  Harburg: 'harburg', Wandsbek: 'wandsbek'
};

function bezirkToTrophyCssKey(name) {
  return name.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getCityDataArray(cityId) {
  const city = window.cityRegistry?.getCity(cityId || window.kiezQuizGame?.activeCityId || 'hamburg');
  const key = city?.dataGlobal || 'HAMBURG_DATA';
  if (window[key]) return window[key];
  if (key === 'BERLIN_DATA' && typeof BERLIN_DATA !== 'undefined') return BERLIN_DATA;
  if (key === 'FRANKFURT_DATA' && typeof FRANKFURT_DATA !== 'undefined') return FRANKFURT_DATA;
  if (typeof HAMBURG_DATA !== 'undefined') return HAMBURG_DATA;
  return [];
}

function buildTrophyCatalog(cityId = 'hamburg') {
  const city = window.cityRegistry?.getCity(cityId);
  const progression = window.cityRegistry.getBezirkeProgression(cityId);
  const unitLabel = t(city?.levels?.[1]?.singularKey || 'cities.hamburg.singular.stadtteil');

  const cfg = getCityConfig(cityId);
  const specialIds = cfg.specialIds;
  const specialIcons = { neuwerk_island: '🏝️', pfaueninsel_island: '🦚', paradise_explorer: '🌴', meister_alle_stadtteile: '👑', meister_alle_bezirke: '🏛️' };
  const trophyNs = cfg.trophyNs;

  const specials = specialIds.map((id) => ({
    id,
    icon: specialIcons[id],
    name: t(`${trophyNs}.${id}.name`),
    desc: t(`${trophyNs}.${id}.desc`)
  }));

  const bezirkTrophiesFixed = progression.map((bz) => {
    const cssKey = cityId === 'hamburg'
      ? (HAMBURG_BEZIRK_TROPHY_KEYS[bz.name] || bezirkToTrophyCssKey(bz.name))
      : bezirkToTrophyCssKey(bz.name);
    const id = `master_${cssKey}`;
    if (cityId === 'hamburg' && HAMBURG_BEZIRK_TROPHY_KEYS[bz.name]) {
      return {
        id,
        name: t(`trophies.${id}.name`, { bezirk: bz.name }),
        icon: '🏆',
        desc: t(`trophies.${id}.desc`, { bezirk: bz.name })
      };
    }
    return {
      id,
      name: t('trophies.master_bezirk.name', { bezirk: bz.name, unit: unitLabel }),
      icon: '🏆',
      desc: t('trophies.master_bezirk.desc', { bezirk: bz.name, unit: unitLabel })
    };
  });
  return [...specials, ...bezirkTrophiesFixed];
}

function getTrophyCatalog(cityId) {
  const id = cityId || window.kiezQuizGame?.activeCityId || 'hamburg';
  return buildTrophyCatalog(id);
}

function getModeLabel(mode, segment) {
  if (mode === 'LOCATE') {
    return segment === 'BEZIRKE' ? t('modes.LOCATE_BEZIRKE') : t('modes.LOCATE');
  }
  return t(`modes.${mode}`) || mode;
}

const ROUND_TIME_LIMIT = 600; // 10 minutes for all timed game modes

const MODE_ICONS = {
  EXPLORER: '🗺️',
  LOCATE: '🕵️',
  QUIZ: '⚡',
  TYPE_NAME: '⌨️',
  NAME_ALL: '⏱️'
};

// Modes hidden in Bezirke segment (none — NAME_ALL available in both segments)
const BEZIRKE_SEGMENT_HIDDEN_MODES = [];

// Web Audio API Sound Synthesizer Class
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem("hamburg_muted") === "true";
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx?.state === 'suspended') {
      return this.ctx.resume().catch(() => {});
    }
    return Promise.resolve();
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem("hamburg_muted", this.muted ? "true" : "false");
    return this.muted;
  }

  playCorrect() {
    if (this.muted) return;
    this.init().then(() => this._ensureRunning()).then(() => this._playCorrectTone());
  }

  _playCorrectTone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    // First Note
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(329.63, t); // E4
    osc1.frequency.setValueAtTime(440.00, t + 0.08); // A4
    
    gain1.gain.setValueAtTime(0.15, t);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    
    osc1.start(t);
    osc1.stop(t + 0.4);
  }

  playSelect() {
    if (this.muted) return;
    this.init().then(() => this._ensureRunning()).then(() => this._playSelectTone());
  }

  _playSelectTone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  playIncorrect() {
    if (this.muted) return;
    this.init().then(() => this._ensureRunning()).then(() => this._playIncorrectTone());
  }

  _playIncorrectTone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(110, t + 0.3); // Descending pitch
    
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.4);
  }

  playLevelUp() {
    if (this.muted) return;
    this.init().then(() => this._ensureRunning()).then(() => this._playLevelUpTone());
  }

  playApplause() {
    if (this.muted) return;
    this.init().then(() => this._ensureRunning()).then(() => this._playApplauseTone());
  }

  _playApplauseTone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const claps = [
      { delay: 0, dur: 0.04, vol: 0.06 },
      { delay: 0.09, dur: 0.035, vol: 0.05 },
      { delay: 0.17, dur: 0.04, vol: 0.055 },
      { delay: 0.28, dur: 0.035, vol: 0.045 },
      { delay: 0.38, dur: 0.03, vol: 0.04 },
      { delay: 0.52, dur: 0.025, vol: 0.03 }
    ];

    claps.forEach(({ delay, dur, vol }) => {
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const env = 1 - i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const source = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      source.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900 + Math.random() * 400, t + delay);
      filter.Q.setValueAtTime(0.8, t + delay);
      gain.gain.setValueAtTime(vol, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(t + delay);
      source.stop(t + delay + dur + 0.01);
    });
  }

  playSad() {
    if (this.muted) return;
    this.init().then(() => this._ensureRunning()).then(() => this._playSadTone());
  }

  _playSadTone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(165, t + 0.6);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.75);
  }

  _ensureRunning() {
    if (this.ctx?.state === 'suspended') {
      return this.ctx.resume().catch(() => {});
    }
    return Promise.resolve();
  }

  _playLevelUpTone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Arpeggio C4, E4, G4, C5, E5, G5, C6
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);
      
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.08 + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.3);
    });
  }
}

function snapCoord(n) {
  return Math.round(n * 10) / 10;
}

function segmentKey(x1, y1, x2, y2) {
  const a = `${snapCoord(x1)},${snapCoord(y1)}`;
  const b = `${snapCoord(x2)},${snapCoord(y2)}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function parsePathSegments(d) {
  const segments = [];
  if (!d) return segments;

  const parts = d.trim().split(/(?=[MLZ])/i);
  let startPoint = null;
  let current = null;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const cmd = trimmed[0].toUpperCase();
    const nums = trimmed.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);

    if (cmd === 'M') {
      current = [nums[0], nums[1]];
      startPoint = [...current];
      for (let i = 2; i + 1 < nums.length; i += 2) {
        segments.push([current[0], current[1], nums[i], nums[i + 1]]);
        current = [nums[i], nums[i + 1]];
      }
    } else if (cmd === 'L') {
      for (let i = 0; i + 1 < nums.length; i += 2) {
        segments.push([current[0], current[1], nums[i], nums[i + 1]]);
        current = [nums[i], nums[i + 1]];
      }
    } else if (cmd === 'Z' && current && startPoint) {
      segments.push([current[0], current[1], startPoint[0], startPoint[1]]);
    }
  }
  return segments;
}

function launchSadEffects(soundManager) {
  if (soundManager) soundManager.playSad();
  const overlay = document.createElement('div');
  overlay.className = 'sad-overlay';
  document.body.appendChild(overlay);
  for (let i = 0; i < 18; i++) {
    const drop = document.createElement('div');
    drop.className = 'sad-raindrop';
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.animationDelay = `${Math.random() * 0.8}s`;
    drop.style.setProperty('--fall-dur', `${0.9 + Math.random() * 0.6}s`);
    overlay.appendChild(drop);
  }
  setTimeout(() => overlay.remove(), 2200);
}

let overlayScrollLockY = 0;

function openOverlayModal(html, { closeOnBackdrop = false } = {}) {
  const modal = document.createElement('div');
  modal.className = 'overlay-modal';
  modal.innerHTML = html;
  overlayScrollLockY = window.scrollY;
  document.body.style.top = `-${overlayScrollLockY}px`;
  document.body.classList.add('overlay-open');
  document.body.appendChild(modal);
  if (closeOnBackdrop) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeOverlayModal(modal);
    });
  }
  return modal;
}

function closeOverlayModal(modal) {
  modal.remove();
  if (!document.querySelector('.overlay-modal')) {
    document.body.classList.remove('overlay-open');
    document.body.style.top = '';
    window.scrollTo(0, overlayScrollLockY);
  }
}

function launchConfetti(soundManager) {
  if (soundManager) soundManager.playApplause();
  const container = document.createElement('div');
  container.className = 'confetti-container';
  const colors = ['#22c55e', '#00a2ff', '#fbbf24', '#a855f7', '#ef4444', '#14b8a6'];
  for (let i = 0; i < 70; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.background = colors[i % colors.length];
    particle.style.animationDelay = `${Math.random() * 0.35}s`;
    particle.style.setProperty('--x-drift', `${(Math.random() - 0.5) * 140}px`);
    container.appendChild(particle);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 2600);
}

// Zoom & Pan System for interactive SVG
class MapNavigator {
  constructor(svgElement, containerElement) {
    this.svg = svgElement;
    this.container = containerElement;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.isPinching = false;
    this.didDrag = false;
    this.pendingDrag = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.startX = 0;
    this.startY = 0;
    this.lastPinchDistance = 0;
    this._wheelSnapTimer = null;
    this.RUBBER_RESISTANCE = 0.32;
    
    this.setupListeners();
    this.updateTransform();
  }

  getPanBounds() {
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    const baseW = this.svg.offsetWidth || cw;
    const baseH = this.svg.offsetHeight || ch;
    const scaledW = baseW * this.zoom;
    const scaledH = baseH * this.zoom;
    const overscroll = Math.min(cw, ch) * 0.12;
    const maxPanX = Math.max(overscroll, (scaledW - cw) / 2 + overscroll);
    const maxPanY = Math.max(overscroll, (scaledH - ch) / 2 + overscroll);
    return { minX: -maxPanX, maxX: maxPanX, minY: -maxPanY, maxY: maxPanY };
  }

  applyRubberBand(value, min, max) {
    if (value >= min && value <= max) return value;
    const edge = value < min ? min : max;
    return edge + (value - edge) * this.RUBBER_RESISTANCE;
  }

  snapPanToBounds() {
    const b = this.getPanBounds();
    const nx = Math.min(b.maxX, Math.max(b.minX, this.panX));
    const ny = Math.min(b.maxY, Math.max(b.minY, this.panY));
    if (nx === this.panX && ny === this.panY) return;
    this.svg.classList.add('smooth-transition');
    this.panX = nx;
    this.panY = ny;
    this.updateTransform(false);
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  scheduleWheelSnap() {
    clearTimeout(this._wheelSnapTimer);
    this._wheelSnapTimer = setTimeout(() => this.snapPanToBounds(), 120);
  }

  getPinchDistance(e) {
    const [a, b] = [e.touches[0], e.touches[1]];
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  setupListeners() {
    const DRAG_THRESHOLD = 5;

    const beginPendingDrag = (clientX, clientY) => {
      this.pendingDrag = true;
      this.isDragging = false;
      this.dragStartX = clientX;
      this.dragStartY = clientY;
      this.startX = clientX - this.panX;
      this.startY = clientY - this.panY;
    };

    const updatePendingDrag = (clientX, clientY) => {
      if (!this.pendingDrag || this.isDragging) return;
      const dx = clientX - this.dragStartX;
      const dy = clientY - this.dragStartY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      this.isDragging = true;
      this.didDrag = true;
      this.svg.classList.remove('smooth-transition');
      this.container.style.cursor = 'grabbing';
    };

    const endDrag = () => {
      this.pendingDrag = false;
      if (this.isDragging) {
        this.isDragging = false;
        this.container.style.cursor = 'grab';
        this.snapPanToBounds();
      }
    };

    // Mouse Dragging for Panning — threshold so clicks on districts still fire
    this.container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.didDrag = false;
      beginPendingDrag(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      updatePendingDrag(e.clientX, e.clientY);
      if (!this.isDragging) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.updateTransform(true);
    });

    window.addEventListener('mouseup', endDrag);

    // Touch: pan (1 finger) and pinch-zoom (2 fingers)
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        this.pendingDrag = false;
        this.isDragging = false;
        this.isPinching = true;
        this.didDrag = false;
        this.lastPinchDistance = this.getPinchDistance(e);
        this.svg.classList.remove('smooth-transition');
        e.preventDefault();
        return;
      }
      if (e.touches.length === 1) {
        this.isPinching = false;
        this.didDrag = false;
        beginPendingDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    this.container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && this.isPinching) {
        const dist = this.getPinchDistance(e);
        if (this.lastPinchDistance > 0) {
          const scale = dist / this.lastPinchDistance;
          const oldZoom = this.zoom;
          this.zoom = Math.min(Math.max(this.zoom * scale, 0.8), 8);
          const rect = this.container.getBoundingClientRect();
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
          this.panX = cx - (cx - this.panX) * (this.zoom / oldZoom);
          this.panY = cy - (cy - this.panY) * (this.zoom / oldZoom);
          this.updateTransform(true);
        }
        this.lastPinchDistance = dist;
        this.didDrag = true;
        e.preventDefault();
        return;
      }
      if (e.touches.length !== 1) return;
      updatePendingDrag(e.touches[0].clientX, e.touches[0].clientY);
      if (!this.isDragging) return;
      this.panX = e.touches[0].clientX - this.startX;
      this.panY = e.touches[0].clientY - this.startY;
      this.updateTransform(true);
      e.preventDefault();
    }, { passive: false });

    this.container.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        if (this.isPinching) this.snapPanToBounds();
        this.isPinching = false;
        this.lastPinchDistance = 0;
      }
      endDrag();
    });

    // Mouse Wheel Zoom (Silkier and dampened)
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      this.svg.classList.remove('smooth-transition'); // Pure 1:1 scroll feel
      const zoomFactor = 1.04; // Dampened from 1.1 for precise scroll control
      const oldZoom = this.zoom;
      
      if (e.deltaY < 0) {
        this.zoom = Math.min(this.zoom * zoomFactor, 8);
      } else {
        this.zoom = Math.max(this.zoom / zoomFactor, 0.8);
      }
      
      // Zoom toward cursor location
      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      this.panX = mouseX - (mouseX - this.panX) * (this.zoom / oldZoom);
      this.panY = mouseY - (mouseY - this.panY) * (this.zoom / oldZoom);
      
      this.updateTransform(true);
      this.scheduleWheelSnap();
    }, { passive: false });
  }

  zoomIn() {
    this.svg.classList.add('smooth-transition');
    this.zoom = Math.min(this.zoom * 1.3, 8);
    this.updateTransform(false);
    this.snapPanToBounds();
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  zoomOut() {
    this.svg.classList.add('smooth-transition');
    this.zoom = Math.max(this.zoom / 1.3, 0.8);
    this.updateTransform(false);
    this.snapPanToBounds();
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  reset() {
    this.svg.classList.add('smooth-transition');
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform(false);
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  updateTransform(rubberBand = false) {
    let px = this.panX;
    let py = this.panY;
    if (rubberBand) {
      const b = this.getPanBounds();
      px = this.applyRubberBand(px, b.minX, b.maxX);
      py = this.applyRubberBand(py, b.minY, b.maxY);
    }
    this.svg.style.transform = `translate(${px}px, ${py}px) scale(${this.zoom})`;
  }
}

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
    
    this._hamburgSvgCache = null;
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
    this.view = window.saveManager.getInitialView(this._save);
    this.activeCityId = this._save.lastCity || 'hamburg';

    const params = new URLSearchParams(window.location.search);
    const cityParam = (params.get('city') || '').trim().toLowerCase();
    if (cityParam && window.cityRegistry.isPlayable(cityParam)) {
      this.view = 'city';
      this.activeCityId = cityParam;
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
      window.kiezHub?.render(this, hubEl);
      if (window.authManager) window.authManager.updateHeaderUI();
      return;
    }

    this._initCityPlay();
  }

  _swapMapSvg(svgHtml, wrapper) {
    const old = wrapper.querySelector('.city-map-svg, .hamburg-map-svg');
    const temp = document.createElement('div');
    temp.innerHTML = svgHtml.trim();
    const newSvg = temp.querySelector('svg');
    if (newSvg && old) old.replaceWith(newSvg);
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
      const islandEgg = city?.islandEasterEgg;
      if (nw) nw.hidden = islandEgg !== 'neuwerk';
      if (pf) pf.hidden = islandEgg !== 'pfaueninsel';

      if (!wrapper || !city) {
        this.svg = document.querySelector('.city-map-svg, .hamburg-map-svg');
        this.ensureMapLabelsGroup();
        resolve();
        return;
      }

      if (this.activeCityId === 'hamburg') {
        const inline = wrapper.querySelector('[data-city-map="hamburg"]');
        if (inline) {
          if (!this._hamburgSvgCache) this._hamburgSvgCache = inline.outerHTML;
          this.svg = inline;
          this.ensureMapLabelsGroup();
          resolve();
          return;
        }
        if (this._hamburgSvgCache) {
          this._swapMapSvg(this._hamburgSvgCache, wrapper);
          this.svg = wrapper.querySelector('.city-map-svg, .hamburg-map-svg');
          this.ensureMapLabelsGroup();
          resolve();
          return;
        }
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
        this.buildBezirkBoundaries();
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

      if (this.shouldShowOnboarding(this.activeCityId)) {
        this.showOnboarding();
      }
    });
  }

  shouldShowOnboarding(cityId) {
    const city = window.cityRegistry.getCity(cityId);
    if (!city?.onboardingVersion) return false;
    const branch = this._save?.cities?.[cityId];
    const seen = parseInt(branch?.onboardingVersionSeen, 10) || 0;
    return seen < city.onboardingVersion;
  }

  markOnboardingSeen(cityId) {
    window.saveManager.ensureCityBranch(this._save, cityId);
    const city = window.cityRegistry.getCity(cityId);
    this._save.cities[cityId].onboardingVersionSeen = city?.onboardingVersion || 1;
    window.saveManager.persistSave(this._save);
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
    const city = window.cityRegistry.getCity(cityId);
    if (!city || city.status !== 'playable') {
      this.showComingSoonToast(cityId);
      return;
    }
    if (this.view === 'city' && cityId !== this.activeCityId) {
      this._syncToSaveObject();
    }
    this.activeCityId = cityId;
    this.view = 'city';
    window.saveManager.ensureCityBranch(this._save, cityId);
    this._applyCityBranch(this._save.cities[cityId]);
    if (persistNav) {
      this._save.lastCity = cityId;
      window.saveManager.persistSave(this._save);
    }
    this._initCityPlay();
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
    document.getElementById('btn-zoom-reset').addEventListener('click', () => this.mapNav.reset());

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
      this.activeCityId = this._save.lastCity || 'hamburg';
      const savedMode = this._save.lastMode || 'EXPLORER';
      this.currentMode = savedMode === 'BEZIRK_MATCH' ? 'EXPLORER' : savedMode;
      this.activeSegment = window.cityRegistry.levelKeyToSegment(this._save.lastLevelKey || 'stadtteile');
      this._applyCityBranch(this._save.cities[this.activeCityId] || this._save.cities.hamburg);
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
    return true;
  }

  resolveModeForCurrentSegment(mode = this.currentMode) {
    return this.isModeAllowedForSegment(mode) ? mode : 'EXPLORER';
  }

  updateModeVisibility() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      const mode = btn.dataset.mode;
      if (this.activeSegment === 'BEZIRKE' && BEZIRKE_SEGMENT_HIDDEN_MODES.includes(mode)) {
        btn.style.display = 'none';
      } else {
        btn.style.display = '';
      }
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
        if (lockCard) lockCard.style.display = 'block';
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
        spans[0].textContent = t('modes.locate.labelBezirk');
      } else if (getCityConfig(this.activeCityId).detailUnit === 'Ortsteil') {
        spans[0].textContent = t('modes.locate.labelOrtsteil');
      } else {
        spans[0].textContent = t('modes.locate.label');
      }
    }
    if (spans[1]) {
      if (this.activeSegment === 'BEZIRKE') {
        spans[1].textContent = t('modes.locate.descBezirk');
      } else if (getCityConfig(this.activeCityId).detailUnit === 'Ortsteil') {
        spans[1].textContent = t('modes.locate.descOrtsteil');
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
    const badge = document.getElementById('header-badge') || document.querySelector('#city-view .brand .badge');
    if (!badge) return;
    const city = window.cityRegistry.localizeCity(window.cityRegistry.getCity(this.activeCityId));
    badge.textContent = city?.name || this.activeCityId;
  }

  updateLangButton(btn) {
    const el = btn || document.getElementById('btn-lang') || document.getElementById('hub-btn-lang');
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
    
    xpVal.textContent = this.xp;
    streakVal.textContent = `${this.streak}x`;
    if (bestStreakVal) bestStreakVal.textContent = t('header.streakBest', { count: this.bestStreak });
    
    const currentRank = getRanks().find(r => r.level === this.level);
    rankName.textContent = currentRank ? currentRank.name : t('ranks.fallback');
    
    // Global rank progress bar (XP-based)
    const nextRank = getRanks().find(r => r.level === this.level + 1);
    if (nextRank && currentRank) {
      const span = nextRank.minXp - currentRank.minXp;
      const progressPercent = span > 0 ? ((this.xp - currentRank.minXp) / span) * 100 : 0;
      progFill.style.width = `${Math.min(progressPercent, 100)}%`;
    } else {
      progFill.style.width = '100%';
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
        this.unlockAchievement(
          `master_${cssKey}`,
          `${t(`trophies.master_${cssKey}.name`, { bezirk: bz.name })} 🏆`,
          t(`trophies.master_${cssKey}.desc`, { bezirk: bz.name })
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
    if (nwAnchor) nwAnchor.hidden = islandEgg !== 'neuwerk';
    if (pfAnchor) pfAnchor.hidden = islandEgg !== 'pfaueninsel';
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
      global: { xp: 0, streak: 0, bestStreak: 0, rankSeen: 1, muted: false },
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

  loadGameHistory() {
    try {
      const raw = localStorage.getItem('hh_game_history');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  recordGameHistory(entry) {
    const history = this.loadGameHistory();
    history.unshift({ ...entry, date: new Date().toISOString() });
    if (history.length > 50) history.length = 50;
    localStorage.setItem('hh_game_history', JSON.stringify(history));
    this.saveState();
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
        <div class="trophy-tile ${earned ? 'trophy-tile--earned' : 'trophy-tile--locked'}" title="${trophy.desc}">
          <span class="trophy-icon">${trophy.icon}</span>
          <span class="trophy-name">${trophy.name}</span>
        </div>
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
  }

  showSyncToast(message) {
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

    window.cityWishes?.isAdmin?.().then((isAdmin) => {
      if (!isAdmin) return;
      const slot = modal.querySelector('#settings-wish-admin-slot');
      if (!slot) return;
      slot.innerHTML = `
        <strong style="display:block; margin-bottom: 0.4rem;">${t('settings.wishAdminTitle')}</strong>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0 0 0.8rem 0;">${t('settings.wishAdminBody')}</p>
        <button type="button" id="btn-settings-wish-admin" class="secondary-btn">${t('settings.wishAdminBtn')}</button>`;
      slot.querySelector('#btn-settings-wish-admin')?.addEventListener('click', () => {
        closeOverlayModal(modal);
        window.kiezModals?.showWishAdminModal?.();
      });
    });
  }

  showOnboarding() {
    const prefix = getCityConfig(this.activeCityId).onboarding;
    const modal = openOverlayModal(`
      <div class="modal-content" style="max-width: 550px;">
        <h2>${t(`${prefix}.title`)}</h2>
        <p>${t(`${prefix}.intro`)}</p>
        
        <div class="modal-features">
          <div class="mf-item">
            <span class="mf-icon">🏢</span>
            <span class="mf-text">
              <strong>${t(`${prefix}.feature1Title`)}</strong>
              ${t(`${prefix}.feature1Text`)}
            </span>
          </div>
          <div class="mf-item">
            <span class="mf-icon">⏱️</span>
            <span class="mf-text">
              <strong>${t(`${prefix}.feature2Title`)}</strong>
              ${t(`${prefix}.feature2Text`)}
            </span>
          </div>
          <div class="mf-item">
            <span class="mf-icon">⌨️</span>
            <span class="mf-text">
              <strong>${t(`${prefix}.feature3Title`)}</strong>
              ${t(`${prefix}.feature3Text`)}
            </span>
          </div>
        </div>

        <p style="font-size: 0.8rem; color: var(--text-muted);">${t(`${prefix}.mapTip`)}</p>
        <button class="primary-btn" id="btn-onboarding-dismiss">${t(`${prefix}.dismiss`)}</button>
      </div>
    `);
    document.getElementById('btn-onboarding-dismiss').addEventListener('click', () => {
      this.markOnboardingSeen(this.activeCityId);
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
    });
    this.activeSelectPath = null;
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
    const paths = document.querySelectorAll('.stadtteil-path');
    
    paths.forEach(path => {
      // Hover Tooltip binding
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

      // Collective hover highlight for BEZIRKE segment
      path.addEventListener('mouseenter', () => {
        if (this.activeSegment === 'BEZIRKE' && !path.classList.contains('locked-path')) {
          const bz = path.getAttribute('data-bezirk');
          document.querySelectorAll(`.stadtteil-path[data-bezirk="${bz}"]`).forEach(p => {
            p.classList.add('bezirk-hover-highlight');
          });
        }
      });
      
      path.addEventListener('mouseleave', () => {
        if (this.activeSegment === 'BEZIRKE') {
          const bz = path.getAttribute('data-bezirk');
          document.querySelectorAll(`.stadtteil-path[data-bezirk="${bz}"]`).forEach(p => {
            p.classList.remove('bezirk-hover-highlight');
          });
        }
      });

      path.addEventListener('mousedown', () => {
        if (this.mapNav) this.mapNav.didDrag = false;
      });

      // Selection / Click logic
      path.addEventListener('click', (e) => {
        if (this.mapNav && this.mapNav.didDrag) return;
        const name = path.getAttribute('data-name');
        const bezirk = path.getAttribute('data-bezirk');
        
        if (path.classList.contains('locked-path') && !this.nameAllIsActive) {
          this.sounds.init();
          this.sounds.playIncorrect();
          return;
        }
        
        if (this.currentMode === 'EXPLORER') {
          if (this.activeSegment === 'BEZIRKE') {
            this.selectBezirk(bezirk);
          } else {
            this.selectNeighbourhood(path, name, bezirk);
          }
        } else if (this.inRound && this.currentMode === 'LOCATE') {
          if (this.activeSegment === 'BEZIRKE') {
            this.handleBezirkLocateClick(bezirk);
          } else {
            this.handleLocateClick(path, name, bezirk);
          }
        } else if (this.inRound && this.currentMode === 'QUIZ') {
          this.handleRoundAnswer(name, null);
        }
      });
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
      this.tooltip.innerHTML = `<div>${t('map.tooltipBezirk', { bezirk })}</div><div class="tooltip-bezirk">${t('map.tooltipTapLearn')}</div>`;
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
    container.innerHTML = `
      <div id="explorer-details" class="empty-info">
        <div class="ei-icon">${isBz ? '🏢' : '🗺️'}</div>
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
    path.classList.add('selected');
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
    this.playSelectionSound();
    this.resetMapClasses();
    
    // Highlight all paths in this Bezirk
    document.querySelectorAll(`.stadtteil-path[data-bezirk="${bezirkName}"]`).forEach(p => {
      p.classList.add('selected');
    });

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
    return hues[bezirk] ?? 200;
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
          
          ${!isBz ? `
          <div style="text-align: left; display:flex; flex-direction:column; gap:0.35rem;">
            <label style="font-size:0.75rem; color: var(--text-muted); font-weight:600;">${t('game.bezirkPicker')}</label>
            <div class="bezirk-picker" id="bezirk-picker">
              ${this.getUnlockedBezirke().map((b, i) => `
                <label class="bezirk-picker-item">
                  <input type="checkbox" value="${b}" ${i === 0 ? 'checked' : ''}>
                  <span>${b}</span>
                </label>
              `).join('')}
            </div>
          </div>` : ''}

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

    const bezirkPicker = document.getElementById('bezirk-picker');
    if (bezirkPicker) {
      bezirkPicker.addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"]')) this.playSelectionSound();
      });
    }
  }

  getSelectedRoundBezirke() {
    const picker = document.getElementById('bezirk-picker');
    if (!picker) return [];
    return Array.from(picker.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
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
      promptData = {
        title: isBz ? t('game.locateBezirk') : t(`game.locate${unit}`),
        target: this.currentTarget.name,
        sub: isBz ? t('game.locateClickBezirk') : t(`game.locateClick${unit}`, { bezirk: this.currentTarget.bezirk }),
        highlight: true
      };
    } 
    else if (this.currentMode === 'QUIZ') {
      promptData = {
        title: isBz ? t('game.quizBezirk') : t(`game.quiz${unit}`),
        target: isBz ? t('game.quizBlinkBezirk') : t(`game.quizBlink${unit}`),
        sub: t('game.quizChoose'),
        highlight: false,
        isHtml: true
      };
      
      // Blink target path
      if (isBz) {
        document.querySelectorAll(`.stadtteil-path[data-bezirk="${this.currentTarget.name}"]`).forEach(p => p.classList.add('blink'));
      } else {
        const targetPath = this.getPathByNeighbourhoodName(this.currentTarget.name);
        if (targetPath) targetPath.classList.add('blink');
      }

      this.generateMCROptions(optionsContainer);
    }
    else if (this.currentMode === 'TYPE_NAME') {
      promptData = {
        title: isBz ? t('game.typeBezirk') : t(`game.type${unit}`),
        target: isBz ? t('game.quizBezirk') : t(`game.quiz${unit}`),
        sub: t('game.typeHint'),
        highlight: false
      };

      if (isBz) {
        document.querySelectorAll(`.stadtteil-path[data-bezirk="${this.currentTarget.name}"]`).forEach(p => p.classList.add('blink'));
      } else {
        const targetPath = this.getPathByNeighbourhoodName(this.currentTarget.name);
        if (targetPath) targetPath.classList.add('blink');
      }

      this.generateTypingField(optionsContainer);
    }

    promptTitle.textContent = promptData.title;
    if (promptData.isHtml) promptTarget.innerHTML = promptData.target;
    else promptTarget.textContent = promptData.target;
    promptTarget.classList.toggle('highlight', promptData.highlight);
    promptSub.textContent = promptData.sub;
    this.syncMapPromptBar(promptData);

    // Bind Cancel round button
    document.getElementById('btn-cancel-round').onclick = () => this.endRound(true);
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
      ? t('game.placeholderBezirk')
      : t(`game.placeholder${this.getDetailUnitSuffix()}`);
    input.id = 'type-name-input';
    input.setAttribute('autocomplete', 'off');
    
    wrapper.appendChild(input);
    container.appendChild(wrapper);

    input.focus();

    const cleanStr = str => str.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');

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
    const cleanStr = str => str.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
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
    
    // Stop blinking
    if (isBz) {
      document.querySelectorAll(`.stadtteil-path[data-bezirk="${this.currentTarget.name}"]`).forEach(p => p.classList.remove('blink'));
    } else {
      const targetPath = this.getPathByNeighbourhoodName(this.currentTarget.name);
      if (targetPath) targetPath.classList.remove('blink', 'selected');
    }

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

    if (this.progressionMode) {
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
        ${!isBz ? `
        <div style="text-align: left; display:flex; flex-direction:column; gap:0.35rem;">
          <label style="font-size:0.75rem; color: var(--text-muted); font-weight:600;">${t('game.bezirkPicker')}</label>
          <div class="bezirk-picker" id="nameall-bezirk-picker">
            ${pickerBezirke.map(b => `
              <label class="bezirk-picker-item">
                <input type="checkbox" value="${b}" checked>
                <span>${b}</span>
              </label>
            `).join('')}
          </div>
        </div>` : ''}
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

    const cleanStr = str => str.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
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
    }

    if (this.progressionMode && this.activeSegment === 'STADTTEILE') {
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

// Global initialization when page loads
window.addEventListener('DOMContentLoaded', async () => {
  await initI18n();
  const game = new KiezQuizGame();
  window.kiezQuizGame = game;
  window.hamburgGame = game;

  window.authManager = new AuthManager(window.SUPABASE_CONFIG || {});
  window.cloudSync = new CloudSync(window.authManager, game);
  let _previousAuthUser;

  window.authManager.onAuthChange(async (user) => {
    window.authManager.updateHeaderUI();
    if (user) {
      await window.cloudSync.handleLoginMerge();
      game.reRenderCurrentView();
      if (game.view === 'city') {
        game.updateMapStates();
        game.updateIslandBadges();
      }
    } else if (_previousAuthUser !== undefined) {
      game.resetToGuestState();
    }
    _previousAuthUser = user;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && window.cloudSync?.isEnabled()) {
      window.cloudSync.flushSaveNow();
    }
  });

  onLocaleChange(() => game.reRenderCurrentView());

  // Start game immediately — do not block on Supabase (can hang on slow networks).
  game.init();

  void (async () => {
    try {
      await window.authManager.init();
      await window.authManager.waitForPendingAuthTasks();
      window.authManager.initUI();
      if (window.authManager.isLoggedIn()) {
        game.reRenderCurrentView();
        if (game.view === 'city') {
          game.updateMapStates();
          game.updateIslandBadges();
        }
      }
    } catch (err) {
      console.warn('Auth startup failed:', err);
      window.authManager.initUI();
    }
  })();
});
