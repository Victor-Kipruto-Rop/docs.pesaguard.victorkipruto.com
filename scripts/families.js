/**
 * Leaf-page families for the docs tree.
 *
 * Repetitive pages (error classes, SDK languages, security layers, guide
 * subtrees) are declared as data here rather than hand-written, so every entry
 * carries a real status label and grounded description. `scripts/generate-pages.js`
 * renders these with the same chrome as the hand-written pages.
 *
 * Status labels: Live = verified against shipped behaviour; Draft = designed
 * contract, confirm against the deployment's OpenAPI document; Planned = no
 * implementation today.
 */

const crumb = (...parts) =>
  parts
    .filter(Boolean)
    .map(([label, href]) =>
      href ? `<a href="${href}">${label}</a><span aria-hidden="true">/</span>` : `<span>${label}</span>`
    )
    .join("\n          ");

const noteBlock = (status) => ({
  note: [
    "Status",
    status === "Planned"
      ? "This capability has no implementation today, and this page says so rather than implying otherwise."
      : status === "Draft"
        ? "This page documents a designed contract. Confirm the exact fields against your deployment's /openapi.json before coding against it."
        : "Verified against the shipped behaviour recorded in the repository documentation.",
  ],
  noteTone: status === "Live" ? "info" : "warn",
});

function page(file, section, title, lede, status, blocks, related) {
  return {
    file,
    path: "/" + file.replace(/index\.html$/, ""),
    section,
    title,
    lede,
    description: lede,
    status,
    sidebar: null,
    crumbs: null,
    blocks: [...(blocks || []), noteBlock(status)],
    related: related || [["Documentation home", "index.html"]],
  };
}

const API_MORE = [
  ["api/reference.html", "Reference", "The authoritative contract is the deployment's own /openapi.json; this site mirrors it.", "Live", [
    { code: { method: "GET", label: "/openapi.json", lang: "bash", text: 'curl -sS "$PESAGUARD_API_URL/openapi.json" -o openapi.json' } },
    { ul: ["Dashboard spec: OpenAPI 3.0.3, version 2.0.0.", "Public routes sit under /api/v1.", "Every error shares one envelope carrying a request id."] },
  ], [["OpenAPI document", "api-reference/openapi.json"], ["API overview", "api/index.html"]]],
  ["api/filtering.html", "Filtering", "Query parameters narrow list endpoints; exact names come from the endpoint contract.", "Live", [
    { ul: ["Filters are scoped to the caller's tenant and cannot widen it.", "Unknown parameters are ignored or rejected per endpoint: read the spec, do not assume.", "Tenant identifiers are never trusted from the client."] },
  ], [["Pagination", "api/pagination.html"], ["Sorting", "api/sorting.html"]]],
  ["api/sorting.html", "Sorting", "Where an endpoint supports ordering it is documented in its OpenAPI entry.", "Draft", [
    { p: "Treat unspecified ordering as unstable. Paginate deterministically and do not rely on insertion order surviving a filter change." },
  ], [["Pagination", "api/pagination.html"], ["Filtering", "api/filtering.html"]]],
  ["api/request-validation.html", "Request validation", "Schema, currency, amount and reference are validated before anything is trusted.", "Live", [
    { ul: ["Malformed input returns 400 or 422 with the offending field named.", "Validation runs before matching, so bad data never reaches reconciliation.", "Invalid records are never silently converted into plausible successes."] },
  ], [["Data quality concept", "concepts/reconciliation.html"], ["Errors", "api/errors.html"]]],
];

const SDK_LANGS = [
  ["sdks/curl.html", "curl", "Every example on this site runs with curl against your deployment."],
  ["sdks/python.html", "Python", "Use requests or a client generated from the OpenAPI document; no official Python SDK yet."],
  ["sdks/javascript.html", "JavaScript", "Use fetch or a generated client; no official JavaScript SDK yet."],
  ["sdks/typescript.html", "TypeScript", "Generate typed models from the OpenAPI document for compile-time safety."],
  ["sdks/java.html", "Java", "Generate a Java client from the OpenAPI document; no official SDK yet."],
];

const WEBHOOK_EVENTS = [
  ["webhooks/transaction-created.html", "transaction.created", "A payment event was accepted and validated, and is now a PesaGuard record."],
  ["webhooks/transaction-matched.html", "transaction.matched", "A deterministic pairing succeeded and the evidence is retained with the record."],
  ["webhooks/transaction-unmatched.html", "transaction.unmatched", "No internal candidate was found, so the payment queues with the reason attached."],
  ["webhooks/anomaly-detected.html", "anomaly.detected", "A named rule or statistical check flagged the transaction for human review."],
  ["webhooks/reconciliation-completed.html", "reconciliation.completed", "A reconciliation run finished, with its match and exception counts."],
];

