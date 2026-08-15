# Tételek rögzítése (Muffe / Reduzir / Abzweig)

## Cél

A szerelő telefonon gyorsan felírja és módosítja:

**Schrumpf**
- **Muffe** — egy DM + darabszám
- **Reduzir** — DM von → bis (pl. 315→250)
- **Abzweig** — Haupt DM + Abzweig DM

**Hegesztett** (ha hegesztett muff kerül fel)
- **Bogenmuffe** — sima bogen, egy DM + darabszám
- **Montagemuffe** — egy DM + darabszám
- **Reduzirmuffe** — DM von → bis (pl. 315→250)
- **Endmuffe** — egy DM + darabszám
- **Montageabzweig** — Haupt DM + Abzweig DM

Nincs Montagebogen a választóban.

## Kapcsolódó kód

- Típusok: `src/types.ts` (`PartKind`, `PartEntry`)
- Tárolás: `src/storage.ts` (AsyncStorage `muffe-plan:v2`)
- UI: `src/screens/MuffListScreen.tsx`
- Összesítő: `src/screens/DailySummaryScreen.tsx`

## Elsődleges rajzlap-folyamat

1. A projekt megnyitása a teljes képernyős rajzlapra visz.
2. A rajzlap kockás; **két ujjal nagyítható és mozgatható** (kb. 0,35×–6×), a `− / ＋` gombbal is. Így nagy csőrendszer is elfér, a részlet pedig közel hozható.
   - **Mozgatás módban** egy ujjal húzható a teljes papír/rajz.
   - **Rajz módban** az egyujjas mozdulat vonalat rajzol, a papír nem csúszhat el.
3. Egy rajzmozdulat automatikusan **két párhuzamos vonalat** készít: **VL / Vorlauf** (meleg előremenő, folytonos) + **RL / Rücklauf** (visszatérő, szaggatott).
   - Elengedéskor a vonal automatikusan egyszerűsödik: a kézremegés eltűnik, a valódi sarkok tiszta töréspontok maradnak.
   - A megtartott szakaszok a legközelebbi 30°-os tervrajzi irányra igazodnak (0°, 30°, 60°, 90° stb.); a valódi ferde törést nem szabad 90°-ra kényszeríteni.
   - A VL/RL pár valódi sarokillesztést használ: a beállított távolság a sarkokban sem szűkülhet vagy tágulhat.
   - Jobbra/balra toldáskor a új vonal a meglévő VL+RL pár **középvonalába fűződik**, és a sarok miterrel újraszámolódik. Nem jön létre külön, eltolt/ferde toldás.
   - Abzweig / kereszteződés egyenes szakaszon: a merőleges ág **ott marad a száron**, ahol a szerelő rárajzolta. Nem szabad a cső végére húzni.
   - Az X-átalakító lapon a típus (Muffe / Reduzir / Abzweig) mindig látszik; a DM lista a kiválasztott mező alatt nyílik, a választott méret megmarad.
   - **Cső módban** koppintással kijelölhető egy vonalpár; a `− / +` vezérlővel 12–80 px között állítható a VL–RL távolság.
   - A vonalhoz kapcsolt X-eknek együtt kell mozogniuk a távolság állításakor.
4. **Rajz** az alapmód; az **X módot külön aktiválni kell**.
5. X módban csak rövid, legfeljebb 10 px-t mozduló koppintás rak le X-et; húzás/pinch után nem. A koppintásnak a VL/RL vonaltól legfeljebb kb. **3 mm-re (12 px)** kell lennie, különben nem kerül le X.
6. Minden még át nem alakított X automatikusan az **aktuális csoport** része; nincs külön kijelölési mód.
7. Hosszú nyomás X módban vagy a `Muff (N)` gomb → közös típus + DM adatlap.
   - Az adatlapon a **Kijelölt X mérete** sor mindig mutatja a típust + DM-et.
   - A DM választó weben natív lista; Reduzir / Reduzirmuffe: DM von + DM bis, Abzweignél Haupt DM + Abzweig DM. Mindkét szám látszik és mentődik.
   - A rajzon a Reduzir / Reduzirmuffe `315→250`, az Abzweig / Montageabzweig `315/200` feliratként jelenik meg. Hegesztett rövidítés: BM / MM / RM / EM / MA.
   - A muff a papíron **X** vagy **szám**: piros × = nyitott, zöld 1/2/3 = kész csoport.
   - Alul mindig a táblázat: `1  90 M ×6` · `2  90→110 R ×2`. Nem takarja a rajzot. Koppintás a chipre kiemeli azokat az X-eket.
8. Mentéskor az összes aktuális X külön 1 db PartEntry lesz. A később lerakott X-ek új csoportot alkotnak.
9. Drótmérés ezen az adatlapon nincs.

## Lista UX szabályok (másodlagos nézet)

1. Gyors felírás alul: típus chip → DM chip(ek) → Stk. +/− → Hozzáad
2. Listán minden sornál **+/−** azonnali darabszám-módosítás
3. Koppintás = szerkesztő modal (típus, DM, Stk.)
4. Hosszú nyomás / modal = törlés
5. Fejléc: típus-rövidítések (M / R / A / BM / MM / RM / EM / MA) + összes db — csak a nem nulla tételek
6. Offline: minden helyi mentés

## Változtatásnál

1. Először olvasd el ezt az irányelvet és a fenti fájlokat.
2. Typecheck: `bash execution/typecheck.sh`
3. Ha új validációs szabályt tanulsz (pl. Reduzirnál kötelező 2. DM), írd be ide.

## Különleges esetek

- Régi `muffe-plan:v1` adatok migrálódnak muffe tételekké.
- Ugyanaz a DM többször is szerepelhet külön sorokban; az összesítő összead.
