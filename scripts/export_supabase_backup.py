#!/usr/bin/env python3
"""
Monatlicher Supabase-Backup-Export (Free Tier ohne PITR).

Erstellt ein gzip-komprimiertes SQL-Dump der konfigurierten Schemas (Standard: public).
Ausgabe: backups/supabase/kiezquiz-YYYY-MM-DD_HHMMSS.sql.gz

Konfiguration (Priorität):
  1. Umgebungsvariable KIEZ_SUPABASE_DB_URL
  2. scripts/backup-supabase.config.json

Setup: python3 scripts/setup_supabase_backup.py
"""

from __future__ import annotations

import argparse
import gzip
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / "backup-supabase.config.json"
MANIFEST_NAME = "manifest.json"


def load_config() -> dict:
    cfg: dict = {}
    if CONFIG_PATH.exists():
        cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    env_url = os.environ.get("KIEZ_SUPABASE_DB_URL", "").strip()
    if env_url:
        cfg["databaseUrl"] = env_url
    return cfg


def resolve_output_dir(cfg: dict) -> Path:
    raw = cfg.get("outputDir") or "backups/supabase"
    path = Path(raw)
    if not path.is_absolute():
        path = ROOT / path
    return path


def find_pg_dump() -> str:
    exe = shutil.which("pg_dump")
    if exe:
        return exe
    brew_pg = Path("/opt/homebrew/opt/libpq/bin/pg_dump")
    if brew_pg.exists():
        return str(brew_pg)
    usr_pg = Path("/usr/local/opt/libpq/bin/pg_dump")
    if usr_pg.exists():
        return str(usr_pg)
    sys.exit(
        "pg_dump nicht gefunden.\n"
        "macOS: brew install libpq && brew link --force libpq\n"
        "Oder PostgreSQL.app / Postgres.app installieren."
    )


def redact_url(url: str) -> str:
    return re.sub(r":([^:@/]+)@", ":***@", url)


def run_pg_dump(database_url: str, schemas: list[str]) -> bytes:
    pg_dump = find_pg_dump()
    chunks: list[bytes] = []

    for schema in schemas:
        cmd = [
            pg_dump,
            database_url,
            "--no-owner",
            "--no-privileges",
            f"--schema={schema}",
            "--format=plain",
        ]
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0:
            err = result.stderr.decode("utf-8", errors="replace")
            print(f"pg_dump fehlgeschlagen (Schema {schema}):\n{err}", file=sys.stderr)
            sys.exit(result.returncode)
        header = f"\n-- KiezQuiz backup schema: {schema}\n".encode()
        chunks.append(header + result.stdout)

    banner = (
        f"-- KiezQuiz Supabase backup\n"
        f"-- Created: {datetime.now(timezone.utc).isoformat()}\n"
        f"-- Schemas: {', '.join(schemas)}\n\n"
    ).encode()
    return banner + b"".join(chunks)


def write_backup(out_dir: Path, sql_bytes: bytes) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M%S")
    target = out_dir / f"kiezquiz-{stamp}.sql.gz"
    with gzip.open(target, "wb", compresslevel=9) as fh:
        fh.write(sql_bytes)
    return target


def update_manifest(out_dir: Path, archive: Path, schemas: list[str]) -> None:
    entries = []
    manifest_path = out_dir / MANIFEST_NAME
    if manifest_path.exists():
        try:
            entries = json.loads(manifest_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            entries = []
    entries.append(
        {
            "file": archive.name,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "sizeBytes": archive.stat().st_size,
            "schemas": schemas,
        }
    )
    entries.sort(key=lambda e: e.get("createdAt", ""), reverse=True)
    manifest_path.write_text(json.dumps(entries, indent=2) + "\n", encoding="utf-8")


def prune_old_backups(out_dir: Path, retain: int) -> list[str]:
    archives = sorted(out_dir.glob("kiezquiz-*.sql.gz"), key=lambda p: p.stat().st_mtime, reverse=True)
    removed: list[str] = []
    for old in archives[retain:]:
        old.unlink(missing_ok=True)
        removed.append(old.name)
    return removed


def main() -> None:
    parser = argparse.ArgumentParser(description="Supabase SQL-Backup exportieren")
    parser.add_argument("--dry-run", action="store_true", help="Nur prüfen, kein Dump")
    parser.add_argument("--retain", type=int, help="Anzahl Backups behalten ( überschreibt Config )")
    args = parser.parse_args()

    cfg = load_config()
    database_url = (cfg.get("databaseUrl") or "").strip()
    if not database_url or "DEIN_DB_PASSWORT" in database_url:
        print("Fehler: Keine gültige databaseUrl.", file=sys.stderr)
        print(f"Setup: python3 scripts/setup_supabase_backup.py", file=sys.stderr)
        print("Oder: export KIEZ_SUPABASE_DB_URL='postgresql://...'", file=sys.stderr)
        sys.exit(1)

    schemas = cfg.get("schemas") or ["public"]
    if isinstance(schemas, str):
        schemas = [schemas]
    out_dir = resolve_output_dir(cfg)
    retain = args.retain if args.retain is not None else int(cfg.get("retainCount") or 12)

    print(f"Projekt:  {cfg.get('projectRef', '—')}")
    print(f"Region:   {cfg.get('region', '—')}")
    print(f"Schemas:  {', '.join(schemas)}")
    print(f"Ziel:     {out_dir}")
    print(f"DB-URL:   {redact_url(database_url)}")

    if args.dry_run:
        find_pg_dump()
        print("Dry-run OK — pg_dump gefunden, Config gültig.")
        return

    print("Export läuft …")
    sql_bytes = run_pg_dump(database_url, schemas)
    archive = write_backup(out_dir, sql_bytes)
    update_manifest(out_dir, archive, schemas)
    removed = prune_old_backups(out_dir, retain)

    size_mb = archive.stat().st_size / (1024 * 1024)
    print(f"✓ Backup: {archive} ({size_mb:.2f} MiB)")
    if removed:
        print(f"✓ Aufgeräumt ({retain} behalten): {', '.join(removed)}")
    print()
    print("Archivieren: Kopie nach iCloud/externe Festplatte/Ordner „Rechtsdokumente“.")


if __name__ == "__main__":
    main()
