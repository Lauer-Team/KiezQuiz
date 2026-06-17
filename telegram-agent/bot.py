#!/usr/bin/env python3
"""
KiezQuiz Telegram ↔ Cursor CLI Bridge
Läuft auf dem Hetzner VPS (systemd kiezquiz-agent). Kein Cloud Agent (-c/--cloud).
E-Mail: iCloud — siehe telegram-agent/EMAIL.md
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from mailbox import (
    delete_message,
    format_inbox_list,
    format_message_detail,
    list_inbox,
    read_message,
    resolve_mailbox_config,
    send_message as send_mailbox_mail,
)
from outbound import (
    collect_outbound_files,
    resolve_email_config,
    send_email,
    send_files_to_chat,
    send_mail_attachments_to_chat,
)

from telegram import Update
from telegram.constants import ParseMode
from telegram.error import Conflict, NetworkError, TimedOut
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / "config.json"
STATE_PATH = SCRIPT_DIR / "state.json"

KIEZQUIZ_RULES = """
Projekt: KiezQuiz (HTML/CSS/JavaScript, GitHub Lauer-Team/KiezQuiz).
Cross-Projekt: ../AIOS-Docs/AIOS/me.md · ../AIOS-Docs/Efforts/setup-status.md bei Server/Ops.
Wichtige Regeln:
- Layout nur in src/styles/device/*.css (siehe src/styles/device/README.md)
- Stadtseiten (hamburg/, berlin/, frankfurt/, duesseldorf/, europe/) NICHT manuell editieren — werden beim Deploy generiert
- Bei großen CSS-/Design-Änderungen: DESIGN_REVISION in scripts/stamp_build.py erhöhen
- Jede HTML-Seite braucht versionGuard.js am Ende von <head>
- Keine Secrets committen
- Antworte auf Deutsch, kurz und klar
- Erstellte Dateien (PDF, CSV, …): Pfad in Antwort nennen — Bot sendet sie automatisch per Telegram
- E-Mail iCloud (/email): kalle@kiezquiz.de — Versand via SMTP
- Postfach iCloud (/post): kalle@kiezquiz.de — inbox, lesen, senden, löschen; CLI: mailbox_cli.py
- Pull Request nur bei echten Website-Änderungen (src/, Seiten) — ops/ und reine Chat-Aufgaben nicht committen
""".strip()

HELP_TEXT = """KiezQuiz Agent — Befehle

• Konkrete Aufgabe schreiben → Agent (Code, Recherche, ops/)
• /agent <aufgabe> → Agent erzwingen (auch bei Hallo/Mail/Post)
• Kurz „Hallo“ → schnelle Antwort, kein Agent
• /new → neuer Agent · /end → Session + PR + busy zurücksetzen
• ja/nein · /deploy → PR mergen → kiezquiz.de
• /status · /restart · /file <pfad> · /help

E-Mail (iCloud, Absender kalle@kiezquiz.de):
• /email <betreff> | <text> → SMTP-Versand
• Freitext: „Schick mir eine Mail: …“ → SMTP

Postfach (/post):
• /post inbox → letzte Mails
• /post read <nr> → Mail lesen (+ Anhänge im Chat)
• /post send <an> <betreff> | <text> → senden als kalle@kiezquiz.de
• /post delete <nr> → Mail löschen
• Freitext: „Posteingang“ / „zeig Mails“

PR nur bei kiezquiz.de-Dateien — nicht bei ops/, Hallo, E-Mail.

Rote Linie: Agent lokal (Modell auto), kein Cloud Agent.
"""

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("kiezquiz-bot")


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())



def load_json(path: Path, default: dict[str, Any] | None = None) -> dict[str, Any]:
    if not path.exists():
        return default or {}
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: dict[str, Any]) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def load_config() -> dict[str, Any]:
    if not CONFIG_PATH.exists():
        log.error("config.json fehlt. Kopiere config.example.json → config.json")
        sys.exit(1)
    cfg = load_json(CONFIG_PATH)
    for key in ("telegram_bot_token", "telegram_user_id", "repo_path"):
        if key not in cfg or cfg[key] in ("", None, "HIER-DEIN-BOT-TOKEN-VON-BOTFATHER"):
            log.error("config.json: Feld %r fehlt oder ist noch Platzhalter", key)
            sys.exit(1)
    cfg.setdefault("agent_bin", "agent")
    cfg.setdefault("model", "auto")
    return cfg


def load_state() -> dict[str, Any]:
    return load_json(
        STATE_PATH,
        {
            "cursor_chat_id": None,
            "branch": None,
            "pr_url": None,
            "pr_number": None,
            "busy": False,
            "mail_list": [],
        },
    )


def save_state(state: dict[str, Any]) -> None:
    save_json(STATE_PATH, state)


def clear_session_state(state: dict[str, Any]) -> None:
    state["cursor_chat_id"] = None
    state["branch"] = None
    state["pr_url"] = None
    state["pr_number"] = None
    state["busy"] = False


def reset_stale_busy(state: dict[str, Any]) -> None:
    if state.get("busy"):
        log.warning("Stale busy flag cleared on startup")
        state["busy"] = False
        save_state(state)


def authorized(cfg: dict[str, Any], user_id: int | None) -> bool:
    return user_id is not None and int(cfg["telegram_user_id"]) == int(user_id)


def run_cmd(
    args: list[str],
    cwd: Path | None = None,
    timeout: int = 3600,
) -> tuple[int, str, str]:
    log.info("RUN: %s (cwd=%s)", " ".join(args), cwd)
    proc = subprocess.run(
        args,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    out = (proc.stdout or "") + (proc.stderr or "")
    return proc.returncode, out.strip(), proc.stdout or ""


def truncate_telegram(text: str, limit: int = 3900) -> str:
    text = text.strip() or "(keine Ausgabe)"
    if len(text) <= limit:
        return text
    return text[: limit - 40] + "\n\n… (gekürzt, Details im Repo/PR)"


# Pfade, die kiezquiz.de (GitHub Pages) nicht sichtbar betreffen — rsync schließt ops/ aus.
NON_WEBSITE_PREFIXES = ("telegram-agent/", "ops/", ".cursor/")
NON_WEBSITE_FILES = frozenset({"CHANGELOG.md", ".gitignore"})

READ_ONLY_TASK_RE = re.compile(
    r"\b("
    r"l[äa]uft|funktioniert|erreichbar|online|"
    r"deployed|status|pr[üu]f|check|"
    r"teste?\s+(ob|mal)|gibt\s+es\s+(fehler|probleme)"
    r")\b",
    re.IGNORECASE,
)

# „ja“, „Ja alles deployen“, „bitte mergen“ — nicht als Agent-Aufgabe missverstehen
DEPLOY_CONFIRM_RE = re.compile(
    r"^(ja|j|yes|yep|klar|ok|okay|gerne)\b|"
    r"\b(deploy|deployen|merg|mergen|live\s*schalten|einchecken)\b",
    re.IGNORECASE,
)
REJECT_CONFIRM_RE = re.compile(
    r"^(nein|n|no|nö|lieber\s+nicht|abbrechen)\b",
    re.IGNORECASE,
)

TRIVIAL_CHAT_RE = re.compile(
    r"^(hi|hallo|hey|moin|servus|danke|thanks|thx|ok|okay|test)[!.?\s]*$",
    re.IGNORECASE,
)

EMAIL_FREETEXT_RE = re.compile(
    r"(?:"
    r"(?:schick|sende|mail).{0,40}(?:e-?mail|mail\b)|"
    r"(?:e-?mail|mail).{0,25}(?:schick|senden)|"
    r"mail\s+mir\b"
    r")",
    re.IGNORECASE,
)

POST_INBOX_FREETEXT_RE = re.compile(
    r"\b(posteingang|inbox|neue?\s+mails?|mails?\s+(zeigen|lesen)|zeig\s+(mir\s+)?(die\s+)?mails?)\b",
    re.IGNORECASE,
)

POST_SEND_FREETEXT_RE = re.compile(
    r"(?:"
    r"(?:schick|sende|schreib).{0,40}(?:mail|e-?mail).{0,40}(?:postfach|kalle@kiezquiz\.de)|"
    r"(?:schick|sende|schreib).{0,40}(?:über\s+)?(?:postfach|kalle@kiezquiz\.de)|"
    r"(?:postfach|kalle@kiezquiz\.de).{0,30}(?:mail|e-?mail).{0,30}(?:schick|senden|schreib)|"
    r"(?:mail|e-?mail).{0,40}(?:über\s+)?(?:postfach|kalle@kiezquiz\.de)"
    r")",
    re.IGNORECASE,
)

MAIL_TASK_RE = re.compile(
    r"(?:"
    r"\b(?:e-?mail|mail|posteingang|postfach|inbox)\b|"
    r"kalle@kiezquiz\.de|"
    r"(?:schreib|schick|sende).{0,50}(?:mail|e-?mail)|"
    r"(?:mail|e-?mail).{0,50}(?:schreib|schick|senden|postfach)"
    r")",
    re.IGNORECASE,
)

EXPLICIT_PR_RE = re.compile(
    r"\b(pr|pull\s*request|commit|push|github|einchecken)\b",
    re.IGNORECASE,
)

CODE_CHANGE_RE = re.compile(
    r"\b("
    r"[äa]nder|fix|bug|implement|bau|erstell|schreib|update|"
    r"css|html|js|javascript|design|layout|seite|deploy|feature"
    r")\b",
    re.IGNORECASE,
)


def git_changed_paths(repo: Path) -> list[str]:
    code, out, _ = run_cmd(["git", "status", "--porcelain"], cwd=repo, timeout=60)
    if code != 0 or not out.strip():
        return []
    paths: list[str] = []
    for line in out.strip().splitlines():
        part = line[3:].strip()
        if " -> " in part:
            part = part.split(" -> ", 1)[1]
        paths.append(part)
    return paths


def git_has_changes(repo: Path) -> bool:
    return bool(git_changed_paths(repo))


def changes_affect_website(paths: list[str]) -> bool:
    for path in paths:
        if path in NON_WEBSITE_FILES:
            continue
        if any(path.startswith(prefix) for prefix in NON_WEBSITE_PREFIXES):
            continue
        return True
    return False


def is_likely_read_only_task(task: str) -> bool:
    return bool(READ_ONLY_TASK_RE.search(task))


def is_trivial_chat(task: str) -> bool:
    return bool(TRIVIAL_CHAT_RE.match(task.strip()))


def is_email_freitext(task: str) -> bool:
    if POST_SEND_FREETEXT_RE.search(task) or POST_INBOX_FREETEXT_RE.search(task):
        return False
    return bool(EMAIL_FREETEXT_RE.search(task))


def is_post_inbox_freitext(task: str) -> bool:
    return bool(POST_INBOX_FREETEXT_RE.search(task))


def is_post_send_freitext(task: str) -> bool:
    return bool(POST_SEND_FREETEXT_RE.search(task))


def is_post_freitext(task: str) -> bool:
    return is_post_inbox_freitext(task) or is_post_send_freitext(task)


def is_mail_related_task(task: str) -> bool:
    return bool(MAIL_TASK_RE.search(task))


def should_create_pr(task: str, paths: list[str]) -> bool:
    """PR nur bei Website-Dateien oder explizitem Wunsch — nie für Mail/ops/Hallo."""
    if not paths:
        return False
    if (
        is_trivial_chat(task)
        or is_mail_related_task(task)
        or is_email_freitext(task)
        or is_post_freitext(task)
    ):
        return False
    if is_likely_read_only_task(task):
        return False
    if not changes_affect_website(paths):
        return False
    if EXPLICIT_PR_RE.search(task):
        return True
    if CODE_CHANGE_RE.search(task):
        return True
    return False


def parse_email_request(raw: str, default_to: str) -> tuple[str, str, str] | None:
    text = raw.strip()
    if "|" in text:
        head, body = text.split("|", 1)
        body = body.strip()
        parts = head.strip().split(None, 1)
        if len(parts) == 2 and "@" in parts[0]:
            return parts[0], parts[1], body
        if len(parts) >= 1 and body:
            to = default_to if "@" not in head else parts[0]
            subject = parts[1] if len(parts) == 2 and "@" in parts[0] else head.strip()
            return to, subject, body

    if is_email_freitext(text):
        body = re.sub(
            r"^(?:bitte\s+)?(?:schick|sende|mail)\s+(?:mir\s+)?(?:eine\s+)?(?:e-?mail|mail)[:\s]*",
            "",
            text,
            flags=re.IGNORECASE,
        ).strip()
        if not body:
            body = text
        return default_to, "Nachricht von Kalle", body
    return None


def is_deploy_confirmation(text: str) -> bool:
    t = text.strip()
    if t.lower() in ("ja", "j", "yes", "deploy"):
        return True
    return bool(DEPLOY_CONFIRM_RE.search(t))


def is_reject_confirmation(text: str) -> bool:
    t = text.strip()
    if t.lower() in ("nein", "n", "no"):
        return True
    return bool(REJECT_CONFIRM_RE.search(t))


def pr_state(repo: Path, pr_number: int) -> str | None:
    code, out, _ = run_cmd(
        ["gh", "pr", "view", str(pr_number), "--json", "state", "-q", ".state"],
        cwd=repo,
        timeout=60,
    )
    if code != 0:
        return None
    return out.strip() or None


def sync_repo_main(repo: Path, state: dict[str, Any]) -> None:
    run_cmd(["git", "checkout", "main"], cwd=repo, timeout=60)
    run_cmd(["git", "pull", "--ff-only", "origin", "main"], cwd=repo, timeout=120)
    state["branch"] = None
    state["pr_url"] = None
    state["pr_number"] = None
    save_state(state)


def git_current_branch(repo: Path) -> str:
    _, out, _ = run_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo)
    return out.strip() or "main"


def ensure_on_main(repo: Path) -> tuple[bool, str]:
    branch = git_current_branch(repo)
    if branch != "main":
        return False, f"Aktueller Branch ist {branch}, nicht main. Bitte manuell prüfen."
    code, out, _ = run_cmd(["git", "pull", "--ff-only", "origin", "main"], cwd=repo, timeout=120)
    if code != 0:
        return False, f"git pull fehlgeschlagen:\n{out}"
    return True, "main ist aktuell."


def create_cursor_chat(cfg: dict[str, Any]) -> tuple[str | None, str]:
    code, out, stdout = run_cmd(
        [cfg["agent_bin"], "create-chat"],
        cwd=Path(cfg["repo_path"]),
        timeout=120,
    )
    if code != 0:
        return None, f"create-chat fehlgeschlagen:\n{out}"
    chat_id = stdout.strip().splitlines()[-1].strip()
    if not chat_id or len(chat_id) < 8:
        return None, f"Unerwartete create-chat-Ausgabe:\n{out}"
    return chat_id, chat_id


def build_agent_prompt(user_text: str) -> str:
    extra = ""
    if is_mail_related_task(user_text):
        extra = (
            "\n\nHinweis: Reine E-Mail-Aufgabe — Text formulieren und via "
            "mailbox_cli.py senden oder send_email.py (iCloud SMTP). "
            "KEINE Repo-Dateien ändern, nichts committen."
        )
    elif is_likely_read_only_task(user_text):
        extra = (
            "\n\nHinweis: Reine Check-/Status-Frage — nur prüfen und antworten, "
            "keine Dateien ändern."
        )
    return f"{KIEZQUIZ_RULES}{extra}\n\n---\n\nAufgabe:\n{user_text}"


def run_agent(cfg: dict[str, Any], state: dict[str, Any], user_text: str) -> tuple[int, str]:
    chat_id = state.get("cursor_chat_id")
    if not chat_id:
        new_id, msg = create_cursor_chat(cfg)
        if not new_id:
            return 1, msg
        state["cursor_chat_id"] = new_id
        save_state(state)
        chat_id = new_id

    repo = Path(cfg["repo_path"])
    args = [
        cfg["agent_bin"],
        f"--resume={chat_id}",
        "-p",
        "--force",
        "--trust",
        f"--model={cfg['model']}",
        f"--workspace={repo}",
        build_agent_prompt(user_text),
    ]
    code, out, _ = run_cmd(args, cwd=repo, timeout=3600)
    return code, out


def branch_name_from_task(task: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", task.lower())[:40].strip("-")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
    return f"telegram/{stamp}-{slug or 'update'}"


def commit_and_pr(cfg: dict[str, Any], state: dict[str, Any], task: str, agent_summary: str) -> tuple[bool, str]:
    repo = Path(cfg["repo_path"])
    if not git_has_changes(repo):
        return False, ""

    branch = branch_name_from_task(task)
    steps: list[tuple[list[str], str]] = [
        (["git", "checkout", "-b", branch], "Branch anlegen"),
        (["git", "add", "-A"], "Dateien stagen"),
        (
            ["git", "commit", "-m", f"telegram: {task[:120]}"],
            "Commit",
        ),
        (["git", "push", "-u", "origin", branch], "Push"),
    ]

    for cmd, label in steps:
        code, out, _ = run_cmd(cmd, cwd=repo, timeout=300)
        if code != 0:
            if label == "Commit" and "nothing to commit" in out:
                run_cmd(["git", "checkout", "main"], cwd=repo)
                run_cmd(["git", "branch", "-D", branch], cwd=repo)
                return False, ""
            return False, f"{label} fehlgeschlagen:\n{out}"

    body = f"Automatisch via Telegram-Agent.\n\n**Aufgabe:** {task}\n\n**Agent:**\n{agent_summary[:2000]}"
    code, out, stdout = run_cmd(
        [
            "gh",
            "pr",
            "create",
            "--base",
            "main",
            "--head",
            branch,
            "--title",
            f"Telegram: {task[:80]}",
            "--body",
            body,
        ],
        cwd=repo,
        timeout=120,
    )
    if code != 0:
        return False, f"PR erstellen fehlgeschlagen:\n{out}"

    pr_url = stdout.strip() or out.strip()
    pr_number = None
    m = re.search(r"/pull/(\d+)", pr_url)
    if m:
        pr_number = int(m.group(1))

    state["branch"] = branch
    state["pr_url"] = pr_url
    state["pr_number"] = pr_number
    save_state(state)
    return True, pr_url


def merge_pr(cfg: dict[str, Any], state: dict[str, Any]) -> tuple[bool, str]:
    pr_number = state.get("pr_number")
    pr_url = state.get("pr_url")
    if not pr_number and pr_url:
        m = re.search(r"/pull/(\d+)", pr_url)
        if m:
            pr_number = int(m.group(1))
    if not pr_number:
        return False, "Kein offener PR. Erst eine Aufgabe senden, die Code ändert."

    repo = Path(cfg["repo_path"])
    status = pr_state(repo, pr_number)
    if status == "MERGED":
        sync_repo_main(repo, state)
        return True, f"PR #{pr_number} war bereits gemerged. main ist aktualisiert."

    code, out, _ = run_cmd(
        ["gh", "pr", "merge", str(pr_number), "--merge", "--delete-branch"],
        cwd=repo,
        timeout=120,
    )
    if code != 0:
        if status == "MERGED" or "already" in out.lower() or "merged" in out.lower():
            sync_repo_main(repo, state)
            return True, f"PR #{pr_number} war bereits gemerged. main ist aktualisiert."
        return False, f"Merge fehlgeschlagen:\n{out}"

    sync_repo_main(repo, state)
    return True, f"PR #{pr_number} gemerged. Deploy läuft (~2 Min) → https://kiezquiz.de"


async def reject_deploy(state: dict[str, Any]) -> str:
    pr = state.get("pr_url") or "—"
    return f"OK, nicht deployed. PR bleibt offen:\n{pr}"




async def notify_user(bot, chat_id: int, text: str) -> None:
    try:
        await bot.send_message(chat_id=chat_id, text=truncate_telegram(text))
    except Exception:
        log.exception("Telegram-Benachrichtigung fehlgeschlagen")


async def send_restart_online_notice(app: Application) -> None:
    state = load_state()
    reset_stale_busy(state)
    chat_id = state.pop("restart_notify_chat_id", None)
    if chat_id is not None:
        save_state(state)
        await notify_user(app.bot, int(chat_id), "✅ Wieder online — bereit.")


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    err = context.error
    if isinstance(err, Conflict):
        log.warning("Telegram polling conflict (evtl. doppelte Instanz): %s", err)
        return
    if isinstance(err, (NetworkError, TimedOut)):
        log.warning("Telegram-Netzwerkproblem: %s", err)
        return
    log.exception("Unhandled error", exc_info=err)
    cfg = context.application.bot_data.get("cfg")
    if not cfg:
        return
    msg = truncate_telegram(f"⚠️ Interner Fehler:\n{type(err).__name__}: {err}")
    try:
        if isinstance(update, Update) and update.effective_chat:
            await update.effective_chat.send_message(msg)
        else:
            await notify_user(context.bot, int(cfg["telegram_user_id"]), msg)
    except Exception:
        log.exception("Fehler-Benachrichtigung fehlgeschlagen")


async def ensure_auth(update: Update, cfg: dict[str, Any]) -> bool:
    uid = update.effective_user.id if update.effective_user else None
    if not authorized(cfg, uid):
        if update.message:
            await update.message.reply_text("Nicht autorisiert.")
        return False
    return True


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cfg = context.application.bot_data["cfg"]
    if not await ensure_auth(update, cfg):
        return
    await update.message.reply_text(HELP_TEXT)


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cfg = context.application.bot_data["cfg"]
    if not await ensure_auth(update, cfg):
        return
    state = load_state()
    busy = "ja" if state.get("busy") else "nein"
    lines = [
        f"Agent beschäftigt: {busy}",
        f"Cursor-Session: {state.get('cursor_chat_id') or '— (noch keine)'}",
        f"Branch: {state.get('branch') or '—'}",
        f"PR: {state.get('pr_url') or '—'}",
        f"Repo: {cfg['repo_path']}",
        f"Modell: {cfg['model']} (lokal)",
    ]
    await update.message.reply_text("\n".join(lines))


async def cmd_end(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cfg = context.application.bot_data["cfg"]
    if not await ensure_auth(update, cfg):
        return
    state = load_state()
    had_session = bool(
        state.get("cursor_chat_id") or state.get("pr_url") or state.get("branch")
    )
    was_busy = bool(state.get("busy"))
    clear_session_state(state)
    save_state(state)
    if not had_session and not was_busy:
        await update.message.reply_text("Keine aktive Session.")
        return
    extra = " (busy zurückgesetzt)" if was_busy else ""
    await update.message.reply_text(
        f"Session beendet{extra}. /agent <aufgabe> oder Freitext für neuen Start."
    )


async def cmd_agent(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cfg = context.application.bot_data["cfg"]
    if not await ensure_auth(update, cfg):
        return
    task = " ".join(context.args).strip()
    if not task:
        await update.message.reply_text(
            "Nutze: /agent <aufgabe>\nErzwingt den Cursor-Agent — auch bei Hallo, Mail oder Post."
        )
        return
    await handle_task(update, context, task)



async def cmd_restart(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cfg = context.application.bot_data["cfg"]
    if not await ensure_auth(update, cfg):
        return
    state = load_state()
    if state.get("busy"):
        await update.message.reply_text("Agent läuft noch. Erst warten oder /end.")
        return

    chat_id = update.effective_chat.id if update.effective_chat else None
    if chat_id is not None:
        state["restart_notify_chat_id"] = chat_id
        save_state(state)

    await update.message.reply_text(
        "Starte neu … (Code-Änderungen werden geladen, ~15 Sekunden)"
    )
    await asyncio.sleep(1.5)
    log.info("Neustart angefordert via /restart")
    sys.exit(0)

async def cmd_new(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cfg = context.application.bot_data["cfg"]
    if not await ensure_auth(update, cfg):
        return
    state = load_state()
    if state.get("busy"):
        await update.message.reply_text("Agent läuft noch. Bitte warten.")
        return

    chat_id, msg = await asyncio.to_thread(create_cursor_chat, cfg)
    if not chat_id:
        await update.message.reply_text(truncate_telegram(msg))
        return

    state["cursor_chat_id"] = chat_id
    state["branch"] = None
    state["pr_url"] = None
    state["pr_number"] = None
    save_state(state)

    task = " ".join(context.args).strip()
    if task:
        await update.message.reply_text("Neuer Agent. Aufgabe startet …")
        await handle_task(update, context, task)
    else:
        await update.message.reply_text("Neuer Agent. Was soll ich tun?")


async def cmd_deploy(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cfg = context.application.bot_data["cfg"]
    if not await ensure_auth(update, cfg):
        return
    state = load_state()
    ok, msg = await asyncio.to_thread(merge_pr, cfg, state)
    await update.message.reply_text(truncate_telegram(msg))


def revert_local_changes(repo: Path, paths: list[str]) -> None:
    if not paths:
        return
    run_cmd(["git", "checkout", "--", *paths], cwd=repo, timeout=120)


async def deliver_agent_files(
    update: Update,
    cfg: dict[str, Any],
    agent_out: str,
    task: str,
) -> None:
    if is_mail_related_task(task):
        return
    if not update.message or not update.effective_chat:
        return
    repo = Path(cfg["repo_path"])
    paths = await asyncio.to_thread(collect_outbound_files, agent_out, repo, None)
    if not paths:
        return
    sent = await send_files_to_chat(update.get_bot(), update.effective_chat.id, paths)
    if sent:
        lines = "\n".join(f"📎 {Path(p).name}" for p in sent)
        await update.message.reply_text(f"Dateien:\n{lines}")


async def cmd_file(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cfg = context.application.bot_data["cfg"]
    if not await ensure_auth(update, cfg):
        return
    if not context.args:
        await update.message.reply_text(
            "Nutze: /file <pfad-im-repo>\n"
            "Beispiel: /file ops/agents/cfo-finanzen/transactions.pdf"
        )
        return

    repo = Path(cfg["repo_path"])
    rel = " ".join(context.args).strip()
    paths = await asyncio.to_thread(collect_outbound_files, rel, repo, None)
    if not paths:
        await update.message.reply_text(f"Datei nicht gefunden: {rel}")
        return
    sent = await send_files_to_chat(update.get_bot(), update.effective_chat.id, paths[:1])
    if not sent:
        await update.message.reply_text("Senden fehlgeschlagen (zu groß oder nicht lesbar).")


async def cmd_email(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cfg = context.application.bot_data["cfg"]
    if not await ensure_auth(update, cfg):
        return

    email_cfg = resolve_email_config(cfg)
    if not email_cfg:
        await update.message.reply_text(
            "E-Mail nicht eingerichtet.\n"
            "Setze KIEZ_ICLOUD_LOGIN + KIEZ_ICLOUD_APP_PASSWORD in .env "
            "und email-Abschnitt in config.json (siehe EMAIL.md)."
        )
        return

    raw = " ".join(context.args).strip()
    if not raw:
        await update.message.reply_text(
            "Nutze: /email <betreff> | <text>\n"
            "Oder: /email empfaenger@… Betreff | Text\n"
            f"Standard-Empfänger: {email_cfg.get('default_to') or '—'}"
        )
        return

    parsed = parse_email_request(raw, email_cfg.get("default_to") or "")
    if not parsed:
        await update.message.reply_text("Betreff und Text dürfen nicht leer sein.")
        return
    to, subject, body = parsed

    if not to:
        await update.message.reply_text("Empfänger fehlt (default_to in config).")
        return
    if not subject or not body:
        await update.message.reply_text("Betreff und Text dürfen nicht leer sein.")
        return

    try:
        await asyncio.to_thread(send_email, email_cfg, to, subject, body)
        await update.message.reply_text(f"✉️ Gesendet an {to}\nBetreff: {subject}")
    except Exception as exc:
        log.exception("E-Mail fehlgeschlagen")
        await update.message.reply_text(truncate_telegram(f"E-Mail fehlgeschlagen: {exc}"))


async def send_email_from_text(update: Update, cfg: dict[str, Any], text: str) -> bool:
    email_cfg = resolve_email_config(cfg)
    if not email_cfg:
        await update.message.reply_text("E-Mail nicht eingerichtet.")
        return True

    default_to = email_cfg.get("default_to") or ""
    parsed = parse_email_request(text, default_to)
    if not parsed:
        return False

    to, subject, body = parsed
    if not to or not body:
        await update.message.reply_text("Empfänger oder Text fehlt.")
        return True

    try:
        await asyncio.to_thread(send_email, email_cfg, to, subject, body)
        await update.message.reply_text(f"✉️ Gesendet an {to}\nBetreff: {subject}")
    except Exception as exc:
        log.exception("E-Mail fehlgeschlagen")
        await update.message.reply_text(truncate_telegram(f"E-Mail fehlgeschlagen: {exc}"))
    return True


def parse_post_send(raw: str, default_to: str) -> tuple[str, str, str] | None:
    text = raw.strip()
    if "|" in text:
        head, body = text.split("|", 1)
        body = body.strip()
        parts = head.strip().split(None, 1)
        if len(parts) == 2 and "@" in parts[0]:
            return parts[0], parts[1], body
        if body:
            return default_to, head.strip(), body
    if is_post_send_freitext(text):
        body = re.sub(
            r"^(?:bitte\s+)?(?:schick|sende).{0,40}(?:postfach|kalle@kiezquiz\.de)[:\s]*",
            "",
            text,
            flags=re.IGNORECASE,
        ).strip()
        if body:
            return default_to, "Nachricht von Kalle", body
    return None


def mail_item_by_index(state: dict[str, Any], index: int) -> dict[str, str] | None:
    items = state.get("mail_list") or []
    if index < 1 or index > len(items):
        return None
    return items[index - 1]


async def deliver_mail_read(update: Update, msg: dict[str, Any]) -> None:
    await update.message.reply_text(truncate_telegram(format_message_detail(msg)))
    attachments = msg.get("attachments") or []
    if not attachments:
        return
    sent, skipped = await send_mail_attachments_to_chat(
        update.get_bot(),
        update.effective_chat.id,
        attachments,
    )
    if sent:
        await update.message.reply_text(f"📎 {len(sent)} Anhang/Anhänge geschickt.")
    if skipped:
        await update.message.reply_text(
            f"⚠️ {skipped} Anhang/Anhänge übersprungen (zu groß oder Fehler)."
        )


async def cmd_post(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cfg = context.application.bot_data["cfg"]
    if not await ensure_auth(update, cfg):
        return

    box_cfg = resolve_mailbox_config(cfg)
    if not box_cfg:
        await update.message.reply_text(
            "iCloud-Postfach nicht eingerichtet.\n"
            "Setze KIEZ_ICLOUD_LOGIN + KIEZ_ICLOUD_APP_PASSWORD in .env "
            "und icloud_mailbox in config.json (siehe EMAIL.md)."
        )
        return

    if not context.args:
        await update.message.reply_text(
            "Postfach (kalle@kiezquiz.de):\n"
            "• /post inbox\n"
            "• /post read <nr>\n"
            "• /post send <an> <betreff> | <text>\n"
            "• /post delete <nr>"
        )
        return

    sub = context.args[0].lower()
    state = load_state()

    try:
        if sub == "inbox":
            items = await asyncio.to_thread(list_inbox, box_cfg, 10)
            state["mail_list"] = items
            save_state(state)
            await update.message.reply_text(truncate_telegram(format_inbox_list(items)))

        elif sub == "read" and len(context.args) >= 2:
            item = mail_item_by_index(state, int(context.args[1]))
            if not item:
                await update.message.reply_text("Ungültige Nr. — zuerst /post inbox")
                return
            msg = await asyncio.to_thread(read_message, box_cfg, item["uid"])
            await deliver_mail_read(update, msg)

        elif sub == "delete" and len(context.args) >= 2:
            item = mail_item_by_index(state, int(context.args[1]))
            if not item:
                await update.message.reply_text("Ungültige Nr. — zuerst /post inbox")
                return
            await asyncio.to_thread(delete_message, box_cfg, item["uid"])
            await update.message.reply_text(f"🗑 Mail #{context.args[1]} gelöscht.")

        elif sub == "send":
            raw = " ".join(context.args[1:]).strip()
            default_to = cfg.get("email", {}).get("default_to", "")
            parsed = parse_post_send(raw, default_to)
            if not parsed:
                await update.message.reply_text(
                    "Nutze: /post send <an> <betreff> | <text>\n"
                    f"Oder nur: /post send Betreff | text (an {default_to or 'default_to'})"
                )
                return
            to, subject, body = parsed
            await asyncio.to_thread(send_mailbox_mail, box_cfg, to, subject, body)
            from_addr = box_cfg.get("from_email") or "kalle@kiezquiz.de"
            await update.message.reply_text(f"✉️ Gesendet von {from_addr} an {to}\nBetreff: {subject}")

        else:
            await update.message.reply_text("Unbekannter /post-Befehl. Nutze /post ohne Argumente für Hilfe.")
    except ValueError as exc:
        await update.message.reply_text(f"Fehler: {exc}")
    except Exception as exc:
        log.exception("Postfach-Befehl fehlgeschlagen")
        await update.message.reply_text(truncate_telegram(f"Postfach-Fehler: {exc}"))


async def handle_post_freitext(update: Update, cfg: dict[str, Any], text: str) -> bool:
    if not is_post_freitext(text):
        return False

    box_cfg = resolve_mailbox_config(cfg)
    if not box_cfg:
        await update.message.reply_text("iCloud-Postfach nicht eingerichtet (.env + config.json, siehe EMAIL.md).")
        return True

    if is_post_inbox_freitext(text):
        state = load_state()
        try:
            items = await asyncio.to_thread(list_inbox, box_cfg, 10)
            state["mail_list"] = items
            save_state(state)
            await update.message.reply_text(truncate_telegram(format_inbox_list(items)))
        except Exception as exc:
            await update.message.reply_text(truncate_telegram(f"Postfach-Fehler: {exc}"))
        return True

    if is_post_send_freitext(text):
        default_to = cfg.get("email", {}).get("default_to", "")
        parsed = parse_post_send(text, default_to)
        if parsed:
            to, subject, body = parsed
            try:
                await asyncio.to_thread(send_mailbox_mail, box_cfg, to, subject, body)
                from_addr = box_cfg.get("from_email") or "kalle@kiezquiz.de"
                await update.message.reply_text(
                    f"✉️ Gesendet von {from_addr} an {to}\nBetreff: {subject}"
                )
            except Exception as exc:
                await update.message.reply_text(truncate_telegram(f"Postfach-Fehler: {exc}"))
            return True
    return False


async def handle_task(update: Update, context: ContextTypes.DEFAULT_TYPE, task: str) -> None:
    cfg = context.application.bot_data["cfg"]
    state = load_state()

    if state.get("busy"):
        await update.message.reply_text("Agent läuft bereits. /status")
        return

    state["busy"] = True
    save_state(state)
    await update.message.reply_text("Agent läuft … (kann einige Minuten dauern)")

    try:
        code, agent_out = await asyncio.to_thread(run_agent, cfg, state, task)
        summary = truncate_telegram(agent_out)
        prefix = "Fertig." if code == 0 else "Agent beendet mit Fehler."
        await update.message.reply_text(f"{prefix}\n\n{summary}")
        await deliver_agent_files(update, cfg, agent_out, task)

        repo = Path(cfg["repo_path"])
        changed = git_changed_paths(repo)
        if is_mail_related_task(task) and changed:
            await asyncio.to_thread(revert_local_changes, repo, changed)
            changed = git_changed_paths(repo)
            if not changed:
                await update.message.reply_text("Mail erledigt — keine Repo-Änderungen.")
                return
        if not changed:
            pr_number = state.get("pr_number")
            pr_url = state.get("pr_url")
            if pr_number and pr_state(repo, pr_number) == "MERGED":
                sync_repo_main(repo, state)
                await update.message.reply_text(
                    f"Keine neuen lokalen Änderungen — PR #{pr_number} ist bereits gemerged, main aktualisiert."
                )
            elif pr_url or pr_number:
                label = pr_url or f"#{pr_number}"
                await update.message.reply_text(
                    f"Keine neuen lokalen Änderungen (bereits committed).\n"
                    f"Offener PR: {label}\n\nMergen? (ja / nein)"
                )
            else:
                await update.message.reply_text("Keine Datei-Änderungen im Repo.")
        elif not should_create_pr(task, changed):
            preview = ", ".join(changed[:4])
            if len(changed) > 4:
                preview += f" (+{len(changed) - 4} weitere)"
            await update.message.reply_text(
                "Kein Pull Request (nur ops/intern oder keine Website-Änderung).\n"
                f"Lokal geändert: {preview or '—'}"
            )
        else:
            ok, pr_info = await asyncio.to_thread(commit_and_pr, cfg, state, task, agent_out)
            if ok:
                if changes_affect_website(changed):
                    follow_up = "Deployen? (ja / nein)"
                else:
                    follow_up = "Mergen? (ja / nein) — betrifft kiezquiz.de nicht."
                await update.message.reply_text(
                    f"Geänderte Dateien → Pull Request:\n{pr_info}\n\n{follow_up}"
                )
            elif pr_info:
                await update.message.reply_text(truncate_telegram(pr_info))
    except Exception as exc:
        log.exception("Agent-Aufgabe fehlgeschlagen")
        await update.message.reply_text(
            truncate_telegram(f"Interner Fehler: {exc}\n\nBitte /restart und erneut versuchen.")
        )
    finally:
        state = load_state()
        state["busy"] = False
        save_state(state)


async def on_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cfg = context.application.bot_data["cfg"]
    if not await ensure_auth(update, cfg):
        return
    if not update.message or not update.message.text:
        return

    text = update.message.text.strip()

    if is_deploy_confirmation(text):
        await cmd_deploy(update, context)
        return
    if is_reject_confirmation(text):
        state = load_state()
        await update.message.reply_text(await reject_deploy(state))
        return

    if is_trivial_chat(text):
        await update.message.reply_text(
            "Hallo! 👋 Schreib eine konkrete Aufgabe — oder /help für Befehle "
            "(/file, /email, /status)."
        )
        return

    if is_email_freitext(text):
        if await send_email_from_text(update, cfg, text):
            return

    if await handle_post_freitext(update, cfg, text):
        return

    await handle_task(update, context, text)


def main() -> None:
    load_dotenv(SCRIPT_DIR / ".env")
    cfg = load_config()
    repo = Path(cfg["repo_path"])
    if not repo.is_dir():
        log.error("repo_path existiert nicht: %s", repo)
        sys.exit(1)

    ok, msg = ensure_on_main(repo)
    if not ok:
        log.warning("Repo-Check: %s", msg)

    app = (
        Application.builder()
        .token(cfg["telegram_bot_token"])
        .post_init(send_restart_online_notice)
        .build()
    )
    app.bot_data["cfg"] = cfg
    app.add_error_handler(on_error)

    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("start", cmd_help))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("new", cmd_new))
    app.add_handler(CommandHandler("agent", cmd_agent))
    app.add_handler(CommandHandler("end", cmd_end))
    app.add_handler(CommandHandler("deploy", cmd_deploy))
    app.add_handler(CommandHandler("restart", cmd_restart))
    app.add_handler(CommandHandler("file", cmd_file))
    app.add_handler(CommandHandler("email", cmd_email))
    app.add_handler(CommandHandler("post", cmd_post))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_message))

    log.info("KiezQuiz Telegram-Agent startet (repo=%s)", repo)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
