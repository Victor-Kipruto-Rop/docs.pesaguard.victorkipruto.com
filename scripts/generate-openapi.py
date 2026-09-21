#!/usr/bin/env python3
"""Build api-reference/openapi.json from the hand-written base plus the backend.

    python scripts/generate-openapi.py /path/to/backend-checkout

Inputs
  api-reference/openapi.base.json   hand-written summaries, descriptions, info
  the backend checkout              routes come from the canonical Flask app's
                                    url_map; parameters, request bodies, response
                                    codes and permissions are read from each
                                    handler's source with the ast module

Output
  api-reference/openapi.json        deterministic: same base + same backend
                                    commit gives the same file

What is extracted is what the handler source states literally: decorator
permissions, request.args / request.headers reads, _query_int bounds,
_validate_filter enums, _validate_fields schemas, .get("field") reads on the
JSON body, and the (jsonify(...), status) tuples it returns. Anything a helper
function does out of sight is not seen, and value types the source does not
state are left open rather than guessed. Handlers shared by several methods on
one rule are documented without per-method bodies or responses.
"""
import argparse
import ast
import copy
import inspect
import json
import os
import re
import secrets
import subprocess
import sys
import textwrap

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, "api-reference", "openapi.base.json")
OUT = os.path.join(ROOT, "api-reference", "openapi.json")

SKIP = re.compile(r"^/(static/|docs$|openapi\.json$)")
TYPE_MAP = {"str": "string", "int": "integer", "float": "number", "bool": "boolean", "list": "array", "dict": "object"}
STATUS_TEXT = {200: "OK", 201: "Created", 202: "Accepted", 204: "No content"}
TAGS = {
    "communications": "Communications", "organizations": "Organizations", "customers": "Customer data",
    "export": "Customer data", "operations": "Operations", "discrepancies": "Discrepancies",
    "incidents": "Incidents", "analytics": "Analytics", "providers": "Providers", "tenant": "Tenants",
    "tenants": "Tenants", "settings": "Settings", "health": "Service health", "metrics": "Service health",
}
BODY_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
# Inbound webhooks that authenticate with a signature header instead of a bearer token or API key.
SIGNED_WEBHOOKS = {
    "/api/v1/webhooks/africastalking/delivery": (
        "Called by Africa's Talking with a delivery report. Authenticated by an HMAC signature in the "
        "X-Africa-Talking-Signature (or X-Webhook-Signature) header, not by a bearer token or API key. "
        "Returns 503 WEBHOOK_NOT_CONFIGURED when no webhook secret is set."),
}
HEADER_SKIP = {"authorization", "x-api-key", "content-type", "origin", "x-forwarded-proto", "x-forwarded-for", "user-agent"}


def flask_path(rule):
    return re.sub(r"<(?:[^:>]+:)?([^>]+)>", r"{\1}", rule)


def camel(name):
    return "".join(p.capitalize() for p in re.split(r"[_\-]", name))


def humanize(endpoint):
    s = endpoint.split(".")[-1].strip("_").replace("_", " ")
    return s[:1].upper() + s[1:]


def tag_for(path):
    seg = [s for s in path.split("/") if s]
    if seg[:2] == ["api", "v1"]:
        seg = seg[2:]
    elif seg[:1] == ["v1"]:
        seg = seg[1:]
    first = seg[0] if seg else "root"
    return TAGS.get(first, first.replace("-", " ").replace("_", " ").capitalize())


# ---------------------------------------------------------------- AST helpers
def call_name(n):
    if isinstance(n.func, ast.Name):
        return n.func.id
    if isinstance(n.func, ast.Attribute):
        return n.func.attr
    return ""


def is_request_attr(expr, attr):
    return (isinstance(expr, ast.Attribute) and expr.attr == attr
            and isinstance(expr.value, ast.Name) and expr.value.id == "request")


def const_str(n):
    return n.value if isinstance(n, ast.Constant) and isinstance(n.value, str) else None


