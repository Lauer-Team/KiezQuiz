#!/usr/bin/env python3
"""Generate static SEO landing pages for each playable city."""

import json
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = "https://kiezquiz.de"

CITIES = {
    "hamburg": {
        "slug": "hamburg",
        "name": "Hamburg",
        "name_full": "Hamburg",
        "detail_label": "Stadtteile",
        "detail_label_plural": "Stadtteile",
        "bezirk_label": "Bezirke",
        "bezirk_count": 7,
        "detail_count": 104,
        "json_file": "src/data/hamburg_stadtteile.json",
        "title": "Hamburg Stadtteile lernen – Kostenloses Karten-Quiz | KiezQuiz",
        "meta_description": (
            "Lerne alle 104 Hamburger Stadtteile und 7 Bezirke spielerisch auf der Karte. "
            "Kostenlos, ohne Anmeldung, mit XP, Streaks und Trivia — mobil und offline."
        ),
        "h1": "Hamburg Stadtteile und Bezirke spielerisch lernen",
        "cta_param": "hamburg",
        "intro": """
<p>Hamburg ist mit über 1,8 Millionen Einwohnern die zweitgrößte Stadt Deutschlands — und ihre geografische Gliederung
kennt man selten auswendig. KiezQuiz macht aus trockenen Listen ein interaktives Karten-Erlebnis: Du lernst alle
<strong>7 Bezirke</strong> und <strong>104 Stadtteile</strong> spielerisch, direkt auf einer zoombaren SVG-Karte der Hansestadt.</p>

<p>Ob Altona, Eimsbüttel, Hamburg-Nord, Wandsbek, Hamburg-Mitte, Harburg oder Bergedorf — jedes Stadtviertel hat
eigenen Charakter, eigene Geschichte und oft überraschende Grenzverläufe. Viele Hamburger kennen ihren Kiez blind,
aber scheitern an Nachbarstadtteilen. Mit KiezQuiz trainierst du genau dieses räumliche Wissen — ohne Lehrbuch,
ohne Anmeldung, komplett kostenlos im Browser.</p>

<h3>Spielmodi für jeden Lerntyp</h3>
<p>Im <strong>Entdecker-Modus</strong> klickst du Stadtteile an und liest Kurzinfos mit Trivia-Fakten. Der
<strong>Stadtteil-Detektiv</strong> stellt dir einen Namen und du findest die richtige Fläche auf der Karte.
Im <strong>Karten-Quiz</strong> blinkt ein Bezirk oder Stadtteil und du wählst den passenden Namen. Im Modus
<strong>Namen eingeben</strong> tippst du die Lösung selbst — ideal für Fortgeschrittene. Die
<strong>Sporcle-Challenge „Nenne alle Orte"</strong> testet unter Zeitdruck, ob du wirklich alles beherrschst.</p>

<h3>Bezirks-Fortschritt, XP und Pokale</h3>
<p>Statt alles auf einmal freizuschalten, öffnest du Bezirke schrittweise: Erreiche 75&nbsp;% in einem Bezirk,
um den nächsten freizuschalten. Sammle <strong>XP</strong> für richtige Antworten, baue <strong>Streaks</strong>
für Bonuspunkte und verdiene <strong>Pokale</strong> — etwa für Meister aller Stadtteile, Insel-Entdeckungen
oder Bezirks-Spezialisten. Dein globaler Rang gilt stadtübergreifend; Fortschritt und Trophäen werden pro Stadt gespeichert.</p>

<h3>Kostenlos, mobil und offline</h3>
<p>KiezQuiz ist eine Progressive Web App: Installiere sie auf dem Smartphone, spiele unterwegs und nutze sie auch
ohne stabile Internetverbindung. Kein Account nötig — dein Spielstand bleibt lokal im Browser. Optional kannst du
dich anmelden, um den Fortschritt in der Cloud zu synchronisieren.</p>

<p>Starte jetzt mit Hamburg — oder erkunde auch <a href="/berlin/">Berlin</a> und
<a href="/frankfurt/">Frankfurt am Main</a> auf derselben Plattform.</p>
""",
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
        "name_full": "Berlin",
        "detail_label": "Ortsteil",
        "detail_label_plural": "Ortsteile",
        "bezirk_label": "Bezirke",
        "bezirk_count": 12,
        "detail_count": 97,
        "json_file": "src/data/berlin_ortsteile.json",
        "title": "Berlin Ortsteile lernen – Kostenloses Karten-Quiz | KiezQuiz",
        "meta_description": (
            "Lerne alle 97 Berliner Ortsteile und 12 Bezirke spielerisch auf der Karte. "
            "Kostenlos, ohne Anmeldung, mit XP, Streaks und Trivia — mobil und offline."
        ),
        "h1": "Berlin Ortsteile und Bezirke spielerisch lernen",
        "cta_param": "berlin",
        "intro": """
<p>Berlin ist eine Metropole mit zwölf Bezirken und 97 Ortsteilen — eine Struktur, die selbst langjährige Berliner
oft nur bruchstückhaft kennen. KiezQuiz verwandelt diese komplexe Geografie in ein spielerisches Karten-Quiz:
Du erkundest Mitte, Kreuzberg, Pankow, Charlottenburg und alle weiteren Bezirke auf einer interaktiven Karte.</p>

<p>Die Berliner Verwaltungsgliederung entstand 2001 aus der Bezirksreform und verbindet historisch gewachsene
Kieze zu größeren Einheiten. Wer weiß schon spontan, ob Plänterwald zu Treptow-Köpenick gehört oder wo genau
Rudow liegt? Mit KiezQuiz trainierst du Ortsteil für Ortsteil — mit visuellem Feedback, Trivia und klaren Grenzen
auf der Karte.</p>

<h3>Fünf Spielmodi für echtes Kartenwissen</h3>
<p>Starte im <strong>Entdecker-Modus</strong>, um jeden Ortsteil anzuklicken und Hintergrundwissen zu sammeln.
Im <strong>Ortsteil-Detektiv</strong> bekommst du einen Namen und musst die passende Fläche finden — perfekt für
aktives Abrufen. Das <strong>Karten-Quiz</strong> testet dein Erkennungsvermögen bei blinkenden Bezirken und Ortsteilen.
<strong>Namen eingeben</strong> fordert dein Schreibwissen, und die <strong>„Nenne alle Orte"</strong>-Challenge
simuliert eine Sporcle-Runde gegen die Uhr.</p>

<h3>Progression, XP und Berlin-Pokale</h3>
<p>Bezirke schaltest du schrittweise frei: 75&nbsp;% Meisterschaft im aktuellen Bezirk öffnet den nächsten.
Sammle XP, halte Streaks für Bonus-Multiplikatoren und verdiene stadtspezifische Trophäen — von
Bezirks-Meister bis Pfaueninsel-Entdecker. Dein globaler Rang wächst über alle Städte hinweg; Berlin-Fortschritt
und Pokale werden separat gespeichert.</p>

<h3>Gratis, ohne Anmeldung, PWA-fähig</h3>
<p>Berlin lernen war noch nie so unkompliziert: Kein Download aus dem App Store, keine Registrierungspflicht.
KiezQuiz läuft im Browser, funktioniert offline als installierbare Web App und speichert deinen Stand lokal.
Optional synchronisierst du über ein Konto in der EU-Cloud.</p>

<p>Spring direkt ins Berlin-Quiz — oder entdecke auch <a href="/hamburg/">Hamburg</a> und
<a href="/frankfurt/">Frankfurt am Main</a>.</p>
""",
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
        "name_full": "Frankfurt am Main",
        "detail_label": "Stadtteil",
        "detail_label_plural": "Stadtteile",
        "bezirk_label": "Ortsbezirke",
        "bezirk_count": 16,
        "detail_count": 46,
        "json_file": "src/data/frankfurt_stadtteile.json",
        "title": "Frankfurt Stadtteile lernen – Kostenloses Karten-Quiz | KiezQuiz",
        "meta_description": (
            "Lerne alle 46 Frankfurter Stadtteile und 16 Ortsbezirke spielerisch auf der Karte. "
            "Kostenlos, ohne Anmeldung, mit XP, Streaks und Trivia — mobil und offline."
        ),
        "h1": "Frankfurt Stadtteile und Ortsbezirke spielerisch lernen",
        "cta_param": "frankfurt",
        "intro": """
<p>Frankfurt am Main ist Finanzmetropole und Mainstadt zugleich — gegliedert in <strong>16 Ortsbezirke</strong>
und <strong>46 Stadtteile</strong>. Wer hier wohnt oder arbeitet, profitiert von räumlichem Orientierungswissen:
Vom Bankenviertel über Sachsenhausen bis nach Bergen-Enkheim — KiezQuiz macht aus der Frankfurter Stadtgeografie
ein spannendes Lernspiel auf der interaktiven Karte.</p>

<p>Frankfurts Stadtteile reichen vom dicht bebauten Innenstadtbereich bis zu grünen Randlagen. Ortsbezirke wie
Bornheim/Ostend, Nord-Ost oder Kalbach-Riedberg haben jeweils eigene Identität. Mit KiezQuiz lernst du nicht nur
Namen auswendig, sondern verbindest sie mit ihrer Lage — ein Skill, der bei Besuchen, Pendeln und Smalltalk
über die Stadt wirklich zählt.</p>

<h3>Alle Spielmodi — vom Entdecker bis zur Sporcle-Challenge</h3>
<p>Im <strong>Entdecker-Modus</strong> klickst du Stadtteile an und liest Kurzinfos. Der
<strong>Stadtteil-Detektiv</strong> fordert dich auf, einen genannten Ort auf der Karte zu finden.
<strong>Karten-Quiz</strong> und <strong>Namen eingeben</strong> steigern den Schwierigkeitsgrad.
Die zeitbasierte Challenge <strong>„Nenne alle Orte"</strong> ist der ultimative Test für Frankfurter
Geografie-Kenner.</p>

<h3>Ortsbezirks-Fortschritt und Belohnungen</h3>
<p>Wie in Hamburg und Berlin schaltest du Ortsbezirke nacheinander frei. XP und Streak-Boni belohnen konsequentes
Üben; stadtspezifische Pokale warten auf Meister aller Stadtteile, Ortsbezirks-Spezialisten und Entdecker
versteckter Highlights. Dein globaler KiezQuiz-Rang verbindet alle Städte — Frankfurt-Fortschritt bleibt
eigenständig gespeichert.</p>

<h3>Free to play — mobil und offline</h3>
<p>Keine Registrierung, kein Abo: KiezQuiz ist eine kostenlose Web App, die du auf dem Smartphone installieren
und offline nutzen kannst. Ideal für Pendler, Studierende und alle, die Frankfurt endlich wirklich „kennen"
wollen — Bezirk für Bezirk, Stadtteil für Stadtteil.</p>

<p>Starte das Frankfurt-Quiz — oder probiere auch <a href="/hamburg/">Hamburg</a> und
<a href="/berlin/">Berlin</a>.</p>
""",
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

PAGE_CSS = """
:root { --bg: #0f1118; --text: #e8eaef; --muted: #9aa3b2; --acc: hsl(205 100% 62%); --border: rgba(255,255,255,0.1); }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.65; }
a { color: var(--acc); }
.wrap { max-width: 720px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
header.site { margin-bottom: 2rem; }
header.site a.logo { font-weight: 800; font-size: 1.1rem; color: var(--text); text-decoration: none; }
h1 { font-size: clamp(1.6rem, 4vw, 2.1rem); line-height: 1.25; margin: 0 0 1rem; }
.lead { color: var(--muted); font-size: 1.05rem; margin-bottom: 1.5rem; }
.cta { display: inline-block; margin: 1.5rem 0 2rem; padding: 0.85rem 1.5rem; background: var(--acc); color: #0f1118; font-weight: 700; text-decoration: none; border-radius: 8px; }
.cta:hover { filter: brightness(1.08); }
.intro h3 { margin-top: 1.75rem; font-size: 1.05rem; }
.nav-cities { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 1rem 0 2rem; font-size: 0.95rem; }
.district-list { columns: 2; column-gap: 2rem; font-size: 0.9rem; margin: 1rem 0 2rem; padding-left: 1.2rem; }
@media (max-width: 520px) { .district-list { columns: 1; } }
.district-list li { break-inside: avoid; margin-bottom: 0.25rem; }
footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); font-size: 0.85rem; color: var(--muted); }
"""


def load_districts(json_path: Path) -> list[dict]:
    with json_path.open(encoding="utf-8") as f:
        return json.load(f)


def other_city_links(current: str) -> str:
    links = []
    for slug, cfg in CITIES.items():
        if slug == current:
            continue
        links.append(f'<a href="/{slug}/">{html.escape(cfg["name"])}</a>')
    links.append(f'<a href="/">Alle Städte</a>')
    return " · ".join(links)


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


def render_page(slug: str, city: dict) -> str:
    districts = load_districts(ROOT / city["json_file"])
    districts_sorted = sorted(districts, key=lambda d: d["name"].lower())
    district_items = "".join(
        f"<li>{html.escape(d['name'])} <span style=\"color:var(--muted)\">({html.escape(d['bezirk'])})</span></li>"
        for d in districts_sorted
    )
    page_url = f"{BASE_URL}/{slug}/"
    play_url = f"{BASE_URL}/?city={city['cta_param']}"
    other = other_city_links(slug)

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(city['title'])}</title>
  <meta name="description" content="{html.escape(city['meta_description'])}">
  <link rel="canonical" href="{page_url}">
  <link rel="alternate" hreflang="de" href="{page_url}">
  <link rel="alternate" hreflang="en" href="{page_url}?lang=en">
  <link rel="alternate" hreflang="x-default" href="{page_url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{html.escape(city['title'])}">
  <meta property="og:description" content="{html.escape(city['meta_description'])}">
  <meta property="og:url" content="{page_url}">
  <meta property="og:locale" content="de_DE">
  <meta property="og:image" content="{BASE_URL}/assets/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{html.escape(city['title'])}">
  <meta name="twitter:description" content="{html.escape(city['meta_description'])}">
  <meta name="twitter:image" content="{BASE_URL}/assets/og-image.jpg">
  <style>{PAGE_CSS}</style>
  <script type="application/ld+json">
{json_ld_webapp(city, page_url)}
  </script>
  <script type="application/ld+json">
{json_ld_faq(city['faq'])}
  </script>
</head>
<body>
  <div class="wrap">
    <header class="site">
      <a class="logo" href="/">⚓ KiezQuiz</a>
    </header>

    <h1>{html.escape(city['h1'])}</h1>
    <p class="lead">{html.escape(city['meta_description'])}</p>

    <nav class="nav-cities" aria-label="Städte-Navigation">
      {other}
    </nav>

    <a class="cta" href="{play_url}">Jetzt {html.escape(city['name'])} spielen →</a>

    <div class="intro">
      {city['intro']}
    </div>

    <h2>Alle {city['detail_count']} {html.escape(city['detail_label_plural'])} von {html.escape(city['name_full'])}</h2>
    <p style="color:var(--muted); font-size:0.95rem;">
      {city['bezirk_count']} {html.escape(city['bezirk_label'])} · {city['detail_count']} {html.escape(city['detail_label_plural'])} — vollständige Liste:
    </p>
    <ul class="district-list">
      {district_items}
    </ul>

    <a class="cta" href="{play_url}">Kostenlos spielen — ohne Anmeldung</a>

    <footer>
      <p><a href="/">KiezQuiz Startseite</a> · {other}</p>
      <p>© KiezQuiz — Bezirke und Stadtteile spielerisch lernen.</p>
    </footer>
  </div>
</body>
</html>
"""


def main() -> None:
    for slug, city in CITIES.items():
        out_dir = ROOT / slug
        out_dir.mkdir(exist_ok=True)
        out_file = out_dir / "index.html"
        out_file.write_text(render_page(slug, city), encoding="utf-8")
        print(f"Wrote {out_file}")


if __name__ == "__main__":
    main()
