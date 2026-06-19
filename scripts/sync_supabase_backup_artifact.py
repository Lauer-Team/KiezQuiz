#!/usr/bin/env python3
"""Neuestes Supabase-Backup aus GitHub Actions laden und lokal ablegen."""

from __future__ import annotations

import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
CONFIG_PATH = SCRIPT_DIR / "backup-supabase.config.json"
REPO = "Lauer-Team/KiezQuiz"
WORKFLOW = "supabase-backup.yml"
API = "https://api.github.com"


class _RedirectNoAuth(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ARG002
        return urllib.request.Request(newurl, headers={"User-Agent": "KiezQuiz-backup-sync"})


_OPENER = urllib.request.build_opener(_RedirectNoAuth)


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        print(f"Fehler: {CONFIG_PATH} fehlt.", file=sys.stderr)
        print("VPS: cp scripts/backup-supabase.config.vps.example.json scripts/backup-supabase.config.json", file=sys.stderr)
        sys.exit(1)
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def resolve_archive_dir(cfg: dict) -> Path | None:
    raw = (cfg.get("archiveDir") or "").strip()
    if not raw:
        return None
    path = Path(raw).expanduser()
    return path if path.is_absolute() else ROOT / path


def resolve_output_dir(cfg: dict) -> Path:
    raw = cfg.get("outputDir") or "backups/supabase"
    path = Path(raw)
    return path if path.is_absolute() else ROOT / path


def github_token() -> str:
    for key in ("GITHUB_TOKEN", "GH_TOKEN", "GITHUB_PAT"):
        val = os.environ.get(key, "").strip()
        if val:
            return val
    return ""


def api_request(path: str, *, accept: str = "application/vnd.github+json") -> bytes:
    token = github_token()
    if not token:
        print("Fehler: GITHUB_TOKEN/GH_TOKEN fehlt (Server/.env oder gh auth).", file=sys.stderr)
        sys.exit(1)
    req = urllib.request.Request(
        f"{API}{path}",
        headers={
            "Accept": accept,
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "KiezQuiz-backup-sync",
        },
    )
    try:
        with _OPENER.open(req, timeout=120) as resp:
            return resp.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"GitHub API {exc.code}: {detail[:500]}", file=sys.stderr)
        sys.exit(exc.code if exc.code else 1)


def latest_successful_run_id_api() -> str:
    owner, repo = REPO.split("/", 1)
    wf = json.loads(api_request(f"/repos/{owner}/{repo}/actions/workflows/{WORKFLOW}"))
    wf_id = wf["id"]
    data = json.loads(
        api_request(
            f"/repos/{owner}/{repo}/actions/workflows/{wf_id}/runs?status=success&per_page=1"
        )
    )
    runs = data.get("workflow_runs") or []
    if not runs:
        print("Kein erfolgreicher Backup-Run gefunden.", file=sys.stderr)
        sys.exit(1)
    return str(runs[0]["id"])


def download_run_api(run_id: str, dest: Path) -> None:
    owner, repo = REPO.split("/", 1)
    arts = json.loads(api_request(f"/repos/{owner}/{repo}/actions/runs/{run_id}/artifacts"))
    items = arts.get("artifacts") or []
    if not items:
        print(f"Kein Artifact für Run {run_id}.", file=sys.stderr)
        sys.exit(1)
    art_id = items[0]["id"]
    token = github_token()
    req = urllib.request.Request(
        f"{API}/repos/{owner}/{repo}/actions/artifacts/{art_id}/zip",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "KiezQuiz-backup-sync",
        },
    )
    try:
        with _OPENER.open(req, timeout=120) as resp:
            blob = resp.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"Artifact-Download {exc.code}: {detail[:500]}", file=sys.stderr)
        sys.exit(exc.code if exc.code else 1)
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(blob)) as zf:
        zf.extractall(dest)


def latest_successful_run_id_gh() -> str:
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


def download_run_gh(run_id: str, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    cmd = ["gh", "run", "download", run_id, "-R", REPO, "-D", str(dest)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(result.stderr or result.stdout, file=sys.stderr)
        sys.exit(result.returncode)


def fetch_latest_backup(dest: Path) -> None:
    if shutil.which("gh") and not github_token():
        run_id = latest_successful_run_id_gh()
        print(f"Run (gh): {run_id}")
        download_run_gh(run_id, dest)
        return
    run_id = latest_successful_run_id_api()
    print(f"Run (API): {run_id}")
    download_run_api(run_id, dest)


def prune_old(target_dir: Path, retain: int) -> None:
    archives = sorted(
        target_dir.glob("kiezquiz-*.sql.gz"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for old in archives[retain:]:
        old.unlink(missing_ok=True)


def main() -> None:
    cfg = load_config()
    archive_dir = resolve_archive_dir(cfg)
    out_dir = resolve_output_dir(cfg)
    retain = int(cfg.get("retainCount") or 12)

    with tempfile.TemporaryDirectory(prefix="kiez-backup-sync-") as tmp:
        fetch_latest_backup(Path(tmp))
        dumps = sorted(Path(tmp).rglob("kiezquiz-*.sql.gz"))
        if not dumps:
            print("Kein kiezquiz-*.sql.gz im Artifact.", file=sys.stderr)
            sys.exit(1)
        source = dumps[-1]

        targets = [out_dir]
        if archive_dir:
            targets.append(archive_dir)

        for target_dir in targets:
            target_dir.mkdir(parents=True, exist_ok=True)
            target = target_dir / source.name
            shutil.copy2(source, target)
            print(f"✓ {target}")
            prune_old(target_dir, retain)


if __name__ == "__main__":
    main()
