#!/usr/bin/env python3
"""Generate city app entry pages: full app shell from index.html + per-city SEO head."""

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = "https://kiezquiz.de"
SLOGAN = "Besser wissen als Besserwissen."
HEAD_TEMPLATE = ROOT / "hamburg" / "index.html"

CITIES = {
    "hamburg": {
        "slug": "hamburg",
        "name": "Hamburg",
        "meta_description": (
            "Lerne alle 104 Hamburger Stadtteile und 7 Bezirke spielerisch auf der Karte. "
            "Kostenlos, ohne Anmeldung, mit XP, Streaks und Trivia — mobil und offline."
        ),
        "h1": "Hamburg Stadtteile und Bezirke spielerisch lernen",
        "faq": [
            (
                "Wie viele Stadtteile hat Hamburg?",
                "Hamburg ist in 7 Bezirke und 104 Stadtteile unterteilt. KiezQuiz deckt alle offiziellen Stadtteile ab.",
            ),
            (
                "Ist KiezQuiz kostenlos?",
                "Ja — KiezQuiz ist komplett kostenlos, ohne Werbung und ohne Pflicht-Registrierung.",
            ),
            (
                "Funktioniert das Quiz auf dem Handy?",
                "Ja. Die Karte unterstützt Touch-Gesten zum Zoomen und Verschieben und kann als App installiert werden.",
            ),
        ],
    },
    "berlin": {
        "slug": "berlin",
        "name": "Berlin",
        "meta_description": (
            "Lerne alle 97 Berliner Ortsteile und 12 Bezirke spielerisch auf der Karte. "
            "Kostenlos, ohne Anmeldung, mit XP, Streaks und Trivia — mobil und offline."
        ),
        "h1": "Berlin Ortsteile und Bezirke spielerisch lernen",
        "faq": [
            (
                "Wie viele Ortsteile hat Berlin?",
                "Berlin hat 12 Bezirke mit insgesamt 97 Ortsteilen. KiezQuiz bildet alle ab.",
            ),
            (
                "Was ist der Unterschied zwischen Bezirk und Ortsteil in Berlin?",
                "Bezirke sind die großen Verwaltungseinheiten (z. B. Neukölln); Ortsteile sind die kleineren Stadtteile darin (z. B. Britz, Buckow).",
            ),
            (
                "Kostet KiezQuiz etwas?",
                "Nein. Das Quiz ist kostenlos und ohne Werbung nutzbar.",
            ),
        ],
    },
    "frankfurt": {
        "slug": "frankfurt",
        "name": "Frankfurt am Main",
        "meta_description": (
            "Lerne alle 46 Frankfurter Stadtteile und 16 Ortsbezirke spielerisch auf der Karte. "
            "Kostenlos, ohne Anmeldung, mit XP, Streaks und Trivia — mobil und offline."
        ),
        "h1": "Frankfurt Stadtteile und Ortsbezirke spielerisch lernen",
        "faq": [
            (
                "Wie viele Stadtteile hat Frankfurt am Main?",
                "Frankfurt hat 16 Ortsbezirke mit insgesamt 46 Stadtteilen.",
            ),
            (
                "Brauche ich einen Account?",
                "Nein. Du kannst sofort spielen; ein optionaler Account synchronisiert deinen Fortschritt.",
            ),
            (
                "Kann ich KiezQuiz offline nutzen?",
                "Ja. Als installierbare PWA funktioniert KiezQuiz auch ohne dauerhafte Internetverbindung.",
            ),
        ],
    },
    "europe": {
        "slug": "europe",
        "name": "Europa",
        "meta_description": (
            "Lerne alle 44 europäischen Länder und Hauptstädte spielerisch auf der Karte. "
            "Mit EU-Pokalen, XP, Streaks und Trivia — kostenlos, mobil und offline."
        ),
        "h1": "Europäische Länder und Hauptstädte spielerisch lernen",
        "faq": [
            (
                "Wie viele Länder sind im Europa-Quiz?",
                "KiezQuiz Europa umfasst 44 souveräne Staaten mit ihren Hauptstädten — von Deutschland bis Island.",
            ),
            (
                "Kann ich zwischen Ländern und Hauptstädten wechseln?",
                "Ja. Wie bei Hamburg oder Berlin wechselst du zwischen Länder-Überblick und Hauptstadt-Detail.",
            ),
            (
                "Gibt es spezielle EU-Pokale?",
                "Ja — unter anderem für alle Gründungsstaaten oder alle 27 EU-Mitglieder in einem perfekten Spiel.",
            ),
        ],
    },
}


def json_ld_webapp(city: dict, page_url: str) -> str:
    data = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": f"KiezQuiz – {city['name']}",
        "url": page_url,
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "Any",
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"},
        "description": city["meta_description"],
        "inLanguage": "de",
    }
    return json.dumps(data, ensure_ascii=False, indent=2)


def json_ld_faq(faq_items: list[tuple[str, str]]) -> str:
    data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": a},
            }
            for q, a in faq_items
        ],
    }
    return json.dumps(data, ensure_ascii=False, indent=2)


