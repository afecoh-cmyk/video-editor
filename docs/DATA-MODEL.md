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

Egy tétel a projekten — muff, reduzir vagy abzweig.

| Mező | Típus | Megjegyzés |
|---|---|---|
| id | uuid | |
| projectId | uuid | FK → Project |
| kind | enum | `muffe` \| `reduzir` \| `abzweig` |
| diameterMm | number | Fő / von DM |
| diameterToMm | number? | Reduzir: bis · Abzweig: Abzweig DM |
| count | number | Stk. |
| testPressureBar | number? | Prüfdruck (opcionális) |
| note | string? | |
| sortOrder | number | |

### Példák

- Muffe DM 315 · 21 Stk.
- Reduzir DM 315→250 · 2 Stk.
- Abzweig DM 315 / Abz. 125 · 1 Stk.

## Tárolás (MVP)

- AsyncStorage (`muffe-plan:v2`), v1 muff adatok automatikus migrációval
