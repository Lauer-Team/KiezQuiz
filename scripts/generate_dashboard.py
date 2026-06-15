#!/usr/bin/env python3
"""KiezQuiz — Dashboard-Generator (One-Stop-Shop).

Liest ops/LEITSTAND.md, ops/DEADLINES.md, ops/ROADMAP.md,
berechnet Cron-Termine und baut ops/dashboard.html.

Aufruf:  python3 scripts/generate_dashboard.py
"""

from __future__ import annotations

import html
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    from zoneinfo import ZoneInfo

    BERLIN = ZoneInfo("Europe/Berlin")
except Exception:
    BERLIN = timezone(timedelta(hours=2))

ROOT = Path(__file__).resolve().parent.parent
OPS = ROOT / "ops"

WD = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]

STATUS_COLOR = {
    "🟢": ("#1a7f37", "#e6f4ea", "OK"),
    "🟡": ("#9a6700", "#fff8e1", "Anstehend"),
    "🔴": ("#cf222e", "#ffebe9", "Dringend"),
    "⏸️": ("#57606a", "#eef1f4", "Pausiert"),
    "⚪": ("#57606a", "#eef1f4", "Aus"),
}


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.exists() else ""


def split_row(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def find_table(text: str, header_contains: str) -> list[list[str]]:
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
        if all(set(c) <= {"-", ":", " "} for c in cells):
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
        cron_dow = t.isoweekday() % 7
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


def parse_section_paragraph(text: str, heading: str) -> str:
    pattern = rf"## {re.escape(heading)}\n\n(.+?)\n\n---"
    m = re.search(pattern, text, re.DOTALL)
    return m.group(1).strip() if m else ""


def split_task_bullets(text: str) -> list[str]:
    """Kommagetrennte Aufgaben — Kommas in Klammern bleiben dran."""
    items: list[str] = []
    current: list[str] = []
    depth = 0
    for ch in text:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch == "," and depth == 0:
            piece = "".join(current).strip()
            if piece:
                items.append(piece)
            current = []
        else:
            current.append(ch)
    tail = "".join(current).strip()
    if tail:
        items.append(tail)
    return items or [text]


def expand_role_tasks(role_tasks: dict[str, list[str]]) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for key, tasks in role_tasks.items():
        expanded: list[str] = []
        for task in tasks:
            expanded.extend(split_task_bullets(task))
        out[key] = expanded
    return out


def parse_role_tasks(leit: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {"du": [], "kalle": [], "du_optional": []}
    for row in find_table(leit, "Wer"):
        if len(row) < 2:
            continue
        who, task = clean(row[0]), clean(row[1])
        if who.startswith("**Du (optional)**") or who == "Du (optional)":
            out["du_optional"].append(task)
        elif "Du" in who:
            out["du"].append(task)
        elif "Kalle" in who:
            out["kalle"].append(task)
    return out


def parse_approval_gates(leit: str) -> list[str]:
    block = parse_section_paragraph(leit, "5. Wartet auf deine Freigabe")
    if not block:
        return []
    return [x.strip() for x in block.split("·") if x.strip()]


def parse_backlog(leit: str) -> list[dict]:
    items = []
    for row in find_table(leit, "Priorität"):
        if len(row) >= 4:
            items.append(
                {
                    "topic": clean(row[0]),
                    "benefit": clean(row[1]),
                    "effort": clean(row[2]),
                    "priority": clean(row[3]),
                }
            )
    return items


def parse_roadmap(text: str) -> list[dict]:
    items = []
    in_done = False
    for line in text.splitlines():
        if line.startswith("## Erledigt"):
            in_done = True
            continue
        if line.startswith("## ") and "Erledigt" not in line:
            in_done = False
        if not line.strip().startswith("|") or line.strip().startswith("|--"):
            continue
        cells = split_row(line)
        if len(cells) < 3:
            continue
        rid = clean(cells[0])
        if not re.match(r"R\d+[a-z]?", rid):
            continue
        if in_done:
            continue
        items.append(
            {
                "id": rid,
                "topic": clean(cells[1]),
                "next": clean(cells[2]),
                "ref": clean(cells[3]) if len(cells) > 3 else "",
            }
        )
    return items


def dept_short_name(name: str) -> str:
    name = re.sub(r"\(.*?\)", "", name).strip()
    name = name.replace("Leitagent (Kalle)", "Leitagent")
    return name.split("/")[0].strip()


def collect():
    now = datetime.now(timezone.utc)
    leit = read(OPS / "LEITSTAND.md")
    deadlines = read(OPS / "DEADLINES.md")
    roadmap = read(OPS / "ROADMAP.md")

    departments = []
    for row in find_table(leit, "Abteilung"):
        if len(row) >= 3:
            departments.append(
                {"name": clean(row[0]), "status": first_status(row[1]), "note": clean(row[2])}
            )

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

    role_tasks = expand_role_tasks(parse_role_tasks(leit))
    approval_gates = parse_approval_gates(leit)
    backlog = parse_backlog(leit)
    roadmap_items = parse_roadmap(roadmap)

    return now, departments, automations, dls, role_tasks, approval_gates, backlog, roadmap_items


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def status_badge(emoji: str) -> str:
    fg, bg, label = STATUS_COLOR.get(emoji, STATUS_COLOR["⚪"])
    return f'<span class="badge" style="color:{fg};background:{bg}">{emoji} {label}</span>'


def render_todo_list(items: list[str], empty: str) -> str:
    if not items:
        return f'<p class="muted empty">{esc(empty)}</p>'
    return "<ul>" + "".join(f"<li>{esc(i)}</li>" for i in items) + "</ul>"


def render_simple_org(departments: list[dict], automations: list[dict]) -> str:
    fach = [d for d in departments if "Leitagent" not in d["name"] and d["status"] != "⏸️"]
    paused = [d for d in departments if d["status"] == "⏸️"]
    team_pills = "".join(
        f'<span class="org-pill" title="{esc(d["note"])}">{status_badge(d["status"])} {esc(dept_short_name(d["name"]))}</span>'
        for d in fach
    )
    auto_pills = "".join(
        f'<span class="org-pill org-pill--auto">{esc(a["name"])}</span>' for a in automations[:8]
    )
    paused_note = ""
    if paused:
        paused_note = (
            '<p class="org-foot muted">Pausiert: '
            + ", ".join(esc(dept_short_name(d["name"])) for d in paused)
            + "</p>"
        )

    return f"""
    <div class="org-simple">
      <div class="org-step">
        <div class="org-box org-box--you">
          <strong>👤 Du</strong>
          <span>Entscheidungen & Freigaben (Deploy, Geld, Recht, DNS)</span>
        </div>
      </div>
      <div class="org-connector" aria-hidden="true">↓</div>
      <div class="org-step">
        <div class="org-box org-box--kalle">
          <strong>🕊️ Kalle</strong>
          <span>Leitagent — dein einziger Ansprechpartner, koordiniert alles</span>
        </div>
      </div>
      <div class="org-connector" aria-hidden="true">↓ koordiniert</div>
      <div class="org-step">
        <p class="org-label">Fach-Teams (spezialisierte KI-Rollen)</p>
        <div class="org-pills">{team_pills}</div>
      </div>
      <div class="org-step">
        <p class="org-label">8 Automations — laufen von allein nach Plan</p>
        <div class="org-pills org-pills--wrap">{auto_pills}</div>
      </div>
      {paused_note}
      <p class="org-foot muted">Vollständiges Audit-Diagramm: <code>ops/ORGANIGRAMM.md</code></p>
    </div>"""


def render(now, departments, automations, dls, role_tasks, approval_gates, backlog, roadmap_items) -> str:
    gen = now.astimezone(BERLIN).strftime("%A, %d.%m.%Y · %H:%M Uhr")

    open_dls = [d for d in dls if d["status"] in ("🔴", "🟡")]
    open_dls.sort(key=lambda d: d["due"])
    ok_depts = sum(1 for d in departments if d["status"] == "🟢")

    du_deadlines = [d for d in open_dls if "Du" in d["who"]]
    kalle_deadlines = [d for d in open_dls if "Kalle" in d["who"]]

    def deadline_li(d: dict) -> str:
        days_txt = ""
        try:
            due_dt = datetime.strptime(d["due"], "%Y-%m-%d").replace(tzinfo=BERLIN)
            delta = (due_dt.date() - now.astimezone(BERLIN).date()).days
            days_txt = f" <span class='muted'>(in {delta} Tg.)</span>"
        except ValueError:
            pass
        return (
            f"<li>{status_badge(d['status'])} <strong>{esc(d['what'])}</strong> "
            f"— {esc(d['due'])}{days_txt}"
            f"<br><span class='muted'>{esc(d['note'])}</span></li>"
        )

    scheduled_items = []
    for a in automations:
        scheduled_items.append(
            f"<li><span class='badge' style='color:#0969da;background:#ddf4ff'>⏰ Auto</span> "
            f"<strong>{esc(a['name'])}</strong> — {esc(a['next_str'])} "
            f"<span class='muted'>({a['days']} Tg.)</span></li>"
        )
    for d in open_dls:
        scheduled_items.append(deadline_li(d))

    scheduled_html = (
        "".join(scheduled_items)
        if scheduled_items
        else "<li class='muted'>Nichts Dringendes in den nächsten 7 Tagen.</li>"
    )

    du_todos = list(role_tasks["du"])
    du_todos.extend(f"Freigabe: {g}" for g in approval_gates)
    for d in du_deadlines:
        du_todos.append(f"{d['what']} (fällig {d['due']})")

    kalle_todos = list(role_tasks["kalle"])
    for d in kalle_deadlines:
        kalle_todos.append(f"{d['what']} (fällig {d['due']})")

    optional_html = render_todo_list(
        role_tasks["du_optional"],
        "Keine optionalen Aufgaben.",
    )

    roadmap_html = (
        "".join(
            f"<li><strong>{esc(r['id'])}</strong> {esc(r['topic'])} — "
            f"<span class='muted'>{esc(r['next'])}</span></li>"
            for r in roadmap_items
        )
        if roadmap_items
        else "<li class='muted'>Roadmap leer.</li>"
    )

    backlog_html = (
        "".join(
            f"<li><strong>{esc(b['topic'])}</strong> "
            f"<span class='muted'>({esc(b['priority'])})</span></li>"
            for b in backlog
            if "aufgeschoben" in b["priority"].lower() or "pausiert" in b["priority"].lower()
        )
        or ""
    )

    dept_compact = "".join(
        f"""<div class="status-chip" title="{esc(d['note'])}">
          {status_badge(d['status'])} <strong>{esc(dept_short_name(d['name']))}</strong>
        </div>"""
        for d in departments
    )

    auto_rows = "".join(
        f"""<tr>
          <td><strong>{esc(a['name'])}</strong><br><span class="muted">{esc(a['task'])}</span></td>
          <td>{esc(a['next_str'])}</td>
          <td class="center">{a['days'] if a['days'] is not None else '—'}</td>
        </tr>"""
        for a in automations
    )

    repo_base = "https://github.com/logic3/KiezQuiz/blob/main/ops"
    links = [
        ("Leitstand", f"{repo_base}/LEITSTAND.md"),
        ("Organigramm (Audit)", f"{repo_base}/ORGANIGRAMM.md"),
        ("Fälligkeiten", f"{repo_base}/DEADLINES.md"),
        ("Roadmap", f"{repo_base}/ROADMAP.md"),
        ("Automations", f"{repo_base}/AUTOMATIONS.md"),
        ("Berichte", f"{repo_base}/reports/"),
    ]
    link_items = "".join(
        f'<a class="linkchip" href="{esc(href)}" target="_blank" rel="noopener">{esc(label)}</a>'
        for label, href in links
    )

    org_html = render_simple_org(departments, automations)

    stats = f"""
    <div class="stats">
      <div class="stat"><span class="stat-num">{len(automations)}</span><span class="stat-label">Automations live</span></div>
      <div class="stat"><span class="stat-num">{ok_depts}/{len(departments)}</span><span class="stat-label">Teams OK</span></div>
      <div class="stat"><span class="stat-num">{len(open_dls)}</span><span class="stat-label">Termine offen</span></div>
      <div class="stat"><span class="stat-num">{len(roadmap_items)}</span><span class="stat-label">Später geplant</span></div>
    </div>"""

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KiezQuiz — AI-Management Dashboard</title>
<style>
  :root {{ --bg:#f6f8fa; --fg:#1f2328; --muted:#57606a; --line:#d0d7de; --card:#fff; --accent:#0969da; }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:var(--fg); background:var(--bg); }}
  header {{ background:linear-gradient(135deg,#0969da,#1a7f37); color:#fff; padding:22px 24px; }}
  header h1 {{ margin:0 0 4px; font-size:22px; }}
  header p {{ margin:0; opacity:.92; font-size:14px; }}
  main {{ max-width:1100px; margin:0 auto; padding:20px 24px 32px; }}
  section {{ margin-bottom:28px; }}
  h2 {{ font-size:17px; margin:0 0 12px; border-bottom:2px solid var(--line); padding-bottom:6px; }}
  h3 {{ font-size:14px; margin:0 0 8px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; }}
  .stats {{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }}
  .stat {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px 14px; text-align:center; }}
  .stat-num {{ display:block; font-size:22px; font-weight:700; color:var(--accent); }}
  .stat-label {{ font-size:12px; color:var(--muted); }}
  .three {{ display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }}
  .panel {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px 16px; height:100%; }}
  .panel h2 {{ font-size:15px; border:0; padding:0; margin:0 0 10px; text-transform:none; letter-spacing:0; color:var(--fg); }}
  .panel ul {{ margin:0; padding-left:18px; }}
  .panel li {{ margin:6px 0; font-size:14px; }}
  .panel .empty {{ margin:0; font-size:14px; }}
  .badge {{ display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; white-space:nowrap; }}
  .status-row {{ display:flex; flex-wrap:wrap; gap:8px; }}
  .status-chip {{ display:inline-flex; align-items:center; gap:6px; background:var(--card); border:1px solid var(--line); border-radius:999px; padding:5px 12px; font-size:13px; }}
  table {{ width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; }}
  th, td {{ text-align:left; padding:9px 12px; border-bottom:1px solid var(--line); vertical-align:top; font-size:14px; }}
  th {{ background:#f0f3f6; font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }}
  td.center {{ text-align:center; }}
  .muted {{ color:var(--muted); }}
  code {{ background:#eef1f4; padding:1px 6px; border-radius:5px; font-size:12px; }}
  .linkchip {{ display:inline-block; margin:4px 6px 0 0; padding:6px 11px; background:var(--card); border:1px solid var(--line); border-radius:8px; color:var(--accent); text-decoration:none; font-size:13px; }}
  .linkchip:hover {{ border-color:var(--accent); }}
  .org-simple {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:20px; text-align:center; }}
  .org-step {{ margin:8px 0; }}
  .org-box {{ display:inline-block; text-align:left; border-radius:10px; padding:12px 18px; max-width:420px; border:2px solid var(--line); }}
  .org-box strong {{ display:block; font-size:16px; margin-bottom:4px; }}
  .org-box span {{ font-size:13px; color:var(--muted); }}
  .org-box--you {{ border-color:#8250df; background:#fbefff; }}
  .org-box--kalle {{ border-color:#0969da; background:#ddf4ff; }}
  .org-connector {{ color:var(--muted); font-size:18px; line-height:1.2; }}
  .org-label {{ margin:0 0 8px; font-size:13px; color:var(--muted); }}
  .org-pills {{ display:flex; flex-wrap:wrap; gap:8px; justify-content:center; }}
  .org-pill {{ display:inline-flex; align-items:center; gap:4px; background:#f6f8fa; border:1px solid var(--line); border-radius:999px; padding:5px 11px; font-size:12px; }}
  .org-pill--auto {{ background:#fff; }}
  .org-foot {{ margin:12px 0 0; font-size:12px; }}
  footer {{ text-align:center; color:var(--muted); font-size:12px; padding:20px; }}
  body.is-embed header, body.is-embed footer {{ display:none; }}
  body.is-embed main {{ max-width:none; padding:0; }}
  body.is-embed .stats {{ grid-template-columns:repeat(2,1fr); }}
  @media (max-width:900px) {{ .three, .stats {{ grid-template-columns:1fr; }} }}
</style>
</head>
<body>
<header>
  <h1>🕊️ KiezQuiz — AI-Management</h1>
  <p>Stand: {esc(gen)} · Quellen: LEITSTAND · DEADLINES · ROADMAP</p>
</header>
<main>

  {stats}

  <section>
    <h2>📋 Dein Überblick — Todos & Termine</h2>
    <div class="three">
      <div class="panel">
        <h2>👤 Deine Aufgaben</h2>
        {render_todo_list(du_todos, "Alles erledigt — nichts Offenes für dich.")}
        <h3>Optional</h3>
        {optional_html}
      </div>
      <div class="panel">
        <h2>📅 Geplant (Termine & Automationen)</h2>
        <ul>{scheduled_html}</ul>
      </div>
      <div class="panel">
        <h2>📦 Später / aufgeschoben</h2>
        <ul>{roadmap_html}</ul>
        {"<h3>Backlog</h3><ul>" + backlog_html + "</ul>" if backlog_html else ""}
      </div>
    </div>
  </section>

  <section>
    <h2>🕊️ Kalles laufende Aufgaben</h2>
    <div class="panel" style="max-width:720px">
      {render_todo_list(kalle_todos, "Kalle hat keine offenen Termine.")}
    </div>
  </section>

  <section>
    <h2>🚦 Status — alle Teams auf einen Blick</h2>
    <div class="status-row">{dept_compact}</div>
  </section>

  <section>
    <h2>🗺️ Wer macht was? (vereinfacht)</h2>
    {org_html}
  </section>

  <section>
    <h2>⏰ Automations — wann läuft was?</h2>
    <table>
      <thead><tr><th>Was passiert</th><th>Nächster Lauf</th><th>in Tagen</th></tr></thead>
      <tbody>{auto_rows}</tbody>
    </table>
  </section>

  <section>
    <h2>🔗 Quellen öffnen</h2>
    {link_items}
  </section>

</main>
<footer>
  Erzeugt von <code>scripts/generate_dashboard.py</code> · Aktualisieren: Profil → Admin → „Dashboard aktualisieren"
</footer>
<script>
  if (new URLSearchParams(location.search).get("embed") === "1") {{
    document.body.classList.add("is-embed");
  }}
</script>
</body>
</html>
"""


def main() -> None:
    data = collect()
    out = render(*data)
    target = OPS / "dashboard.html"
    target.write_text(out, encoding="utf-8")
    _, departments, automations, dls, _, _, _, roadmap_items = data
    print(f"✓ Dashboard erstellt: {target}")
    print(
        f"  Teams: {len(departments)} · Automations: {len(automations)} · "
        f"Termine: {len(dls)} · Roadmap: {len(roadmap_items)}"
    )


if __name__ == "__main__":
    main()
