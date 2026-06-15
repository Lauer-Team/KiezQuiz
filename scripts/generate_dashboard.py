#!/usr/bin/env python3
"""KiezQuiz — Dashboard-Generator (One-Stop-Shop).

Liest die "Quelle der Wahrheit" (ops/LEITSTAND.md, ops/DEADLINES.md, ops/ORGANIGRAMM.md),
berechnet aus den Cron-Plaenen die naechsten Routine-Termine und baut eine
in sich geschlossene HTML-Seite: ops/dashboard.html.

Aufruf:  python3 scripts/generate_dashboard.py
Danach:  ops/dashboard.html im Browser oeffnen.

Bewusst ohne Fremd-Pakete (nur Standardbibliothek), damit es ueberall laeuft.
"""

from __future__ import annotations

import html
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:  # echte Zeitzone, wenn verfuegbar (Python 3.9+)
    from zoneinfo import ZoneInfo

    BERLIN = ZoneInfo("Europe/Berlin")
except Exception:  # pragma: no cover - Fallback
    BERLIN = timezone(timedelta(hours=2))  # CEST-Naeherung

ROOT = Path(__file__).resolve().parent.parent
OPS = ROOT / "ops"

WD = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]

STATUS_COLOR = {
    "🟢": ("#1a7f37", "#e6f4ea", "OK"),
    "🟡": ("#9a6700", "#fff8e1", "Beobachten"),
    "🔴": ("#cf222e", "#ffebe9", "Dringend"),
    "⏸️": ("#57606a", "#eef1f4", "Pausiert"),
    "⚪": ("#57606a", "#eef1f4", "Bewusst aus"),
}


# --------------------------------------------------------------------------- #
# Markdown-Helfer
# --------------------------------------------------------------------------- #
def read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def split_row(line: str) -> list[str]:
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    return cells


def find_table(text: str, header_contains: str) -> list[list[str]]:
    """Findet die erste Markdown-Tabelle, deren Kopfzeile header_contains enthaelt."""
    lines = text.splitlines()
    rows: list[list[str]] = []
    in_table = False
    for line in lines:
        is_row = line.strip().startswith("|")
        if not in_table:
            if is_row and header_contains.lower() in line.lower():
                in_table = True
            continue
        if not is_row:
            break
        cells = split_row(line)
        if all(set(c) <= {"-", ":", " "} for c in cells):  # Trennzeile
            continue
        rows.append(cells)
    return rows


def first_status(cell: str) -> str:
    for emoji in STATUS_COLOR:
        if emoji in cell:
            return emoji
    return "⚪"


def clean(cell: str) -> str:
    cell = re.sub(r"\*\*(.+?)\*\*", r"\1", cell)
    cell = re.sub(r"`(.+?)`", r"\1", cell)
    cell = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", cell)
    return cell.strip()


# --------------------------------------------------------------------------- #
# Cron -> naechster Lauf
# --------------------------------------------------------------------------- #
def parse_field(field: str, lo: int, hi: int) -> set[int]:
    allowed: set[int] = set()
    for part in field.split(","):
        step = 1
        if "/" in part:
            part, step_s = part.split("/")
            step = int(step_s)
        if part in ("*", ""):
            start, end = lo, hi
        elif "-" in part:
            a, b = part.split("-")
            start, end = int(a), int(b)
        else:
            start = end = int(part)
        allowed.update(range(start, end + 1, step))
    return allowed


