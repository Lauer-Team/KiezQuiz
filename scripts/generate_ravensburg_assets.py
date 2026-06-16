#!/usr/bin/env python3
"""Generate Ravensburg map SVG and quiz data from OpenStreetMap (ODbL).

Level 1 (Ortschaften): Ravensburg, Eschach, Schmalegg, Taldorf
Level 2 (Wohnbezirke): official Wohnbezirke per Hauptsatzung der Stadt Ravensburg
"""

import json
import math
import os
import time
import urllib.parse
import urllib.request

OVERPASS = "https://overpass-api.de/api/interpreter"

RELATIONS = {
    "Ravensburg": 2808301,
    "Eschach": 10847818,
    "Schmalegg": 10847816,
    "Taldorf": 10847817,
}

# Wohnbezirke: name, parent Ortschaft, centroid (lat/lon), population estimate
WOHNBEZIRKE = [
    {"name": "Ravensburg", "bezirk": "Ravensburg", "lat": 47.7819, "lon": 9.6107, "population": "42.000", "area_km2": "25,0 km²", "polygon": "city_base"},
    {"name": "Veitsburg", "bezirk": "Ravensburg", "lat": 47.7865, "lon": 9.6095, "population": "200", "area_km2": "0,3 km²", "polygon": "circle"},
    {"name": "Weißenau", "bezirk": "Eschach", "lat": 47.7270, "lon": 9.6330, "population": "3.500", "area_km2": "4,5 km²", "polygon": "circle"},
    {"name": "Obereschach", "bezirk": "Eschach", "lat": 47.7520, "lon": 9.6220, "population": "2.800", "area_km2": "5,0 km²", "polygon": "circle"},
    {"name": "Gornhofen", "bezirk": "Eschach", "lat": 47.7680, "lon": 9.6450, "population": "1.200", "area_km2": "2,0 km²", "polygon": "circle"},
    {"name": "Schmalegg", "bezirk": "Schmalegg", "lat": 47.7910, "lon": 9.5420, "population": "2.150", "area_km2": "8,0 km²", "polygon": "relation:Schmalegg"},
    {"name": "Oberzell", "bezirk": "Taldorf", "lat": 47.7280, "lon": 9.5190, "population": "1.400", "area_km2": "6,0 km²", "polygon": "circle"},
    {"name": "Bavendorf", "bezirk": "Taldorf", "lat": 47.7420, "lon": 9.5040, "population": "1.600", "area_km2": "7,0 km²", "polygon": "circle"},
    {"name": "Taldorf", "bezirk": "Taldorf", "lat": 47.7510, "lon": 9.5280, "population": "900", "area_km2": "3,0 km²", "polygon": "circle"},
    {"name": "Adelsreute", "bezirk": "Taldorf", "lat": 47.7180, "lon": 9.4950, "population": "700", "area_km2": "4,0 km²", "polygon": "circle"},
]


