#!/usr/bin/env python3
"""Lädt ops/dashboard.html in privaten Supabase-Storage (nur Admin-Zugriff via Edge Function).

Umgebungsvariablen:
  SUPABASE_URL (oder VITE_SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY

Aufruf nach generate_dashboard.py:
  python3 scripts/upload_ai_dashboard.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DASHBOARD = ROOT / "ops" / "dashboard.html"
BUCKET = "ops-dashboard"
OBJECT = "dashboard.html"


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


def upload_dashboard(base_url: str, key: str) -> None:
    if not DASHBOARD.exists():
        print("Fehler: ops/dashboard.html fehlt — zuerst generate_dashboard.py", file=sys.stderr)
        sys.exit(1)

    body = DASHBOARD.read_bytes()
    url = f"{base_url.rstrip('/')}/storage/v1/object/{BUCKET}/{OBJECT}"
    status, resp = request(
        "POST",
        url,
        key,
        data=body,
        headers={
            "Content-Type": "text/html; charset=utf-8",
            "x-upsert": "true",
        },
    )
    if status not in (200, 201):
        print(f"Upload-Fehler ({status}): {resp}", file=sys.stderr)
        sys.exit(1)
    print(f"✓ Dashboard hochgeladen → {BUCKET}/{OBJECT} ({len(body)} Bytes)")


def main() -> None:
    base_url = env("SUPABASE_URL", "VITE_SUPABASE_URL", "KIEZ_SUPABASE_URL")
    key = env("SUPABASE_SERVICE_ROLE_KEY", "KIEZ_SUPABASE_SERVICE_ROLE_KEY")
    if not base_url or not key:
        print(
            "Fehler: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY setzen "
            "(GitHub Secret oder lokal exportieren).",
            file=sys.stderr,
        )
        sys.exit(1)

    ensure_bucket(base_url, key)
    upload_dashboard(base_url, key)


if __name__ == "__main__":
    main()
