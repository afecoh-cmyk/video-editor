#!/usr/bin/env bash
# Expo web statikus export — Muffe Plan
# Használat: bash execution/web-export.sh
# GitHub Pages almappához: WEB_BASE_PATH=/video-editor bash execution/web-export.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -d node_modules ]]; then
  echo "node_modules hiányzik — npm install..."
  npm install
fi

WEB_BASE_PATH="${WEB_BASE_PATH:-}"
export WEB_BASE_PATH
export EXPO_PUBLIC_WEB_BASE_PATH="${WEB_BASE_PATH}"

echo "▶ npx expo export --platform web --output-dir dist"
npx expo export --platform web --output-dir dist
cp -f public/manifest.webmanifest public/sw.js public/pwa-192.png public/pwa-512.png public/apple-touch-icon.png dist/
python3 execution/inject-pwa.py
cp -f dist/index.html dist/404.html
touch dist/.nojekyll
echo "✔ Export kész: dist/"
