#!/usr/bin/env python3
"""Einmal-Setup für monatliche Supabase-Backups (lokal + optional GitHub Actions)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG = SCRIPT_DIR / "backup-supabase.config.json"
EXAMPLE = SCRIPT_DIR / "backup-supabase.config.example.json"
PROJECT_REF = "iuixaesbzftgmnmelcad"
REGION = "eu-west-1"


def main() -> None:
    if CONFIG.exists():
        print(f"Config existiert bereits: {CONFIG}")
        print("Zum Neu-Setup zuerst löschen.")
        sys.exit(0)

    if not EXAMPLE.exists():
        print(f"Fehler: {EXAMPLE} fehlt.", file=sys.stderr)
        sys.exit(1)

    template = json.loads(EXAMPLE.read_text(encoding="utf-8"))
    CONFIG.write_text(json.dumps(template, indent=2) + "\n", encoding="utf-8")

    print(f"✓ Vorlage geschrieben: {CONFIG}")
    print()
    print("=== 1. Datenbank-Passwort eintragen ===")
    print("Supabase Dashboard → KiezQuiz Backend → Project Settings → Database")
    print("  • Database password (notieren oder resetten)")
    print("  • Connection string → URI → „Direct connection“")
    print(f"  • Host: db.{PROJECT_REF}.supabase.co:5432")
    print()
    print(f"In {CONFIG} das Feld databaseUrl anpassen:")
    print(f"  postgresql://postgres:DEIN_PASSWORT@db.{PROJECT_REF}.supabase.co:5432/postgres")
    print()
    print("=== 2. Lokal testen ===")
    print("  python3 scripts/export_supabase_backup.py --dry-run")
    print("  python3 scripts/export_supabase_backup.py")
    print("  → Datei liegt unter backups/supabase/")
    print()
    print("=== 3. Automatisch jeden Monat (GitHub Actions) ===")
    print("GitHub → Repository → Settings → Secrets → Actions → New secret")
    print("  Name:  KIEZ_SUPABASE_DB_URL")
    print("  Wert:  dieselbe databaseUrl (mit Passwort)")
    print()
    print("Workflow: .github/workflows/supabase-backup.yml")
    print("  • Läuft automatisch am 1. jeden Monats (03:00 UTC)")
    print("  • Backup als GitHub Artifact (90 Tage Aufbewahrung)")
    print("  • Manuell: Actions → „Supabase monthly backup“ → Run workflow")
    print()
    print("=== 4. E-Mail-Erinnerung (automatisch) ===")
    print("GitHub Secret: KIEZ_RESEND_API_KEY (Resend API Key)")
    print("  → Am 2. jeden Monats E-Mail an info@kiezquiz.de mit Export-Anleitung")
    print("  Workflow: .github/workflows/backup-reminder.yml")
    print()
    print("=== 5. Wichtig ===")
    print("  • backups/ und backup-supabase.config.json sind in .gitignore")
    print("  • Kopie des Backups regelmäßig OFFLINE archivieren (iCloud/Disk)")
    print("  • Vollständige Anleitung: docs/BACKUP-SUPABASE.md")


if __name__ == "__main__":
    main()
