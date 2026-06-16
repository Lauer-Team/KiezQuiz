# ODbL 1.0 – Rechtliche Einordnung der Geodaten (KiezQuiz)

**Datum & Version:** 10. Juni 2026, KiezQuiz (Web-App)

---

## Betroffene Dateien

| Datei | Ursprungsquelle | Art der Bearbeitung | Vorläufige Einordnung |
|-------|-----------------|---------------------|------------------------|
| `src/data/hamburg_stadtteile.json` | [Click That Hood](https://github.com/codeforgermany/click_that_hood) / OpenStreetMap | Filterung auf Hamburger Stadtteile; Hinzufügen von Quiz-Metadaten (Bezirk, Fläche, Bevölkerung aus Wikipedia); Vereinfachung der Geometrie zu SVG-Pfaden in der App | **Produced Work** (vorläufig): Die JSON-Datei ist eine aufbereitete Quiz-Datenbank mit eigenen Metadaten; die Karte wird als SVG gerendert — kein direkter Re-Export der OSM-Datenbank |
| `src/data/berlin_ortsteile.json` | Click That Hood / OSM | Analog Hamburg: Ortsteil-Filter, Quiz-Metadaten, SVG-Aufbereitung | **Produced Work** (vorläufig) |
| `src/data/frankfurt_stadtteile.json` | Click That Hood / OSM | Analog: Stadtteil-Filter, Metadaten, SVG | **Produced Work** (vorläufig) |
| `src/data/duesseldorf_stadtteile.json` | Click That Hood / OSM | Analog: Stadtteil-Filter, Metadaten, SVG | **Produced Work** (vorläufig) |
| `src/data/ravensburg_wohnbezirke.json` | OpenStreetMap (Stadt-/Ortschaftsgrenzen) | Grenzen aus OSM-Relationen; Quiz-Metadaten; SVG-Aufbereitung | **Produced Work** (vorläufig) |

**Nicht betroffen (unproblematisch):**

- `src/data/muenchen_stadtteile.json` — Datenlizenz Deutschland v2.0 (Stadt München)
- `src/data/europe_meta.json` / Natural Earth — Public Domain
- `src/data/mississippi_counties.json` — US Census TIGER/Line, Public Domain

---

## ODbL §§ 1, 4.4, 4.6 – Kurzübersicht

Die Open Database License (ODbL 1.0) schützt OpenStreetMap-Datenbanken und verlangt bei **Derivative Databases** (bearbeiteten Datenbanken mit substantiellem OSM-Inhalt) die Weitergabe unter derselben Lizenz (Share-Alike, § 4.4). **Produced Works** (z. B. Karten, Bilder, interaktive Visualisierungen), die aus der Datenbank erzeugt werden, ohne die Datenbank selbst weiterzugeben, unterliegen dieser Share-Alike-Pflicht nicht (§ 4.6). Entscheidend ist, ob die aufbereiteten JSON-Dateien als eigenständige „Derivative Database“ oder als Zwischenschritt zu einem „Produced Work“ (SVG-Karte) zu qualifizieren sind.

---

## Handlungsoptionen

1. **Falls Produced Work (vorläufige Einschätzung):** Dokumentation in dieser Datei; Hinweis auf `/lizenzen/` (ODbL-Attribution bleibt bestehen). Keine Pflicht zur Freigabe der Quiz-Metadaten-JSON unter ODbL.
2. **Falls Derivative Database (nach anwaltlicher Prüfung):** Geodaten unter ODbL freigeben (z. B. separates Repo oder `/data/odbl/`) **oder** Wechsel auf amtliche Verwaltungsdaten ohne Share-Alike (Datenlizenz Deutschland v2.0, wie München).

---

## Status

- [ ] Rechtliche Prüfung durch Fachanwalt ausstehend
- [x] Interne Vorab-Einordnung dokumentiert (10.06.2026)
- [x] Lizenzen-Seite um Hinweis ergänzt

---

*Internes Dokument — nicht öffentlich deployen.*
