"""Datei-Versand (Telegram) und E-Mail (iCloud SMTP) für Kalle."""

from __future__ import annotations

import io
import logging
import re
from pathlib import Path
from typing import Any

from lauer_bot_lib.email_smtp import resolve_smtp_email_config, send_email_smtp

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
SKIP_FILE_NAMES = frozenset({"state.json", "config.json", ".env"})
AUTO_SKIP_PREFIXES = ("telegram-agent/",)

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


def _auto_send_allowed(path: Path, repo: Path) -> bool:
    if path.name in SKIP_FILE_NAMES:
        return False
    try:
        rel = path.resolve().relative_to(repo.resolve()).as_posix()
    except ValueError:
        return False
    if any(rel.startswith(prefix) for prefix in AUTO_SKIP_PREFIXES):
        return False
    return _path_allowed(path, repo)


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
            if candidate and _auto_send_allowed(candidate, repo) and candidate not in seen:
                seen.add(candidate)
                result.append(candidate)
            if len(result) >= MAX_FILES:
                return result
    return result


def collect_outbound_files(text: str, repo: Path, since: float | None = None) -> list[Path]:
    """Nur explizit in der Agent-Antwort genannte Pfade — kein mtime-Scan."""
    del since
    return extract_paths_from_text(text, repo)[:MAX_FILES]


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
    return resolve_smtp_email_config(cfg)


def send_email(
    email_cfg: dict[str, Any],
    to: str,
    subject: str,
    text: str,
    *,
    html: str | None = None,
    attachments: list[Path] | None = None,
) -> None:
    send_email_smtp(email_cfg, to, subject, text, html=html, attachments=attachments)
