# Routinen — Kalle (CEO)

> Stand: **2026-06-15**

## Cursor-Automations (🟢 8 live)

| # | Name | Cron | Aufgabe |
|---|---|---|---|
| 0 | Backup Archiv Sync | `0 10 2 * *` | Artifact → Supplement-Ordner |
| 1 | Uptime Smoke Check | `0 8 * * 1-5` | kiezquiz.de erreichbar? |
| 2 | Security Weekly | `0 7 * * 1` | Dependabot + Supabase Advisors |
| 3 | SEO Weekly | `0 9 * * 1` | Sitemap, SEO-Tests |
| 4 | Ops Weekly Review | `0 7 * * 1` | Fälligkeiten · `ops/DEADLINES.md` |
| 5 | Finance Monthly | `0 8 1 * *` | Kosten, Free-Tier |
| 6 | Support Monthly | `0 10 1 * *` | Stadt-Wünsche, Trends |
| 7 | Leit-Routine / Orchestrator | `0 6 * * 1` | Koordiniert alle, baut Dashboard-JSON |

Vorlagen: `ops/AUTOMATIONS.md`

## GitHub Actions

| Rhythmus | Was |
|---|---|
| **1×/Monat** | Supabase-Backup → Artifact |
| **2×/Monat** | E-Mail info@kiezquiz.de (Backup-Info) |
| **On push main** | Deploy kiezquiz.de |
| **workflow_dispatch** | Dashboard-Refresh → JSON-Upload |
