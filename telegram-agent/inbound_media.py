"""Inbound Sprachmemos: Download + lokale Whisper-Transkription."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import urllib.error
import urllib.request
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from telegram import Update
from telegram.ext import Application, ContextTypes, MessageHandler, filters

log = logging.getLogger(__name__)

MAX_VOICE_BYTES = 10 * 1024 * 1024
MAX_VOICE_DURATION_SEC = int(os.environ.get("WHISPER_MAX_VOICE_SEC", "180"))
WHISPER_MODEL_SIZE = os.environ.get("WHISPER_MODEL", "small")
OPENAI_API_KEY_ENV = "OPENAI_API_KEY"

_whisper_model: Any = None


def inbound_filename(message_id: int, suffix: str) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    ext = suffix if suffix.startswith(".") else f".{suffix}"
    return f"{stamp}-{message_id}{ext}"


def get_whisper_model() -> Any:
    global _whisper_model
    if _whisper_model is None:
        from faster_whisper import WhisperModel

        log.info("Whisper-Modell laden: %s (cpu, int8)", WHISPER_MODEL_SIZE)
        _whisper_model = WhisperModel(WHISPER_MODEL_SIZE, device="cpu", compute_type="int8")
    return _whisper_model


def transcribe_local(path: Path) -> str:
    model = get_whisper_model()
    segments, _ = model.transcribe(str(path), language="de", beam_size=5)
    return " ".join(seg.text.strip() for seg in segments).strip()


def transcribe_openai_api(path: Path) -> str:
    api_key = os.environ.get(OPENAI_API_KEY_ENV)
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY nicht gesetzt")

    with path.open("rb") as handle:
        audio_bytes = handle.read()

    boundary = "----VoiceUpload"
    prefix = (
        f"--{boundary}\r\n"
        "Content-Disposition: form-data; name=\"model\"\r\n\r\n"
        "whisper-1\r\n"
        f"--{boundary}\r\n"
        "Content-Disposition: form-data; name=\"language\"\r\n\r\n"
        "de\r\n"
        f"--{boundary}\r\n"
        f"Content-Disposition: form-data; name=\"file\"; filename=\"{path.name}\"\r\n"
        "Content-Type: application/octet-stream\r\n\r\n"
    ).encode("utf-8")
    suffix = f"\r\n--{boundary}--\r\n".encode("utf-8")
    payload = prefix + audio_bytes + suffix

    req = urllib.request.Request(
        "https://api.openai.com/v1/audio/transcriptions",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:400]
        raise RuntimeError(f"OpenAI Whisper HTTP {exc.code}: {detail}") from exc

    text = (data.get("text") or "").strip()
    if not text:
        raise RuntimeError("OpenAI Whisper: leeres Transkript")
    return text


def transcribe_audio(path: Path) -> str:
    try:
        return transcribe_local(path)
    except Exception as local_exc:
        if os.environ.get(OPENAI_API_KEY_ENV):
            log.warning("Lokale Whisper fehlgeschlagen, OpenAI-Fallback: %s", local_exc)
            return transcribe_openai_api(path)
        raise local_exc


async def download_inbound_voice(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    inbound_dir: Path,
) -> tuple[Path | None, str | None]:
    msg = update.message
    if not msg:
        return None, "Keine Nachricht"

    voice = msg.voice
    audio = msg.audio
    media = voice or audio
    if not media:
        return None, "Kein Audio gefunden"

    duration = getattr(media, "duration", None)
    if duration and duration > MAX_VOICE_DURATION_SEC:
        return None, (
            f"Zu lang ({duration}s). Maximal {MAX_VOICE_DURATION_SEC}s — "
            "bitte kürzer oder als Text senden."
        )

    file_size = getattr(media, "file_size", None)
    if file_size and file_size > MAX_VOICE_BYTES:
        return None, "Audio-Datei zu groß."

    inbound_dir.mkdir(parents=True, exist_ok=True)
    if voice:
        ext = ".ogg"
    else:
        ext = Path(getattr(media, "file_name", None) or "audio.m4a").suffix or ".m4a"

    dest = inbound_dir / inbound_filename(msg.message_id, ext)
    tg_file = await context.bot.get_file(media.file_id)
    await tg_file.download_to_drive(custom_path=dest)
    return dest, None


async def on_voice_message(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    inbound_dir: Path,
    ensure_auth: Callable[..., Awaitable[bool]],
    truncate_telegram: Callable[[str], str],
    handle_task: Callable[..., Awaitable[None]],
) -> None:
    cfg = context.application.bot_data.get("cfg")
    if cfg is not None and not await ensure_auth(update, cfg):
        return
    if not update.message:
        return

    try:
        path, err = await download_inbound_voice(update, context, inbound_dir)
    except Exception as exc:
        log.exception("Voice-Download fehlgeschlagen")
        await update.message.reply_text(
            truncate_telegram(f"Sprachmemo-Download fehlgeschlagen: {exc}")
        )
        return

    if err or not path:
        await update.message.reply_text(err or "Sprachmemo konnte nicht gespeichert werden.")
        return

    await update.message.reply_text("🎤 Transkribiere …")

    try:
        transcript = await asyncio.to_thread(transcribe_audio, path)
    except Exception as exc:
        log.exception("Transkription fehlgeschlagen")
        hint = (
            "Hinweis: ffmpeg installieren (apt install ffmpeg) "
            "oder OPENAI_API_KEY in .env für API-Fallback."
        )
        await update.message.reply_text(truncate_telegram(f"Transkription fehlgeschlagen: {exc}\n\n{hint}"))
        return

    if not transcript:
        await update.message.reply_text("Nichts erkannt — bitte erneut versuchen.")
        return

    caption = (update.message.caption or "").strip()
    preview = truncate_telegram(f"📝 Transkript:\n{transcript}")
    await update.message.reply_text(preview)

    if caption:
        task = f"{caption}\n\n(Sprachmemo-Transkript: {transcript})"
    else:
        task = transcript

    await handle_task(update, context, task)


def register_voice_handlers(
    app: Application,
    inbound_dir: Path,
    ensure_auth: Callable[..., Awaitable[bool]],
    truncate_telegram: Callable[[str], str],
    handle_task: Callable[..., Awaitable[None]],
) -> None:
    async def _on_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        await on_voice_message(
            update,
            context,
            inbound_dir,
            ensure_auth,
            truncate_telegram,
            handle_task,
        )

    app.add_handler(MessageHandler(filters.VOICE, _on_voice))
    app.add_handler(MessageHandler(filters.AUDIO, _on_voice))
