# PesaGuard docs (docs.pesaguard.victorkipruto.com)

Static developer documentation for the PesaGuard reconciliation platform.
No build step: pages are hand-written HTML sharing one stylesheet and one
script. Each page declares its own title and description honestly; anything
without an adapter, test suite or shipped behaviour is labelled planned or
not-started rather than implied.

## Preview

```powershell
npm run serve
# http://localhost:4173/
```

## Validate

`npm run check` walks every internal link in the HTML tree and fails on a
target that does not exist. Images, fonts and the OpenAPI files are covered
by the same walk.

## Status labels

- `Live` — behaviour verified in the repository (tests, routes, or docs).
- `Draft` — design intent recorded here; not yet verified against shipped code.
- `Planned` — named roadmap scope with no implementation.
