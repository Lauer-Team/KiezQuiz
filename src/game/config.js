/* KiezQuiz game config & trophy catalog */
/* -------------------------------------------------------------
 * Cyber-Alster Hamburg Stadtteile - Main Game Logic Engine V2
 * Pure modular JavaScript with Web Audio Synth and Custom SVG Zoom/Pan.
 * ------------------------------------------------------------- */

/** XP awarded for each correct answer (all modes). */
const XP_PER_HIT = 25;

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

/** App-news modal disabled (0 = off). Bump + locale copy only when re-enabling release popover. */
const APP_NEWS_VERSION = 0;

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
    emptyBezirk: 'explorer.emptyBezirkFrankfurt',
    emptyDetail: 'explorer.emptyStadtteilFrankfurt',
    subdistricts: 'explorer.subdistrictsFrankfurt',
    specialIds: ['paradise_explorer', 'meister_alle_stadtteile', 'meister_alle_bezirke'],
    detailUnit: 'Stadtteil'
  },
  muenchen: {
    rankKey: 'cityRanksMuenchen',
    trophyNs: 'trophiesMuenchen',
    defaultBezirkTrivia: 'trivia.defaultBezirkMuenchen',
    emptyBezirk: 'explorer.emptyBezirkMuenchen',
    emptyDetail: 'explorer.emptyBezirksteilMuenchen',
    subdistricts: 'explorer.subdistrictsMuenchen',
    specialIds: ['paradise_explorer', 'meister_alle_stadtteile', 'meister_alle_bezirke'],
    detailUnit: 'Bezirksteil'
  },
  duesseldorf: {
    rankKey: 'cityRanksDuesseldorf',
    trophyNs: 'trophiesDuesseldorf',
    defaultBezirkTrivia: 'trivia.defaultBezirkDuesseldorf',
    emptyBezirk: 'explorer.emptyBezirkDuesseldorf',
    emptyDetail: 'explorer.emptyStadtteilDuesseldorf',
    subdistricts: 'explorer.subdistrictsDuesseldorf',
    specialIds: ['paradise_explorer', 'meister_alle_stadtteile', 'meister_alle_bezirke'],
    detailUnit: 'Stadtteil'
  },
  ravensburg: {
    rankKey: 'cityRanksRavensburg',
    trophyNs: 'trophiesRavensburg',
    defaultBezirkTrivia: 'trivia.defaultOrtschaftRavensburg',
    emptyBezirk: 'explorer.emptyOrtschaftRavensburg',
    emptyDetail: 'explorer.emptyWohnbezirkRavensburg',
    subdistricts: 'explorer.subdistrictsRavensburg',
    specialIds: ['paradise_explorer', 'meister_alle_stadtteile', 'meister_alle_bezirke'],
    detailUnit: 'Wohnbezirk'
  },
  europe: {
    rankKey: 'cityRanksEurope',
    trophyNs: 'trophiesEurope',
    defaultBezirkTrivia: 'trivia.defaultCountryEurope',
    emptyBezirk: 'explorer.emptyCountryEurope',
    emptyDetail: 'explorer.emptyCapitalEurope',
    subdistricts: 'explorer.capitalsEurope',
    specialIds: [
      'eu_founding_perfect', 'eu_members_perfect', 'nordic_master', 'baltic_master',
      'benelux_master', 'canary_islands', 'azores_madeira', 'caribbean_nl',
      'french_overseas', 'svalbard', 'paradise_explorer', 'meister_alle_stadtteile', 'meister_alle_bezirke'
    ],
    detailUnit: 'Capital',
    capitalsBlinkCountry: true,
    hideLocateInCapitals: true
  },
  mississippi: {
    rankKey: 'cityRanksMississippi',
    trophyNs: 'trophiesMississippi',
    defaultBezirkTrivia: 'trivia.defaultCountyMississippi',
    emptyBezirk: 'explorer.emptyCountyMississippi',
    emptyDetail: 'explorer.emptyCountyMississippi',
    subdistricts: 'explorer.countiesMississippi',
    specialIds: ['paradise_explorer', 'meister_alle_bezirke'],
    detailUnit: 'County'
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

const DUESSELDORF_BEZIRK_GUESS_ALIASES = {
  '1': 'Altstadt',
  '2': 'Flingern',
  '3': 'Unterbilk',
  '4': 'Oberkassel',
  '5': 'Stockum',
  '6': 'Unterrath',
  '7': 'Gerresheim',
  '8': 'Eller',
  '9': 'Benrath',
  '10': 'Garath',
  stadtbezirk1: 'Altstadt',
  stadtbezirk2: 'Flingern',
  stadtbezirk3: 'Unterbilk',
  stadtbezirk4: 'Oberkassel',
  stadtbezirk5: 'Stockum',
  stadtbezirk6: 'Unterrath',
  stadtbezirk7: 'Gerresheim',
  stadtbezirk8: 'Eller',
  stadtbezirk9: 'Benrath',
  stadtbezirk10: 'Garath'
};

function resolveBezirkGuessName(cityId, normalizedGuess) {
  if (cityId !== 'duesseldorf') return null;
  return DUESSELDORF_BEZIRK_GUESS_ALIASES[normalizedGuess] || null;
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
  if (key === 'MUENCHEN_DATA' && typeof MUENCHEN_DATA !== 'undefined') return MUENCHEN_DATA;
  if (key === 'DUESSELDORF_DATA' && typeof DUESSELDORF_DATA !== 'undefined') return DUESSELDORF_DATA;
  if (key === 'RAVENSBURG_DATA' && typeof RAVENSBURG_DATA !== 'undefined') return RAVENSBURG_DATA;
  if (key === 'EUROPE_DATA' && typeof EUROPE_DATA !== 'undefined') return EUROPE_DATA;
  if (key === 'MISSISSIPPI_DATA' && typeof MISSISSIPPI_DATA !== 'undefined') return MISSISSIPPI_DATA;
  if (key === 'EUROPE_ISLAND_EGGS' && typeof EUROPE_ISLAND_EGGS !== 'undefined') return EUROPE_ISLAND_EGGS;
  if (typeof HAMBURG_DATA !== 'undefined') return HAMBURG_DATA;
  return [];
}

function getBezirkTrophyTexts(cityId, bezirkName) {
  const city = window.cityRegistry?.getCity(cityId);
  const unitLabel = t(
    (city?.levels?.length === 1 ? city.levels[0]?.singularKey : city?.levels?.[1]?.singularKey)
      || 'cities.hamburg.singular.stadtteil'
  );
  const cssKey = cityId === 'hamburg'
    ? (HAMBURG_BEZIRK_TROPHY_KEYS[bezirkName] || bezirkToTrophyCssKey(bezirkName))
    : bezirkToTrophyCssKey(bezirkName);
  const id = `master_${cssKey}`;
  if (cityId === 'hamburg' && HAMBURG_BEZIRK_TROPHY_KEYS[bezirkName]) {
    return {
      id,
      name: t(`trophies.${id}.name`, { bezirk: bezirkName }),
      desc: t(`trophies.${id}.desc`, { bezirk: bezirkName })
    };
  }
  return {
    id,
    name: t('trophies.master_bezirk.name', { bezirk: bezirkName, unit: unitLabel }),
    desc: t('trophies.master_bezirk.desc', { bezirk: bezirkName, unit: unitLabel })
  };
}

function buildTrophyCatalog(cityId = 'hamburg') {
  const progression = window.cityRegistry.getBezirkeProgression(cityId);

  const cfg = getCityConfig(cityId);
  const specialIds = cfg.specialIds;
  const specialIcons = {
    neuwerk_island: '🏝️', pfaueninsel_island: '🦚', paradise_explorer: '🌴',
    meister_alle_stadtteile: '👑', meister_alle_bezirke: '🏛️',
    eu_founding_perfect: '🇪🇺', eu_members_perfect: '🌟', nordic_master: '❄️',
    baltic_master: '🌊', benelux_master: '🧇',
    canary_islands: '🌋', azores_madeira: '🌊', caribbean_nl: '🦜',
    french_overseas: '🗼', svalbard: '🐻‍❄️'
  };
  const trophyNs = cfg.trophyNs;

  const specials = specialIds.map((id) => ({
    id,
    icon: specialIcons[id],
    name: t(`${trophyNs}.${id}.name`),
    desc: t(`${trophyNs}.${id}.desc`)
  }));

  const bezirkTrophiesFixed = progression.map((bz) => ({
    ...getBezirkTrophyTexts(cityId, bz.name),
    icon: '🏆'
  }));
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
