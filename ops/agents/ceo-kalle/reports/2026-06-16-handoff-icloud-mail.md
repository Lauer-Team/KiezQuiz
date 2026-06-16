# Report — Handoff iCloud-Mail (Server → KiezQuiz)

**Datum:** 2026-06-16  
**Agent:** Kalle (CEO)  
**Quelle:** Server-Projekt Handoff-Report

## Erledigt (P1 + P2)

- **`telegram-agent/EMAIL.md`** neu — Source of Truth, iCloud-Config, Deploy-Regel, Debugging
- **`config.example.json`**, **`.env.example`** — iCloud statt Resend/Web.de
- **`bot.py`**, **`send_email.py`**, **`mailbox_cli.py`** — Texte, Hilfe, Fehlermeldungen aktualisiert
- **`outbound.py`**, **`mailbox.py`** — Hinweis: Produktionscode vom Server-Repo deployed
- **`ANLEITUNG.md`** — Hetzner-Produktion, GitHub-Org, E-Mail-Verweis
- **CTO `memories.md`** — TechStack Mail/Bot aktualisiert
- **CFO `transactions.csv`** — Resend/Web.de/iCloud/Hetzner inventarisiert
- **Impressum** geprüft: `info@kiezquiz.de` — korrekt, keine Web.de-Referenz

## Entscheidung Source of Truth

**Mail-Module (`outbound.py`, `email_smtp.py`, `mailbox.py`):** Server-Repo (`Lauer-Team/Server`, `deploy/kiezquiz-agent/`). Deploy via `server-update.sh --runtime-only`.

**Bot-Logik & Doku:** KiezQuiz-Repo.

## Offen / Optional

| ID | Thema | Wer |
|---|---|---|
| P3 | `webde_mailbox` → `icloud_mailbox` umbenennen | Optional, beide Repos |
| P4 | Web.de kündigen | Du (Human) |
| L6 | NB/Backup von Resend migrieren + DSE §7 | CLO / Legora |
| — | `bot.py`-Änderungen auf Server deployen (PR + pull auf VPS) | Nach Merge |

## Status Leitstand

Telegram-Agent: 🟢 (Hetzner, iCloud-Mail live)
