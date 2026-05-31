/* KiezQuiz — Multi-City registry data (Phase 1) */
(function () {
  const HAMBURG_BEZIRKE_PROGRESSION = [
    { name: 'Altona', xpNeeded: 0 },
    { name: 'Eimsbüttel', xpNeeded: 50 },
    { name: 'Hamburg-Nord', xpNeeded: 150 },
    { name: 'Wandsbek', xpNeeded: 300 },
    { name: 'Hamburg-Mitte', xpNeeded: 500 },
    { name: 'Harburg', xpNeeded: 750 },
    { name: 'Bergedorf', xpNeeded: 1000 }
  ];

  const BERLIN_BEZIRKE_PROGRESSION = [
    { name: 'Mitte', xpNeeded: 0 },
    { name: 'Friedrichshain-Kreuzberg', xpNeeded: 50 },
    { name: 'Pankow', xpNeeded: 150 },
    { name: 'Charlottenburg-Wilmersdorf', xpNeeded: 300 },
    { name: 'Tempelhof-Schöneberg', xpNeeded: 500 },
    { name: 'Neukölln', xpNeeded: 750 },
    { name: 'Steglitz-Zehlendorf', xpNeeded: 1000 },
    { name: 'Spandau', xpNeeded: 1250 },
    { name: 'Reinickendorf', xpNeeded: 1500 },
    { name: 'Treptow-Köpenick', xpNeeded: 1750 },
    { name: 'Marzahn-Hellersdorf', xpNeeded: 2000 },
    { name: 'Lichtenberg', xpNeeded: 2250 }
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
      progression: HAMBURG_BEZIRKE_PROGRESSION,
      trophyCatalog: 'hamburg',
      totalTrophies: 11,
      islandEasterEgg: 'neuwerk',
      paradiseTarget: 'Groß Flottbek',
      onboardingVersion: 1
    },
    {
      id: 'berlin',
      name: 'Berlin',
      greetingKey: 'cities.berlin.greeting',
      blurbKey: 'cities.berlin.blurb',
      hue: 38,
      status: 'playable',
      levels: [
        { key: 'bezirke', labelKey: 'cities.berlin.levels.bezirke', singularKey: 'cities.berlin.singular.bezirk', tierKey: 'cities.tier.overview', count: 12 },
        { key: 'ortsteile', labelKey: 'cities.berlin.levels.ortsteile', singularKey: 'cities.berlin.singular.ortsteil', tierKey: 'cities.tier.detail', count: 97 }
      ],
      dataGlobal: 'BERLIN_DATA',
      mapSvg: 'src/data/berlin_map.svg',
      progression: BERLIN_BEZIRKE_PROGRESSION,
      trophyCatalog: 'berlin',
      totalTrophies: 16,
      islandEasterEgg: 'pfaueninsel',
      paradiseTarget: 'Teufelsberg',
      onboardingVersion: 1
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

  window.KQ_DATA = {
    cities,
    BEZIRKE_PROGRESSION: HAMBURG_BEZIRKE_PROGRESSION,
    HAMBURG_BEZIRKE_PROGRESSION,
    BERLIN_BEZIRKE_PROGRESSION
  };
})();
