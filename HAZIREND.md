# Projekt házirend az Agentnek

## Parancsok

• Build: `bash execution/web-export.sh` (Expo web → `dist/`)
• Typecheck / lint: `bash execution/typecheck.sh` (`tsc --noEmit`; külön lint nincs)
• Teszt: nincs formális runner; geometria: `npx --yes tsx execution/check-pipe-geometry.ts`
• Dev szerver: `npx expo start` (web: `npx expo start --web`)

## Stack (röviden)

• Nyelv / framework: TypeScript · Expo / React Native
• Csomagkezelő: npm (`package-lock.json`)
• Teszt runner: nincs (typecheck + `execution/check-pipe-geometry.ts`)

## Hol keressen (pointerok, nem magyarázat)

• Fő app kód: `src/` · belépő: `App.tsx`, `index.ts`
• Komponens / UI minták: `src/components/` · képernyők: `src/screens/` · téma: `src/theme.ts`
• API / backend: nincs (MVP offline) · tárolás: `src/storage.ts` · típusok: `src/types.ts`
• Tesztek: `execution/check-pipe-geometry.ts` · typecheck: `execution/typecheck.sh`

## Munkamód

1. Előbb keresés / olvasás, aztán szerkesztés.
2. Több fájlos feladatnál előbb terv, utána kód.
3. Változtatás után futtasd a releváns checket (lint/typecheck/teszt).
4. Ha a check nem futtatható, írd meg miért — ne állítsd „késznek” check nélkül.

## Határok

• Soha ne commitolj secretet, .env-et, kulcsokat.
• Ne pusholj védett branchre (main / master) kérdés nélkül.
• Ne bővítsd a scope-ot a kérésen túl (nincs „mellesleg refaktor”).
• Ne törölj fájlokat / ne futtass destruktív parancsot jóváhagyás nélkül.
