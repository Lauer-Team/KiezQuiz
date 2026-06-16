#!/usr/bin/env python3
"""Einmal-Setup für NB-Benachrichtigung: Config erzeugen, Secret generieren, Anleitung ausgeben."""

from __future__ import annotations

import json
import secrets
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = Path(__file__).resolve().parent / "terms-notify.config.json"
EXAMPLE = Path(__file__).resolve().parent / "terms-notify.config.example.json"
SUPABASE_URL = "https://iuixaesbzftgmnmelcad.supabase.co"
EDGE_URL = f"{SUPABASE_URL}/functions/v1/notify-terms-change"


def main() -> None:
    if CONFIG.exists():
        print(f"Config existiert bereits: {CONFIG}")
        print("Zum Neu-Setup zuerst löschen.")
        sys.exit(0)

    notify_secret = secrets.token_urlsafe(32)
    cfg = {
        "mode": "edge",
        "edgeFunctionUrl": EDGE_URL,
        "notifySecret": notify_secret,
        "supabaseUrl": SUPABASE_URL,
        "fromEmail": "info@kiezquiz.de",
        "fromName": "KiezQuiz",
        "siteUrl": "https://kiezquiz.de",
    }

    CONFIG.write_text(json.dumps(cfg, indent=2) + "\n", encoding="utf-8")
    print(f"✓ Config geschrieben: {CONFIG}")
    print()
    print("=== Supabase Dashboard (einmalig) ===")
    print("Project: KiezQuiz Backend → Edge Functions → notify-terms-change → Secrets")
    print("Diese Secrets eintragen:")
    print()
    print(f"  NOTIFY_TERMS_SECRET = {notify_secret}")
    print("  SMTP_LOGIN          = deinname@icloud.com  (Apple-ID, nicht @kiezquiz.de)")
    print("  SMTP_APP_PASSWORD   = xxxx-xxxx-xxxx-xxxx  (App-Passwort)")
    print("  FROM_EMAIL          = info@kiezquiz.de  (optional)")
    print("  SITE_URL            = https://kiezquiz.de (optional)")
    print()
    print("=== GitHub Secrets (optional, für Actions) ===")
    print("  gh secret set NOTIFY_TERMS_SECRET --body '...'")
    print()
    print("=== Test ===")
    print("  python3 scripts/notify_terms_change.py --dry-run")
    print("  python3 scripts/notify_terms_change.py --send --owner-approved --test-to info@kiezquiz.de")


if __name__ == "__main__":
    main()