def schema_of(n, depth=0):
    if isinstance(n, ast.Constant):
        v = n.value
        if v is None:
            return {"nullable": True}
        if isinstance(v, bool):
            return {"type": "boolean"}
        if isinstance(v, int):
            return {"type": "integer"}
        if isinstance(v, float):
            return {"type": "number"}
        if isinstance(v, str):
            return {"type": "string"}
    if isinstance(n, ast.JoinedStr):
        return {"type": "string"}
    if depth > 4:
        return {}
    if isinstance(n, ast.Dict):
        props, extra = {}, False
        for k, v in zip(n.keys, n.values):
            if k is None:
                extra = True
            elif const_str(k) is not None:
                props[k.value] = schema_of(v, depth + 1)
        s = {"type": "object", "properties": props}
        if extra:
            s["additionalProperties"] = True
        return s
    if isinstance(n, (ast.ListComp, ast.GeneratorExp)):
        return {"type": "array", "items": schema_of(n.elt, depth + 1)}
    if isinstance(n, ast.List):
        return {"type": "array", "items": schema_of(n.elts[0], depth + 1) if n.elts else {}}
    return {}


def error_code(payload):
    if isinstance(payload, ast.Dict):
        for k, v in zip(payload.keys, payload.values):
            if const_str(k) == "error":
                if const_str(v) is not None:
                    return v.value, False
                if isinstance(v, ast.Dict):
                    for kk, vv in zip(v.keys, v.values):
                        if const_str(kk) == "code" and const_str(vv) is not None:
                            return vv.value, True
    return None, False


def resolve_enum(node, fn_globals):
    if isinstance(node, (ast.Set, ast.List, ast.Tuple)):
        vals = [const_str(e) for e in node.elts]
        return sorted(v for v in vals if v) if all(vals) else None
    if isinstance(node, ast.Name):
        obj = fn_globals.get(node.id)
        if isinstance(obj, (set, frozenset, list, tuple)) and all(isinstance(x, str) for x in obj):
            return sorted(obj)
    return None


def field_type(node):
    names = [e.id for e in node.elts if isinstance(e, ast.Name)] if isinstance(node, ast.Tuple) else (
        [node.id] if isinstance(node, ast.Name) else [])
    types = {TYPE_MAP.get(n) for n in names} - {None}
    if types == {"integer", "number"}:
        return {"type": "number"}
    return {"type": types.pop()} if len(types) == 1 else {}


