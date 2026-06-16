#!/usr/bin/env python3
"""
KiezQuiz Telegram ↔ Cursor CLI Bridge
Läuft lokal auf dem Heim-Mac. Kein Cloud Agent (-c/--cloud).
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / "config.json"
STATE_PATH = SCRIPT_DIR / "state.json"

KIEZQUIZ_RULES = """
Projekt: KiezQuiz (HTML/CSS/JavaScript, GitHub logic3/KiezQuiz).
Wichtige Regeln:
- Layout nur in src/styles/device/*.css (siehe src/styles/device/README.md)
- Stadtseiten (hamburg/, berlin/, frankfurt/, duesseldorf/, europe/) NICHT manuell editieren — werden beim Deploy generiert
- Bei großen CSS-/Design-Änderungen: DESIGN_REVISION in scripts/stamp_build.py erhöhen
- Jede HTML-Seite braucht versionGuard.js am Ende von <head>
- Keine Secrets committen
- Antworte auf Deutsch, kurz und klar
""".strip()

HELP_TEXT = """KiezQuiz Agent — Befehle

• Einfach schreiben → Agent setzt fort (gleiches Gespräch)
• /new → neuer Agent (frischer Kontext)
• /new <Aufgabe> → neu starten und gleich Aufgabe senden
• /end → aktuelle Session beenden (ohne neue anzulegen)
• ja oder /deploy → Pull Request mergen → kiezquiz.de wird aktualisiert
• nein → PR bleibt offen (nicht live)
• /status → Session, Branch, PR
• /restart → Bot neu starten (lädt Code-Änderungen)
• /help → diese Hilfe

Rote Linie: Agent läuft nur lokal (Modell auto), kein Cloud Agent.
"""

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("kiezquiz-bot")


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
        },
    )


def save_state(state: dict[str, Any]) -> None:
    save_json(STATE_PATH, state)


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
    if is_likely_read_only_task(user_text):
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
    return run_cmd(args, cwd=repo, timeout=3600)


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
    code, out, _ = run_cmd(
        ["gh", "pr", "merge", str(pr_number), "--merge", "--delete-branch"],
        cwd=repo,
        timeout=120,
    )
    if code != 0:
        return False, f"Merge fehlgeschlagen:\n{out}"

    run_cmd(["git", "checkout", "main"], cwd=repo)
    run_cmd(["git", "pull", "--ff-only", "origin", "main"], cwd=repo)
    state["branch"] = None
    state["pr_url"] = None
    state["pr_number"] = None
    save_state(state)
    return True, f"PR #{pr_number} gemerged. Deploy läuft (~2 Min) → https://kiezquiz.de"


async def reject_deploy(state: dict[str, Any]) -> str:
    pr = state.get("pr_url") or "—"
    return f"OK, nicht deployed. PR bleibt offen:\n{pr}"


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
    if state.get("busy"):
        await update.message.reply_text("Agent läuft noch. Bitte warten.")
        return
    if not state.get("cursor_chat_id"):
        await update.message.reply_text("Keine aktive Session.")
        return

    state["cursor_chat_id"] = None
    save_state(state)
    await update.message.reply_text(
        "Session beendet. Schreib /new oder einfach eine Aufgabe für einen neuen Start."
    )



async def cmd_restart(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    cfg = context.application.bot_data["cfg"]
    if not await ensure_auth(update, cfg):
        return
    state = load_state()
    if state.get("busy"):
        await update.message.reply_text("Agent läuft noch. Erst warten oder /end.")
        return

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

        repo = Path(cfg["repo_path"])
        changed = git_changed_paths(repo)
        if not changed:
            await update.message.reply_text("Keine Datei-Änderungen im Repo.")
        elif is_likely_read_only_task(task) and not changes_affect_website(changed):
            preview = ", ".join(changed[:4])
            if len(changed) > 4:
                preview += f" (+{len(changed) - 4} weitere)"
            await update.message.reply_text(
                "Kein Pull Request (reine Check-Aufgabe, betrifft kiezquiz.de nicht).\n"
                f"Lokal geändert: {preview}"
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
    lower = text.lower()

    if lower in ("ja", "j", "yes", "deploy"):
        await cmd_deploy(update, context)
        return
    if lower in ("nein", "n", "no"):
        state = load_state()
        await update.message.reply_text(await reject_deploy(state))
        return

    await handle_task(update, context, text)


def main() -> None:
    cfg = load_config()
    repo = Path(cfg["repo_path"])
    if not repo.is_dir():
        log.error("repo_path existiert nicht: %s", repo)
        sys.exit(1)

    ok, msg = ensure_on_main(repo)
    if not ok:
        log.warning("Repo-Check: %s", msg)

    app = Application.builder().token(cfg["telegram_bot_token"]).build()
    app.bot_data["cfg"] = cfg

    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("start", cmd_help))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("new", cmd_new))
    app.add_handler(CommandHandler("end", cmd_end))
    app.add_handler(CommandHandler("deploy", cmd_deploy))
    app.add_handler(CommandHandler("restart", cmd_restart))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_message))

    log.info("KiezQuiz Telegram-Agent startet (repo=%s)", repo)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
