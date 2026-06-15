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
| **Supabase-Backup** | 🟡 | Lokal OK; CI PATH-Fix in PR |

---

## 2. Offene Aufgaben

### Kalle erledigt selbst
- [x] Phase 1: Leitstand, Organigramm, Abteilungs-Regeln, AUTOMATIONS.md (PR)
- [ ] Backup-Workflow PATH-Fix mergen lassen

### Aufgabe für dich (Mensch)

#### 🔔 Monatlich: Backup offline sichern

| Wann | Was |
|---|---|
| **1. des Monats** | GitHub Backup (Artifact) |
| **2. des Monats** | E-Mail an info@kiezquiz.de |

- [ ] **Einmalig:** Erstes Backup (15.06.2026) offline archiviert
- [ ] **Cursor Automations** anlegen — siehe `ops/AUTOMATIONS.md` (Start: Uptime Smoke Check)
- [ ] GSC API (OAuth) — optional, für automatisches SEO-Briefing

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
| 2026-06-15 | Phase 1 abgeschlossen (PR ops/leitagent-phase1) | Fundament für Fach-Agenten |
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
