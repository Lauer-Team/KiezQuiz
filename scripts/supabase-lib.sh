#!/usr/bin/env bash
# Shared helpers for Supabase CLI scripts (auth + binary path).
set -euo pipefail

_supabase_root() {
  cd "$(dirname "${BASH_SOURCE[1]}")/.." && pwd
}

supabase_load_env() {
  local root="$1"
  if [[ -f "$root/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$root/.env"
    set +a
  fi
}

supabase_resolve_bin() {
  if [[ -n "${SUPABASE_BIN:-}" ]]; then
    echo "$SUPABASE_BIN"
    return 0
  fi
  if command -v supabase >/dev/null 2>&1; then
    command -v supabase
    return 0
  fi
  if [[ -x "$HOME/.local/bin/supabase" ]]; then
    echo "$HOME/.local/bin/supabase"
    return 0
  fi
  return 1
}

supabase_require_bin() {
  local bin
  if ! bin="$(supabase_resolve_bin)"; then
    echo "Supabase CLI fehlt. Install: ./scripts/install-supabase-cli.sh"
    exit 1
  fi
  echo "$bin"
}

supabase_has_access_token() {
  local bin="$1"
  if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    return 0
  fi
  if [[ -f "$HOME/.supabase/access-token" ]]; then
    return 0
  fi
  # Probe management API (works when token is in OS keyring)
  if "$bin" projects list >/dev/null 2>&1; then
    # Keyring token may work for some commands but not migration — still prefer explicit token
    if "$bin" migration list --linked >/dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

supabase_print_auth_help() {
  cat <<'EOF'
Supabase Access Token fehlt (typisch auf VPS ohne Desktop-Keyring).

Einmalig — Personal Access Token aus dem Dashboard:

  1. https://supabase.com/dashboard/account/tokens → „Generate new token“
  2. Token kopieren (beginnt mit sbp_)

Dann EINE Option:

  A) In Shell (Session):
     export SUPABASE_ACCESS_TOKEN=sbp_...

  B) Dauerhaft in .env (gitignored):
     cp .env.supabase.example .env
     # SUPABASE_ACCESS_TOKEN + SUPABASE_DB_PASSWORD eintragen

  C) CLI speichern:
     supabase login --token sbp_...

Optional DB-Passwort (für db push / repair --linked):
  export SUPABASE_DB_PASSWORD=...

Danach erneut ausführen.
EOF
}

supabase_require_auth() {
  local bin="$1"
  if supabase_has_access_token "$bin"; then
    return 0
  fi
  supabase_print_auth_help
  exit 1
}
