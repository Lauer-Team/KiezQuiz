#!/usr/bin/env bash
# One-time: remote-only migration versions (applied outside git) block `db push`.
# Marks them reverted in supabase_migrations.schema_migrations only — does NOT undo SQL.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/supabase-lib.sh"
supabase_load_env "$ROOT"

SUPABASE_BIN="$(supabase_require_bin)"
supabase_require_auth "$SUPABASE_BIN"

# Orphans on live DB (2026-05/06), not in supabase/migrations/ — see docs/SUPABASE-MIGRATIONS.md
ORPHAN_VERSIONS=(
  20260531152137
  20260531152150
  20260531153926
  20260531174600
  20260601172605
  20260602211401
  20260610192408
  20260610192433
)

echo "Markiert ${#ORPHAN_VERSIONS[@]} Remote-only-Migrationen als 'reverted' (History-Eintrag nur)."
echo "Das Schema auf Supabase bleibt unverändert."
echo ""
read -r -p "Fortfahren? [y/N] " confirm
if [[ "${confirm,,}" != "y" ]]; then
  echo "Abgebrochen."
  exit 0
fi

"$SUPABASE_BIN" migration repair --status reverted "${ORPHAN_VERSIONS[@]}" --linked

echo ""
echo "✓ History bereinigt. Als Nächstes:"
echo "  ./scripts/supabase-db-push.sh"
