/* KiezQuiz — Multi-City registry data (Phase 1) */
(function () {
  const BEZIRKE_PROGRESSION = [
    { name: 'Altona', xpNeeded: 0 },
    { name: 'Eimsbüttel', xpNeeded: 50 },
    { name: 'Hamburg-Nord', xpNeeded: 150 },
    { name: 'Wandsbek', xpNeeded: 300 },
    { name: 'Hamburg-Mitte', xpNeeded: 500 },
    { name: 'Harburg', xpNeeded: 750 },
    { name: 'Bergedorf', xpNeeded: 1000 }
  ];

  const cities = [
    {
      id: 'hamburg',
      name: 'Hamburg',
      greetingKey: 'cities.hamburg.greeting',
      blurbKey: 'cities.hamburg.blurb',
      hue: 205,
      home: true,
      status: 'playable',
      levels: [
        { key: 'bezirke', labelKey: 'cities.hamburg.levels.bezirke', singularKey: 'cities.hamburg.singular.bezirk', tierKey: 'cities.tier.overview', count: 7 },
        { key: 'stadtteile', labelKey: 'cities.hamburg.levels.stadtteile', singularKey: 'cities.hamburg.singular.stadtteil', tierKey: 'cities.tier.detail', count: 104 }
      ],
      dataGlobal: 'HAMBURG_DATA',
      mapSvg: 'src/data/hamburg_map.svg',
      progression: BEZIRKE_PROGRESSION,
      trophyCatalog: 'hamburg',
      totalTrophies: 11
    },
    {
      id: 'berlin',
      name: 'Berlin',
      greetingKey: 'cities.berlin.greeting',
      blurbKey: 'cities.berlin.blurb',
      hue: 38,
      status: 'coming_soon',
      levels: [
        { key: 'bezirke', labelKey: 'cities.berlin.levels.bezirke', singularKey: 'cities.berlin.singular.bezirk', tierKey: 'cities.tier.overview', count: 12 },
        { key: 'ortsteile', labelKey: 'cities.berlin.levels.ortsteile', singularKey: 'cities.berlin.singular.ortsteil', tierKey: 'cities.tier.detail', count: 96 }
      ],
      totalTrophies: 0
    },
    {
      id: 'frankfurt',
      name: 'Frankfurt',
      greetingKey: 'cities.frankfurt.greeting',
      blurbKey: 'cities.frankfurt.blurb',
      hue: 352,
      status: 'coming_soon',
      levels: [
        { key: 'stadtbezirke', labelKey: 'cities.frankfurt.levels.stadtbezirke', singularKey: 'cities.frankfurt.singular.stadtbezirk', tierKey: 'cities.tier.overview', count: 16 },
        { key: 'stadtteile', labelKey: 'cities.frankfurt.levels.stadtteile', singularKey: 'cities.frankfurt.singular.stadtteil', tierKey: 'cities.tier.detail', count: 46 }
      ],
      totalTrophies: 0
    }
  ];

  window.KQ_DATA = { cities, BEZIRKE_PROGRESSION };
})();
