# Leitstand — KiezQuiz

> **Einzige Quelle der Wahrheit** · Pflege: **Kalle, die Kieztaube** · Stand: **2026-06-15**

---

## 1. Status je Abteilung

| Abteilung | Status | Kurz |
|---|---|---|
| **Leitagent (Kalle)** | 🟢 | 5 Cursor-Automations aktiv · DEADLINES live |
| **SEO** | 🟢 | GSC OK · Automation „SEO Weekly" live |
| **DevOps / Monitoring** | 🟢 | Uptime-Automation live · Backup CI + Archiv |
| **Security** | 🟢 | Automation „Security Weekly" live · 0 Dependabot |
| **Supabase-Backup** | 🟢 | CI am 1. · Archiv-Sync-Automation live |
| **Finance** | 🟢 | Service-Tracking + Kosten · nur Cursor (~60→20 USD) |
| **Support / Analytics** | 🟢 | Stadt-Wünsche · kein GA · Regel live |
| **Legal (Legora + Kalle)** | 🟡 | Koordination live · NB-Benachrichtigung offen (L1) |
| **Telegram-Agent** | ⏸️ | Pausiert |

---

## 2. Cursor-Automations (🟢 5 live)

| # | Name | Cron | Aufgabe |
|---|---|---|---|
| 0 | Backup Archiv Sync | `0 10 2 * *` | Artifact → Supplement-Ordner |
| 1 | Uptime Smoke Check | `0 8 * * 1-5` | kiezquiz.de erreichbar? |
| 2 | Security Weekly | `0 7 * * 1` | Dependabot + Supabase Advisors |
| 3 | SEO Weekly | `0 9 * * 1` | Sitemap, SEO-Tests, Leitstand |
| 4 | **Ops Weekly Review** | `0 7 * * 1` | Fälligkeiten · `ops/DEADLINES.md` |

Optional: Finance Monthly, Support Monthly — `ops/AUTOMATIONS.md` §4–5

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
| **Kalle** | Leitstand, Berichte, Free-Tier-Warnung, Legal-Trigger, PRs |
| **Du** | Legora-Aufträge, Merge-Freigaben, NB `--send`, **Domain verlängern** (D1) |
| **Du (optional)** | GSC OAuth · Dependabot-PRs mergen |

**Anstehend (Termine):** `ops/DEADLINES.md` — **Ops Weekly Review** (Mo 07:00 UTC) prüft automatisch

---

## 5. Wartet auf deine Freigabe

Merge auf `main` (Spiel-Code) · E-Mails an Nutzer · Rechtstexte live · DNS · Supabase RLS-Hardening · **NB-Benachrichtigung** (L1, siehe `ops/legal/BACKLOG.md`)

---

## 6. Optimierungs-Backlog (Nutzen / Aufwand)

| Thema | Nutzen | Aufwand | Priorität |
|---|---|---|---|
| GSC API OAuth | SEO-Daten automatisch | mittel | niedrig |
| Finance/Support-Automation anlegen | Monatsberichte ohne Chat | gering | niedrig |
| Dependabot-PRs mergen | Security aktuell | gering | niedrig |
| Monetarisierung + Legal | Umsatz | hoch | wenn du willst |
| Telegram-Agent reaktivieren | Fern-PRs | hoch | pausiert |

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
