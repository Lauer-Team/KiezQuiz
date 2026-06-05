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

  const EUROPE_COUNTRIES_PROGRESSION = [
    { name: 'Deutschland', xpNeeded: 0 },
    { name: 'Österreich', xpNeeded: 50 },
    { name: 'Schweiz', xpNeeded: 100 },
    { name: 'Frankreich', xpNeeded: 150 },
    { name: 'Belgien', xpNeeded: 200 },
    { name: 'Niederlande', xpNeeded: 250 },
    { name: 'Luxemburg', xpNeeded: 300 },
    { name: 'Italien', xpNeeded: 350 },
    { name: 'Spanien', xpNeeded: 400 },
    { name: 'Portugal', xpNeeded: 450 },
    { name: 'Vereinigtes Königreich', xpNeeded: 500 },
    { name: 'Irland', xpNeeded: 550 },
    { name: 'Dänemark', xpNeeded: 600 },
    { name: 'Schweden', xpNeeded: 650 },
    { name: 'Norwegen', xpNeeded: 700 },
    { name: 'Finnland', xpNeeded: 750 },
    { name: 'Island', xpNeeded: 800 },
    { name: 'Polen', xpNeeded: 850 },
    { name: 'Tschechien', xpNeeded: 900 },
    { name: 'Slowakei', xpNeeded: 950 },
    { name: 'Ungarn', xpNeeded: 1000 },
    { name: 'Rumänien', xpNeeded: 1050 },
    { name: 'Bulgarien', xpNeeded: 1100 },
    { name: 'Griechenland', xpNeeded: 1150 },
    { name: 'Kroatien', xpNeeded: 1200 },
    { name: 'Slowenien', xpNeeded: 1250 },
    { name: 'Serbien', xpNeeded: 1300 },
    { name: 'Bosnien und Herzegowina', xpNeeded: 1350 },
    { name: 'Montenegro', xpNeeded: 1400 },
    { name: 'Albanien', xpNeeded: 1450 },
    { name: 'Nordmazedonien', xpNeeded: 1500 },
    { name: 'Ukraine', xpNeeded: 1550 },
    { name: 'Belarus', xpNeeded: 1600 },
    { name: 'Moldawien', xpNeeded: 1650 },
    { name: 'Litauen', xpNeeded: 1700 },
    { name: 'Lettland', xpNeeded: 1750 },
    { name: 'Estland', xpNeeded: 1800 },
    { name: 'Zypern', xpNeeded: 1850 },
    { name: 'Malta', xpNeeded: 1900 },
    { name: 'Andorra', xpNeeded: 1950 },
    { name: 'Monaco', xpNeeded: 2000 },
    { name: 'San Marino', xpNeeded: 2050 },
    { name: 'Liechtenstein', xpNeeded: 2100 },
    { name: 'Vatikanstadt', xpNeeded: 2150 }
  ];

  const DUESSELDORF_BEZIRKE_PROGRESSION = [
    { name: 'Stadtbezirk 1', xpNeeded: 0 },
    { name: 'Stadtbezirk 2', xpNeeded: 50 },
    { name: 'Stadtbezirk 3', xpNeeded: 150 },
    { name: 'Stadtbezirk 4', xpNeeded: 300 },
    { name: 'Stadtbezirk 5', xpNeeded: 450 },
    { name: 'Stadtbezirk 6', xpNeeded: 600 },
    { name: 'Stadtbezirk 7', xpNeeded: 750 },
    { name: 'Stadtbezirk 8', xpNeeded: 950 },
    { name: 'Stadtbezirk 9', xpNeeded: 1150 },
    { name: 'Stadtbezirk 10', xpNeeded: 1350 }
  ];

  const FRANKFURT_BEZIRKE_PROGRESSION = [
    { name: 'Innenstadt I', xpNeeded: 0 },
    { name: 'Innenstadt II', xpNeeded: 50 },
    { name: 'Innenstadt III', xpNeeded: 150 },
    { name: 'Bornheim/Ostend', xpNeeded: 300 },
    { name: 'Süd', xpNeeded: 450 },
    { name: 'West', xpNeeded: 600 },
    { name: 'Mitte-West', xpNeeded: 750 },
    { name: 'Nord-West', xpNeeded: 900 },
    { name: 'Mitte-Nord', xpNeeded: 1050 },
    { name: 'Nord-Ost', xpNeeded: 1200 },
    { name: 'Ost', xpNeeded: 1350 },
    { name: 'Kalbach-Riedberg', xpNeeded: 1500 },
    { name: 'Nieder-Erlenbach', xpNeeded: 1650 },
    { name: 'Harheim', xpNeeded: 1800 },
    { name: 'Nieder-Eschbach', xpNeeded: 2000 },
    { name: 'Bergen-Enkheim', xpNeeded: 2250 }
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
      paradiseTarget: 'Groß Flottbek'
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
      paradiseTarget: 'Teufelsberg'
    },
    {
      id: 'frankfurt',
      name: 'Frankfurt am Main',
      greetingKey: 'cities.frankfurt.greeting',
      blurbKey: 'cities.frankfurt.blurb',
      hue: 352,
      status: 'playable',
      levels: [
        { key: 'stadtbezirke', labelKey: 'cities.frankfurt.levels.stadtbezirke', singularKey: 'cities.frankfurt.singular.stadtbezirk', tierKey: 'cities.tier.overview', count: 16 },
        { key: 'stadtteile', labelKey: 'cities.frankfurt.levels.stadtteile', singularKey: 'cities.frankfurt.singular.stadtteil', tierKey: 'cities.tier.detail', count: 46 }
      ],
      dataGlobal: 'FRANKFURT_DATA',
      mapSvg: 'src/data/frankfurt_map.svg',
      progression: FRANKFURT_BEZIRKE_PROGRESSION,
      trophyCatalog: 'frankfurt',
      totalTrophies: 19,
      paradiseTarget: 'Westend-Süd'
    },
    {
      id: 'duesseldorf',
      name: 'Düsseldorf',
      greetingKey: 'cities.duesseldorf.greeting',
      blurbKey: 'cities.duesseldorf.blurb',
      hue: 295,
      status: 'playable',
      levels: [
        { key: 'stadtbezirke', labelKey: 'cities.duesseldorf.levels.stadtbezirke', singularKey: 'cities.duesseldorf.singular.stadtbezirk', tierKey: 'cities.tier.overview', count: 10 },
        { key: 'stadtteile', labelKey: 'cities.duesseldorf.levels.stadtteile', singularKey: 'cities.duesseldorf.singular.stadtteil', tierKey: 'cities.tier.detail', count: 50 }
      ],
      dataGlobal: 'DUESSELDORF_DATA',
      mapSvg: 'src/data/duesseldorf_map.svg',
      progression: DUESSELDORF_BEZIRKE_PROGRESSION,
      trophyCatalog: 'duesseldorf',
      totalTrophies: 13,
      paradiseTarget: 'Altstadt'
    },
    {
      id: 'europe',
      name: 'Europa',
      greetingKey: 'cities.europe.greeting',
      blurbKey: 'cities.europe.blurb',
      hue: 145,
      status: 'playable',
      levels: [
        { key: 'countries', labelKey: 'cities.europe.levels.countries', singularKey: 'cities.europe.singular.country', tierKey: 'cities.tier.overview', count: 44 },
        { key: 'capitals', labelKey: 'cities.europe.levels.capitals', singularKey: 'cities.europe.singular.capital', tierKey: 'cities.tier.detail', count: 44 }
      ],
      dataGlobal: 'EUROPE_DATA',
      mapSvg: 'src/data/europe_map.svg',
      progression: EUROPE_COUNTRIES_PROGRESSION,
      trophyCatalog: 'europe',
      totalTrophies: 57,
      paradiseTarget: 'Prag',
      islandEasterEgg: 'europe'
    }
  ];

  window.KQ_DATA = {
    cities,
    BEZIRKE_PROGRESSION: HAMBURG_BEZIRKE_PROGRESSION,
    HAMBURG_BEZIRKE_PROGRESSION,
    BERLIN_BEZIRKE_PROGRESSION,
    FRANKFURT_BEZIRKE_PROGRESSION,
    DUESSELDORF_BEZIRKE_PROGRESSION,
    EUROPE_COUNTRIES_PROGRESSION
  };
})();
