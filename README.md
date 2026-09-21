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

- `Live`: behaviour verified in the repository (tests, routes, or docs).
- `Draft`: design intent recorded here; not yet verified against shipped code.
- `Planned`: named roadmap scope with no implementation.

## API contract and checks

`api-reference/openapi.json` is generated. Edit the hand-written parts (summaries, descriptions, info) in `api-reference/openapi.base.json`, then rebuild:

```sh
# needs the backend checkout and its Python dependencies
python scripts/dump-flask-routes.py ../api.pesaguard.victorkipruto.com     # api-reference/routes.snapshot.json
python scripts/generate-openapi.py  ../api.pesaguard.victorkipruto.com     # api-reference/openapi.json
```

Checks (Node only, no dependencies):

- `npm run check` validates links, metadata and the OpenAPI structure.
- `npm run check:drift` compares the docs and the spec with the backend's real routes.
- `npm run check:strict` fails on warnings and drift too.

Do not run `scripts/generate-pages.js`: it predates the current pages and overwrites them.
