# Fälligkeiten & Erinnerungen — KiezQuiz

> **Zweck:** Termine mit Erinnerungsdatum — getrennt vom Leitstand (Status) und Backlogs (Themen).  
> **Pflege:** Jeder Agent/Kalle trägt hier **fristgebundene** Punkte ein.  
> **Erinnerung:** Automation **Ops Weekly Review** (Mo 07:00 UTC) prüft `Erinnern ab` und meldet in `ops/reports/`.

**Legende Status:** 🟢 erledigt · 🟡 anstehend · 🔴 dringend (≤14 Tage bis Fälligkeit) · ⏸️ wartet

| ID | Was | Fällig am | Erinnern ab | Wer | Status | Notiz |
|---|---|---|---|---|---|---|
| D1 | **Domain kiezquiz.de verlängern** (United Domains) | 2027-05-30 | 2027-04-01 | Du | 🟢 | Laufzeit 31.05.2026–30.05.2027 · ~12–15 €/Jahr |
| D2 | **NB wirksam** + ggf. E-Mail (L1) | 2026-07-11 | 2026-06-20 | Du + Kalle | 🟡 | Siehe `ops/legal/BACKLOG.md` L1 |
| D3 | **Cursor Downgrade** Pro+ → Pro (~20 USD) | 2026-07-01 | 2026-06-25 | Kalle | 🟡 | Rechnung Juli prüfen → `ops/finance/COSTS.md` |

---

## Regeln

1. **Leitstand** = Status & Entscheidungen (kein Todo-Dump).
2. **Diese Datei** = alles mit **Datum** (Verlängerungen, Deadlines, Erinnerungen).
3. **Themen ohne Datum** → `ops/legal/BACKLOG.md`, Leitstand §6 Optimierungs-Backlog, oder Fach-Berichte.
4. **Neuer Eintrag:** Zeile mit `Erinnern ab` = mindestens **30–60 Tage vor** Fälligkeit (Domain: 60 Tage).
5. **Erledigt:** Status 🟢, Datum in Notiz.

---

## Automation (Ops Weekly Review)

Siehe `ops/AUTOMATIONS.md` §6 — liest diese Datei + Leitstand, schreibt Wochenbericht, hebt 🔴/🟡 im Leitstand §4 kurz hervor.

---

## Vorlage (kopieren)

```markdown
| D? | [Was] | YYYY-MM-DD | YYYY-MM-DD | Du/Kalle | 🟡 | [Notiz] |
```
