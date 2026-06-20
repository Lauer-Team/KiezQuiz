#!/usr/bin/env python3
"""Generate sitemap.xml for kiezquiz.de static pages."""

from datetime import date
from pathlib import Path

BASE_URL = "https://kiezquiz.de"
URLS = [
    "/",
    "/about/",
    "/impressum/",
    "/datenschutz/",
    "/nutzungsbedingungen/",
    "/lizenzen/",
    "/barrierefreiheit/",
    "/hamburg/",
    "/berlin/",
    "/frankfurt/",
    "/muenchen/",
    "/duesseldorf/",
    "/europe/",
    "/mississippi/",
    "/wien/",
    "/paris/",
]

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "sitemap.xml"


def main() -> None:
    today = date.today().isoformat()
    entries = []
    for path in URLS:
        loc = BASE_URL + (path if path != "/" else "/")
        priority = "1.0" if path == "/" else "0.8"
        changefreq = "weekly" if path == "/" else "monthly"
        entries.append(
            f"  <url>\n"
            f"    <loc>{loc}</loc>\n"
            f"    <lastmod>{today}</lastmod>\n"
            f"    <changefreq>{changefreq}</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            f"  </url>"
        )

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    OUTPUT.write_text(xml, encoding="utf-8")
    print(f"Wrote {OUTPUT} ({len(URLS)} URLs)")


if __name__ == "__main__":
    main()
