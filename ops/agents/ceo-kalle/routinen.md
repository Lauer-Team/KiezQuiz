# Routinen — Kalle (CEO)

> Cursor-Automations + GitHub Actions · Stand aus Migration

# Cursor Automations — KiezQuiz

> Fertige Config-Blöcke zum Einfügen auf [cursor.com/automations](https://cursor.com/automations).  
> **Wichtig:** Jede Automation legt nur **Berichte/PRs** vor — nie direkt auf `main` mergen.  
> **Agenten-Akten:** Jede Automation muss die genannten Dateien unter `ops/agents/<id>/` aktualisieren (siehe Spalte „Agenten-Dateien").

## So legst du eine Automation an

1. [cursor.com/automations](https://cursor.com/automations) → **New Automation**
2. Trigger: **Schedule** → Cron eintragen (siehe unten)
3. Repository: **Lauer-Team/KiezQuiz** · Branch: `main`
4. Anweisung (Prompt) einfügen
5. MCPs + Modell wählen → **Save**
6. Mir Bescheid sagen: „Automation X angelegt"

---

## Agenten-Dateien — Übersicht

| Automation | Agent | Pflicht-Dateien |
|---|---|---|
| #0 Backup Archiv | COO | `coo-operations/dashboard.md`, `leitstand.md`, `reports.md` |
| #1 Uptime Smoke | COO | `coo-operations/dashboard.md`, `leitstand.md`, `reports.md` |
| #2 Security Weekly | CSO | `cso-security/dashboard.md`, `leitstand.md`, `reports.md` |
| #3 SEO Weekly | CMO | `cmo-seo-growth/dashboard.md`, `leitstand.md`, `reports.md` |
| #4 Ops Weekly | CEO | `ceo-kalle/dashboard.md`, `todos.md`, `DEADLINES.md` |
| #5 Finance Monthly | CFO | `cfo-finanzen/dashboard.md`, `leitstand.md`, `ops/agents/cfo-finanzen/*`, `reports.md` |
| #6 Support Monthly | CXO | `cxo-support-analytics/dashboard.md`, `leitstand.md`, `reports.md` |
| #7 Orchestrator | CEO | `ceo-kalle/*`, `build_ai_dashboard_data.py`, alle Fach-`dashboard.md` prüfen |

Berichte immer nach: `reports/YYYY-MM-DD-<thema>.md`

---

## 0. Backup ins Supplement-Archiv (COO — monatlich)

| | |
|---|---|
| **Name** | KiezQuiz — Backup Archiv Sync |
| **Cron** | `0 10 2 * *` |
| **Modell** | Composer |
| **Agenten-Dateien** | `ops/agents/coo-operations/dashboard.md`, `leitstand.md`, `reports.md` |

**Anweisung:**

```
Du bist Oskar (COO) für KiezQuiz (.cursor/rules/20-devops-monitoring.mdc).

1. python3 scripts/sync_supabase_backup_artifact.py
2. Bericht reports/YYYY-MM-DD-backup-archiv.md
3. Aktualisiere ops/agents/coo-operations/dashboard.md + leitstand.md + reports.md
4. CEO-Akte: ops/agents/ceo-kalle/leitstand.md — Supabase-Backup auf grün falls OK

Bei Fehler: Ursache in Bericht, Mensch nur wenn gh auth fehlt.
```

---

## 1. Uptime & Smoke-Check (COO)

| | |
|---|---|
| **Name** | KiezQuiz — Uptime Smoke Check |
| **Cron** | `0 8 * * 1-5` |
| **Agenten-Dateien** | `ops/agents/coo-operations/dashboard.md`, `leitstand.md`, `reports.md` |

**Anweisung:**

```
Du bist Oskar (COO) (.cursor/rules/20-devops-monitoring.mdc).

Prüfe live: kiezquiz.de/version.json, /, /hamburg/, robots.txt, sitemap.xml, kiezquiz.lauer.team (301).

Bericht reports/YYYY-MM-DD-devops-smoke-check.md
Aktualisiere ops/agents/coo-operations/dashboard.md + leitstand.md + reports.md

Bei rot: Fix-PR vorschlagen, nicht mergen.
```

---

## 2. Security-Scan (CSO — wöchentlich)

| | |
|---|---|
| **Name** | KiezQuiz — Security Weekly |
| **Cron** | `0 7 * * 1` |
| **Agenten-Dateien** | `ops/agents/cso-security/dashboard.md`, `leitstand.md`, `reports.md` |

**Anweisung:**

```
Du bist Samira (CSO) (.cursor/rules/30-security.mdc).

1. Dependabot-Alerts prüfen
2. Supabase MCP: get_advisors — Security-Hinweise
3. Bericht reports/YYYY-MM-DD-security-weekly.md
4. ops/agents/cso-security/dashboard.md + leitstand.md + reports.md

Kritische Fixes: Branch+PR, nicht mergen.
```

---

## 3. SEO-Wochenbriefing (CMO)

| | |
|---|---|
| **Name** | KiezQuiz — SEO Weekly Brief |
| **Cron** | `0 9 * * 1` |
| **Agenten-Dateien** | `ops/agents/cmo-seo-growth/dashboard.md`, `leitstand.md`, `reports.md` |

**Anweisung:**

```
Du bist Maja (CMO) (.cursor/rules/10-seo.mdc).

Prüfe: sitemap.xml, robots.txt, node scripts/test_seo_compat.js, Stadtseiten.

Bericht reports/YYYY-MM-DD-seo-weekly.md
GSC manuell-Hinweis: docs/GSC-MANUAL-CHECK.md
Aktualisiere ops/agents/cmo-seo-growth/dashboard.md + leitstand.md + reports.md
```

---

## 4. Ops Weekly Review (CEO — Fälligkeiten)

| | |
|---|---|
| **Name** | KiezQuiz — Ops Weekly Review |
| **Cron** | `0 7 * * 1` |
| **Agenten-Dateien** | `ops/agents/ceo-kalle/dashboard.md`, `todos.md`, `ops/agents/ceo-kalle/todos.md` |

**Anweisung:**

```
Du bist Kalle (CEO). ops/agents/PROTOKOLL.md beachten.

1. ops/agents/ceo-kalle/todos.md — Status 🔴/🟡 aktualisieren
2. ops/agents/clo-legal/backlog.md Kurzüberblick
3. Bericht reports/YYYY-MM-DD-ops-weekly.md
4. ops/agents/ceo-kalle/dashboard.md + todos.md aktualisieren
5. ops/agents/ceo-kalle/leitstand.md Pointer prüfen

Ab 2026-07-12: D4 → deactivate_terms_notice.py erinnern.
```

---

## 5. Finance Monthly (CFO)

| | |
|---|---|
| **Name** | KiezQuiz — Finance Monthly |
| **Cron** | `0 8 1 * *` |
| **Agenten-Dateien** | `ops/agents/cfo-finanzen/*`, `leitstand.md (SERVICES)`, `COSTS.md` |

**Anweisung:**

```
Du bist CFO (.cursor/rules/40-finance.mdc).

1. leitstand.md (SERVICES) + COSTS.md prüfen
2. Supabase MCP: Quotas
3. Bericht reports/YYYY-MM-DD-finance-monthly.md
4. ops/agents/cfo-finanzen/dashboard.md + leitstand.md + reports.md
5. Bei Quota >70%: ceo-kalle/dashboard.md warnen

Keine Upgrades ohne Menschen-OK.
```

---

## 6. Support Monthly (CXO)

| | |
|---|---|
| **Name** | KiezQuiz — Support Monthly |
| **Cron** | `0 10 1 * *` |
| **Agenten-Dateien** | `ops/agents/cxo-support-analytics/dashboard.md`, `leitstand.md`, `reports.md` |

**Anweisung:**

```
Du bist Xenia (CXO) (.cursor/rules/50-support-analytics.mdc).

1. Supabase: city_wish_requests aggregiert (keine PII)
2. Bericht reports/YYYY-MM-DD-support-monthly.md
3. Top-3 Feature-Wünsche für ceo-kalle/dashboard.md
4. ops/agents/cxo-support-analytics/dashboard.md + leitstand.md + reports.md

Kein GA. Keine Nutzer-E-Mails.
```

---

## 7. Leit-Routine / Orchestrator (CEO — wöchentlich)

| | |
|---|---|
| **Name** | KiezQuiz — Leit-Routine (Orchestrator) |
| **Cron** | `0 6 * * 1` |
| **Agenten-Dateien** | `ops/agents/ceo-kalle/*`, `ops/_generated/dashboard-data.json` (via Script) |

**Anweisung:**

```
Du bist Kalle (CEO/Orchestrator).

1. ops/agents/ceo-kalle/leitstand.md + ops/agents/ceo-kalle/todos.md lesen
2. Welche Automationen laufen diese Woche? reports/ — fehlen Berichte?
3. python3 scripts/build_ai_dashboard_data.py  → ops/_generated/dashboard-data.json
4. Optional Legacy: python3 scripts/generate_dashboard.py
5. Bericht reports/YYYY-MM-DD-orchestrator.md
6. ops/agents/ceo-kalle/dashboard.md aktualisieren (Stand/Datum)
7. ops/agents/ceo-kalle/leitstand.md Pointer aktualisieren

PR optional (dashboard-data.json + Bericht). Upload via CI/refresh-ai-dashboard.
Ab 2026-07-12: D4 erinnern.
```

---

## Checkliste

- [x] 0 — Backup Archiv Sync
- [x] 1 — Uptime Smoke Check
- [x] 2 — Security Weekly
- [x] 3 — SEO Weekly
- [x] 4 — Ops Weekly Review
- [x] 5 — Finance Monthly
- [x] 6 — Support Monthly
- [x] 7 — Leit-Routine / Orchestrator

---

## Empfohlene Reihenfolge zum Anlegen

1. Uptime Smoke Check — `0 8 * * 1-5`
2. Security Weekly — `0 7 * * 1`
3. Backup Archiv Sync — `0 10 2 * *`
4. SEO Weekly — `0 9 * * 1`
5. Ops Weekly — `0 7 * * 1`
6. Finance + Support Monthly
7. Orchestrator — `0 6 * * 1` (zuletzt — koordiniert alle)
