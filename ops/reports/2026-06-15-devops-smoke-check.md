# DevOps Smoke-Check — 2026-06-15

**Abteilung:** DevOps / Monitoring  
**Status:** 🟢 grün

## Live-Checks

| URL | HTTP |
|---|---|
| https://kiezquiz.de/version.json | 200 — build `5aba664…`, design 10 |
| https://kiezquiz.de/ | 200 |
| https://kiezquiz.de/hamburg/ | 200 |
| https://kiezquiz.de/robots.txt | 200 |
| https://kiezquiz.de/sitemap.xml | 200 |

## Backup CI

PR #39 merged; PATH-Fix für `python3` in separatem PR (ops/leitagent-phase1).

## Nächste Schritte

- Cursor Automation „Uptime Smoke Check" anlegen (`ops/AUTOMATIONS.md`)
- Nach Backup-PATH-Fix: Workflow „Supabase monthly backup" erneut testen
