# DevOps Smoke-Check — 2026-06-18

**Status:** 🟢 grün  
**Ausgeführt:** 2026-06-18 · 08:02 UTC (Automation #1, Cron `0 8 * * 1-5`)  
**Regel:** `.cursor/rules/20-devops-monitoring.mdc`

## version.json

```json
{"build":"99eb8b3392930f91cf2956be3c18f6e7f69765be","design":10}
```

| Feld | Wert |
|---|---|
| **build (SHA)** | `99eb8b3392930f91cf2956be3c18f6e7f69765be` |
| **design** | `10` |
| **Abgleich `main`** | ✅ SHA entspricht letztem Deploy (`Inbox-Import: Mac, VPS und GitHub.`, 2026-06-17) |

## HTTP-Checks

| URL | Erwartet | Gemessen | Ergebnis |
|---|---|---|---|
| https://kiezquiz.de/version.json | 200 + JSON | **200** | ✅ |
| https://kiezquiz.de/ | 200 | **200** | ✅ |
| https://kiezquiz.de/hamburg/ | 200 | **200** | ✅ |
| https://kiezquiz.de/robots.txt | 200 | **200** | ✅ |
| https://kiezquiz.de/sitemap.xml | 200 | **200** | ✅ |
| https://kiezquiz.lauer.team/ | 301 → kiezquiz.de | **301** → `https://kiezquiz.de/` | ✅ |

## Deploy-Pipeline

| Workflow | Letzter Lauf | Status |
|---|---|---|
| Deploy to GitHub Pages (`deploy.yml`) | 2026-06-17 22:31 UTC | ✅ success |

## Maßnahmen

Keine — alle Checks grün. Kein Fix-PR erforderlich.
