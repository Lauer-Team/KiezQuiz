# Fälligkeiten & Erinnerungen — KiezQuiz

> **Zweck:** Termine mit Erinnerungsdatum — getrennt vom Leitstand (Status) und Backlogs (Themen).  
> **Pflege:** Jeder Agent/Kalle trägt hier **fristgebundene** Punkte ein.  
> **Erinnerung:** Automation **Ops Weekly Review** (Mo 07:00 UTC) prüft `Erinnern ab` und meldet in `ops/reports/`.  
> **Aufgeschoben ohne Datum:** [`ROADMAP.md`](ROADMAP.md)

**Legende Status:** 🟢 erledigt · 🟡 anstehend · 🔴 dringend (≤14 Tage bis Fälligkeit) · ⏸️ wartet

| ID | Was | Fällig am | Erinnern ab | Wer | Status | Notiz |
|---|---|---|---|---|---|---|
| D1 | **Domain kiezquiz.de verlängern** (United Domains) | 2027-05-30 | 2027-04-01 | Du | 🟢 | Laufzeit 31.05.2026–30.05.2027 · ~12–15 €/Jahr |
| D2 | **NB werden wirksam** (Version 2026-06-10) | 2026-07-11 | 2026-06-20 | Kalle | 🟡 | E-Mails **bereits** am 10.06. versendet · Gäste-Banner läuft bis D4 |
| D3 | **Cursor Downgrade** Pro+ → Pro (~20 USD) | 2026-07-01 | 2026-06-25 | Kalle | 🟡 | Rechnung Juli prüfen → `ops/finance/COSTS.md` |
| D4 | **NB-Gäste-Banner abschalten** (`pendingNotice: false`) | 2026-07-12 | 2026-07-11 | Kalle | 🟡 | `python3 scripts/deactivate_terms_notice.py --apply` → PR |

---

## Aufgeschobene Themen (ohne feste Frist)

Alles Bewusst-später — Details und IDs in **[`ROADMAP.md`](ROADMAP.md)**:

| Bereich | Beispiele |
|---|---|
| Umsatz | Monetarisierung (Plan in [`plans/MONETIZATION.md`](plans/MONETIZATION.md)) |
| SEO | GSC manuell (~5 Min/Monat), Bing Webmaster |
| Security | HaveIBeenPwned — erst mit Supabase Pro + Umsatz |
| Ops | Telegram reaktivieren, Dependabot-PRs mergen |

---

## Regeln

1. **Leitstand** = Status & Entscheidungen (kein Todo-Dump).
2. **Diese Datei** = alles mit **Datum** (Verlängerungen, Deadlines, Erinnerungen).
3. **Themen ohne Datum** → [`ROADMAP.md`](ROADMAP.md), `ops/legal/BACKLOG.md`, oder Leitstand §6.
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
