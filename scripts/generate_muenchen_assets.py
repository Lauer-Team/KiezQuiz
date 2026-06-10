#!/usr/bin/env python3
"""Generate München map/data from Landeshauptstadt München Open Data (dl-de-by-2.0)."""

import json
import math
import os
import urllib.request

GEO_URL = (
    "https://geoportal.muenchen.de/geoserver/gsm_wfs/ows?"
    "service=WFS&version=1.0.0&request=GetFeature&"
    "typeName=gsm_wfs:vablock_bezirksteil&outputFormat=application/json"
)

SB_NAMES = {
    "01": "Altstadt-Lehel",
    "02": "Ludwigsvorstadt-Isarvorstadt",
    "03": "Maxvorstadt",
    "04": "Schwabing-West",
    "05": "Au-Haidhausen",
    "06": "Sendling",
    "07": "Sendling-Westpark",
    "08": "Schwanthalerhöhe",
    "09": "Neuhausen-Nymphenburg",
    "10": "Moosach",
    "11": "Milbertshofen-Am Hart",
    "12": "Schwabing-Freimann",
    "13": "Bogenhausen",
    "14": "Berg am Laim",
    "15": "Trudering-Riem",
    "16": "Ramersdorf-Perlach",
    "17": "Obergiesing-Fasangarten",
    "18": "Untergiesing-Harlaching",
    "19": "Thalkirchen-Obersendling-Forstenried-Fürstenried-Solln",
    "20": "Hadern",
    "21": "Pasing-Obermenzing",
    "22": "Aubing-Lochhausen-Langwied",
    "23": "Allach-Untermenzing",
    "24": "Feldmoching-Hasenbergl",
    "25": "Laim",
}

# Unofficial but widely used Bezirksteil names (1996 proposal / local usage).
BT_NAMES = {
    "01.1": "Graggenauer Viertel",
    "01.2": "Angerviertel",
    "01.3": "Hackenviertel",
    "01.4": "Kreuzviertel",
    "01.5": "Lehel",
    "01.6": "Englischer Garten Süd",
    "02.1": "Wiesnviertel",
    "02.2": "Bahnhofsviertel",
    "02.3": "Klinikviertel",
    "02.4": "Schlachthofviertel",
    "02.5": "Dreimühlenviertel",
    "02.6": "Glockenbachviertel",
    "02.7": "Gärtnerplatzviertel",
    "02.8": "Isarvorstadt",
    "03.1": "Königsplatz",
    "03.2": "Augustenstraße",
    "03.3": "St. Benno",
    "03.4": "Marsfeld",
    "03.5": "Josephsplatz",
    "03.6": "Am alten nördlichen Friedhof",
    "03.7": "Universität",
    "03.8": "Schönfeldvorstadt",
    "03.9": "Maßmannbergl",
    "04.1": "Neuschwabing",
    "04.2": "Am Luitpoldpark",
    "04.3": "Schwere-Reiter-Straße",
    "05.1": "Untere Au",
    "05.2": "Obere Au",
    "05.3": "Untere Haidhausen",
    "05.4": "Obere Haidhausen",
    "05.5": "Gasteig",
    "05.6": "Nockherberg",
    "06.1": "Untersendling",
    "06.2": "Sendlinger Feld",
    "07.1": "Mittersendling",
    "07.2": "Land in Sonne",
    "07.3": "Am Waldfriedhof",
    "08.1": "Westend",
    "08.2": "Schwanthalerhöhe",
    "09.1": "Neuhausen",
    "09.2": "Nymphenburg",
    "09.3": "Gern",
    "09.4": "Oberwiesenfeld",
    "09.5": "Menzing",
    "09.6": "Blutenburg",
    "10.1": "Alt Moosach",
    "10.2": "Moosach-Bahnhof",
    "11.1": "Am Hart",
    "11.2": "Am Riesenfeld",
    "11.3": "Milbertshofen",
    "12.1": "Schwabing",
    "12.2": "Freimann",
    "12.3": "Parkstadt Schwabing",
    "12.4": "Münchner Freiheit",
    "12.5": "Kleinhesselohe",
    "12.6": "Studentenstadt",
    "12.7": "Fröttmaning",
    "12.8": "Nordfriedhof",
    "13.1": "Bogenhausen",
    "13.2": "Oberföhring",
    "13.3": "Johanneskirchen",
    "13.4": "Englschalking",
    "13.5": "Denning",
    "13.6": "Daglfing",
    "13.7": "Zamdorf",
    "14.1": "Echarding",
    "14.2": "Josephsburg",
    "14.3": "Berg am Laim Ost",
    "15.1": "Trudering",
    "15.2": "Messestadt Riem",
    "15.3": "Gartenstadt Trudering",
    "15.4": "Waldtrudering",
    "16.1": "Ramersdorf",
    "16.2": "Perlach",
    "16.3": "Neuperlach",
    "16.4": "Waldperlach",
    "16.5": "Altperlach",
    "17.1": "Obergiesing",
    "17.2": "Südgiesing",
    "18.1": "Untergiesing",
    "18.2": "Harlaching",
    "18.3": "Flaucher",
    "18.4": "Maria Einsiedel",
    "18.5": "Großhesselohe",
    "19.1": "Thalkirchen",
    "19.2": "Obersendling",
    "19.3": "Forstenried",
    "19.4": "Fürstenried",
    "19.5": "Solln",
    "20.1": "Großhadern",
    "20.2": "Hadern-Mitte",
    "20.3": "Pasinger Stadtpark",
    "21.1": "Neupasing",
    "21.2": "Am Westbad",
    "21.3": "Pasing",
    "21.4": "Obermenzing",
    "22.1": "Aubing",
    "22.2": "Freiham",
    "22.3": "Langwied",
    "22.4": "Lochhausen",
    "23.1": "Industriebezirk",
    "23.2": "Untermenzing-Allach",
    "24.1": "Feldmoching",
    "24.2": "Hasenbergl-Lerchenau Ost",
    "24.3": "Ludwigsfeld",
    "24.4": "Lerchenau West",
    "25.1": "Friedenheim",
    "25.2": "St. Ulrich",
}


