# Security Baseline — 2026-06-15

**Abteilung:** Security  
**Status:** 🟡 (bewusst designt, kein akuter Fix nötig)

## Dependabot

- Offene Alerts: **0**

## Supabase Advisors (Auszug)

| Level | Thema | Einschätzung |
|---|---|---|
| INFO | RLS ohne Policy (Rate-Limit-/Intern-Tabellen) | Erwartet — kein Client-Zugriff |
| WARN | SECURITY DEFINER RPCs für anon/authenticated | **Absicht** (Leaderboard, Login, Stadt-Wünsche) |
| WARN | Leaked-Password-Protection aus | Optional in Auth Settings aktivieren |

**Kein sofortiger PR** — RPCs sind App-Design. Optional später: HaveIBeenPwned in Supabase Auth aktivieren.

## Secrets

`.gitignore` für Configs/Backups — OK.
