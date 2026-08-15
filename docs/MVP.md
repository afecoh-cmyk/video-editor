# Muffe Plan — MVP

## Cél

Letölthető mobilapp, amivel a szerelő **nap végére** egyértelműen látja, mennyi muff ment el — akár **30–40 különböző tétel** mellett is.

## Belekerül (MVP)

1. **Projektlista** — mai / korábbi projektek
2. **Új projekt** — Betreiber, Verlegefirma, Baustellenort, dátum
3. **Muff lista a projekten**
   - Hozzáadás: DM + Stk. (+ opcionális Prüfdruck)
   - Szerkesztés / törlés
   - Előre definiált DM-ek: 90, 110, 125, 160, 200, 250, 315… + egyedi DM
4. **Futó összeg** a muff képernyőn (összes Stk.)
5. **Napi összesítő** — DM szerinti csoportosítás, összes projekt mára
6. **Offline** helyi mentés

## Nem kerül bele az első körben

- **Drót mérés** (ellenállás / hurok) — samponozás előtt–után, Vorlauf/Rücklauf; rendszer: **NOR** vs **Brand/BRANDES** (lásd `docs/PRODUCT.md` §4)
- Skicc / rajzolás
- Digitális aláírás
- PDF BRUGG-layout
- Fiók / felhő szinkron
- Többnyelvű UI (először német mezőnevekkel, magyar segédszövegekkel OK)

> Az MVP lényege marad: nap közben muff/reduzir/abzweig felírás +/−-szal, nap végén „ennyi volt”. A drót mérés **ráépül** erre (tudni kell, hány kötés van a szakaszon), de külön funkció.

## Technikai irány (döntés)

- **Expo (React Native)** — iOS + Android, gyors iteráció, letölthető build (EAS)
- Helyi DB: SQLite (expo-sqlite) vagy hasonló
- Nincs backend az MVP-ben

## Képernyők (MVP)

1. Projektlista  
2. Projekt szerkesztő (fejléc)  
3. Muff lista + gyors hozzáadás  
4. Napi összesítő  

## Következő lépés a fejlesztésben

~~Expo projekt scaffold → navigáció → Project + MuffEntry CRUD → napi összesítő UI.~~ **Kész (MVP kód a repo gyökerében).**

Tovább: Expo Go próba a telefonon, majd EAS build (letölthető APK/IPA), később PDF / aláírás / skicc.
