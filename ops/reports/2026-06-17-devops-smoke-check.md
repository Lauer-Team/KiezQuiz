# DevOps Smoke-Check — 2026-06-17

**Status:** 🟢 grün  
**Zeitpunkt:** 2026-06-17T08:00 UTC (Automation #1, werktags 08:00)  
**Agent:** Oskar (COO / DevOps) · Regel: `.cursor/rules/20-devops-monitoring.mdc`

## version.json

```json
{"build":"995182d347167943977dd908bf2f6e98a2591814","design":10}
```

| Feld | Wert |
|---|---|
| **build** | `995182d347167943977dd908bf2f6e98a2591814` |
| **design** | `10` |
| **Abgleich `main`** | ✅ identisch mit `origin/main` |

## HTTP-Ergebnisse

| URL | HTTP | Erwartung | Ergebnis |
|---|---|---|---|
| https://kiezquiz.de/version.json | 200 | 200 + JSON (build, design) | ✅ |
| https://kiezquiz.de/ | 200 | 200 | ✅ |
| https://kiezquiz.de/hamburg/ | 200 | 200 | ✅ |
| https://kiezquiz.de/robots.txt | 200 | 200 | ✅ |
| https://kiezquiz.de/sitemap.xml | 200 | 200 | ✅ |
| https://kiezquiz.lauer.team/ | 301 | 301 → kiezquiz.de | ✅ → `https://kiezquiz.de/` |

## Fazit

Alle Pflicht-Checks bestanden. Live-Build entspricht dem aktuellen `main`-Stand. Kein Fix erforderlich.
