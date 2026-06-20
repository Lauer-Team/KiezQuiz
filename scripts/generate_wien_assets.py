#!/usr/bin/env python3
"""Generate Vienna Bezirk map SVG and data for KiezQuiz."""

import json
import math
import os
import re
import urllib.request
from html import unescape

GEOJSON_URL = (
    "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/vienna.geojson"
)
WIKI_URL = "https://de.wikipedia.org/wiki/Wien#Bezirke"

# Official Bezirk number by district name (GeoJSON uses Gemeindebezirksnamen)
BEZIRK_NUMBERS = {
    "Innere Stadt": "1",
    "Leopoldstadt": "2",
    "Landstraße": "3",
    "Wieden": "4",
    "Margareten": "5",
    "Mariahilf": "6",
    "Neubau": "7",
    "Josefstadt": "8",
    "Alsergrund": "9",
    "Favoriten": "10",
    "Simmering": "11",
    "Meidling": "12",
    "Hietzing": "13",
    "Penzing": "14",
    "Rudolfsheim-Fünfhaus": "15",
    "Ottakring": "16",
    "Hernals": "17",
    "Währing": "18",
    "Döbling": "19",
    "Brigittenau": "20",
    "Floridsdorf": "21",
    "Donaustadt": "22",
    "Liesing": "23",
}

# Approximate 2024 stats (Statistik Austria / Wikipedia, rounded)
WIKI_STATS = {
    "Innere Stadt": {"population": "16.500", "area_km2": "2,88"},
    "Leopoldstadt": {"population": "105.000", "area_km2": "19,27"},
    "Landstraße": {"population": "98.000", "area_km2": "7,42"},
    "Wieden": {"population": "32.000", "area_km2": "1,80"},
    "Margareten": {"population": "54.000", "area_km2": "2,06"},
    "Mariahilf": {"population": "31.000", "area_km2": "1,48"},
    "Neubau": {"population": "31.000", "area_km2": "1,61"},
    "Josefstadt": {"population": "24.000", "area_km2": "1,09"},
    "Alsergrund": {"population": "42.000", "area_km2": "2,99"},
    "Favoriten": {"population": "208.000", "area_km2": "31,80"},
    "Simmering": {"population": "105.000", "area_km2": "23,23"},
    "Meidling": {"population": "98.000", "area_km2": "8,16"},
    "Hietzing": {"population": "55.000", "area_km2": "37,70"},
    "Penzing": {"population": "99.000", "area_km2": "33,88"},
    "Rudolfsheim-Fünfhaus": {"population": "66.000", "area_km2": "1,80"},
    "Ottakring": {"population": "104.000", "area_km2": "5,66"},
    "Hernals": {"population": "61.000", "area_km2": "11,39"},
    "Währing": {"population": "51.000", "area_km2": "6,28"},
    "Döbling": {"population": "75.000", "area_km2": "24,90"},
    "Brigittenau": {"population": "87.000", "area_km2": "5,67"},
    "Floridsdorf": {"population": "165.000", "area_km2": "44,46"},
    "Donaustadt": {"population": "208.000", "area_km2": "44,36"},
    "Liesing": {"population": "112.000", "area_km2": "32,00"},
}


def collect_coords(coords, lons, lats):
    if isinstance(coords[0], (int, float)):
        lons.append(coords[0])
        lats.append(coords[1])
    else:
        for c in coords:
            collect_coords(c, lons, lats)


def coords_to_path(coords, geom_type, project):
    path_parts = []
    if geom_type == "Polygon":
        for ring in coords:
            pts = [project(p[0], p[1]) for p in ring]
            path_parts.append("M " + " L ".join(pts) + " Z")
    elif geom_type == "MultiPolygon":
        for poly in coords:
            for ring in poly:
                pts = [project(p[0], p[1]) for p in ring]
                path_parts.append("M " + " L ".join(pts) + " Z")
    return " ".join(path_parts)


def build_progression(names):
    step = 100
    return [{"name": n, "xpNeeded": i * step} for i, n in enumerate(names)]


def main():
    print("Generating Vienna Bezirk assets...")
    os.makedirs("src/data", exist_ok=True)

    print(f"Downloading GeoJSON from {GEOJSON_URL}...")
    with urllib.request.urlopen(GEOJSON_URL) as response:
        geo_data = json.loads(response.read().decode())

    lons, lats = [], []
    for f in geo_data["features"]:
        collect_coords(f["geometry"]["coordinates"], lons, lats)

    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)
    lat_center = (min_lat + max_lat) / 2.0
    cos_lat = math.cos(math.radians(lat_center))
    lon_diff = max_lon - min_lon
    lat_diff = max_lat - min_lat

    height = 600
    width = int(round(height * (lon_diff * cos_lat) / lat_diff))
    print(f"Projected map viewBox: 0 0 {width} {height}")

    def project(lon, lat):
        x = (lon - min_lon) / lon_diff * width
        y = height - (lat - min_lat) / lat_diff * height
        return f"{x:.2f},{y:.2f}"

    svg_paths = []
    db_entries = []

    features = sorted(
        geo_data["features"],
        key=lambda f: int(BEZIRK_NUMBERS.get(f["properties"]["name"], "99")),
    )

    for idx, f in enumerate(features):
        name = f["properties"]["name"]
        geom = f["geometry"]
        path_data = coords_to_path(geom["coordinates"], geom["type"], project)
        stats = WIKI_STATS.get(name, {"population": "0", "area_km2": "0"})
        num = BEZIRK_NUMBERS.get(name, "?")

        db_entries.append({
            "name": name,
            "bezirk": name,
            "bezirk_nr": num,
            "area_km2": stats["area_km2"],
            "population": stats["population"],
        })

        path_tag = (
            f'<path id="bezirk-{idx}" class="stadtteil-path" d="{path_data}" '
            f'data-name="{name}" data-bezirk="{name}" data-bezirk-nr="{num}" />'
        )
        svg_paths.append(path_tag)

    json_path = "src/data/wien_bezirke.json"
    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(db_entries, fh, ensure_ascii=False, indent=2)
    print(f"Saved {len(db_entries)} entries to {json_path}")

    js_path = "src/data/wien_data.js"
    with open(js_path, "w", encoding="utf-8") as fh:
        fh.write("const WIEN_DATA = ")
        json.dump(db_entries, fh, ensure_ascii=False, indent=2)
        fh.write(";\nwindow.WIEN_DATA = WIEN_DATA;\n")
    print(f"Saved {js_path}")

    progression = build_progression([e["name"] for e in db_entries])
    prog_path = "src/data/wien_progression.js"
    with open(prog_path, "w", encoding="utf-8") as fh:
        fh.write("const WIEN_BEZIRKE_PROGRESSION = ")
        json.dump(progression, fh, ensure_ascii=False, indent=2)
        fh.write(";\nwindow.WIEN_BEZIRKE_PROGRESSION = WIEN_BEZIRKE_PROGRESSION;\n")
    print(f"Saved {prog_path}")

    svg_path = "src/data/wien_map.svg"
    joined = "\n\t".join(svg_paths)
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" class="city-map-svg">
  <g class="stadtteile-group">
\t{joined}
  </g>
</svg>
'''
    with open(svg_path, "w", encoding="utf-8") as fh:
        fh.write(svg_content)
    print(f"Saved {svg_path}")


if __name__ == "__main__":
    main()
