/* KiezQuiz — release history (oldest → newest; UI shows reversed) */
(function () {
  const CHANGELOG_ENTRIES = [
    {
      date: '2026-05-28',
      version: '0.1.0',
      de: {
        title: 'Erstveröffentlichung Hamburg',
        items: [
          'Interaktive Hamburg-Karte mit allen 7 Bezirken und 104 Stadtteilen',
          'Fünf Spielmodi: Entdecker, Detektiv, Quiz, Namen tippen und Sporcle-Challenge',
          'XP-System mit Rängen, Streaks und Spielverlauf',
          'Web-Audio-Sounds und Begrüßungsnachricht beim Start'
        ]
      },
      en: {
        title: 'Initial Hamburg release',
        items: [
          'Interactive Hamburg map with all 7 boroughs and 104 districts',
          'Five game modes: Explorer, Locate, Quiz, Type Name, and Sporcle Challenge',
          'XP system with ranks, streaks, and game history',
          'Web Audio sounds and welcome message on start'
        ]
      }
    },
    {
      date: '2026-05-28',
      version: '0.2.0',
      de: {
        title: 'Gameplay & Karte',
        items: [
          'Karten-Tooltips, Spielmodi, Audio und UI poliert',
          'Verbesserter „Beginnen“-Flow und Runden über mehrere Bezirke',
          'Gewässer-Styling, klarere Bezirksgrenzen und fokussiertes Spiel',
          'Besseres Karten-Feedback und Fortschritt in allen Modi',
          'Pokale für Bezirks-Meisterschaften eingeführt',
          'Langsamere Rang-Progression und 10-Minuten-Rundenlimit',
          'Stats-Leiste, Log-Texte und Scroll-Sperre in Overlays verbessert'
        ]
      },
      en: {
        title: 'Gameplay & map',
        items: [
          'Polished map tooltips, game modes, audio, and UI',
          'Improved start flow and rounds spanning multiple boroughs',
          'Water styling, clearer borough boundaries, and focused gameplay',
          'Better map feedback and progression across all modes',
          'Trophy system for borough mastery introduced',
          'Slower rank progression and 10-minute round time limit',
          'Stats bar, log copy, and overlay scroll lock improved'
        ]
      }
    },
    {
      date: '2026-05-29',
      version: '0.3.0',
      de: {
        title: 'KiezQuiz & Mobile',
        items: [
          'Projekt in UI, Paketname und README zu KiezQuiz umbenannt',
          'Vorbereitung für GitHub Pages und mobile Safari',
          'Auswahl-Sounds und Hinweis für Karten-Gesten auf dem Handy',
          'Neuwerk-Insel-Badge und Spezial-Puzzle poliert',
          'Log- und Einstellungs-Modals schließen per Hintergrund-Tipp',
          'Footer-Credit ergänzt',
          'Klick vs. Ziehen auf der Karte unter macOS korrigiert'
        ]
      },
      en: {
        title: 'KiezQuiz & mobile',
        items: [
          'Rebranded project to KiezQuiz in UI, package name, and README',
          'Prepared for GitHub Pages and mobile Safari',
          'Selection sounds and map gesture hint on mobile',
          'Neuwerk island badge and special puzzle polished',
          'Log and settings modals close on backdrop tap',
          'Footer credit added',
          'Fixed map click vs. drag on native Mac'
        ]
      }
    },
    {
      date: '2026-05-31',
      version: '0.4.0',
      de: {
        title: 'Cloud-Sync & Teilen',
        items: [
          'Optionaler Account mit Cloud-Speicherung des Spielstands (Supabase)',
          'Auth-UX und zuverlässiger Cloud-Save beim Abmelden',
          'Open-Graph- und Twitter-Card-Vorschau für geteilte Links',
          'Sicherheits-Härtung: keine Keys mehr im Repo, geschützte Auth-RPCs',
          'Dependabot für npm und GitHub Actions'
        ]
      },
      en: {
        title: 'Cloud sync & sharing',
        items: [
          'Optional account with cloud progress sync (Supabase)',
          'Improved auth UX and reliable cloud save on logout',
          'Open Graph and Twitter Card previews for shared links',
          'Security hardening: no keys in repo, protected auth RPCs',
          'Dependabot for npm and GitHub Actions'
        ]
      }
    },
    {
      date: '2026-05-31',
      version: '0.5.0',
      de: {
        title: 'Englisch & kiezquiz.de',
        items: [
          'Englische Sprache mit DE/EN-Umschalter in der Kopfzeile',
          'Neue Hauptdomain kiezquiz.de'
        ]
      },
      en: {
        title: 'English & kiezquiz.de',
        items: [
          'English language support with DE/EN switcher in the header',
          'New primary domain kiezquiz.de'
        ]
      }
    },
    {
      date: '2026-06-01',
      version: '0.6.0',
      de: {
        title: 'Multi-City-Hub',
        items: [
          'Städte-Hub: Stadt wählen und getrennten Fortschritt pro Stadt speichern',
          'Globale XP-Ränge von stadtbezogenen Bezirks- und Pokal-Rängen getrennt',
          'Hamburg-thematische Namen für Stadt-Ränge wiederhergestellt',
          'Cloud-Merge beim Start: eingeloggte Nutzer sehen sofort den zusammengeführten Stand'
        ]
      },
      en: {
        title: 'Multi-city hub',
        items: [
          'City hub: pick a city and keep separate progress per city',
          'Global XP ranks split from per-city borough and trophy ranks',
          'Hamburg-themed names for city ranks restored',
          'Cloud merge on boot: logged-in users see merged progress immediately'
        ]
      }
    },
    {
      date: '2026-06-01',
      version: '0.7.0',
      de: {
        title: 'Berlin',
        items: [
          'Berlin als zweite spielbare Stadt mit Bezirken und Ortsteilen',
          'Stadt-spezifische Engine: Karten, Pokale und Trivia pro Stadt',
          'Berlin-Onboarding, Karten-Labels und Insel-Puzzle korrigiert',
          'Schärfere Bezirksgrenzen auf der Karte'
        ]
      },
      en: {
        title: 'Berlin',
        items: [
          'Berlin as second playable city with boroughs and neighbourhoods',
          'City-aware engine: maps, trophies, and trivia per city',
          'Berlin onboarding, map labels, and island puzzle fixed',
          'Sharper borough boundary lines on the map'
        ]
      }
    },
    {
      date: '2026-06-01',
      version: '0.8.0',
      de: {
        title: 'Frankfurt & Stadt-Wünsche',
        items: [
          'Frankfurt am Main als dritte spielbare Stadt',
          'Stadt-Wunschliste: für die nächste Stadt abstimmen oder vorschlagen',
          'Korrekturen bei Segment-Zählung, Karten-Panning und Wunsch-Tracking',
          'Gestapelte Einstellungs-Modals beim Stadtwechsel behoben'
        ]
      },
      en: {
        title: 'Frankfurt & city wishes',
        items: [
          'Frankfurt am Main as third playable city',
          'City wish list: vote for or propose the next city',
          'Fixes for segment counts, map panning, and wish tracking',
          'Fixed stacked settings modals when switching cities'
        ]
      }
    },
    {
      date: '2026-06-01',
      version: '0.9.0',
      de: {
        title: 'SEO & Performance',
        items: [
          'SEO-Grundlage für Suchmaschinen (Structured Data, Landing Pages)',
          'App-Start blockiert nicht mehr bei hängender Auth-Verbindung',
          'Deep Links öffnen die richtige Stadt; Header-Badge aktualisiert sich sofort',
          'Kleinere HTML-Dateien und lazy Game-Loading für schnelleren Start',
          'Stadt-URLs starten direkt in der spielbaren App',
          'Admin-Bereich für Stadt-Wunsch-Statistiken',
          '23-Stunden-Cooldown pro Stadt-Wunsch mit klarer Rückmeldung'
        ]
      },
      en: {
        title: 'SEO & performance',
        items: [
          'SEO foundation for search engines (structured data, landing pages)',
          'App startup no longer blocked by hanging auth connection',
          'Deep links open the correct city; header badge updates immediately',
          'Smaller HTML and lazy game loading for faster start',
          'City URLs start directly in the playable app',
          'Admin area for city wish analytics',
          '23-hour cooldown per city wish with clear feedback'
        ]
      }
    },
    {
      date: '2026-06-01',
      version: '1.0.0',
      de: {
        title: 'Profil & Soziales',
        items: [
          'Einmaliges App-News-Modal für große Updates',
          'Profilseite mit Freunden, Bestenliste und Bestwerten pro Stadt',
          'Profil-UX: Konto-Aktionen, Verlauf, Suche und Leaderboards verbessert',
          'Freundes-Suche: mehrere Anfragen und Groß-/Kleinschreibung egal',
          'Pokale im Log antippbar für Details',
          'Karten-Auto-Zoom zentriert den aktiven Bezirk randlos'
        ]
      },
      en: {
        title: 'Profile & social',
        items: [
          'One-time app news modal for major updates',
          'Profile page with friends, leaderboards, and per-city best scores',
          'Profile UX: account actions, history, search, and leaderboards improved',
          'Friend search: multiple requests work, case does not matter',
          'Tappable trophies in the log for details',
          'Map auto-zoom fits active borough edge-to-edge'
        ]
      }
    },
    {
      date: '2026-06-01',
      version: '1.1.0',
      de: {
        title: 'Europa-Quiz',
        items: [
          'Europa-Karte mit 44 Ländern und Hauptstädten als vierte Spielwelt',
          'Entdecker-Modus und offener Hauptstädte-Modus für Europa',
          'Pokal-Hinweise und Standard-Auswahl aller Länder im Hauptstädte-Modus korrigiert'
        ]
      },
      en: {
        title: 'Europe quiz',
        items: [
          'Map of Europe with 44 countries and capitals as fourth game world',
          'Explorer mode and open capitals mode for Europe',
          'Fixed trophy alerts and default all countries in capitals mode'
        ]
      }
    },
    {
      date: '2026-06-01',
      version: '1.2.0',
      de: {
        title: 'Changelog',
        items: [
          'Neuer „Was ist neu?“-Changelog mit der kompletten Versionshistorie',
          'Erreichbar im Footer und in den Einstellungen — jederzeit nachlesbar'
        ]
      },
      en: {
        title: 'Changelog',
        items: [
          'New “What’s new?” changelog with the full version history',
          'Available in the footer and settings — always there when you need it'
        ]
      }
    }
  ];

  function localizeEntry(entry) {
    const lang = typeof getLocale === 'function' ? getLocale() : 'de';
    const block = entry[lang] || entry.de;
    return {
      date: entry.date,
      version: entry.version,
      title: block.title,
      items: block.items
    };
  }

  function getChangelogEntries() {
    return CHANGELOG_ENTRIES.map(localizeEntry);
  }

  function getChangelogEntriesNewestFirst() {
    return getChangelogEntries().reverse();
  }

  window.kiezChangelogData = {
    entries: CHANGELOG_ENTRIES,
    getEntries: getChangelogEntries,
    getEntriesNewestFirst: getChangelogEntriesNewestFirst
  };
})();
