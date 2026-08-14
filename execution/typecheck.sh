#!/usr/bin/env bash
# TypeScript ellenőrzés — Muffe Plan
# Használat: bash execution/typecheck.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -d node_modules ]]; then
  echo "node_modules hiányzik — npm install..."
  npm install
fi

echo "▶ npx tsc --noEmit"
npx tsc --noEmit
echo "✔ Typecheck OK"
