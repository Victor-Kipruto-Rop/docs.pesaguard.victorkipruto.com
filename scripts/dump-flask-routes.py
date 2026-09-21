#!/usr/bin/env python3
"""Dump the route table of the canonical PesaGuard Flask app to JSON.

The output is the ground truth that check-drift.js compares the docs and
openapi.json against. It records what the app that the backend Dockerfile
starts (pesaguard_backend_pipeline.canonical_app) actually registers.

Usage:
    python scripts/dump-flask-routes.py /path/to/backend-checkout \
        [--out api-reference/routes.snapshot.json]

Needs the backend's Python dependencies installed. No database, broker or
credentials are contacted: routes are read from app.url_map after import.
A throwaway JWT_SECRET_KEY is generated in-process when none is set, because
the backend refuses to import without one.
"""
import argparse
import json
import os
import re
import secrets
import subprocess
import sys


def flask_to_openapi(rule: str) -> str:
    """/x/<path:recipient>/y -> /x/{recipient}/y"""
    return re.sub(r"<(?:[^:>]+:)?([^>]+)>", r"{\1}", rule)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("backend", help="path to a checkout of the backend repository")
    ap.add_argument("--out", default="api-reference/routes.snapshot.json")
    args = ap.parse_args()

    backend = os.path.abspath(args.backend)
    sys.path.insert(0, backend)
    os.environ.setdefault("JWT_SECRET_KEY", secrets.token_hex(32))

    # Keep the app's JSON logging out of the way of our own output.
    from pesaguard_backend_pipeline.canonical_app import app  # noqa: E402

    routes = []
    for rule in app.url_map.iter_rules():
        methods = sorted(m for m in rule.methods if m not in ("HEAD", "OPTIONS"))
        routes.append(
            {
                "path": flask_to_openapi(rule.rule),
                "methods": methods,
                "endpoint": rule.endpoint,
            }
        )
    routes.sort(key=lambda r: (r["path"], r["methods"]))

    try:
        commit = subprocess.check_output(
            ["git", "-C", backend, "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL
        ).strip()
    except Exception:
        commit = None

    snapshot = {
        "source": {
            "repository": "Victor-Kipruto-Rop/api.pesaguard.victorkipruto.com",
            "commit": commit,
            "entrypoint": "pesaguard_backend_pipeline.canonical_app:app",
        },
        "routes": routes,
    }
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(snapshot, fh, indent=2)
        fh.write("\n")
    print(f"wrote {len(routes)} routes to {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
