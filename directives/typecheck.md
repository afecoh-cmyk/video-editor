# TypeScript ellenőrzés

## Cél

Biztosítani, hogy a Muffe Plan Expo / TypeScript kód fordítási hibák nélkül áll.

## Bemenet

- Repo gyökér (`package.json`, `tsconfig.json`, `src/`)

## Lépések

1. Ellenőrizd, hogy létezik-e `execution/typecheck.sh`.
2. Futtasd: `bash execution/typecheck.sh`
3. Ha hibát jelez: javítsd a forrást, majd futtasd újra (öngyógyító ciklus).
4. Commit előtt mindig futtasd le.

## Kimenet

- Exit code `0` = rendben
- Nem-nulla = javítandó TypeScript hibák a kimeneten

## Különleges esetek

- Ha `node_modules` hiányzik: előbb `npm install`, majd újra typecheck.
- Web export NEM része ennek az irányelvnek (mobil-first).
