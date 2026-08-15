#!/usr/bin/env bash
# Expo web statikus export — Muffe Plan
# Használat: bash execution/web-export.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -d node_modules ]]; then
  echo "node_modules hiányzik — npm install..."
  npm install
fi

echo "▶ npx expo export --platform web --output-dir dist"
npx expo export --platform web --output-dir dist
cp -f public/manifest.webmanifest public/sw.js public/pwa-192.png public/pwa-512.png public/apple-touch-icon.png dist/
python3 execution/inject-pwa.py
echo "✔ Export kész: dist/"