def next_run(cron: str, now_utc: datetime) -> datetime | None:
    parts = cron.split()
    if len(parts) != 5:
        return None
    mins = parse_field(parts[0], 0, 59)
    hours = parse_field(parts[1], 0, 23)
    doms = parse_field(parts[2], 1, 31)
    months = parse_field(parts[3], 1, 12)
    dows = parse_field(parts[4], 0, 7)
    dows = {0 if d == 7 else d for d in dows}

    dom_restricted = parts[2] != "*"
    dow_restricted = parts[4] != "*"

    t = now_utc.replace(second=0, microsecond=0) + timedelta(minutes=1)
    for _ in range(366 * 24 * 60):
        cron_dow = t.isoweekday() % 7  # Mon=1..Sat=6, Sun=0
        if t.month in months and t.hour in hours and t.minute in mins:
            if dom_restricted and dow_restricted:
                day_ok = (t.day in doms) or (cron_dow in dows)
            elif dom_restricted:
                day_ok = t.day in doms
            elif dow_restricted:
                day_ok = cron_dow in dows
            else:
                day_ok = True
            if day_ok:
                return t
        t += timedelta(minutes=1)
    return None


def fmt_de(dt: datetime) -> str:
    local = dt.astimezone(BERLIN)
    return f"{WD[local.weekday()]}, {local.strftime('%d.%m.%Y · %H:%M')}"


def days_until(dt: datetime, now: datetime) -> int:
    return (dt.astimezone(BERLIN).date() - now.astimezone(BERLIN).date()).days


# --------------------------------------------------------------------------- #
# Daten einsammeln
# --------------------------------------------------------------------------- #
def collect():
    now = datetime.now(timezone.utc)
    leit = read(OPS / "LEITSTAND.md")
    deadlines = read(OPS / "DEADLINES.md")
    organ = read(OPS / "ORGANIGRAMM.md")

    # Abteilungen (§1: Spalten Abteilung | Status | Kurz)
    departments = []
    for row in find_table(leit, "Abteilung"):
        if len(row) >= 3:
            departments.append(
                {"name": clean(row[0]), "status": first_status(row[1]), "note": clean(row[2])}
            )

    # Automationen (§2: # | Name | Cron | Aufgabe)
    automations = []
    for row in find_table(leit, "Cron"):
        if len(row) >= 4 and row[0].strip("# ").isdigit():
            cron = clean(row[2])
            nr = next_run(cron, now)
            automations.append(
                {
                    "num": clean(row[0]),
                    "name": clean(row[1]),
                    "cron": cron,
                    "task": clean(row[3]),
                    "next": nr,
                    "next_str": fmt_de(nr) if nr else "—",
                    "days": days_until(nr, now) if nr else None,
                }
            )
    automations.sort(key=lambda a: (a["next"] or now + timedelta(days=999)))

    # Deadlines (Spalte "Fällig am")
    dls = []
    for row in find_table(deadlines, "Fällig am"):
        if len(row) >= 7:
            dls.append(
                {
                    "id": clean(row[0]),
                    "what": clean(row[1]),
                    "due": clean(row[2]),
                    "remind": clean(row[3]),
                    "who": clean(row[4]),
                    "status": first_status(row[5]),
                    "note": clean(row[6]),
                }
            )

    # Mermaid-Block aus dem Organigramm
    m = re.search(r"```mermaid\n(.*?)```", organ, re.DOTALL)
    mermaid = m.group(1).strip() if m else ""

    return now, departments, automations, dls, mermaid


# --------------------------------------------------------------------------- #
# HTML rendern
# --------------------------------------------------------------------------- #
def esc(s: str) -> str:
    return html.escape(s, quote=True)


