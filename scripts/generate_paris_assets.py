#!/usr/bin/env python3
"""Generate Paris arrondissement map SVG and data for KiezQuiz."""

import json
import math
import os
import urllib.request

GEOJSON_URL = (
    "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/paris.geojson"
)

# Historic quartier name → arrondissement number (Paris has 20 arrondissements)
QUARTIER_TO_ARR = {
    "Louvre": ("1", "1er arrondissement"),
    "Bourse": ("2", "2e arrondissement"),
    "Temple": ("3", "3e arrondissement"),
    "Hôtel-de-Ville": ("4", "4e arrondissement"),
    "Panthéon": ("5", "5e arrondissement"),
    "Luxembourg": ("6", "6e arrondissement"),
    "Palais-Bourbon": ("7", "7e arrondissement"),
    "Élysée": ("8", "8e arrondissement"),
    "Opéra": ("9", "9e arrondissement"),
    "Enclos-St-Laurent": ("10", "10e arrondissement"),
    "Popincourt": ("11", "11e arrondissement"),
    "Reuilly": ("12", "12e arrondissement"),
    "Gobelins": ("13", "13e arrondissement"),
    "Observatoire": ("14", "14e arrondissement"),
    "Vaugirard": ("15", "15e arrondissement"),
    "Passy": ("16", "16e arrondissement"),
    "Batignolles-Monceau": ("17", "17e arrondissement"),
    "Butte-Montmartre": ("18", "18e arrondissement"),
    "Buttes-Chaumont": ("19", "19e arrondissement"),
    "Ménilmontant": ("20", "20e arrondissement"),
}

# Approximate population / area (INSEE / Wikipedia, rounded)
ARR_STATS = {
    "1": {"population": "15.000", "area_km2": "1,83"},
    "2": {"population": "21.000", "area_km2": "0,99"},
    "3": {"population": "34.000", "area_km2": "1,17"},
    "4": {"population": "28.000", "area_km2": "1,60"},
    "5": {"population": "58.000", "area_km2": "2,54"},
    "6": {"population": "41.000", "area_km2": "2,15"},
    "7": {"population": "51.000", "area_km2": "4,09"},
    "8": {"population": "36.000", "area_km2": "3,88"},
    "9": {"population": "59.000", "area_km2": "2,18"},
    "10": {"population": "86.000", "area_km2": "2,89"},
    "11": {"population": "144.000", "area_km2": "3,67"},
    "12": {"population": "140.000", "area_km2": "16,32"},
    "13": {"population": "182.000", "area_km2": "7,15"},
    "14": {"population": "136.000", "area_km2": "5,62"},
    "15": {"population": "232.000", "area_km2": "8,50"},
    "16": {"population": "166.000", "area_km2": "16,30"},
    "17": {"population": "167.000", "area_km2": "5,67"},
    "18": {"population": "195.000", "area_km2": "6,01"},
    "19": {"population": "187.000", "area_km2": "6,79"},
    "20": {"population": "195.000", "area_km2": "5,59"},
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
    print("Generating Paris arrondissement assets...")
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
        key=lambda f: int(QUARTIER_TO_ARR.get(f["properties"]["name"], ("99", ""))[0]),
    )

    for idx, f in enumerate(features):
        quartier = f["properties"]["name"]
        arr_num, display_name = QUARTIER_TO_ARR.get(quartier, ("?", quartier))
        geom = f["geometry"]
        path_data = coords_to_path(geom["coordinates"], geom["type"], project)
        stats = ARR_STATS.get(arr_num, {"population": "0", "area_km2": "0"})

        db_entries.append({
            "name": display_name,
            "bezirk": display_name,
            "quartier": quartier,
            "arrondissement": arr_num,
            "area_km2": stats["area_km2"],
            "population": stats["population"],
        })

        path_tag = (
            f'<path id="arrondissement-{idx}" class="stadtteil-path" d="{path_data}" '
            f'data-name="{display_name}" data-bezirk="{display_name}" '
            f'data-quartier="{quartier}" data-arrondissement="{arr_num}" />'
        )
        svg_paths.append(path_tag)

    json_path = "src/data/paris_arrondissements.json"
    with open(json_path, "w", encoding="utf-8") as fh:
        json.dump(db_entries, fh, ensure_ascii=False, indent=2)
    print(f"Saved {len(db_entries)} entries to {json_path}")

    js_path = "src/data/paris_data.js"
    with open(js_path, "w", encoding="utf-8") as fh:
        fh.write("const PARIS_DATA = ")
        json.dump(db_entries, fh, ensure_ascii=False, indent=2)
        fh.write(";\nwindow.PARIS_DATA = PARIS_DATA;\n")
    print(f"Saved {js_path}")

    progression = build_progression([e["name"] for e in db_entries])
    prog_path = "src/data/paris_progression.js"
    with open(prog_path, "w", encoding="utf-8") as fh:
        fh.write("const PARIS_ARRONDISSEMENTS_PROGRESSION = ")
        json.dump(progression, fh, ensure_ascii=False, indent=2)
        fh.write(";\nwindow.PARIS_ARRONDISSEMENTS_PROGRESSION = PARIS_ARRONDISSEMENTS_PROGRESSION;\n")
    print(f"Saved {prog_path}")

    svg_path = "src/data/paris_map.svg"
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
