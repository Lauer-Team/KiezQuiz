#!/usr/bin/env bash
# One-time: mark baseline migrations as applied on an DB that was set up manually
# (SQL Editor) before supabase/migrations/ existed.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/supabase-lib.sh"
supabase_load_env "$ROOT"

SUPABASE_BIN="$(supabase_require_bin)"
supabase_require_auth "$SUPABASE_BIN"

BASELINE_VERSIONS=(
  20250101000001
  20250102000001
  20250103000001
  20250601000001
  20250602000001
  20250603000001
  20250610000001
  20250619000001
)

echo "Markiert ${#BASELINE_VERSIONS[@]} Migrationen als 'applied' auf der verlinkten Remote-DB."
echo "Nur ausführen, wenn das Schema dort schon manuell existiert!"
echo ""
read -r -p "Fortfahren? [y/N] " confirm
if [[ "${confirm,,}" != "y" ]]; then
  echo "Abgebrochen."
  exit 0
fi

for version in "${BASELINE_VERSIONS[@]}"; do
  echo "→ repair $version"
  "$SUPABASE_BIN" migration repair --status applied "$version" --linked
done

echo ""
echo "✓ Baseline gesetzt. Prüfen: $SUPABASE_BIN migration list --linked"
