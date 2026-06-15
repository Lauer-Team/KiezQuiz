# Leitstand — KiezQuiz

> **Einzige Quelle der Wahrheit** · Pflege: **Kalle, die Kieztaube** · Stand: **2026-06-15 — Phase 1 abgeschlossen**

---

## 1. Status je Abteilung

| Abteilung | Status | Kurz |
|---|---|---|
| **Leitagent (Kalle)** | 🟢 | Ops live, Routinen dokumentiert |
| **SEO** | 🟢 | GSC OK, techn. Checks grün |
| **DevOps / Monitoring** | 🟢 | Live + Backup CI + Archiv |
| **Security** | 🟡 | 0 Dependabot; Supabase WARNs bekannt/absicht |
| **Supabase-Backup** | 🟢 | CI am 1. · Archiv Supplement · Sync-Skript |
| **Finance** | ⚪ | Phase 2 — siehe `ops/PHASE2.md` |
| **Support / Analytics** | ⚪ | Phase 2 |
| **Legal (Legora)** | 🟡 | Laufend |
| **Telegram-Agent** | ⏸️ | Pausiert |

---

## 2. Was läuft automatisch

| Rhythmus | Was |
|---|---|
| **1×/Monat** | GitHub: Supabase-Backup → Artifact |
| **Nach Backup** | Kalle: `sync_supabase_backup_artifact.py` → Supplement-Ordner |
| **2×/Monat** | E-Mail Erinnerung info@kiezquiz.de (Info, kein manuelles Kopieren) |
| **Auf Anfrage / Session** | Smoke-Check, SEO-Test, Security-Baseline |

**Archiv:** `KiezQuiz (supplement)/Backups/Supabase`

---

## 3. Optional — du (nur wenn du willst)

| Aufgabe | Priorität |
|---|---|
| Cursor Automations anlegen (`ops/AUTOMATIONS.md`) | mittel — erspart dir Dashboard-Besuche |
| GSC API OAuth | niedrig — erst für auto SEO-Briefings |
| Dependabot-PRs #11–#12, #37 mergen | niedrig — GitHub Actions Updates |

---

## 4. Wartet auf deine Freigabe

| Was | Risiko |
|---|---|
| Merge auf `main` (Spiel-Code) | Live-Deploy |
| E-Mails an Nutzer | Irreversibel |
| Rechtstexte live | Legora + OK |
| DNS-Änderungen | Öffentlich |
| Supabase RLS-Hardening (Security-WARNs) | App-Verhalten — nur mit OK |

---

## 5. Entscheidungs-Logbuch (Kurz)

| Datum | Entscheidung |
|---|---|
| 2026-06-15 | Leitagent Kalle + ops-Struktur (PR #40) |
| 2026-06-15 | Zugänge: Supabase, Cloudflare, Notion, GSC, Resend |
| 2026-06-15 | Backup Free Tier + CI (PR #38–#41) |
| 2026-06-15 | Archivierung → Kalle, Supplement-Ordner |
| 2026-06-15 | **Phase 1 abgeschlossen** |

Berichte: `ops/reports/2026-06-15-*.md`

---

## 6. Glossar

| Begriff | In einem Satz |
|---|---|
| **Leitstand** | Diese Datei — zentraler Status. |
| **Kalle** | Dein Leitagent — ein Ansprechpartner für alles. |
| **Supplement-Ordner** | Langzeit-Backup außerhalb des Git-Repos. |
| **Phase 2** | Finance, volle Automations — siehe `ops/PHASE2.md`. |
