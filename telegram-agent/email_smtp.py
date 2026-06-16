"""iCloud / SMTP-Versand (ersetzt Resend)."""

from __future__ import annotations

import logging
import os
import smtplib
import ssl
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

DEFAULT_SMTP_HOST = "smtp.mail.me.com"
DEFAULT_SMTP_PORT = 587


def resolve_smtp_email_config(cfg: dict[str, Any]) -> dict[str, Any] | None:
    email = cfg.get("email")
    if not email or email.get("enabled") is False:
        return None

    provider = email.get("provider", "icloud")
    if provider not in ("icloud", "smtp", "icloud_smtp"):
        return None

    pass_env = email.get("smtp_password_env") or email.get("password_env", "")
    login_env = email.get("smtp_login_env") or email.get("smtp_user_env") or email.get("email_env", "")
    if not login_env or not pass_env:
        log.warning("E-Mail SMTP: smtp_login_env/password_env fehlt in config")
        return None

    smtp_user = os.environ.get(login_env, "").strip()
    smtp_password = os.environ.get(pass_env, "").strip()
    if not smtp_user or not smtp_password:
        log.warning("E-Mail SMTP: %s / %s nicht gesetzt", login_env, pass_env)
        return None

    from_email = email.get("from_email", smtp_user).strip()
    if not from_email:
        return None

    return {
        "provider": provider,
        "from_email": from_email,
        "from_name": email.get("from_name", "Mail"),
        "default_to": email.get("default_to", "").strip(),
        "smtp_host": email.get("smtp_host", DEFAULT_SMTP_HOST),
        "smtp_port": int(email.get("smtp_port", DEFAULT_SMTP_PORT)),
        "smtp_user": smtp_user,
        "smtp_password": smtp_password,
    }


def send_email_smtp(
    email_cfg: dict[str, Any],
    to: str,
    subject: str,
    text: str,
    *,
    html: str | None = None,
    attachments: list[Path] | None = None,
) -> None:
    msg = MIMEMultipart()
    msg["From"] = f"{email_cfg['from_name']} <{email_cfg['from_email']}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(text, "plain", "utf-8"))
    if html:
        msg.attach(MIMEText(html, "html", "utf-8"))

    if attachments:
        for path in attachments:
            if not path.is_file():
                continue
            part = MIMEBase("application", "octet-stream")
            part.set_payload(path.read_bytes())
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f'attachment; filename="{path.name}"')
            msg.attach(part)

    context = ssl.create_default_context()
    with smtplib.SMTP(email_cfg["smtp_host"], email_cfg["smtp_port"], timeout=60) as smtp:
        smtp.ehlo()
        smtp.starttls(context=context)
        smtp.ehlo()
        smtp.login(email_cfg["smtp_user"], email_cfg["smtp_password"])
        smtp.send_message(msg)
