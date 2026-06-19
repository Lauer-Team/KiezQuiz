#!/usr/bin/env bash
# Apply pending Supabase migrations to the linked remote project.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/supabase-lib.sh"
supabase_load_env "$ROOT"

SUPABASE_BIN="$(supabase_require_bin)"
supabase_require_auth "$SUPABASE_BIN"

if [[ ! -d supabase/migrations ]] || [[ -z "$(ls -A supabase/migrations/*.sql 2>/dev/null)" ]]; then
  echo "Keine Migrationen in supabase/migrations/"
  exit 1
fi

echo "→ Pending migrations (remote):"
"$SUPABASE_BIN" migration list --linked 2>/dev/null || true
echo ""
echo "→ supabase db push --linked"
"$SUPABASE_BIN" db push --linked
echo "✓ Fertig."
