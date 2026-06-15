# Leitstand — KiezQuiz

> **Einzige Quelle der Wahrheit** · Pflege: **Kalle, die Kieztaube** · Stand: **2026-06-15**

---

## 1. Status je Abteilung

| Abteilung | Status | Kurz |
|---|---|---|
| **Leitagent (Kalle)** | 🟢 | Ops live, 4 Cursor-Automations aktiv |
| **SEO** | 🟢 | GSC OK · Automation „SEO Weekly" live |
| **DevOps / Monitoring** | 🟢 | Uptime-Automation live · Backup CI + Archiv |
| **Security** | 🟢 | Automation „Security Weekly" live · 0 Dependabot |
| **Supabase-Backup** | 🟢 | CI am 1. · Archiv-Sync-Automation live |
| **Finance** | ⚪ | Phase 2 — `ops/PHASE2.md` |
| **Support / Analytics** | ⚪ | Phase 2 |
| **Legal (Legora)** | 🟡 | Laufend |
| **Telegram-Agent** | ⏸️ | Pausiert |

---

## 2. Cursor-Automations (🟢 alle live seit 2026-06-15)

| # | Name | Cron | Aufgabe |
|---|---|---|---|
| 0 | Backup Archiv Sync | `0 10 2 * *` | Artifact → Supplement-Ordner |
| 1 | Uptime Smoke Check | `0 8 * * 1-5` | kiezquiz.de erreichbar? |
| 2 | Security Weekly | `0 7 * * 1` | Dependabot + Supabase Advisors |
| 3 | SEO Weekly | `0 9 * * 1` | Sitemap, SEO-Tests, Leitstand |

Details: `ops/AUTOMATIONS.md`

---

## 3. Weitere Routinen (GitHub Actions)

| Rhythmus | Was |
|---|---|
| **1×/Monat** | Supabase-Backup → Artifact |
| **2×/Monat** | E-Mail info@kiezquiz.de (Backup-Info) |

**Archiv:** `KiezQuiz (supplement)/Backups/Supabase`

---

## 4. Optional — du

| Aufgabe | Priorität |
|---|---|
| GSC API OAuth | niedrig — auto SEO-Daten aus GSC |
| Dependabot-PRs mergen | niedrig |

---

## 5. Wartet auf deine Freigabe

Merge auf `main` (Spiel-Code) · E-Mails an Nutzer · Rechtstexte live · DNS · Supabase RLS-Hardening

---

## 6. Entscheidungs-Logbuch

| Datum | Entscheidung |
|---|---|
| 2026-06-15 | Leitagent Kalle + ops-Struktur (PR #40) |
| 2026-06-15 | Zugänge + Backup CI (PR #38–#41) |
| 2026-06-15 | Phase 1 abgeschlossen (PR #42) |
| 2026-06-15 | **4 Cursor-Automations live** (0–3) |

Berichte: `ops/reports/`

---

## 7. Glossar

| Begriff | In einem Satz |
|---|---|
| **Leitstand** | Diese Datei — Kalle pflegt sie bei jeder Statusänderung automatisch. |
| **Kalle** | Dein Leitagent — ein Ansprechpartner. |
| **Automation** | Zeitgesteuerter Agent auf cursor.com — schreibt Berichte ins Repo. |
