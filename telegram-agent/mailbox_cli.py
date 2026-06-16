#!/usr/bin/env python3
"""CLI für iCloud-Postfach (kalle@kiezquiz.de) — von Kalle-Agent aufrufbar."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from mailbox import (
    delete_message,
    format_inbox_list,
    format_message_detail,
    list_inbox,
    read_message,
    resolve_mailbox_config,
    send_message,
)

CONFIG_PATH = Path(__file__).resolve().parent / "config.json"


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def load_config() -> dict:
    with CONFIG_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def main() -> None:
    parser = argparse.ArgumentParser(description="KiezQuiz iCloud Postfach")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_inbox = sub.add_parser("inbox", help="Posteingang auflisten")
    p_inbox.add_argument("--limit", type=int, default=10)

    p_read = sub.add_parser("read", help="Mail lesen")
    p_read.add_argument("--uid", required=True)

    p_send = sub.add_parser("send", help="Mail senden")
    p_send.add_argument("--to", required=True)
    p_send.add_argument("--subject", required=True)
    p_send.add_argument("--body", required=True)

    p_del = sub.add_parser("delete", help="Mail löschen")
    p_del.add_argument("--uid", required=True)

    args = parser.parse_args()
    load_dotenv(CONFIG_PATH.parent / ".env")
    cfg = load_config()
    box_cfg = resolve_mailbox_config(cfg)
    if not box_cfg:
        print(
            "iCloud nicht konfiguriert (icloud_mailbox in config.json + KIEZ_ICLOUD_* in .env, siehe EMAIL.md)",
            file=sys.stderr,
        )
        sys.exit(1)

    if args.cmd == "inbox":
        items = list_inbox(box_cfg, limit=args.limit)
        print(format_inbox_list(items))
    elif args.cmd == "read":
        msg = read_message(box_cfg, args.uid)
        print(format_message_detail(msg))
    elif args.cmd == "send":
        send_message(box_cfg, args.to, args.subject, args.body)
        print(f"✓ Gesendet an {args.to}")
    elif args.cmd == "delete":
        delete_message(box_cfg, args.uid)
        print(f"✓ Gelöscht UID {args.uid}")


if __name__ == "__main__":
    main()
