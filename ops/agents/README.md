# Agenten — KiezQuiz KI-Management

Jeder Agent ist ein „Mitarbeiter“ mit **8 Pflicht-Dateien** + optional `reports/` für Einzelberichte.

| Datei | Wann pflegen? |
|---|---|
| `leitstand.md` | Bei Statusänderung |
| `dashboard.md` | Bei jedem Lauf / wenn UI-Stand sich ändert |
| `todos.md` | Neue Aufgaben, erledigte abhaken |
| `backlog.md` | Neue Ideen ohne Datum |
| `routinen.md` | Neue Automation / Cron |
| `anweisungen.md` | Grenzen, Playbook, Zugänge (CEO) |
| `memories.md` | Learnings nach größeren Läufen |
| `reports.md` | Index der Berichte |

**CEO** verdichtet Reports aller Agenten in [`ceo-kalle/leitstand.md`](ceo-kalle/leitstand.md).

Siehe auch: [`PROTOKOLL.md`](PROTOKOLL.md) · [`registry.json`](registry.json) · [`ORGANIGRAMM.md`](ORGANIGRAMM.md)
