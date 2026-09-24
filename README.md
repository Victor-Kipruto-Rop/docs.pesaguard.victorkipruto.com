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

## Connection to the backend

The docs are static and stay that way: there is no docs backend. The API
reference is rebuilt from the backend repository
(`Victor-Kipruto-Rop/api.pesaguard.victorkipruto.com`) by a workflow.

```
backend push to main
  -> backend .github/workflows/sync-docs.yml
       notify-docs   sends repository_dispatch "backend-updated" to this repo
       refresh-spec  refreshes docs/api/openapi.implemented.json in the backend
  -> this repo .github/workflows/sync-openapi.yml
       regenerates api-reference/openapi.json and routes.snapshot.json,
       runs `npm run check`, opens the pull request "Sync API reference ..."
```

- `sync-openapi.yml` also runs daily and from the Actions tab, so a missed
  dispatch or an unset token only delays the update.
- A change that only moves the recorded backend commit is discarded
  (`scripts/discard-stamp-only-changes.py`), so pull requests appear only
  when a route, parameter or response changed.
- Merge the sync pull request, then run `npm run check:drift` to see which
  new operations still need a hand-written page.
- The backend's generated routes need `DATABASE_URL` and `PESAGUARD_API_URL`
  set (any values; nothing is contacted) and `jsonschema` installed, which the
  backend's `requirements.txt` omits.

Repository settings needed once: Actions may create pull requests (this repo
and the backend), and the backend has a `DOCS_DISPATCH_TOKEN` secret (a
fine-grained token with Contents read/write on this repo only).

Do not run `scripts/generate-pages.js`: it predates the current pages and overwrites them.