def analyze(view):
    fn = inspect.unwrap(view)
    try:
        tree = ast.parse(textwrap.dedent(inspect.getsource(fn)))
    except Exception:
        return None
    fdef = next((n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))), None)
    if fdef is None:
        return None
    a = {"auth": False, "permission": None, "tenant_guard": False, "query": {}, "headers": [], "body_props": {},
         "body_required": set(), "body_seen": False, "json_required": False, "returns": [], "csv": False,
         "helper_codes": {}, "doc": inspect.getdoc(fn)}
    for d in fdef.decorator_list:
        call = d if isinstance(d, ast.Call) else None
        target = call.func if call else d
        name = target.id if isinstance(target, ast.Name) else target.attr if isinstance(target, ast.Attribute) else ""
        if "require_auth" in name:
            a["auth"] = True
            if call:
                if call.args and const_str(call.args[0]):
                    a["permission"] = call.args[0].value
                for kw in call.keywords:
                    if kw.arg in ("required_permission", "permission") and const_str(kw.value):
                        a["permission"] = kw.value.value
        if "require_tenant_access" in name:
            a["tenant_guard"] = True

    json_vars = set()
    for node in ast.walk(fdef):
        if isinstance(node, ast.Assign) and isinstance(node.value, (ast.Call, ast.BoolOp)):
            calls = [c for c in ast.walk(node.value) if isinstance(c, ast.Call)]
            names = {call_name(c) for c in calls}
            t = node.targets[0]
            if "_json_object" in names:
                a["json_required"] = a["body_seen"] = True
                if isinstance(t, ast.Tuple) and isinstance(t.elts[0], ast.Name):
                    json_vars.add(t.elts[0].id)
            elif "get_json" in names:
                a["body_seen"] = True
                if isinstance(t, ast.Name):
                    json_vars.add(t.id)

    def helper(status, code):
        a["helper_codes"].setdefault(status, set()).add(code)

    for node in ast.walk(fdef):
        if isinstance(node, ast.Call):
            fname = call_name(node)
            args = node.args
            if fname == "get" and isinstance(node.func, ast.Attribute):
                key = const_str(args[0]) if args else None
                if key and is_request_attr(node.func.value, "args"):
                    a["query"].setdefault(key, {"type": "string"})
                elif key and is_request_attr(node.func.value, "headers") and key.lower() not in HEADER_SKIP:
                    if key not in a["headers"]:
                        a["headers"].append(key)
                elif key and isinstance(node.func.value, ast.Name) and node.func.value.id in json_vars:
                    a["body_props"].setdefault(key, {})
            elif fname == "_query_int" and len(args) >= 4 and const_str(args[0]):
                vals = [x.value if isinstance(x, ast.Constant) else None for x in args[1:4]]
                s = {"type": "integer"}
                for k, v in zip(("default", "minimum", "maximum"), vals):
                    if v is not None:
                        s[k] = v
                a["query"][args[0].value] = s
                helper(400, "invalid_parameter")
            elif fname == "_validate_filter" and args and const_str(args[0]):
                enum = next((e for e in (resolve_enum(x, fn.__globals__) for x in args[1:]) if e), None)
                s = a["query"].setdefault(args[0].value, {"type": "string"})
                if enum:
                    s["enum"] = enum
                helper(400, "invalid_parameter")
            elif fname == "_validate_fields" and len(args) >= 2 and isinstance(args[1], ast.Dict):
                helper(400, "invalid_request")
                for k, v in zip(args[1].keys, args[1].values):
                    if const_str(k) and isinstance(v, ast.Tuple) and len(v.elts) == 2:
                        a["body_props"][k.value] = field_type(v.elts[0])
                        if isinstance(v.elts[1], ast.Constant) and v.elts[1].value is True:
                            a["body_required"].add(k.value)
            elif fname == "_json_object":
                helper(415, "invalid_json")
                helper(400, "invalid_json")
        elif isinstance(node, ast.Subscript) and isinstance(node.value, ast.Name) and node.value.id in json_vars:
            key = const_str(node.slice)
            if key:
                a["body_props"].setdefault(key, {})
        elif isinstance(node, ast.Return) and node.value is not None:
            v, status = node.value, 200
            if isinstance(v, ast.Tuple) and len(v.elts) >= 2 and isinstance(v.elts[1], ast.Constant) \
                    and isinstance(v.elts[1].value, int):
                status, v = v.elts[1].value, v.elts[0]
            if isinstance(v, ast.Call) and call_name(v) == "jsonify":
                a["returns"].append((status, v.args[0] if v.args else None))
    a["csv"] = "text/csv" in inspect.getsource(fn)
    return a


# ----------------------------------------------------------------- generation
def error_response(status, codes, nested):
    ref = "CommunicationsError" if nested else "Error"
    return {
        "description": "Error: " + ", ".join(f"`{c}`" for c in sorted(codes)) + ".",
        "x-error-codes": sorted(codes),
        "content": {"application/json": {"schema": {"$ref": f"#/components/schemas/{ref}"}}},
    }


