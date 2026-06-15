#!/usr/bin/env python3
"""Fetch Google Search Console metrics for KiezQuiz weekly SEO briefs.

Setup: docs/GSC-API-SETUP.md

  python3 scripts/gsc_weekly_brief.py --auth          # first-time OAuth
  python3 scripts/gsc_weekly_brief.py --days 28       # print markdown report
  python3 scripts/gsc_weekly_brief.py --days 7 --out ops/reports/2026-06-15-seo-gsc.md
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLIENT_PATH = Path(__file__).resolve().parent / "gsc-oauth-client.json"
TOKEN_PATH = Path(__file__).resolve().parent / "gsc-token.json"
DEFAULT_SITE = "sc-domain:kiezquiz.de"
SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]


def _need_google_libs():
    try:
        from google.auth.transport.requests import Request  # noqa: F401
        from google.oauth2.credentials import Credentials  # noqa: F401
        from google_auth_oauthlib.flow import InstalledAppFlow  # noqa: F401
        from googleapiclient.discovery import build  # noqa: F401
    except ImportError as exc:
        print(
            "Fehler: Google-Bibliotheken fehlen.\n"
            "  pip3 install google-auth-oauthlib google-api-python-client\n"
            f"Details: {exc}",
            file=sys.stderr,
        )
        sys.exit(1)


def load_credentials(token_path: Path, client_path: Path):
    _need_google_libs()
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None
    if token_path.is_file():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_path.write_text(creds.to_json(), encoding="utf-8")
    if creds and creds.valid:
        return creds

    if not client_path.is_file():
        print(
            f"Fehler: OAuth-Client fehlt: {client_path}\n"
            "Siehe docs/GSC-API-SETUP.md Schritt 3.",
            file=sys.stderr,
        )
        sys.exit(1)

    flow = InstalledAppFlow.from_client_secrets_file(str(client_path), SCOPES)
    creds = flow.run_local_server(port=0)
    token_path.write_text(creds.to_json(), encoding="utf-8")
    print(f"Token gespeichert: {token_path}", file=sys.stderr)
    return creds


def load_credentials_from_env(env_name: str):
    _need_google_libs()
    from google.oauth2.credentials import Credentials

    raw = __import__("os").environ.get(env_name, "").strip()
    if not raw:
        print(f"Fehler: Umgebungsvariable {env_name} ist leer.", file=sys.stderr)
        sys.exit(1)
    try:
        info = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"Fehler: {env_name} ist kein gültiges JSON: {exc}", file=sys.stderr)
        sys.exit(1)
    return Credentials.from_authorized_user_info(info, SCOPES)


def build_service(creds):
    _need_google_libs()
    from googleapiclient.discovery import build

    return build("searchconsole", "v1", credentials=creds, cache_discovery=False)


def query_search_analytics(service, site_url: str, days: int) -> dict:
    end = date.today() - timedelta(days=3)  # GSC data lag
    start = end - timedelta(days=max(1, days) - 1)
    body = {
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "dimensions": ["date"],
        "rowLimit": 25000,
    }
    resp = service.searchanalytics().query(siteUrl=site_url, body=body).execute()
    rows = resp.get("rows") or []
    clicks = sum(r.get("clicks", 0) for r in rows)
    impressions = sum(r.get("impressions", 0) for r in rows)
    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "clicks": clicks,
        "impressions": impressions,
        "days_with_data": len(rows),
    }


def query_top_pages(service, site_url: str, days: int, limit: int = 10) -> list[dict]:
    end = date.today() - timedelta(days=3)
    start = end - timedelta(days=max(1, days) - 1)
    body = {
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "dimensions": ["page"],
        "rowLimit": limit,
    }
    resp = service.searchanalytics().query(siteUrl=site_url, body=body).execute()
    rows = resp.get("rows") or []
    out = []
    for row in rows:
        page = (row.get("keys") or ["?"])[0]
        out.append(
            {
                "page": page,
                "clicks": row.get("clicks", 0),
                "impressions": row.get("impressions", 0),
            }
        )
    return out


def render_markdown(site_url: str, days: int, summary: dict, top_pages: list[dict]) -> str:
    lines = [
        f"# GSC Kurzbericht — {date.today().isoformat()}",
        "",
        f"**Property:** `{site_url}` · **Zeitraum:** {summary['start']} – {summary['end']} ({days} Tage)",
        "",
        "## Kennzahlen",
        "",
        f"| Metrik | Wert |",
        f"|---|---:|",
        f"| Klicks | {summary['clicks']} |",
        f"| Impressionen | {summary['impressions']} |",
        f"| Tage mit Daten | {summary['days_with_data']} |",
        "",
    ]
    if top_pages:
        lines.extend(["## Top-Seiten (Klicks)", "", "| Seite | Klicks | Impressionen |", "|---|---:|---:|"])
        for row in top_pages:
            lines.append(f"| {row['page']} | {row['clicks']} | {row['impressions']} |")
        lines.append("")
    else:
        lines.extend(["_Keine Top-Seiten-Daten (Property neu oder wenig Traffic)._", ""])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="GSC weekly brief for KiezQuiz")
    parser.add_argument("--auth", action="store_true", help="Run OAuth flow and save token")
    parser.add_argument("--days", type=int, default=28, help="Report window in days")
    parser.add_argument("--site-url", default=DEFAULT_SITE, help="GSC property URL")
    parser.add_argument("--out", type=Path, help="Write markdown to file instead of stdout")
    parser.add_argument("--token-env", help="Load token JSON from env var (for CI/Automation)")
    args = parser.parse_args()

    if args.token_env:
        creds = load_credentials_from_env(args.token_env)
    else:
        creds = load_credentials(TOKEN_PATH, CLIENT_PATH)

    if args.auth and not args.out:
        print("OAuth abgeschlossen. Test: python3 scripts/gsc_weekly_brief.py --days 28", file=sys.stderr)
        return 0

    service = build_service(creds)
    summary = query_search_analytics(service, args.site_url, args.days)
    top_pages = query_top_pages(service, args.site_url, args.days)
    md = render_markdown(args.site_url, args.days, summary, top_pages)

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(md, encoding="utf-8")
        print(f"Geschrieben: {args.out}", file=sys.stderr)
    else:
        print(md)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
