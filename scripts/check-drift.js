/**
 * Compares endpoints written in the HTML docs ("GET /api/v1/...") with the
 * paths in api-reference/openapi.json and reports three kinds of drift:
 *
 *   1. documented but missing from the OpenAPI document
 *   2. in the OpenAPI document but never mentioned in the docs
 *   3. same endpoint, different path prefix (e.g. /tenant/current vs
 *      /api/v1/tenant/current), the usual sign of an unsettled URL contract
 *
 * When api-reference/routes.snapshot.json exists (see
 * scripts/dump-flask-routes.py) it also checks both sources against the routes
 * the canonical backend app really registers:
 *
 *   4. documented or specified but not registered by the backend
 *   5. registered by the backend but missing from openapi.json
 *
 * Report-only by default (exit 0). Pass --strict to fail on any drift, which
 * is what CI should do once the URL contract is settled.
 *
 * Illustrative examples are excluded via IGNORE below.
 *
 * Run: `node scripts/check-drift.js [--strict]`
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const strict = process.argv.includes("--strict");

/** Paths that appear in the docs but are not part of the PesaGuard API. */
const IGNORE = [
  /^\/api\/v\d+\/example$/, // placeholder used to explain versioning
  /^\/webhooks\/pesaguard$/, // sample receiver endpoint on the customer's side
  /^\/openapi(\.contract)?\.json$/, // the spec documents themselves, served outside the API contract
  /^\/auth\/login$/, // named on the Authentication page as absent from the canonical app (legacy variants only)
];

const METHODS = ["get", "put", "post", "delete", "patch", "head", "options"];

/** Version prefix and param names are noise when comparing contracts. */
const canonical = (p) => p.replace(/^\/api\/v\d+(?=\/)/, "").replace(/\{[^}]+\}/g, "{}").replace(/\/+$/, "");
const hasPrefix = (p) => /^\/api\/v\d+\//.test(p);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    e.isDirectory() ? walk(full, out) : out.push(full);
  }
  return out;
}

/* ---- documented endpoints ------------------------------------------------ */
const documented = new Map(); // "METHOD canonical" -> { path, pages:Set }
for (const file of walk(ROOT).filter((f) => f.endsWith(".html"))) {
  const text = fs
    .readFileSync(file, "utf8")
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#123;|&lbrace;/g, "{")
    .replace(/&#125;|&rbrace;/g, "}");
  for (const m of text.matchAll(/\b(GET|POST|PUT|PATCH|DELETE)\s+(\/[A-Za-z0-9_\/{}.:-]*)/g)) {
    const [, method, p] = m;
    if (IGNORE.some((re) => re.test(p))) continue;
    const key = `${method} ${canonical(p)}`;
    if (!documented.has(key)) documented.set(key, { method, path: p, pages: new Set() });
    documented.get(key).pages.add(path.relative(ROOT, file).split(path.sep).join("/"));
  }
}

/* ---- specified endpoints ------------------------------------------------- */
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, "api-reference", "openapi.json"), "utf8"));
const specified = new Map();
for (const [p, item] of Object.entries(spec.paths || {})) {
  for (const method of Object.keys(item).filter((k) => METHODS.includes(k))) {
    specified.set(`${method.toUpperCase()} ${canonical(p)}`, { method: method.toUpperCase(), path: p });
  }
}

/* ---- diff ---------------------------------------------------------------- */
const missingFromSpec = [];
const undocumented = [];
const prefixMismatch = [];

for (const [key, d] of documented) {
  const s = specified.get(key);
  if (!s) missingFromSpec.push(d);
  else if (hasPrefix(d.path) !== hasPrefix(s.path)) prefixMismatch.push({ docs: d.path, spec: s.path, method: d.method, pages: [...d.pages] });
}
for (const [key, s] of specified) if (!documented.has(key)) undocumented.push(s);


/* ---- against the real route table ---------------------------------------- */
const snapPath = path.join(ROOT, "api-reference", "routes.snapshot.json");
const notRegisteredDocs = [];
const notRegisteredSpec = [];
const notInSpec = [];
let snap = null;
/** Registered by the app but not part of the API surface. */
const NOT_API = [/^\/static\//, /^\/docs$/, /^\/openapi(\.contract)?\.json$/];
if (fs.existsSync(snapPath)) {
  snap = JSON.parse(fs.readFileSync(snapPath, "utf8"));
  const exact = (p) => p.replace(/\{[^}]+\}/g, "{}").replace(/\/+$/, "");
  const registered = new Set();
  for (const r of snap.routes) for (const m of r.methods) registered.add(`${m} ${exact(r.path)}`);
  const specExact = new Set([...specified.values()].map((x) => `${x.method} ${exact(x.path)}`));
  for (const d of documented.values()) if (!registered.has(`${d.method} ${exact(d.path)}`)) notRegisteredDocs.push(d);
  for (const x of specified.values()) if (!registered.has(`${x.method} ${exact(x.path)}`)) notRegisteredSpec.push(x);
  for (const r of snap.routes) {
    if (NOT_API.some((re) => re.test(r.path))) continue;
    for (const m of r.methods) if (!specExact.has(`${m} ${exact(r.path)}`)) notInSpec.push({ method: m, path: r.path });
  }
}

const line = (m, p) => `${m.padEnd(6)} ${p}`;
console.log(`documented endpoints: ${documented.size}   specified endpoints: ${specified.size}\n`);

console.log(`Documented but missing from openapi.json (${missingFromSpec.length}):`);
for (const d of missingFromSpec) console.log(`  ${line(d.method, d.path)}   [${[...d.pages].join(", ")}]`);

console.log(`\nSame endpoint, different prefix (${prefixMismatch.length}):`);
for (const x of prefixMismatch) console.log(`  ${x.method.padEnd(6)} docs ${x.docs}  vs  spec ${x.spec}`);

console.log(`\nIn openapi.json but not shown in the docs (${undocumented.length}):`);
for (const s of undocumented) console.log(`  ${line(s.method, s.path)}`);


if (snap) {
  const c = (snap.source.commit || "unknown").slice(0, 7);
  console.log(`\n--- against backend route table (${snap.source.repository} @ ${c}) ---`);
  console.log(`\nDocumented in the HTML but not registered by the backend (${notRegisteredDocs.length}):`);
  for (const d of notRegisteredDocs) console.log(`  ${line(d.method, d.path)}   [${[...d.pages].join(", ")}]`);
  console.log(`\nIn openapi.json but not registered by the backend (${notRegisteredSpec.length}):`);
  for (const x of notRegisteredSpec) console.log(`  ${line(x.method, x.path)}`);
  console.log(`\nRegistered by the backend but missing from openapi.json (${notInSpec.length}):`);
  for (const x of notInSpec) console.log(`  ${line(x.method, x.path)}`);
}

const total = missingFromSpec.length + prefixMismatch.length + undocumented.length + notRegisteredDocs.length + notRegisteredSpec.length + notInSpec.length;
console.log(`\n${total} drift item(s)${strict ? "" : " (report only; use --strict to fail)"}`);
if (strict && total) process.exit(1);
