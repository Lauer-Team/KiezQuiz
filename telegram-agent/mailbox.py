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
MAX_MAIL_ATTACHMENTS = 5
MAX_MAIL_ATTACHMENT_BYTES = 49 * 1024 * 1024


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


def _extract_attachments(msg: email.message.Message) -> list[dict[str, Any]]:
    attachments: list[dict[str, Any]] = []
    for part in msg.walk():
        if part.get_content_maintype() == "multipart":
            continue
        disposition = part.get_content_disposition()
        filename = part.get_filename()
        if disposition != "attachment" and not filename:
            continue
        raw_name = _decode_header_value(filename) if filename else f"anhang-{len(attachments) + 1}"
        payload = part.get_payload(decode=True)
        if not payload:
            continue
        size = len(payload)
        if size > MAX_MAIL_ATTACHMENT_BYTES:
            attachments.append(
                {
                    "filename": raw_name,
                    "content_type": part.get_content_type(),
                    "data": None,
                    "size": size,
                    "skipped": True,
                }
            )
            continue
        attachments.append(
            {
                "filename": raw_name,
                "content_type": part.get_content_type(),
                "data": payload,
                "size": size,
                "skipped": False,
            }
        )
        if len(attachments) >= MAX_MAIL_ATTACHMENTS:
            break
    return attachments


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

    login_env = box.get("login_env") or box.get("email_env", "KIEZ_ICLOUD_LOGIN")
    password_env = box.get("password_env", "KIEZ_ICLOUD_APP_PASSWORD")
    login = os.environ.get(login_env, "").strip()
    password = os.environ.get(password_env, "").strip()
    if not login or not password:
        log.warning("Mailbox: %s / %s nicht gesetzt", login_env, password_env)
        return None

    from_email = box.get("from_email", "").strip() or login

    return {
        "email": login,
        "from_email": from_email,
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


def _imap_uid_search(mail: imaplib.IMAP4_SSL) -> list[str]:
    """iCloud liefert bei SEQUENCE+RFC822 leere Antworten — UIDs nutzen."""
    _status, data = mail.uid("search", None, "ALL")
    if not data or not data[0]:
        return []
    return [
        uid.decode() if isinstance(uid, bytes) else str(uid) for uid in data[0].split()
    ]


def _imap_uid_fetch_bytes(
    mail: imaplib.IMAP4_SSL, uid: str, fetch_part: str
) -> bytes | None:
    _status, data = mail.uid("fetch", uid, fetch_part)
    if not data:
        return None
    for item in data:
        if isinstance(item, tuple) and len(item) >= 2 and isinstance(item[1], bytes):
            return item[1]
    return None


def list_inbox(box_cfg: dict[str, Any], limit: int = 10) -> list[dict[str, str]]:
    mail = _imap_connect(box_cfg)
    try:
        uids = _imap_uid_search(mail)
        uids = uids[-limit:]
        uids.reverse()
        result: list[dict[str, str]] = []
        for uid in uids:
            raw = _imap_uid_fetch_bytes(
                mail,
                uid,
                "(BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])",
            )
            if not raw:
                continue
            msg = email.message_from_bytes(raw)
            result.append(
                {
                    "uid": uid,
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
        raw = _imap_uid_fetch_bytes(mail, uid, "(BODY.PEEK[])")
        if not raw:
            raise ValueError(f"Mail UID {uid} nicht gefunden")
        msg = email.message_from_bytes(raw)
        body = _message_body(msg)
        attachments = _extract_attachments(msg)
        return {
            "uid": str(uid),
            "from": _decode_header_value(msg.get("From")),
            "to": _decode_header_value(msg.get("To")),
            "subject": _decode_header_value(msg.get("Subject")) or "(ohne Betreff)",
            "date": _decode_header_value(msg.get("Date")),
            "body": body,
            "attachments": attachments,
        }
    finally:
        try:
            mail.logout()
        except Exception:
            pass


def send_message(box_cfg: dict[str, Any], to: str, subject: str, body: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{box_cfg['from_name']} <{box_cfg.get('from_email', box_cfg['email'])}>"
    msg["To"] = to
    msg.attach(MIMEText(body, "plain", "utf-8"))

    context = ssl.create_default_context()
    with smtplib.SMTP(box_cfg["smtp_host"], box_cfg["smtp_port"]) as server:
        server.starttls(context=context)
        server.login(box_cfg["email"], box_cfg["password"])
        sender = box_cfg.get("from_email", box_cfg["email"])
        server.sendmail(sender, [to], msg.as_string())


def delete_message(box_cfg: dict[str, Any], uid: str) -> None:
    mail = _imap_connect(box_cfg)
    try:
        mail.uid("STORE", uid, "+FLAGS", "\\Deleted")
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


def format_message_detail(msg: dict[str, Any], limit: int = 3900) -> str:
    body = msg.get("body", "")[:2500]
    attachments = msg.get("attachments") or []
    lines = [
        f"Von: {msg.get('from', '')}",
        f"Datum: {msg.get('date', '')}",
        f"Betreff: {msg.get('subject', '')}",
    ]
    if attachments:
        names = [a.get("filename", "anhang") for a in attachments]
        skipped = sum(1 for a in attachments if a.get("skipped"))
        hint = f"Anhänge ({len(attachments)}): {', '.join(names[:4])}"
        if len(names) > 4:
            hint += f" (+{len(names) - 4} weitere)"
        if skipped:
            hint += f" — {skipped} zu groß für Telegram"
        lines.append(hint)
    lines.extend(["", body or "(kein Textinhalt)"])
    return "\n".join(lines)[:limit]
