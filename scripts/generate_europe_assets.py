#!/usr/bin/env python3
"""Generate Europe country map SVG and capital data for KiezQuiz."""

import json
import math
import os
import urllib.request

# Curated European sovereign states (ISO 3166-1 alpha-2)
EUROPE_COUNTRIES = [
    {"iso": "DE", "name": "Deutschland", "capital": "Berlin", "population": "83.420.000", "area_km2": "357.588",
     "eu_member": True, "eu_founding": True, "xpNeeded": 0},
    {"iso": "AT", "name": "Österreich", "capital": "Wien", "population": "9.159.000", "area_km2": "83.879",
     "eu_member": True, "eu_founding": False, "xpNeeded": 50},
    {"iso": "CH", "name": "Schweiz", "capital": "Bern", "population": "8.796.000", "area_km2": "41.285",
     "eu_member": False, "eu_founding": False, "xpNeeded": 100},
    {"iso": "FR", "name": "Frankreich", "capital": "Paris", "population": "68.042.000", "area_km2": "643.801",
     "eu_member": True, "eu_founding": True, "xpNeeded": 150},
    {"iso": "BE", "name": "Belgien", "capital": "Brüssel", "population": "11.763.000", "area_km2": "30.528",
     "eu_member": True, "eu_founding": True, "xpNeeded": 200},
    {"iso": "NL", "name": "Niederlande", "capital": "Amsterdam", "population": "17.811.000", "area_km2": "41.543",
     "eu_member": True, "eu_founding": True, "xpNeeded": 250},
    {"iso": "LU", "name": "Luxemburg", "capital": "Luxemburg", "population": "672.000", "area_km2": "2.586",
     "eu_member": True, "eu_founding": True, "xpNeeded": 300},
    {"iso": "IT", "name": "Italien", "capital": "Rom", "population": "58.983.000", "area_km2": "301.340",
     "eu_member": True, "eu_founding": True, "xpNeeded": 350},
    {"iso": "ES", "name": "Spanien", "capital": "Madrid", "population": "48.196.000", "area_km2": "505.990",
     "eu_member": True, "eu_founding": False, "xpNeeded": 400},
    {"iso": "PT", "name": "Portugal", "capital": "Lissabon", "population": "10.467.000", "area_km2": "92.212",
     "eu_member": True, "eu_founding": False, "xpNeeded": 450},
    {"iso": "GB", "name": "Vereinigtes Königreich", "capital": "London", "population": "67.736.000", "area_km2": "243.610",
     "eu_member": False, "eu_founding": False, "xpNeeded": 500},
    {"iso": "IE", "name": "Irland", "capital": "Dublin", "population": "5.192.000", "area_km2": "70.273",
     "eu_member": True, "eu_founding": False, "xpNeeded": 550},
    {"iso": "DK", "name": "Dänemark", "capital": "Kopenhagen", "population": "5.945.000", "area_km2": "42.933",
     "eu_member": True, "eu_founding": False, "xpNeeded": 600},
    {"iso": "SE", "name": "Schweden", "capital": "Stockholm", "population": "10.587.000", "area_km2": "447.425",
     "eu_member": True, "eu_founding": False, "xpNeeded": 650},
    {"iso": "NO", "name": "Norwegen", "capital": "Oslo", "population": "5.514.000", "area_km2": "385.207",
     "eu_member": False, "eu_founding": False, "xpNeeded": 700},
    {"iso": "FI", "name": "Finnland", "capital": "Helsinki", "population": "5.603.000", "area_km2": "338.455",
     "eu_member": True, "eu_founding": False, "xpNeeded": 750},
    {"iso": "IS", "name": "Island", "capital": "Reykjavík", "population": "387.000", "area_km2": "103.000",
     "eu_member": False, "eu_founding": False, "xpNeeded": 800},
    {"iso": "PL", "name": "Polen", "capital": "Warschau", "population": "36.755.000", "area_km2": "312.696",
     "eu_member": True, "eu_founding": False, "xpNeeded": 850},
    {"iso": "CZ", "name": "Tschechien", "capital": "Prag", "population": "10.827.000", "area_km2": "78.871",
     "eu_member": True, "eu_founding": False, "xpNeeded": 900},
    {"iso": "SK", "name": "Slowakei", "capital": "Bratislava", "population": "5.428.000", "area_km2": "49.035",
     "eu_member": True, "eu_founding": False, "xpNeeded": 950},
    {"iso": "HU", "name": "Ungarn", "capital": "Budapest", "population": "9.597.000", "area_km2": "93.028",
     "eu_member": True, "eu_founding": False, "xpNeeded": 1000},
    {"iso": "RO", "name": "Rumänien", "capital": "Bukarest", "population": "19.069.000", "area_km2": "238.391",
     "eu_member": True, "eu_founding": False, "xpNeeded": 1050},
    {"iso": "BG", "name": "Bulgarien", "capital": "Sofia", "population": "6.838.000", "area_km2": "110.994",
     "eu_member": True, "eu_founding": False, "xpNeeded": 1100},
    {"iso": "GR", "name": "Griechenland", "capital": "Athen", "population": "10.388.000", "area_km2": "131.957",
     "eu_member": True, "eu_founding": False, "xpNeeded": 1150},
    {"iso": "HR", "name": "Kroatien", "capital": "Zagreb", "population": "3.871.000", "area_km2": "56.594",
     "eu_member": True, "eu_founding": False, "xpNeeded": 1200},
    {"iso": "SI", "name": "Slowenien", "capital": "Ljubljana", "population": "2.108.000", "area_km2": "20.273",
     "eu_member": True, "eu_founding": False, "xpNeeded": 1250},
    {"iso": "RS", "name": "Serbien", "capital": "Belgrad", "population": "6.690.000", "area_km2": "88.361",
     "eu_member": False, "eu_founding": False, "xpNeeded": 1300},
    {"iso": "BA", "name": "Bosnien und Herzegowina", "capital": "Sarajevo", "population": "3.210.000", "area_km2": "51.197",
     "eu_member": False, "eu_founding": False, "xpNeeded": 1350},
    {"iso": "ME", "name": "Montenegro", "capital": "Podgorica", "population": "619.000", "area_km2": "13.812",
     "eu_member": False, "eu_founding": False, "xpNeeded": 1400},
    {"iso": "AL", "name": "Albanien", "capital": "Tirana", "population": "2.793.000", "area_km2": "28.748",
     "eu_member": False, "eu_founding": False, "xpNeeded": 1450},
    {"iso": "MK", "name": "Nordmazedonien", "capital": "Skopje", "population": "1.836.000", "area_km2": "25.713",
     "eu_member": False, "eu_founding": False, "xpNeeded": 1500},
    {"iso": "UA", "name": "Ukraine", "capital": "Kiew", "population": "37.000.000", "area_km2": "603.628",
     "eu_member": False, "eu_founding": False, "xpNeeded": 1550},
    {"iso": "BY", "name": "Belarus", "capital": "Minsk", "population": "9.110.000", "area_km2": "207.600",
     "eu_member": False, "eu_founding": False, "xpNeeded": 1600},
    {"iso": "MD", "name": "Moldawien", "capital": "Kischinau", "population": "2.512.000", "area_km2": "33.846",
     "eu_member": False, "eu_founding": False, "xpNeeded": 1650},
    {"iso": "LT", "name": "Litauen", "capital": "Vilnius", "population": "2.795.000", "area_km2": "65.300",
     "eu_member": True, "eu_founding": False, "xpNeeded": 1700},
    {"iso": "LV", "name": "Lettland", "capital": "Riga", "population": "1.875.000", "area_km2": "64.589",
     "eu_member": True, "eu_founding": False, "xpNeeded": 1750},
    {"iso": "EE", "name": "Estland", "capital": "Tallinn", "population": "1.331.000", "area_km2": "45.228",
     "eu_member": True, "eu_founding": False, "xpNeeded": 1800},
    {"iso": "CY", "name": "Zypern", "capital": "Nikosia", "population": "1.266.000", "area_km2": "9.251",
     "eu_member": True, "eu_founding": False, "xpNeeded": 1850},
    {"iso": "MT", "name": "Malta", "capital": "Valletta", "population": "542.000", "area_km2": "316",
     "eu_member": True, "eu_founding": False, "xpNeeded": 1900},
    {"iso": "AD", "name": "Andorra", "capital": "Andorra la Vella", "population": "81.000", "area_km2": "468",
     "eu_member": False, "eu_founding": False, "xpNeeded": 1950},
    {"iso": "MC", "name": "Monaco", "capital": "Monaco", "population": "39.000", "area_km2": "2,02",
     "eu_member": False, "eu_founding": False, "xpNeeded": 2000},
    {"iso": "SM", "name": "San Marino", "capital": "San Marino", "population": "34.000", "area_km2": "61",
     "eu_member": False, "eu_founding": False, "xpNeeded": 2050},
    {"iso": "LI", "name": "Liechtenstein", "capital": "Vaduz", "population": "39.000", "area_km2": "160",
     "eu_member": False, "eu_founding": False, "xpNeeded": 2100},
    {"iso": "VA", "name": "Vatikanstadt", "capital": "Vatikanstadt", "population": "764", "area_km2": "0,49",
     "eu_member": False, "eu_founding": False, "xpNeeded": 2150},
]

