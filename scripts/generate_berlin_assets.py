import urllib.request
import json
import math
import re
import os
from html import unescape

def main():
    print("Starting data generation for Berlin Ortsteile...")
    os.makedirs("src/data", exist_ok=True)

    url_geo = "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/berlin.geojson"
    print(f"Downloading GeoJSON from {url_geo}...")
    with urllib.request.urlopen(url_geo) as response:
        geo_data = json.loads(response.read().decode())

    url_wiki = "https://de.wikipedia.org/wiki/Liste_der_Ortsteile_Berlins"
    print(f"Downloading Wikipedia page from {url_wiki}...")
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
    req = urllib.request.Request(url_wiki, headers=headers)
    with urllib.request.urlopen(req) as r:
        html = r.read().decode("utf-8")

    tables = re.findall(r"<table.*?>(.*?)</table>", html, re.DOTALL)
    # Table 1 is the full Ortsteile list (Nr | Ortsteil | Bezirk | Fläche | Einwohner)
    table_content = max(tables, key=lambda t: len(re.findall(r"<tr.*?>", t, re.DOTALL)))
    rows = re.findall(r"<tr.*?>(.*?)</tr>", table_content, re.DOTALL)

    def clean_cell(cell):
        link = re.search(r"<a[^>]*>(.*?)</a>", cell)
        text = link.group(1) if link else cell
        return unescape(re.sub(r"<.*?>", "", text).strip())

    wiki_data = {}
    for row in rows[1:]:
        cols = re.findall(r"<td.*?>(.*?)</td>", row, re.DOTALL)
        if len(cols) >= 5:
            st_name = clean_cell(cols[1])
            bz_name = clean_cell(cols[2])
            area = clean_cell(cols[3])
            pop = clean_cell(cols[4])

            wiki_data[st_name] = {
                "bezirk": bz_name,
                "area_km2": area,
                "population": pop
            }

    name_corrections = {
        "Staaken": "Staaken",
        "Malchow": "Malchow",
    }

    lons = []
    lats = []

    def collect_coords(coords):
        if isinstance(coords[0], (int, float)):
            lons.append(coords[0])
            lats.append(coords[1])
        else:
            for c in coords:
                collect_coords(c)

    for f in geo_data["features"]:
        name = f["properties"]["name"]
        corrected_name = name_corrections.get(name, name)
        f["properties"]["name"] = corrected_name
        collect_coords(f["geometry"]["coordinates"])

    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)
    lat_center = (min_lat + max_lat) / 2.0
    cos_lat = math.cos(math.radians(lat_center))

    lon_diff = max_lon - min_lon
    lat_diff = max_lat - min_lat

    height = 600
    width = height * (lon_diff * cos_lat) / lat_diff
    width = int(round(width))
    height = int(height)

    print(f"Projected map viewBox dimensions: 0 0 {width} {height}")

    def project(lon, lat):
        x = (lon - min_lon) / lon_diff * width
        y = height - (lat - min_lat) / lat_diff * height
        return f"{x:.2f},{y:.2f}"

    def coords_to_path(coords, geom_type):
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

    svg_paths = []
    db_entries = []

    for idx, f in enumerate(geo_data["features"]):
        name = f["properties"]["name"]
        geom = f["geometry"]
        path_data = coords_to_path(geom["coordinates"], geom["type"])

        wiki_info = wiki_data.get(name, {"bezirk": "Unbekannt", "area_km2": "0", "population": "0"})
        bezirk = wiki_info["bezirk"]

        db_entries.append({
            "name": name,
            "bezirk": bezirk,
            "area_km2": wiki_info["area_km2"],
            "population": wiki_info["population"]
        })

        path_tag = f'<path id="ortsteil-{idx}" class="stadtteil-path" d="{path_data}" data-name="{name}" data-bezirk="{bezirk}" />'
        svg_paths.append(path_tag)

    if "Pfaueninsel" not in [d["name"] for d in db_entries]:
        wiki_pf = wiki_data.get("Wannsee", {})
        db_entries.append({
            "name": "Pfaueninsel",
            "bezirk": "Steglitz-Zehlendorf",
            "area_km2": "0,67",
            "population": "0",
            "is_island": True
        })

    json_path = "src/data/berlin_ortsteile.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(db_entries, f, ensure_ascii=False, indent=2)
    print(f"Successfully saved {len(db_entries)} entries to {json_path}")

    js_path = "src/data/berlin_data.js"
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("const BERLIN_DATA = ")
        json.dump(db_entries, f, ensure_ascii=False, indent=2)
        f.write(";\nwindow.BERLIN_DATA = BERLIN_DATA;\n")
    print(f"Successfully saved {js_path}")

    svg_path = "src/data/berlin_map.svg"
    joined_paths = "\n\t".join(svg_paths)
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" class="city-map-svg">
  <g class="stadtteile-group">
\t{joined_paths}
  </g>
</svg>'''
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Successfully saved map SVG to {svg_path}")
    print("Berlin assets generated successfully!")

if __name__ == "__main__":
    main()
