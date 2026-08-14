# execution — fix eszközök

Determinisztikus scriptek. Az ügynök az irányelvek alapján hívja őket.

| Script | Irányelv | Mit csinál |
|---|---|---|
| [typecheck.sh](typecheck.sh) | `directives/typecheck.md` | `tsc --noEmit` |
| [web-export.sh](web-export.sh) | `directives/web-deploy.md` | Expo web → `dist/` |
