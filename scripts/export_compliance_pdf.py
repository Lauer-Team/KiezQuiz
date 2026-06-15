#!/usr/bin/env python3
"""Export KiezQuiz compliance checklist CSV to a styled PDF (Legora-like dark table)."""

from __future__ import annotations

import argparse
import csv
import html
import json
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = (
    ROOT.parent
    / "KiezQuiz (supplement)"
    / "2026-06-10 - Compliance Nachweis - 3 - CSV.csv"
)
DEFAULT_PDF = (
    ROOT.parent
    / "KiezQuiz (supplement)"
    / "2026-06-10 - Compliance-Nachweis.pdf"
)

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "google-chrome",
    "chromium",
    "chromium-browser",
]

MONTHS_DE = {
    "01": "Januar",
    "02": "Februar",
    "03": "März",
    "04": "April",
    "05": "Mai",
    "06": "Juni",
    "07": "Juli",
    "08": "August",
    "09": "September",
    "10": "Oktober",
    "11": "November",
    "12": "Dezember",
}

CATEGORY_STYLES = {
    "Rechtsdokumente": ("#5c5c5c", "#f0f0f0"),
    "BFSG": ("#8b2e2e", "#ffe8e8"),
    "Urheberrecht": ("#4a3d7a", "#ece8ff"),
    "Verträge & SCCs": ("#2d4a7a", "#e3eeff"),
    "DSGVO": ("#2d5a3d", "#e5f5eb"),
    "TDDDG": ("#7a4a1a", "#fff0dc"),
    "Technische Sicherheit": ("#5a2d5a", "#f5e8f5"),
    "Prozesse": ("#2d5a5a", "#e5f5f5"),
}

STATUS_STYLES = {
    "Umgesetzt": ("#2f8f4e", "check"),
    "Übererfüllt": ("#2f8f4e", "check"),
    "Teilweise": ("#c9a227", "half"),
    "Ausstehend": ("#8a8a8a", "pending"),
    "Nicht anwendbar": ("#6b7280", "na"),
}

VISIBLE_COLUMNS = [
    ("Title", "Titel"),
    ("Status", "Status"),
    ("Kategorie", "Kategorie"),
    ("Rechtsgrundlage", "Rechtsgrundlage"),
    ("Umgesetzt am", "Umgesetzt am"),
    ("Nachweis / Fundstelle", "Nachweis"),
]


def find_chrome() -> str | None:
    for candidate in CHROME_CANDIDATES:
        path = Path(candidate)
        if path.is_file():
            return str(path)
        found = subprocess.run(
            ["which", candidate],
            capture_output=True,
            text=True,
            check=False,
        )
        if found.returncode == 0 and found.stdout.strip():
            return found.stdout.strip()
    return None


