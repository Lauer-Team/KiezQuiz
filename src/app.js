/* -------------------------------------------------------------
 * Cyber-Alster Hamburg Stadtteile - Main Game Logic Engine V2
 * Pure modular JavaScript with Web Audio Synth and Custom SVG Zoom/Pan.
 * ------------------------------------------------------------- */

// Rank thresholds and titles
const RANKS = [
  { level: 1, name: "Quiddje", minXp: 0, maxXp: 99 },
  { level: 2, name: "Fischkopp", minXp: 100, maxXp: 299 },
  { level: 3, name: "Hamburger Jung / Deern", minXp: 300, maxXp: 599 },
  { level: 4, name: "Elbkapitän", minXp: 600, maxXp: 999 },
  { level: 5, name: "Hamburg-Experte", minXp: 1000, maxXp: Infinity }
];

// Bezirke unlock progression order & requirements
const BEZIRKE_PROGRESSION = [
  { name: "Eimsbüttel", xpNeeded: 0 },
  { name: "Hamburg-Nord", xpNeeded: 50 },
  { name: "Altona", xpNeeded: 150 },
  { name: "Harburg", xpNeeded: 300 },
  { name: "Bergedorf", xpNeeded: 500 },
  { name: "Wandsbek", xpNeeded: 750 },
  { name: "Hamburg-Mitte", xpNeeded: 1000 }
];

// Modes only available when learning Stadtteile (not Bezirke segment)
const BEZIRKE_SEGMENT_HIDDEN_MODES = ['NAME_ALL'];

const MODE_LABELS = {
  EXPLORER: 'Entdecker-Modus',
  LOCATE: 'Stadtteil-Detektiv',
  QUIZ: 'Karten-Quiz',
  TYPE_NAME: 'Namen eingeben',
  NAME_ALL: 'Nenne alle Orte'
};

// Hardcoded interesting trivia generator for districts and major neighbourhoods
const TRIVIA_TEMPLATES = {
  "Altona": [
    "War historisch eine eigenständige dänische Konkurrenzstadt zu Hamburg.",
    "Bekannt für den Elbstrand in Övelgönne und das lebendige Ottensen.",
    "Bietet eine wunderschöne Aussicht vom Altonaer Balkon auf den Hamburger Hafen."
  ],
  "Bergedorf": [
    "Der flächenmäßig größte Bezirk Hamburgs, geprägt von Landwirtschaft und Vierlanden.",
    "Besitzt mit dem Schloss Bergedorf das einzige erhaltene Schloss im Hamburger Stadtgebiet.",
    "Hier wachsen die berühmten Vierländer Rosen und frisches Gemüse für Hamburg."
  ],
  "Eimsbüttel": [
    "Eines der am dichtesten besiedelten Wohngebiete mit wunderschönen Altbauten.",
    "Bekannt für das Grindelviertel, das historische Zentrum jüdischen Lebens in Hamburg.",
    "Beheimatet das bekannte Tierpark Hagenbeck im Stadtteil Stellingen."
  ],
  "Hamburg-Mitte": [
    "Das schlagende Herz Hamburgs mit Hafen, Speicherstadt, Rathaus und St. Pauli.",
    "Hier liegt die Elbphilharmonie in der modernen HafenCity.",
    "Erstreckt sich über die Elbe hinweg bis nach Wilhelmsburg und Finkenwerder."
  ],
  "Hamburg-Nord": [
    "Geprägt durch den riesigen Hamburger Stadtpark und den Hamburger Flughafen.",
    "Wunderschöne Alsterkanäle fließen durch Winterhude und Eppendorf.",
    "Beheimatet die berühmte Jarrestadt, eine legendäre Backsteinsiedlung."
  ],
  "Harburg": [
    "Liegt südlich der Norderelbe und hat eine ganz eigene, markante Identität.",
    "Bekannt für die waldreichen Harburger Berge und den Schwarzen Berge Wildpark.",
    "Sitz der Technischen Universität Hamburg (TUHH) und des Binnenhafens."
  ],
  "Wandsbek": [
    "Der einwohnerstärkste Bezirk Hamburgs mit vielen grünen Wohngebieten.",
    "Verbindet dörfliche Idylle im Alstertal mit urbanen Zentren.",
    "Benannt nach dem historischen Dichter Matthias Claudius (Wandsbecker Bote)."
  ]
};

const SPECIFIC_TRIVIA = {
  "St. Pauli": "Heimat des berühmten Kiez, der Reeperbahn und des FC St. Pauli. Einst ein Vorort außerhalb der Hamburger Stadtgrenzen.",
  "HafenCity": "Europas größtes innerstädtisches Stadtentwicklungsprojekt direkt an der Elbe, Heimat der Elbphilharmonie.",
  "Blankenese": "Ehemaliges Fischerdorf, weltberühmt für sein idyllisches Treppenviertel am Steilufer der Elbe.",
  "Neuwerk": "Eine Nordseeinsel im Nationalpark Wattenmeer. Gehört seit dem Cuxhaven-Vertrag 1969 offiziell zu Hamburg-Mitte.",
  "Sternschanze": "Hamburgs kleinster Stadtteil, berühmt für alternative Kultur, Streetart und das belebte Schanzenviertel.",
  "Eppendorf": "Bekannt für edle Jugendstilvillen, feine Boutiquen und das Universitätsklinikum Eppendorf (UKE).",
  "Rothenburgsort": "Historisch ein Arbeiterquartier, das im Zweiten Weltkrieg fast vollständig zerstört wurde und heute ein kreativer Hotspot ist.",
  "Wilhelmsburg": "Die größte Flussinsel Europas, gelegen zwischen Norder- und Süderelbe, ein multikultureller und grüner Stadtteil.",
  "Finkenwerder": "Heimat der Airbus-Werke und des traditionellen Obstanbaus (Altes Land).",
  "Speicherstadt": "Das größte zusammenhängende Lagerhausensemble der Welt und UNESCO-Weltkulturerbe."
};

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

