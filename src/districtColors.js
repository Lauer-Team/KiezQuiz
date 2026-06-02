/* KiezQuiz — per-district hue palette (Hamburg uses CSS vars in base.css) */
(function () {
  const FIXED_HUES = {
    Altona: 295,
    Bergedorf: 32,
    'Eimsbüttel': 175,
    'Hamburg-Mitte': 345,
    'Hamburg-Nord': 210,
    Harburg: 100,
    Wandsbek: 260,
    Mitte: 38,
    'Friedrichshain-Kreuzberg': 350,
    Pankow: 160,
    'Charlottenburg-Wilmersdorf': 280,
    Spandau: 200,
    'Steglitz-Zehlendorf': 120,
    'Tempelhof-Schöneberg': 310,
    Neukölln: 45,
    'Treptow-Köpenick': 85,
    'Marzahn-Hellersdorf': 15,
    Lichtenberg: 330,
    Reinickendorf: 190,
    'Innenstadt I': 352,
    'Innenstadt II': 5,
    'Innenstadt III': 20,
    'Bornheim/Ostend': 340,
    Süd: 25,
    West: 210,
    'Mitte-West': 280,
    'Nord-West': 175,
    'Mitte-Nord': 310,
    'Nord-Ost': 45,
    Ost: 185,
    'Kalbach-Riedberg': 130,
    'Nieder-Erlenbach': 95,
    Harheim: 160,
    'Nieder-Eschbach': 220,
    'Bergen-Enkheim': 15
  };

  const HAMBURG_CSS_KEYS = {
    Altona: 'altona',
    Bergedorf: 'bergedorf',
    'Eimsbüttel': 'eimsbuettel',
    'Hamburg-Mitte': 'hamburg-mitte',
    'Hamburg-Nord': 'hamburg-nord',
    Harburg: 'harburg',
    Wandsbek: 'wandsbek'
  };

  const progressionHueCache = new Map();

  function slugify(name) {
    return String(name).toLowerCase().replace(/\s+/g, '-');
  }

  function hashHue(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
  }

  function getProgressionHue(cityId, districtName) {
    const cacheKey = `${cityId}:${districtName}`;
    if (progressionHueCache.has(cacheKey)) return progressionHueCache.get(cacheKey);

    const city = window.cityRegistry?.getCity?.(cityId);
    const baseHue = parseInt(city?.hue, 10) || 210;
    const progression = window.cityRegistry?.getBezirkeProgression?.(cityId) || [];
    const idx = progression.findIndex((entry) => entry.name === districtName);
    const hue = idx >= 0
      ? (baseHue + idx * 43) % 360
      : hashHue(`${cityId}:${districtName}`);

    progressionHueCache.set(cacheKey, hue);
    return hue;
  }

  function getDistrictHue(cityId, districtName) {
    if (FIXED_HUES[districtName] !== undefined) return FIXED_HUES[districtName];
    return getProgressionHue(cityId, districtName);
  }

  function getDistrictCssKey(cityId, districtName) {
    if (cityId === 'hamburg' && HAMBURG_CSS_KEYS[districtName]) {
      return HAMBURG_CSS_KEYS[districtName];
    }
    return slugify(districtName);
  }

  function getDistrictIndicatorColor(cityId, districtName) {
    if (cityId === 'hamburg') {
      return `var(--color-${getDistrictCssKey(cityId, districtName)})`;
    }
    const hue = getDistrictHue(cityId, districtName);
    return `hsl(${hue} 72% 58%)`;
  }

  window.districtColors = {
    getDistrictHue,
    getDistrictCssKey,
    getDistrictIndicatorColor
  };
})();
