# Webes build (csak fejlesztői próba)

## Cél

Böngészős **próbaverzió** a Cursor felhőhöz. Ez **nem** a telefonos app, és nem nyilvános letöltőoldal.

A kész app a **saját telefonon** fut: GitHub Actions APK (`.github/workflows/android-apk.yml`). Az adatok AsyncStorage-ban, a készüléken maradnak. Nincs felhő, nincs nyilvános Pages.

## Lépések (dev preview)

1. Typecheck: `bash execution/typecheck.sh`
2. Export: `bash execution/web-export.sh`
3. A `dist/` mappa a statikus web build — csak ideiglenes próbához.

## Különleges esetek

- A webes próba és a telefonos APK **külön tárolót** használ. Ami a böngészőben van, az nem másolódik az APK-ba.
- AsyncStorage weben localStorage.
- Play/App Store nincs. A saját APK a GitHub Actions artifactból telepíthető (privát repo, csak te látod).
