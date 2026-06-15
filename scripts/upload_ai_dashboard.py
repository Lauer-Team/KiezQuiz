#!/usr/bin/env python3
"""Lädt ops/dashboard-data.json in privaten Supabase-Storage (Admin-only via Edge Function).

Optional (--html): zusätzlich ops/dashboard.html für Rückwärtskompatibilität.

Umgebungsvariablen:
  SUPABASE_URL (oder VITE_SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY

Aufruf:
  python3 scripts/build_ai_dashboard_data.py
  python3 scripts/upload_ai_dashboard.py
  python3 scripts/upload_ai_dashboard.py --html
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DASHBOARD_JSON = ROOT / "ops" / "dashboard-data.json"
DASHBOARD_HTML = ROOT / "ops" / "dashboard.html"
BUCKET = "ops-dashboard"
OBJECT_JSON = "dashboard-data.json"
OBJECT_HTML = "dashboard.html"


def env(name: str, *fallbacks: str) -> str:
    for key in (name, *fallbacks):
        val = os.environ.get(key, "").strip()
        if val:
            return val
    return ""


def request(
    method: str,
    url: str,
    key: str,
    *,
    data: bytes | None = None,
    headers: dict | None = None,
) -> tuple[int, str]:
    hdrs = {"Authorization": f"Bearer {key}"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, body
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return exc.code, body


def ensure_bucket(base_url: str, key: str) -> None:
    url = f"{base_url.rstrip('/')}/storage/v1/bucket"
    payload = json.dumps({"id": BUCKET, "name": BUCKET, "public": False}).encode()
    status, body = request(
        "POST",
        url,
        key,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    if status in (200, 201):
        print(f"✓ Bucket {BUCKET} angelegt (privat)")
        return
    if status == 409 or "already exists" in body.lower():
        print(f"✓ Bucket {BUCKET} existiert bereits")
        return
    print(f"Bucket-Fehler ({status}): {body}", file=sys.stderr)
    sys.exit(1)


def upload_object(base_url: str, key: str, object_name: str, body: bytes, content_type: str) -> None:
    url = f"{base_url.rstrip('/')}/storage/v1/object/{BUCKET}/{object_name}"
    status, resp = request(
        "POST",
        url,
        key,
        data=body,
        headers={
            "Content-Type": content_type,
            "x-upsert": "true",
        },
    )
    if status not in (200, 201):
        print(f"Upload-Fehler {object_name} ({status}): {resp}", file=sys.stderr)
        sys.exit(1)
    print(f"✓ Hochgeladen → {BUCKET}/{object_name} ({len(body)} Bytes)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload AI dashboard to Supabase Storage")
    parser.add_argument(
        "--html",
        action="store_true",
        help="Zusätzlich ops/dashboard.html hochladen (Legacy)",
    )
    args = parser.parse_args()

    base_url = env("SUPABASE_URL", "VITE_SUPABASE_URL", "KIEZ_SUPABASE_URL")
    sr_key = env("SUPABASE_SERVICE_ROLE_KEY", "KIEZ_SUPABASE_SERVICE_ROLE_KEY")
    if not base_url or not sr_key:
        print(
            "Fehler: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY setzen.",
            file=sys.stderr,
        )
        sys.exit(1)

    if not DASHBOARD_JSON.exists():
        print(
            "Fehler: ops/dashboard-data.json fehlt — zuerst build_ai_dashboard_data.py",
            file=sys.stderr,
        )
        sys.exit(1)

    ensure_bucket(base_url, sr_key)
    json_body = DASHBOARD_JSON.read_bytes()
    upload_object(base_url, sr_key, OBJECT_JSON, json_body, "application/json; charset=utf-8")

    if args.html or DASHBOARD_HTML.exists():
        if DASHBOARD_HTML.exists():
            html_body = DASHBOARD_HTML.read_bytes()
            upload_object(base_url, sr_key, OBJECT_HTML, html_body, "text/html; charset=utf-8")
        elif args.html:
            print("Warnung: --html gesetzt, aber ops/dashboard.html fehlt", file=sys.stderr)


if __name__ == "__main__":
    main()
