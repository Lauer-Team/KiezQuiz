# Report — DSE E-Mail-Anbieter (Resend abgeschaltet)

**Datum:** 2026-06-16  
**Von:** Kalle (CEO)  
**An:** CLO-Legal

## Auslöser

Server-Handoff: Bot-Mail auf iCloud+ umgestellt, Resend-Domain gelöscht.

## Betroffene Stellen (noch Resend)

- `src/locales/de.json` / `en.json` — Datenschutz §7 Transaktionale E-Mails
- `docs/VVT-KiezQuiz.md`, `docs/TOM-KiezQuiz.md`, `docs/AVV-CHECKLIST.md`
- `supabase/functions/notify-terms-change/` — `RESEND_API_KEY`
- `scripts/notify_terms_change.py`, `scripts/send_backup_reminder.py`

## Backlog

Eintrag **L6** angelegt — Legora-Auftrag vorbereiten, wenn Migration der Website-Pipeline ansteht.

**Impressum:** unverändert korrekt (`info@kiezquiz.de`).