def build(base_spec, app):
    spec = copy.deepcopy(base_spec)
    comp = spec.setdefault("components", {})
    comp.setdefault("parameters", {})
    comp.setdefault("responses", {})
    comp.setdefault("schemas", {})
    comp.setdefault("securitySchemes", {})
    comp["securitySchemes"]["apiKeyAuth"] = {
        "type": "apiKey", "in": "header", "name": "X-API-Key",
        "description": "Tenant API key starting with `pk_`. Used when no Authorization header is sent.",
    }
    spec["security"] = [{"bearerAuth": []}, {"apiKeyAuth": []}]
    comp["schemas"]["Error"] = {
        "type": "object", "required": ["error", "message"],
        "properties": {"error": {"type": "string", "description": "Machine-readable code in lower_snake_case."},
                       "message": {"type": "string"}},
    }
    comp["schemas"]["CommunicationsError"] = {
        "type": "object", "required": ["error"],
        "properties": {"error": {"type": "object", "required": ["code", "message"],
                                 "properties": {"code": {"type": "string"}, "message": {"type": "string"}}}},
    }
    err_ct = {"application/json": {"schema": {"$ref": "#/components/schemas/Error"}}}
    std = {
        "Unauthorized": (["authentication_failed", "missing_auth_header", "invalid_auth_header", "invalid_token", "invalid_api_key"]),
        "Forbidden": (["insufficient_permissions", "tenant_access_denied"]),
        "RateLimited": (["rate_limit_exceeded"]),
    }
    for name, codes in std.items():
        r = comp["responses"].setdefault(name, {"description": name})
        r["x-error-codes"] = codes
        r["content"] = err_ct
    comp["responses"]["RateLimited"]["headers"] = {
        "Retry-After": {"description": "Seconds to wait before retrying.", "schema": {"type": "integer"}}}

    rules = [r for r in app.url_map.iter_rules() if not SKIP.match(r.rule)]
    registered = {(flask_path(r.rule), m) for r in rules for m in r.methods if m not in ("HEAD", "OPTIONS")}
    used_ids, tags = set(), set()

    for rule in sorted(rules, key=lambda r: (flask_path(r.rule), r.endpoint)):
        path = flask_path(rule.rule)
        methods = sorted(m for m in rule.methods if m not in ("HEAD", "OPTIONS"))
        multi = len(methods) > 1
        a = analyze(app.view_functions[rule.endpoint]) or {}
        item = spec["paths"].setdefault(path, {})

        pnames = re.findall(r"\{([^}]+)\}", path)
        if pnames and "parameters" not in item:
            for n in pnames:
                comp["parameters"].setdefault(camel(n), {
                    "name": n, "in": "path", "required": True, "description": f"`{n}` path segment.", "schema": {"type": "string"}})
            item["parameters"] = [{"$ref": f"#/components/parameters/{camel(n)}"} for n in pnames]

        for method in methods:
            op = item.setdefault(method.lower(), {})
            op_id = rule.endpoint.replace(".", "_") + (f"_{method.lower()}" if multi else "")
            while op_id in used_ids:
                op_id += "_"
            used_ids.add(op_id)
            op["operationId"] = op_id
            tag = tag_for(path)
            tags.add(tag)
            op["tags"] = [tag]
            doc = a.get("doc")
            if "summary" not in op:
                op["summary"] = (doc.splitlines()[0].rstrip(".") if doc else humanize(rule.endpoint))
            if doc and len(doc.splitlines()) > 1 and "description" not in op:
                op["description"] = " ".join(doc.split())
            if a.get("permission") and not multi:  # a shared handler may check a different permission per method
                op["x-required-permission"] = a["permission"]
            if path.startswith("/health"):
                op["security"] = []
            if path in SIGNED_WEBHOOKS:
                op["security"] = []
                op.setdefault("description", SIGNED_WEBHOOKS[path])
            if path.startswith("/v1/") and (("/api" + path), method) in registered:
                op["x-alias-of"] = "/api" + path

            params = [p for p in op.get("parameters", [])]
            have = {(p.get("name"), p.get("in")) for p in params if "name" in p}
            if not multi or method == "GET":
                for name, schema in sorted(a.get("query", {}).items()):
                    if name not in pnames and (name, "query") not in have:
                        params.append({"name": name, "in": "query", "required": False, "schema": schema})
                for name in a.get("headers", []):
                    if (name, "header") not in have:
                        params.append({"name": name, "in": "header", "required": False, "schema": {"type": "string"}})
            if params:
                op["parameters"] = params

            if method in BODY_METHODS and a.get("body_seen") and not multi and "requestBody" not in op:
                schema = {"type": "object", "properties": dict(sorted(a["body_props"].items()))}
                if a["body_required"]:
                    schema["required"] = sorted(a["body_required"])
                op["requestBody"] = {"required": bool(a["json_required"]),
                                     "content": {"application/json": {"schema": schema}}}

            gen, codes = {}, {}
            if multi:
                gen["200"] = {"description": "Success. This handler serves several methods on one route; per-method responses are not documented yet."}
            else:
                for status, payload in a.get("returns", []):
                    if status < 400:
                        if str(status) not in gen:
                            r = {"description": STATUS_TEXT.get(status, "Success")}
                            if a.get("csv") and status == 200:
                                r["content"] = {"text/csv": {"schema": {"type": "string"}}}
                            elif payload is not None:
                                r["content"] = {"application/json": {"schema": schema_of(payload)}}
                            gen[str(status)] = r
                    else:
                        code, nested = error_code(payload)
                        if code:
                            c = codes.setdefault(status, {"codes": set(), "nested": False})
                            c["codes"].add(code)
                            c["nested"] = c["nested"] or nested
                for status, cs in a.get("helper_codes", {}).items():
                    c = codes.setdefault(status, {"codes": set(), "nested": False})
                    c["codes"] |= cs
                if a.get("tenant_guard") or "tenant_id" in pnames:
                    codes.setdefault(400, {"codes": set(), "nested": False})["codes"] |= {"missing_tenant_id", "invalid_tenant_id"}
                    codes.setdefault(403, {"codes": set(), "nested": False})["codes"].add("tenant_access_denied")
                if a.get("permission"):
                    codes.setdefault(403, {"codes": set(), "nested": False})["codes"].add("insufficient_permissions")
                for status, c in codes.items():
                    gen[str(status)] = error_response(status, c["codes"], c["nested"])
                if not any(k.startswith("2") for k in gen):
                    gen["200"] = {"description": "OK"}
            if not path.startswith("/health"):
                gen.setdefault("401", {"$ref": "#/components/responses/Unauthorized"})
                gen.setdefault("429", {"$ref": "#/components/responses/RateLimited"})
            responses = op.setdefault("responses", {})
            for status, r in gen.items():
                if status not in responses:
                    responses[status] = r
                else:
                    for k, v in r.items():
                        if k != "description":
                            responses[status].setdefault(k, v)
            op["responses"] = dict(sorted(responses.items()))

    spec["tags"] = [{"name": t} for t in sorted(tags)]
    spec["paths"] = dict(sorted(spec["paths"].items()))
    return spec


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("backend")
    ap.add_argument("--out", default=OUT)
    args = ap.parse_args()
    backend = os.path.abspath(args.backend)
    sys.path.insert(0, backend)
    os.environ.setdefault("JWT_SECRET_KEY", secrets.token_hex(32))
    from pesaguard_backend_pipeline.canonical_app import app  # noqa: E402

    base = json.load(open(BASE, encoding="utf-8"))
    spec = build(base, app)
    try:
        commit = subprocess.check_output(["git", "-C", backend, "rev-parse", "HEAD"], text=True,
                                         stderr=subprocess.DEVNULL).strip()
    except Exception:
        commit = None
    spec["info"]["x-generated-from"] = {
        "backend": "Victor-Kipruto-Rop/api.pesaguard.victorkipruto.com", "commit": commit,
        "generator": "scripts/generate-openapi.py"}
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(spec, fh, indent=2)
        fh.write("\n")
    ops = sum(1 for p in spec["paths"].values() for k in p if k in ("get", "post", "put", "patch", "delete"))
    print(f"wrote {len(spec['paths'])} paths, {ops} operations to {os.path.relpath(args.out, ROOT)}", file=sys.stderr)


if __name__ == "__main__":
    main()
