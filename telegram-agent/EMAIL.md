# E-Mail — KiezQuiz (Bot + Website)

> Stand: 2026-06-16 · Alles über **iCloud+ Custom Domain** (`kiezquiz.de`)

---

## Kurzüberblick

| Funktion | Absender | Backend |
|----------|----------|---------|
| Telegram `/email`, `/post` | `kalle@kiezquiz.de` | iCloud SMTP/IMAP |
| NB-Benachrichtigung, Backup-Erinnerung | `info@kiezquiz.de` | iCloud SMTP |
| Öffentlicher Kontakt (Impressum) | `info@kiezquiz.de` | iCloud-Alias |

**Login für SMTP/IMAP:** Apple-ID (`@icloud.com` / `@me.com`) — **nicht** `@kiezquiz.de`.

**Resend und Web.de sind abgeschaltet.**

---

## Source of Truth

| Bereich | Repo / Ort |
|---------|------------|
| `telegram-agent/outbound.py`, `mailbox.py` (+ `lauer_bot_lib` aus bot-lib) | **KiezQuiz-Repo** (`telegram-agent/`) |
| `scripts/lib/email_smtp.py` | KiezQuiz-Repo (NB, Backup-Erinnerung) |
| `supabase/functions/notify-terms-change/` | KiezQuiz-Repo (SMTP via denomailer) |
| Bot-Logik, Doku, Config-Beispiele | KiezQuiz-Repo |
| Server-Deploy `server-update.sh --runtime-only` | Kann Mail-Module überschreiben — **Server-Repo mitziehen** oder Runtime-Deploy für Mail weglassen |

---

## Secrets

### Bot (Hetzner VPS)

Pfad: `/home/jjl/projects/KiezQuiz/telegram-agent/.env`

```bash
KIEZ_ICLOUD_LOGIN=deinname@icloud.com
KIEZ_ICLOUD_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

Setup: `bash /home/jjl/projects/server/scripts/setup-kiezquiz-icloud-email.sh` (Server-Repo)

### GitHub Actions (Backup-Erinnerung)

| Secret | Wert |
|--------|------|
| `KIEZ_ICLOUD_LOGIN` | Apple-ID |
| `KIEZ_ICLOUD_APP_PASSWORD` | App-Passwort |

### Supabase Edge Function `notify-terms-change`

| Secret | Wert |
|--------|------|
| `NOTIFY_TERMS_SECRET` | wie bisher |
| `SMTP_LOGIN` | Apple-ID |
| `SMTP_APP_PASSWORD` | App-Passwort |
| `FROM_EMAIL` | `info@kiezquiz.de` (optional) |
| `SITE_URL` | `https://kiezquiz.de` (optional) |

`RESEND_API_KEY` **entfernen**.

---

## config.json (Bot)

Siehe `config.example.json` — Key `icloud_mailbox` (Legacy-Alias `webde_mailbox` wird noch gelesen).

---

## Bot-Host

| | |
|---|---|
| VPS | `138.199.159.170` |
| Service | `systemctl kiezquiz-agent` |
| Neustart | `/restart` oder `sudo systemctl restart kiezquiz-agent` |

---

## Tests

```bash
# Bot (Server)
cd /home/jjl/projects/KiezQuiz/telegram-agent
python3 send_email.py --subject Test --body OK
python3 mailbox_cli.py inbox

# Backup-Erinnerung (lokal/CI)
python3 scripts/send_backup_reminder.py --dry-run

# NB (dry-run)
python3 scripts/notify_terms_change.py --dry-run
```

---

## Debugging

| Symptom | Fix |
|---------|-----|
| `535 authentication failed` | Login = Apple-ID, nicht Custom Domain |
| `/post inbox` leer | UID-Fetch in `mailbox.py` (iCloud) |
| Edge Function SMTP-Fehler | Supabase Secrets `SMTP_LOGIN` + `SMTP_APP_PASSWORD` |

---

## Abgeschlossen (2026-06-16)

- Resend-Domain gelöscht, DNS → iCloud MX/SPF/DKIM
- DSE §7 auf iCloud Mail aktualisiert
- Alle Versand-Skripte auf iCloud SMTP umgestellt

**Optional (Human):** Web.de-Account `kiezquiz@web.de` kündigen — wird nicht mehr genutzt.
