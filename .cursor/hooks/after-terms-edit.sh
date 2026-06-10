#!/usr/bin/env bash
# Erinnert den Agenten an den NB-Benachrichtigungsprozess nach Edits an Nutzungsbedingungen.
set -euo pipefail

input=$(cat)

# Pfad aus Hook-JSON (verschiedene Cursor-Versionen)
file_path=$(printf '%s' "$input" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
except json.JSONDecodeError:
    sys.exit(0)
for key in ('file_path', 'path', 'filePath', 'editedFile'):
    v = d.get(key)
    if isinstance(v, str) and v:
        print(v)
        break
" 2>/dev/null || true)

[[ -z "${file_path:-}" ]] && exit 0

case "$file_path" in
  *src/locales/de.json|*src/locales/en.json|*src/data/legalConfig.js)
    ;;
  *)
    exit 0
    ;;
esac

# Nur wenn NB-relevant (terms in JSON oder legalConfig terms-Block)
if [[ "$file_path" == *legalConfig.js ]]; then
  if ! printf '%s' "$input" | python3 -c "
import json, sys
d = json.load(sys.stdin)
text = json.dumps(d).lower()
sys.exit(0 if 'terms' in text else 1)
" 2>/dev/null; then
    exit 0
  fi
else
  if ! printf '%s' "$input" | python3 -c "
import json, sys
d = json.load(sys.stdin)
text = json.dumps(d).lower()
sys.exit(0 if 'legalpages.terms' in text or '\"terms\"' in text else 1)
" 2>/dev/null; then
    # Datei wurde geändert — bei locale-Files immer warnen (Abschnitt schwer zu parsen)
    :
  fi
fi

python3 -c "
import json
print(json.dumps({
    'additional_context': '''⚠️ Nutzungsbedingungen geändert — Pflichtprozess (docs/TERMS-CHANGE-PROCESS.md):

1. DE + EN synchron? terms.version + terms.effectiveDate (+30 Tage) in legalConfig.js?
2. Betreiber-Freigabe einholen — KEIN --send ohne explizite Freigabe
3. python3 scripts/notify_terms_change.py --dry-run
4. Nach Freigabe: python3 scripts/notify_terms_change.py --send --owner-approved
5. Erst danach deployen

Cursor-Regel: .cursor/rules/terms-change-notify.mdc'''
}))
"
