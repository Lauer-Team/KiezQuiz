#!/usr/bin/env bash
# Install Supabase CLI on Linux/macOS without npm.
# Puts binary in ~/.local/bin (add to PATH if needed).
set -euo pipefail

INSTALL_DIR="${SUPABASE_INSTALL_DIR:-$HOME/.local/bin}"
mkdir -p "$INSTALL_DIR"

echo "→ Supabase CLI nach $INSTALL_DIR"
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install | bash -s -- --install-dir "$INSTALL_DIR"

if ! echo ":$PATH:" | grep -q ":$INSTALL_DIR:"; then
  echo ""
  echo "Hinweis: $INSTALL_DIR ist nicht in PATH."
  echo "Einmalig in ~/.bashrc ergänzen:"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo "Dann: source ~/.bashrc"
fi

"$INSTALL_DIR/supabase" --version
echo "✓ Fertig."
