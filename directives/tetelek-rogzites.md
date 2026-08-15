# Tételek rögzítése (Muffe / Reduzir / Abzweig)

## Cél

A szerelő telefonon gyorsan felírja és módosítja:

- **Muffe** — egy DM + darabszám
- **Reduzir** — DM von → bis (pl. 315→250)
- **Abzweig** — Haupt DM + Abzweig DM

## Kapcsolódó kód

- Típusok: `src/types.ts` (`PartKind`, `PartEntry`)
- Tárolás: `src/storage.ts` (AsyncStorage `muffe-plan:v2`)
- UI: `src/screens/MuffListScreen.tsx`
- Összesítő: `src/screens/DailySummaryScreen.tsx`

## Elsődleges rajzlap-folyamat

1. A projekt megnyitása a teljes képernyős rajzlapra visz.
2. **Rajz** az alapmód; az **X módot külön aktiválni kell**.
3. X módban koppintással kerülnek le a nyitott muff-helyek.
4. Kijelöl módban az X-ek egyenként választhatók.
5. Hosszú nyomás a rajzlapon → közös típus + DM adatlap.
6. Minden kijelölt X külön 1 db PartEntry lesz; az összesítő csoportosítja.
7. Drótmérés ezen az adatlapon nincs.

## Lista UX szabályok (másodlagos nézet)

1. Gyors felírás alul: típus chip → DM chip(ek) → Stk. +/− → Hozzáad
2. Listán minden sornál **+/−** azonnali darabszám-módosítás
3. Koppintás = szerkesztő modal (típus, DM, Stk.)
4. Hosszú nyomás / modal = törlés
5. Fejléc: M / R / A bontás + összes db
6. Offline: minden helyi mentés

## Változtatásnál

1. Először olvasd el ezt az irányelvet és a fenti fájlokat.
2. Typecheck: `bash execution/typecheck.sh`
3. Ha új validációs szabályt tanulsz (pl. Reduzirnál kötelező 2. DM), írd be ide.

## Különleges esetek

- Régi `muffe-plan:v1` adatok migrálódnak muffe tételekké.
- Ugyanaz a DM többször is szerepelhet külön sorokban; az összesítő összead.
