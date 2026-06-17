#!/usr/bin/env bash
# Ein Repo: inbox/ → Zielordner (ZIEL.txt), commit, push, optional VPS pull.
# Aufruf: REPO_ROOT=/pfad/zum/repo bash projects-inbox-here.sh [default-ziel]
# Im Repo: bash scripts/inbox-sync-here.sh
set -euo pipefail

DEFAULT_TARGET="${1:-docs}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${REPO_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
INBOX="$REPO_ROOT/inbox"
LOG="${INBOX_LOG:-${HOME}/Library/Logs/projects-inbox.log}"
LOCKDIR="${TMPDIR:-/tmp}/projects-inbox-here-$(echo "$REPO_ROOT" | shasum | cut -c1-8).lock.d"

SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_hetzner}"
SERVER="${SERVER_USER:-jjl}@${SERVER_HOST:-138.199.159.170}"
REMOTE_BASE="/home/jjl/projects"
SKIP_VPS="${SKIP_VPS:-0}"
SKIP_PUSH="${SKIP_PUSH:-0}"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') [$(basename "$REPO_ROOT")] $*" >>"$LOG"
}

skip_name() {
  case "$1" in
    .DS_Store | .gitkeep | ZIEL.txt | SO-LEGST-DU-ES-AB.txt | README.txt) return 0 ;;
    .*) return 0 ;;
    *) return 1 ;;
  esac
}

read_target() {
  local ziel_file="$INBOX/ZIEL.txt"
  if [[ -f "$ziel_file" ]]; then
    local line
    line="$(grep -v '^#' "$ziel_file" | grep -v '^[[:space:]]*$' | head -1 | tr -d '\r')"
    if [[ -n "$line" ]]; then
      echo "$line"
      return
    fi
  fi
  echo "$DEFAULT_TARGET"
}

unique_dest() {
  local dir="$1" name="$2"
  local dest="$dir/$name"
  if [[ ! -e "$dest" ]]; then
    echo "$dest"
    return
  fi
  local base="${name%.*}" ext="${name##*.}"
  if [[ "$base" == "$name" ]]; then
    echo "$dir/${name}-$(date +%Y%m%d-%H%M%S)"
  else
    echo "$dir/${base}-$(date +%Y%m%d-%H%M%S).${ext}"
  fi
}

[[ -d "$REPO_ROOT/.git" ]] || exit 0
[[ -d "$INBOX" ]] || exit 0

if ! mkdir "$LOCKDIR" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$LOCKDIR" 2>/dev/null || true' EXIT

target_rel="$(read_target)"
target_dir="$REPO_ROOT/$target_rel"
mkdir -p "$target_dir"

shopt -s nullglob
incoming=("$INBOX"/*)
moved=()

for path in "${incoming[@]}"; do
  name="$(basename "$path")"
  skip_name "$name" && continue

  if [[ -f "$path" ]]; then
    dest="$(unique_dest "$target_dir" "$name")"
    mv "$path" "$dest"
    moved+=("$(basename "$dest")")
  elif [[ -d "$path" ]]; then
    dest="$(unique_dest "$target_dir" "$name")"
    mv "$path" "$dest"
    find "$dest" -name .DS_Store -delete 2>/dev/null || true
    moved+=("$(basename "$dest")/")
  fi
done

(( ${#moved[@]} == 0 )) && exit 0

log "→ ${target_rel}/: ${moved[*]}"

cd "$REPO_ROOT"
git add -- "$target_rel" inbox/

if git diff --cached --quiet; then
  log "nichts zu committen."
  exit 0
fi

git commit -m "$(cat <<EOF
Inbox: ${moved[*]} nach ${target_rel}/ übernommen.
EOF
)"

if [[ "$SKIP_PUSH" == "1" ]]; then
  log "SKIP_PUSH gesetzt — kein push."
  exit 0
fi

git push origin HEAD
log "git push OK."

if [[ "$SKIP_VPS" == "1" ]]; then
  exit 0
fi

proj="$(basename "$REPO_ROOT")"
if ssh -i "$SSH_KEY" -o ConnectTimeout=15 -o BatchMode=yes "$SERVER" \
  "test -d $REMOTE_BASE/$proj/.git" 2>/dev/null; then
  branch="$(git rev-parse --abbrev-ref HEAD)"
  if ssh -i "$SSH_KEY" -o ConnectTimeout=15 -o BatchMode=yes "$SERVER" \
    "git -C $REMOTE_BASE/$proj pull --ff-only origin $branch"; then
    log "VPS pull OK."
  else
    log "WARN: VPS pull fehlgeschlagen."
  fi
fi

log "Fertig."
