#!/usr/bin/env python3
"""
Monatliche E-Mail-Erinnerung: Supabase-Daten exportieren und archivieren.

Nutzung:
  python3 scripts/send_backup_reminder.py --dry-run
  python3 scripts/send_backup_reminder.py --send

Umgebungsvariablen:
  KIEZ_ICLOUD_LOGIN           (Pflicht für --send, Apple-ID @icloud.com)
  KIEZ_ICLOUD_APP_PASSWORD    (Pflicht für --send)
  KIEZ_BACKUP_REMINDER_TO     (Standard: info@kiezquiz.de)
  KIEZ_TERMS_FROM_EMAIL       (Standard: info@kiezquiz.de)
  KIEZ_TERMS_FROM_NAME        (Standard: KiezQuiz)
  KIEZ_SITE_URL               (Standard: https://kiezquiz.de)
  KIEZ_GITHUB_REPO            (Standard: Lauer-Team/KiezQuiz)
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from lib.email_smtp import send_html_email  # noqa: E402

TEMPLATE = ROOT / "docs/email-backup-reminder.html"

MONTHS_DE = (
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
)


def load_cfg() -> dict:
    import os

    return {
        "toEmail": os.environ.get("KIEZ_BACKUP_REMINDER_TO", "info@kiezquiz.de").strip(),
        "fromEmail": os.environ.get("KIEZ_TERMS_FROM_EMAIL", "info@kiezquiz.de").strip(),
        "fromName": os.environ.get("KIEZ_TERMS_FROM_NAME", "KiezQuiz").strip(),
        "siteUrl": os.environ.get("KIEZ_SITE_URL", "https://kiezquiz.de").strip().rstrip("/"),
        "githubRepo": os.environ.get("KIEZ_GITHUB_REPO", "Lauer-Team/KiezQuiz").strip(),
    }


def build_message(cfg: dict) -> tuple[str, str, str]:
    now = datetime.now()
    month_label = f"{MONTHS_DE[now.month - 1]} {now.year}"
    actions_url = f"https://github.com/{cfg['githubRepo']}/actions/workflows/supabase-backup.yml"
    docs_url = f"https://github.com/{cfg['githubRepo']}/blob/main/docs/BACKUP-SUPABASE.md"

    subject = f"KiezQuiz: Monatlicher Daten-Export ({month_label})"

    text = f"""KiezQuiz — Monatlicher Daten-Export ({month_label})

WARUM?
Supabase Free Tier hat keine automatischen DB-Backups. Für die TOMs (Art. 32 DSGVO)
sichern wir Nutzerdaten monatlich per SQL-Export (Schema public).

GitHub Actions erstellt am 1. jeden Monats automatisch ein Backup.
Diese E-Mail erinnert dich, es herunterzuladen und dauerhaft zu archivieren.

SCHRITT 1 — Backup prüfen & herunterladen
1. GitHub → Actions → „Supabase monthly backup“
2. Letzten Run öffnen (Status grün?)
3. Unter Artifacts die Datei supabase-backup-… herunterladen
   {actions_url}

SCHRITT 2 — Dauerhaft archivieren
GitHub speichert Artifacts nur 90 Tage.
Kopie ablegen in z. B. Rechtsdokumente / iCloud / externe Festplatte.

ALTERNATIVE — Manuell
  python3 scripts/setup_supabase_backup.py   # einmalig
  python3 scripts/export_supabase_backup.py --dry-run
  python3 scripts/export_supabase_backup.py

Anleitung: {docs_url}
"""

    html = TEMPLATE.read_text(encoding="utf-8")
    for key, value in {
        "{{SITE_URL}}": cfg["siteUrl"],
        "{{ACTIONS_URL}}": actions_url,
        "{{DOCS_URL}}": docs_url,
        "{{MONTH_LABEL}}": month_label,
    }.items():
        html = html.replace(key, value)

    return subject, text, html


def main() -> None:
    parser = argparse.ArgumentParser(description="Monatliche Backup-Erinnerung per E-Mail")
    parser.add_argument("--dry-run", action="store_true", help="Nur Vorschau, kein Versand")
    parser.add_argument("--send", action="store_true", help="E-Mail versenden")
    args = parser.parse_args()

    if not args.dry_run and not args.send:
        parser.error("Bitte --dry-run oder --send angeben")

    cfg = load_cfg()
    subject, text, html = build_message(cfg)

    print(f"An:      {cfg['toEmail']}")
    print(f"Betreff: {subject}")
    print()

    if args.dry_run:
        print("--- Text-Vorschau ---")
        print(text)
        print("--- Dry-run OK ---")
        return

    send_html_email(
        to=cfg["toEmail"],
        subject=subject,
        text=text,
        html=html,
        from_email=cfg["fromEmail"],
        from_name=cfg["fromName"],
    )
    print(f"✓ E-Mail gesendet an {cfg['toEmail']} (iCloud SMTP)")


if __name__ == "__main__":
    main()
