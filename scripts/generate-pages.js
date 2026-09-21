/**
 * Generates the remaining static pages of the docs tree from a manifest.
 *
 * Every entry carries real, grounded content: facts come from the repository
 * (docs/api/API_OVERVIEW.md, docs/product/*.md, infra/README.md, the shipped
 * OpenAPI document). Pages whose subject is a design contract rather than
 * verified behaviour are labelled `Draft`; pages whose subject has no adapter
 * or implementation are labelled `Planned`. Run: `node scripts/generate-pages.js`.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const rel = (from, to) => path.relative(path.dirname(from), to).split(path.sep).join("/");

/** `../` repeated to reach the docs root from a page's directory. */
function upFor(file) {
  const dir = path.dirname(path.relative(ROOT, file));
  if (!dir || dir === ".") return "";
  const depth = dir.split(path.sep).filter(Boolean).length;
  return "../".repeat(depth);
}

function chrome(file, page, sidebarHtml) {
  const up = upFor(file);
  const fav = up + "assets/brand/favicon.svg";
  const appjs = up + "js/app.js";
  const sectionLinks = [
    ["Getting started", "getting-started/"],
    ["Concepts", "concepts/"],
    ["API", "api/"],
    ["Webhooks", "webhooks/"],
    ["Security", "security/"],
    ["Status", "status/"],
  ]
    .map(([label, href]) => `<a href="${up}${href}">${label}</a>`)
    .join("\n    ");
  const siteRoot = "https://docs.pesaguard.victorkipruto.com";
  const canonical = siteRoot + page.path;
  const ogImage = `${siteRoot}/assets/brand/og-image.jpg`;
  const titleText = page.section && page.section !== page.title
    ? `${page.section} · ${page.title} - PesaGuard docs`
    : `${page.title} - PesaGuard docs`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titleText}</title>
