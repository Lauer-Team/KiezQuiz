# Dashboard — Oskar (COO)

**Status:** 🟢  
**Lage:** Betrieb stabil — Seite werktags erreichbar, Backups laufen, letzter Deploy erfolgreich.  
**Rolle:** Überwacht den Betrieb: Ist die Seite erreichbar, laufen Backups, klappen die Deploys.

## KPIs

| Kennzahl | Wert | Ziel | Status | Verlauf | Quelle |
|---|---|---|---|---|---|
| Erreichbarkeit | erreichbar | 100% | 🟢 |  | live |
| Letztes Backup | OK | monatlich | 🟢 |  | live |
| Letzter Deploy | erfolgreich | grün | 🟢 |  | live (GitHub) |
| Smoke-Check | werktäglich | werktags | 🟢 |  | live |

## Projekte

| Projekt | Status | Fortschritt | Termin |
|---|---|---|---|
| Uptime-Prozent automatisch messen | Idee | 0% | Q3 2026 |
| Telegram-Alerts reaktivieren | pausiert | 0% | offen |

## Automations

| # | Name | Cron | Aufgabe |
|---|---|---|---|
| 0 | Backup Archiv Sync | `0 10 2 * *` | Artifact → Supplement |
| 1 | Uptime Smoke Check | `0 8 * * 1-5` | Live-Erreichbarkeit |
