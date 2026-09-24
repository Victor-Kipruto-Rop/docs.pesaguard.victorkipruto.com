#!/usr/bin/env python3
"""Revert regenerated API-reference files whose only change is the commit stamp.

generate-openapi.py and dump-flask-routes.py record the backend commit they
read. Every backend commit therefore changes those files, even when no route,
parameter or response changed. The sync workflows run this after
regenerating so that a pull request is opened only for a real change.

    python scripts/discard-stamp-only-changes.py

Compares each file with its committed version (git HEAD) after removing the
commit stamp. If nothing else differs, the working copy is restored.
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _strip_openapi(doc):
    doc.get("info", {}).get("x-generated-from", {}).pop("commit", None)
    return doc


def _strip_snapshot(doc):
    doc.get("source", {}).pop("commit", None)
    return doc


FILES = {
    "api-reference/openapi.json": _strip_openapi,
    "api-reference/routes.snapshot.json": _strip_snapshot,
}


def main() -> int:
    for rel, strip in FILES.items():
        committed = subprocess.run(
            ["git", "show", f"HEAD:{rel}"], cwd=ROOT, capture_output=True, text=True
        )
        if committed.returncode != 0:
            print(f"{rel}: not committed yet; keeping the generated copy")
            continue
        with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
            current = json.load(fh)
        if strip(json.loads(committed.stdout)) == strip(current):
            subprocess.check_call(["git", "checkout", "--", rel], cwd=ROOT)
            print(f"{rel}: only the commit stamp changed; kept the committed copy")
        else:
            print(f"{rel}: content changed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