def format_date_de(value: str) -> str:
    value = (value or "").strip()
    if not value or value == "—":
        return "—"
    for fmt in ("%d.%m.%Y", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(value, fmt)
            return f"{dt.day}. {MONTHS_DE[dt.strftime('%m')]} {dt.year}"
        except ValueError:
            continue
    return value


def status_icon(kind: str, color: str) -> str:
    if kind == "check":
        return (
            f'<span class="status-icon" style="background:{color}">'
            '<svg viewBox="0 0 16 16" aria-hidden="true">'
            '<path d="M3.5 8.2l2.6 2.6 6.4-6.8" fill="none" stroke="#fff" '
            'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
            "</svg></span>"
        )
    if kind == "half":
        return (
            f'<span class="status-icon half" style="background:{color}">'
            '<span class="half-fill"></span>'
            "</span>"
        )
    if kind == "pending":
        return (
            f'<span class="status-icon pending" style="border-color:{color}">'
            '<span class="pending-dot"></span>'
            "</span>"
        )
    return (
        f'<span class="status-icon na" style="border-color:{color}">'
        '<span class="na-dash"></span>'
        "</span>"
    )


def render_status(status: str) -> str:
    color, kind = STATUS_STYLES.get(status, ("#8a8a8a", "pending"))
    return (
        f'<span class="status-cell">'
        f"{status_icon(kind, color)}"
        f'<span class="status-label">{html.escape(status)}</span>'
        f"</span>"
    )


def render_category(category: str) -> str:
    bg, fg = CATEGORY_STYLES.get(category, ("#444", "#f0f0f0"))
    return (
        f'<span class="category-pill" style="background:{bg};color:{fg}">'
        f"{html.escape(category)}"
        f"</span>"
    )


def render_nachweis(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return "—"
    parts: list[str] = []
    for segment in value.split(";"):
        segment = segment.strip()
        if not segment:
            continue
        if segment.startswith("http://") or segment.startswith("https://"):
            safe = html.escape(segment)
            parts.append(f'<a href="{safe}" class="nachweis-link">{safe}</a>')
        else:
            parts.append(f'<span class="nachweis-text">{html.escape(segment)}</span>')
    return "<br>".join(parts) if parts else "—"


def load_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def build_html(rows: list[dict[str, str]], title: str, generated_at: str) -> str:
    header_cells = "".join(
        f"<th>{html.escape(label)}</th>" for _, label in VISIBLE_COLUMNS
    )

    body_rows: list[str] = []
    for row in rows:
        cells: list[str] = []
        for key, _ in VISIBLE_COLUMNS:
            raw = (row.get(key) or "").strip()
            if key == "Status":
                cell = render_status(raw)
            elif key == "Kategorie":
                cell = render_category(raw)
            elif key == "Umgesetzt am":
                cell = html.escape(format_date_de(raw))
            elif key == "Nachweis / Fundstelle":
                cell = render_nachweis(raw)
            else:
                cell = html.escape(raw)
            cells.append(f"<td>{cell}</td>")
        body_rows.append("<tr>" + "".join(cells) + "</tr>")

    counts: dict[str, int] = {}
    for row in rows:
        status = (row.get("Status") or "").strip()
        counts[status] = counts.get(status, 0) + 1

    summary_bits = [
        f"{counts.get('Umgesetzt', 0)} umgesetzt",
        f"{counts.get('Übererfüllt', 0)} übererfüllt",
        f"{counts.get('Teilweise', 0)} teilweise",
        f"{counts.get('Ausstehend', 0)} ausstehend",
        f"{counts.get('Nicht anwendbar', 0)} nicht anwendbar",
    ]

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>{html.escape(title)}</title>
  <style>
    @page {{
      size: A3 landscape;
      margin: 14mm 12mm;
    }}

    * {{
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }}

    body {{
      margin: 0;
      background: #111111;
      color: #e8e8e8;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
    }}

    .page {{
      padding: 0;
    }}

    .header {{
      margin-bottom: 14px;
      border-bottom: 1px solid #2a2a2a;
      padding-bottom: 10px;
    }}

    .eyebrow {{
      color: #8f8f8f;
      font-size: 10px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }}

    h1 {{
      margin: 0 0 6px;
      font-size: 22px;
      font-weight: 600;
      color: #f5f5f5;
    }}

    .meta {{
      color: #9a9a9a;
      font-size: 10px;
    }}

    table {{
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }}

    col.titel {{ width: 17%; }}
    col.status {{ width: 10%; }}
    col.kategorie {{ width: 11%; }}
    col.rechtsgrundlage {{ width: 18%; }}
    col.datum {{ width: 9%; }}
    col.nachweis {{ width: 35%; }}

    thead th {{
      text-align: left;
      color: #9a9a9a;
      font-weight: 500;
      font-size: 10px;
      padding: 8px 10px 10px;
      border-bottom: 1px solid #2f2f2f;
      vertical-align: bottom;
    }}

    tbody td {{
      padding: 9px 10px;
      border-bottom: 1px solid #232323;
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }}

    tbody tr:nth-child(even) {{
      background: #151515;
    }}

    .status-cell {{
      display: inline-flex;
      align-items: center;
      gap: 7px;
      white-space: nowrap;
    }}

    .status-icon {{
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
    }}

    .status-icon svg {{
      width: 11px;
      height: 11px;
      display: block;
    }}

    .status-icon.half {{
      background: #3a3218 !important;
      overflow: hidden;
    }}

    .half-fill {{
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 50%;
      background: #c9a227;
    }}

    .status-icon.pending,
    .status-icon.na {{
      background: transparent;
      border: 1.5px solid;
    }}

    .pending-dot {{
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      color: inherit;
      display: block;
      background: #8a8a8a;
    }}

    .na-dash {{
      width: 8px;
      height: 2px;
      background: #8a8a8a;
      display: block;
      border-radius: 1px;
    }}

    .status-label {{
      color: #dcdcdc;
    }}

    .category-pill {{
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 500;
      white-space: nowrap;
    }}

    .nachweis-link {{
      color: #7eb6ff;
      text-decoration: none;
      word-break: break-all;
    }}

    .nachweis-text {{
      color: #c8c8c8;
    }}

    .footer {{
      margin-top: 12px;
      color: #7a7a7a;
      font-size: 9px;
    }}
  </style>
</head>
<body>
  <div class="page">
    <header class="header">
      <div class="eyebrow">KiezQuiz · Compliance</div>
      <h1>{html.escape(title)}</h1>
      <div class="meta">
        Stand: {html.escape(generated_at)} · {len(rows)} Einträge ·
        {html.escape(" · ".join(summary_bits))}
      </div>
    </header>

    <table>
      <colgroup>
        <col class="titel">
        <col class="status">
        <col class="kategorie">
        <col class="rechtsgrundlage">
        <col class="datum">
        <col class="nachweis">
      </colgroup>
      <thead>
        <tr>{header_cells}</tr>
      </thead>
      <tbody>
        {"".join(body_rows)}
      </tbody>
    </table>

    <div class="footer">
      Export aus Legora-CSV · Nur die Spalten Titel, Status, Kategorie, Rechtsgrundlage,
      Umgesetzt am und Nachweis (wie in der Listenansicht).
    </div>
  </div>
</body>
</html>
"""


def html_to_pdf(html_path: Path, pdf_path: Path, chrome: str) -> None:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=10000",
        f"--print-to-pdf={pdf_path}",
        "--no-pdf-header-footer",
        html_path.as_uri(),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0 or not pdf_path.is_file():
        raise RuntimeError(
            "Chrome PDF export failed.\n"
            f"stdout: {result.stdout}\n"
            f"stderr: {result.stderr}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="Input CSV path")
    parser.add_argument("--pdf", type=Path, default=DEFAULT_PDF, help="Output PDF path")
    parser.add_argument(
        "--html",
        type=Path,
        default=None,
        help="Optional: also write intermediate HTML next to PDF",
    )
    parser.add_argument(
        "--html-only",
        action="store_true",
        help="Only write HTML (skip Chrome PDF step)",
    )
    args = parser.parse_args()

    if not args.csv.is_file():
        print(f"CSV not found: {args.csv}", file=sys.stderr)
        return 1

    rows = load_rows(args.csv)
    generated_at = datetime.now().strftime("%d. %B %Y").replace(
        "January", "Januar"
    ).replace("February", "Februar").replace("March", "März").replace(
        "April", "April"
    ).replace("May", "Mai").replace("June", "Juni").replace(
        "July", "Juli"
    ).replace("August", "August").replace("September", "September").replace(
        "October", "Oktober"
    ).replace("November", "November").replace("December", "Dezember")

    title = "KiezQuiz – Compliance-Nachweis"
    html_doc = build_html(rows, title, generated_at)

    html_out = args.html or args.pdf.with_suffix(".html")
    html_out.write_text(html_doc, encoding="utf-8")
    print(f"HTML: {html_out}")

    if args.html_only:
        print("Skipped PDF (--html-only).")
        return 0

    chrome = find_chrome()
    if not chrome:
        print(
            "Chrome/Chromium not found. HTML was written; open it and print to PDF manually.",
            file=sys.stderr,
        )
        return 2

    with tempfile.TemporaryDirectory() as tmp:
        tmp_html = Path(tmp) / "compliance.html"
        tmp_html.write_text(html_doc, encoding="utf-8")
        html_to_pdf(tmp_html, args.pdf, chrome)

    print(f"PDF:  {args.pdf} ({args.pdf.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
