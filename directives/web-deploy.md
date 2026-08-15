# Webes build és publikálás

## Cél

Böngészőből / telefonról megnyitható **Muffe Plan** (PWA). A `main` ág a letölthető app. Telepítés: lásd `directives/telepites.md`.

## Lépések

1. Web függőségek: `npx expo install react-dom react-native-web react-native-svg @expo/metro-runtime`
2. Typecheck: `bash execution/typecheck.sh`
3. Export (dev preview, gyökérút): `bash execution/web-export.sh`
4. Export GitHub Pages-re: `WEB_BASE_PATH=/video-editor bash execution/web-export.sh`
5. A `dist/` mappa a statikus web build
6. **Tartós app:** `main`-re push után a `.github/workflows/web-deploy.yml` GitHub Pages-re teszi.
   - Cím: `https://afecoh-cmyk.github.io/video-editor/`
   - A telefon **Letöltés** gombja ezt a címet telepíti.

## Kimenet

- `dist/index.html` + JS bundle
- Nyilvános URL (ha a Pages be van kapcsolva)

## Különleges esetek

- Privát GitHub repo: Pages-t egyszer be kell kapcsolni (Settings → Pages → GitHub Actions).
- A próba (trycloudflare) link nem tartós; a Pages-cím marad.
- AsyncStorage weben localStorage — az adat a telefonon / böngészőben marad, nem a GitHubon.
- Mobil Expo Go / EAS APK külön irányelv — ez csak web PWA.
- `_expo` mappa miatt a `dist/.nojekyll` kötelező.
