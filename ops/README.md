# ops — Leitagent KiezQuiz

> **Start hier:** [`agents/ceo-kalle/leitstand.md`](agents/ceo-kalle/leitstand.md) — CEO-Status (Kalle liest das zu Session-Beginn).  
> **Pointer:** [`LEITSTAND.md`](LEITSTAND.md) · **Dashboard (Admin):** Profil → Admin → AI-Management

---

## Agenten-Betriebssystem (v2)

| Was | Wo |
|---|---|
| **CEO Kalle** | [`agents/ceo-kalle/`](agents/ceo-kalle/) |
| **Register (8 Agenten)** | [`agents/registry.json`](agents/registry.json) |
| **Reporting-Protokoll** | [`agents/PROTOKOLL.md`](agents/PROTOKOLL.md) |
| **Dashboard-Daten (JSON)** | [`dashboard-data.json`](dashboard-data.json) — `scripts/build_ai_dashboard_data.py` |

Jeder Agent hat **8 Dateien:** `leitstand.md`, `backlog.md`, `todos.md`, `memories.md`, `routinen.md`, `anweisungen.md`, `dashboard.md`, `reports.md`.

| Agent | Ordner | Rolle |
|---|---|---|
| 🕊️ Kalle | `ceo-kalle/` | CEO / Leitagent |
| 🛠️ CTO | `cto-ingenieur/` | Engineering |
| 💰 CFO | `cfo-finanzen/` | Finance |
| ⚖️ CLO | `clo-legal/` | Legal |
| 📈 CMO | `cmo-seo-growth/` | SEO & Growth |
| ⚙️ COO | `coo-operations/` | Ops & DevOps |
| 🔒 CSO | `cso-security/` | Security |
| 💬 CXO | `cxo-support-analytics/` | Support & Analytics |

---

## Querschnitt

| Datei | Inhalt |
|---|---|
| [ORGANIGRAMM.md](ORGANIGRAMM.md) | Gesamtüberblick — Agenten, MCPs, Automationen, Audit |
| [PLAYBOOK.md](PLAYBOOK.md) | Regelwerk für Kalle |
| [AUTOMATIONS.md](AUTOMATIONS.md) | Cursor-Automations (Cron + Prompts + Agenten-Dateien) |
| [DEADLINES.md](DEADLINES.md) | Fälligkeiten & Erinnerungen |
| [ROADMAP.md](ROADMAP.md) | Aufgeschobene Themen |
| [TECHSTACK.md](TECHSTACK.md) | Tech-Stack |
| [ZUGAENGE.md](ZUGAENGE.md) | Zugangs-Matrix |
| [finance/](finance/) | Service-Inventar, Kosten (CFO-Referenz) |
| [legal/](legal/) | Legal-Trigger, Koordination (CLO-Referenz) |
| [reports/](reports/) | Berichte der Fach-Agenten |

**Pflege:** Jeder Agent aktualisiert seine Akte bei Statusänderung — Kalle hält CEO-Akte + Pointer synchron.
