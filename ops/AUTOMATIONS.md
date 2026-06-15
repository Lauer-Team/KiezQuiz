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

**Hinweis:** GSC-Daten brauchen noch **Search Console API (OAuth)** für Vollautomatik. Bis dahin: Automation prüft technisches SEO im Code + Live-URLs.

**Anweisung:**

```
Du bist die SEO-Abteilung für KiezQuiz. Halte dich an .cursor/rules/10-seo.mdc.

Prüfe:
- curl https://kiezquiz.de/sitemap.xml und robots.txt
- node scripts/test_seo_compat.js (falls vorhanden)
- Stadtseiten /hamburg/ /berlin/ /frankfurt/ erreichbar

Bericht ops/reports/YYYY-MM-DD-seo-weekly.md mit:
- Technischer Status (grün/gelb/rot)
- Hinweis an Mensch: GSC Performance/Coverage manuell prüfen (Property kiezquiz.de)
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

- [x] 0 — Backup Archiv Sync (live 2026-06-15)
- [x] 1 — Uptime Smoke Check (live 2026-06-15)
- [x] 2 — Security Weekly (live 2026-06-15)
- [x] 3 — SEO Weekly (live 2026-06-15)

Kalle trägt den Status in `ops/LEITSTAND.md` ein — du musst nichts melden.

---

## 4. Finance Monthly (optional)

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

## 5. Support Monthly (optional)

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