GEOJSON_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/"
    "geojson/ne_50m_admin_0_countries.geojson"
)

# Natural Earth ADM0_A3 → ISO2 fallback (when ISO_A2 is -99)
ADM3_TO_ISO2 = {
    "NOR": "NO", "GBR": "GB", "VAT": "VA", "MCO": "MC", "SMR": "SM",
    "LIE": "LI", "AND": "AD", "MKD": "MK", "MNE": "ME", "SRB": "RS",
    "BIH": "BA", "ALB": "AL", "MDA": "MD", "BLR": "BY", "UKR": "UA",
}

# Mainland Europe view — distant overseas polygons are Easter eggs instead
MAP_BOUNDS = {"lon": (-25, 45), "lat": (35, 72)}

EUROPE_ISLAND_EGGS = [
    {
        "id": "canary_islands",
        "name": "Kanarische Inseln",
        "country": "Spanien",
        "iso": "ES",
        "population": "2.207.000",
        "area_km2": "7.447",
        "trivia": "Sieben Inseln vor der Westküste Afrikas — Teneriffa ist mit dem Teide der höchste Berg Spaniens.",
    },
    {
        "id": "azores_madeira",
        "name": "Azoren & Madeira",
        "country": "Portugal",
        "iso": "PT",
        "population": "505.000",
        "area_km2": "4.007",
        "trivia": "Vulkanische Inseln mitten im Atlantik — Madeira ist berühmt für seinen Wein und den Neujahrsspringermarkt.",
    },
    {
        "id": "caribbean_nl",
        "name": "Karibische Niederlande",
        "country": "Niederlande",
        "iso": "NL",
        "population": "27.000",
        "area_km2": "328",
        "trivia": "Bonaire, Sint Eustatius und Saba in der Karibik — Tauchen und Korallenriffe statt Tulpen und Deiche.",
    },
    {
        "id": "french_overseas",
        "name": "Französische Überseegebiete",
        "country": "Frankreich",
        "iso": "FR",
        "population": "2.900.000",
        "area_km2": "120.000",
        "trivia": "Von Guadeloupe bis Réunion: Frankreichs Departements jenseits des Festlands — manchmal näher an Afrika oder Amerika als an Paris.",
    },
    {
        "id": "svalbard",
        "name": "Spitzbergen",
        "country": "Norwegen",
        "iso": "NO",
        "population": "2.500",
        "area_km2": "61.022",
        "trivia": "Arktische Inselgruppe bei 78° Nord — Eisbären, Polarnacht und der Global Seed Vault in Longyearbyen.",
    },
]


