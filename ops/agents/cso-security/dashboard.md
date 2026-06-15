# Dashboard — Samira (CSO)

**Status:** 🟢  
**Lage:** Keine kritischen Lücken. Advisor-Hinweise sind bewusst akzeptiert (öffentliche RPCs by design). Leaked-Passwort-Schutz erst mit Umsatz.  
**Rolle:** Passt auf Sicherheit auf: Schwachstellen, veraltete Abhängigkeiten und Zugriffsrechte.

## KPIs

| Kennzahl | Wert | Ziel | Status | Verlauf | Quelle |
|---|---|---|---|---|---|
| Dependabot-Alerts | 0 | 0 | 🟢 |  | live (GitHub) |
| Supabase-Advisor-Warnungen | 30 | 0 | 🟡 |  | live |
| RLS-Hinweise (Info) | 6 | 0 | 🟡 |  | live |
| Leaked-Passwort-Schutz | aus | an | ⚪ |  | live |

## Projekte

| Projekt | Status | Fortschritt | Termin |
|---|---|---|---|
| Öffentliche RPCs prüfen/härten | Backlog | 0% | offen |
| Leaked-Passwort-Schutz aktivieren | wartet (Umsatz) | 0% | offen |

## Automations

| # | Name | Cron | Aufgabe |
|---|---|---|---|
| 2 | Security Weekly | `0 7 * * 1` | Dependabot + Supabase Advisors |
