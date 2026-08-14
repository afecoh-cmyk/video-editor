# Ügynök Utasítások — Muffe Plan

> [!IMPORTANT]
> **Nyelv:** Minden kommunikáció, terv, jelentés, dokumentáció és **commit üzenet magyarul** legyen.
>
> **Identitás:** Ha a felhasználó nevet ad (pl. „Mérnök”), azt használd.
>
> **Együttműködés:** Gyakorlatiasan, röviden, a bajsztelepi használatra optimalizálva.

## Mi ez a projekt?

**Muffe Plan** — letölthető / webes mobilapp a távhő **Abnahmeprotokoll** papírjegyzőkönyv kiváltására.

A szerelő telefonon gyorsan felírja és módosítja:

| Típus | Mit rögzít |
|---|---|
| **Muffe** | DM + darabszám |
| **Reduzir** | DM von → bis (pl. 315→250) |
| **Abzweig** | Haupt DM + Abzweig DM |

Cél: nap végére egyértelmű összesítés (30–40 tétel mellett is).

## Stack

- **Expo / React Native** (TypeScript)
- Helyi tárolás: AsyncStorage (`muffe-plan:v2`)
- Nincs backend az MVP-ben
- Fő kód: `src/` · képernyők: `src/screens/`

## Hogyan dolgozz

1. **Először olvasd** a releváns kódot / `docs/` / `directives/` fájlt — ne tippelj.
2. **Kis, célzott változtatás** — ne refaktorálj mellékesen.
3. **Typecheck** commit előtt: `bash execution/typecheck.sh`
4. **UX prioritás:** gyors felírás, nagy +/− gombok, kevés gépelés a terepen.
5. **Hibánál:** javíts → ellenőrizd → ha ismétlődő tanulság, frissítsd a megfelelő `directives/` fájlt (kérdezés nélkül csak bugfix / apró pontosítás; új irányelvet ne találj ki magadtól).

## Mit NE csinálj

- Ne hozd vissza a régi video-editor kódot.
- Ne építs felesleges dashboardot, kártyaerdőt, purple/glow UI-t.
- Ne tegyél titkokat a repóba (`.env` gitignore-ban van).
- Ne ígérj telepítő-linket, amíg nincs tényleges web deploy / EAS build.
- Ne töröld a muff/reduzir/abzweig +/− UX-et „szépítés” címén.

## Fontos fájlok

| Fájl | Szerep |
|---|---|
| `src/types.ts` | PartKind, PartEntry, DM lista |
| `src/storage.ts` | Offline CRUD + napi összesítő |
| `src/screens/MuffListScreen.tsx` | Gyors felírás / szerkesztés |
| `src/screens/DailySummaryScreen.tsx` | Nap végi összesítés |
| `src/screens/ProjectListScreen.tsx` | Projektlista |
| `docs/PRODUCT.md` | Termékcél |
| `docs/MVP.md` | MVP scope |
| `directives/tetelek-rogzites.md` | Tétel UX szabályok |

## Irányelvek és scriptek

Ismétlődő, determinisztikus lépések:

- `directives/` — rövid SOP-ok (mit kell tenni)
- `execution/` — scriptek (pl. typecheck)

UI-fejlesztésnél a fő munka a `src/` kód — a scriptek a ellenőrzésre / buildre valók, nem helyettesítik az appot.

## Öngyógyítás

Ha elromlik valami:

1. Olvasd el a hibát
2. Javítsd a kódot / scriptet
3. Futtasd újra a typechecket / érintett lépést
4. Ha tartós tanulság → frissítsd a `directives/` megfelelő fájlját

## Kommunikáció a felhasználóval

- Rövid, magyar, lényegre törő
- Linket csak akkor adj, ha tényleg működik
- Kérdezz, ha a terepi fogalom (muffe / reduzir / abzweig / DM) nem egyértelmű

Légy gyakorlatias. Légy megbízható. A bajsztelep a mérce.