<meta name="description" content="${page.description}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#f4f5ef" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0e1311" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="PesaGuard docs">
<meta property="og:title" content="${titleText}">
<meta property="og:description" content="${page.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${titleText}">
<meta name="twitter:description" content="${page.description}">
<meta name="twitter:image" content="${ogImage}">
<link rel="icon" type="image/svg+xml" href="${fav}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${up}css/variables.css">
<link rel="stylesheet" href="${up}css/layout.css">
<link rel="stylesheet" href="${up}css/navigation.css">
<link rel="stylesheet" href="${up}css/content.css">
<link rel="stylesheet" href="${up}css/code.css">
<link rel="stylesheet" href="${up}css/search.css">
<link rel="stylesheet" href="${up}css/animations.css">
<link rel="stylesheet" href="${up}css/responsive.css">
<script>(function(){try{var t=localStorage.getItem("pg-theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}})();</script>
</head>
<body data-path="${page.path}">
<a class="visually-hidden" href="#main">Skip to content</a>
<header class="docs-header"><div class="docs-header-inner">
  <a class="docs-brand" href="${up}index.html"><img src="${fav}" alt="" width="26" height="26">PesaGuard <small>Docs</small></a>
  <div class="docs-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search…" aria-label="Search documentation"><kbd>Ctrl K</kbd><button type="button" class="docs-search-close" aria-label="Close search">✕</button></div>
  <nav class="docs-header-links" aria-label="Primary" id="primary-nav">${sectionLinks}</nav>
  <button class="docs-theme-toggle" type="button" aria-label="Toggle dark mode"><span class="icon-light">☀</span><span class="icon-dark">☾</span></button>
  <button class="docs-nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Toggle navigation menu"><span></span><span></span><span></span></button>
</div></header>

<main id="main">
<div class="docs-shell">
${sidebarHtml ? `<aside class="docs-sidebar" aria-label="Section navigation">${sidebarHtml}</aside>\n` : ""}  <article class="docs-article${page.wide ? " docs-content-wide" : ""}">
${page.crumbs ? `    <nav class="docs-crumbs" aria-label="Breadcrumb">${page.crumbs}</nav>\n` : ""}    <p class="docs-eyebrow">${page.section}</p>
    <h1>${page.title}${page.status ? ` <span class="status-pill" data-tone="${page.status.toLowerCase()}"><i></i>${page.status}</span>` : ""}</h1>
    <p class="docs-lede">${page.lede}</p>
${bodyFor(page)}
  </article>
</div>
</main>

<footer class="docs-footer"><div class="docs-footer-inner">
  <span>© 2026 PesaGuard</span>
  <nav aria-label="Footer"><a href="https://github.com/Victor-Kipruto-Rop/pesaguard">Source</a> <a href="https://status.pesaguard.victorkipruto.com">Status</a></nav>
</div></footer>

<script src="${appjs}" defer></script>
</body>
</html>
`;
}

function sidebarFor(section, file, links) {
  const up = upFor(file);
  const items = links
    .map(([label, href]) => `<li><a href="${up}${href}">${label}</a></li>`)
    .join("\n      ");
  return `<div class="docs-nav-group"><p>${section}</p><ul>\n      ${items}\n    </ul></div>`;
}

function bullets(items) {
  return items.map((item) => `      <li>${item}</li>`).join("\n");
}

/**
 * Normalises authored hrefs.
 *
 * Authored links are written as either an explicit climb ("../api/errors.html"),
 * an already-correct path from the docs root ("guides/index.html"), or a
 * same-folder sibling ("quickstart.html"). Climb and external links are left
 * untouched; a path that resolves from the docs root is preserved; anything
 * else is treated as a sibling and gets the page's depth prefix.
 */
function normalizeHrefs(html, file) {
  if (!html) return html;
  const up = upFor(file);
  const dir = path.dirname(file);
  return html.replace(/href="([^"]+)"/g, (match, href) => {
    if (/^(https?:|mailto:|#|\/|\.\.\/)/.test(href)) return match;
    const clean = href.split("#")[0];
    if (!up) return match;
    // Authored from the docs root (e.g. "guides/index.html") -> climb to root.
    if (fs.existsSync(path.join(ROOT, clean))) return `href="${up}${href}"`;
    // Otherwise it is a sibling of this page -> leave it alone.
    return `href="${href}"`;
    return `href="${up}${href}"`;
  });
}

function bodyFor(page) {
  const parts = [];
  if (page.note) {
    parts.push(
      `    <div class="callout" data-tone="${page.noteTone || "info"}">\n      <strong>${page.note[0]}</strong>\n      <p>${page.note[1]}</p>\n    </div>`
    );
  }
  for (const block of page.blocks || []) {
    if (block.h2) parts.push(`    <h2>${block.h2}</h2>`);
    if (block.p) parts.push(`    <p>${block.p}</p>`);
    if (block.ul) parts.push(`    <ul>\n${bullets(block.ul)}\n    </ul>`);
    if (block.ol) parts.push(`    <ol>\n${bullets(block.ol)}\n    </ol>`);
    if (block.table) {
      const head = block.table[0].map((h) => `<th>${h}</th>`).join("");
      const rows = block.table
        .slice(1)
        .map((row) => `        <tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
        .join("\n");
      parts.push(`    <table>\n      <thead><tr>${head}</tr></thead>\n      <tbody>\n${rows}\n      </tbody>\n    </table>`);
    }
    if (block.code) {
      parts.push(
        `    <div class="code-head"><span class="method">${block.code.method || "CODE"}</span><code>${block.code.label || ""}</code></div>\n    <pre class="docs-code" data-lang="${block.code.lang || "bash"}"><code>${block.code.text}</code></pre>`
      );
    }
  }
  if (page.related && page.related.length) {
    const items = page.related.map(([label, href]) => `      <li><a href="${href}">${label}</a></li>`).join("\n");
    parts.push(`    <h2>Related</h2>\n    <ul>\n${items}\n    </ul>`);
  }
  return normalizeHrefs(parts.join("\n"), page.file);
}

const GETTING_STARTED_SIDEBAR = [
  ["Overview", "getting-started/index.html"],
  ["Quickstart", "getting-started/quickstart.html"],
  ["Create an account", "getting-started/create-account.html"],
  ["Create an API key", "getting-started/create-api-key.html"],
  ["First request", "getting-started/first-request.html"],
  ["First transaction", "getting-started/first-transaction.html"],
  ["Test environment", "getting-started/test-environment.html"],
  ["Production checklist", "getting-started/production-checklist.html"],
];

const CONCEPTS_SIDEBAR = [
  ["Overview", "concepts/index.html"],
  ["Architecture", "concepts/architecture.html"],
  ["Reconciliation", "concepts/reconciliation.html"],
  ["Transaction lifecycle", "concepts/transaction-lifecycle.html"],
  ["Idempotency", "concepts/idempotency.html"],
  ["Tenants", "concepts/tenants.html"],
  ["Anomalies", "concepts/anomalies.html"],
  ["Audit trails", "concepts/audit-trails.html"],
];

const API_SIDEBAR = [
  ["Overview", "api/index.html"],
  ["Authentication", "api/authentication.html"],
  ["Pagination", "api/pagination.html"],
  ["Versioning", "api/versioning.html"],
  ["Rate limits", "api/rate-limits.html"],
  ["Idempotency", "api/idempotency.html"],
  ["Errors", "api/errors.html"],
];

const WEBHOOKS_SIDEBAR = [
  ["Overview", "webhooks/index.html"],
  ["Event catalog", "webhooks/event-catalog.html"],
  ["Verification", "webhooks/verification.html"],
  ["Retries", "webhooks/retries.html"],
];

const SECURITY_SIDEBAR = [
  ["Overview", "security/index.html"],
  ["Tenant isolation", "security/tenant-isolation.html"],
  ["Responsible disclosure", "security/responsible-disclosure.html"],
];

const crumb = (...parts) =>
  parts
    .filter(Boolean)
    .map(
      ([label, href]) =>
        href ? `<a href="${href}">${label}</a><span aria-hidden="true">/</span>` : `<span>${label}</span>`
    )
    .join("\n          ");

const pages = [
  {
    file: "getting-started/index.html",
    path: "/getting-started/",
    section: "Getting started",
    title: "Getting started",
    description: "Provisioning, first requests, the staging deployment and what changes for production.",
    status: "Live",
    lede: "Access to PesaGuard is provisioned with the pilot team because the reconciliation scope is agreed per operation. These pages take you from a running deployment to a production-ready configuration.",
    sidebar: sidebarFor("Getting started", "getting-started/index.html", GETTING_STARTED_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Getting started"], null),
    blocks: [
      { p: "Start with the <a href=\"quickstart.html\">quickstart</a>: one health check and one OpenAPI read against a running deployment. Then <a href=\"first-request.html\">your first authenticated request</a> introduces the bearer-token pattern and the scope model that governs everything else." },
      {
        table: [
          ["Page", "What it covers"],
          ["<a href=\"quickstart.html\">Quickstart</a>", "Health check and the OpenAPI contract the service publishes."],
          ["<a href=\"create-account.html\">Create an account</a>", "What provisioning covers: a tenant, a Daraja flow, dashboard users, a plan."],
          ["<a href=\"create-api-key.html\">Create an API key</a>", "Scopes, expiry, rotation metadata and handling rules."],
          ["<a href=\"first-request.html\">First request</a>", "Bearer auth and the error an unauthenticated call returns."],
          ["<a href=\"first-transaction.html\">First transaction</a>", "A payment becoming a matched record, end to end."],
          ["<a href=\"test-environment.html\">Test environment</a>", "The staging variant: its own database and Kafka listeners."],
          ["<a href=\"production-checklist.html\">Production checklist</a>", "Required settings and the pre-go-live review."],
        ],
      },
      {
        note: ["Scope, up front", "PesaGuard reconciles M-Pesa (Safaricom Daraja) only today. Airtel Money, bank rails and point-of-sale feeds are planned with no adapter yet: the integration pages label them accordingly."],
        noteTone: "warn",
      },
    ],
    related: [["Concepts", "concepts/index.html"], ["API reference", "api/index.html"]],
  },

  {
    file: "getting-started/first-transaction.html",
    path: "/getting-started/first-transaction.html",
    section: "Getting started",
    title: "First transaction",
    description: "Follow one M-Pesa payment from callback to matched record, and what each state means on the way.",
    status: "Live",
    lede: "A payment becomes a PesaGuard record in three steps: the callback is received and validated, the match is decided against your internal records, and the outcome keeps its evidence.",
    sidebar: sidebarFor("Getting started", "getting-started/first-transaction.html", GETTING_STARTED_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Getting started", "index.html"], ["First transaction"], null),
    blocks: [
      {
        h2: "1 · The callback arrives",
        p: "Safaricom Daraja delivers a callback to your deployment. Ingestion validates the payload, normalizes it into the canonical payment-event shape, and de-duplicates it on write.",
        ul: [
          "Invalid payloads are quarantined with the reason: never dropped silently.",
          "A provider retry of the same event is rejected by idempotency, not processed twice.",
        ],
      },
      {
        h2: "2 · The match is decided",
        p: "The event is compared against internal records on amount, reference and a timestamp tolerance. Deterministic rules mean the same inputs always produce the same outcome.",
        ul: [
          "Matched: the record carries the evidence that produced the decision.",
          "Difference found: an exception is raised with the delta shown.",
          "No candidate: the payment queues as unmatched with the reason attached.",
        ],
      },
      {
        h2: "3 · The outcome is recorded",
        p: "Every outcome is written to the append-only audit trail with its actor and tenant. A reviewer resolving an exception records the decision and the reason, which keeps month-end explainable.",
      },
      { note: ["Where to see it", "The dashboard surfaces live flow, the exception queue and per-transaction state. The ops API exposes the same data for integrations: see the API section."] },
    ],
    related: [["Reconciliation concept", "concepts/reconciliation.html"], ["Idempotency", "concepts/idempotency.html"], ["Audit trails", "concepts/audit-trails.html"]],
  },

  {
    file: "concepts/index.html",
    path: "/concepts/",
    section: "Concepts",
    title: "Concepts",
    description: "The ideas PesaGuard is built on: deterministic matching, idempotent writes, enforced tenants and append-only evidence.",
    status: "Live",
    lede: "Five ideas carry the whole platform. Understand them and every page in this documentation becomes predictable.",
    sidebar: sidebarFor("Concepts", "concepts/index.html", CONCEPTS_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Concepts"], null),
    blocks: [
      {
        table: [
          ["Concept", "In one line"],
          ["<a href=\"architecture.html\">Architecture</a>", "Ingest, validate, reconcile, analyze, alert, resolve, report."],
          ["<a href=\"reconciliation.html\">Reconciliation</a>", "Deterministic matching with exceptions instead of silence."],
          ["<a href=\"transaction-lifecycle.html\">Transaction lifecycle</a>", "The states a payment moves through, and what each means."],
          ["<a href=\"idempotency.html\">Idempotency</a>", "A retry never becomes a second financial record."],
          ["<a href=\"tenants.html\">Tenants</a>", "Database-enforced boundaries, measured with zero leakage."],
          ["<a href=\"anomalies.html\">Anomalies</a>", "Named signals to review: never automatic verdicts."],
          ["<a href=\"audit-trails.html\">Audit trails</a>", "Append-only evidence for every decision."],
        ],
      },
      { p: "The reference workflow every capability follows: authenticate the caller or verify the provider signature, resolve tenant identity, validate and normalize, enforce idempotency, persist the durable record and audit event in one transaction, publish through the outbox, then reconcile, notify, measure and expose a traceable result." },
    ],
    related: [["Getting started", "getting-started/index.html"], ["API reference", "api/index.html"]],
  },

  {
    file: "concepts/architecture.html",
    path: "/concepts/architecture.html",
    section: "Concepts",
    title: "Architecture",
    description: "The services behind PesaGuard: Flask and SQLAlchemy API, Postgres store, Redis and RQ workers, Kafka transport, Alembic migrations.",
    status: "Live",
    lede: "PesaGuard runs a Flask and SQLAlchemy backend on PostgreSQL, with Redis and RQ for asynchronous work, Kafka for event transport, and Alembic for schema migration.",
    sidebar: sidebarFor("Concepts", "concepts/architecture.html", CONCEPTS_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Concepts", "index.html"], ["Architecture"], null),
    blocks: [
      {
        table: [
          ["Component", "Role"],
          ["Flask + SQLAlchemy API", "Operational and dashboard endpoints; publishes its own OpenAPI document."],
          ["PostgreSQL", "Production store. Tenant predicates are enforced here, not in application code."],
          ["Redis + RQ", "Asynchronous work and bounded retries."],
          ["Kafka", "Event transport between ingestion, reconciliation and notification stages."],
          ["Alembic", "Schema migrations with deliberate compatibility paths."],
        ],
      },
      {
        ul: [
          "<strong>Durability first</strong>: work is acknowledged only after the required durable state or idempotency record is written.",
          "<strong>Safe failure</strong>: transient failures retry with bounded backoff; exhausted work is dead-lettered, never discarded.",
          "<strong>Evidence by default</strong>: correlation IDs, structured logs, metrics and append-only audit events explain what happened.",
        ],
      },
      { note: ["Single-rail scope", "The ingestion pipeline, webhook validators and Daraja auth client are M-Pesa-specific today. Other rails are named on the roadmap and marked planned wherever they appear."] },
    ],
    related: [["Tenants", "concepts/tenants.html"], ["Idempotency", "concepts/idempotency.html"], ["Environments", "environments/index.html"]],
  },

  {
    file: "concepts/reconciliation.html",
    path: "/concepts/reconciliation.html",
    section: "Concepts",
    title: "Reconciliation",
    description: "How deterministic matching pairs provider events with internal records, and what happens to a difference.",
    status: "Live",
    lede: "Reconciliation pairs each Daraja callback with the internal record it belongs to, using amount, reference and a timestamp tolerance. The same inputs produce the same outcome: which is what makes a result explainable months later.",
    sidebar: sidebarFor("Concepts", "concepts/reconciliation.html", CONCEPTS_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Concepts", "index.html"], ["Reconciliation"], null),
    blocks: [
      {
        ul: [
          "<strong>Match keys</strong>: amount, reference and timestamp tolerance, configured per flow. Tolerance is a setting, not a hidden constant, because provider and ledger clocks rarely agree to the second.",
          "<strong>Differences are first-class</strong>: a KES 500 amount mismatch is not smoothed over; it becomes an exception with the delta stated.",
          "<strong>Exceptions carry reasons</strong>: unmatched, amount-mismatch and reference-not-found each raise with its own reason attached.",
          "<strong>Safe to re-run</strong>: idempotency at the write means replays and provider retries never double-count.",
        ],
      },
      {
        h2: "What happens to an exception",
        p: "Exceptions queue with the transaction, the provider event and the reason. A reviewer resolves with a written decision, and the outcome lands in the append-only trail.",
        ol: [
          "Queue ordered by severity and age.",
          "Reviewer accepts, rejects or escalates: with a reason.",
          "Outcome recorded; reports read the reconciled result, not a parallel export.",
        ],
      },
      { note: ["M-Pesa only today", "Matching runs on Daraja callbacks in the pilot deployment. Airtel Money, bank rails and point-of-sale have no adapter yet and are marked planned across these docs."] },
    ],
    related: [["Transaction lifecycle", "concepts/transaction-lifecycle.html"], ["Idempotency", "concepts/idempotency.html"], ["First transaction", "getting-started/first-transaction.html"]],
  },

  {
    file: "concepts/transaction-lifecycle.html",
    path: "/concepts/transaction-lifecycle.html",
    section: "Concepts",
    title: "Transaction lifecycle",
    description: "The states a payment moves through from callback to reconciled record, and what each state tells your team.",
    status: "Draft",
    lede: "Every payment moves through a small set of states. The state names what has been proven so far: and the next state is only reached when its precondition holds.",
    sidebar: sidebarFor("Concepts", "concepts/transaction-lifecycle.html", CONCEPTS_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Concepts", "index.html"], ["Transaction lifecycle"], null),
    blocks: [
      {
        table: [
          ["State", "Meaning"],
          ["Received", "A callback arrived and passed validation; duplicates were rejected on write."],
          ["Matched", "A deterministic pairing exists against an internal record, with evidence retained."],
          ["Unmatched", "No internal candidate was found; the payment queues with the reason."],
          ["Exception", "A difference exists (amount, reference or tolerance) and awaits review."],
          ["Resolved", "A reviewer decided with a written reason; the decision is in the audit trail."],
        ],
      },
      {
        note: ["Why draft", "The state machine above describes the designed contract. Field-level names may differ in the shipped API: confirm against the OpenAPI document on your deployment before coding against statuses."],
        noteTone: "warn",
      },
    ],
    related: [["Reconciliation", "concepts/reconciliation.html"], ["Errors", "api/errors.html"]],
  },

  {
    file: "concepts/idempotency.html",
    path: "/concepts/idempotency.html",
    section: "Concepts",
    title: "Idempotency",
    description: "Why a retried callback, a replayed webhook or a manual reprocess never creates a second financial record.",
    status: "Live",
    lede: "Retries are expected in payment systems: from Daraja, from your consumers, from operators. Idempotency is enforced where writes happen, so a repeated operation is safe by construction.",
    sidebar: sidebarFor("Concepts", "concepts/idempotency.html", CONCEPTS_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Concepts", "index.html"], ["Idempotency"], null),
    blocks: [
      {
        ul: [
          "<strong>Enforced at the write</strong>: a duplicate event is rejected by the database, not by an application check that can be forgotten.",
          "<strong>Events persist before processing</strong>: so a crash between receipt and processing leaves a record, not a gap.",
          "<strong>Replay-safe operations</strong>: dead-letter replay, manual reprocessing and provider retries all run under the same rule.",
          "<strong>Acknowledge only what persisted</strong>: a success response never claims durable processing that did not happen.",
        ],
      },
      { p: "The invariant in one line: <em>the same logical event, delivered twice, produces one financial record and one audit entry.</em>" },
      { note: ["Applies everywhere", "This rule governs Daraja callbacks, outbound webhook delivery, outbox publishing and operator actions alike."] },
    ],
    related: [["Architecture", "concepts/architecture.html"], ["Webhook retries", "webhooks/retries.html"], ["Reconciliation", "concepts/reconciliation.html"]],
  },

  {
    file: "concepts/tenants.html",
    path: "/concepts/tenants.html",
    section: "Concepts",
    title: "Tenants",
    description: "Database-enforced isolation between organizations, measured across 100 tenants with zero cross-tenant rows.",
    status: "Live",
    lede: "Every query, mutation, export, cache key, event and audit record carries an authorized tenant scope: enforced at the database layer, so application mistakes cannot leak one organization's data into another's view.",
    sidebar: sidebarFor("Concepts", "concepts/tenants.html", CONCEPTS_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Concepts", "index.html"], ["Tenants"], null),
    blocks: [
      {
        ul: [
          "<strong>Tenant predicates are part of the data access</strong>: a query without an authorized tenant resolves to nothing, not to everything.",
          "<strong>IDs are not globally trusted</strong>: detail lookups must include tenant and account predicates.",
          "<strong>Measured, not assumed</strong>: the committed load test exercised 100 tenants concurrently and recorded zero cross-tenant rows.",
        ],
      },
      { p: "The reason this lives in the database rather than the application: handlers change constantly, and one missed check is enough to leak data. A boundary that only protects reads is not a boundary: isolation covers writes, exports, cache keys, events and replays too." },
      { note: ["Undocumented bypasses are excluded", "There are no unscoped cross-tenant access paths or administrative bypasses in the design baseline. Explicitly scoped administrative paths, where they exist, are themselves recorded."] },
    ],
    related: [["Tenant isolation (security)", "security/tenant-isolation.html"], ["Authentication", "api/authentication.html"], ["Audit trails", "concepts/audit-trails.html"]],
  },

  {
    file: "concepts/anomalies.html",
    path: "/concepts/anomalies.html",
    section: "Concepts",
    title: "Anomalies",
    description: "Rule-based and statistical signals scored in context: a prompt to review, never an automatic verdict.",
    status: "Live",
    lede: "An anomaly is a named signal, not a verdict. Velocity spikes, amount deviations, duplicate references and timing patterns are scored against the behaviour they came from, and a human decides what happens next.",
    sidebar: sidebarFor("Concepts", "concepts/anomalies.html", CONCEPTS_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Concepts", "index.html"], ["Anomalies"], null),
    blocks: [
      {
        ul: [
          "<strong>Signals are named</strong>: each flag states the pattern behind it: amount outside the typical range, N transactions from one account in M minutes, a reference seen before.",
          "<strong>Context beats thresholds</strong>: a large payment is not a problem on its own; it is scored against the account and channel behaviour.",
          "<strong>Review stays with people</strong>: a flag queues a transaction with severity and reason. PesaGuard does not auto-declare fraud, and blocking, if any, is your recorded decision.",
        ],
      },
      { p: "Today this is explicit rules plus statistical checks. These pages describe it that way rather than implying a machine-learning model that has not shipped." },
    ],
    related: [["Fraud detection", "concepts/fraud-detection.html"], ["Real-time alerts", "webhooks/index.html"], ["Audit trails", "concepts/audit-trails.html"]],
  },

  {
    file: "concepts/fraud-detection.html",
    path: "/concepts/fraud-detection.html",
    section: "Concepts",
    title: "Fraud detection",
    description: "How signals become investigations, and why the platform never declares fraud on its own.",
    status: "Live",
    lede: "Fraud detection distinguishes anomaly from suspicion from confirmed fraud. PesaGuard's job is the first two (surfaced quickly, with reasons) while the third stays a recorded human decision.",
    sidebar: sidebarFor("Concepts", "concepts/fraud-detection.html", CONCEPTS_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Concepts", "index.html"], ["Fraud detection"], null),
    blocks: [
      {
        ol: [
          "A signal raises: named pattern, severity, transaction context.",
          "The right owner is reached through configured channels, with delivery attempts observable.",
          "A reviewer investigates and decides; the decision and reason land in the append-only trail.",
        ],
      },
      {
        note: ["No black boxes", "Automatic blocking converts a suspicion into a customer-facing event. PesaGuard treats a high score as a prompt to look, and keeps the evidence needed to justify whatever is decided."],
        noteTone: "warn",
      },
    ],
    related: [["Anomalies", "concepts/anomalies.html"], ["Audit trails", "concepts/audit-trails.html"], ["Alert routing", "webhooks/index.html"]],
  },

  {
    file: "concepts/audit-trails.html",
    path: "/concepts/audit-trails.html",
    section: "Concepts",
    title: "Audit trails",
    description: "Append-only evidence for every match, review and configuration change: with secrets excluded by design.",
    status: "Live",
    lede: "Every match, exception, review and configuration change is written to an append-only record that carries its actor, tenant and reason. Entries are added, never rewritten.",
    sidebar: sidebarFor("Concepts", "concepts/audit-trails.html", CONCEPTS_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Concepts", "index.html"], ["Audit trails"], null),
    blocks: [
      {
        ul: [
          "<strong>Decisions keep their reason</strong>: accept, reject or escalate is stored with the actor and the transaction context.",
          "<strong>History survives turnover</strong>: institutional knowledge stays queryable when the team changes.",
          "<strong>Secrets are excluded</strong>: tokens, keys and credentials never enter audit entries; sensitive fields are redacted at logging boundaries.",
        ],
      },
      { p: "An audit-ready trail needs three properties more than it needs volume: entries can only be added, each entry identifies who did what, and each entry traces back to the transaction that caused it." },
    ],
    related: [["Tenants", "concepts/tenants.html"], ["Compliance", "security/index.html"], ["Reporting", "api/index.html"]],
  },

  {
    file: "api/index.html",
    path: "/api/",
    section: "API",
    title: "API reference",
    description: "The operations API surface: bearer auth, pagination, versioning, rate limits, idempotency and the error envelope.",
    status: "Live",
    lede: "The service publishes its own OpenAPI 3.0.3 document at <code>/openapi.json</code>; these pages explain the behaviour around it. The base path for public routes is <code>/api/v1</code> unless a documented compatibility alias exists.",
    sidebar: sidebarFor("API", "api/index.html", API_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["API"], null),
    blocks: [
      {
        code: { method: "GET", label: "/openapi.json", lang: "bash", text: "curl -sS \"$PESAGUARD_API_URL/openapi.json\" | python -m json.tool | head" },
      },
      {
        table: [
          ["Topic", "Page"],
          ["<a href=\"authentication.html\">Authentication</a>", "Bearer tokens, scopes, tenant claims."],
          ["<a href=\"pagination.html\">Pagination</a>", "Page and limit parameters, list metadata."],
          ["<a href=\"versioning.html\">Versioning</a>", "The /v1 namespace and the 90-day deprecation policy."],
          ["<a href=\"rate-limits.html\">Rate limits</a>", "Bounded request rates and 429 handling."],
          ["<a href=\"idempotency.html\">Idempotency</a>", "Safe retries for every write."],
          ["<a href=\"errors.html\">Errors</a>", "The normalized error envelope and status codes."],
        ],
      },
      { p: "A static copy of the contract lives at <a href=\"../api-reference/openapi.json\">api-reference/openapi.json</a>. The running deployment is authoritative if the two ever differ." },
    ],
    related: [["Webhooks", "webhooks/index.html"], ["Security", "security/index.html"]],
  },

  {
    file: "api/errors.html",
    path: "/api/errors.html",
    section: "API",
    title: "Errors",
    description: "The normalized error envelope, status codes, and how clients should react to each class.",
    status: "Live",
    lede: "Every failure returns the same shape: a code, a human message, and a request id you can quote back to the team that runs the deployment.",
    sidebar: sidebarFor("API", "api/errors.html", API_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["API", "index.html"], ["Errors"], null),
    blocks: [
      {
        code: { method: "4XX", label: "error envelope", lang: "json", text: '{\n  "error": {\n    "code": "TRANSACTION_NOT_FOUND",\n    "message": "Transaction could not be found.",\n    "request_id": "&lt;uuid&gt;"\n  }\n}' },
      },
      {
        table: [
          ["Status", "Client behaviour"],
          ["400 / 422", "Fix the request. Validation details name the field."],
          ["401", "Authentication failed. Refresh or reissue the token."],
          ["403", "Authenticated, but the scope or tenant does not permit this."],
          ["404", "Not found within the caller's tenant scope."],
          ["409", "Conflict: usually a duplicate under idempotency. Safe to re-read."],
          ["429", "Rate limited. Back off; see rate limits."],
          ["500 / 502 / 503 / 504", "Server or gateway problem. Retry with backoff; quote the request id."],
        ],
      },
      { note: ["Quote the request id", "Every error carries a request_id. Include it in support conversations: it is the correlation key the operator can search for."] },
    ],
    related: [["Rate limits", "api/rate-limits.html"], ["Idempotency", "api/idempotency.html"]],
  },

  {
    file: "api/authentication.html",
    path: "/api/authentication.html",
    section: "API",
    title: "Authentication",
    description: "Bearer JWT authentication, the scope model, and what login returns in the design contract.",
    status: "Draft",
    lede: "Server access uses bearer JWTs carrying issuer, audience and tenant claims; session access uses the dashboard's authenticated session. Tokens are scoped, expiring and rotatable.",
    sidebar: sidebarFor("API", "api/authentication.html", API_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["API", "index.html"], ["Authentication"], null),
    blocks: [
      { code: { method: "POST", label: "/api/v1/auth/login", lang: "json", text: '{\n  "email": "user@example.com",\n  "password": "secret"\n}' } },
      { p: "The design contract returns an access token, a refresh token, the token type, expiry, the user record and the caller's permission set (for example <code>dashboard:read</code>, <code>transactions:read</code>). Login failures return <code>401</code>; a locked account returns <code>423</code>; excessive attempts return <code>429</code>." },
      { note: ["Why draft", "This login contract is the documented public contract in the repository, not a behaviour this docs build has exercised against a live deployment. Confirm field names against /openapi.json on your deployment before integrating."], noteTone: "warn" },
    ],
    related: [["Tenants", "concepts/tenants.html"], ["Errors", "api/errors.html"]],
  },

  {
    file: "api/pagination.html",
    path: "/api/pagination.html",
    section: "API",
    title: "Pagination",
    description: "Page and limit parameters with list metadata on every paginated response.",
    status: "Draft",
    lede: "List endpoints return items plus metadata so clients can size their loops instead of guessing.",
    sidebar: sidebarFor("API", "api/pagination.html", API_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["API", "index.html"], ["Pagination"], null),
    blocks: [
      { code: { method: "200", label: "list envelope", lang: "json", text: '{\n  "items": [],\n  "page": 1,\n  "limit": 25,\n  "total": 0,\n  "total_pages": 0\n}' } },
      { p: "Pass <code>page</code> and <code>limit</code> as query parameters; treat <code>total_pages</code> as the loop bound rather than paginating until an empty page. Filtering and sorting parameters, where supported, are documented per endpoint in the OpenAPI contract." },
    ],
    related: [["Errors", "api/errors.html"], ["API overview", "api/index.html"]],
  },

  {
    file: "api/versioning.html",
    path: "/api/versioning.html",
    section: "API",
    title: "Versioning",
    description: "The /v1 namespace, the 90-day deprecation policy, and how breaking changes are introduced.",
    status: "Live",
    lede: "All public routes belong under a versioned namespace (/api/v1) unless a documented compatibility alias exists.",
    sidebar: sidebarFor("API", "api/versioning.html", API_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["API", "index.html"], ["Versioning"], null),
    blocks: [
      { ul: [
        "A version remains supported for at least <strong>90 days</strong> after a deprecation notice is published.",
        "Breaking changes require a new versioned route prefix: never a silent shape change in place.",
        "Deprecations are announced in release notes and in the OpenAPI specification itself.",
      ] },
    ],
    related: [["Errors", "api/errors.html"], ["Status", "status/index.html"]],
  },

  {
    file: "api/rate-limits.html",
    path: "/api/rate-limits.html",
    section: "API",
    title: "Rate limits",
    description: "Bounded request rates, 429 handling, and why limits protect the reconciliation pipeline.",
    status: "Draft",
    lede: "Rate limits exist to protect durability: a flood of writes must never be served at the cost of reconciliation correctness.",
    sidebar: sidebarFor("API", "api/rate-limits.html", API_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["API", "index.html"], ["Rate limits"], null),
    blocks: [
      { ul: [
        "Exceeding a limit returns <code>429</code> with the standard error envelope.",
        "Back off and retry; retries are safe because writes are idempotent.",
        "Numeric limits are deployment configuration, not documentation constants: ask the operator for the values that apply to your tenant.",
      ] },
      { note: ["Why draft", "The principle is shipped policy; the numbers are deployment-specific and are deliberately not published here so this page cannot drift from reality."], noteTone: "warn" },
    ],
    related: [["Errors", "api/errors.html"], ["Idempotency", "api/idempotency.html"]],
  },

  {
    file: "api/idempotency.html",
    path: "/api/idempotency.html",
    section: "API",
    title: "Idempotency",
    description: "Safe retries for every write: the same logical event delivered twice produces one record.",
    status: "Live",
    lede: "A retry must be safe to run more than once: that is an interface invariant, not a client courtesy.",
    sidebar: sidebarFor("API", "api/idempotency.html", API_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["API", "index.html"], ["Idempotency"], null),
    blocks: [
      { ul: [
        "Provider callbacks, webhook deliveries and operator actions all run under the same rule.",
        "A conflict on a duplicate returns <code>409</code>; the original record stays authoritative.",
        "Replaying from a dead letter is supported and equally safe.",
      ] },
      { p: "Full treatment: <a href=\"../concepts/idempotency.html\">Concepts · Idempotency</a>." },
    ],
    related: [["Concepts: Idempotency", "concepts/idempotency.html"], ["Errors", "api/errors.html"]],
  },

  {
    file: "webhooks/index.html",
    path: "/webhooks/",
    section: "Webhooks",
    title: "Webhook delivery",
    description: "Signed outbound events with bounded retries and a dead-letter path you can inspect and replay.",
    status: "Live",
    lede: "Outbound webhooks carry exceptions and notifications to systems you run. Every delivery is signed, retried on failure with bounded backoff, and dead-lettered when exhausted: never silently dropped.",
    sidebar: sidebarFor("Webhooks", "webhooks/index.html", WEBHOOKS_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Webhooks"], null),
    blocks: [
      { ul: [
        "<strong>Signed by default</strong>: consumers verify the sender before trusting the payload.",
        "<strong>Attempts are recorded</strong>: delivery history per event, with outcomes.",
        "<strong>Exhausted deliveries are retained</strong>: dead letters stay visible for investigation and replay.",
        "<strong>Replay is safe</strong>: idempotency applies to delivery exactly as it does to ingestion.",
      ] },
      { p: "The ops API exposes webhook delivery events (event id, type, source, received and processing times, status, HTTP status, retry count, error and the related transaction) under the integrations scopes: see <a href=\"../api/index.html\">the API reference</a> and the contract at <a href=\"../api-reference/openapi.json\">api-reference/openapi.json</a>." },
    ],
    related: [["Event catalog", "webhooks/event-catalog.html"], ["Verification", "webhooks/verification.html"], ["Retries", "webhooks/retries.html"]],
  },

  {
    file: "webhooks/event-catalog.html",
    path: "/webhooks/event-catalog.html",
    section: "Webhooks",
    title: "Event catalog",
    description: "The event families that flow through the platform, and where each one is produced.",
    status: "Draft",
    lede: "Events come from the reconciliation pipeline and the operations surface. The catalog below names the families; exact payload schemas come from the OpenAPI document on your deployment.",
    sidebar: sidebarFor("Webhooks", "webhooks/event-catalog.html", WEBHOOKS_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Webhooks", "index.html"], ["Event catalog"], null),
    blocks: [
      {
        table: [
          ["Family", "Produced when"],
          ["Delivery events", "A Daraja callback is received, processed, retried or dead-lettered."],
          ["Reconciliation outcomes", "A match is decided, or an exception is raised and resolved."],
          ["Anomaly signals", "A rule or statistical check flags a transaction for review."],
          ["Notification events", "An alert is routed to SMS, email, Slack or a webhook consumer."],
        ],
      },
      { note: ["Why draft", "Field-level event schemas are still being stabilized. Subscribe to the OpenAPI document rather than hard-coding payload shapes."], noteTone: "warn" },
    ],
    related: [["Delivery overview", "webhooks/index.html"], ["Concepts: transaction lifecycle", "concepts/transaction-lifecycle.html"]],
  },

  {
    file: "webhooks/verification.html",
    path: "/webhooks/verification.html",
    section: "Webhooks",
    title: "Verification",
    description: "Verify the sender before you trust the payload: signature checks on every delivery.",
    status: "Draft",
    lede: "Every outbound delivery is signed. Your consumer should reject any delivery whose signature does not verify: the signature is what turns an HTTP POST into a trustworthy event.",
    sidebar: sidebarFor("Webhooks", "webhooks/verification.html", WEBHOOKS_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Webhooks", "index.html"], ["Verification"], null),
    blocks: [
      { ol: [
        "Read the signature header from the delivery.",
        "Recompute the signature over the raw body using your shared secret.",
        "Compare with a constant-time comparison; reject on mismatch with 401.",
        "Only then parse the body and act: and act idempotently.",
      ] },
      { note: ["Why draft", "The signing scheme (header name, algorithm, key rotation) is finalized with each pilot integration. Confirm the exact mechanism with the operator before shipping a consumer."], noteTone: "warn" },
    ],
    related: [["Retries", "webhooks/retries.html"], ["Idempotency", "concepts/idempotency.html"]],
  },

  {
    file: "webhooks/retries.html",
    path: "/webhooks/retries.html",
    section: "Webhooks",
    title: "Retries and dead letters",
    description: "Bounded backoff, visible attempt history, dead-letter retention and safe replay.",
    status: "Live",
    lede: "Transient failures are retried with bounded backoff. When retries are exhausted the delivery moves to the dead-letter path, where it stays visible and replayable: a failed delivery never disappears.",
    sidebar: sidebarFor("Webhooks", "webhooks/retries.html", WEBHOOKS_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Webhooks", "index.html"], ["Retries"], null),
    blocks: [
      { ul: [
        "Each attempt is recorded with its outcome, so you can answer what was sent and when.",
        "Exhausted deliveries are dead-lettered and retained for investigation.",
        "Replay from the dead letter is safe: idempotency applies to delivery like everything else.",
        "Retry schedules are bounded on purpose; unbounded retries only hide an outage.",
      ] },
      { p: "The ops API surfaces these delivery events with retry counts and error details under the <code>integrations:read</code> scope." },
    ],
    related: [["Delivery overview", "webhooks/index.html"], ["Idempotency", "concepts/idempotency.html"]],
  },

  {
    file: "security/index.html",
    path: "/security/",
    section: "Security",
    title: "Security",
    description: "The layers between a request and a record: authentication, authorization, tenant isolation, encryption and evidence.",
    status: "Live",
    lede: "Security is part of the product. Controls sit at every layer between the caller and the data, and isolation is enforced in the database so application mistakes cannot become leaks.",
    sidebar: sidebarFor("Security", "security/index.html", SECURITY_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Security"], null),
    blocks: [
      {
        table: [
          ["Layer", "Guarantee"],
          ["<a href=\"../api/authentication.html\">Authentication</a>", "Every request has a verified identity; no anonymous path to data."],
          ["Authorization", "Role-based, least-privilege; grants and revocations are recorded."],
          ["<a href=\"tenant-isolation.html\">Tenant isolation</a>", "Database-enforced predicates; 100-tenant load test, zero leakage."],
          ["Encryption", "In transit and at rest; secrets excluded from logs and audit."],
          ["Evidence", "Append-only audit trail; no secret material in entries."],
        ],
      },
      { note: ["Certifications, stated once", "No third-party security certifications are held today. These pages describe implemented controls and their evidence directly instead of borrowing credibility from badges."], noteTone: "warn" },
    ],
    related: [["Tenant isolation", "security/tenant-isolation.html"], ["Responsible disclosure", "security/responsible-disclosure.html"], ["Authentication", "api/authentication.html"]],
  },

  {
    file: "security/tenant-isolation.html",
    path: "/security/tenant-isolation.html",
    section: "Security",
    title: "Tenant isolation",
    description: "Isolation enforced at the database layer: measured across 100 tenants with zero cross-tenant rows.",
    status: "Live",
    lede: "Every tenant-owned resource is evaluated against the authenticated tenant context, down to the query predicate. A query without an authorized tenant resolves to nothing.",
    sidebar: sidebarFor("Security", "security/tenant-isolation.html", SECURITY_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Security", "index.html"], ["Tenant isolation"], null),
    blocks: [
      { ul: [
        "Covers queries, mutations, exports, cache keys, events and replays.",
        "No undocumented administrative bypasses; scoped admin paths are themselves recorded.",
        "Committed load test: 100 tenants, zero cross-tenant rows observed.",
      ] },
      { p: "Full concept treatment: <a href=\"../concepts/tenants.html\">Concepts · Tenants</a>." },
    ],
    related: [["Concepts: Tenants", "concepts/tenants.html"], ["Authentication", "api/authentication.html"]],
  },

  {
    file: "security/responsible-disclosure.html",
    path: "/security/responsible-disclosure.html",
    section: "Security",
    title: "Responsible disclosure",
    description: "How to report a suspected security issue in PesaGuard, and what happens next.",
    status: "Draft",
    lede: "If you believe you have found a security issue, tell us privately and we will treat it seriously: acknowledge, reproduce, fix, and credit you if you want.",
    sidebar: sidebarFor("Security", "security/responsible-disclosure.html", SECURITY_SIDEBAR),
    crumbs: crumb(["Docs", "index.html"], ["Security", "index.html"], ["Responsible disclosure"], null),
    blocks: [
      { ol: [
        "Open a private security advisory or issue on the <a href=\"https://github.com/Victor-Kipruto-Rop/pesaguard\">source repository</a>: do not include exploit details in a public issue.",
        "Include reproduction steps and the request id or timestamp if the issue involves API behaviour.",
        "We acknowledge receipt, then confirm or decline with reasoning.",
        "Fixes are released with a note; you may be credited unless you prefer otherwise.",
      ] },
      { note: ["Why draft", "A dedicated security contact address is pending. Until it exists, the repository's private advisory flow is the intended channel."], noteTone: "warn" },
    ],
    related: [["Security overview", "security/index.html"], ["Status", "status/index.html"]],
  },

  {
    file: "environments/index.html",
    path: "/environments/",
    section: "Environments",
    title: "Environments",
    description: "Staging and production deployment variants, and the settings each one requires.",
    status: "Live",
    lede: "PesaGuard does not ship a mocked sandbox. Staging is a real deployment with its own database and brokers; production requires its own credential set and review.",
    sidebar: null,
    crumbs: crumb(["Docs", "index.html"], ["Environments"], null),
    blocks: [
      { table: [
        ["Variant", "Purpose", "Owns"],
        ["Staging", "Integration testing against real reconciliation behaviour.", "Separate Postgres database and Kafka listeners."],
        ["Production", "The live deployment the pilot runs on.", "Production credentials, backups and review."],
      ] },
      { p: "Settings live in the git-ignored root <code>.env</code>. Validate with <code>config --quiet</code>; bring up with <code>up -d --build</code> only after reviewing the merged configuration. Full list: <a href=\"environment-variables.html\">environment variables</a>." },
    ],
    related: [["Environment variables", "environments/environment-variables.html"], ["Production checklist", "getting-started/production-checklist.html"], ["Status", "status/index.html"]],
  },

  {
    file: "environments/environment-variables.html",
    path: "/environments/environment-variables.html",
    section: "Environments",
    title: "Environment variables",
    description: "Deployment settings PesaGuard reads: database, Redis, Kafka, JWT and the public API URL.",
    status: "Live",
    lede: "These settings live in the ignored root .env: never in images, never in git.",
    sidebar: null,
    crumbs: crumb(["Docs", "index.html"], ["Environments", "index.html"], ["Environment variables"], null),
    blocks: [
      { table: [
        ["Variable", "Used by"],
        ["<code>POSTGRES_USER</code> / <code>POSTGRES_DB</code> / <code>POSTGRES_PASSWORD</code>", "Base and staging variants."],
        ["<code>DATABASE_URL_DOCKER</code>", "Base variant; container-reachable complete URL."],
        ["<code>PESAGUARD_API_URL</code>", "Public base URL for status probes and integrations."],
        ["<code>JWT_SECRET_KEY</code>", "Token signing."],
        ["<code>KAFKA_BOOTSTRAP_SERVERS_DOCKER</code> / <code>REDIS_URL_DOCKER</code>", "Base variant brokers."],
        ["<code>KAFKA_BOOTSTRAP_SERVERS_FULL</code> / <code>KAFKA_ADVERTISED_LISTENERS_FULL</code>", "Full variant (Kafka, not Redpanda)."],
        ["<code>STAGING_POSTGRES_DB</code> / <code>STAGING_KAFKA_ADVERTISED_LISTENERS</code>", "Staging variant."],
        ["<code>API_SERVER_NAME</code>", "AWS/tunnel overlays; a hostname, not a URL."],
        ["<code>CLOUDFLARE_TUNNEL_TOKEN</code>", "Tunnel overlay only."],
      ] },
      { note: ["Do not construct URLs with ${...}", "The backend treats such references literally. Write complete, URL-encoded connection strings; single-quote values containing literal dollar signs."] },
    ],
    related: [["Environments", "environments/index.html"], ["Test environment", "getting-started/test-environment.html"]],
  },

  {
    file: "status/index.html",
    path: "/status/",
    section: "Status",
    title: "Service status",
    description: "Live health of the PesaGuard services, the ops metrics endpoint, and what an incident page includes.",
    status: "Live",
    lede: "The public status site probes the API health endpoint directly: the same check the quickstart uses.",
    sidebar: null,
    crumbs: crumb(["Docs", "index.html"], ["Status"], null),
    blocks: [
      { p: "Live status: <a href=\"https://status.pesaguard.victorkipruto.com\">status.pesaguard.victorkipruto.com</a>." },
      { ul: [
        "The strip above the marketing site mirrors this state: green means the health endpoint answered.",
        "Operators read <code>/metrics</code> on the deployment for request latency, reconciliation health, queue and outbox lag, retry and dead-letter rates.",
        "Incidents state scope and duration, and are kept in history rather than pruned.",
      ] },
    ],
    related: [["Environments", "environments/index.html"], ["Webhooks", "webhooks/index.html"]],
  },

  {
    file: "guides/index.html",
    path: "/guides/",
    section: "Guides",
    title: "Guides",
    description: "Task-oriented guides, honest about what is written and what is still a design contract.",
    status: "Draft",
    lede: "Guides are written against shipped behaviour first. Where a guide would describe an unshipped capability, it is listed as planned rather than fabricated.",
    sidebar: null,
    crumbs: crumb(["Docs", "index.html"], ["Guides"], null),
    blocks: [
      { table: [
        ["Task", "Where it is covered"],
        ["Authenticate a request", "<a href=\"../getting-started/first-request.html\">First request</a>."],
        ["Follow a transaction", "<a href=\"../getting-started/first-transaction.html\">First transaction</a>."],
        ["Build a webhook consumer", "<a href=\"../webhooks/\">Webhook delivery</a> + <a href=\"../webhooks/verification.html\">verification</a>."],
        ["Handle failures", "<a href=\"../api/errors.html\">Errors</a> + <a href=\"../concepts/idempotency.html\">idempotency</a>."],
        ["Test against staging", "<a href=\"../getting-started/test-environment.html\">Test environment</a>."],
      ] },
      { note: ["Planned guides", "Per-endpoint walkthroughs (create/search transactions, reconciliation rule configuration, investigation workflow) track the public contract and will be written as it is verified against the deployment. They are deliberately not stubbed with invented payloads."], noteTone: "warn" },
    ],
    related: [["Getting started", "getting-started/index.html"], ["API reference", "api/index.html"], ["Webhooks", "webhooks/index.html"]],
  },

  {
    file: "sdks/index.html",
    path: "/sdks/",
    section: "SDKs",
    title: "SDKs",
    description: "No official SDKs today: generate a client from the OpenAPI document with any HTTP stack.",
    status: "Planned",
    lede: "There are no official PesaGuard SDKs yet. The OpenAPI document is the integration surface; any HTTP client works.",
    sidebar: null,
    crumbs: crumb(["Docs", "index.html"], ["SDKs"], null),
    blocks: [
      { code: { method: "GET", label: "generate a client", lang: "bash", text: 'curl -sS "$PESAGUARD_API_URL/openapi.json" -o openapi.json\n# example: generate a Python client\nnpx @openapitools/openapi-generator-cli generate \\\n  -i openapi.json -g python -o ./client' } },
      { p: "Official clients (Python, TypeScript, JavaScript) will follow once the v1 contract is verified in production. A client generated from the published spec is the supported path until then." },
    ],
    related: [["OpenAPI document", "api-reference/openapi.json"], ["API reference", "api/index.html"]],
  },

  {
    file: "errors/index.html",
    path: "/errors/",
    section: "Errors",
    title: "Errors and error codes",
    description: "The normalized error envelope, status classes, and how to react to each.",
    status: "Live",
    lede: "Every failure uses the same envelope: a stable code, a human message, and a request id.",
    sidebar: null,
    crumbs: crumb(["Docs", "index.html"], ["Errors"], null),
    blocks: [
      { p: "Full reference: <a href=\"../api/errors.html\">API · Errors</a>: envelope, status classes and client behaviour from 400 through 504." },
      { ul: [
        "Stable codes are part of the public contract; message copy is not.",
        "409 conflicts usually mean a duplicate under idempotency: re-read rather than re-send.",
        "Quote the request id in support conversations; it is the correlation key operators search for.",
      ] },
    ],
    related: [["API · Errors", "api/errors.html"], ["Rate limits", "api/rate-limits.html"], ["Idempotency", "api/idempotency.html"]],
  },

  {
    file: "changelog/index.html",
    path: "/changelog/",
    section: "Changelog",
    title: "Changelog",
    description: "Where changes are announced while the public changelog matures.",
    status: "Draft",
    lede: "A public changelog is not published yet. Until it exists, changes are visible where engineers already look: the source repository.",
    sidebar: null,
    crumbs: crumb(["Docs", "index.html"], ["Changelog"], null),
    blocks: [
      { ul: [
        "Commit history: <a href=\"https://github.com/Victor-Kipruto-Rop/pesaguard/commits\">github.com/Victor-Kipruto-Rop/pesaguard</a>.",
        "Deprecations follow the <a href=\"../api/versioning.html\">90-day versioning policy</a> and are announced in the OpenAPI document.",
        "This page will carry dated, human-written entries once the release cadence is public.",
      ] },
    ],
    related: [["Versioning", "api/versioning.html"], ["Status", "status/index.html"]],
  },

  {
    file: "migration/index.html",
    path: "/migration/",
    section: "Migration",
    title: "Migrations",
    description: "Schema migration discipline and the deprecation policy that governs API changes.",
    status: "Live",
    lede: "Migrations use Alembic revisions with deliberate compatibility paths; API deprecations follow the documented 90-day policy.",
    sidebar: null,
    crumbs: crumb(["Docs", "index.html"], ["Migration"], null),
    blocks: [
      { ul: [
        "<strong>Schema</strong>: Alembic revisions, safe backfills, no production schema creation outside migrations.",
        "<strong>API</strong>: breaking changes require a new versioned prefix; the previous version stays supported for at least 90 days after notice.",
        "<strong>Deprecations</strong>: announced in release notes and the OpenAPI document.",
      ] },
      { note: ["No v1-to-v2 guide yet", "The dashboard OpenAPI document is versioned 2.0.0 while the public contract remains /api/v1. A dedicated migration guide will be written when a version transition is announced."], noteTone: "warn" },
    ],
    related: [["Versioning", "api/versioning.html"], ["Changelog", "changelog/index.html"]],
  },

  {
    file: "testing/index.html",
    path: "/testing/",
    section: "Testing",
    title: "Testing",
    description: "How PesaGuard validates behaviour, and how to test your integration against staging.",
    status: "Live",
    lede: "The platform is validated with focused tests for normal paths, boundary conditions, cross-tenant isolation, retries and failure recovery. Test your integration the same way: against real staging.",
    sidebar: null,
    crumbs: crumb(["Docs", "index.html"], ["Testing"], null),
    blocks: [
      { ul: [
        "Use the <a href=\"../getting-started/test-environment.html\">staging variant</a>: same code, separate state.",
        "Drive the idempotency path: deliver the same callback twice and assert one record.",
        "Exercise failure recovery: stop a consumer, watch retries land in dead letters, replay, assert one outcome.",
        "Verify tenant scope: a request without tenant predicates must return nothing.",
      ] },
      { note: ["No mocked sandbox", "Because staging runs real reconciliation there is no magic test rail. Scope with the pilot team and keep test data in the staging database."], noteTone: "info" },
    ],
    related: [["Test environment", "getting-started/test-environment.html"], ["Idempotency", "concepts/idempotency.html"]],
  },

  {
    file: "support/index.html",
    path: "/support/",
    section: "Support",
    title: "Support",
    description: "How to reach the team: pilots are supported personally, with the source repository as the shared record.",
    status: "Draft",
    lede: "PesaGuard is deployed and supported with the pilot team. There is no ticket portal yet: the fastest paths are the source repository and the pilot conversation.",
    sidebar: null,
    crumbs: crumb(["Docs", "index.html"], ["Support"], null),
    blocks: [
      { ul: [
        "<strong>Documentation feedback</strong>: open an issue on the <a href=\"https://github.com/Victor-Kipruto-Rop/pesaguard\">source repository</a>.",
        "<strong>Production issues</strong>: quote the <code>request_id</code> from the error response; it is the correlation key operators search for.",
        "<strong>Security issues</strong>: follow <a href=\"../security/responsible-disclosure.html\">responsible disclosure</a>; use private advisories, not public issues.",
        "<strong>Status questions</strong>: check <a href=\"../status/\">status</a> first; incidents carry scope and duration.",
      ] },
    ],
    related: [["Errors", "api/errors.html"], ["Responsible disclosure", "security/responsible-disclosure.html"], ["Status", "status/index.html"]],
  },

  {
    file: "search/index.html",
    path: "/search/",
    section: "Search",
    title: "Search",
    description: "Ctrl/⌘+K filters the sidebar. Client-side only; nothing is sent anywhere.",
    status: "Live",
    lede: "Docs search filters the navigation index in the sidebar as you type: no tracking, no external service.",
    sidebar: null,
    crumbs: crumb(["Docs", "index.html"], ["Search"], null),
    blocks: [
      { ul: [
        "Press <strong>Ctrl K</strong> (or <strong>⌘ K</strong>) anywhere to focus the search box.",
        "Type to filter sidebar links across sections; Enter jumps to the first match.",
        "Search runs entirely in your browser.",
      ] },
    ],
    related: [["Documentation home", "index.html"]],
  },
];

/* ---------------------------------------------------------------------------
 * Families (repetitive leaf pages) are declared in scripts/families.js.
 * ------------------------------------------------------------------------- */

pages.push(...require("./families"));

/* ---------------------------------------------------------------------------
 * Emit.
 * ------------------------------------------------------------------------- */

let written = 0;
for (const page of pages) {
  const out = path.join(ROOT, page.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, normalizeHrefs(chrome(out, page, page.sidebar || ""), path.relative(ROOT, out)), "utf8");
  written += 1;
}
console.log(`generated ${written} pages`);

/* ---------------------------------------------------------------------------
 * Sitemap: walk every .html file actually on disk (generated + hand-authored)
 * so the sitemap can never silently drift out of sync with the site again.
 * ------------------------------------------------------------------------- */

function walkHtml(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtml(full, out);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

const siteRoot = "https://docs.pesaguard.victorkipruto.com";
const htmlFiles = walkHtml(ROOT, []).sort();
const urls = htmlFiles.map((full) => {
  const rel = path.relative(ROOT, full).split(path.sep).join("/");
  const urlPath = rel.endsWith("index.html") ? rel.slice(0, -"index.html".length) : rel;
  return `  <url><loc>${siteRoot}/${urlPath}</loc></url>`;
});
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap, "utf8");
console.log(`sitemap.xml: ${urls.length} urls`);