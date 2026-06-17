# Ravensburg-Karte: Doppel-Polygone entfernt

**Datum:** 2026-06-16 · **Agent:** Kalle (CEO) · **Auslöser:** Nutzer-Fotos (Telegram)

## Was
`scripts/generate_ravensburg_assets.py` — Ring-Zuordnung überarbeitet, `src/data/ravensburg_map.svg` neu erzeugt.

## Warum
Der Fix vom Vormittag filterte Gemeinde-Ringe für „Ravensburg“, zeichnete danach aber **nochmal alle** Eschach/Schmalegg/Taldorf-Ringe drüber → **9 identische SVG-Pfade doppelt** (Ravensburg + Nachbar-Ortschaft). Ergebnis: zerschossene Karte mit Überlagerungen und Lücken.

## Ergebnis
- Jeder OSM-Außenring genau **einmal** zugeordnet (`assign_ortschaft_rings`)
- 33 Pfade statt 42, **0 Duplikate**
- Verteilung: Ravensburg 5 · Eschach 11 · Schmalegg 5 · Taldorf 4 (+ Wohnbezirk-Kreise)

**Offen:** Branch + PR + Merge → Deploy (Nutzer sieht Fix erst live nach Push auf `main`).
