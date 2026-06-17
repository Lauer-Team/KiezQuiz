# Memories — Kalle (CEO)

> Dauerhafte Learnings für Automations-Memories · Stand: **2026-06-16**

- **Bot-Mail:** iCloud+ Custom Domain — Mail-Module Source of Truth im **Server-Repo** (rsync). Doku: `telegram-agent/EMAIL.md`.
- **Resend:** Abgeschaltet (16.06.2026) — alles über iCloud Mail.

- **GSC:** Manueller Check Standard; Google Cloud/API nicht nötig.
- **HaveIBeenPwned:** Bewusst offen — nur Supabase Pro; erst bei Umsatz.
- **Dashboard:** Admin-only via Supabase Storage — `ops/` nicht auf kiezquiz.de deployen.
- **Leitstand:** Kein Todo-Dump — Termine in `ops/agents/ceo-kalle/todos.md`, Themen in Agenten-Backlogs.
- **Legal:** Nie selbst Rechtstexte — nur Legora-Arbeitsaufträge vorbereiten.
- **Ravensburg-Karte (16.06.2026):** PR #75/#76 (Ortschafts-Split + Ring-Dedup) live, Nutzer meldet weiter falsche Darstellung → **offen**, Session bewusst pausiert. Nächster Schritt: Referenz Wikipedia/OSM, ggf. andere Datenquelle oder vereinfachtes 4-Flächen-Modell statt OSM-Multiring.

Weitere Learnings: `ops/RETRO.md`

---

## Retro (migriert)

# Retro — Leitagent Kalle

Kurze Learnings nach größeren Durchläufen (Datum · Kontext · Lehre).

---

## 2026-06-15 — Zugangs-Setup & Phase 1

**Kontext:** Master-Auftrag v2, ops-Struktur, Zugangs-Matrix.

**Gut:** Supabase/Cloudflare/Notion MCPs; klare Human-Gates; GSC + Resend schnell erledigt.

**Schlecht:** Backup wurde mit „Supabase Pro" verwechselt — Free Tier erlaubt manuellen pg_dump (`docs/BACKUP-SUPABASE.md`), nur Supabase-eigene Auto-Backups sind Pro.

## 2026-06-15 — Phase 1 abgeschlossen

**Lehre:** `PATH=` in GitHub Actions kann `python3` löschen — besser `export PATH=...:$PATH` im Run-Block.

**Lehre:** Backup-Archiv gehört Kalle (Skript + Supplement-Ordner), nicht menschliche Copy-Paste-Routine.

## 2026-06-15 — Masterauftrag v2 abgeschlossen

**Kontext:** Phase 2 Finance + Support, Phase 3 Legal-Koordination.

**Lehre:** Free-Tier-Services explizit inventarisieren — sonst überrascht Resend/Supabase bei Wachstum.

**Lehre:** Legal = Koordination in Cursor, Formulierung in Legora — getrennte Rollen klar halten.

## 2026-06-15 — Ops-Aufräumen (NB, Roadmap, Actions)

**Kontext:** NB-Backlog war veraltet (E-Mails schon am 10.06. raus). Finance/Support-Automations live.

**Lehre:** `pendingNotice: true` ≠ „E-Mail offen" — Gäste-Banner bis Inkrafttreten trennen.

**Lehre:** Aufgeschobenes gehört in `ROADMAP.md`, Termine in `DEADLINES.md` — nicht alles in den Leitstand.

---

---

## Phase-2-Status (migriert)

# Masterauftrag v2 — Status

> **Phase 0–3 abgeschlossen** (2026-06-15). Feinschliff: `ops/agents/ceo-kalle/backlog.md` · Monetarisierung: `ops/plans/MONETIZATION.md`

## Erledigt

| Phase | Inhalt | Nachweis |
|---|---|---|
| **0** | Bestandsaufnahme | `ops/TECHSTACK.md`, `ops/ZUGAENGE.md` |
| **1** | Leitstand, Playbook, SEO, DevOps, Security, Automations | PR #40–#43 |
| **2** | Finance (40), Support (50), 7 Automations live | `ops/agents/cfo-finanzen/`, `.cursor/rules/40-finance.mdc` |
| **3** | Legal-Koordination über Legora | `ops/agents/clo-legal/`, `.cursor/rules/60-legal-coordination.mdc` |

## Aufgeschoben (Roadmap)

- GSC: **manuell** (Standard) · API optional
- HaveIBeenPwned: erst mit Supabase Pro + Umsatz
- Monetarisierung (Plan in `ops/plans/MONETIZATION.md`)

## Verwandte Dateien

- `ops/agents/ceo-kalle/anweisungen.md` — vollständiges Regelwerk (Masterauftrag-Text)
- `ops/agents/ceo-kalle/leitstand.md` — aktueller Betriebsstatus
- `ops/agents/ceo-kalle/backlog.md` — aufgeschobene Themen
- `ops/agents/ceo-kalle/todos.md` — Termine mit Erinnerung
