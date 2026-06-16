# Report — iCloud-Mail Doku & TechStack

**Datum:** 2026-06-16  
**Von:** Kalle (CEO)  
**An:** CTO-Ingenieur

## Änderungen

- TechStack in `memories.md`: Resend/Web.de → iCloud+ + Hetzner VPS
- Neue Referenz: `telegram-agent/EMAIL.md`
- Mail-Module: **nicht** im KiezQuiz-Repo pflegen — Server-Repo rsync

## Aktion CTO

Keine Code-Änderung nötig. Bei künftigen Bot-Mail-Features zuerst Server-Repo `deploy/kiezquiz-agent/` prüfen.

## Offen

Supabase `notify-terms-change` + `scripts/send_backup_reminder.py` nutzen noch Resend — Migration separat (CLO L6).
