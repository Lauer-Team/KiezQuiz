#!/usr/bin/env python3
"""KiezQuiz — Dashboard-Daten aus Agenten-Akten (JSON).

Liest ops/agents/*/dashboard.md, registry.json, Fristen in ceo-kalle/todos.md
und schreibt ops/_generated/dashboard-data.json für Admin-UI + Supabase Upload.

Neues Schema je dashboard.md (v3):
  **Status:** 🟢
  **Kurz:** …
  **Rolle:** laienverständliche Erklärung, was der Agent tut
  ## Kennzahlen   → Tabelle | Kennzahl | Wert | Status |
  ## Todos        → Tabelle | Aufgabe | Fällig | Priorität |  (Fallback: Bullet-Liste)
  ## Automations  → Tabelle | # | Name | Cron | Aufgabe |
  ## Berichte (Kurz)
  ## Heute

Aufruf:  python3 scripts/build_ai_dashboard_data.py
"""

from __future__ import annotations

import json
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
AGENTS = OPS / "agents"
REGISTRY = AGENTS / "registry.json"
GENERATED = OPS / "_generated"
OUT = GENERATED / "dashboard-data.json"

WD = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
MONTHS_DE = [
    "Jan", "Feb", "März", "Apr", "Mai", "Jun",
    "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
]

STATUS_LABEL = {
    "🟢": "OK",
    "🟡": "Anstehend",
    "🔴": "Dringend",
    "⏸️": "Pausiert",
    "⚪": "Aus",
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
            if rows:
                break
            continue
        cells = split_row(line)
        if all(set(c) <= {"-", ":", " "} for c in cells):
            continue
        rows.append(cells)
    return rows


def section(text: str, heading: str) -> str:
    """Inhalt zwischen '## heading' und der nächsten '## '-Überschrift."""
    m = re.search(rf"##\s+{re.escape(heading)}\s*\n(.*?)(?=\n## |\Z)", text, re.DOTALL)
    return m.group(1) if m else ""


def first_status(cell: str) -> str:
    for emoji in STATUS_LABEL:
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
    try:
        mins = parse_field(parts[0], 0, 59)
        hours = parse_field(parts[1], 0, 23)
        doms = parse_field(parts[2], 1, 31)
        months = parse_field(parts[3], 1, 12)
        dows = parse_field(parts[4], 0, 7)
    except ValueError:
        return None
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


def parse_due(text: str, now: datetime) -> dict:
    """Wandelt ein Fälligkeits-Feld in {raw, label, iso, daysUntil} um."""
    raw = clean(text)
    out = {"raw": raw, "label": raw, "iso": None, "daysUntil": None}
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", raw)
    if m:
        try:
            d = datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)), tzinfo=BERLIN)
        except ValueError:
            return out
        today = now.astimezone(BERLIN).date()
        days = (d.date() - today).days
        out["iso"] = d.date().isoformat()
        out["daysUntil"] = days
        out["label"] = f"{d.day:02d}. {MONTHS_DE[d.month - 1]} {d.year}"
    return out


def parse_spark(cell: str) -> list[float]:
    """Komma-getrennte Zahlen → Liste für Mini-Diagramm."""
    nums: list[float] = []
    for part in clean(cell).split(","):
        part = part.strip().replace("%", "").replace("€", "").strip()
        if not part:
            continue
        try:
            nums.append(float(part))
        except ValueError:
            return []
    return nums


SOURCE_LABEL = {
    "live": "live",
    "manuell": "manuell",
    "ausstehend": "Quelle ausstehend",
}


def source_kind(cell: str) -> dict:
    low = clean(cell).lower()
    if "ausstehend" in low or low in ("", "—", "-"):
        kind = "ausstehend" if "ausstehend" in low else ""
    elif "live" in low:
        kind = "live"
    elif "manuell" in low:
        kind = "manuell"
    else:
        kind = ""
    return {"kind": kind, "label": clean(cell) or ""}


def parse_kpis(text: str) -> list[dict]:
    """Tabelle | Kennzahl | Wert | Ziel | Status | Verlauf | Quelle |."""
    rows = find_table(text, "Kennzahl")
    kpis: list[dict] = []
    for row in rows:
        if len(row) < 2 or not clean(row[0]):
            continue
        target = clean(row[2]) if len(row) > 2 else ""
        status = first_status(row[3]) if len(row) > 3 else "⚪"
        spark = parse_spark(row[4]) if len(row) > 4 else []
        src = source_kind(row[5]) if len(row) > 5 else {"kind": "", "label": ""}
        kpis.append(
            {
                "label": clean(row[0]),
                "value": clean(row[1]),
                "target": "" if target in ("—", "-") else target,
                "status": status,
                "statusLabel": STATUS_LABEL.get(status, "Aus"),
                "spark": spark,
                "source": src["kind"],
                "sourceLabel": src["label"],
            }
        )
    return kpis