def ring_centroid(ring):
    lons = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    return sum(lons) / len(lons), sum(lats) / len(lats)


def ring_area(ring):
    area = 0.0
    for i in range(len(ring)):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % len(ring)]
        area += x1 * y2 - x2 * y1
    return abs(area) / 2.0


def ring_in_map_bounds(ring):
    lon, lat = ring_centroid(ring)
    return MAP_BOUNDS["lon"][0] <= lon <= MAP_BOUNDS["lon"][1] and MAP_BOUNDS["lat"][0] <= lat <= MAP_BOUNDS["lat"][1]


def iter_rings(coords, geom_type):
    if geom_type == "Polygon":
        yield coords[0]
    elif geom_type == "MultiPolygon":
        for poly in coords:
            yield poly[0]


def filter_geometry(coords, geom_type):
    rings = list(iter_rings(coords, geom_type))
    if not rings:
        return coords, geom_type, 0

    mainland = max(rings, key=ring_area)
    kept = [ring for ring in rings if ring_in_map_bounds(ring)]
    if not kept and mainland:
        kept = [mainland]

    excluded = len(rings) - len(kept)
    if geom_type == "Polygon":
        return [kept[0]], "Polygon", excluded
    return [[ring] for ring in kept], "MultiPolygon", excluded


def main():
    print("Generating Europe assets...")
    os.makedirs("src/data", exist_ok=True)

    by_iso = {c["iso"]: c for c in EUROPE_COUNTRIES}
    iso_set = set(by_iso.keys())

    print(f"Downloading GeoJSON from {GEOJSON_URL}...")
    with urllib.request.urlopen(GEOJSON_URL) as response:
        geo_data = json.loads(response.read().decode())

    features_by_iso = {}
    for f in geo_data["features"]:
        props = f["properties"]
        candidates = [
            props.get("ISO_A2_EH"),
            props.get("ISO_A2"),
            props.get("WB_A2"),
        ]
        iso = ""
        for c in candidates:
            if c and c not in ("-99",):
                iso = c
                break
        if not iso:
            adm3 = props.get("ADM0_A3") or ""
            iso = ADM3_TO_ISO2.get(adm3, "")
        if iso in iso_set and iso not in features_by_iso:
            features_by_iso[iso] = f

    missing = iso_set - set(features_by_iso.keys())
    if missing:
        print(f"Warning: no geometry for ISO codes: {sorted(missing)}")

    lons, lats = [], []

    def collect_coords(coords):
        if isinstance(coords[0], (int, float)):
            lons.append(coords[0])
            lats.append(coords[1])
        else:
            for c in coords:
                collect_coords(c)

    excluded_polygons = 0
    for iso, f in features_by_iso.items():
        filtered_coords, filtered_type, excluded = filter_geometry(
            f["geometry"]["coordinates"], f["geometry"]["type"]
        )
        f = {
            **f,
            "geometry": {"type": filtered_type, "coordinates": filtered_coords},
        }
        features_by_iso[iso] = f
        excluded_polygons += excluded
        collect_coords(filtered_coords)

    if excluded_polygons:
        print(f"Filtered out {excluded_polygons} distant island polygons (Easter eggs)")

    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)
    lat_center = (min_lat + max_lat) / 2.0
    cos_lat = math.cos(math.radians(lat_center))

    lon_diff = max_lon - min_lon
    lat_diff = max_lat - min_lat
    height = 700
    width = height * (lon_diff * cos_lat) / lat_diff
    width = int(round(width))
    height = int(height)
    print(f"Map viewBox: 0 0 {width} {height}")

    def project(lon, lat):
        x = (lon - min_lon) / lon_diff * width
        y = height - (lat - min_lat) / lat_diff * height
        return f"{x:.2f},{y:.2f}"

    def coords_to_path(coords, geom_type):
        parts = []
        if geom_type == "Polygon":
            for ring in coords:
                pts = [project(p[0], p[1]) for p in ring]
                parts.append("M " + " L ".join(pts) + " Z")
        elif geom_type == "MultiPolygon":
            for poly in coords:
                for ring in poly:
                    pts = [project(p[0], p[1]) for p in ring]
                    parts.append("M " + " L ".join(pts) + " Z")
        return " ".join(parts)

    svg_paths = []
    db_entries = []
    meta_entries = []

    for idx, country in enumerate(EUROPE_COUNTRIES):
        iso = country["iso"]
        f = features_by_iso.get(iso)
        if not f:
            continue

        geom = f["geometry"]
        path_data = coords_to_path(geom["coordinates"], geom["type"])
        country_name = country["name"]
        capital = country["capital"]

        db_entries.append({
            "name": capital,
            "bezirk": country_name,
            "area_km2": country["area_km2"],
            "population": country["population"],
            "iso": iso,
            "eu_member": country["eu_member"],
            "eu_founding": country["eu_founding"],
        })

        meta_entries.append({
            "name": country_name,
            "capital": capital,
            "iso": iso,
            "xpNeeded": country["xpNeeded"],
            "eu_member": country["eu_member"],
            "eu_founding": country["eu_founding"],
        })

        path_tag = (
            f'<path id="country-{idx}" class="stadtteil-path" d="{path_data}" '
            f'data-name="{capital}" data-bezirk="{country_name}" data-iso="{iso}" />'
        )
        svg_paths.append(path_tag)

    js_path = "src/data/europe_data.js"
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("const EUROPE_DATA = ")
        json.dump(db_entries, f, ensure_ascii=False, indent=2)
        f.write(";\nwindow.EUROPE_DATA = EUROPE_DATA;\n")
    print(f"Saved {len(db_entries)} entries to {js_path}")

    meta_path = "src/data/europe_meta.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta_entries, f, ensure_ascii=False, indent=2)
    print(f"Saved meta to {meta_path}")

    svg_path = "src/data/europe_map.svg"
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

    islands_path = "src/data/europe_islands.js"
    with open(islands_path, "w", encoding="utf-8") as f:
        f.write("const EUROPE_ISLAND_EGGS = ")
        json.dump(EUROPE_ISLAND_EGGS, f, ensure_ascii=False, indent=2)
        f.write(";\nwindow.EUROPE_ISLAND_EGGS = EUROPE_ISLAND_EGGS;\n")
    print(f"Saved {len(EUROPE_ISLAND_EGGS)} island Easter eggs to {islands_path}")
    print("Europe assets generated successfully!")


if __name__ == "__main__":
    main()
