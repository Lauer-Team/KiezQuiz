# Reporting- & Kollaborationsprotokoll — KiezQuiz Agenten

> **Zweck:** Alle Agenten bleiben synchron.  
> **Prinzip:** Wer arbeitet, aktualisiert seine Akte und verteilt zielgerichtete Reports.  
> **Pflege:** Kalle · Stand: **2026-06-15**

---

## 1. Verbindlicher Arbeitszyklus (für jeden Agenten, immer)

Wenn ein Agent angesprochen wird (Chat, Automation, Aufgabe), läuft immer dieselbe Reihenfolge:

1. **Eingang prüfen (vor Bearbeitung)**
   - Neue Reports in `ops/agents/<eigene-id>/reports/` lesen.
   - Zusätzlich Reports in `ops/agents/ceo-kalle/reports/` lesen (CEO-Lagebild).
   - Letzten Sync in `memories.md` unter `## Report-Sync` führen.
2. **Aufgabe bearbeiten**
   - Facharbeit durchführen.
3. **Eigene 8 Dateien aktualisieren (wo nötig)**
   - `leitstand.md`, `backlog.md`, `todos.md`, `memories.md`, `routinen.md`, `anweisungen.md`, `dashboard.md`, `reports.md`.
4. **Reports verteilen**
   - **Immer** Report an Kalle schreiben.
   - Zusätzlich je einen Report an jeden betroffenen Fach-Agenten schreiben.
5. **Sync markieren**
   - `memories.md`: Zeitstempel + Kurznotiz „Eingang geprüft / verteilt“.

Ohne diesen Zyklus gilt ein Lauf als unvollständig.

---

## 2. Report-Zielorte (Pflicht)

Ein Agent schreibt Reports **nicht nur in den eigenen Ordner**, sondern in die Ordner der Empfänger:

- CEO immer: `ops/agents/ceo-kalle/reports/`
- Fachlich betroffen: `ops/agents/<ziel-agent>/reports/`

### Dateiname (Standard)

`YYYY-MM-DD-HHMM-from-<quelle>-to-<ziel>-<thema>.md`

Beispiel:  
`2026-06-15-2210-from-cfo-finanzen-to-ceo-kalle-quota-warnung.md`

---

## 3. Report-Pflichtinhalt (für den Empfänger relevant)

Jeder Report enthält mindestens:

1. **Kontext** — warum du den Report bekommst
2. **Status** — 🟢/🟡/🔴 + ein Satz
3. **Was sich geändert hat** — nur empfängerrelevante Punkte
4. **Risiko/Implikation** — was der Empfänger beachten muss
5. **Erwartete Aktion** — was der Empfänger jetzt tun soll (falls nötig)
6. **Links in Akten** — betroffene Dateien

Kurzformat:

```markdown
# [Thema] — YYYY-MM-DD HH:MM
**Von:** <quelle> · **An:** <ziel> · **Status:** 🟢/🟡/🔴

## Für dich relevant
- ...

## Erwartete Aktion
1. ...

## Betroffene Akten
- ops/agents/<quelle>/dashboard.md
- ops/agents/<quelle>/leitstand.md
```

---

## 4. Akten-Schema (jeder Agent)

Jeder Agent unter `ops/agents/<id>/` pflegt dieselben 8 Dateien:

| Datei | Inhalt | Wann aktualisieren |
|---|---|---|
| `leitstand.md` | Status, Entscheidungen, Kurzüberblick | Bei jeder Statusänderung |
| `backlog.md` | Themen ohne festes Datum | Bei neuen Ideen / Prioritätswechsel |
| `todos.md` | Konkrete Aufgaben | Bei neuen/erledigten Aufgaben |
| `memories.md` | Learnings + Report-Sync | Nach jedem Lauf |
| `routinen.md` | Cron-Routinen | Bei neuen/geänderten Automationen |
| `anweisungen.md` | Definition of Done, Grenzen | Bei Regeländerungen |
| `dashboard.md` | Heute-Sicht für UI | Bei jedem Lauf |
| `reports.md` | Index eigener Berichte | Nach jedem Bericht |

**Quelle der Wahrheit fürs Dashboard:** `dashboard.md` (+ `scripts/build_ai_dashboard_data.py`).

---

## 5. Themen-Matrix — wen zusätzlich informieren?

| Auslöser | Primär | Zusätzlich reporten an |
|---|---|---|
| Neues Feature / Code-PR | Theo (CTO) | Kalle, Lara (CLO), Samira (CSO), Maja (CMO) |
| Deploy / Live-Gang | Oskar (COO) + Theo (CTO) | Kalle |
| Kosten / Quota >70 % | Frida (CFO) | Kalle, ggf. Oskar (COO) |
| Rechtstext / NB / DSGVO | Lara (CLO) | Kalle |
| SEO / Sitemap / GSC | Maja (CMO) | Kalle, ggf. Theo (CTO) |
| Uptime / Backup / CI | Oskar (COO) | Kalle, ggf. Samira (CSO) |
| Dependabot / RLS / Secrets | Samira (CSO) | Kalle, ggf. Lara (CLO), Theo (CTO) |
| Stadt-Wünsche / Feedback | Xenia (CXO) | Kalle, ggf. Theo (CTO), Maja (CMO) |
| Fristen / Deadlines | Kalle | Betroffener Fach-Agent |

Regel: Fach-Agenten reporten nicht direkt an den Menschen, außer bei Human-as-agent-Schritten.

---

## 6. Kalle als CEO-Drehscheibe

Kalle muss immer wissen, was läuft:

1. Liest alle neuen Reports in `ops/agents/ceo-kalle/reports/`.
2. Aktualisiert CEO-Akte (`leitstand.md`, `dashboard.md`, `todos.md`, `reports.md`).
3. Verteilt Rückfragen oder Folgeaufträge an betroffene Agenten via Report-Datei.
4. Konsolidiert für Dashboard-Refresh (`build_ai_dashboard_data.py`).

---

## 7. Freigabe-Gates (nur Mensch)

Deploy · Geld · Recht · DNS · E-Mails · Daten löschen — siehe `ops/agents/ORGANIGRAMM.md`.
