#!/usr/bin/env python3
"""
E-Mail-Benachrichtigung bei wesentlichen Änderungen der Nutzungsbedingungen (§ 10 NB).

Nutzung:
  python3 scripts/setup_terms_notify.py          # einmalig
  python3 scripts/notify_terms_change.py --dry-run
  python3 scripts/notify_terms_change.py --send --owner-approved
  python3 scripts/notify_terms_change.py --send --owner-approved --test-to info@kiezquiz.de

Config: scripts/terms-notify.config.json (gitignored) oder Umgebungsvariablen
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEGAL_CONFIG = ROOT / "src/data/legalConfig.js"
TERMS_EMAIL_TEMPLATE = ROOT / "docs/supabase-email-terms-change.html"
TERMS_NOTICE = ROOT / "src/data/termsNotice.json"
CONFIG_PATH = Path(__file__).resolve().parent / "terms-notify.config.json"
EXAMPLE_PATH = Path(__file__).resolve().parent / "terms-notify.config.example.json"
LOG_PATH = Path(__file__).resolve().parent / ".terms-notify-log.json"

ENV_MAP = {
    "KIEZ_NOTIFY_EDGE_URL": "edgeFunctionUrl",
    "KIEZ_NOTIFY_TERMS_SECRET": "notifySecret",
    "KIEZ_SUPABASE_URL": "supabaseUrl",
    "KIEZ_SUPABASE_SERVICE_ROLE_KEY": "supabaseServiceRoleKey",
    "KIEZ_ICLOUD_LOGIN": "smtpUser",
    "KIEZ_ICLOUD_APP_PASSWORD": "smtpPassword",
    "KIEZ_SMTP_HOST": "smtpHost",
    "KIEZ_SMTP_PORT": "smtpPort",
    "KIEZ_TERMS_FROM_EMAIL": "fromEmail",
    "KIEZ_TERMS_FROM_NAME": "fromName",
    "KIEZ_SITE_URL": "siteUrl",
}


def load_config() -> dict:
    cfg: dict = {}
    if CONFIG_PATH.exists():
        with CONFIG_PATH.open(encoding="utf-8") as f:
            cfg = json.load(f)
    for env_key, cfg_key in ENV_MAP.items():
        val = os.environ.get(env_key, "").strip()
        if val:
            cfg[cfg_key] = val

    if not cfg:
        print(
            f"Fehler: Keine Config. Führe aus: python3 scripts/setup_terms_notify.py\n"
            f"Oder lege {CONFIG_PATH} an (siehe {EXAMPLE_PATH.name})",
            file=sys.stderr,
        )
        sys.exit(1)

    if not cfg.get("mode"):
        cfg["mode"] = "edge" if cfg.get("edgeFunctionUrl") else "direct"

    cfg.setdefault("emailProvider", "smtp")
    if cfg.get("smtpUser") and cfg.get("smtpPassword"):
        cfg["smtp"] = {
            "host": cfg.get("smtpHost", "smtp.mail.me.com"),
            "port": int(cfg.get("smtpPort", 587)),
            "user": cfg["smtpUser"],
            "password": cfg["smtpPassword"],
            "useTls": True,
        }

    return cfg


def parse_legal_config() -> dict:
    text = LEGAL_CONFIG.read_text(encoding="utf-8")
    block = re.search(r"terms:\s*\{([^}]+)\}", text, re.DOTALL)
    if not block:
        return {}
    t = block.group(1)
    terms: dict = {}

    version = re.search(r"version:\s*['\"]([^'\"]+)['\"]", t)
    if version:
        terms["version"] = version.group(1)

    effective = re.search(r"effectiveDate:\s*['\"]([^'\"]+)['\"]|effectiveDate:\s*null", t)
    if effective:
        terms["effectiveDate"] = effective.group(1) if effective.lastindex else None

    notified = re.search(
        r"lastNotifiedVersion:\s*['\"]([^'\"]+)['\"]|lastNotifiedVersion:\s*null", t
    )
    if notified:
        terms["lastNotifiedVersion"] = notified.group(1) if notified.lastindex else None

    pending = re.search(r"pendingNotice:\s*(true|false)", t)
    if pending:
        terms["pendingNotice"] = pending.group(1) == "true"

    return terms


def validate_terms(terms: dict) -> tuple[str, str]:
    version = terms.get("version")
    effective = terms.get("effectiveDate")

    if not version:
        print("Fehler: terms.version fehlt in legalConfig.js", file=sys.stderr)
        sys.exit(1)
    if not effective:
        print("Fehler: terms.effectiveDate fehlt — setze heute + 30 Tage", file=sys.stderr)
        sys.exit(1)

    try:
        eff = date.fromisoformat(effective)
    except ValueError:
        print(f"Fehler: effectiveDate ungültig: {effective}", file=sys.stderr)
        sys.exit(1)

    min_date = date.today() + timedelta(days=30)
    if eff < min_date:
        print(
            f"Warnung: effectiveDate {effective} liegt vor dem 30-Tage-Minimum ({min_date}).",
            file=sys.stderr,
        )

    if terms.get("lastNotifiedVersion") == version:
        print(
            f"Hinweis: Version {version} wurde bereits benachrichtigt (lastNotifiedVersion).",
            file=sys.stderr,
        )

    return version, effective


def invoke_edge(
    cfg: dict,
    version: str,
    effective_date: str,
    *,
    dry_run: bool,
    test_to: str | None,
) -> dict:
    url = cfg.get("edgeFunctionUrl", "").strip()
    secret = cfg.get("notifySecret", "").strip()
    if not url or not secret:
        print(
            "Fehler: edgeFunctionUrl + notifySecret fehlen. "
            "python3 scripts/setup_terms_notify.py ausführen.",
            file=sys.stderr,
        )
        sys.exit(1)

    payload = json.dumps({
        "version": version,
        "effectiveDate": effective_date,
        "dryRun": dry_run,
        "testTo": test_to,
    }).encode()

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-notify-secret": secret,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"Edge Function Fehler HTTP {e.code}: {body}", file=sys.stderr)
        if e.code == 401:
            print(
                "→ NOTIFY_TERMS_SECRET in Supabase Edge-Function-Secrets prüfen "
                "(muss mit notifySecret in config übereinstimmen).",
                file=sys.stderr,
            )
        sys.exit(1)


def fetch_supabase_users(cfg: dict) -> list[dict]:
    url = cfg["supabaseUrl"].rstrip("/") + "/auth/v1/admin/users"
    headers = {
        "Authorization": f"Bearer {cfg['supabaseServiceRoleKey']}",
        "apikey": cfg["supabaseServiceRoleKey"],
    }
    users: list[dict] = []
    page = 1
    per_page = 200

    while True:
        req_url = f"{url}?page={page}&per_page={per_page}"
        req = urllib.request.Request(req_url, headers=headers)
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())
        batch = data.get("users") or []
        if not batch:
            break
        users.extend(batch)
        if len(batch) < per_page:
            break
        page += 1

    return users


def recipient_emails(users: list[dict]) -> list[str]:
    emails: list[str] = []
    seen: set[str] = set()
    for u in users:
        email = (u.get("email") or "").strip()
        if not email or email in seen:
            continue
        if u.get("email_confirmed_at") is None and not u.get("confirmed_at"):
            continue
        seen.add(email)
        emails.append(email)
    return sorted(emails)


def build_email(version: str, effective_date: str, cfg: dict) -> tuple[str, str, str]:
    from_email = cfg.get("fromEmail", "info@kiezquiz.de")
    from_name = cfg.get("fromName", "KiezQuiz")
    site = cfg.get("siteUrl", "https://kiezquiz.de")
    terms_url = f"{site}/nutzungsbedingungen/"
    profile_url = f"{site}/profile/"

    subject = f"KiezQuiz: Änderung der Nutzungsbedingungen (Version {version})"

    text = f"""Hallo,

