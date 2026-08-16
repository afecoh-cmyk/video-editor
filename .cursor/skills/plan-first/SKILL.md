---
name: plan-first
description: Több fájlos vagy nem egyértelmű feladatnál rövid tervet készít jóváhagyásra kódolás előtt. Használd /plan-first híváskor, Plan Mode mellett, vagy ha a workflow szabály tervet kér.
---

# Plan first — előbb terv, aztán kód

## Mikor használd

- Több fájlt érintő feladat
- Nem egyértelmű követelmény vagy több lehetséges megközelítés
- Architektúra / tárolás / navigáció / geometria változás
- A user `/plan-first`-et kér, vagy a workflow szabály tervet ír elő

**Ne** készíts külön tervet trivial, egyfájlos, egyértelmű bugfixhez, ha a user azonnali javítást kér.

## Lépések

1. **Olvasás:** releváns `src/`, `docs/`, `directives/`, `HAZIREND.md`, `AGENTS.md`.
2. **Rövid terv** (magyarul), tipikusan:
   - Cél (1–2 mondat)
   - Érintett fájlok
   - Megközelítés (lépések)
   - Kockázatok / határok (mit NEM csinálunk)
   - Ellenőrzés: typecheck (+ geometria ha kell) + UI-nál dev link
3. **Állj meg** jóváhagyásra, kivéve ha a user már egyértelműen engedélyezte a megvalósítást.
4. Jóváhagyás után kódolj a terv szerint — ne bővítsd a scope-ot.
5. Végén futtasd a `/verify-before-done` checklistet.

## Terv stílusa

- Gyakorlatias, rövid, bajsztelepi használatra
- Nincs naptári időbecslés (nap/hét)
- Ne ígérj Play/App Store APK-t EAS nélkül
