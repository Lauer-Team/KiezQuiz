# Leitstand — KiezQuiz

> **Pointer:** Der CEO-Leitstand lebt in **`ops/agents/ceo-kalle/leitstand.md`**.  
> **Dashboard:** Profil → Admin → AI-Management (JSON aus Agenten-Akten).  
> **Pflege:** Kalle · Stand: **2026-06-15**

---

## Schnellnavigation

| Was | Wo |
|---|---|
| **CEO / Gesamtstatus** | [`agents/ceo-kalle/leitstand.md`](agents/ceo-kalle/leitstand.md) |
| **Agenten-Register** | [`agents/registry.json`](agents/registry.json) |
| **Reporting-Protokoll** | [`agents/PROTOKOLL.md`](agents/PROTOKOLL.md) |
| **Organigramm (Audit)** | [`ORGANIGRAMM.md`](ORGANIGRAMM.md) |
| **Fälligkeiten** | [`DEADLINES.md`](DEADLINES.md) |
| **Automations** | [`AUTOMATIONS.md`](AUTOMATIONS.md) |
| **Dashboard-Daten (JSON)** | [`dashboard-data.json`](dashboard-data.json) — via `scripts/build_ai_dashboard_data.py` |

---

## Status-Kurzfassung (aus CEO-Akte)

| Bereich | Status |
|---|---|
| Kalle (CEO) | 🟢 8 Automations · JSON-Dashboard |
| Fach-Agenten (7) | 🟢 siehe `ops/agents/*/dashboard.md` |
| Telegram | ⏸️ pausiert |

**8 Automations live** · Details: [`agents/ceo-kalle/routinen.md`](agents/ceo-kalle/routinen.md)

---

## Glossar

| Begriff | In einem Satz |
|---|---|
| **Agenten-Akte** | Fester Ordner unter `ops/agents/<id>/` mit 8 Markdown-Dateien. |
| **Kalle** | CEO/Leitagent — ein Ansprechpartner. |
| **Dashboard** | Admin-UI liest `dashboard-data.json` aus Supabase Storage. |
| **Orchestrator** | Automation #7 — baut wöchentlich Dashboard-JSON neu. |

Vollständiges Glossar: [`agents/ceo-kalle/leitstand.md`](agents/ceo-kalle/leitstand.md) · Berichte: [`reports/`](reports/)