const ERROR_CLASSES = [
  ["errors/authentication.html", "401 · Authentication", "The caller was not authenticated. Refresh or reissue the credential."],
  ["errors/authorization.html", "403 · Authorization", "Authenticated, but the scope or tenant does not permit this action."],
  ["errors/validation.html", "400 / 422 · Validation", "The request failed validation; the response names the offending field."],
  ["errors/rate-limit.html", "429 · Rate limit", "Too many requests. Back off and retry: writes are idempotent, so a retry is safe."],
  ["errors/conflict.html", "409 · Conflict", "Usually a duplicate under idempotency. Read the existing record instead of re-sending."],
  ["errors/not-found.html", "404 · Not found", "No such resource within the caller's tenant scope."],
  ["errors/server-errors.html", "5xx · Server errors", "Server or gateway failure. Retry with backoff and quote the request id to the operator."],
  ["errors/error-codes.html", "Error codes", "Stable codes are part of the public contract; message copy is not. Match on codes, never on prose."],
];

const SECURITY_LAYERS = [
  ["security/authentication.html", "Authentication", "Every request carries a verified identity: scoped bearer tokens for services, signatures for provider callbacks, sessions for people."],
  ["security/authorization.html", "Authorization", "Role-based, least-privilege authorization. Grants and revocations are themselves recorded events."],
  ["security/api-key-security.html", "API key security", "Credentials are scoped, expiring and hashed at rest, shown once at issuance. One credential per integration."],
  ["security/webhook-security.html", "Webhook security", "Outbound deliveries are signed. Consumers verify the sender and reject on mismatch before parsing."],
  ["security/encryption.html", "Encryption", "Service traffic is encrypted in transit and sensitive data at rest. Keys live outside source and rotate."],
  ["security/data-protection.html", "Data protection", "Sensitive fields are redacted at logging boundaries, secrets never enter logs or audit entries, and retention follows a documented policy."],
];

const ENVIRONMENTS = [
  ["environments/staging.html", "Staging", "A real deployment with its own database and Kafka listeners, used for integration testing."],
  ["environments/production.html", "Production", "The live deployment: production credentials, backups, reviewed exposure and the strictest change discipline."],
  ["environments/sandbox.html", "Sandbox", "There is no mocked sandbox. Staging runs the same reconciliation behaviour, which is what makes testing meaningful."],
];

const TESTING_TOPICS = [
  ["testing/sandbox-testing.html", "Testing against staging", "Scope a staging tenant, then drive the same flows production will see."],
  ["testing/test-transactions.html", "Test transactions", "Send events into staging and assert the match, the exception reason and the audit entry."],
  ["testing/webhook-testing.html", "Webhook testing", "Stand up a consumer in staging, verify the signature, force a failure and replay from the dead letter."],
  ["testing/failure-scenarios.html", "Failure scenarios", "Test duplicate delivery, malformed payloads, consumer downtime and tenant-scope violations."],
  ["testing/integration-testing.html", "Integration testing", "Test the invariants, not the happy path: one record per event, one decision per exception, zero cross-tenant reads."],
];

const CHANGELOG_ENTRIES = [
  ["changelog/breaking-changes.html", "Breaking changes", "Any breaking change ships behind a new versioned prefix, with at least 90 days of notice for the previous version."],
  ["changelog/2026/september.html", "September 2026", "This documentation site was published. No API breaking changes."],
  ["changelog/2026/august.html", "August 2026", "No public changelog entries were published for this month."],
  ["changelog/2026/july.html", "July 2026", "No public changelog entries were published for this month."],
];

const MIGRATION_TOPICS = [
  ["migration/api-v1-to-v2.html", "API v1 to v2", "No public v1-to-v2 transition has been announced. The public contract remains /api/v1; the dashboard spec is versioned 2.0.0."],
  ["migration/webhook-migrations.html", "Webhook migrations", "Consumer-affecting changes are announced through release notes and the OpenAPI document before any signature or payload change."],
  ["migration/deprecated-endpoints.html", "Deprecated endpoints", "No endpoints are deprecated today. When one is, it is listed here with its replacement and sunset date."],
];

const SUPPORT_TOPICS = [
  ["support/troubleshooting.html", "Troubleshooting", "Start with the request id, then the status classes in Errors. Most failures are scope, tenant or an unverified assumption about a payload."],
  ["support/faq.html", "FAQ", "Straight answers on scope: M-Pesa only today, no self-serve signup, no official SDKs, no certifications claimed."],
  ["support/contact.html", "Contact", "Pilots are supported personally. Use the source repository for documentation issues and private advisories for security reports."],
];

