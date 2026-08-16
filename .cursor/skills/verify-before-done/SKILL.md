---
name: verify-before-done
description: „Kész”, commit vagy PR előtt kötelező typecheck, szükség esetén geometria-check, UI-nál dev tesztlink. Használd /verify-before-done híváskor és minden lezárás előtt.
---

# Verify before done — ellenőrzés „kész” előtt

Ne mondd „késznek”, ne commitolj / ne nyiss PR-t anélkül, hogy az alábbiak lefutottak (vagy megindokoltad, miért nem).

## Kötelező checklist

### 1. Typecheck

```bash
bash execution/typecheck.sh
```

- Exit `0` kell.
- Ha `node_modules` hiányzik: `npm install`, majd újra.

### 2. Geometria (ha érintett)

Ha a változtatás érinti a pipe / muffe / reduzir / abzweig **rajzot vagy geometriát**:

```bash
npx --yes tsx execution/check-pipe-geometry.ts
```

Ha nem érintett: írd röviden, hogy kihagytad és miért.

### 3. UI → dev tesztlink

Felhasználói felületet érintő változásnál:

1. Indíts / frissíts működő dev preview-t.
2. Küldd el a felhasználónak a **ténylegesen ellenőrzött** dev tesztlinket.
3. Ne ígérj nem létező / nem futó linket.

### 4. Main védelem

- Alapértelmezés: feature branch + PR.
- Main merge / push **csak** user külön kérésére.

## Hibánál

1. Olvasd el a hibát.
2. Javítsd.
3. Futtasd újra a checket.
4. Ismétlődő tanulság → apró pontosítás a megfelelő `directives/` fájlban (új irányelvet ne találj ki).

## Kész jelentés (rövid)

- Mit ellenőriztél (typecheck / geometria / UI link)
- Dev link (ha UI)
- Mi maradt nyitva (ha van)
