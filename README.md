# Muffe Plan

Mobilapp a távhővezeték **Abnahmeprotokoll** papíros folyamatának kiváltására — fókuszban a **Schrumpfmuffen** napi nyomon követése (30–40 tétel is).

## Futtatás

```bash
npm install
npx expo start
```

Ezután Expo Go-val telefonon, vagy `a` / `i` / `w` (Android / iOS szimulátor / web).

## MVP funkciók

1. **Projektlista** — bajsztelepek
2. **Új / szerkesztett projekt** — Betreiber, Verlegefirma, Baustellenort, Datum
3. **Muff lista** — DM chip + Stk. + Prüfdruck gyors hozzáadás, futó összesen
4. **Napi összesítő** — DM szerinti csoportosítás az aznapi projektekre
5. **Offline** — AsyncStorage helyi mentés

## Dokumentáció

- [docs/PRODUCT.md](docs/PRODUCT.md)
- [docs/DATA-MODEL.md](docs/DATA-MODEL.md)
- [docs/MVP.md](docs/MVP.md)
