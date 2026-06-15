# Leitstand — KiezQuiz

> **Einzige Quelle der Wahrheit** für Status, Aufgaben und Entscheidungen.  
> Pflege: **Kalle, die Kieztaube** · Stand: 2026-06-15

---

## 1. Status je Abteilung

| Abteilung | Status | Kurz |
|---|---|---|
| **Leitagent (Kalle)** | 🟢 | Ops-Struktur, Regeln, Automations-Vorlagen |
| **SEO** | 🟡 | GSC OK; wöchentliche Automation vorbereitet |
| **DevOps / Monitoring** | 🟢 | Smoke-Check grün; Uptime-Automation bereit |
| **Security** | 🟡 | Dependabot aktiv; Weekly-Scan Automation bereit |
| **Finance** | ⚪ | Phase 2 |
| **Support / Analytics** | ⚪ | Kein Tracking (bewusst); Phase 2 |
| **Legal (Legora)** | 🟡 | Laufend über Legora |
| **Telegram-Agent** | ⏸️ | Pausiert |
| **Supabase-Backup** | 🟢 | CI + Supplement-Archiv (Kalle) | — |

---

## 2. Offene Aufgaben

### Kalle erledigt selbst
- [x] Phase 1 ops + PR #40
- [x] Backup CI grün; Archiv-Skripte + erste Kopien im Supplement-Ordner
- [ ] PR backup-archiv mergen (Skripte + Docs)

### Aufgabe für dich (Mensch)

- [ ] **Cursor Automations** anlegen — siehe `ops/AUTOMATIONS.md` (Start: Uptime Smoke Check)
- [ ] GSC API (OAuth) — optional, für automatisches SEO-Briefing

#### Backup-Archiv (erledigt durch Kalle)

| Wann | Wer | Was |
|---|---|---|
| **1. des Monats** | GitHub Actions | Backup + Artifact |
| **danach** | **Kalle** | `sync_supabase_backup_artifact.py` → Supplement-Ordner |
| **2. des Monats** | E-Mail | Info an info@kiezquiz.de (kein manuelles Kopieren nötig) |

Archiv: `KiezQuiz (supplement)/Backups/Supabase` · CI-Backup 🟢 (Run 27550083985)

---

## 3. Wartet auf deine Freigabe

| Was | Risiko | Status |
|---|---|---|
| Merge PR `ops/leitagent-phase1` | Docs + Regeln, kein Spiel-Code | offen |
| Cursor Automations aktivieren | Sandbox-PRs/Berichte | deine Entscheidung |

---

## 4. Entscheidungs-Logbuch

| Datum | Entscheidung | Warum |
|---|---|---|
| 2026-06-15 | Leitagent „Kalle" + ops-Struktur | Master-Auftrag v2 |
| 2026-06-15 | Zugänge: Supabase, Cloudflare, Notion, GSC, Resend | Agent-Management |
| 2026-06-15 | PR #38 + #39 — Backup CI | Free Tier pg_dump |
| 2026-06-15 | **PR #40 merged** — Phase 1 ops live | Leitstand, Regeln, Automations-Vorlagen |
| 2026-06-15 | **Backup-Archiv** — Kalle → Supplement-Ordner | Kein manuelles Kopieren mehr |
| 2026-06-15 | Telegram pausiert | Später |

---

## 5. Optimierungs-Backlog

| Idee | Nutzen | Aufwand | Priorität |
|---|---|---|---|
| Uptime-Automation anlegen | Ausfall früh erkennen | gering | **jetzt** |
| Security-Automation anlegen | Schwachstellen | gering | hoch |
| SEO-Automation + GSC API | Rankings automatisch | mittel | mittel |
| Finance Phase 2 | Kosten im Blick | mittel | später |

---

## 6. Glossar

| Begriff | In einem Satz |
|---|---|
| **Leitstand** | Diese Datei — zentraler Status für alle Agenten. |
| **Leitagent / Kalle** | Dein einziger Ansprechpartner; koordiniert Fach-Agenten. |
| **PR** | Code-/Doc-Änderungsvorschlag — Merge = live bei Spiel-Code. |
| **MCP** | Anbindung an Supabase, Cloudflare, Notion usw. |
| **Automation** | Zeitgesteuerter Cursor-Agent im Repo (Bericht oder PR). |
| **GSC** | Google Search Console — wie Google deine Seite sieht. |