wir passen die Nutzungsbedingungen von KiezQuiz an (Version {version}).

Die geänderten Bedingungen findest du hier:
{terms_url}

Sie treten am {effective_date} in Kraft — das sind mindestens 30 Tage ab heute.

Wenn du den Änderungen nicht zustimmst, kannst du deinen Account bis dahin in den Profileinstellungen löschen:
{profile_url}
Die weitere Nutzung danach gilt als Zustimmung.

Fragen? {from_email}

Viele Grüße
{from_name}
"""

    html = TERMS_EMAIL_TEMPLATE.read_text(encoding="utf-8")
    for key, value in {
        "{{SITE_URL}}": site,
        "{{VERSION}}": version,
        "{{EFFECTIVE_DATE}}": effective_date,
        "{{TERMS_URL}}": terms_url,
        "{{PROFILE_URL}}": profile_url,
        "{{FROM_EMAIL}}": from_email,
    }.items():
        html = html.replace(key, value)

    return subject, text, html


def send_via_smtp(cfg: dict, to: str, subject: str, text: str, html: str) -> None:
    import sys
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(root / "scripts"))
    from lib.email_smtp import send_html_email

    send_html_email(
        to=to,
        subject=subject,
        text=text,
        html=html,
        from_email=cfg.get("fromEmail", "info@kiezquiz.de"),
        from_name=cfg.get("fromName", "KiezQuiz"),
    )


def send_email(cfg: dict, to: str, subject: str, text: str, html: str) -> None:
    if not cfg.get("smtp"):
        raise RuntimeError(
            "SMTP nicht konfiguriert — KIEZ_ICLOUD_LOGIN + KIEZ_ICLOUD_APP_PASSWORD setzen"
        )
    send_via_smtp(cfg, to, subject, text, html)


def update_legal_config(version: str, effective_date: str) -> None:
    text = LEGAL_CONFIG.read_text(encoding="utf-8")
    text = re.sub(
        r"lastNotifiedVersion:\s*(?:['\"][^'\"]*['\"]|null)",
        f"lastNotifiedVersion: '{version}'",
        text,
    )
    text = re.sub(r"pendingNotice:\s*(?:true|false)", "pendingNotice: true", text)
    text = re.sub(
        r"effectiveDate:\s*(?:['\"][^'\"]*['\"]|null)",
        f"effectiveDate: '{effective_date}'",
        text,
    )
    LEGAL_CONFIG.write_text(text, encoding="utf-8")


def update_terms_notice(version: str, effective_date: str) -> None:
    payload = {
        "active": True,
        "version": version,
        "effectiveDate": effective_date,
        "notifiedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    TERMS_NOTICE.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def write_log(version: str, recipients: list[str]) -> None:
    LOG_PATH.write_text(
        json.dumps(
            {
                "version": version,
                "sentAt": datetime.now(timezone.utc).isoformat(),
                "recipientCount": len(recipients),
                "recipients": recipients,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def print_recipients(emails: list[str]) -> None:
    print(f"Empfänger: {len(emails)}")
    for em in emails[:10]:
        print(f"  · {em}")
    if len(emails) > 10:
        print(f"  … und {len(emails) - 10} weitere")


def run_direct(cfg: dict, version: str, effective_date: str, *, dry_run: bool, test_to: str | None) -> list[str]:
    if not cfg.get("supabaseServiceRoleKey"):
        print("Fehler: direct-Modus braucht supabaseServiceRoleKey", file=sys.stderr)
        sys.exit(1)

    try:
        users = fetch_supabase_users(cfg)
    except urllib.error.HTTPError as e:
        print(f"Supabase-Fehler: HTTP {e.code}", file=sys.stderr)
        sys.exit(1)

    emails = [test_to] if test_to else recipient_emails(users)
    print_recipients(emails)

    subject, text, html = build_email(version, effective_date, cfg)
    print("\n--- Betreff ---")
    print(subject)

    if dry_run:
        return emails

    errors = 0
    for em in emails:
        try:
            send_email(cfg, em, subject, text, html)
            print(f"✓ {em}")
        except Exception as exc:  # noqa: BLE001
            print(f"✗ {em}: {exc}", file=sys.stderr)
            errors += 1

    if errors:
        print(f"\n{errors} Fehler — State nicht aktualisiert.", file=sys.stderr)
        sys.exit(1)

    return emails


def main() -> None:
    parser = argparse.ArgumentParser(description="NB-Änderung: E-Mail an alle KiezQuiz-Nutzer")
    parser.add_argument("--dry-run", action="store_true", help="Nur Vorschau, kein Versand")
    parser.add_argument("--send", action="store_true", help="E-Mails versenden")
    parser.add_argument("--owner-approved", action="store_true", help="Pflicht: Betreiber-Freigabe")
    parser.add_argument("--test-to", metavar="EMAIL", help="Nur an diese Adresse (Test)")
    args = parser.parse_args()

    if not args.dry_run and not args.send:
        parser.error("Entweder --dry-run oder --send angeben")

    if args.send and not args.owner_approved:
        print("Abbruch: Versand nur mit --owner-approved.", file=sys.stderr)
        sys.exit(1)

    cfg = load_config()
    terms = parse_legal_config()
    version, effective_date = validate_terms(terms)

    print(f"Modus: {cfg.get('mode', 'edge')}")
    print(f"NB-Version: {version}")
    print(f"Inkrafttreten: {effective_date}")

    if cfg.get("mode") == "edge":
        result = invoke_edge(
            cfg, version, effective_date,
            dry_run=args.dry_run,
            test_to=args.test_to,
        )
        print_recipients(result.get("recipients") or [])
        if result.get("errors"):
            for err in result["errors"]:
                print(f"✗ {err}", file=sys.stderr)
            sys.exit(1)

        if args.dry_run:
            print("\nDry-Run — keine E-Mails gesendet.")
            return

        if args.test_to:
            print(f"\nTest-Mail an {args.test_to} gesendet.")
            return

        update_legal_config(version, effective_date)
        update_terms_notice(version, effective_date)
        write_log(version, result.get("recipients") or [])
        print(f"\nFertig: {result.get('recipientCount', 0)} E-Mail(s) via Edge Function.")
        print("legalConfig.js + termsNotice.json aktualisiert — committen und deployen.")
        return

    emails = run_direct(cfg, version, effective_date, dry_run=args.dry_run, test_to=args.test_to)

    if args.dry_run:
        print("\nDry-Run — keine E-Mails gesendet.")
        return

    if not args.test_to:
        update_legal_config(version, effective_date)
        update_terms_notice(version, effective_date)
        write_log(version, emails)

    print(f"\nFertig: {len(emails)} E-Mail(s) gesendet.")


if __name__ == "__main__":
    main()
