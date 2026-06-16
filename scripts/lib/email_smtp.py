"""Gemeinsames iCloud/SMTP-Versand-Modul für KiezQuiz-Skripte."""

from __future__ import annotations

import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


DEFAULT_SMTP_HOST = "smtp.mail.me.com"
DEFAULT_SMTP_PORT = 587


def smtp_config_from_env() -> dict[str, str]:
    login = os.environ.get("KIEZ_ICLOUD_LOGIN", "").strip()
    password = os.environ.get("KIEZ_ICLOUD_APP_PASSWORD", "").strip()
    if not login or not password:
        raise RuntimeError(
            "KIEZ_ICLOUD_LOGIN und KIEZ_ICLOUD_APP_PASSWORD fehlen "
            "(Apple-ID + App-Passwort, nicht @kiezquiz.de)"
        )
    return {
        "host": os.environ.get("KIEZ_SMTP_HOST", DEFAULT_SMTP_HOST).strip(),
        "port": os.environ.get("KIEZ_SMTP_PORT", str(DEFAULT_SMTP_PORT)).strip(),
        "user": login,
        "password": password,
        "from_email": os.environ.get("KIEZ_TERMS_FROM_EMAIL", "info@kiezquiz.de").strip(),
        "from_name": os.environ.get("KIEZ_TERMS_FROM_NAME", "KiezQuiz").strip(),
    }


def send_html_email(
    *,
    to: str,
    subject: str,
    text: str,
    html: str,
    from_email: str | None = None,
    from_name: str | None = None,
) -> None:
    cfg = smtp_config_from_env()
    sender_email = from_email or cfg["from_email"]
    sender_name = from_name or cfg["from_name"]

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{sender_name} <{sender_email}>"
    msg["To"] = to
    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    context = ssl.create_default_context()
    with smtplib.SMTP(cfg["host"], int(cfg["port"]), timeout=60) as server:
        server.ehlo()
        server.starttls(context=context)
        server.ehlo()
        server.login(cfg["user"], cfg["password"])
        server.sendmail(sender_email, [to], msg.as_string())
