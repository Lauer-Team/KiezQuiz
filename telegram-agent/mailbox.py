"""kiezquiz@web.de — IMAP/SMTP (Web.de) für Kalle."""

from __future__ import annotations

import email
import imaplib
import logging
import os
import re
import smtplib
import ssl
from email.header import decode_header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

log = logging.getLogger(__name__)

DEFAULT_IMAP_HOST = "imap.web.de"
DEFAULT_IMAP_PORT = 993
DEFAULT_SMTP_HOST = "smtp.web.de"
DEFAULT_SMTP_PORT = 587


def _decode_header_value(raw: str | None) -> str:
    if not raw:
        return ""
    parts: list[str] = []
    for chunk, charset in decode_header(raw):
        if isinstance(chunk, bytes):
            parts.append(chunk.decode(charset or "utf-8", errors="replace"))
        else:
            parts.append(str(chunk))
    return " ".join(parts).strip()


def _message_body(msg: email.message.Message) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and part.get_content_disposition() != "attachment":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace").strip()
        for part in msg.walk():
            if part.get_content_type() == "text/html" and part.get_content_disposition() != "attachment":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    text = payload.decode(charset, errors="replace")
                    text = re.sub(r"<[^>]+>", " ", text)
                    return re.sub(r"\s+", " ", text).strip()
        return ""
    payload = msg.get_payload(decode=True)
    if not payload:
        return ""
    charset = msg.get_content_charset() or "utf-8"
    return payload.decode(charset, errors="replace").strip()


def resolve_mailbox_config(cfg: dict[str, Any]) -> dict[str, Any] | None:
    box = cfg.get("webde_mailbox")
    if not box or box.get("enabled") is False:
        return None

    email_env = box.get("email_env", "KIEZ_WEBDE_EMAIL")
    password_env = box.get("password_env", "KIEZ_WEBDE_PASSWORD")
    address = os.environ.get(email_env, "").strip()
    password = os.environ.get(password_env, "").strip()
    if not address or not password:
        log.warning("Web.de: %s / %s nicht gesetzt", email_env, password_env)
        return None

    return {
        "email": address,
        "password": password,
        "imap_host": box.get("imap_host", DEFAULT_IMAP_HOST),
        "imap_port": int(box.get("imap_port", DEFAULT_IMAP_PORT)),
        "smtp_host": box.get("smtp_host", DEFAULT_SMTP_HOST),
        "smtp_port": int(box.get("smtp_port", DEFAULT_SMTP_PORT)),
        "from_name": box.get("from_name", "KiezQuiz"),
    }


def _imap_connect(box_cfg: dict[str, Any]) -> imaplib.IMAP4_SSL:
    mail = imaplib.IMAP4_SSL(box_cfg["imap_host"], box_cfg["imap_port"])
    mail.login(box_cfg["email"], box_cfg["password"])
    mail.select("INBOX")
    return mail


def list_inbox(box_cfg: dict[str, Any], limit: int = 10) -> list[dict[str, str]]:
    mail = _imap_connect(box_cfg)
    try:
        _status, data = mail.search(None, "ALL")
        if not data or not data[0]:
            return []
        uids = data[0].split()
        uids = uids[-limit:]
        uids.reverse()
        result: list[dict[str, str]] = []
        for uid in uids:
            uid_str = uid.decode() if isinstance(uid, bytes) else str(uid)
            _status, msg_data = mail.fetch(uid, "(RFC822)")
            if not msg_data or not msg_data[0]:
                continue
            raw = msg_data[0][1]
            if not isinstance(raw, bytes):
                continue
            msg = email.message_from_bytes(raw)
            result.append(
                {
                    "uid": uid_str,
                    "from": _decode_header_value(msg.get("From")),
                    "subject": _decode_header_value(msg.get("Subject")) or "(ohne Betreff)",
                    "date": _decode_header_value(msg.get("Date")),
                }
            )
        return result
    finally:
        try:
            mail.logout()
        except Exception:
            pass


def read_message(box_cfg: dict[str, Any], uid: str) -> dict[str, str]:
    mail = _imap_connect(box_cfg)
    try:
        _status, msg_data = mail.fetch(uid.encode() if isinstance(uid, str) else uid, "(RFC822)")
        if not msg_data or not msg_data[0]:
            raise ValueError(f"Mail UID {uid} nicht gefunden")
        raw = msg_data[0][1]
        if not isinstance(raw, bytes):
            raise ValueError("Leere Mail")
        msg = email.message_from_bytes(raw)
        body = _message_body(msg)
        return {
            "uid": str(uid),
            "from": _decode_header_value(msg.get("From")),
            "to": _decode_header_value(msg.get("To")),
            "subject": _decode_header_value(msg.get("Subject")) or "(ohne Betreff)",
            "date": _decode_header_value(msg.get("Date")),
            "body": body,
        }
    finally:
        try:
            mail.logout()
        except Exception:
            pass


def send_message(box_cfg: dict[str, Any], to: str, subject: str, body: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{box_cfg['from_name']} <{box_cfg['email']}>"
    msg["To"] = to
    msg.attach(MIMEText(body, "plain", "utf-8"))

    context = ssl.create_default_context()
    with smtplib.SMTP(box_cfg["smtp_host"], box_cfg["smtp_port"]) as server:
        server.starttls(context=context)
        server.login(box_cfg["email"], box_cfg["password"])
        server.sendmail(box_cfg["email"], [to], msg.as_string())


def delete_message(box_cfg: dict[str, Any], uid: str) -> None:
    mail = _imap_connect(box_cfg)
    try:
        mail.store(uid.encode() if isinstance(uid, str) else uid, "+FLAGS", "\\Deleted")
        mail.expunge()
    finally:
        try:
            mail.logout()
        except Exception:
            pass


def format_inbox_list(items: list[dict[str, str]], limit: int = 3900) -> str:
    if not items:
        return "Posteingang ist leer."
    lines = [f"📬 Posteingang ({len(items)} neueste):"]
    for i, item in enumerate(items, 1):
        subj = item["subject"][:60]
        sender = item["from"][:40]
        lines.append(f"{i}. {subj}\n   Von: {sender}")
    text = "\n".join(lines)
    text += "\n\n/post read <nr> · /post delete <nr>"
    return text[:limit]


def format_message_detail(msg: dict[str, str], limit: int = 3900) -> str:
    body = msg.get("body", "")[:2500]
    lines = [
        f"Von: {msg.get('from', '')}",
        f"Datum: {msg.get('date', '')}",
        f"Betreff: {msg.get('subject', '')}",
        "",
        body or "(kein Textinhalt)",
    ]
    return "\n".join(lines)[:limit]
