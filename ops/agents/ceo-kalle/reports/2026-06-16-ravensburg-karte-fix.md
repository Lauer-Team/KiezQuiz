# Ravensburg-Karte korrigiert

**Datum:** 2026-06-16 · **Agent:** Kalle (CEO)

## Was
Kartengenerator `scripts/generate_ravensburg_assets.py` überarbeitet und `src/data/ravensburg_map.svg` neu erzeugt (42 Pfade statt 24).

## Warum
OSM-Relation 2808301 ist die **gesamte** Große Kreisstadt (admin_level 8), nicht nur die Ortschaft Ravensburg. Der alte Generator zeichnete alle 15 Ringe als „Ravensburg“ — inkl. Flächen von Eschach, Schmalegg und Taldorf → falsche Überlagerungen.

## Ergebnis
- Ravensburg-Ortschaft = Gemeinde-Ringe **minus** die drei äußeren Ortschaften (9 Ringe)
- Eschach, Schmalegg, Taldorf je als eigene OSM-Polygone
- Wohnbezirke weiter als Marker-Kreise (keine OSM-Grenzen)
- Hub-Vorschau-Namen an echte Bezirke angepasst (`src/ui/hub.js`)

**Nachfolger:** `2026-06-16-ravensburg-karte-dedup.md` — Doppel-Polygone (9×) entfernt, 33 Pfade.

**Offen:** Branch + PR + Merge auf `main` → Deploy
