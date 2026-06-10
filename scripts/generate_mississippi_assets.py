#!/usr/bin/env python3
"""Generate Mississippi county map SVG and data for KiezQuiz."""

import json
import math
import os
import re
import urllib.request
from html import unescape

GEOJSON_URL = (
    "https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json"
)
WIKI_URL = "https://en.wikipedia.org/wiki/List_of_counties_in_Mississippi"
MS_STATE_FIPS = "28"


def clean_cell(cell: str) -> str:
    link = re.search(r"<a[^>]*>(.*?)</a>", cell)
    text = link.group(1) if link else cell
    text = unescape(re.sub(r"<.*?>", "", text).strip())
    return re.sub(r"\[\d+\]", "", text).strip()


def fetch_wiki_counties():
    req = urllib.request.Request(WIKI_URL, headers={"User-Agent": "KiezQuiz/1.0"})
    with urllib.request.urlopen(req) as r:
        html = r.read().decode("utf-8")
    tables = re.findall(r"<table.*?>(.*?)</table>", html, re.DOTALL)
    table = max(tables, key=lambda t: len(re.findall(r"<tr", t)))
    rows = re.findall(r"<tr.*?>(.*?)</tr>", table, re.DOTALL)
    wiki = {}
    for row in rows[1:]:
        cols = re.findall(r"<t[dh].*?>(.*?)</t[dh]>", row, re.DOTALL)
        if len(cols) < 5:
            continue
        name = clean_cell(cols[0])
        pop = clean_cell(cols[3]).replace(",", "")
        area = clean_cell(cols[4])
        if name:
            wiki[name] = {"population": pop, "area_km2": area}
    return wiki


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


def main():
    print("Generating Mississippi county assets...")
    os.makedirs("src/data", exist_ok=True)

    print(f"Downloading GeoJSON from {GEOJSON_URL}...")
    with urllib.request.urlopen(GEOJSON_URL) as response:
        geo_data = json.loads(response.read().decode())

    print(f"Downloading Wikipedia data from {WIKI_URL}...")
    wiki_data = fetch_wiki_counties()

    features = [
        f for f in geo_data["features"]
        if str(f.get("id", "")).startswith(MS_STATE_FIPS)
    ]
    features.sort(key=lambda f: f["properties"]["NAME"])
    print(f"Found {len(features)} Mississippi counties")

    lons, lats = [], []
    for f in features:
        collect_coords(f["geometry"]["coordinates"], lons, lats)

    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)
    lat_center = (min_lat + max_lat) / 2.0
    cos_lat = math.cos(math.radians(lat_center))
    lon_diff = max_lon - min_lon
    lat_diff = max_lat - min_lat

    height = 600
    width = int(round(height * (lon_diff * cos_lat) / lat_diff))
    print(f"Map viewBox: 0 0 {width} {height}")

    def project(lon, lat):
        x = (lon - min_lon) / lon_diff * width
        y = height - (lat - min_lat) / lat_diff * height
        return f"{x:.2f},{y:.2f}"

    svg_paths = []
    db_entries = []

    for idx, f in enumerate(features):
        name = f["properties"]["NAME"]
        geom = f["geometry"]
        path_data = coords_to_path(geom["coordinates"], geom["type"], project)
        wiki = wiki_data.get(name, {"population": "0", "area_km2": f["properties"].get("CENSUSAREA", "0")})
        pop = wiki["population"]
        if pop and pop.isdigit():
            pop = f"{int(pop):,}".replace(",", ".")
        area = wiki["area_km2"]
        area_str = str(area).replace(",", "").strip()
        if area_str and re.match(r"^[\d.]+$", area_str):
            area = f"{float(area_str):.1f}"
        elif not area_str:
            area = str(f["properties"].get("CENSUSAREA", "0"))

        db_entries.append({
            "name": name,
            "bezirk": name,
            "area_km2": area,
            "population": pop,
        })

        svg_paths.append(
            f'<path id="stadtteil-{idx}" class="stadtteil-path" d="{path_data}" '
            f'data-name="{name}" data-bezirk="{name}" />'
        )

    json_path = "src/data/mississippi_counties.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(db_entries, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(db_entries)} entries to {json_path}")

    js_path = "src/data/mississippi_data.js"
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("const MISSISSIPPI_DATA = ")
        json.dump(db_entries, f, ensure_ascii=False, indent=2)
        f.write(";\nwindow.MISSISSIPPI_DATA = MISSISSIPPI_DATA;\n")
    print(f"Saved JS data to {js_path}")

    progression = [{"name": e["name"], "xpNeeded": i * 30} for i, e in enumerate(db_entries)]
    prog_path = "src/data/mississippi_progression.js"
    with open(prog_path, "w", encoding="utf-8") as f:
        f.write("const MISSISSIPPI_COUNTIES_PROGRESSION = ")
        json.dump(progression, f, ensure_ascii=False, indent=2)
        f.write(";\nwindow.MISSISSIPPI_COUNTIES_PROGRESSION = MISSISSIPPI_COUNTIES_PROGRESSION;\n")
    print(f"Saved progression ({len(progression)} counties) to {prog_path}")

    svg_path = "src/data/mississippi_map.svg"
    joined = "\n\t".join(svg_paths)
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" class="city-map-svg">
  <g class="stadtteile-group">
\t{joined}
  </g>
  <g id="map-labels-group" style="pointer-events: none;"></g>
</svg>'''
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Saved map to {svg_path}")
    print("Mississippi assets generated successfully!")


if __name__ == "__main__":
    main()
