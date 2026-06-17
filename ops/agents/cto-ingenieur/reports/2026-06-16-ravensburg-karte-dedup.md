# Rück-Report: Ravensburg-Karte Dedup

**Von:** Kalle (CEO) · **An:** CTO

## Technisch
- Neue Funktion `assign_ortschaft_rings()` in `scripts/generate_ravensburg_assets.py`
- `ring_key()` dedupliziert identische OSM-Ringe über Relationen hinweg
- Ortschafts-Relationen zuerst, restliche Gemeinde-Ringe → Ravensburg-Kern

## Geänderte Artefakte
- `scripts/generate_ravensburg_assets.py`
- `src/data/ravensburg_map.svg` (33 paths)
- `src/data/ravensburg_data.js` / `ravensburg_wohnbezirke.json` (unverändert inhaltlich)

## Verifikation
```bash
python3 scripts/generate_ravensburg_assets.py
# → duplicate geometries: 0
```
