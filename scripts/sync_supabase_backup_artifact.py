#!/usr/bin/env python3
"""Neuestes Supabase-Backup aus GitHub Actions laden und ins lokale Archiv kopieren."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
CONFIG_PATH = SCRIPT_DIR / "backup-supabase.config.json"
REPO = "Lauer-Team/KiezQuiz"
WORKFLOW = "supabase-backup.yml"


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        print(f"Fehler: {CONFIG_PATH} fehlt.", file=sys.stderr)
        sys.exit(1)
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def resolve_archive_dir(cfg: dict) -> Path:
    raw = (cfg.get("archiveDir") or "").strip()
    if not raw:
        print("Fehler: archiveDir fehlt in backup-supabase.config.json", file=sys.stderr)
        sys.exit(1)
    path = Path(raw).expanduser()
    return path if path.is_absolute() else ROOT / path


def resolve_output_dir(cfg: dict) -> Path:
    raw = cfg.get("outputDir") or "backups/supabase"
    path = Path(raw)
    return path if path.is_absolute() else ROOT / path


def latest_successful_run_id() -> str:
    cmd = [
        "gh", "run", "list",
        "-R", REPO,
        "--workflow", WORKFLOW,
        "--status", "success",
        "--json", "databaseId",
        "-L", "1",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr or result.stdout, file=sys.stderr)
        sys.exit(result.returncode)
    runs = json.loads(result.stdout or "[]")
    if not runs:
        print("Kein erfolgreicher Backup-Run gefunden.", file=sys.stderr)
        sys.exit(1)
    return str(runs[0]["databaseId"])


def download_run(run_id: str, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    cmd = ["gh", "run", "download", run_id, "-R", REPO, "-D", str(dest)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr or result.stdout, file=sys.stderr)
        sys.exit(result.returncode)


def main() -> None:
    cfg = load_config()
    archive_dir = resolve_archive_dir(cfg)
    out_dir = resolve_output_dir(cfg)
    retain = int(cfg.get("retainCount") or 12)

    run_id = latest_successful_run_id()
    print(f"Run: {run_id}")

    with tempfile.TemporaryDirectory(prefix="kiez-backup-sync-") as tmp:
        download_run(run_id, Path(tmp))
        dumps = sorted(Path(tmp).rglob("kiezquiz-*.sql.gz"))
        if not dumps:
            print("Kein kiezquiz-*.sql.gz im Artifact.", file=sys.stderr)
            sys.exit(1)
        source = dumps[-1]

        archive_dir.mkdir(parents=True, exist_ok=True)
        out_dir.mkdir(parents=True, exist_ok=True)

        for target_dir in (archive_dir, out_dir):
            target = target_dir / source.name
            shutil.copy2(source, target)
            print(f"✓ {target}")

        for target_dir in (archive_dir, out_dir):
            archives = sorted(
                target_dir.glob("kiezquiz-*.sql.gz"),
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            )
            for old in archives[retain:]:
                old.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
