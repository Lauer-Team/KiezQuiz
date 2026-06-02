/* KiezQuiz — City registry helpers */
(function () {
  const SEGMENT_TO_LEVEL = {
    STADTTEILE: 'stadtteile',
    BEZIRKE: 'bezirke'
  };

  const LEVEL_TO_SEGMENT = {
    stadtteile: 'STADTTEILE',
    bezirke: 'BEZIRKE',
    ortsteile: 'STADTTEILE',
    stadtbezirke: 'BEZIRKE',
    countries: 'BEZIRKE',
    capitals: 'STADTTEILE'
  };

  function isLightTheme() {
    try {
      if (window.kiezTheme?.getTheme) return window.kiezTheme.getTheme() === 'light';
    } catch (_) { /* ignore */ }
    return document.documentElement.dataset.theme === 'light'
      || document.body?.dataset.theme === 'light';
  }

  function accentVars(hue) {
    if (isLightTheme()) {
      return {
        '--acc-h': String(hue),
        '--acc': `hsl(${hue} 60% 38%)`,
        '--acc-bright': `hsl(${hue} 55% 30%)`,
        '--acc-line': `hsl(${hue} 45% 38% / 0.35)`,
        '--acc-fill': `hsl(${hue} 50% 42% / 0.12)`,
        '--acc-fill-soft': `hsl(${hue} 50% 42% / 0.06)`,
        '--acc-glow': `hsl(${hue} 55% 38% / 0.2)`
      };
    }
    return {
      '--acc-h': String(hue),
      '--acc': `hsl(${hue} 100% 62%)`,
      '--acc-bright': `hsl(${hue} 100% 70%)`,
      '--acc-line': `hsl(${hue} 90% 60% / 0.42)`,
      '--acc-fill': `hsl(${hue} 95% 58% / 0.14)`,
      '--acc-fill-soft': `hsl(${hue} 95% 58% / 0.07)`,
      '--acc-glow': `hsl(${hue} 100% 62% / 0.40)`
    };
  }

  function applyAccentVars(el, hue) {
    if (!el) return;
    const vars = accentVars(hue);
    Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
  }

  function getAllCities() {
    return window.KQ_DATA?.cities || [];
  }

  function getCity(id) {
    return getAllCities().find((c) => c.id === id) || null;
  }

  function getPlayableCities() {
    return getAllCities().filter((c) => c.status === 'playable');
  }

  function getBezirkeProgression(cityId) {
    const city = getCity(cityId || 'hamburg');
    return city?.progression || window.KQ_DATA?.BEZIRKE_PROGRESSION || [];
  }

  function segmentToLevelKey(segment, cityId) {
    const city = getCity(cityId || 'hamburg');
    if (!city) return SEGMENT_TO_LEVEL[segment] || 'stadtteile';
    if (segment === 'BEZIRKE') return city.levels[0]?.key || 'bezirke';
    return city.levels[1]?.key || 'stadtteile';
  }

  function levelKeyToSegment(levelKey) {
    return LEVEL_TO_SEGMENT[levelKey] || 'STADTTEILE';
  }

  function getCityLevel(cityId, levelKey) {
    const city = getCity(cityId);
    if (!city) return null;
    return city.levels.find((l) => l.key === levelKey) || city.levels[0];
  }

  function localizeCity(city) {
    if (!city) return null;
    return {
      ...city,
      greeting: t(city.greetingKey),
      blurb: t(city.blurbKey),
      levels: city.levels.map((lv) => ({
        ...lv,
        label: t(lv.labelKey),
        singular: t(lv.singularKey),
        tier: t(lv.tierKey)
      }))
    };
  }

  function isPlayable(id) {
    const city = getCity(id);
    return city?.status === 'playable';
  }

  /** Root-absolute URL so maps load from / and /hamburg/ alike */
  function resolveMapSvgUrl(relativePath) {
    if (!relativePath) return relativePath;
    if (/^https?:\/\//i.test(relativePath) || relativePath.startsWith('/')) return relativePath;
    return `/${relativePath.replace(/^\//, '')}`;
  }

  window.cityRegistry = {
    accentVars,
    applyAccentVars,
    getAllCities,
    getCity,
    getPlayableCities,
    isPlayable,
    getBezirkeProgression,
    segmentToLevelKey,
    levelKeyToSegment,
    getCityLevel,
    localizeCity,
    resolveMapSvgUrl,
    SEGMENT_TO_LEVEL,
    LEVEL_TO_SEGMENT
  };
})();
