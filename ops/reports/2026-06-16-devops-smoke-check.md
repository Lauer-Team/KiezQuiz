# DevOps Smoke-Check — 2026-06-16

**Status:** 🟢 grün  
**Ausgeführt:** 2026-06-16T08:01Z (Cron Automation)  
**Regel:** `.cursor/rules/20-devops-monitoring.mdc`

## version.json

| Feld | Wert |
|---|---|
| HTTP | 200 |
| `build` | `1d76e53606b8e89c683b877fb15b426ce0c16a57` |
| `design` | `10` |
| Abgleich `origin/main` | ✅ identisch |

## HTTP-Erreichbarkeit (kiezquiz.de)

| URL | HTTP | Erwartung |
|---|---|---|
| `/version.json` | 200 | 200 |
| `/` | 200 | 200 |
| `/hamburg/` | 200 | 200 |
| `/robots.txt` | 200 | 200 |
| `/sitemap.xml` | 200 | 200 |

## Redirect (kiezquiz.lauer.team)

| Prüfung | Ergebnis |
|---|---|
| HTTP-Code | 301 |
| `Location` | `https://kiezquiz.de/` |
| Erwartung | 301 → kiezquiz.de |

## Deploy-Pipeline (GitHub Actions)

Letzter Lauf **Deploy to GitHub Pages**: ✅ success (`1d76e53`, 2026-06-16T06:58:58Z)

## Maßnahmen

Keine — alle Prüfungen bestanden.
