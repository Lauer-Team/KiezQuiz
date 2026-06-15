#!/usr/bin/env python3
"""KiezQuiz — Dashboard-Daten aus Agenten-Akten (JSON).

Liest ops/agents/*/dashboard.md, registry.json, Fristen in ceo-kalle/todos.md
und schreibt ops/_generated/dashboard-data.json für Admin-UI + Supabase Upload.

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


def parse_dashboard_md(text: str) -> dict:
    out: dict = {
        "status": "⚪",
        "statusMessage": "",
        "todos": [],
        "automations": [],
        "reportsSummary": "",
        "heute": "",
    }
    m = re.search(r"\*\*Status:\*\*\s*([🟢🟡🔴⏸️⚪])", text)
    if m:
        out["status"] = m.group(1)
    m = re.search(r"\*\*Kurz:\*\*\s*(.+)", text)
    if m:
        out["statusMessage"] = m.group(1).strip()

    section = re.search(r"## Todos\s*\n(.*?)(?=\n## |\Z)", text, re.DOTALL)
    if section:
        for line in section.group(1).splitlines():
            line = line.strip()
            if line.startswith("- "):
                out["todos"].append(clean(line[2:]))

    auto_section = re.search(r"## Automations\s*\n(.*?)(?=\n## |\Z)", text, re.DOTALL)
    if auto_section:
        rows = find_table(auto_section.group(1), "#")
        if not rows:
            rows = find_table(auto_section.group(1), "Name")
        for row in rows:
            if len(row) >= 3:
                entry = {
                    "num": clean(row[0]) if len(row) > 3 else "",
                    "name": clean(row[1] if len(row) > 3 else row[0]),
                    "cron": clean(row[2] if len(row) > 3 else row[1]),
                    "task": clean(row[3] if len(row) > 3 else row[2]),
                }
                nr = next_run(entry["cron"], datetime.now(timezone.utc))
                entry["nextRun"] = fmt_de(nr) if nr else None
                out["automations"].append(entry)

    rep = re.search(r"## Berichte \(Kurz\)\s*\n(.*?)(?=\n## |\Z)", text, re.DOTALL)
    if rep:
        out["reportsSummary"] = clean(rep.group(1).strip().replace("\n", " "))

    heute = re.search(r"## Heute\s*\n(.*?)(?=\n## |\Z)", text, re.DOTALL)
    if heute:
        out["heute"] = heute.group(1).strip()

    return out


def parse_deadlines() -> list[dict]:
    text = read(AGENTS / "ceo-kalle" / "todos.md")
    m = re.search(r"## Fristen & Termine.*?\n(.*?)(?:\n## |\Z)", text, re.DOTALL | re.IGNORECASE)
    if m:
        text = m.group(1)
    items = []
    for row in find_table(text, "Fällig am"):
        if len(row) >= 7:
            items.append(
                {
                    "id": clean(row[0]),
                    "what": clean(row[1]),
                    "due": clean(row[2]),
                    "remind": clean(row[3]),
                    "who": clean(row[4]),
                    "status": first_status(row[5]),
                    "statusLabel": STATUS_LABEL.get(first_status(row[5]), "Aus"),
                    "note": clean(row[6]),
                }
            )
    return items


def parse_ceo_extras() -> dict:
    """Zusatzdaten aus CEO todos + DEADLINES für Mensch/Kalle."""
    ceo_todos = read(AGENTS / "ceo-kalle" / "todos.md")
    human: list[str] = []
    kalle: list[str] = []
    section = None
    for line in ceo_todos.splitlines():
        if line.startswith("## Offen (Kalle)"):
            section = "kalle"
            continue
        if line.startswith("## Offen (Mensch)"):
            section = "human"
            continue
        if line.startswith("## "):
            section = None
        if section and line.strip().startswith("- [ ]"):
            item = clean(line.strip()[6:])
            (human if section == "human" else kalle).append(item)

    approval = []
    m = re.search(r"## Wartet auf Freigabe\s*\n\n(.+?)(?:\n\n|\Z)", ceo_todos, re.DOTALL)
    if m:
        block = m.group(1).strip()
        block = re.sub(r"^-\s*", "", block)
        approval = [x.strip() for x in block.split("·") if x.strip()]

    return {"humanTodos": human, "kalleTodos": kalle, "approvalGates": approval}


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

    for ad in agent_defs:
        aid = ad["id"]
        folder = ROOT / ad.get("folder", f"ops/agents/{aid}")
        dash_path = folder / "dashboard.md"
        parsed = parse_dashboard_md(read(dash_path))

        entry = {
            "id": aid,
            "name": ad.get("displayName", aid),
            "role": ad.get("role", ""),
            "emoji": ad.get("emoji", ""),
            "ruleFile": ad.get("ruleFile"),
            "folder": ad.get("folder"),
            "status": parsed["status"],
            "statusLabel": STATUS_LABEL.get(parsed["status"], "Aus"),
            "statusMessage": parsed["statusMessage"],
            "todos": parsed["todos"],
            "automations": parsed["automations"],
            "reportsSummary": parsed["reportsSummary"],
            "heute": parsed["heute"],
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

    deadlines = parse_deadlines()
    open_deadlines = [d for d in deadlines if d["status"] in ("🔴", "🟡")]

    # Global automation schedule from CEO routinen
    all_autos: list[dict] = []
    routinen = read(AGENTS / "ceo-kalle" / "routinen.md")
    for row in find_table(routinen, "Cron"):
        if len(row) >= 4 and re.sub(r"\D", "", row[0]):
            cron = clean(row[2])
            nr = next_run(cron, now)
            all_autos.append(
                {
                    "num": clean(row[0]),
                    "name": clean(row[1]),
                    "cron": cron,
                    "task": clean(row[3]),
                    "nextRun": fmt_de(nr) if nr else None,
                    "daysUntil": (
                        (nr.astimezone(BERLIN).date() - now.astimezone(BERLIN).date()).days
                        if nr
                        else None
                    ),
                }
            )
    all_autos.sort(key=lambda a: a.get("daysUntil") if a.get("daysUntil") is not None else 999)

    org_chart = {
        "owner": {"label": "Du (Jeremiah)", "emoji": "👤"},
        "ceo": {"id": ceo_id, "label": ceo_data["name"] if ceo_data else "Kalle", "emoji": "🕊️"},
        "agents": [
            {"id": a["id"], "label": a["name"], "emoji": a["emoji"], "role": a["role"]}
            for a in agents_out
        ],
    }

    stats = {
        "automationsLive": len(all_autos),
        "agentsOk": sum(1 for a in agents_out if a["status"] == "🟢") + (1 if ceo_data and ceo_data["status"] == "🟢" else 0),
        "agentsTotal": len(agent_defs),
        "openDeadlines": len(open_deadlines),
    }

    return {
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
            "ops/agents/ceo-kalle/todos.md (Fristen)",
        ],
    }


def main() -> None:
    GENERATED.mkdir(parents=True, exist_ok=True)
    data = build()
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"✓ Dashboard-Daten: {OUT}")
    print(
        f"  Agenten: {len(data['agents'])} · CEO: {data['ceo']['id'] if data.get('ceo') else '—'} · "
        f"Termine offen: {data['stats']['openDeadlines']}"
    )


if __name__ == "__main__":
    main()