def normalize_bt(bt_nummer):
    parts = bt_nummer.strip().split(".")
    if len(parts) != 2:
        return bt_nummer
    return f"{int(parts[0]):02d}.{int(parts[1])}"


def bezirk_name(bt_nummer):
    sb = bt_nummer.split(".")[0]
    return SB_NAMES.get(sb, f"Stadtbezirk {sb}")


def display_name(bt_nummer):
    return BT_NAMES.get(bt_nummer, bt_nummer)


def main():
    print("Starting data generation for München Bezirksteile...")
    os.makedirs("src/data", exist_ok=True)

    req = urllib.request.Request(
        GEO_URL,
        headers={"User-Agent": "KiezQuiz/1.0 (generate_muenchen_assets.py)"},
    )
    with urllib.request.urlopen(req) as response:
        geo_data = json.loads(response.read().decode())

    merged = {}
    for feature in geo_data["features"]:
        props = feature["properties"]
        bt = normalize_bt(props["bt_nummer"])
        area_qm = float(props.get("flaeche_qm") or 0)
        entry = merged.setdefault(
            bt,
            {"bt": bt, "area_qm": 0.0, "paths": [], "coords": []},
        )
        entry["area_qm"] += area_qm
        entry["coords"].append(feature["geometry"])

    items = sorted(merged.values(), key=lambda x: (int(x["bt"].split(".")[0]), int(x["bt"].split(".")[1])))

    xs = []
    ys = []

    def collect_coords(coords):
        if isinstance(coords[0], (int, float)):
            xs.append(coords[0])
            ys.append(coords[1])
        else:
            for c in coords:
                collect_coords(c)

    for item in items:
        for geom in item["coords"]:
            collect_coords(geom["coordinates"])

    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    x_diff = max_x - min_x
    y_diff = max_y - min_y

    height = 600
    width = int(round(height * x_diff / y_diff))
    print(f"Projected map viewBox dimensions: 0 0 {width} {height}")

    def project(x, y):
        px = (x - min_x) / x_diff * width
        py = height - (y - min_y) / y_diff * height
        return f"{px:.2f},{py:.2f}"

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

    for idx, item in enumerate(items):
        bt = item["bt"]
        name = display_name(bt)
        bezirk = bezirk_name(bt)
        area_km2 = f"{item['area_qm'] / 1_000_000:.4f}"

        path_data = " ".join(
            coords_to_path(geom["coordinates"], geom["type"]) for geom in item["coords"]
        )

        db_entries.append({
            "name": name,
            "bezirk": bezirk,
            "area_km2": area_km2,
            "population": "0",
        })

        svg_paths.append(
            f'<path id="stadtteil-{idx}" class="stadtteil-path" d="{path_data}" '
            f'data-name="{name}" data-bezirk="{bezirk}" />'
        )

    json_path = "src/data/muenchen_stadtteile.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(db_entries, f, ensure_ascii=False, indent=2)
    print(f"Successfully saved {len(db_entries)} entries to {json_path}")

    js_path = "src/data/muenchen_data.js"
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("const MUENCHEN_DATA = ")
        json.dump(db_entries, f, ensure_ascii=False, indent=2)
        f.write(";\nwindow.MUENCHEN_DATA = MUENCHEN_DATA;\n")
    print(f"Successfully saved {js_path}")

    svg_path = "src/data/muenchen_map.svg"
    joined_paths = "\n\t".join(svg_paths)
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" class="city-map-svg">
  <g class="stadtteile-group">
\t{joined_paths}
  </g>
  <g id="map-labels-group" style="pointer-events: none;"></g>
</svg>'''
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Successfully saved map SVG to {svg_path}")
    print("München assets generated successfully!")


if __name__ == "__main__":
    main()
