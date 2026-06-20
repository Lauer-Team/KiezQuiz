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

  const MUENCHEN_BEZIRKE_PROGRESSION = [
    { name: 'Altstadt-Lehel', xpNeeded: 0 },
    { name: 'Ludwigsvorstadt-Isarvorstadt', xpNeeded: 50 },
    { name: 'Maxvorstadt', xpNeeded: 100 },
    { name: 'Schwabing-West', xpNeeded: 200 },
    { name: 'Au-Haidhausen', xpNeeded: 300 },
    { name: 'Sendling', xpNeeded: 400 },
    { name: 'Sendling-Westpark', xpNeeded: 500 },
    { name: 'Schwanthalerhöhe', xpNeeded: 600 },
    { name: 'Neuhausen-Nymphenburg', xpNeeded: 700 },
    { name: 'Moosach', xpNeeded: 850 },
    { name: 'Milbertshofen-Am Hart', xpNeeded: 1000 },
    { name: 'Schwabing-Freimann', xpNeeded: 1150 },
    { name: 'Bogenhausen', xpNeeded: 1300 },
    { name: 'Berg am Laim', xpNeeded: 1450 },
    { name: 'Trudering-Riem', xpNeeded: 1600 },
    { name: 'Ramersdorf-Perlach', xpNeeded: 1750 },
    { name: 'Obergiesing-Fasangarten', xpNeeded: 1900 },
    { name: 'Untergiesing-Harlaching', xpNeeded: 2050 },
    { name: 'Thalkirchen-Obersendling-Forstenried-Fürstenried-Solln', xpNeeded: 2200 },
    { name: 'Hadern', xpNeeded: 2350 },
    { name: 'Pasing-Obermenzing', xpNeeded: 2500 },
    { name: 'Aubing-Lochhausen-Langwied', xpNeeded: 2650 },
    { name: 'Allach-Untermenzing', xpNeeded: 2800 },
    { name: 'Feldmoching-Hasenbergl', xpNeeded: 2950 },
    { name: 'Laim', xpNeeded: 3100 }
  ];

  const RAVENSBURG_ORTSCHAFTEN_PROGRESSION = [
    { name: 'Ravensburg', xpNeeded: 0 },
    { name: 'Eschach', xpNeeded: 50 },
    { name: 'Schmalegg', xpNeeded: 150 },
    { name: 'Taldorf', xpNeeded: 300 }
  ];

  const DUESSELDORF_BEZIRKE_PROGRESSION = [
    { name: 'Altstadt', xpNeeded: 0 },
    { name: 'Flingern', xpNeeded: 50 },
    { name: 'Unterbilk', xpNeeded: 150 },
    { name: 'Oberkassel', xpNeeded: 300 },
    { name: 'Stockum', xpNeeded: 450 },
    { name: 'Unterrath', xpNeeded: 600 },
    { name: 'Gerresheim', xpNeeded: 750 },
    { name: 'Eller', xpNeeded: 950 },
    { name: 'Benrath', xpNeeded: 1150 },
    { name: 'Garath', xpNeeded: 1350 }
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
      id: 'muenchen',
      name: 'München',
      greetingKey: 'cities.muenchen.greeting',
      blurbKey: 'cities.muenchen.blurb',
      hue: 220,
      status: 'playable',
      levels: [
        { key: 'stadtbezirke', labelKey: 'cities.muenchen.levels.stadtbezirke', singularKey: 'cities.muenchen.singular.stadtbezirk', tierKey: 'cities.tier.overview', count: 25 },
        { key: 'bezirksteile', labelKey: 'cities.muenchen.levels.bezirksteile', singularKey: 'cities.muenchen.singular.bezirksteil', tierKey: 'cities.tier.detail', count: 108 }
      ],
      dataGlobal: 'MUENCHEN_DATA',
      mapSvg: 'src/data/muenchen_map.svg',
      progression: MUENCHEN_BEZIRKE_PROGRESSION,
      trophyCatalog: 'muenchen',
      totalTrophies: 28,
      paradiseTarget: 'Schwabing'
    },
    {
      id: 'ravensburg',
      name: 'Ravensburg',
      greetingKey: 'cities.ravensburg.greeting',
      blurbKey: 'cities.ravensburg.blurb',
      hue: 165,
      status: 'hidden',
      levels: [
        { key: 'ortschaften', labelKey: 'cities.ravensburg.levels.ortschaften', singularKey: 'cities.ravensburg.singular.ortschaft', tierKey: 'cities.tier.overview', count: 4 },
        { key: 'wohnbezirke', labelKey: 'cities.ravensburg.levels.wohnbezirke', singularKey: 'cities.ravensburg.singular.wohnbezirk', tierKey: 'cities.tier.detail', count: 10 }
      ],
      dataGlobal: 'RAVENSBURG_DATA',
      mapSvg: 'src/data/ravensburg_map.svg',
      progression: RAVENSBURG_ORTSCHAFTEN_PROGRESSION,
      trophyCatalog: 'ravensburg',
      totalTrophies: 7,
      paradiseTarget: 'Veitsburg'
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
    },
    {
      id: 'wien',
      name: 'Wien',
      greetingKey: 'cities.wien.greeting',
      blurbKey: 'cities.wien.blurb',
      hue: 12,
      status: 'playable',
      levels: [
        { key: 'bezirke', labelKey: 'cities.wien.levels.bezirke', singularKey: 'cities.wien.singular.bezirk', tierKey: 'cities.tier.overview', count: 23 }
      ],
      dataGlobal: 'WIEN_DATA',
      mapSvg: 'src/data/wien_map.svg',
      progression: typeof WIEN_BEZIRKE_PROGRESSION !== 'undefined' ? WIEN_BEZIRKE_PROGRESSION : [],
      trophyCatalog: 'wien',
      totalTrophies: 25,
      paradiseTarget: 'Favoriten'
    },
    {
      id: 'paris',
      name: 'Paris',
      greetingKey: 'cities.paris.greeting',
      blurbKey: 'cities.paris.blurb',
      hue: 268,
      status: 'playable',
      levels: [
        { key: 'arrondissements', labelKey: 'cities.paris.levels.arrondissements', singularKey: 'cities.paris.singular.arrondissement', tierKey: 'cities.tier.overview', count: 20 }
      ],
      dataGlobal: 'PARIS_DATA',
      mapSvg: 'src/data/paris_map.svg',
      progression: typeof PARIS_ARRONDISSEMENTS_PROGRESSION !== 'undefined' ? PARIS_ARRONDISSEMENTS_PROGRESSION : [],
      trophyCatalog: 'paris',
      totalTrophies: 22,
      paradiseTarget: '11e arrondissement'
    },
    {
      id: 'mississippi',
      name: 'Mississippi',
      greetingKey: 'cities.mississippi.greeting',
      blurbKey: 'cities.mississippi.blurb',
      hue: 28,
      status: 'playable',
      levels: [
        { key: 'counties', labelKey: 'cities.mississippi.levels.counties', singularKey: 'cities.mississippi.singular.county', tierKey: 'cities.tier.overview', count: 82 }
      ],
      dataGlobal: 'MISSISSIPPI_DATA',
      mapSvg: 'src/data/mississippi_map.svg',
      progression: typeof MISSISSIPPI_COUNTIES_PROGRESSION !== 'undefined' ? MISSISSIPPI_COUNTIES_PROGRESSION : [],
      trophyCatalog: 'mississippi',
      totalTrophies: 84,
      paradiseTarget: 'Jackson'
    }
  ];

  window.KQ_DATA = {
    cities,
    BEZIRKE_PROGRESSION: HAMBURG_BEZIRKE_PROGRESSION,
    HAMBURG_BEZIRKE_PROGRESSION,
    BERLIN_BEZIRKE_PROGRESSION,
    FRANKFURT_BEZIRKE_PROGRESSION,
    MUENCHEN_BEZIRKE_PROGRESSION,
    DUESSELDORF_BEZIRKE_PROGRESSION,
    RAVENSBURG_ORTSCHAFTEN_PROGRESSION,
    EUROPE_COUNTRIES_PROGRESSION
  };
})();
