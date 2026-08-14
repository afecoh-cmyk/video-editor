# Fejlesztői indítás (Expo)

## Cél

Az app helyi futtatása Expo-val (telefon Expo Go / szimulátor).

## Bemenet

- Telepített Node / npm
- `package.json` scriptjei

## Lépések

1. `npm install` (ha kell)
2. `bash execution/typecheck.sh` — legyen zöld
3. `npx expo start` — QR kód / Expo Go
4. Telefonon ellenőrizd: projekt létrehozás → tétel felírás (Muffe/Reduzir/Abzweig) → +/− → napi összesítő

## Kimenet

- Futó Metro bundler
- Telefonon működő MVP

## Különleges esetek

- Web függőségek hiányozhatnak — mobil a cél, web nem kötelező.
- EAS / APK build külön irányelv (még nincs).
