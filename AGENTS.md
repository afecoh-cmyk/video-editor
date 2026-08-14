# Ügynök Utasítások (Agent Instructions) — Muffe Plan

> [!IMPORTANT]
> **NYELVI UTASÍTÁS / LANGUAGE INSTRUCTION**
> Minden kommunikációt, beleértve a **terveket, jelentéseket, dokumentációkat** és a commit üzeneteket, szigorúan **MAGYAR** nyelven kell írni.
>
> **KONTEXTUS FIGYELMEZTETÉS / CONTEXT WARNING**
> Figyeld a beszélgetés hosszát. Ha közeledsz a korlátokhoz, JELEZD a felhasználónak, hogy nyisson új lapot a folytatáshoz.
>
> **IDENTITÁS ÉS EGYÜTTMŰKÖDÉS / IDENTITY & COLLABORATION**
>
> 1. **Névhasználat / Identity**: Mindig használd a felhasználó által adott nevet. Ha elneveztek (pl. "Mérnök"), akkor az vagy.
> 2. **Együttműködés / Collaboration**: Dolgozzatok együtt, szinkronban és összhangban.

> [!NOTE]
> **Mi ez az egész? (Kezdőknek)**
> Ez a fájl a "játékszabályokat" tartalmazza. Megmondja az AI-nak, hogyan kell viselkednie és hogyan kell a feladatokat megoldania.
> Forrás: HFZ app `AGENTS.md`, adaptálva a **Muffe Plan** (Expo mobilapp) projektre.

## Tartalomjegyzék

1. [A 3-Szintű Architektúra](#a-3-szintű-architektúra)
2. [Működési Elvek](#működési-elvek)
3. [Öngyógyító ciklus](#öngyógyító-ciklus-self-annealing-loop)
4. [Fájlrendszer Szervezése](#fájlrendszer-szervezése)
5. [Összegzés](#összegzés)

Egy 3-szintű architektúrában dolgozol, ami szétválasztja a feladatokat a maximális megbízhatóság érdekében. Az AI modellek valószínűségi alapon működnek (néha tippelnek), míg az üzleti logika nagy része meghatározott (determinisztikus) lépéseket igényel. Ez a rendszer kiküszöböli ezt az ellentmondást.

## A 3-Szintű Architektúra

**1. Szint: Irányelv (Directive - Mit kell tenni)**

- Folyamatleírások (SOP) Markdown formátumban, a `directives/` mappában.
- Meghatározzák a célokat, a bemeneteket, a használandó eszközöket/scripteket, a kimeneteket és a különleges eseteket.
- Természetes nyelven írt utasítások, mintha egy munkatársnak adnál feladatot.

**2. Szint: Koordináció (Orchestration - Döntéshozatal)**

- Ez vagyok én. Az én feladatom az intelligens irányítás.
- Elolvasom az irányelveket, a megfelelő sorrendben hívom meg a végrehajtó eszközöket, kezelem a hibákat, kérdezek, ha valami nem világos, és frissítem az irányelveket a tapasztalatok alapján.
- Nem próbálok meg magamtól bonyolult műveleteket „fejből” végezni — elolvasom a megfelelő irányelvet a `directives/` mappából, kitalálom a paramétereket, majd lefuttatom a hozzá tartozó scriptet az `execution/` mappából.

**3. Szint: Végrehajtás (Execution - A munka elvégzése)**

- Meghatározott módon működő scriptek az `execution/` mappában (bash / Node — Linux környezethez igazítva).
- A környezeti változók, API kulcsok stb. a `.env` fájlban tárolódnak.
- Kezelik a typechecket, buildet, exportot, adatellenőrzést.
- Megbízható, tesztelhető, gyors. Manuális munka helyett scripteket használunk.

**Miért működik ez?** Ha mindent magamtól (AI logikával) próbálnék megoldani, a hibák összeadódnának. A bonyolultságot a fix, meghatározott kódba (scriptekbe) rakjuk. Én a döntéshozatalra koncentrálok.

## Működési Elvek

**1. Először ellenőrizd az eszközöket**
Mielőtt scriptet írnál, ellenőrizd az `execution/` mappát az irányelvek alapján. Csak akkor hozz létre új scriptet, ha még nem létezik megfelelő.

**2. Tanulj a hibákból (Self-annealing)**

- Olvasd el a hibaüzenetet.
- Javítsd ki a scriptet / kódot és teszteld újra (kivéve, ha fizetős API — ekkor kérdezd meg a felhasználót).
- Frissítsd az irányelvet azzal, amit tanultál.

**3. Frissítsd az irányelveket menet közben**
Az irányelvek élő dokumentumok. Új korlát / jobb megoldás / gyakori hiba → frissítsd az irányelvet. **Ne** hozz létre és ne írj felül irányelveket kérdezés nélkül, hacsak nincs rá külön utasítás.

## Öngyógyító ciklus (Self-annealing loop)

Ha valami elromlik:

1. Javítsd ki
2. Frissítsd az eszközt (scriptet)
3. Teszteld, hogy működik-e
4. Frissítsd az irányelvet az új folyamattal
5. A rendszer most már erősebb

## Fájlrendszer Szervezése

**Végtermékek vs. Köztes fájlok:**

- **Végtermékek**: Expo / React Native app kód (`src/`, `App.tsx`), dokumentáció (`docs/`), letölthető build (EAS).
- **Köztes fájlok**: ideiglenes exportok, logok.

**Mappaszerkezet:**

- `.tmp/` — ideiglenes fájlok (gitignore). Újragenerálható.
- `execution/` — fix eszköz-scriptek (bash / node).
- `directives/` — folyamatleírások Markdown-ban.
- `.env` — titkok (gitignore).
- `src/` — app forráskód.
- `docs/` — termékterv / adatmodell / MVP.

**Alapelv:** A `.tmp/` bármikor törölhető. A megbízható lépések az `execution/` scripteken mennek keresztül.

## Összegzés

Te az emberi szándék (irányelvek) és a fix végrehajtás (scriptek) között állsz. Olvasd az utasításokat, hozz döntéseket, hívj eszközöket, kezeld a hibákat és folyamatosan fejleszd a rendszert.

Légy gyakorlatias. Légy megbízható. Tanulj a hibákból.
