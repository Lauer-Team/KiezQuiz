#!/usr/bin/env python3
"""Generate city app entry pages (playable + SEO meta) from index.html."""

import json
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = "https://kiezquiz.de"

CITIES = {
    "hamburg": {
        "slug": "hamburg",
        "name": "Hamburg",
        "title": "Hamburg Stadtteile lernen – Kostenloses Karten-Quiz | KiezQuiz",
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
        "title": "Berlin Ortsteile lernen – Kostenloses Karten-Quiz | KiezQuiz",
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
        "title": "Frankfurt Stadtteile lernen – Kostenloses Karten-Quiz | KiezQuiz",
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


def render_city_head(city: dict) -> str:
    slug = city["slug"]
    page_url = f"{BASE_URL}/{slug}/"
    title = html.escape(city["title"])
    desc = html.escape(city["meta_description"])
    h1 = html.escape(city["h1"])

    return f"""<head>
  <meta charset="UTF-8">
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#0f1118">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="KiezQuiz">
  <meta name="format-detection" content="telephone=no">

  <link rel="canonical" href="{page_url}">
  <link rel="alternate" hreflang="de" href="{page_url}">
  <link rel="alternate" hreflang="en" href="{page_url}?lang=en">
  <link rel="alternate" hreflang="x-default" href="{page_url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="KiezQuiz">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{page_url}">
  <meta property="og:locale" content="de_DE">
  <meta property="og:image" content="{BASE_URL}/assets/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{desc}">
  <meta name="twitter:image" content="{BASE_URL}/assets/og-image.jpg">

  <link rel="manifest" href="manifest.webmanifest">
  <link rel="icon" href="icons/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="icons/icon.svg">
  <link rel="stylesheet" href="src/styles/base.css">
  <link rel="stylesheet" href="src/styles/hub.css">
  <script type="application/ld+json">
{json_ld_webapp(city, page_url)}
  </script>
  <script type="application/ld+json">
{json_ld_faq(city["faq"])}
  </script>
</head>"""


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


def extract_app_body(index_html: str) -> str:
    match = re.search(r"<body>(.*)</body>", index_html, re.DOTALL)
    if not match:
        raise SystemExit("index.html: could not extract <body> content")
    body = match.group(1)
    body = re.sub(r"\s*<noscript>.*?</noscript>\s*", "\n", body, count=1, flags=re.DOTALL)
    return body.strip()


def render_city_page(city: dict, app_body: str) -> str:
    slug = city["slug"]
    return f"""<!DOCTYPE html>
<html lang="de">
{render_city_head(city)}
<body>
{render_noscript(city)}

{app_body}
</body>
</html>
"""


def main() -> None:
    index_html = (ROOT / "index.html").read_text(encoding="utf-8")
    app_body = extract_app_body(index_html)

    for slug, city in CITIES.items():
        out_dir = ROOT / slug
        out_dir.mkdir(exist_ok=True)
        out_file = out_dir / "index.html"
        out_file.write_text(render_city_page(city, app_body), encoding="utf-8")
        print(f"Wrote {out_file}")


if __name__ == "__main__":
    main()
