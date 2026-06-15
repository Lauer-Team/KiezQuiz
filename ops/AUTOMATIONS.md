# Cursor Automations — KiezQuiz

> Fertige Config-Blöcke zum Einfügen auf [cursor.com/automations](https://cursor.com/automations).  
> **Wichtig:** Jede Automation legt nur **Berichte/PRs** vor — nie direkt auf `main` mergen.

## So legst du eine Automation an

1. [cursor.com/automations](https://cursor.com/automations) → **New Automation**
2. Trigger: **Schedule** → Cron eintragen (siehe unten)
3. Repository: **Lauer-Team/KiezQuiz** · Branch: `main`
4. Anweisung (Prompt) einfügen
5. MCPs + Modell wählen → **Save**
6. Mir Bescheid sagen: „Automation X angelegt"

---

## 0. Backup ins Supplement-Archiv (Kalle — monatlich)

| | |
|---|---|
| **Name** | KiezQuiz — Backup Archiv Sync |
| **Cron** | `0 10 2 * *` (am 2. jeden Monats, 10:00 UTC — nach GitHub-Backup am 1.) |
| **Modell** | Composer |
| **MCPs** | *(gh CLI im Repo)* |

**Anweisung:**

```
Du bist Kalle (Leitagent). Nach dem monatlichen GitHub-Backup:

1. python3 scripts/sync_supabase_backup_artifact.py
   (kopiert neuestes Actions-Artifact nach archiveDir in backup-supabase.config.json)
2. Kurz in ops/reports/YYYY-MM-DD-backup-archiv.md notieren: Dateiname, Größe, Run-ID.
3. ops/LEITSTAND.md — Supabase-Backup auf grün, falls OK.

Bei Fehler: Ursache in Bericht, Mensch nur wenn gh auth fehlt.
Kein Merge auf main nötig (nur lokales Archiv + Bericht als PR optional).
```

---

## 1. Uptime & Smoke-Check (DevOps)

| | |
|---|---|
| **Name** | KiezQuiz — Uptime Smoke Check |
| **Cron** | `0 8 * * 1-5` (werktags 08:00 UTC ≈ 09:00/10:00 DE) |
| **Modell** | Composer oder Auto |
| **MCPs** | *(keine Pflicht)* |

**Anweisung:**

```
Du bist die DevOps-Abteilung für KiezQuiz. Halte dich an .cursor/rules/20-devops-monitoring.mdc.

Prüfe live:
- https://kiezquiz.de/version.json (JSON mit build + design)
- https://kiezquiz.de/ , /hamburg/ , /robots.txt , /sitemap.xml (HTTP 200)
- https://kiezquiz.lauer.team/ (301 auf kiezquiz.de)

Schreibe Bericht nach ops/reports/YYYY-MM-DD-devops-smoke-check.md:
Status grün/gelb/rot, gemessene HTTP-Codes, version.json build-SHA.
Aktualisiere ops/LEITSTAND.md (Abteilung DevOps) — nur diese Datei, kein Deploy.

Bei rot: konkreten Fix-Vorschlag als Branch+PR, nicht mergen.
```

---

## 2. Security-Scan (wöchentlich)

| | |
|---|---|
| **Name** | KiezQuiz — Security Weekly |
| **Cron** | `0 7 * * 1` (Montags 07:00 UTC) |
| **Modell** | Composer |
| **MCPs** | Supabase (Advisors + Logs kurz prüfen) |

**Anweisung:**

```
Du bist die Security-Abteilung für KiezQuiz. Halte dich an .cursor/rules/30-security.mdc.

1. Prüfe offene Dependabot-Alerts (gh api oder GitHub UI Hinweise im Bericht).
2. Supabase MCP: get_advisors für Projekt KiezQuiz Backend — Security-Hinweise zusammenfassen.
3. Keine Secrets in Dateien committen (.gitignore prüfen).

Bericht: ops/reports/YYYY-MM-DD-security-weekly.md
Leitstand: ops/LEITSTAND.md Security-Status aktualisieren.
Kritische Fixes: Branch+PR vorschlagen, nicht mergen.
```

---

## 3. SEO-Wochenbriefing (manuell + Leitstand)

| | |
|---|---|
| **Name** | KiezQuiz — SEO Weekly Brief |
| **Cron** | `0 9 * * 1` (Montags 09:00 UTC) |
| **Modell** | Composer |
| **MCPs** | *(optional Notion für Notizen)* |

**Hinweis:** GSC-Zahlen **manuell** in der Search Console (Standard) → `docs/GSC-MANUAL-CHECK.md`. API/Skript nur optional.

**Anweisung:**

```
Du bist die SEO-Abteilung für KiezQuiz. Halte dich an .cursor/rules/10-seo.mdc.

Prüfe:
- curl https://kiezquiz.de/sitemap.xml und robots.txt
- node scripts/test_seo_compat.js (falls vorhanden)
- Stadtseiten /hamburg/ /berlin/ /frankfurt/ erreichbar

Bericht ops/reports/YYYY-MM-DD-seo-weekly.md mit:
- Technischer Status (grün/gelb/rot)
- Hinweis: GSC Performance/Indexierung manuell prüfen (docs/GSC-MANUAL-CHECK.md, ~5 Min) — kein Google Cloud nötig
- Verbesserungsvorschläge als PR, nicht mergen

Leitstand aktualisieren.
```

---

## Empfohlene Reihenfolge zum Anlegen

1. **Uptime Smoke Check** — `0 8 * * 1-5`
2. **Security Weekly** — `0 7 * * 1`
3. **Backup Archiv Sync** — `0 10 2 * *`
4. **SEO Weekly** — `0 9 * * 1`

## Checkliste

- [x] 0 — Backup Archiv Sync
- [x] 1 — Uptime Smoke Check
- [x] 2 — Security Weekly
- [x] 3 — SEO Weekly
- [x] 4 — Finance Monthly
- [x] 5 — Support Monthly
- [x] 6 — Ops Weekly Review
- [x] 7 — **Leit-Routine / Orchestrator**

---

## 4. Finance Monthly

| | |
|---|---|
| **Name** | KiezQuiz — Finance Monthly |
| **Cron** | `0 8 1 * *` (am 1. jeden Monats, 08:00 UTC) |
| **Modell** | Composer |
| **MCPs** | Supabase (Quotas) |

**Anweisung:**

```
Du bist die Finance-Abteilung. Halte dich an .cursor/rules/40-finance.mdc.

1. ops/finance/SERVICES.md und COSTS.md prüfen/aktualisieren
2. Supabase MCP: DB-Größe, MAU, Bandwidth vs. Free-Tier-Limits
3. Resend/GitHub: nur Hinweis falls relevant
4. Bericht ops/reports/YYYY-MM-DD-finance-monthly.md
5. Bei Quota >70%: Warnung in ops/LEITSTAND.md
Keine Upgrades ohne Menschen-OK.
```

---

## 5. Support Monthly

| | |
|---|---|
| **Name** | KiezQuiz — Support Monthly |
| **Cron** | `0 10 1 * *` (am 1. jeden Monats, 10:00 UTC) |
| **Modell** | Composer |
| **MCPs** | Supabase |

**Anweisung:**

```
Du bist Support/Analytics. Halte dich an .cursor/rules/50-support-analytics.mdc.

1. Supabase: city_wish_requests aggregiert (Städte, Trends, keine PII)
2. Bericht ops/reports/YYYY-MM-DD-support-monthly.md
3. Top-3 Feature-Wünsche für Kalle
Kein Google Analytics. Keine E-Mails an Nutzer.
```

---

## 6. Ops Weekly Review (Fälligkeiten)

| | |
|---|---|
| **Name** | KiezQuiz — Ops Weekly Review |
| **Cron** | `0 7 * * 1` (Montags 07:00 UTC — vor Security Weekly) |
| **Modell** | Composer |
| **MCPs** | *(keine Pflicht)* |

**Zweck:** Fälligkeiten prüfen — **nicht** den Leitstand mit Todos vollstopfen.

**Anweisung:**

```
Du bist Kalle (Leitagent).

1. Lies ops/DEADLINES.md — jede Zeile wo heute >= Erinnern ab und Status nicht 🟢:
   - ≤14 Tage bis Fälligkeit → 🔴 dringend
   - sonst → 🟡 anstehend
   - Status-Spalte in DEADLINES.md aktualisieren
2. Lies ops/LEITSTAND.md + ops/legal/BACKLOG.md (nur Kurzüberblick)
3. Bericht ops/reports/YYYY-MM-DD-ops-weekly.md:
   - Was ist fällig / bald fällig?
   - Was braucht der Mensch diese Woche? (nummeriert, laienverständlich)
4. Leitstand §4: eine Zeile „Anstehend:" mit Verweis auf Bericht — kein Todo-Dump
5. Neue fristgebundene Punkte aus Berichten anderer Agenten → Zeile in DEADLINES.md

Kein Merge auf main nötig wenn nur Bericht + DEADLINES-Status. PR optional.
Ab 2026-07-12: wenn D4 fällig → scripts/deactivate_terms_notice.py --apply (siehe DEADLINES.md).
```

## 7. Leit-Routine / Orchestrator (wöchentlich — koordiniert alles)

| | |
|---|---|
| **Name** | KiezQuiz — Leit-Routine (Orchestrator) |
| **Cron** | `0 6 * * 1` (Montags 06:00 UTC — **vor** allen anderen) |
| **Modell** | Composer |
| **MCPs** | *(keine Pflicht)* |

**Zweck:** Der „Dirigent". Einmal pro Woche prüft diese Automation **alle anderen Automationen** —
welche diese Woche fällig sind, ob Berichte fehlen, ob etwas überfällig/veraltet ist — und baut das **Dashboard** neu.
So hast du einen einzigen Ort, der den Gesamtüberblick herstellt.

**Anweisung:**

```
Du bist Kalle (Leitagent) in der Rolle Orchestrator (Leit-Routine).

1. Lies ops/LEITSTAND.md (§1 Abteilungen, §2 Automationen) und ops/DEADLINES.md.
2. Bestimme, welche Automationen in den nächsten 7 Tagen laufen (anhand der Cron-Spalte).
3. Prüfe ops/reports/: Fehlt für eine fällige Automation der letzte erwartete Bericht?
   -> notiere "überfällig/zu prüfen".
4. Baue das Dashboard neu:  python3 scripts/generate_dashboard.py
   (erzeugt ops/dashboard.html aus dem aktuellen Leitstand + berechneten Terminen).
5. Schreibe Bericht ops/reports/YYYY-MM-DD-orchestrator.md:
   - Tabelle: Automation | nächster Lauf (DE) | fällig diese Woche? | Bericht vorhanden?
   - Was braucht der Mensch diese Woche (nummeriert, laienverständlich)?
   - Auffälligkeiten (überfällig, rote Deadlines, Quota-Warnungen).
6. Leitstand §1: Zeile "Leitagent (Kalle)" kurz aktualisieren (Dashboard-Stand/Datum).

Kein Merge auf main nötig (nur Bericht + dashboard.html). PR optional.
Ab 2026-07-12: bei fälligem D4 an scripts/deactivate_terms_notice.py erinnern.
```

**Warum 06:00 Montags?** Läuft vor Ops Weekly Review (07:00), Security (07:00) und SEO (09:00),
damit das Dashboard die frische Wochenplanung schon zeigt.

---

## Checkliste optional

_(Pflicht-Automations 0–7 live — siehe Checkliste oben)_
- [x] 7 — Leit-Routine / Orchestrator