def parse_projects(text: str) -> list[dict]:
    """Tabelle | Projekt | Status | Fortschritt | Termin |."""
    rows = find_table(text, "Projekt")
    projects: list[dict] = []
    for row in rows:
        if len(row) < 1 or not clean(row[0]):
            continue
        prog_raw = clean(row[2]) if len(row) > 2 else ""
        m = re.search(r"(\d+)", prog_raw)
        progress = int(m.group(1)) if m else 0
        projects.append(
            {
                "title": clean(row[0]),
                "status": clean(row[1]) if len(row) > 1 else "",
                "progress": progress,
                "due": clean(row[3]) if len(row) > 3 else "",
            }
        )
    return projects


def parse_automations(text: str, now: datetime) -> list[dict]:
    rows = find_table(text, "#")
    if not rows:
        rows = find_table(text, "Name")
    autos: list[dict] = []
    for row in rows:
        if len(row) >= 3:
            wide = len(row) > 3
            name = clean(row[1] if wide else row[0])
            if not name:
                continue
            cron = clean(row[2] if wide else row[1])
            entry = {
                "num": clean(row[0]) if wide else "",
                "name": name,
                "cron": cron,
                "task": clean(row[3] if wide else row[2]),
            }
            nr = next_run(cron, now) if re.match(r"^[\d*/,\- ]+$", cron) else None
            entry["nextRun"] = fmt_de(nr) if nr else None
            entry["daysUntil"] = (
                (nr.astimezone(BERLIN).date() - now.astimezone(BERLIN).date()).days
                if nr
                else None
            )
            autos.append(entry)
    return autos


def parse_dashboard_md(text: str, now: datetime) -> dict:
    out: dict = {
        "status": "⚪",
        "lage": "",
        "roleExplain": "",
        "kpis": [],
        "projects": [],
        "automations": [],
    }
    m = re.search(r"\*\*Status:\*\*\s*([🟢🟡🔴⏸️⚪])", text)
    if m:
        out["status"] = m.group(1)
    m = re.search(r"\*\*Lage:\*\*\s*(.+)", text) or re.search(r"\*\*Kurz:\*\*\s*(.+)", text)
    if m:
        out["lage"] = clean(m.group(1).strip())
    m = re.search(r"\*\*Rolle:\*\*\s*(.+)", text)
    if m:
        out["roleExplain"] = clean(m.group(1).strip())

    out["kpis"] = parse_kpis(section(text, "KPIs"))
    out["projects"] = parse_projects(section(text, "Projekte"))
    out["automations"] = parse_automations(section(text, "Automations"), now)
    return out


def parse_deadlines(now: datetime) -> list[dict]:
    text = read(AGENTS / "ceo-kalle" / "todos.md")
    m = re.search(r"## Fristen & Termine.*?\n(.*?)(?:\n## |\Z)", text, re.DOTALL | re.IGNORECASE)
    if m:
        text = m.group(1)
    items = []
    for row in find_table(text, "Fällig am"):
        if len(row) >= 7:
            due = parse_due(row[2], now)
            items.append(
                {
                    "id": clean(row[0]),
                    "what": clean(row[1]),
                    "due": due["label"],
                    "dueIso": due["iso"],
                    "daysUntil": due["daysUntil"],
                    "remind": clean(row[3]),
                    "who": clean(row[4]),
                    "status": first_status(row[5]),
                    "statusLabel": STATUS_LABEL.get(first_status(row[5]), "Aus"),
                    "note": clean(row[6]),
                }
            )
    items.sort(key=lambda d: (d["dueIso"] is None, d["dueIso"] or "9999"))
    return items


def parse_ceo_extras() -> dict:
    """Mensch-Aufgaben + Freigaben aus CEO todos.md."""
    ceo_todos = read(AGENTS / "ceo-kalle" / "todos.md")
    human: list[str] = []
    section_name = None
    for line in ceo_todos.splitlines():
        if line.startswith("## Offen (Mensch)"):
            section_name = "human"
            continue
        if line.startswith("## "):
            section_name = None
        if section_name == "human" and line.strip().startswith("- [ ]"):
            human.append(clean(line.strip()[6:]))

    approval = []
    m = re.search(r"## Wartet auf Freigabe\s*\n\n(.+?)(?:\n\n|\Z)", ceo_todos, re.DOTALL)
    if m:
        block = m.group(1).strip()
        block = re.sub(r"^-\s*", "", block)
        approval = [x.strip() for x in block.split("·") if x.strip()]

    return {"humanTodos": human, "approvalGates": approval}


