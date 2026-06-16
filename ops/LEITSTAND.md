# Leitstand — DevOps (KiezQuiz)

> **Abteilung:** DevOps / Monitoring (Oskar, COO) · Stand: **2026-06-16**  
> **Regel:** `.cursor/rules/20-devops-monitoring.mdc`  
> **Detail-Akte:** [`agents/coo-operations/leitstand.md`](agents/coo-operations/leitstand.md)

---

## Status

| Bereich | Status | Letzte Prüfung |
|---|---|---|
| Live-Smoke (kiezquiz.de) | 🟢 | 2026-06-16 |
| Redirect lauer.team → kiezquiz.de | 🟢 | 2026-06-16 |
| Deploy-Pipeline (GitHub Actions) | 🟢 | 2026-06-16 |

**Gesamt:** 🟢 grün

---

## Live-Build

| Kennzahl | Wert |
|---|---|
| `version.json` build | `1d76e53606b8e89c683b877fb15b426ce0c16a57` |
| `design` | `10` |
| Abgleich mit `main` | ✅ |

---

## Letzter Smoke-Check

Bericht: [`reports/2026-06-16-devops-smoke-check.md`](reports/2026-06-16-devops-smoke-check.md)

| Endpoint | HTTP |
|---|---|
| `/version.json` | 200 |
| `/` | 200 |
| `/hamburg/` | 200 |
| `/robots.txt` | 200 |
| `/sitemap.xml` | 200 |
| `kiezquiz.lauer.team/` | 301 → `https://kiezquiz.de/` |

---

## Offene Punkte

Keine aus diesem Lauf.
