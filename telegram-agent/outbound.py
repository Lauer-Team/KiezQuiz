"""Datei-Versand (Telegram) und E-Mail (Resend) für Kalle."""

from __future__ import annotations

import base64
import io
import json
import logging
import os
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

SENDABLE_EXTENSIONS = {
    ".pdf",
    ".csv",
    ".txt",
    ".md",
    ".json",
    ".html",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".zip",
    ".xml",
    ".xlsx",
    ".docx",
}
MAX_FILE_BYTES = 49 * 1024 * 1024
MAX_FILES = 8
SKIP_DIR_PARTS = {".git", ".venv", "node_modules", "__pycache__", "dist", "build", ".secrets"}

BACKTICK_RE = re.compile(r"`([^`\n]+)`")
PLAIN_PATH_RE = re.compile(
    r"(?<![\w@])"
    r"((?:[\w.-]+/)+[\w.-]+\."
    r"(?:pdf|csv|txt|md|json|html|png|jpe?g|gif|webp|zip|xlsx|docx))"
    r"(?![\w.])",
    re.IGNORECASE,
)


def _path_allowed(path: Path, repo: Path) -> bool:
    try:
        path.resolve().relative_to(repo.resolve())
    except ValueError:
        return False
    return not any(part in SKIP_DIR_PARTS for part in path.parts)


def _resolve_repo_path(raw: str, repo: Path) -> Path | None:
    cleaned = raw.strip().strip("`'\"")
    cleaned = cleaned.lstrip("./")
    if not cleaned or cleaned.startswith("http"):
        return None
    candidate = (repo / cleaned).resolve()
    if candidate.suffix.lower() not in SENDABLE_EXTENSIONS:
        return None
    if not candidate.is_file() or not _path_allowed(candidate, repo):
        return None
    return candidate


def extract_paths_from_text(text: str, repo: Path) -> list[Path]:
    seen: set[Path] = set()
    result: list[Path] = []

    for pattern in (BACKTICK_RE, PLAIN_PATH_RE):
        for match in pattern.finditer(text):
            candidate = _resolve_repo_path(match.group(1), repo)
            if candidate and candidate not in seen:
                seen.add(candidate)
                result.append(candidate)
            if len(result) >= MAX_FILES:
                return result
    return result


def files_modified_since(repo: Path, since: float) -> list[Path]:
    found: list[tuple[float, Path]] = []
    for path in repo.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in SENDABLE_EXTENSIONS:
            continue
        if not _path_allowed(path, repo):
            continue
        try:
            mtime = path.stat().st_mtime
        except OSError:
            continue
        if mtime >= since - 1:
            found.append((mtime, path))
    found.sort(key=lambda item: item[0], reverse=True)
    return [path for _, path in found[:MAX_FILES]]


def collect_outbound_files(text: str, repo: Path, since: float | None = None) -> list[Path]:
    paths = extract_paths_from_text(text, repo)
    seen = set(paths)
    if since is not None:
        for path in files_modified_since(repo, since):
            if path not in seen:
                paths.append(path)
                seen.add(path)
            if len(paths) >= MAX_FILES:
                break
    return paths[:MAX_FILES]


async def send_files_to_chat(bot: Any, chat_id: int, paths: list[Path]) -> list[str]:
    sent: list[str] = []
    for path in paths:
        try:
            size = path.stat().st_size
        except OSError:
            continue
        if size > MAX_FILE_BYTES:
            log.warning("Überspringe %s (%d bytes > Limit)", path, size)
            continue
        try:
            with path.open("rb") as handle:
                await bot.send_document(
                    chat_id=chat_id,
                    document=handle,
                    filename=path.name,
                    caption=path.name,
                )
            sent.append(str(path))
        except Exception:
            log.exception("send_document fehlgeschlagen: %s", path)
    return sent


async def send_mail_attachments_to_chat(
    bot: Any,
    chat_id: int,
    attachments: list[dict[str, Any]],
) -> tuple[list[str], int]:
    """Mail-Anhänge (bytes) als Telegram-Dokumente senden."""
    from telegram import InputFile

    sent: list[str] = []
    skipped = 0
    for item in attachments:
        if item.get("skipped") or not item.get("data"):
            skipped += 1
            continue
        data = item["data"]
        size = item.get("size") or len(data)
        if size > MAX_FILE_BYTES:
            skipped += 1
            continue
        filename = item.get("filename") or "anhang"
        try:
            handle = io.BytesIO(data)
            await bot.send_document(
                chat_id=chat_id,
                document=InputFile(handle, filename=filename),
                caption=filename,
            )
            sent.append(filename)
        except Exception:
            log.exception("Mail-Anhang senden fehlgeschlagen: %s", filename)
            skipped += 1
    return sent, skipped


def resolve_email_config(cfg: dict[str, Any]) -> dict[str, Any] | None:
    email = cfg.get("email")
    if not email:
        return None
    if email.get("enabled") is False:
        return None

    env_name = email.get("resend_api_key_env", "KIEZ_RESEND_API_KEY")
    api_key = os.environ.get(env_name, "").strip()
    if not api_key:
        log.warning("E-Mail: Umgebungsvariable %s nicht gesetzt", env_name)
        return None

    from_email = email.get("from_email", "info@kiezquiz.de").strip()
    if not from_email:
        return None

    return {
        "provider": email.get("provider", "resend"),
        "from_email": from_email,
        "from_name": email.get("from_name", "Kalle"),
        "default_to": email.get("default_to", "").strip(),
        "resend_api_key": api_key,
    }


def send_email(
    email_cfg: dict[str, Any],
    to: str,
    subject: str,
    text: str,
    *,
    html: str | None = None,
    attachments: list[Path] | None = None,
) -> None:
    provider = email_cfg.get("provider", "resend")
    if provider != "resend":
        raise ValueError(f"Unbekannter E-Mail-Provider: {provider}")

    payload: dict[str, Any] = {
        "from": f"{email_cfg['from_name']} <{email_cfg['from_email']}>",
        "to": [to],
        "subject": subject,
        "text": text,
    }
    if html:
        payload["html"] = html

    if attachments:
        att_list = []
        for path in attachments:
            if not path.is_file():
                continue
            att_list.append(
                {
                    "filename": path.name,
                    "content": base64.b64encode(path.read_bytes()).decode("ascii"),
                }
            )
        if att_list:
            payload["attachments"] = att_list

    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=data,
        headers={
            "Authorization": f"Bearer {email_cfg['resend_api_key']}",
            "Content-Type": "application/json",
            "User-Agent": "kiezquiz-telegram-agent/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status >= 300:
                raise RuntimeError(f"Resend HTTP {resp.status}")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:400]
        raise RuntimeError(f"Resend HTTP {exc.code}: {detail or exc.reason}") from exc