def overpass(query: str) -> dict:
    data = urllib.parse.urlencode({"data": query}).encode()
    req = urllib.request.Request(
        OVERPASS,
        data=data,
        headers={"User-Agent": "KiezQuiz/1.0 (https://kiezquiz.de)"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.load(resp)


def fetch_relation_geom(rel_id: int) -> list[list[tuple[float, float]]]:
    """Return list of outer rings as [(lon, lat), ...]."""
    query = f"[out:json][timeout:90];relation({rel_id});out geom;"
    result = overpass(query)
    rings: list[list[tuple[float, float]]] = []
    for el in result.get("elements", []):
        for member in el.get("members", []):
            if member.get("role") not in ("outer", ""):
                continue
            geom = member.get("geometry")
            if not geom:
                continue
            ring = [(p["lon"], p["lat"]) for p in geom]
            if len(ring) >= 3:
                rings.append(ring)
    return rings


def collect_bounds(rings: list[list[tuple[float, float]]]) -> tuple[float, float, float, float]:
    lons = [p[0] for ring in rings for p in ring]
    lats = [p[1] for ring in rings for p in ring]
    return min(lons), min(lats), max(lons), max(lats)


def project(lon: float, lat: float, bounds, width: int, height: int) -> str:
    min_lon, min_lat, max_lon, max_lat = bounds
    lon_diff = max_lon - min_lon or 1e-9
    lat_diff = max_lat - min_lat or 1e-9
    x = (lon - min_lon) / lon_diff * width
    y = height - (lat - min_lat) / lat_diff * height
    return f"{x:.2f},{y:.2f}"


def ring_to_path(ring: list[tuple[float, float]], bounds, width: int, height: int) -> str:
    pts = [project(lon, lat, bounds, width, height) for lon, lat in ring]
    return "M " + " L ".join(pts) + " Z"


def circle_path(lon: float, lat: float, radius_px: float, bounds, width: int, height: int) -> str:
    cx_s, cy_s = project(lon, lat, bounds, width, height).split(",")
    cx, cy = float(cx_s), float(cy_s)
    return (
        f"M {cx - radius_px:.2f},{cy:.2f} "
        f"A {radius_px:.2f},{radius_px:.2f} 0 1,0 {cx + radius_px:.2f},{cy:.2f} "
        f"A {radius_px:.2f},{radius_px:.2f} 0 1,0 {cx - radius_px:.2f},{cy:.2f} Z"
    )


def main() -> None:
    print("Generating Ravensburg assets from OpenStreetMap…")
    os.makedirs("src/data", exist_ok=True)

    relation_rings: dict[str, list[list[tuple[float, float]]]] = {}
    for name, rel_id in RELATIONS.items():
        print(f"  Fetching relation {rel_id} ({name})…")
        time.sleep(1.5)
        relation_rings[name] = fetch_relation_geom(rel_id)
        print(f"    → {len(relation_rings[name])} ring(s)")

    all_rings = [ring for rings in relation_rings.values() for ring in rings]
    min_lon, min_lat, max_lon, max_lat = collect_bounds(all_rings)
    lat_center = (min_lat + max_lat) / 2.0
    cos_lat = math.cos(math.radians(lat_center))
    lon_diff = max_lon - min_lon
    lat_diff = max_lat - min_lat
    height = 600
    width = int(round(height * (lon_diff * cos_lat) / lat_diff))
    bounds = (min_lon, min_lat, max_lon, max_lat)
    print(f"  Map viewBox: 0 0 {width} {height}")

    svg_paths: list[str] = []
    idx = 0

    # Kernstadt base: full city outline under peripheral Ortschaften
    for ring in relation_rings["Ravensburg"]:
        path_data = ring_to_path(ring, bounds, width, height)
        svg_paths.append(
            f'<path id="stadtteil-{idx}" class="stadtteil-path" d="{path_data}" '
            f'data-name="Ravensburg" data-bezirk="Ravensburg" />'
        )
        idx += 1

    for ort in ("Eschach", "Schmalegg", "Taldorf"):
        for ring in relation_rings.get(ort, []):
            path_data = ring_to_path(ring, bounds, width, height)
            for wb in WOHNBEZIRKE:
                if wb["name"] == ort and wb.get("polygon", "").startswith("relation:"):
                    svg_paths.append(
                        f'<path id="stadtteil-{idx}" class="stadtteil-path" d="{path_data}" '
                        f'data-name="{wb["name"]}" data-bezirk="{wb["bezirk"]}" />'
                    )
                    idx += 1
                    break
            else:
                continue
            break

    circle_radius = max(14, min(width, height) * 0.028)
    for wb in WOHNBEZIRKE:
        if wb.get("polygon") == "city_base":
            continue
        if wb.get("polygon", "").startswith("relation:"):
            continue
        path_data = circle_path(wb["lon"], wb["lat"], circle_radius, bounds, width, height)
        svg_paths.append(
            f'<path id="stadtteil-{idx}" class="stadtteil-path" d="{path_data}" '
            f'data-name="{wb["name"]}" data-bezirk="{wb["bezirk"]}" />'
        )
        idx += 1

    db_entries = [
        {
            "name": wb["name"],
            "bezirk": wb["bezirk"],
            "area_km2": wb.get("area_km2", ""),
            "population": wb.get("population", ""),
        }
        for wb in WOHNBEZIRKE
    ]

    json_path = "src/data/ravensburg_wohnbezirke.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(db_entries, f, ensure_ascii=False, indent=2)
    print(f"  Saved {len(db_entries)} entries → {json_path}")

    js_path = "src/data/ravensburg_data.js"
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("const RAVENSBURG_DATA = ")
        json.dump(db_entries, f, ensure_ascii=False, indent=2)
        f.write(";\nwindow.RAVENSBURG_DATA = RAVENSBURG_DATA;\n")
    print(f"  Saved → {js_path}")

    svg_path = "src/data/ravensburg_map.svg"
    joined = "\n\t".join(svg_paths)
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" class="city-map-svg">
  <g class="stadtteile-group">
\t{joined}
  </g>
  <g id="map-labels-group" style="pointer-events: none;"></g>
</svg>'''
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"  Saved map → {svg_path}")
    print("Ravensburg assets generated successfully!")


if __name__ == "__main__":
    main()
