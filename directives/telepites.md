# Telepítés — PWA, nem APK

## Cél

A Muffe Plan a **telefon kezdőképernyőjére** kerül, webes alkalmazásként (PWA). Az adatok **csak azon a telefonon** maradnak (AsyncStorage / localStorage). Nincs felhő, nincs fiók.

## Így kell

1. Adj egy működő **webes linket** (dev: trycloudflare preview; tartós: GitHub Pages a `main` után).
2. A szerelő megnyitja a linket a telefon böngészőjében.
3. Jobb felül **Letöltés** → Telepítés a telefonra / Főképernyőhöz adás.
4. Utána ikonról nyílik, offline is megy. A projektek a készüléken vannak.

## Tilos (tanulság)

- **Ne** GitHub Actions APK-t / zipet adj telepítőnek. Az artifact mindig zip, a debug APK hatalmas, a telefonon nem ez a terv.
- **Ne** ígérj Play/App Store-t. EAS APK külön irányelv, még nincs.
- **Ne** cseréld le a PWA Letöltés gombot natív telepítőre.

## Különleges esetek

- iPhone: Megosztás → Főképernyőhöz adás.
- Android Chrome: Letöltés gomb vagy menü → Alkalmazás telepítése.
- A webes próba és egy későbbi EAS APK külön tároló lenne — ezért az MVP a PWA.