const GUIDE_TREES = [
  ["guides/authentication/", "Authentication guides", "Live", [
    ["api-keys.html", "API keys", "Scopes, expiry, rotation metadata, and one credential per integration."],
    ["bearer-tokens.html", "Bearer tokens", "The Authorization header, tenant claims, and what a rejected token returns."],
    ["oauth.html", "OAuth", "Not supported today. Service access uses scoped bearer tokens issued per deployment."],
    ["key-rotation.html", "Key rotation", "Rotate on a schedule and on suspicion; revocation takes effect immediately."],
  ]],
  ["guides/transactions/", "Transaction guides", "Live", [
    ["create-transaction.html", "Create a transaction", "The write path is documented in the OpenAPI contract: confirm the schema against your deployment."],
    ["retrieve-transaction.html", "Retrieve a transaction", "Detail lookups always include tenant predicates; IDs are not globally trusted."],
    ["search-transactions.html", "Search transactions", "Paginate deterministically and treat unspecified ordering as unstable."],
    ["transaction-status.html", "Transaction status", "See the lifecycle concept page for states and their preconditions."],
    ["handle-failures.html", "Handle failures", "Retry with backoff, match on stable codes, and quote the request id."],
  ]],
  ["guides/reconciliation/", "Reconciliation guides", "Live", [
    ["configure-reconciliation.html", "Configure reconciliation", "Match keys and timestamp tolerance are configured per flow, scoped with the pilot team."],
    ["matching-rules.html", "Matching rules", "Amount, reference and tolerance decide the outcome; the same inputs give the same result."],
    ["unmatched-transactions.html", "Unmatched transactions", "Queue with the reason attached: never silently discarded."],
    ["exceptions.html", "Exceptions", "Differences are first-class: the delta is stated and a reviewer decides with a written reason."],
    ["reconciliation-reports.html", "Reconciliation reports", "Reports read the reconciled record and its exceptions, so the queue and the numbers agree."],
  ]],
];

/* ---------------------------------------------------------------------------
 * Assemble and export.
 * ------------------------------------------------------------------------- */

const out = [];

for (const [file, title, lede, status, blocks, related] of API_MORE)
  out.push(page(file, "API", title, lede, status, blocks, related));
for (const [file, label, lede] of SDK_LANGS)
  out.push(page(file, "SDKs", label, lede, "Planned", null, [["SDKs", "sdks/index.html"], ["OpenAPI document", "api-reference/openapi.json"]]));
for (const [file, label, lede] of WEBHOOK_EVENTS)
  out.push(page(file, "Webhooks", label, lede, "Draft", [{ p: "Payload fields are still being stabilized; subscribe to the OpenAPI document rather than hard-coding shapes." }], [["Event catalog", "webhooks/event-catalog.html"], ["Verification", "webhooks/verification.html"]]));
for (const [file, label, lede] of ERROR_CLASSES)
  out.push(page(file, "Errors", label, lede, "Live", [{ p: "See <a href=\"../api/errors.html\">API · Errors</a> for the envelope and client behaviour." }], [["API · Errors", "api/errors.html"], ["Error codes", "errors/error-codes.html"]]));
for (const [file, label, lede] of SECURITY_LAYERS)
  out.push(page(file, "Security", label, lede, "Live", null, [["Security overview", "security/index.html"], ["Tenant isolation", "security/tenant-isolation.html"]]));
for (const [file, label, lede] of ENVIRONMENTS)
  out.push(page(file, "Environments", label, lede, "Live", null, [["Environments", "environments/index.html"], ["Environment variables", "environments/environment-variables.html"]]));
for (const [file, label, lede] of TESTING_TOPICS)
  out.push(page(file, "Testing", label, lede, "Live", null, [["Testing", "testing/index.html"], ["Test environment", "getting-started/test-environment.html"]]));
for (const [file, label, lede] of CHANGELOG_ENTRIES)
  out.push(page(file, "Changelog", label, lede, "Draft", null, [["Changelog", "changelog/index.html"], ["Versioning", "api/versioning.html"]]));
for (const [file, label, lede] of MIGRATION_TOPICS)
  out.push(page(file, "Migration", label, lede, "Live", null, [["Migration", "migration/index.html"], ["Versioning", "api/versioning.html"]]));
for (const [file, label, lede] of SUPPORT_TOPICS)
  out.push(page(file, "Support", label, lede, "Draft", null, [["Support", "support/index.html"], ["Errors", "api/errors.html"]]));

for (const [dir, label, treeStatus, leaves] of GUIDE_TREES) {
  out.push({
    file: `${dir}index.html`,
    path: `/${dir}`,
    section: label,
    title: label,
    lede: `${label} for PesaGuard integrations.`,
    description: `${label} for PesaGuard integrations.`,
    status: treeStatus,
    sidebar: null,
    crumbs: crumb(["Docs", "index.html"], ["Guides", "guides/index.html"], [label], null),
    blocks: [
      { table: [["Page", "Focus"]].concat(leaves.map(([f, t, l]) => [`<a href="${f}">${t}</a>`, l])) },
      noteBlock(treeStatus),
    ],
    related: [["Guides", "guides/index.html"], ["Getting started", "getting-started/index.html"]],
  });
  for (const [leaf, title, lede] of leaves) {
    out.push({
      file: `${dir}${leaf}`,
      path: `/${dir}${leaf}`,
      section: label,
      title,
      lede,
      description: lede,
      status: dir.includes("integrations") && !/M-Pesa/.test(title) ? "Planned" : "Live",
      sidebar: null,
      crumbs: crumb(["Docs", "index.html"], ["Guides", "guides/index.html"], [label, "index.html"], [title], null),
      blocks: [{ p: lede }, noteBlock(dir.includes("integrations") && !/M-Pesa/.test(title) ? "Planned" : "Live")],
      related: [[label, `${dir}index.html`], ["Guides", "guides/index.html"]],
    });
  }
}

module.exports = out;