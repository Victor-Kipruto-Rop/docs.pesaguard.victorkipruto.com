/**
 * Dependency-free structural validation of api-reference/openapi.json.
 *
 * Errors (exit 1) are things that make the document invalid or misleading:
 * bad top-level shape, unresolved $refs, undeclared path parameters, missing
 * response descriptions, duplicate operationIds.
 *
 * Warnings (exit 0) track completeness debt: missing operationIds, request
 * bodies, error responses, schemas, unused components. Pass --strict to make
 * warnings fail too, once the spec has been filled in.
 *
 * Run: `node scripts/validate-openapi.js [--strict] [path/to/openapi.json]`
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const file = args.find((a) => !a.startsWith("--")) || path.join(ROOT, "api-reference", "openapi.json");

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];
const BODY_METHODS = ["post", "put", "patch"];

let spec;
try {
  spec = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  console.error(`${path.relative(ROOT, file)}: cannot read or parse: ${e.message}`);
  process.exit(1);
}

/* ---- top level ---------------------------------------------------------- */
if (!/^3\.\d+\.\d+$/.test(spec.openapi || "")) err(`"openapi" must be a 3.x.y version string`);
if (!spec.info || !spec.info.title) err(`info.title is required`);
if (!spec.info || !spec.info.version) err(`info.version is required`);
if (!spec.paths || typeof spec.paths !== "object" || !Object.keys(spec.paths).length) {
  err(`paths must be a non-empty object`);
}
if (!spec.servers || !spec.servers.length) warn(`no "servers" declared; clients cannot tell the base URL`);

const components = spec.components || {};
const used = new Set();

/* ---- $ref resolution ---------------------------------------------------- */
function resolveRef(ref) {
  if (!ref.startsWith("#/")) return undefined; // external refs are out of scope
  return ref
    .slice(2)
    .split("/")
    .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((node, key) => (node == null ? undefined : node[key]), spec);
}

function walkRefs(node, where) {
  if (Array.isArray(node)) return node.forEach((n, i) => walkRefs(n, `${where}[${i}]`));
  if (!node || typeof node !== "object") return;
  if (typeof node.$ref === "string") {
    used.add(node.$ref);
    if (resolveRef(node.$ref) === undefined && node.$ref.startsWith("#/")) {
      err(`${where}: unresolved $ref ${node.$ref}`);
    }
  }
  for (const [k, v] of Object.entries(node)) walkRefs(v, `${where}.${k}`);
}
walkRefs(spec, "$");

const deref = (x) => (x && x.$ref ? resolveRef(x.$ref) : x);

/* ---- paths -------------------------------------------------------------- */
const operationIds = new Map();
for (const [p, item] of Object.entries(spec.paths || {})) {
  if (!p.startsWith("/")) err(`${p}: path must start with "/"`);

  const templated = [...p.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  const pathLevel = (item.parameters || []).map(deref).filter(Boolean);

  const ops = Object.keys(item).filter((k) => METHODS.includes(k));
  if (!ops.length) err(`${p}: no operations`);
  for (const k of Object.keys(item)) {
    if (!METHODS.includes(k) && !["parameters", "summary", "description", "servers", "$ref"].includes(k) && !k.startsWith("x-")) {
      err(`${p}: unknown key "${k}"`);
    }
  }

  for (const method of ops) {
    const op = item[method];
    const id = `${method.toUpperCase()} ${p}`;

    if (!op.summary && !op.description) warn(`${id}: no summary or description`);
    if (!op.operationId) warn(`${id}: no operationId`);
    else if (operationIds.has(op.operationId)) err(`${id}: duplicate operationId ${op.operationId} (also ${operationIds.get(op.operationId)})`);
    else operationIds.set(op.operationId, id);

    const declared = new Set(
      [...pathLevel, ...(op.parameters || []).map(deref).filter(Boolean)]
        .filter((prm) => prm.in === "path")
        .map((prm) => prm.name)
    );
    for (const name of templated) {
      if (!declared.has(name)) err(`${id}: path parameter {${name}} is not declared`);
    }
    for (const name of declared) {
      if (!templated.includes(name)) err(`${id}: declared path parameter "${name}" is not in the path`);
    }
    for (const prm of [...pathLevel, ...(op.parameters || []).map(deref).filter(Boolean)]) {
      if (prm.in === "path" && prm.required !== true) err(`${id}: path parameter "${prm.name}" must be required: true`);
    }

    if (!op.responses || !Object.keys(op.responses).length) {
      err(`${id}: no responses`);
    } else {
      const codes = Object.keys(op.responses);
      for (const [code, res] of Object.entries(op.responses)) {
        if (!/^([1-5]\d\d|[1-5]XX|default)$/.test(code)) err(`${id}: invalid response code "${code}"`);
        const r = deref(res);
        if (r && !r.description) err(`${id}: response ${code} has no description`);
        if (r && /^2/.test(code) && code !== "204" && !r.content && !res.$ref) warn(`${id}: ${code} declares no response schema`);
      }
      if (!codes.some((c) => /^4/.test(c) || c === "default")) warn(`${id}: no 4xx/default error response`);
    }

    if (BODY_METHODS.includes(method) && !op.requestBody) warn(`${id}: ${method.toUpperCase()} has no requestBody`);
    if (!op.security && !spec.security) warn(`${id}: no security requirement`);
  }
}

/* ---- components --------------------------------------------------------- */
for (const [group, members] of Object.entries(components)) {
  if (group === "securitySchemes") continue;
  for (const name of Object.keys(members || {})) {
    if (!used.has(`#/components/${group}/${name}`)) warn(`components.${group}.${name} is defined but never referenced`);
  }
}
if (!components.schemas || !Object.keys(components.schemas).length) warn(`components.schemas is empty`);

/* ---- report ------------------------------------------------------------- */
const pathCount = Object.keys(spec.paths || {}).length;
const opCount = Object.values(spec.paths || {}).reduce((n, i) => n + Object.keys(i).filter((k) => METHODS.includes(k)).length, 0);
console.log(`${path.relative(ROOT, file)}: ${pathCount} paths, ${opCount} operations`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s)${strict ? " (failing: --strict)" : ""}:`);
  const shown = warnings.slice(0, 15);
  for (const w of shown) console.log("  warn  " + w);
  if (warnings.length > shown.length) console.log(`  ... and ${warnings.length - shown.length} more`);
}
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error("  error " + e);
}
if (errors.length || (strict && warnings.length)) process.exit(1);
console.log("\nOpenAPI structure OK");
