#!/usr/bin/env bash
# Rejects hardcoded `duration-Xms` Tailwind utilities and `transition-duration: Xms` outside globals.css.
# Reason: motion tokens live in app/globals.css; everything else must consume them.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXIT=0

echo "Scanning for hardcoded duration values..."

if grep -rEn --include="*.tsx" --include="*.ts" --include="*.css" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=__tests__ \
  --exclude="globals.css" \
  '(\bduration-\[[0-9]+ms\]|\btransition-duration:\s*[0-9]+ms)' \
  "$ROOT" 2>/dev/null; then
  echo ""
  echo "❌ Hardcoded durations found. Use tokens instead:"
  echo "   duration-(--duration-base) | duration-(--duration-fast) | etc."
  EXIT=1
else
  echo "✓ No hardcoded durations."
fi

exit $EXIT
