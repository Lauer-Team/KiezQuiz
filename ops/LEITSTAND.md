# Leitstand — KiezQuiz

> **Einzige Quelle der Wahrheit** · Pflege: **Kalle, die Kieztaube** · Stand: **2026-06-15**

---

## 1. Status je Abteilung

| Abteilung | Status | Kurz |
|---|---|---|
| **Leitagent (Kalle)** | 🟢 | 7 Cursor-Automations aktiv · DEADLINES + ROADMAP live |
| **SEO** | 🟢 | GSC OK · Automation „SEO Weekly" live · GSC-API-Skript bereit |
| **DevOps / Monitoring** | 🟢 | Uptime-Automation live · Backup CI + Archiv |
| **Security** | 🟢 | Automation „Security Weekly" live · 0 Dependabot-Alerts |
| **Supabase-Backup** | 🟢 | CI am 1. · Archiv-Sync-Automation live |
| **Finance** | 🟢 | Service-Tracking · Automation „Finance Monthly" live |
| **Support / Analytics** | 🟢 | Stadt-Wünsche · Automation „Support Monthly" live |
| **Legal (Legora + Kalle)** | 🟢 | NB-E-Mails erledigt (10.06.) · Banner bis 11.07. · Koordination live |
| **Telegram-Agent** | ⏸️ | Pausiert |

---

## 2. Cursor-Automations (🟢 7 live)

| # | Name | Cron | Aufgabe |
|---|---|---|---|
| 0 | Backup Archiv Sync | `0 10 2 * *` | Artifact → Supplement-Ordner |
| 1 | Uptime Smoke Check | `0 8 * * 1-5` | kiezquiz.de erreichbar? |
| 2 | Security Weekly | `0 7 * * 1` | Dependabot + Supabase Advisors |
| 3 | SEO Weekly | `0 9 * * 1` | Sitemap, SEO-Tests, Leitstand |
| 4 | Ops Weekly Review | `0 7 * * 1` | Fälligkeiten · `ops/DEADLINES.md` |
| 5 | Finance Monthly | `0 8 1 * *` | Kosten, Free-Tier, SERVICES.md |
| 6 | Support Monthly | `0 10 1 * *` | Stadt-Wünsche, Trends |

Vorlagen: `ops/AUTOMATIONS.md`

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
| **Du** | Legora-Aufträge (wenn Monetarisierung/iOS), Merge-Freigaben, **Domain verlängern** (D1), GSC OAuth (optional) |
| **Du (optional, 2 Min)** | HaveIBeenPwned in Supabase Auth · Dependabot-PRs mergen |

**Anstehend (Termine):** `ops/DEADLINES.md` — Ops Weekly Review prüft automatisch

---

## 5. Wartet auf deine Freigabe

Merge auf `main` (Spiel-Code) · Rechtstexte live · DNS · Supabase RLS-Hardening (optional) · Dependabot Actions-PRs

---

## 6. Optimierungs-Backlog (Nutzen / Aufwand)

| Thema | Nutzen | Aufwand | Priorität |
|---|---|---|---|
| GSC API OAuth | SEO-Daten automatisch | mittel | siehe `ops/ROADMAP.md` R4 |
| Monetarisierung | Umsatz | hoch | aufgeschoben → `ops/plans/MONETIZATION.md` |
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
