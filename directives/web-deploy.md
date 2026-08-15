# Webes build és publikálás

## Cél

Böngészőből / telefonról megnyitható **Muffe Plan**. A `main` ág a letölthető app.

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
- Nyilvános URL: GitHub Pages a `main` után

## Különleges esetek

- Privát GitHub repo Free csomagon: a Pages publikálás elhasalhat. Ekkor GitHub Pro, vagy a Pages bekapcsolása a repo Settingsben kell.
- A próba (trycloudflare) link nem tartós; a Pages-cím marad.
- AsyncStorage weben localStorage-t használ — OK próbaüzemhez.
- Mobil Expo Go / APK külön irányelv (EAS) — ez csak web.
- `_expo` mappa miatt a `dist/.nojekyll` kötelező.