def render(now, departments, automations, dls, mermaid) -> str:
    gen = now.astimezone(BERLIN).strftime("%A, %d.%m.%Y · %H:%M Uhr")

    # Diese Woche faellige Automationen (<=7 Tage)
    week = [a for a in automations if a["days"] is not None and a["days"] <= 7]
    soon_deadlines = [d for d in dls if d["status"] in ("🔴", "🟡")]

    def status_badge(emoji: str) -> str:
        fg, bg, label = STATUS_COLOR.get(emoji, STATUS_COLOR["⚪"])
        return f'<span class="badge" style="color:{fg};background:{bg}">{emoji} {label}</span>'

    dept_cards = "\n".join(
        f"""<div class="card">
          <div class="card-head">{status_badge(d['status'])}</div>
          <h3>{esc(d['name'])}</h3>
          <p>{esc(d['note'])}</p>
        </div>"""
        for d in departments
    )

    week_items = (
        "\n".join(
            f"<li><strong>{esc(a['name'])}</strong> — {esc(a['next_str'])} "
            f"<span class='muted'>({a['days']} Tg.)</span></li>"
            for a in week
        )
        or "<li class='muted'>Diese Woche keine geplante Automation.</li>"
    )

    deadline_items = (
        "\n".join(
            f"<li>{status_badge(d['status'])} <strong>{esc(d['what'])}</strong> — "
            f"fällig {esc(d['due'])} <span class='muted'>({esc(d['who'])})</span></li>"
            for d in soon_deadlines
        )
        or "<li class='muted'>Keine offenen Fälligkeiten.</li>"
    )

    auto_rows = "\n".join(
        f"""<tr>
          <td class="num">{esc(a['num'])}</td>
          <td><strong>{esc(a['name'])}</strong><br><span class="muted">{esc(a['task'])}</span></td>
          <td><code>{esc(a['cron'])}</code></td>
          <td>{esc(a['next_str'])}</td>
          <td class="center">{a['days'] if a['days'] is not None else '—'}</td>
        </tr>"""
        for a in automations
    )

    dl_rows = "\n".join(
        f"""<tr>
          <td>{esc(d['id'])}</td>
          <td>{status_badge(d['status'])}</td>
          <td><strong>{esc(d['what'])}</strong></td>
          <td>{esc(d['due'])}</td>
          <td>{esc(d['who'])}</td>
          <td class="muted">{esc(d['note'])}</td>
        </tr>"""
        for d in dls
    )

    repo_base = "https://github.com/logic3/KiezQuiz/blob/main/ops"
    links = [
        ("Leitstand (Status)", f"{repo_base}/LEITSTAND.md"),
        ("Organigramm (Gesamtüberblick)", f"{repo_base}/ORGANIGRAMM.md"),
        ("Fälligkeiten", f"{repo_base}/DEADLINES.md"),
        ("Roadmap", f"{repo_base}/ROADMAP.md"),
        ("Automations-Konfig", f"{repo_base}/AUTOMATIONS.md"),
        ("Zugänge", f"{repo_base}/ZUGAENGE.md"),
        ("Tech-Stack", f"{repo_base}/TECHSTACK.md"),
        ("Finance", f"{repo_base}/finance/SERVICES.md"),
        ("Legal-Backlog", f"{repo_base}/legal/BACKLOG.md"),
        ("Berichte", f"{repo_base}/reports/"),
    ]
    link_items = "\n".join(
        f'<a class="linkchip" href="{esc(href)}" target="_blank" rel="noopener">{esc(label)}</a>'
        for label, href in links
    )

    mermaid_block = (
        f'<pre class="mermaid">{esc(mermaid)}</pre>' if mermaid else "<p class='muted'>Kein Diagramm gefunden.</p>"
    )

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KiezQuiz — AI-Management Dashboard</title>
<style>
  :root {{ --bg:#f6f8fa; --fg:#1f2328; --muted:#57606a; --line:#d0d7de; --card:#fff; --accent:#0969da; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:var(--fg); background:var(--bg); }}
  header {{ background:linear-gradient(135deg,#0969da,#1a7f37); color:#fff; padding:28px 24px; }}
  header h1 {{ margin:0 0 4px; font-size:24px; }}
  header p {{ margin:0; opacity:.92; }}
  main {{ max-width:1100px; margin:0 auto; padding:24px; }}
  section {{ margin-bottom:32px; }}
  h2 {{ font-size:18px; border-bottom:2px solid var(--line); padding-bottom:6px; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:14px; }}
  .card {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px; }}
  .card h3 {{ margin:8px 0 4px; font-size:15px; }}
  .card p {{ margin:0; color:var(--muted); font-size:13px; }}
  .badge {{ display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; font-weight:600; }}
  .two {{ display:grid; grid-template-columns:1fr 1fr; gap:18px; }}
  .panel {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:16px; }}
  .panel h2 {{ margin-top:0; border:0; }}
  ul {{ margin:0; padding-left:18px; }}
  li {{ margin:5px 0; }}
  table {{ width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; }}
  th, td {{ text-align:left; padding:9px 12px; border-bottom:1px solid var(--line); vertical-align:top; font-size:14px; }}
  th {{ background:#f0f3f6; font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }}
  td.num, td.center {{ text-align:center; }}
  code {{ background:#eef1f4; padding:1px 6px; border-radius:5px; font-size:13px; }}
  .muted {{ color:var(--muted); }}
  .linkchip {{ display:inline-block; margin:4px 6px 0 0; padding:7px 12px; background:var(--card); border:1px solid var(--line); border-radius:8px; color:var(--accent); text-decoration:none; font-size:13px; }}
  .linkchip:hover {{ border-color:var(--accent); }}
  .mermaid {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:16px; overflow:auto; }}
  footer {{ text-align:center; color:var(--muted); font-size:12px; padding:24px; }}
  body.is-embed header, body.is-embed footer {{ display:none; }}
  body.is-embed main {{ max-width:none; padding:12px; }}
  @media (max-width:760px) {{ .two {{ grid-template-columns:1fr; }} }}
</style>
</head>
<body>
<header>
  <h1>🕊️ KiezQuiz — AI-Management Dashboard</h1>
  <p>Dein One-Stop-Shop · erstellt am {esc(gen)} · Quelle: ops/LEITSTAND.md</p>
</header>
<main>

  <section class="two">
    <div class="panel">
      <h2>📅 Was diese Woche ansteht</h2>
      <ul>{week_items}</ul>
    </div>
    <div class="panel">
      <h2>⏳ Wartet auf dich / Fälligkeiten</h2>
      <ul>{deadline_items}</ul>
    </div>
  </section>

  <section>
    <h2>🚦 Status je Abteilung</h2>
    <div class="grid">{dept_cards}</div>
  </section>

  <section>
    <h2>⏰ Automationen & nächste Routine-Termine</h2>
    <table>
      <thead><tr><th>#</th><th>Automation</th><th>Cron (UTC)</th><th>Nächster Lauf (DE)</th><th>in Tagen</th></tr></thead>
      <tbody>{auto_rows}</tbody>
    </table>
  </section>

  <section>
    <h2>📌 Termine & Fälligkeiten</h2>
    <table>
      <thead><tr><th>ID</th><th>Status</th><th>Was</th><th>Fällig</th><th>Wer</th><th>Notiz</th></tr></thead>
      <tbody>{dl_rows}</tbody>
    </table>
  </section>

  <section>
    <h2>🗺️ Organigramm</h2>
    {mermaid_block}
  </section>

  <section>
    <h2>🔗 Alles öffnen</h2>
    {link_items}
  </section>

</main>
<footer>
  Automatisch erzeugt von <code>scripts/generate_dashboard.py</code> ·
  Status pflegt Kalle in <code>ops/LEITSTAND.md</code> ·
  zum Aktualisieren: „Erstelle das Dashboard" sagen.
</footer>
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  mermaid.initialize({{ startOnLoad: true, theme: "neutral" }});
</script>
<script>
  if (new URLSearchParams(location.search).get("embed") === "1") {{
    document.body.classList.add("is-embed");
  }}
</script>
</body>
</html>
"""


def main() -> None:
    now, departments, automations, dls, mermaid = collect()
    out = render(now, departments, automations, dls, mermaid)
    target = OPS / "dashboard.html"
    target.write_text(out, encoding="utf-8")
    print(f"✓ Dashboard erstellt: {target}")
    print(f"  Abteilungen: {len(departments)} · Automationen: {len(automations)} · Termine: {len(dls)}")
    print(f"  Im Browser öffnen: open '{target}'")


if __name__ == "__main__":
    main()
