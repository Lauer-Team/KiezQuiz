# Reporting- & Kollaborationsprotokoll — KiezQuiz Agenten

> **Zweck:** Einheitliche Regeln, wann Agenten sich gegenseitig einbinden, was Reports enthalten müssen, und wie Kalle als CEO verdichtet.  
> **Pflege:** Kalle · Stand: **2026-06-15**

---

## 1. Akten-Schema (jeder Agent)

Jeder Agent unter `ops/agents/<id>/` pflegt **dieselben 8 Dateien**:

| Datei | Inhalt | Wann aktualisieren |
|---|---|---|
| `leitstand.md` | Status, Entscheidungen, Kurzüberblick der Abteilung | Bei jeder Statusänderung |
| `backlog.md` | Themen ohne festes Datum | Bei neuen Ideen / Prioritätswechsel |
| `todos.md` | Konkrete offene Aufgaben | Wöchentlich + bei neuen Aufgaben |
| `memories.md` | Dauerhafte Learnings (für Automations-Memories) | Nach größeren Läufen |
| `routinen.md` | Cron-Routinen, die dieser Agent betreut | Bei neuen/geänderten Automationen |
| `anweisungen.md` | Definition of Done, Grenzen, Reporting-Pflicht | Bei Regeländerungen |
| `dashboard.md` | **„Heute“-Sicht** — Status, Top-Todos, Automations (für UI) | Bei jedem Report-Lauf |
| `reports.md` | Index + Kurzfassung der jüngsten Berichte | Nach jedem Bericht in `ops/reports/` |

**Quelle der Wahrheit für das Admin-Dashboard:** `dashboard.md` (+ Konsolidierung via `scripts/build_ai_dashboard_data.py`).

---

## 2. Themen-Matrix — wann ruft ein Agent wen?

| Auslöser | Primär | Sekundär (Kalle informieren) |
|---|---|---|
| Neues Feature / Code-PR | CTO | Legal (Trigger?), Security, SEO |
| Deploy / Live-Gang | COO + CTO | Kalle (Freigabe-Gate) |
| Kosten / Quota >70 % | CFO | Kalle → Mensch (Upgrade-Gate) |
| Rechtstext / NB / DSGVO | CLO | Kalle → Legora (Human-as-agent) |
| SEO / Sitemap / GSC | CMO | Kalle |
| Uptime / Backup / CI | COO | Kalle |
| Dependabot / RLS / Secrets | CSO | Kalle, ggf. CLO (TOM) |
| Stadt-Wünsche / Feedback | CXO | Kalle, ggf. CTO (Feature) |
| Fristen / Deadlines | Kalle (CEO) | Betroffener Fach-Agent |

**Regel:** Fach-Agenten **melden an Kalle**, nicht direkt an den Menschen — außer Human-as-agent-Aufgaben (nummerierte Schritte).

---

## 3. Report-Pflichtfelder (jeder Bericht in `ops/reports/`)

Jeder Bericht beginnt mit:

```markdown
# [Titel] — YYYY-MM-DD
**Agent:** [Rolle] · **Status:** 🟢/🟡/🔴
```

Und enthält mindestens:

1. **Status** — grün/gelb/rot + ein Satz
2. **Risiken** — was könnte schiefgehen?
3. **Entscheidungen** — was wurde festgelegt?
4. **Offene Fragen** — was braucht Mensch/Kalle?
5. **Nächste Schritte** — nummeriert, laienverständlich

Danach: betroffene Agenten-Akten aktualisieren (`dashboard.md`, `leitstand.md`, ggf. `reports.md`).

---

## 4. Wie Kalle Reports empfängt und verdichtet

1. **Session-Start:** `ops/agents/ceo-kalle/leitstand.md` + jüngste `ops/reports/` lesen.
2. **Nach Automation-Lauf:** Fach-Agent schreibt Bericht → aktualisiert eigene Akte → Kalle aktualisiert CEO-Akte + ggf. `ops/DEADLINES.md`.
3. **Wöchentlich (Orchestrator #7):** Alle Agenten-`dashboard.md` konsolidieren, `build_ai_dashboard_data.py` ausführen, Upload.
4. **Leitstand-Pointer:** `ops/LEITSTAND.md` verweist auf CEO-Akte — kein paralleles Todo-Dump.

---

## 5. Automations → Agenten-Dateien

Siehe `ops/AUTOMATIONS.md` — jede Automation listet exakt, welche Dateien sie schreibt.

---

## 6. Freigabe-Gates (nur Mensch)

Deploy · Geld · Recht · DNS · E-Mails · Daten löschen — siehe `ops/ORGANIGRAMM.md` §12.
