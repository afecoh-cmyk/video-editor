# Muffe Plan — adatmodell (vázlat)

## Entity: Project

Egy bajsztelep / egy átvételi jegyzőkönyv.

| Mező | Típus | Megjegyzés |
|---|---|---|
| id | uuid | |
| betreiber | string | Üzemeltető |
| verlegefirma | string | Fektető cég |
| baustellenort | string | Cím / helyszín |
| date | date | Jegyzőkönyv dátuma |
| remarks | string? | Bemerkungen |
| status | enum | `draft` \| `closed` |

## Entity: PartEntry

Egy tétel a projekten — Schrumpf (muffe / reduzir / abzweig) vagy hegesztett (bogenmuffe / montagemuffe / reduzirmuffe / endmuffe / montageabzweig).

| Mező | Típus | Megjegyzés |
|---|---|---|
| id | uuid | |
| projectId | uuid | FK → Project |
| kind | enum | `muffe` \| `reduzir` \| `abzweig` \| `bogenmuffe` \| `montagemuffe` \| `reduzirmuffe` \| `endmuffe` \| `montageabzweig` |
| diameterMm | number | Fő / von DM |
| diameterToMm | number? | Reduzir / Reduzirmuffe: bis · Abzweig / Montageabzweig: Abzweig DM |
| count | number | Stk. |
| testPressureBar | number? | Prüfdruck (opcionális) |
| note | string? | |
| sortOrder | number | |

### Példák

- Muffe DM 315 · 21 Stk.
- Reduzir DM 315→250 · 2 Stk.
- Abzweig DM 315 / Abz. 125 · 1 Stk.
- Bogenmuffe DM 200 · 2 Stk. (hegesztett, sima bogen)
- Montagemuffe DM 250 · 3 Stk.
- Reduzirmuffe DM 315→250 · 1 Stk.
- Endmuffe DM 160 · 1 Stk.
- Montageabzweig DM 315 / Abz. 125 · 1 Stk.

## Entity: WireCheck (későbbi — nem MVP)

Egy szakasz drót / ellenállás mérése (elejétől végéig, az összes muffon át).

| Mező | Típus | Megjegyzés |
|---|---|---|
| id | uuid | |
| projectId | uuid | FK → Project |
| system | enum | `nor` \| `brandes` |
| phase | enum | `before_foam` \| `after_foam` (samponozás előtt / után) |
| circuit | enum | `vorlauf` \| `ruecklauf` |
| valueOhm | number? | Mért érték (ha van) |
| ok | boolean? | Szerelő ítélete: jó / nem jó |
| note | string? | Hol gyanús, mi történt |
| measuredAt | datetime | |

A Project később kaphat `wireSystem` mezőt (`nor` \| `brandes`), hogy a szakasz alapértelmezett rendszere meglegyen.

## Entity: CanvasAnnotation

A rajzon szabadon elhelyezhető és mozgatható terepi jel.

| Mező | Típus | Megjegyzés |
|---|---|---|
| id | uuid | |
| projectId | uuid | FK → Project |
| kind | enum | `dose` \| `daemmpolster` |
| x, y | number | Relatív rajzkoordináta |
| quantity | 1 \| 2 | Dämmpolster jelölése: `1/40` vagy `2/40`; Dose esetén 1 |

A Dämmpolster laminált anyag: 1 m hosszú, 40 mm széles.

## Tárolás (MVP)

- AsyncStorage (`muffe-plan:v2`), v1 muff adatok automatikus migrációval
