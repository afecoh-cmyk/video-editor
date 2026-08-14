# Muffe Plan — adatmodell (vázlat)

## Entity: Project

Egy bajsztelep / egy átvételi jegyzőkönyv.

| Mező | Típus | Megjegyzés |
|---|---|---|
| id | uuid | |
| betreiber | string | Üzemeltető |
| verlegefirma | string | Fektető cég |
| baustellenort | string | Cím / helyszín |
| measurementType | enum? | `ohmmeter` \| `mh3` \| null |
| date | date | Jegyzőkönyv dátuma |
| remarks | string? | Bemerkungen |
| status | enum | `draft` \| `closed` |
| createdAt | datetime | |
| updatedAt | datetime | |

## Entity: MuffEntry

Egy sor a Druckprobenprotokollban — egy átmérőhöz tartozó muff-tétel.

| Mező | Típus | Megjegyzés |
|---|---|---|
| id | uuid | |
| projectId | uuid | FK → Project |
| diameterMm | number | Mantelrohr DM (pl. 315) |
| muffCount | number | Schrumpfmuffen Stk. |
| fittingsCount | number? | Bögen / Formstücke (opcionális) |
| testPressureBar | number? | Prüfdruck |
| note | string? | |
| sortOrder | number | Lista sorrend |
| createdAt | datetime | |

**Szabály:** egy projekten belül több sor lehet ugyanazzal a DM-mel (külön szakaszok), vagy összevonható — MVP: **több sor engedélyezett**, az összesítő összead.

## Entity: DailySummary (számított)

Nem feltétlenül tárolt — lekérdezés:

```
SUM(muffCount) GROUP BY diameterMm
WHERE project.date = today
```

## Későbbi entitások

- `MeasurementRow` — ellenállás / szigetelés (Vorlauf, Rücklauf…)
- `Sketch` — rajz / skicc blob vagy stroke lista
- `Signature` — aláírás kép + aláíró név + dátum

## Tárolás (MVP)

- Helyi adatbázis a telefonon (SQLite / async storage réteg)
- Export: JSON backup + később PDF