def extract_head_inner(page_html: str) -> str:
    match = re.search(r"<head>(.*)</head>", page_html, re.DOTALL)
    if not match:
        raise SystemExit("Could not extract <head> from template")
    return match.group(1)


def extract_app_body(index_html: str) -> str:
    match = re.search(r"<body>(.*)</body>", index_html, re.DOTALL)
    if not match:
        raise SystemExit("index.html: could not extract <body> content")
    body = match.group(1)
    body = re.sub(r"\s*<noscript>.*?</noscript>\s*", "\n", body, count=1, flags=re.DOTALL)
    return body.strip()


def patch_city_head(head_inner: str, city: dict) -> str:
    slug = city["slug"]
    page_url = f"{BASE_URL}/{slug}/"
    desc = html.escape(city["meta_description"])
    title = html.escape(SLOGAN)
    og_desc = html.escape(city["meta_description"])

    head = head_inner
    head = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", head, count=1)
    head = re.sub(
        r'<meta name="description" content="[^"]*"',
        f'<meta name="description" content="{desc}"',
        head,
        count=1,
    )
    head = re.sub(
        r'<link rel="canonical" href="[^"]*"',
        f'<link rel="canonical" href="{page_url}"',
        head,
        count=1,
    )
    head = re.sub(
        r'<link rel="alternate" hreflang="de" href="[^"]*"',
        f'<link rel="alternate" hreflang="de" href="{page_url}"',
        head,
        count=1,
    )
    head = re.sub(
        r'<link rel="alternate" hreflang="en" href="[^"]*"',
        f'<link rel="alternate" hreflang="en" href="{page_url}?lang=en"',
        head,
        count=1,
    )
    head = re.sub(
        r'<link rel="alternate" hreflang="x-default" href="[^"]*"',
        f'<link rel="alternate" hreflang="x-default" href="{page_url}"',
        head,
        count=1,
    )
    head = re.sub(
        r'<meta property="og:description" content="[^"]*"',
        f'<meta property="og:description" content="{og_desc}"',
        head,
        count=1,
    )
    head = re.sub(
        r'<meta property="og:url" content="[^"]*"',
        f'<meta property="og:url" content="{page_url}"',
        head,
        count=1,
    )
    head = re.sub(
        r'<meta name="twitter:description" content="[^"]*"',
        f'<meta name="twitter:description" content="{og_desc}"',
        head,
        count=1,
    )

    webapp_ld = json_ld_webapp(city, page_url)
    faq_ld = json_ld_faq(city["faq"])
    head = re.sub(
        r'<script type="application/ld\+json">\s*\{.*?"@type":\s*"WebApplication".*?\}\s*</script>',
        f"<script type=\"application/ld+json\">\n{webapp_ld}\n  </script>",
        head,
        count=1,
        flags=re.DOTALL,
    )
    head = re.sub(
        r'<script type="application/ld\+json">\s*\{.*?"@type":\s*"FAQPage".*?\}\s*</script>',
        f"<script type=\"application/ld+json\">\n{faq_ld}\n  </script>",
        head,
        count=1,
        flags=re.DOTALL,
    )
    return head


def render_noscript(city: dict) -> str:
    desc = html.escape(city["meta_description"])
    h1 = html.escape(city["h1"])
    other_links = []
    for slug, cfg in CITIES.items():
        if slug == city["slug"]:
            continue
        other_links.append(f'<a href="/{slug}/">{html.escape(cfg["name"])}</a>')
    other_links.append('<a href="/">Alle Städte</a>')
    nav = " · ".join(other_links)

    return f"""  <noscript>
    <div style="max-width:720px;margin:0 auto;padding:1.5rem;font-family:system-ui,sans-serif;line-height:1.6;">
      <h1>{h1}</h1>
      <p>{desc}</p>
      <p>JavaScript ist für die interaktive Karte erforderlich.</p>
      <p>{nav}</p>
    </div>
  </noscript>"""


def render_city_page(city: dict, head_inner: str, app_body: str) -> str:
    head = patch_city_head(head_inner, city)
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
{head}
</head>
<body>
{render_noscript(city)}

{app_body}
</body>
</html>
"""


def main() -> None:
    index_html = (ROOT / "index.html").read_text(encoding="utf-8")
    head_template = extract_head_inner(HEAD_TEMPLATE.read_text(encoding="utf-8"))
    app_body = extract_app_body(index_html)

    if "redesign.css" not in head_template:
        raise SystemExit("Head template must include redesign.css")
    if "device/phone.css" not in head_template:
        raise SystemExit("Head template must include device/phone.css (device layouts)")
    if "versionGuard.js" not in head_template:
        raise SystemExit("Head template must include versionGuard.js")

    for slug, city in CITIES.items():
        out_dir = ROOT / slug
        out_dir.mkdir(exist_ok=True)
        out_file = out_dir / "index.html"
        out_file.write_text(render_city_page(city, head_template, app_body), encoding="utf-8")
        print(f"Wrote {out_file}")


if __name__ == "__main__":
    main()
