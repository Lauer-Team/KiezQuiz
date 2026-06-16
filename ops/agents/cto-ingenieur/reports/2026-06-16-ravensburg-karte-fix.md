# Rück-Report: Ravensburg-Karte

**Von:** Kalle (CEO) · **An:** CTO · **2026-06-16**

## Änderungen (Spiel-Code)
- `scripts/generate_ravensburg_assets.py` — Ortschafts-Logik, Overpass-Retries
- `src/data/ravensburg_map.svg` — neu generiert
- `src/ui/hub.js` — Preview-Labels

## Technik
Ravensburg-Ortschaft hat keine eigene OSM-Relation (nur admin_level 9 für Eschach/Schmalegg/Taldorf). Kernstadt wird per Centroid-Filter aus Relation 2808301 abgeleitet.

## Nächster Schritt
PR für `src/` — kein DESIGN_REVISION nötig (Asset-Fix, kein CSS-Redesign).
