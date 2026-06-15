#!/usr/bin/env python3
"""Deactivate guest terms banner after effectiveDate has passed.

Run on or after terms.effectiveDate (see legalConfig.js):

  python3 scripts/deactivate_terms_notice.py --dry-run
  python3 scripts/deactivate_terms_notice.py --apply
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGAL_CONFIG = ROOT / "src" / "data" / "legalConfig.js"
TERMS_NOTICE = ROOT / "src" / "data" / "termsNotice.json"


def parse_effective_date(text: str) -> date | None:
    m = re.search(r"effectiveDate:\s*['\"]([^'\"]+)['\"]", text)
    if not m:
        return None
    try:
        return date.fromisoformat(m.group(1))
    except ValueError:
        return None


def pending_is_true(text: str) -> bool:
    m = re.search(r"pendingNotice:\s*(true|false)", text)
    return bool(m and m.group(1) == "true")


def apply_deactivate(config_text: str) -> str:
    return re.sub(r"pendingNotice:\s*true", "pendingNotice: false", config_text)


def apply_notice_json(notice_path: Path) -> None:
    if not notice_path.is_file():
        return
    import json

    data = json.loads(notice_path.read_text(encoding="utf-8"))
    data["active"] = False
    notice_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if not args.dry_run and not args.apply:
        parser.error("Bitte --dry-run oder --apply angeben")

    if not LEGAL_CONFIG.is_file():
        print(f"Fehler: {LEGAL_CONFIG} fehlt", file=sys.stderr)
        return 1

    text = LEGAL_CONFIG.read_text(encoding="utf-8")
    effective = parse_effective_date(text)
    if not effective:
        print("Fehler: effectiveDate nicht lesbar", file=sys.stderr)
        return 1

    if not pending_is_true(text):
        print("Nichts zu tun: pendingNotice ist bereits false.")
        return 0

    today = date.today()
    if today < effective:
        print(
            f"Noch zu früh: effectiveDate ist {effective.isoformat()}, heute {today.isoformat()}.\n"
            "Gäste-Banner bleibt aktiv bis dahin (Absicht)."
        )
        return 0

    print(f"effectiveDate {effective.isoformat()} erreicht — Banner deaktivieren.")

    if args.dry_run:
        print("Dry-run: würde pendingNotice: false setzen und termsNotice.json active=false.")
        return 0

    LEGAL_CONFIG.write_text(apply_deactivate(text), encoding="utf-8")
    apply_notice_json(TERMS_NOTICE)
    print("Erledigt: legalConfig.js + termsNotice.json aktualisiert. Commit + PR nötig.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
