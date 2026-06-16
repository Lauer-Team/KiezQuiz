#!/usr/bin/env python3
"""E-Mail versenden (Resend) — für Kalle-Agent und Cursor-Aufgaben."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from outbound import resolve_email_config, send_email

SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / "config.json"


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        print("config.json fehlt", file=sys.stderr)
        sys.exit(1)
    with CONFIG_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def main() -> None:
    parser = argparse.ArgumentParser(description="Kalle: E-Mail via Resend senden")
    parser.add_argument("--to", help="Empfänger (Standard: default_to aus config)")
    parser.add_argument("--subject", required=True, help="Betreff")
    parser.add_argument("--body", required=True, help="Nachricht (Plain-Text)")
    parser.add_argument("--attach", action="append", default=[], help="Datei-Anhang (mehrfach möglich)")
    args = parser.parse_args()

    load_dotenv(SCRIPT_DIR / ".env")
    cfg = load_config()
    email_cfg = resolve_email_config(cfg)
    if not email_cfg:
        print(
            "E-Mail nicht konfiguriert. Setze KIEZ_RESEND_API_KEY und email-Abschnitt in config.json",
            file=sys.stderr,
        )
        sys.exit(1)

    to = (args.to or email_cfg.get("default_to") or "").strip()
    if not to:
        print("--to fehlt und default_to nicht gesetzt", file=sys.stderr)
        sys.exit(1)

    attachments = [Path(p) for p in args.attach]
    send_email(email_cfg, to, args.subject, args.body, attachments=attachments or None)
    print(f"✓ E-Mail gesendet an {to}")


if __name__ == "__main__":
    main()
