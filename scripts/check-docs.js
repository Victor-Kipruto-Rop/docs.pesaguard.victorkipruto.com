/**
 * Walks the docs tree, collects every internal href/src, and fails when a
 * target does not exist. Run: `npm run check` (or `node scripts/check-docs.js`).
 *
 * Deliberately dependency-free so CI needs nothing beyond Node.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const problems = [];
let pagesChecked = 0;
let linksChecked = 0;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function normalize(href) {
  const clean = href.split("#")[0].split("?")[0];
  return clean.length === 0 ? "index.html" : clean;
}

const files = walk(ROOT);

for (const file of files.filter((f) => f.endsWith(".html"))) {
  pagesChecked += 1;
  const html = fs.readFileSync(file, "utf8");
  const dir = path.dirname(file);
  const attrs = html.match(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g) || [];

  for (const raw of attrs) {
    const value = raw.slice(raw.indexOf('"') + 1, -1);
    if (/^(https?:|mailto:|data:|\/\/)/.test(value)) continue;
    linksChecked += 1;
    const target = path.resolve(dir, normalize(value));
    if (!fs.existsSync(target)) {
      problems.push(`${rel(file)} -> broken link: ${value}`);
    }
  }

  if (!/<title>[^<]+<\/title>/.test(html)) {
    problems.push(`${rel(file)} -> missing <title>`);
  }
  if (!/<meta name="description" content="[^"]+"/.test(html)) {
    problems.push(`${rel(file)} -> missing meta description`);
  }
}

const jsonFiles = files.filter((f) => f.endsWith(".json"));
for (const file of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    problems.push(`${rel(file)} -> invalid JSON: ${err.message}`);
  }
}

console.log(`checked ${pagesChecked} pages, ${linksChecked} internal links, ${jsonFiles.length} json files`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error("  " + problem);
  process.exit(1);
}
console.log("all internal links and metadata OK");
