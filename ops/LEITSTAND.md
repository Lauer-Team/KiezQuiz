# Leitstand — KiezQuiz

> **Einzige Quelle der Wahrheit** · Pflege: **Kalle, die Kieztaube** · Stand: **2026-06-15**

---

## 1. Status je Abteilung

| Abteilung | Status | Kurz |
|---|---|---|
| **Leitagent (Kalle)** | 🟢 | 8 Automations live · Dashboard admin-only (Supabase Storage) |
| **SEO** | 🟢 | GSC manuell · Automation „SEO Weekly" (technisch) · kein Google Cloud nötig |
| **DevOps / Monitoring** | 🟢 | Uptime-Automation live · Backup CI + Archiv |
| **Security** | 🟢 | Automation „Security Weekly" live · 0 Dependabot-Alerts |
| **Supabase-Backup** | 🟢 | CI am 1. · Archiv-Sync-Automation live |
| **Finance** | 🟢 | Service-Tracking · Automation „Finance Monthly" live |
| **Support / Analytics** | 🟢 | Stadt-Wünsche · Automation „Support Monthly" live |
| **Legal (Legora + Kalle)** | 🟢 | NB-E-Mails erledigt (10.06.) · Banner bis 11.07. · Koordination live |
| **Telegram-Agent** | ⏸️ | Pausiert |

---

## 2. Cursor-Automations (🟢 8 live)

| # | Name | Cron | Aufgabe |
|---|---|---|---|
| 0 | Backup Archiv Sync | `0 10 2 * *` | Artifact → Supplement-Ordner |
| 1 | Uptime Smoke Check | `0 8 * * 1-5` | kiezquiz.de erreichbar? |
| 2 | Security Weekly | `0 7 * * 1` | Dependabot + Supabase Advisors |
| 3 | SEO Weekly | `0 9 * * 1` | Sitemap, SEO-Tests, Leitstand |
| 4 | Ops Weekly Review | `0 7 * * 1` | Fälligkeiten · `ops/DEADLINES.md` |
| 5 | Finance Monthly | `0 8 1 * *` | Kosten, Free-Tier, SERVICES.md |
| 6 | Support Monthly | `0 10 1 * *` | Stadt-Wünsche, Trends |
| 7 | Leit-Routine / Orchestrator | `0 6 * * 1` | Koordiniert alle, prüft Fälligkeit, baut Dashboard |

Vorlagen: `ops/AUTOMATIONS.md` · Gesamtüberblick: `ops/ORGANIGRAMM.md` · **Dashboard (Admin):** Profil → Admin → AI-Management

---

## 3. Weitere Routinen (GitHub Actions)

| Rhythmus | Was |
|---|---|
| **1×/Monat** | Supabase-Backup → Artifact |
| **2×/Monat** | E-Mail info@kiezquiz.de (Backup-Info) |

**Archiv:** `KiezQuiz (supplement)/Backups/Supabase`

---

## 4. Aufgaben — Kalle vs. du

| Wer | Aufgabe |
|---|---|
| **Kalle** | Leitstand, Berichte, Free-Tier-Warnung, Legal-Trigger, PRs, NB-Banner abschalten ab 12.07. |
| **Du** | Legora-Aufträge (wenn Monetarisierung/iOS), Merge-Freigaben, **Domain verlängern** (D1), GSC manuell (~5 Min/Monat, optional) |
| **Du (optional)** | Bing Webmaster · www-Redirect · Dependabot-PRs prüfen |

**Anstehend (Termine):** `ops/DEADLINES.md` — Ops Weekly Review prüft automatisch

---

## 5. Wartet auf deine Freigabe

Merge auf `main` (Spiel-Code) · Rechtstexte live · DNS · Supabase Pro / kostenpflichtige Upgrades

---

## 6. Optimierungs-Backlog (Nutzen / Aufwand)

| Thema | Nutzen | Aufwand | Priorität |
|---|---|---|---|
| GSC manuell (5 Min/Monat) | SEO-Überblick ohne API | gering | Standard → `docs/GSC-MANUAL-CHECK.md` |
| Monetarisierung | Umsatz | hoch | aufgeschoben → `ops/plans/MONETIZATION.md` |
| HaveIBeenPwned (Supabase) | Passwort-Leaks blocken | — | **erst mit Supabase Pro** · wenn Umsatz |
| Telegram-Agent reaktivieren | Fern-PRs | hoch | pausiert · ROADMAP R7 |
| Community-Launch | Reichweite | mittel | ROADMAP R2 |

---

## 7. Entscheidungs-Logbuch

| Datum | Entscheidung |
|---|---|
| 2026-06-15 | Leitagent Kalle + ops-Struktur (PR #40) |
| 2026-06-15 | Zugänge + Backup CI (PR #38–#41) |
| 2026-06-15 | Phase 1 abgeschlossen (PR #42) |
| 2026-06-15 | 4 Cursor-Automations live (0–3) |
| 2026-06-15 | **Masterauftrag v2 abgeschlossen** — Finance, Support, Legal-Koordination |
| 2026-06-15 | **Ops Weekly Review** live (Automation #4) · `ops/DEADLINES.md` |
| 2026-06-15 | Finance + Support Monthly live (#5–6) · NB-Backlog korrigiert · ROADMAP + Monetarisierungsplan |
| 2026-06-15 | **PR #47** gemerged — Actions-Bumps, GSC-Skript optional |
| 2026-06-15 | **HaveIBeenPwned** bewusst offen — nur Supabase Pro; erst bei Umsatz |
| 2026-06-15 | **GSC:** manueller Check Standard; Google Cloud/API nicht nötig |
| 2026-06-15 | **AI-Management-Cockpit:** Organigramm · Dashboard-Generator · Leit-Routine (#7) |
| 2026-06-15 | **Dashboard admin-only:** kein Public-Deploy von `ops/` · Supabase Storage + Edge Functions `get-ai-dashboard` / `refresh-ai-dashboard` |

Berichte: `ops/reports/`

---

## 8. Glossar

| Begriff | In einem Satz |
|---|---|
| **Leitstand** | Diese Datei — Kalle pflegt sie bei jeder Statusänderung automatisch. |
| **Kalle** | Dein Leitagent — ein Ansprechpartner. |
| **Automation** | Zeitgesteuerter Agent auf cursor.com — schreibt Berichte ins Repo. |
| **Free Tier** | Kostenloser Tarif eines Anbieters — oft mit Limits (siehe `ops/finance/SERVICES.md`). |
| **Legal-Arbeitsauftrag** | Briefing von Kalle für dich in Legora — Kalle schreibt keine Rechtstexte. |
| **ROADMAP** | Aufgeschobene Themen ohne festes Datum — `ops/ROADMAP.md`. |
| **pendingNotice** | Schalter für den gelben Gäste-Hinweis bei NB-Änderungen — absichtlich true bis Inkrafttreten. |
| **Organigramm** | `ops/ORGANIGRAMM.md` — Gesamtüberblick über alle Agenten, MCPs, Automationen, Dateien (Audit-Sicht). |
| **Dashboard** | Profil → Admin → AI-Management — **nur Admin**, via Supabase Edge Function (nicht öffentlich auf kiezquiz.de). |
| **Orchestrator** | Automation #7 (Leit-Routine) — koordiniert montags alle Automationen und baut das Dashboard neu. |
| **MCP** | „Steckdose" zu echten Diensten (Supabase, Notion …); an deinen Cursor-Account gebunden, nicht im Repo. |
