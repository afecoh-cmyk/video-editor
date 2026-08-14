# Webes build és publikálás

## Cél

Böngészőből / telefonról megnyitható **próbaverzió** a Muffe Planhez.

## Lépések

1. Web függőségek: `npx expo install react-dom react-native-web react-native-svg @expo/metro-runtime`
2. Typecheck: `bash execution/typecheck.sh`
3. Export: `bash execution/web-export.sh`
4. A `dist/` mappa a statikus web build
5. Publikálás: tartós nyilvános host kell (GitHub Pages / Surge / Netlify / Vercel). A cloud agent VM localhostja **nem** ad tartós linket a felhasználó telefonjának.

## Kimenet

- `dist/index.html` + JS bundle
- Nyilvános URL (ha a host sikeres)

## Különleges esetek

- Privát GitHub repo: Pages nyilvános elérése korlátozott lehet.
- AsyncStorage weben localStorage-t használ — OK próbaüzemhez.
- Mobil Expo Go / APK külön irányelv (EAS) — ez csak web.