function launchConfetti() {
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
    this.didDrag = false;
    this.startX = 0;
    this.startY = 0;
    
    this.setupListeners();
    this.updateTransform();
  }

  setupListeners() {
    // Mouse Dragging for Panning (not on district paths — those are for clicks)
    this.container.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.stadtteil-path')) return;
      this.isDragging = true;
      this.didDrag = false;
      this.svg.classList.remove('smooth-transition'); // Disable transition for 1:1 real-time drag
      this.container.style.cursor = 'grabbing';
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.didDrag = true;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.container.style.cursor = 'grab';
      }
    });

    // Touch Support for Mobile
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.svg.classList.remove('smooth-transition');
        this.startX = e.touches[0].clientX - this.panX;
        this.startY = e.touches[0].clientY - this.panY;
      }
    });

    this.container.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      this.panX = e.touches[0].clientX - this.startX;
      this.panY = e.touches[0].clientY - this.startY;
      this.updateTransform();
      e.preventDefault();
    }, { passive: false });

    this.container.addEventListener('touchend', () => {
      this.isDragging = false;
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
      
      this.updateTransform();
    }, { passive: false });
  }

  zoomIn() {
    this.svg.classList.add('smooth-transition');
    this.zoom = Math.min(this.zoom * 1.3, 8);
    this.updateTransform();
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  zoomOut() {
    this.svg.classList.add('smooth-transition');
    this.zoom = Math.max(this.zoom / 1.3, 0.8);
    this.updateTransform();
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  reset() {
    this.svg.classList.add('smooth-transition');
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform();
    setTimeout(() => this.svg.classList.remove('smooth-transition'), 400);
  }

  updateTransform() {
    this.svg.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }
}

// Core Game Controller
class HamburgGame {
  constructor() {
    this.sounds = new SoundManager();
    this.mapNav = null;
    
    // Game States
    this.xp = 0;
    this.level = 1;
    this.streak = 0;
    this.highScore = 0;
    this.progressionMode = true; // false for unlocking all at once
    this.currentMode = 'EXPLORER'; // EXPLORER, LOCATE, QUIZ, TYPE_NAME, NAME_ALL
    this.activeSegment = 'STADTTEILE'; // STADTTEILE or BEZIRKE
    
    // Progress per Bezirk: { Altona: { solved: Set() }, ... }
    this.bezirkProgress = {};
    
    // Session states
    this.currentTarget = null; 
    this.currentChoices = [];
    this.achievements = new Set();
    this.activeSelectPath = null;
    
    // --- SPORCLE ROUND STATES ---
    this.inRound = false;
    this.roundQuestions = [];
    this.roundIndex = 0;
    this.roundCorrect = 0;
    this.roundIncorrect = 0;
    this.roundDistrict = 'Eimsbüttel'; // Currently active round district
    this.roundHistory = {}; // stadtteilName -> { correct: bool, clickedName: string }
    
    // --- TYPE_NAME Autocomplete index ---
    this.autocompleteIndex = -1;
    this.nameAllInputTimer = null;
    this._alertStyleInjected = false;
    
    // --- NAME_ALL (Sporcle Countdown Challenge) States ---
    this.timerInterval = null;
    this.nameAllTimeLeft = 600; // 10 minutes in seconds
    this.nameAllFound = new Set();
    this.nameAllIsActive = false;
    
    this.loadState();
  }

  init() {
    // DOM bindings
    this.svg = document.querySelector('.hamburg-map-svg');
    this.mapWrapper = document.querySelector('.map-container-wrapper');
    this.tooltip = document.getElementById('map-tooltip');
    
    this.mapNav = new MapNavigator(this.svg, this.mapWrapper);
    this.reorderMapLayers();

    if (this.tooltip && this.tooltip.parentElement !== document.body) {
      document.body.appendChild(this.tooltip);
    }
    
    this.setupUIListeners();
    this.initMapPaths();
    this.renderStats();
    
    // Segment selectors binding
    this.setupSegmentSelectors();
    if (!this.isModeAllowedForSegment(this.currentMode)) {
      this.currentMode = 'EXPLORER';
    }
    this.applySegmentUI();
    this.syncSegmentBodyClass();
    this.setMode(this.resolveModeForCurrentSegment(this.currentMode));
    
    // Initial map unlock updates
    this.updateMapStates();
    
    const primeAudio = () => this.sounds.init();
    document.addEventListener('click', primeAudio);
    document.addEventListener('keydown', primeAudio);
    document.addEventListener('touchstart', primeAudio, { passive: true });

    // A–D shortcuts for Karten-Quiz / Bezirk-zuordnen
    document.addEventListener('keydown', (e) => this.handleQuizKeydown(e));
    
    // Check if onboarding is needed
    if (this.xp === 0) {
      this.showOnboarding(true);
    }
  }

  switchSegment(segment) {
    if (this.activeSegment === segment) return;
    this.activeSegment = segment;
    this.saveState();
    this.applySegmentUI();
    this.resetMapClasses();
    this.clearMapTextLabels();
    this.updateMapStates();
    this.syncSegmentBodyClass();
    this.setMode(this.resolveModeForCurrentSegment(this.currentMode));
  }

  setupSegmentSelectors() {
    const btnSt = document.getElementById('btn-segment-stadtteile');
    const btnBz = document.getElementById('btn-segment-bezirke');
    if (btnSt && btnBz) {
      btnSt.addEventListener('click', () => {
        if (this.inRound || this.nameAllIsActive) {
          if (!confirm("Runde läuft gerade. Segment wirklich wechseln und Runde abbrechen?")) return;
          this.endRound(false);
          this.stopNameAllChallenge(false);
        }
        this.switchSegment('STADTTEILE');
      });

      btnBz.addEventListener('click', () => {
        if (this.inRound || this.nameAllIsActive) {
          if (!confirm("Runde läuft gerade. Segment wirklich wechseln und Runde abbrechen?")) return;
          this.endRound(false);
          this.stopNameAllChallenge(false);
        }
        this.switchSegment('BEZIRKE');
      });
    }
  }

  setupUIListeners() {
    // Mode Buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        
        if (this.inRound || this.nameAllIsActive) {
          if (!confirm("Aktiver Durchlauf läuft gerade. Modus wirklich wechseln und Durchlauf abbrechen?")) return;
          this.endRound(false);
          this.stopNameAllChallenge(false);
        }
        
        this.setMode(mode);
      });
    });

    // Zoom Buttons
    document.getElementById('btn-zoom-in').addEventListener('click', () => this.mapNav.zoomIn());
    document.getElementById('btn-zoom-out').addEventListener('click', () => this.mapNav.zoomOut());
    document.getElementById('btn-zoom-reset').addEventListener('click', () => this.mapNav.reset());

    // Game history & Settings
    const historyBtn = document.getElementById('btn-history');
    if (historyBtn) historyBtn.addEventListener('click', () => this.showGameHistory());
    document.getElementById('btn-settings').addEventListener('click', () => this.showSettings());
    document.getElementById('btn-reset-link').addEventListener('click', () => this.resetGame());

    // Sound Toggle
    const muteBtn = document.getElementById('btn-mute');
    muteBtn.innerHTML = this.sounds.muted ? '🔇' : '🔊';
    muteBtn.addEventListener('click', () => {
      const isMuted = this.sounds.toggleMute();
      muteBtn.innerHTML = isMuted ? '🔇' : '🔊';
    });
    
    // Neuwerk Island Special Anchor
    const nwAnchor = document.getElementById('neuwerk-anchor');
    if (nwAnchor) {
      nwAnchor.addEventListener('click', () => {
        if (this.activeSegment === 'BEZIRKE') {
          this.activeSegment = 'STADTTEILE';
          const btnSt = document.getElementById('btn-segment-stadtteile');
          const btnBz = document.getElementById('btn-segment-bezirke');
          if (btnSt) btnSt.classList.add('active');
          if (btnBz) btnBz.classList.remove('active');
        }
        this.selectNeighbourhoodByName("Neuwerk");
        this.unlockAchievement("island_finder", "Insulaner 🏝️", "Finde die Insel Neuwerk in der Nordsee.");
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

  // Load state from local storage
  loadState() {
    this.xp = parseInt(localStorage.getItem('hh_xp')) || 0;
    this.streak = parseInt(localStorage.getItem('hh_streak')) || 0;
    this.highScore = parseInt(localStorage.getItem('hh_highscore')) || 0;
    this.level = this.calculateLevel(this.xp);
    this.progressionMode = localStorage.getItem('hh_progression') !== 'false';
    const savedMode = localStorage.getItem('hh_mode') || 'EXPLORER';
    this.currentMode = savedMode === 'BEZIRK_MATCH' ? 'EXPLORER' : savedMode;
    this.activeSegment = localStorage.getItem('hh_segment') || 'STADTTEILE';
    
    // Discovered achievements
    const achs = localStorage.getItem('hh_achievements');
    if (achs) {
      try {
        JSON.parse(achs).forEach(a => this.achievements.add(a));
      } catch(e) {}
    }

    // Load detailed Bezirk achievements
    BEZIRKE_PROGRESSION.forEach(bz => {
      this.bezirkProgress[bz.name] = { solved: new Set() };
      const saved = localStorage.getItem(`hh_progress_${bz.name}`);
      if (saved) {
        try {
          JSON.parse(saved).forEach(st => this.bezirkProgress[bz.name].solved.add(st));
        } catch(e) {}
      }
    });
  }

  // Save current game state
  saveState() {
    localStorage.setItem('hh_xp', this.xp);
    localStorage.setItem('hh_streak', this.streak);
    localStorage.setItem('hh_highscore', this.highScore);
    localStorage.setItem('hh_progression', this.progressionMode);
    localStorage.setItem('hh_mode', this.currentMode);
    localStorage.setItem('hh_segment', this.activeSegment);
    localStorage.setItem('hh_achievements', JSON.stringify([...this.achievements]));
    
    BEZIRKE_PROGRESSION.forEach(bz => {
      localStorage.setItem(`hh_progress_${bz.name}`, JSON.stringify([...this.bezirkProgress[bz.name].solved]));
    });
  }

  calculateLevel(xp) {
    let currentLvl = 1;
    for (const rank of RANKS) {
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
    this.renderStats();
    this.saveState();
  }

  // Get list of currently unlocked Bezirke based on progression
  getUnlockedBezirke() {
    if (!this.progressionMode || this.activeSegment === 'BEZIRKE') {
      return BEZIRKE_PROGRESSION.map(b => b.name);
    }
    return BEZIRKE_PROGRESSION
      .filter(bz => this.xp >= bz.xpNeeded)
      .map(bz => bz.name);
  }

  // Check if a specific stadtteil name is in unlocked Bezirke
  isStadtteilUnlocked(name) {
    const info = HAMBURG_DATA.find(d => d.name === name);
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
    const info = HAMBURG_DATA.find(d => d.name === name);
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

  // Render score, progress-fill, XP etc.
  renderStats() {
    const xpVal = document.getElementById('stat-xp');
    const streakVal = document.getElementById('stat-streak');
    const rankName = document.getElementById('stat-rank');
    const nextRankName = document.getElementById('stat-next-rank');
    const progFill = document.getElementById('progress-fill');
    
    xpVal.textContent = this.xp;
    streakVal.textContent = `${this.streak}x`;
    
    const currentRank = RANKS.find(r => r.level === this.level);
    rankName.textContent = currentRank ? currentRank.name : "Hamburger";
    
    // Level progress bar
    if (this.level < 5) {
      const nextRank = RANKS.find(r => r.level === this.level + 1);
      nextRankName.textContent = `${nextRank.name} (${nextRank.minXp} XP)`;
      
      const currentMin = currentRank.minXp;
      const nextMin = nextRank.minXp;
      const progressPercent = ((this.xp - currentMin) / (nextMin - currentMin)) * 100;
      progFill.style.width = `${Math.min(progressPercent, 100)}%`;
    } else {
      nextRankName.textContent = "Höchster Rang erreicht! 🎉";
      progFill.style.width = '100%';
    }

    // Progression Unlock Panel Update
    this.renderUnlockProgress();
  }

  renderUnlockProgress() {
    const listContainer = document.getElementById('district-progress-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    const unlocked = this.getUnlockedBezirke();
    
    BEZIRKE_PROGRESSION.forEach(bz => {
      const isUnlocked = unlocked.includes(bz.name);
      
      // Calculate how many stadtteile are solved out of total in this district
      const totalInDistrict = HAMBURG_DATA.filter(d => d.bezirk === bz.name && !d.is_island).length;
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
          `<div class="dp-lock">🔒 Ab ${bz.xpNeeded} XP</div>`
        }
      `;
      
      listContainer.appendChild(row);
      
      // Award special District Completion achievements
      if (solvedInDistrict === totalInDistrict && totalInDistrict > 0) {
        this.unlockAchievement(`master_${cssKey}`, `${bz.name}-Entdecker 🏆`, `Meistere alle Stadtteile im Bezirk ${bz.name}.`);
      }
    });
  }

  unlockAchievement(id, title, desc) {
    if (this.achievements.has(id)) return;
    this.achievements.add(id);
    this.saveState();
    this.showAchievementAlert(title, desc);
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
        <div style="font-weight:700; color:#fff; font-size:0.95rem; margin-bottom: 0.15rem;">Erfolg freigeschaltet!</div>
        <div style="font-weight:700; color:var(--color-xp); font-size:0.85rem; margin-bottom: 0.15rem;">${title}</div>
        <div style="font-size:0.75rem; color:var(--text-secondary);">${desc}</div>
      </div>
    `;
    
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
    const rank = RANKS.find(r => r.level === lvl);
    const modal = document.createElement('div');
    modal.className = 'overlay-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2 style="font-size: 2.2rem; color: var(--color-xp); text-shadow: 0 0 15px rgba(255, 191, 0, 0.3);">🎉 Aufstieg! 🎉</h2>
        <p style="margin-top:0.5rem; font-weight:700; font-size: 1.1rem; color:#fff;">Du bist jetzt im Rang: ${rank.name}</p>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem;">Dein hanseatisches Wissen wächst! Meistere noch mehr Stadtteile, um der ultimative Hamburg-Experte zu werden.</p>
        <button class="primary-btn" id="btn-lvl-dismiss">Weiter geht's!</button>
      </div>
    `;
    document.body.appendChild(modal);
    launchConfetti();
    document.getElementById('btn-lvl-dismiss').addEventListener('click', () => modal.remove());
  }

  resetGame() {
    if (!confirm("Wirklich alles zurücksetzen? XP, Streak, Fortschritt und Achievements werden gelöscht. Das kann nicht rückgängig gemacht werden.")) return;
    // Remove all hh_ keys and mute setting
    const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('hh_') || k === 'hamburg_muted' || k === 'hh_game_history');
    keysToRemove.forEach(k => localStorage.removeItem(k));
    location.reload();
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
  }

  getModeDisplayName(mode) {
    return MODE_LABELS[mode] || mode;
  }

  showGameHistory() {
    const history = this.loadGameHistory();
    const modal = document.createElement('div');
    modal.className = 'overlay-modal';

    let listHtml;
    if (history.length === 0) {
      listHtml = '<p style="font-size:0.85rem; color:var(--text-secondary);">Noch keine Spiele gespielt. Starte eine Runde!</p>';
    } else {
      listHtml = `<div class="game-history-list">${history.map(item => {
        const date = new Date(item.date);
        const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const scoreColor = item.percent >= 75 ? 'var(--color-correct)' : 'var(--color-incorrect)';
        const districts = item.districts?.length ? item.districts.join(', ') : '—';
        return `
          <div class="game-history-item">
            <div class="gh-date">${dateStr} · ${timeStr}</div>
            <div class="gh-mode">${this.getModeDisplayName(item.mode)}${item.segment === 'BEZIRKE' ? ' (Bezirke)' : ''}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.1rem;">${districts}</div>
            <div class="gh-score" style="color:${scoreColor};">${item.correct} / ${item.total} (${item.percent}%)</div>
          </div>
        `;
      }).join('')}</div>`;
    }

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 420px;">
        <h2>📋 Spielverlauf</h2>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:1rem;">Deine letzten ${history.length > 0 ? history.length : ''} Spiele und Ergebnisse.</p>
        ${listHtml}
        <button class="primary-btn" id="btn-history-close" style="margin-top:1rem;">Schließen</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('btn-history-close').addEventListener('click', () => modal.remove());
  }

  showSettings() {
    const modal = document.createElement('div');
    modal.className = 'overlay-modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <h2>⚙️ Einstellungen</h2>
        <hr style="border-color: rgba(255,255,255,0.1); margin: 1rem 0;">
        <div style="margin-bottom: 1.2rem;">
          <strong style="display:block; margin-bottom: 0.4rem;">🗑️ Spielstand zurücksetzen</strong>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0 0 0.8rem 0;">Löscht alle XP, Achievements und Fortschritte. Frischer Start als Quiddje.</p>
          <button id="btn-settings-reset" style="background: rgba(220,50,50,0.2); border: 1px solid rgba(220,50,50,0.5); color: #ff6b6b; padding: 0.5rem 1.2rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">↺ Neustart</button>
        </div>
        <button class="primary-btn" id="btn-settings-close" style="margin-top: 0.5rem;">Schließen</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('btn-settings-close').addEventListener('click', () => modal.remove());
    document.getElementById('btn-settings-reset').addEventListener('click', () => this.resetGame());
  }

  showOnboarding(firstTime = false) {
    const modal = document.createElement('div');
    modal.className = 'overlay-modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 550px;">
        <h2>Moin Moin in Hamburg! ⚓</h2>
        <p>Lerne spielerisch alle 7 Bezirke und 104 Stadtteile Hamburgs kennen. Du fängst ganz klein als <strong>Quiddje</strong> (Nicht-Hamburger) an und arbeitest dich hoch!</p>
        
        <div class="modal-features">
          <div class="mf-item">
            <span class="mf-icon">🏢</span>
            <span class="mf-text">
              <strong>1. Bezirke lernen (Neu!)</strong>
              Lerne entweder alle 104 Stadtteile im Detail oder schalte oben links auf "Bezirke" um, um erst einmal die 7 großen Hauptbezirke spielerisch zu meistern.
            </span>
          </div>
          <div class="mf-item">
            <span class="mf-icon">⏱️</span>
            <span class="mf-text">
              <strong>2. Sporcle-Durchläufe & Challenges (Neu!)</strong>
              Starte strukturierte Runden! Falsche Klicks bleiben dauerhaft rot markiert, richtige grün. Meistere einen Bezirk mit mindestens <strong>75%</strong>, um weiterzukommen! Oder nenne alle Orte im Countdown-Timer.
            </span>
          </div>
          <div class="mf-item">
            <span class="mf-icon">⌨️</span>
            <span class="mf-text">
              <strong>3. Namen eingeben (Neu!)</strong>
              Erhöhe die Schwierigkeit! Tippe im neuen Eingabemodus die blinkenden Stadtteil-Namen direkt per Tastatur ein (mit smarter Autocomplete-Vorschlagsliste).
            </span>
          </div>
        </div>

        <p style="font-size: 0.8rem; color: var(--text-muted);">Tipp: Die Elbe fließt als breiter hellblauer Strom durch Hamburg und hilft dir perfekt bei der Orientierung auf der Karte!</p>
        <button class="primary-btn" id="btn-onboarding-dismiss">Leinen los!</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('btn-onboarding-dismiss').addEventListener('click', () => modal.remove());
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
  }

  // Update map visual styles based on current unlocked states and discoveries
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
      path.classList.remove('selected', 'blink', 'correct-flash', 'incorrect-flash', 'bezirk-hover-highlight', 'round-correct', 'round-incorrect');
      path.style.pointerEvents = '';
    });
    this.activeSelectPath = null;
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
        const showTooltip = this.shouldShowMapTooltip();
        if (!showTooltip) {
          this.tooltip.style.display = 'none';
          return;
        }

        const name = path.getAttribute('data-name');
        const bezirk = path.getAttribute('data-bezirk');
        
        if (path.classList.contains('locked-path') && !this.nameAllIsActive) {
          this.tooltip.innerHTML = `<div>🔒 Bezirk gesperrt</div><div class="tooltip-bezirk">Lerne weiter zum Freischalten</div>`;
        } else {
          if (this.activeSegment === 'BEZIRKE') {
            this.tooltip.innerHTML = `<div>Bezirk: ${bezirk}</div><div class="tooltip-bezirk">Klicken zum Lernen</div>`;
          } else {
            this.tooltip.innerHTML = `<div>${name}</div><div class="tooltip-bezirk">${bezirk}</div>`;
          }
        }
        
        this.positionMapTooltip(e.clientX, e.clientY);
        this.tooltip.style.display = 'block';
      });

      path.addEventListener('mouseleave', () => {
        this.tooltip.style.display = 'none';
      });

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
    const water = this.svg.querySelector('.water-group');
    const stadtteile = this.svg.querySelector('.stadtteile-group');
    const labels = this.svg.querySelector('#map-labels-group');
    if (water && stadtteile) {
      this.svg.insertBefore(water, stadtteile);
    }
    if (labels) {
      this.svg.appendChild(labels);
    }
  }

  raiseWaterLayerForNameAll() {
    if (!this.svg) return;
    const water = this.svg.querySelector('.water-group');
    const labels = this.svg.querySelector('#map-labels-group');
    if (water) {
      this.svg.insertBefore(water, labels || null);
    }
  }

  shouldShowMapTooltip() {
    if (this.nameAllIsActive) return false;
    if (this.mapNav?.isDragging) return false;
    if (this.inRound) return false;
    return true;
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
    container.innerHTML = `
      <div id="explorer-details" class="empty-info">
        <div class="ei-icon">${isBz ? '🏢' : '🗺️'}</div>
        <p>Klicke auf einen ${isBz ? 'Bezirk' : 'Stadtteil'} der Karte, um spannende Metadaten und hanseatische Fakten anzuzeigen!</p>
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
    this.resetMapClasses();
    path.classList.add('selected');
    this.activeSelectPath = path;
    
    // Find detailed stadtteil data
    const info = HAMBURG_DATA.find(d => d.name === name) || {
      population: "k.A.",
      area_km2: "k.A.",
      bezirk: bezirk
    };
    
    // Compute population density
    let density = "k.A.";
    if (info.population && info.area_km2) {
      const popInt = parseInt(info.population.replace(/\./g, '').replace(/,/g, ''));
      const areaFloat = parseFloat(info.area_km2.replace(/,/g, '.'));
      if (!isNaN(popInt) && !isNaN(areaFloat) && areaFloat > 0) {
        density = `${Math.round(popInt / areaFloat).toLocaleString('de-DE')} Einw./km²`;
      }
    }

    let trivia = SPECIFIC_TRIVIA[name];
    if (!trivia) {
      const templates = TRIVIA_TEMPLATES[bezirk] || ["Ein charmanter Hamburger Stadtteil mit ganz eigenem Flair."];
      const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      trivia = `${name} liegt im herrlichen Bezirk ${bezirk}. ${templates[hash % templates.length]}`;
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
            <div class="ds-label">Einwohner</div>
            <div class="ds-value">${info.population}</div>
          </div>
          <div class="detail-stat">
            <div class="ds-label">Fläche</div>
            <div class="ds-value">${info.area_km2} km²</div>
          </div>
          <div class="detail-stat" style="grid-column: span 2;">
            <div class="ds-label">Bevölkerungsdichte</div>
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
    this.resetMapClasses();
    
    // Highlight all paths in this Bezirk
    document.querySelectorAll(`.stadtteil-path[data-bezirk="${bezirkName}"]`).forEach(p => {
      p.classList.add('selected');
    });

    // Compute collective statistics for Bezirk
    const bzStadtteile = HAMBURG_DATA.filter(d => d.bezirk === bezirkName);
    
    let totalPop = 0;
    let totalArea = 0;
    bzStadtteile.forEach(d => {
      const popVal = parseInt(d.population.replace(/\./g, '').replace(/,/g, ''));
      const areaVal = parseFloat(d.area_km2.replace(/,/g, '.'));
      if (!isNaN(popVal)) totalPop += popVal;
      if (!isNaN(areaVal)) totalArea += areaVal;
    });

    const formattedPop = totalPop.toLocaleString('de-DE');
    const formattedArea = totalArea.toFixed(2).replace('.', ',');
    const density = totalArea > 0 ? `${Math.round(totalPop / totalArea).toLocaleString('de-DE')} Einw./km²` : "k.A.";

    const templates = TRIVIA_TEMPLATES[bezirkName] || ["Ein bedeutender Bezirk Hamburgs."];
    const trivia = templates[0];

    const container = document.getElementById('game-play-area');
    container.innerHTML = `
      <div class="info-details">
        <div class="detail-header">
          <h2>Bezirk ${bezirkName}</h2>
          <span class="bezirk-tag" style="background: hsla(${this.getBezirkHue(bezirkName)}, 100%, 65%, 0.15); color: hsla(${this.getBezirkHue(bezirkName)}, 100%, 65%, 1); border: 1px solid hsla(${this.getBezirkHue(bezirkName)}, 100%, 65%, 0.3)">
            Hauptbezirk
          </span>
        </div>
        <div class="detail-stats-grid">
          <div class="detail-stat">
            <div class="ds-label">Gesamt-Einwohner</div>
            <div class="ds-value">${formattedPop}</div>
          </div>
          <div class="detail-stat">
            <div class="ds-label">Gesamt-Fläche</div>
            <div class="ds-value">${formattedArea} km²</div>
          </div>
          <div class="detail-stat" style="grid-column: span 2;">
            <div class="ds-label">Durchschnittliche Dichte</div>
            <div class="ds-value">${density}</div>
          </div>
        </div>
        <div class="detail-stat" style="margin-top:0.25rem;">
          <div class="ds-label">Stadtteile (${bzStadtteile.length})</div>
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
    switch (bezirk) {
      case "Altona": return 295;
      case "Bergedorf": return 32;
      case "Eimsbüttel": return 175;
      case "Hamburg-Mitte": return 345;
      case "Hamburg-Nord": return 210;
      case "Harburg": return 100;
      case "Wandsbek": return 260;
      default: return 200;
    }
  }

  // --- CORE GAME MODES & SPORCLE ROUNDS ---
  initGameMode(container) {
    const isBz = this.activeSegment === 'BEZIRKE';
    
    container.innerHTML = `
      <div class="game-play-area">
        <!-- Play / Round Controls -->
        <div class="round-setup-card" id="round-setup-ui" style="display: flex; flex-direction: column; gap: 0.75rem; text-align: center;">
          <div style="font-size: 1.8rem;">🎮</div>
          <h4 style="font-family: var(--font-display); font-weight:700; color: #fff;">Durchlauf starten</h4>
          <p style="font-size:0.82rem; color: var(--text-secondary);">
            Lerne fokussiert in geschlossenen Runden wie bei Sporcle. Richtige/falsche Antworten bleiben markiert!
            ${this.progressionMode && !isBz ? '<br><strong style="color: var(--color-xp);">Schalte den nächsten Bezirk frei mit einer Runden-Genauigkeit von 75% oder mehr!</strong>' : ''}
          </p>
          
          ${!isBz ? `
          <div style="text-align: left; display:flex; flex-direction:column; gap:0.35rem;">
            <label style="font-size:0.75rem; color: var(--text-muted); font-weight:600;">Bezirke einbeziehen:</label>
            <div class="bezirk-picker" id="bezirk-picker">
              ${this.getUnlockedBezirke().map((b, i) => `
                <label class="bezirk-picker-item">
                  <input type="checkbox" value="${b}" ${i === 0 ? 'checked' : ''}>
                  <span>${b}</span>
                </label>
              `).join('')}
            </div>
          </div>` : ''}

          <button class="primary-btn" id="btn-start-round" style="margin-top:0.4rem; padding: 0.75rem;">Beginnen</button>
        </div>

        <!-- Active round dashboard (hidden initially) -->
        <div id="round-active-ui" style="display:none; flex-direction:column;">
          <div class="prompt-box" style="margin-bottom:1rem;">
            <div class="prompt-title" id="game-prompt-title">...</div>
            <div class="prompt-target" id="game-prompt-target">Bereit?</div>
            <div class="prompt-sub" id="game-prompt-sub">Wähle deinen Bezirk...</div>
          </div>
          
          <!-- Round Indicators -->
          <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.6rem; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; margin-bottom: 0.75rem;">
            <div id="round-questions-count" style="font-weight: 700; color: #fff;">Frage 0/0</div>
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

          <button type="button" class="secondary-btn danger-outline" id="btn-cancel-round" style="margin-top: 1rem;">Runde abbrechen</button>
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
        alert('Bitte wähle mindestens einen Bezirk aus.');
        return;
      }
      this.startRound(selected);
    });
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
      this.roundQuestions = BEZIRKE_PROGRESSION.map(b => ({ name: b.name, type: 'Bezirk' })).sort(() => Math.random() - 0.5);
    } else {
      const bezirke = Array.isArray(districtSelection) ? districtSelection : [districtSelection];
      const pool = HAMBURG_DATA.filter(d => !d.is_island && bezirke.includes(d.bezirk));
      this.roundQuestions = pool.sort(() => Math.random() - 0.5);
    }

    if (this.roundQuestions.length === 0) {
      alert("Fehler: Keine Fragen im ausgewählten Bezirk gefunden!");
      this.inRound = false;
      return;
    }

    // Toggle UI Card elements
    document.getElementById('round-setup-ui').style.display = 'none';
    document.getElementById('round-active-ui').style.display = 'flex';
    
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
    document.getElementById('round-questions-count').textContent = `Ort ${this.roundIndex + 1} von ${this.roundQuestions.length}`;
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

    if (this.currentMode === 'LOCATE') {
      promptTitle.textContent = isBz ? "Finde den Bezirk" : "Finde den Stadtteil";
      promptTarget.textContent = this.currentTarget.name;
      promptTarget.classList.add('highlight');
      promptSub.textContent = isBz ? "Klicke ihn auf der Karte an!" : `Liegt im Bezirk ${this.currentTarget.bezirk}. Klicke ihn an!`;
    } 
    else if (this.currentMode === 'QUIZ') {
      promptTitle.textContent = isBz ? "Welcher Bezirk blinkt?" : "Welcher Stadtteil blinkt?";
      promptTarget.innerHTML = isBz ? "❔ Blinkender Bezirk ❔" : "❔ Blinkender Stadtteil ❔";
      promptTarget.classList.remove('highlight');
      promptSub.textContent = "Wähle die passende Antwort aus den Optionen!";
      
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
      promptTitle.textContent = isBz ? "Bezirk benennen" : "Stadtteil benennen";
      promptTarget.textContent = isBz ? "Welcher Bezirk blinkt?" : "Welcher Stadtteil blinkt?";
      promptTarget.classList.remove('highlight');
      promptSub.textContent = "Tippe den Namen ein — bei richtiger Eingabe zählt er sofort.";

      if (isBz) {
        document.querySelectorAll(`.stadtteil-path[data-bezirk="${this.currentTarget.name}"]`).forEach(p => p.classList.add('blink'));
      } else {
        const targetPath = this.getPathByNeighbourhoodName(this.currentTarget.name);
        if (targetPath) targetPath.classList.add('blink');
      }

      this.generateTypingField(optionsContainer);
    }

    // Bind Cancel round button
    document.getElementById('btn-cancel-round').onclick = () => this.endRound(true);
  }

  // Generate MC Choices for QUIZ
  generateMCROptions(container) {
    const isBz = this.activeSegment === 'BEZIRKE';
    const choices = new Set([this.currentTarget.name]);
    
    if (isBz) {
      const districts = BEZIRKE_PROGRESSION.map(b => b.name);
      while (choices.size < 4) {
        choices.add(districts[Math.floor(Math.random() * districts.length)]);
      }
    } else {
      let pool = this.roundQuestions;
      if (pool.length < 4) pool = HAMBURG_DATA.filter(d => !d.is_island);
      while (choices.size < 4) {
        choices.add(pool[Math.floor(Math.random() * pool.length)].name);
      }
    }

    this.currentChoices = Array.from(choices).sort(() => Math.random() - 0.5);
    const letters = ['A', 'B', 'C', 'D'];
    this.currentChoices.forEach((choice, idx) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `<span>${choice}</span><span class="choice-letter">${letters[idx]}</span>`;
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
    input.placeholder = this.activeSegment === 'BEZIRKE' ? 'Bezirksname eingeben...' : 'Stadtteilname eingeben...';
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
      pool = BEZIRKE_PROGRESSION.map(b => b.name);
    } else {
      pool = HAMBURG_DATA.filter(d => !d.is_island).map(d => d.name);
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
      this.roundIncorrect++;
      document.getElementById('round-incorrect-count').textContent = this.roundIncorrect;
      if (input) {
        input.classList.add('input-shake');
        setTimeout(() => input.classList.remove('input-shake'), 400);
        input.select();
      }
      const sub = document.getElementById('game-prompt-sub');
      if (sub) {
        sub.innerHTML = `<span style="color: var(--color-incorrect); font-weight:700;">Nicht richtig — versuch es nochmal!</span>`;
      }
      return;
    }

    if (input) input.style.pointerEvents = 'none';
    this.sounds.init();
    this.roundCorrect++;
    this.incrementStreak();
    const xp = this.addXp(15);
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
    }

    document.getElementById('game-prompt-sub').innerHTML = `<span style="color: var(--color-correct); font-weight:700;">Richtig! +${xp} XP</span>`;

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
      const xp = this.addXp(15);
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
      }

      document.getElementById('game-prompt-sub').innerHTML = `<span style="color: var(--color-correct); font-weight:700;">Richtig! +${xp} XP</span>`;
      
      this.roundIndex++;
      setTimeout(() => this.nextRoundQuestion(), 1200);
    } else {
      this.roundIncorrect++;
      this.resetStreak();
      this.sounds.playIncorrect();

      if (chosenBtn) chosenBtn.classList.add('incorrect');

      this.revealMissedTarget(correctAnswer, isBz);

      document.getElementById('game-prompt-sub').innerHTML = `<span style="color: var(--color-incorrect); font-weight:700;">Falsch! Richtig wäre: ${correctAnswer}</span>`;
      
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
      const xp = this.addXp(20); // Locate gives 20 XP
      this.sounds.playCorrect();

      path.classList.add('round-correct');
      this.addMapTextLabel(name, name, 'correct');
      this.recordRoundProgress(name);

      document.getElementById('game-prompt-sub').innerHTML = `<span style="color: var(--color-correct); font-weight:700;">Korrekt gefunden! +${xp} XP</span>`;
      
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

      document.getElementById('game-prompt-sub').innerHTML = `<span style="color: var(--color-incorrect); font-weight:700;">Falsch! Richtig wäre: ${this.currentTarget.name}</span>`;
      
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
      const xp = this.addXp(20);
      this.sounds.playCorrect();

      document.querySelectorAll(`.stadtteil-path[data-bezirk="${bezirkClicked}"]`).forEach(p => p.classList.add('round-correct'));
      this.addMapTextLabel(bezirkClicked, bezirkClicked, 'correct');

      document.getElementById('game-prompt-sub').innerHTML = `<span style="color: var(--color-correct); font-weight:700;">Bezirk korrekt! +${xp} XP</span>`;
      
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

      document.getElementById('game-prompt-sub').innerHTML = `<span style="color: var(--color-incorrect); font-weight:700;">Falsch! Richtig wäre: ${this.currentTarget.name}</span>`;
      
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
    const labelGroup = document.getElementById('map-labels-group');
    if (!labelGroup) return;

    const id = this.labelIdForKey(targetKey);
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    let centroid;
    const path = this.getPathByNeighbourhoodName(targetKey);
    if (path) {
      centroid = this.getPathCentroid(path);
    } else if (BEZIRKE_PROGRESSION.some(b => b.name === targetKey)) {
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
    const labelGroup = document.getElementById('map-labels-group');
    if (labelGroup) labelGroup.innerHTML = '';
  }

  // --- ROUND FINISHED SUMMARY ENGINE ---
  finishRound() {
    this.inRound = false;
    
    const total = this.roundQuestions.length;
    const percent = Math.round((this.roundCorrect / total) * 100);
    const passed = percent >= 75;

    // progression locks evaluations
    let unlockCongrat = '';
    const isBz = this.activeSegment === 'BEZIRKE';

    const roundBezirke = Array.isArray(this.roundDistrict) ? this.roundDistrict : [this.roundDistrict];
    const singleBezirk = !isBz && roundBezirke.length === 1 ? roundBezirke[0] : null;

    if (this.progressionMode && !isBz && singleBezirk) {
      const currentIdx = BEZIRKE_PROGRESSION.findIndex(b => b.name === singleBezirk);
      if (passed && currentIdx >= 0 && currentIdx < BEZIRKE_PROGRESSION.length - 1) {
        // Unlock next
        const nextBezirk = BEZIRKE_PROGRESSION[currentIdx + 1];
        // Bump user XP if needed to trigger unlock or force unlock next
        if (this.xp < nextBezirk.xpNeeded) {
          const diff = nextBezirk.xpNeeded - this.xp;
          this.addXp(diff); // Boost XP so they automatically meet requirement!
        }
        unlockCongrat = `<br><h3 style="color: var(--color-xp); margin: 0.5rem 0;">🎉 Bezirk freigeschaltet: ${nextBezirk.name}!</h3>`;
      } else if (!passed) {
        unlockCongrat = `<br><span style="color: var(--color-incorrect); font-weight:700;">Durchgefallen! Du benötigst mindestens 75% richtige Antworten, um den nächsten Bezirk freizuschalten.</span>`;
      }
    }

    const container = document.getElementById('game-play-area');
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem; text-align: center; padding: 0.5rem;">
        <div style="font-size: 2.2rem;">🏁</div>
        <h3 style="font-family: var(--font-display); font-weight:700; color: #fff;">Runde beendet!</h3>
        
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem; display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; margin-top:0.4rem;">
          <div>
            <div style="font-size:0.75rem; color: var(--text-muted);">Ergebnis</div>
            <div style="font-size:1.4rem; font-weight:700; color: ${passed ? 'var(--color-correct)' : 'var(--color-incorrect)'};">${this.roundCorrect} / ${total}</div>
          </div>
          <div>
            <div style="font-size:0.75rem; color: var(--text-muted);">Erfolgsquote</div>
            <div style="font-size:1.4rem; font-weight:700; color: ${passed ? 'var(--color-correct)' : 'var(--color-incorrect)'};">${percent}%</div>
          </div>
        </div>

        ${unlockCongrat}

        <div class="round-end-actions">
          <button class="primary-btn" id="btn-restart-round">Nochmal spielen</button>
          <button class="secondary-btn" id="btn-exit-round">Beenden</button>
        </div>
      </div>
    `;

    if (percent === 100) launchConfetti();

    this.recordGameHistory({
      mode: this.currentMode,
      segment: this.activeSegment,
      districts: roundBezirke,
      correct: this.roundCorrect,
      total,
      percent,
      passed
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
    this.inRound = false;
    this.resetMapClasses();
    this.clearMapTextLabels();
    if (showUI) this.setMode(this.currentMode);
  }


  // --- MODE: NAME_ALL (SPORCLE COUNTDOWN CHALLENGE) ---
  initNameAllMode(container) {
    this.nameAllFound.clear();
    this.nameAllIsActive = false;
    this.nameAllTimeLeft = 600; // 10 minutes

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.75rem; text-align:center;" id="name-all-setup">
        <div style="font-size:2.2rem;">⏱️</div>
        <h4 style="font-family:var(--font-display); font-weight:700; color:#fff;">Nenne alle Stadtteile!</h4>
        <p style="font-size:0.82rem; color:var(--text-secondary);">
          Wie viele Hamburger Stadtteile kannst du aus dem Kopf nennen? 
          Tippe sie ein. Richtige leuchten sofort grün auf!
          <br><strong>Zeitlimit: 10:00 Minuten.</strong>
        </p>
        <button class="primary-btn" id="btn-start-nameall" style="padding:0.75rem;">Beginnen</button>
      </div>

      <div style="display:none; flex-direction:column; gap:0.6rem;" id="name-all-active">
        <div class="timer-display" id="timer-display">10:00</div>
        
        <div style="background: rgba(0,0,0,0.15); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.5rem; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
          <span style="font-weight:700; color:#fff;">Gefunden:</span>
          <span style="font-weight:700; color:var(--color-correct);" id="name-all-counter">0 / 104</span>
        </div>

        <input type="text" class="text-input-field" id="name-all-input" placeholder="Gib einen Namen ein..." autocomplete="off">

        <div class="action-btn-row" style="margin-top:0.4rem;">
          <button type="button" class="secondary-btn" id="btn-pause-nameall">Pause</button>
          <button type="button" class="secondary-btn danger-outline" id="btn-giveup-nameall">Aufgeben</button>
        </div>
      </div>
    `;

    document.getElementById('btn-start-nameall').onclick = () => this.startNameAllChallenge();
  }

  startNameAllChallenge() {
    this.sounds.init();
    this.resetMapClasses();
    this.clearMapTextLabels();
    
    // Hide unlocked segment overlays if progression is on, to make it completely blank
    document.querySelectorAll('.stadtteil-path').forEach(p => {
      p.classList.remove('locked-path', 'unlocked-bezirk', 'discovered');
      p.style.fill = '';
      p.style.stroke = '';
      p.style.pointerEvents = 'none';
    });
    this.svg?.classList.add('name-all-active');
    this.raiseWaterLayerForNameAll();

    this.nameAllFound.clear();
    this.nameAllIsActive = true;
    this.nameAllTimeLeft = 600; // 10 minutes

    document.getElementById('name-all-setup').style.display = 'none';
    document.getElementById('name-all-active').style.display = 'flex';

    const countLabel = document.getElementById('name-all-counter');
    const totalCount = HAMBURG_DATA.filter(d => !d.is_island).length;
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
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => this.tickNameAll(), 1000);
  }

  tickNameAll() {
    if (!this.nameAllIsActive) return;

    this.nameAllTimeLeft--;
    
    const minutes = Math.floor(this.nameAllTimeLeft / 60);
    const seconds = this.nameAllTimeLeft % 60;
    const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const display = document.getElementById('timer-display');
    if (display) display.textContent = formatted;

    if (this.nameAllTimeLeft <= 0) {
      this.stopNameAllChallenge(true); // time out
    }
  }

  toggleNameAllPause(btn) {
    this.nameAllIsActive = !this.nameAllIsActive;
    
    const input = document.getElementById('name-all-input');
    if (this.nameAllIsActive) {
      btn.textContent = 'Pause';
      if (input) {
        input.disabled = false;
        input.focus();
      }
      this.timerInterval = setInterval(() => this.tickNameAll(), 1000);
    } else {
      btn.textContent = 'Weiter';
      if (input) input.disabled = true;
      clearInterval(this.timerInterval);
    }
  }

  checkNameAllInput(input, totalCount) {
    if (!this.nameAllIsActive) return;
    const val = input.value.trim();
    if (val.length < 2) return;

    const cleanStr = str => str.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
    const cleanVal = cleanStr(val);

    // Look for matching stadtteil in database
    const match = HAMBURG_DATA.find(d => cleanStr(d.name) === cleanVal && !d.is_island);
    
    if (match && !this.nameAllFound.has(match.name)) {
      this.nameAllFound.add(match.name);
      this.sounds.playCorrect();

      // Green highlight map path
      const correctPath = this.getPathByNeighbourhoodName(match.name);
      if (correctPath) {
        correctPath.classList.add('round-correct');
        this.addMapTextLabel(match.name, match.name, 'correct');
      }

      this.addXp(10, { quiet: true });
      this.recordRoundProgress(match.name, { skipMapRefresh: true, skipStats: true });

      // Update counters
      document.getElementById('name-all-counter').textContent = `${this.nameAllFound.size} / ${totalCount}`;

      // Reset text input field immediately!
      input.value = '';
      
      // Check if all found!
      if (this.nameAllFound.size === totalCount) {
        this.stopNameAllChallenge(false); // Victory!
      }
    }
  }

  stopNameAllChallenge(surrender = true) {
    this.nameAllIsActive = false;
    this.svg?.classList.remove('name-all-active');
    this.reorderMapLayers();
    if (this.timerInterval) clearInterval(this.timerInterval);

    const totalCount = HAMBURG_DATA.filter(d => !d.is_island).length;
    const foundCount = this.nameAllFound.size;
    const percent = Math.round((foundCount / totalCount) * 100);

    // If surrender or timeout, reveal all missing in red and label them!
    if (surrender) {
      const missing = HAMBURG_DATA.filter(d => !d.is_island && !this.nameAllFound.has(d.name));
      let idx = 0;
      const revealBatch = () => {
        const slice = missing.slice(idx, idx + 12);
        slice.forEach(d => {
          const path = this.getPathByNeighbourhoodName(d.name);
          if (path) {
            path.classList.add('round-incorrect');
            this.addMapTextLabel(d.name, d.name, 'incorrect');
          }
        });
        idx += 12;
        if (idx < missing.length) {
          requestAnimationFrame(revealBatch);
        }
      };
      requestAnimationFrame(revealBatch);
      this.sounds.playIncorrect();
    } else {
      this.sounds.playLevelUp();
      launchConfetti();
      this.unlockAchievement("meister_alle_stadtteile", "König von Hamburg 👑", "Finde alle Stadtteile in der Sporcle-Challenge!");
    }

    this.recordGameHistory({
      mode: 'NAME_ALL',
      segment: this.activeSegment,
      districts: ['Alle Stadtteile'],
      correct: foundCount,
      total: totalCount,
      percent,
      passed: !surrender && foundCount === totalCount
    });

    const container = document.getElementById('game-play-area');
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.75rem; text-align:center; padding: 0.5rem;">
        <div style="font-size:2.2rem;">⏱️</div>
        <h3 style="font-family:var(--font-display); font-weight:700; color:#fff;">Challenge beendet!</h3>
        
        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:0.25rem;">
          ${surrender ? 'Du hast aufgegeben oder die Zeit ist abgelaufen. Alle fehlenden Orte leuchten rot auf der Karte.' : 'Unglaublich! Du hast JEDEN EINZELNEN Stadtteil gefunden!'}
        </p>

        <div style="background: rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.75rem; display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Gefunden</div>
            <div style="font-size:1.4rem; font-weight:700; color:var(--color-correct);">${foundCount} / ${totalCount}</div>
          </div>
          <div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Quote</div>
            <div style="font-size:1.4rem; font-weight:700; color:var(--color-correct);">${percent}%</div>
          </div>
        </div>

        <div class="round-end-actions" style="margin-top:0.5rem;">
          <button class="secondary-btn" id="btn-exit-nameall">Beenden & Karte aufräumen</button>
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
window.addEventListener('DOMContentLoaded', () => {
  const game = new HamburgGame();
  game.init();
  window.hamburgGame = game;
});