def load_registry() -> dict:
    return json.loads(read(REGISTRY))


def build() -> dict:
    now = datetime.now(timezone.utc)
    reg = load_registry()
    ceo_id = reg.get("ceoId", "ceo-kalle")
    agent_defs = reg.get("agents", [])

    agents_out: list[dict] = []
    ceo_data: dict | None = None
    org_children: list[str] = []
    automations_index: dict[str, dict] = {}

    for ad in agent_defs:
        aid = ad["id"]
        folder = ROOT / ad.get("folder", f"ops/agents/{aid}")
        parsed = parse_dashboard_md(read(folder / "dashboard.md"), now)

        entry = {
            "id": aid,
            "name": ad.get("displayName", aid),
            "role": ad.get("role", ""),
            "emoji": ad.get("emoji", ""),
            "ruleFile": ad.get("ruleFile"),
            "folder": ad.get("folder"),
            "status": parsed["status"],
            "statusLabel": STATUS_LABEL.get(parsed["status"], "Aus"),
            "lage": parsed["lage"],
            "roleExplain": parsed["roleExplain"],
            "kpis": parsed["kpis"],
            "projects": parsed["projects"],
            "automations": parsed["automations"],
        }

        # Globale Automationen aus allen Agenten aggregieren (mit Cron + nextRun)
        for a in parsed["automations"]:
            if not a.get("cron") or not re.match(r"^[\d*/,\- ]+$", a["cron"]):
                continue
            key = f"{a.get('num') or ''}|{a['name']}"
            if key not in automations_index:
                automations_index[key] = {
                    **a,
                    "ownerId": aid,
                    "ownerName": ad.get("displayName", aid),
                    "ownerEmoji": ad.get("emoji", ""),
                }

        if aid == ceo_id:
            extras = parse_ceo_extras()
            entry["humanTodos"] = extras["humanTodos"]
            entry["approvalGates"] = extras["approvalGates"]
            ceo_data = entry
        else:
            org_children.append(aid)
            agents_out.append(entry)

    if ceo_data:
        ceo_data["orgChildren"] = org_children

    deadlines = parse_deadlines(now)
    open_deadlines = [d for d in deadlines if d["status"] in ("🔴", "🟡")]

    all_autos = list(automations_index.values())
    all_autos.sort(key=lambda a: a.get("daysUntil") if a.get("daysUntil") is not None else 999)

    org_chart = {
        "owner": {"label": "Du (Jeremiah)", "emoji": "👤"},
        "ceo": {"id": ceo_id, "label": ceo_data["name"] if ceo_data else "Kalle", "emoji": "🕊️"},
        "agents": [
            {"id": a["id"], "label": a["name"], "emoji": a["emoji"], "role": a["role"]}
            for a in agents_out
        ],
    }

    all_agents = ([ceo_data] if ceo_data else []) + agents_out
    stats = {
        "automationsLive": len(all_autos),
        "agentsOk": sum(1 for a in all_agents if a["status"] == "🟢"),
        "agentsTotal": len(agent_defs),
        "openDeadlines": len(open_deadlines),
        "yourTasks": (len(ceo_data["humanTodos"]) + len(ceo_data["approvalGates"])) if ceo_data else 0,
    }

    return {
        "schema": 4,
        "generatedAt": now.isoformat(),
        "generatedAtDe": now.astimezone(BERLIN).strftime("%A, %d.%m.%Y · %H:%M Uhr"),
        "version": reg.get("version", 1),
        "ceo": ceo_data,
        "agents": agents_out,
        "deadlines": deadlines,
        "openDeadlines": open_deadlines,
        "automationsGlobal": all_autos,
        "orgChart": org_chart,
        "stats": stats,
        "sources": [
            "ops/agents/*/dashboard.md",
            "ops/agents/registry.json",
            "ops/agents/ceo-kalle/todos.md (Fristen + Mensch-Aufgaben)",
        ],
    }


def main() -> None:
    GENERATED.mkdir(parents=True, exist_ok=True)
    data = build()
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"✓ Dashboard-Daten: {OUT}")
    print(
        f"  Agenten: {len(data['agents'])} · CEO: {data['ceo']['id'] if data.get('ceo') else '—'} · "
        f"Automationen: {data['stats']['automationsLive']} · "
        f"Termine offen: {data['stats']['openDeadlines']}"
    )


if __name__ == "__main__":
    main()
