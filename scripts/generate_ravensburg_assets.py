#!/usr/bin/env python3
"""Generate Ravensburg map SVG and quiz data from OpenStreetMap (ODbL).

Level 1 (Ortschaften): Ravensburg, Eschach, Schmalegg, Taldorf
Level 2 (Wohnbezirke): official Wohnbezirke per Hauptsatzung der Stadt Ravensburg

Note: OSM relation 2808301 is the whole municipality (admin_level 8). The Ravensburg
Ortschaft has no separate relation — it is derived by excluding the three outer
Ortschaften (Eschach, Schmalegg, Taldorf) from the municipality rings.
"""

import json
import math
import os
import time
import urllib.error
import urllib.parse
import urllib.request

OVERPASS = "https://overpass-api.de/api/interpreter"
MUNICIPALITY_ID = 2808301

ORTSCHAFT_RELATIONS = {
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
    {"name": "Schmalegg", "bezirk": "Schmalegg", "lat": 47.7910, "lon": 9.5420, "population": "2.150", "area_km2": "8,0 km²", "polygon": "ortschaft"},
    {"name": "Oberzell", "bezirk": "Taldorf", "lat": 47.7280, "lon": 9.5190, "population": "1.400", "area_km2": "6,0 km²", "polygon": "circle"},
    {"name": "Bavendorf", "bezirk": "Taldorf", "lat": 47.7420, "lon": 9.5040, "population": "1.600", "area_km2": "7,0 km²", "polygon": "circle"},
    {"name": "Taldorf", "bezirk": "Taldorf", "lat": 47.7510, "lon": 9.5280, "population": "900", "area_km2": "3,0 km²", "polygon": "circle"},
    {"name": "Adelsreute", "bezirk": "Taldorf", "lat": 47.7180, "lon": 9.4950, "population": "700", "area_km2": "4,0 km²", "polygon": "circle"},
]


def overpass(query: str, retries: int = 3) -> dict:
    data = urllib.parse.urlencode({"data": query}).encode()
    last_error: Exception | None = None
    for attempt in range(retries):
        req = urllib.request.Request(
            OVERPASS,
            data=data,
            headers={"User-Agent": "KiezQuiz/1.0 (https://kiezquiz.de)"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return json.load(resp)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            wait = 3 * (attempt + 1)
            print(f"    Overpass retry in {wait}s ({exc})…")
            time.sleep(wait)
    raise RuntimeError(f"Overpass failed after {retries} attempts: {last_error}")


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


def ring_centroid(ring: list[tuple[float, float]]) -> tuple[float, float]:
    lons = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    return sum(lons) / len(lons), sum(lats) / len(lats)


def point_in_ring(lon: float, lat: float, ring: list[tuple[float, float]]) -> bool:
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if ((yi > lat) != (yj > lat)) and (
            lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-15) + xi
        ):
            inside = not inside
        j = i
    return inside


def ring_key(ring: list[tuple[float, float]], precision: int = 5) -> tuple[tuple[float, float], ...]:
    """Stable identity for deduplicating identical OSM outer rings."""
    return tuple((round(lon, precision), round(lat, precision)) for lon, lat in ring)


def ring_in_other_ortschaft(
    ring: list[tuple[float, float]],
    other_rings: dict[str, list[list[tuple[float, float]]]],
) -> str | None:
    cx, cy = ring_centroid(ring)
    for ort, rings in other_rings.items():
        for other in rings:
            if point_in_ring(cx, cy, other):
                return ort
    return None


def assign_ortschaft_rings(
    municipality_rings: list[list[tuple[float, float]]],
    ortschaft_rings: dict[str, list[list[tuple[float, float]]]],
) -> dict[str, list[list[tuple[float, float]]]]:
    """Assign each outer ring exactly once to Ravensburg or an outer Ortschaft.

    OSM shares boundary rings across relations; the old approach drew municipality
    leftovers as Ravensburg *and* appended all Ortschaft rings → double shapes.
    """
    assigned: dict[str, list[list[tuple[float, float]]]] = {
        "Ravensburg": [],
        "Eschach": [],
        "Schmalegg": [],
        "Taldorf": [],
    }
    seen: set[tuple[tuple[float, float], ...]] = set()

    def claim(ring: list[tuple[float, float]], ort: str) -> None:
        key = ring_key(ring)
        if key in seen:
            return
        assigned[ort].append(ring)
        seen.add(key)

    # Outer Ortschaften first (canonical polygons from admin_level 9 relations).
    for ort in ORTSCHAFT_RELATIONS:
        for ring in ortschaft_rings[ort]:
            owner = ring_in_other_ortschaft(ring, ortschaft_rings)
            claim(ring, owner or ort)

    # Remaining municipality rings = Ravensburg core (holes, enclaves, Veitsburg, …).
    for ring in municipality_rings:
        key = ring_key(ring)
        if key in seen:
            continue
        owner = ring_in_other_ortschaft(ring, ortschaft_rings)
        claim(ring, owner or "Ravensburg")

    return assigned


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


def append_polygon_paths(
    svg_paths: list[str],
    idx: int,
    rings: list[list[tuple[float, float]]],
    data_name: str,
    data_bezirk: str,
    bounds,
    width: int,
    height: int,
) -> int:
    for ring in rings:
        path_data = ring_to_path(ring, bounds, width, height)
        svg_paths.append(
            f'<path id="stadtteil-{idx}" class="stadtteil-path" d="{path_data}" '
            f'data-name="{data_name}" data-bezirk="{data_bezirk}" />'
        )
        idx += 1
    return idx


def main() -> None:
    print("Generating Ravensburg assets from OpenStreetMap…")
    os.makedirs("src/data", exist_ok=True)

    ortschaft_rings: dict[str, list[list[tuple[float, float]]]] = {}
    for name, rel_id in ORTSCHAFT_RELATIONS.items():
        print(f"  Fetching Ortschaft {name} (relation {rel_id})…")
        time.sleep(2)
        ortschaft_rings[name] = fetch_relation_geom(rel_id)
        print(f"    → {len(ortschaft_rings[name])} ring(s)")

    print(f"  Fetching municipality (relation {MUNICIPALITY_ID})…")
    time.sleep(2)
    municipality_rings = fetch_relation_geom(MUNICIPALITY_ID)
    print(f"    → {len(municipality_rings)} ring(s)")

    assigned = assign_ortschaft_rings(municipality_rings, ortschaft_rings)
    for ort in ("Ravensburg", "Eschach", "Schmalegg", "Taldorf"):
        print(f"  {ort}: {len(assigned[ort])} ring(s)")

    all_rings = [ring for rings in assigned.values() for ring in rings]
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

    for ort in ("Ravensburg", "Eschach", "Schmalegg", "Taldorf"):
        idx = append_polygon_paths(
            svg_paths, idx, assigned[ort], ort, ort, bounds, width, height
        )

    circle_radius = max(14, min(width, height) * 0.028)
    for wb in WOHNBEZIRKE:
        polygon = wb.get("polygon", "circle")
        if polygon in ("city_base", "ortschaft"):
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
    print(f"  Saved map → {svg_path} ({idx} paths)")
    print("Ravensburg assets generated successfully!")


if __name__ == "__main__":
    main()
