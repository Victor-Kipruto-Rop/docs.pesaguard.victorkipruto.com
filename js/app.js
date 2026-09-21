/**
 * Shared behaviour for the static docs tree.
 *
 * - Marks the current sidebar/header link from body[data-path].
 * - Filters the sidebar while typing; Enter jumps to the first visible hit,
 *   Escape clears the filter (or leaves the field when it is empty).
 * - Ctrl/⌘+K focuses the search box from anywhere.
 * - Header gains .is-scrolled once the page is scrolled.
 * - Reveal-on-scroll via IntersectionObserver (respects reduced motion).
 * - Copy buttons on every pre.docs-code block, with a screen-reader status.
 *
 * Each feature is wired through safe() so one failing feature cannot disable
 * the others. No frameworks, no build step, no polling: everything is event-
 * or observer-driven, and the script works from file:// as well as http(s).
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var path = document.body.getAttribute("data-path") || "/";

  /* Runs one feature setup; a failure is logged and contained. */
  function safe(setup) {
    try {
      setup();
    } catch (err) {
      if (window.console && window.console.error) window.console.error("docs UI:", err);
    }
  }

  safe(function () {
    /* --- Section sidebars -------------------------------------------------
     * Pages without a static sidebar inherit the navigation defined by their
     * section landing page. Standalone home and search experiences remain
     * intentionally full-width. */

    var section = null;
    var sectionGroups = null;
    if (path.indexOf("/api/") === 0) {
      section = "/api/";
      sectionGroups = [["API", [["Overview", "index.html"], ["Authentication", "authentication.html"], ["Errors", "errors.html"], ["Filtering", "filtering.html"], ["Request validation", "request-validation.html"], ["Sorting", "sorting.html"], ["Pagination", "pagination.html"], ["Rate limits", "rate-limits.html"], ["Idempotency", "idempotency.html"], ["Versioning", "versioning.html"], ["Reference", "reference.html"]]]];
    } else if (path.indexOf("/changelog/") === 0) {
      section = "/changelog/";
      sectionGroups = [["Changelog", [["Overview", "index.html"], ["Breaking changes", "breaking-changes.html"], ["July 2026", "2026/july.html"], ["August 2026", "2026/august.html"], ["September 2026", "2026/september.html"]]]];
    } else if (path.indexOf("/environments/") === 0) {
      section = "/environments/";
      sectionGroups = [["Environments", [["Overview", "index.html"], ["Environment variables", "environment-variables.html"], ["Sandbox", "sandbox.html"], ["Staging", "staging.html"], ["Production", "production.html"]]]];
    } else if (path.indexOf("/errors/") === 0) {
      section = "/errors/";
      sectionGroups = [["Errors", [["Overview", "index.html"], ["Authentication", "authentication.html"], ["Authorization", "authorization.html"], ["Validation", "validation.html"], ["Not found", "not-found.html"], ["Conflict", "conflict.html"], ["Rate limit", "rate-limit.html"], ["Server errors", "server-errors.html"], ["Error codes", "error-codes.html"]]]];
    } else if (path.indexOf("/security/") === 0) {
      section = "/security/";
      sectionGroups = [["Security", [["Overview", "index.html"], ["Authentication", "authentication.html"], ["Authorization", "authorization.html"], ["API key security", "api-key-security.html"], ["Data protection", "data-protection.html"], ["Encryption", "encryption.html"], ["Tenant isolation", "tenant-isolation.html"], ["Webhook security", "webhook-security.html"], ["Responsible disclosure", "responsible-disclosure.html"]]]];
    }
    if (!section || !sectionGroups || document.querySelector(".docs-sidebar")) return;
    var sectionDirectory = path.replace(new RegExp("^" + section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "").replace(/[^/]*$/, "");
    var sectionDepth = sectionDirectory ? sectionDirectory.split("/").filter(Boolean).length : 0;
    var sectionPrefix = "../".repeat(sectionDepth);
    var sectionSidebar = document.createElement("aside");
    sectionSidebar.className = "docs-sidebar";
    sectionSidebar.setAttribute("aria-label", sectionGroups[0][0] + " navigation");
    sectionSidebar.innerHTML = sectionGroups.map(function (group) {
      return '<div class="docs-nav-group"><p>' + group[0] + '</p><ul>' + group[1].map(function (item) {
        return '<li><a href="' + sectionPrefix + item[1] + '">' + item[0] + '</a></li>';
      }).join("") + '</ul></div>';
    }).join("");
    var sectionShell = document.querySelector(".docs-shell");
    var sectionArticle = sectionShell && sectionShell.querySelector("article");
    if (sectionShell && sectionArticle) sectionShell.insertBefore(sectionSidebar, sectionArticle);
  });

  safe(function () {
    /* --- Webhooks sidebar ------------------------------------------------- */

    if (path.indexOf("/webhooks/") !== 0 || document.querySelector(".docs-sidebar")) return;
    var webhookDirectory = path.replace(/^\/webhooks\//, "").replace(/[^/]*$/, "");
    var webhookDepth = webhookDirectory ? webhookDirectory.split("/").filter(Boolean).length : 0;
    var webhookPrefix = "../".repeat(webhookDepth);
    var webhookLinks = [["Overview", "index.html"], ["Event catalog", "event-catalog.html"], ["Verification", "verification.html"], ["Retries", "retries.html"], ["transaction.created", "transaction-created.html"], ["transaction.matched", "transaction-matched.html"], ["transaction.unmatched", "transaction-unmatched.html"], ["reconciliation.completed", "reconciliation-completed.html"], ["anomaly.detected", "anomaly-detected.html"]];
    var webhookSidebar = document.createElement("aside");
    webhookSidebar.className = "docs-sidebar";
    webhookSidebar.setAttribute("aria-label", "Webhooks navigation");
    webhookSidebar.innerHTML = '<div class="docs-nav-group"><p>Webhooks</p><ul>' + webhookLinks.map(function (item) {
      return '<li><a href="' + webhookPrefix + item[1] + '">' + item[0] + '</a></li>';
    }).join("") + '</ul></div>';
    var webhookShell = document.querySelector(".docs-shell");
    var webhookArticle = webhookShell && webhookShell.querySelector("article");
    if (webhookShell && webhookArticle) webhookShell.insertBefore(webhookSidebar, webhookArticle);
  });

  safe(function () {
    /* --- Testing sidebar -------------------------------------------------- */

    if (path.indexOf("/testing/") !== 0 || document.querySelector(".docs-sidebar")) return;
    var testingDirectory = path.replace(/^\/testing\//, "").replace(/[^/]*$/, "");
    var testingDepth = testingDirectory ? testingDirectory.split("/").filter(Boolean).length : 0;
    var testingPrefix = "../".repeat(testingDepth);
    var testingGroups = [
      ["Testing", [["Overview", "index.html"], ["Testing against staging", "sandbox-testing.html"], ["Integration testing", "integration-testing.html"], ["Test transactions", "test-transactions.html"], ["Failure scenarios", "failure-scenarios.html"], ["Webhook testing", "webhook-testing.html"]]],
      ["Foundations", [["Staging", "../environments/staging.html"], ["Idempotency", "../concepts/idempotency.html"], ["Tenant isolation", "../concepts/tenants.html"], ["API errors", "../api/errors.html"]]]
    ];
    var testingSidebar = document.createElement("aside");
    testingSidebar.className = "docs-sidebar";
    testingSidebar.setAttribute("aria-label", "Testing navigation");
    testingSidebar.innerHTML = testingGroups.map(function (group) {
      return '<div class="docs-nav-group"><p>' + group[0] + '</p><ul>' + group[1].map(function (item) {
        return '<li><a href="' + testingPrefix + item[1] + '">' + item[0] + '</a></li>';
      }).join("") + '</ul></div>';
    }).join("");
    var testingShell = document.querySelector(".docs-shell");
    var testingArticle = testingShell && testingShell.querySelector("article");
    if (testingShell && testingArticle) testingShell.insertBefore(testingSidebar, testingArticle);
  });

  safe(function () {
    /* --- Support sidebar -------------------------------------------------- */

    if (path.indexOf("/support/") !== 0 || document.querySelector(".docs-sidebar")) return;
    var supportDirectory = path.replace(/^\/support\//, "").replace(/[^/]*$/, "");
    var supportDepth = supportDirectory ? supportDirectory.split("/").filter(Boolean).length : 0;
    var supportPrefix = "../".repeat(supportDepth);
    var supportGroups = [
      ["Support", [["Overview", "index.html"], ["FAQ", "faq.html"], ["Troubleshooting", "troubleshooting.html"], ["Contact support", "contact.html"]]],
      ["Reference", [["API errors", "../api/errors.html"], ["Service status", "https://status.pesaguard.victorkipruto.com"], ["Responsible disclosure", "../security/responsible-disclosure.html"]]]
    ];
    var supportSidebar = document.createElement("aside");
    supportSidebar.className = "docs-sidebar";
    supportSidebar.setAttribute("aria-label", "Support navigation");
    supportSidebar.innerHTML = supportGroups.map(function (group) {
      return '<div class="docs-nav-group"><p>' + group[0] + '</p><ul>' + group[1].map(function (item) {
        return '<li><a href="' + (/^https?:/.test(item[1]) ? "" : supportPrefix) + item[1] + '">' + item[0] + '</a></li>';
      }).join("") + '</ul></div>';
    }).join("");
    var supportShell = document.querySelector(".docs-shell");
    var supportArticle = supportShell && supportShell.querySelector("article");
    if (supportShell && supportArticle) supportShell.insertBefore(supportSidebar, supportArticle);
  });

  safe(function () {
    /* --- Unified footer ---------------------------------------------------
     * Normalize footer content across the static tree while preserving the
     * existing footer shell and keeping links valid from nested pages. */

    var footer = document.querySelector(".docs-footer");
    if (footer) {
      var footerDirectory = path.replace(/[^/]*$/, "");
      var footerDepth = footerDirectory ? footerDirectory.split("/").filter(Boolean).length : 0;
      var footerPrefix = "../".repeat(footerDepth);
      var footerInner = footer.querySelector(".docs-footer-inner") || footer;
      var year = new Date().getFullYear();
      footerInner.innerHTML =
        '<div class="docs-footer-brand"><a class="docs-footer-logo" href="' + footerPrefix + 'index.html"><img src="' + footerPrefix + 'assets/brand/favicon.svg" alt="" width="28" height="28"><strong>PesaGuard <small>Docs</small></strong></a><p>Financial infrastructure for transaction processing, reconciliation, fraud detection and operational visibility.</p><div class="docs-footer-meta"><span>© ' + year + ' PesaGuard. All rights reserved.</span><span>Docs v1 · API v1</span></div></div>' +
        '<div class="docs-footer-grid">' +
          '<section><h2>Documentation</h2><a href="' + footerPrefix + 'index.html">Documentation home</a><a href="' + footerPrefix + 'getting-started/">Getting started</a><a href="' + footerPrefix + 'concepts/">Concepts</a><a href="' + footerPrefix + 'concepts/architecture.html">Architecture</a><a href="' + footerPrefix + 'changelog/">Changelog</a><a href="' + footerPrefix + 'search/">Search documentation</a></section>' +
          '<section><h2>API</h2><a href="' + footerPrefix + 'api/">API overview</a><a href="' + footerPrefix + 'api/authentication.html">Authentication</a><a href="' + footerPrefix + 'guides/transactions/">Transactions</a><a href="' + footerPrefix + 'guides/reconciliation/">Reconciliation</a><a href="' + footerPrefix + 'webhooks/">Webhooks</a><a href="' + footerPrefix + 'api/errors.html">Errors</a><a href="' + footerPrefix + 'api/rate-limits.html">Rate limits</a><a href="' + footerPrefix + 'api/pagination.html">Pagination</a><a href="' + footerPrefix + 'api/idempotency.html">Idempotency</a><a href="' + footerPrefix + 'api-reference/openapi.json">API reference</a></section>' +
          '<section><h2>Developers</h2><a href="' + footerPrefix + 'sdks/">SDKs and clients</a><a href="' + footerPrefix + 'guides/">Developer guides</a><a href="' + footerPrefix + 'webhooks/">Webhook delivery</a><a href="' + footerPrefix + 'api-reference/openapi.json">OpenAPI specification</a><a href="' + footerPrefix + 'migration/">Migration guides</a><a href="' + footerPrefix + 'testing/">Testing</a><a href="' + footerPrefix + 'environments/">Environments</a></section>' +
          '<section><h2>Security &amp; support</h2><a href="' + footerPrefix + 'security/">Security overview</a><a href="' + footerPrefix + 'security/authentication.html">Authentication</a><a href="' + footerPrefix + 'security/tenant-isolation.html">Tenant isolation</a><a href="' + footerPrefix + 'security/encryption.html">Encryption</a><a href="' + footerPrefix + 'security/data-protection.html">Data protection</a><a href="' + footerPrefix + 'security/responsible-disclosure.html">Responsible disclosure</a><a href="' + footerPrefix + 'support/">Help and support</a><a href="' + footerPrefix + 'support/contact.html">Contact support</a></section>' +
        '</div>' +
        '<div class="docs-footer-status"><a href="https://status.pesaguard.victorkipruto.com"><span class="docs-status-dot" aria-hidden="true"></span><strong>All systems operational</strong><span>View system status</span></a></div>' +
        '<div class="docs-footer-utility"><span>Developer documentation for PesaGuard financial infrastructure.</span><nav aria-label="Footer utility"><a href="' + footerPrefix + 'support/">Support</a><a href="' + footerPrefix + 'security/responsible-disclosure.html">Security contact</a><a href="https://github.com/Victor-Kipruto-Rop/pesaguard">GitHub source</a><a href="https://status.pesaguard.victorkipruto.com">Status</a><a href="#main">Back to top ↑</a></nav></div>';
    }
  });

  safe(function () {
    /* --- SDK sidebar ------------------------------------------------------
     * Keep the language examples and integration foundations one click away
     * from every SDK page. */

    if (path.indexOf("/sdks/") !== 0 || document.querySelector(".docs-sidebar")) return;
    var sdkDirectory = path.replace(/^\/sdks\//, "").replace(/[^/]*$/, "");
    var sdkDepth = sdkDirectory ? sdkDirectory.split("/").filter(Boolean).length : 0;
    var sdkPrefix = "../".repeat(sdkDepth);
    var sdkGroups = [
      ["SDKs", [["Overview", "index.html"], ["OpenAPI contract", "../api-reference/openapi.json"]]],
      ["Client examples", [["curl", "curl.html"], ["JavaScript", "javascript.html"], ["TypeScript", "typescript.html"], ["Python", "python.html"], ["Java", "java.html"]]],
      ["Integration foundations", [["Authentication", "../api/authentication.html"], ["Errors", "../api/errors.html"], ["Idempotency", "../api/idempotency.html"], ["Pagination", "../api/pagination.html"]]]
    ];
    var sdkSidebar = document.createElement("aside");
    sdkSidebar.className = "docs-sidebar";
    sdkSidebar.setAttribute("aria-label", "SDK navigation");
    sdkSidebar.innerHTML = sdkGroups.map(function (group) {
      return '<div class="docs-nav-group"><p>' + group[0] + '</p><ul>' + group[1].map(function (item) {
        return '<li><a href="' + sdkPrefix + item[1] + '">' + item[0] + '</a></li>';
      }).join("") + '</ul></div>';
    }).join("");
    var sdkShell = document.querySelector(".docs-shell");
    var sdkArticle = sdkShell && sdkShell.querySelector("article");
    if (sdkShell && sdkArticle) sdkShell.insertBefore(sdkSidebar, sdkArticle);
  });

  safe(function () {
    /* --- Migration sidebar -----------------------------------------------
     * Keep migration pages connected without duplicating markup in every
     * document. The existing sidebar on the index page is left intact. */

    if (path.indexOf("/migration/") !== 0 || document.querySelector(".docs-sidebar")) return;
    var migrationDirectory = path.replace(/^\/migration\//, "").replace(/[^/]*$/, "");
    var migrationDepth = migrationDirectory ? migrationDirectory.split("/").filter(Boolean).length : 0;
    var migrationPrefix = "../".repeat(migrationDepth);
    var migrationLinks = [["Overview", "index.html"], ["API v1 to v2", "api-v1-to-v2.html"], ["Deprecated endpoints", "deprecated-endpoints.html"], ["Webhook migrations", "webhook-migrations.html"]];
    var migrationSidebar = document.createElement("aside");
    migrationSidebar.className = "docs-sidebar";
    migrationSidebar.setAttribute("aria-label", "Migration navigation");
    migrationSidebar.innerHTML = '<div class="docs-nav-group"><p>Migration</p><ul>' + migrationLinks.map(function (item) {
      return '<li><a href="' + migrationPrefix + item[1] + '">' + item[0] + '</a></li>';
    }).join("") + '</ul></div>';
    var migrationShell = document.querySelector(".docs-shell");
    var migrationArticle = migrationShell && migrationShell.querySelector("article");
    if (migrationShell && migrationArticle) migrationShell.insertBefore(migrationSidebar, migrationArticle);
  });

  safe(function () {
    /* --- Header scrolled state ------------------------------------------------
     * rAF-throttled so scrolling never queues more than one class toggle per
     * frame; synced once on load for pages opened mid-scroll. */

    var header = document.querySelector(".docs-header");
    if (header) {
      var headerTick = false;
      var syncHeaderState = function () {
        headerTick = false;
        header.classList.toggle("is-scrolled", window.scrollY > 8);
      };
      window.addEventListener("scroll", function () {
        if (!headerTick) {
          headerTick = true;
          window.requestAnimationFrame(syncHeaderState);
        }
      }, { passive: true });
      syncHeaderState();
    }
  });

  safe(function () {
    /* --- Mobile nav toggle (hamburger) --------------------------------------- */

    var navToggle = document.querySelector(".docs-nav-toggle");
    var primaryNav = document.getElementById("primary-nav");
    if (navToggle && primaryNav) {
      var closeNav = function () {
        primaryNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      };
      navToggle.addEventListener("click", function (event) {
        event.stopPropagation();
        var open = primaryNav.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      document.addEventListener("click", function (event) {
        if (!primaryNav.classList.contains("is-open")) return;
        if (primaryNav.contains(event.target) || navToggle.contains(event.target)) return;
        closeNav();
      });
      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeNav();
      });
    }
  });

  safe(function () {
    /* --- Guides sidebar ----------------------------------------------------
     * Leaf guides share one navigation map with the landing page. Inject it
     * before current-page marking so every nested page gets active state. */

    if (path.indexOf("/guides/") !== 0 || document.querySelector(".docs-sidebar")) return;
    var guideDirectory = path.replace(/^\/guides\//, "").replace(/[^/]*$/, "");
    var depth = guideDirectory ? guideDirectory.split("/").filter(Boolean).length : 0;
    var prefix = "../".repeat(depth);
    var groups = [
      ["Guides", [["Overview", "index.html"]]],
      ["Authentication", [["Authentication overview", "authentication/index.html"], ["API keys", "authentication/api-keys.html"], ["Bearer tokens", "authentication/bearer-tokens.html"], ["Key rotation", "authentication/key-rotation.html"], ["OAuth support", "authentication/oauth.html"]]],
      ["Reconciliation", [["Reconciliation overview", "reconciliation/index.html"], ["Configure reconciliation", "reconciliation/configure-reconciliation.html"], ["Matching rules", "reconciliation/matching-rules.html"], ["Unmatched transactions", "reconciliation/unmatched-transactions.html"], ["Exceptions", "reconciliation/exceptions.html"], ["Reconciliation reports", "reconciliation/reconciliation-reports.html"]]],
      ["Transactions", [["Transaction overview", "transactions/index.html"], ["Create a transaction", "transactions/create-transaction.html"], ["Retrieve a transaction", "transactions/retrieve-transaction.html"], ["Search transactions", "transactions/search-transactions.html"], ["Transaction status", "transactions/transaction-status.html"], ["Handle failures", "transactions/handle-failures.html"]]]
    ];
    var sidebar = document.createElement("aside");
    sidebar.className = "docs-sidebar";
    sidebar.setAttribute("aria-label", "Guides navigation");
    sidebar.innerHTML = groups.map(function (group) {
      return '<div class="docs-nav-group"><p>' + group[0] + '</p><ul>' + group[1].map(function (item) {
        return '<li><a href="' + prefix + item[1] + '">' + item[0] + '</a></li>';
      }).join("") + '</ul></div>';
    }).join("");
    var shell = document.querySelector(".docs-shell");
    var article = shell && shell.querySelector("article");
    if (shell && article) shell.insertBefore(sidebar, article);
  });

  safe(function () {
    /* --- Search page ------------------------------------------------------
     * Build a local documentation index from sitemap pages. It stays on the
     * current origin and falls back to curated entry points when opened from
     * a file URL or when the sitemap cannot be fetched. */

    var searchPage = document.querySelector(".search-page");
    if (!searchPage) return;
    var searchInput = document.getElementById("docs-search-page");
    var searchResults = document.getElementById("search-results");
    var searchEmpty = document.getElementById("search-empty");
    var searchStatus = document.getElementById("search-page-status");
    var clearButton = document.getElementById("search-clear");
    if (!searchInput || !searchResults || !searchStatus) return;

    var initialQuery = new URLSearchParams(window.location.search).get("q") || "";
    searchInput.value = initialQuery;
    var headerSearchInput = document.querySelector(".docs-search input");
    if (headerSearchInput) headerSearchInput.value = initialQuery;

    var root = new URL("../", window.location.href);
    var fallback = [
      ["Getting started", "getting-started/index.html", "Start an integration, create credentials and reach production readiness."],
      ["API reference", "api/index.html", "Authentication, errors, pagination, idempotency, rate limits and versioning."],
      ["Authentication", "api/authentication.html", "API keys, bearer tokens, scopes, tenant context and credential lifecycle."],
      ["Reconciliation", "concepts/reconciliation.html", "Deterministic matching, exceptions, evidence and durable outcomes."],
      ["Transaction guides", "guides/transactions/", "Create, retrieve, search, monitor and recover transaction workflows."],
      ["Migration", "migration/", "API, endpoint, schema and webhook migration procedures."],
      ["Environments", "environments/", "Sandbox, staging, production and environment-variable guidance."],
      ["Security", "security/", "Tenant isolation, authentication, data protection and webhook security."]
    ].map(function (item) { return { section: item[0], href: item[1], title: item[0], description: item[2], text: (item[0] + " " + item[2]).toLowerCase() }; });
    var catalog = fallback.slice();

    function relativeUrl(pathname) {
      return new URL(pathname.replace(/^\//, ""), root).href;
    }

    function render(query) {
      var words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      var matches = [];
      if (words.length) {
        matches = catalog.filter(function (item) {
          return words.every(function (word) { return item.text.indexOf(word) >= 0; });
        }).slice(0, 30);
      }
      searchResults.replaceChildren();
      if (!words.length) {
        searchStatus.textContent = catalog.length + " documentation areas indexed. Start typing to search.";
        searchEmpty.hidden = true;
        return;
      }
      searchStatus.textContent = matches.length + " result" + (matches.length === 1 ? "" : "s") + " for “" + query.trim() + "”.";
      searchEmpty.hidden = matches.length !== 0;
      matches.forEach(function (item) {
        var link = document.createElement("a");
        link.className = "search-result";
        link.href = item.href.indexOf("http") === 0 ? item.href : relativeUrl(item.href);
        var section = document.createElement("small");
        section.textContent = item.section;
        var title = document.createElement("strong");
        title.textContent = item.title;
        var description = document.createElement("p");
        description.textContent = item.description;
        link.append(section, title, description);
        searchResults.appendChild(link);
      });
    }

    function loadCatalog() {
      fetch("../sitemap.xml").then(function (response) {
        if (!response.ok) throw new Error("sitemap unavailable");
        return response.text();
      }).then(function (xml) {
        var doc = new DOMParser().parseFromString(xml, "application/xml");
        var locations = Array.prototype.map.call(doc.querySelectorAll("loc"), function (node) { return node.textContent; });
        return Promise.all(locations.slice(0, 140).map(function (location) {
          var pathname = new URL(location).pathname;
          return fetch(relativeUrl(pathname)).then(function (response) {
            if (!response.ok) throw new Error("page unavailable");
            return response.text();
          }).then(function (html) {
            var page = new DOMParser().parseFromString(html, "text/html");
            var title = page.querySelector("title");
            var description = page.querySelector('meta[name="description"]');
            var link = pathname.replace(/^\//, "");
            return { section: link.split("/")[0] || "Docs", href: link, title: title ? title.textContent.replace(/\s*-\s*PesaGuard docs.*$/, "") : link, description: description ? description.content : "PesaGuard documentation", text: page.body.textContent.toLowerCase() };
          });
        }));
      }).then(function (pages) {
        catalog = pages.filter(Boolean);
        searchStatus.textContent = catalog.length + " documentation pages indexed. Start typing to search.";
        render(searchInput.value);
      }).catch(function () {
        searchStatus.textContent = "Using the local quick index. Start typing to search.";
        render(searchInput.value);
      });
    }

    searchInput.addEventListener("input", function () { render(searchInput.value); });
    clearButton && clearButton.addEventListener("click", function () { searchInput.value = ""; searchInput.focus(); render(""); });
    render(initialQuery);
    loadCatalog();
  });

  safe(function () {
    /* --- Related links ----------------------------------------------------
     * Turn every Related/Related documentation list into one consistent,
     * keyboard-friendly navigation surface without changing its content. */

    document.querySelectorAll(".docs-article h2, .docs-article h3").forEach(function (heading) {
      if (!/^Related(?:\s|$)/i.test(heading.textContent.trim())) return;
      var list = heading.nextElementSibling;
      if (!list || (list.tagName !== "UL" && list.tagName !== "OL")) return;
      heading.classList.add("related-heading");
      list.classList.add("related-links");
      list.setAttribute("aria-label", "Related documentation");
    });
  });

  safe(function () {
    /* --- Current link marking ---------------------------------------------- */

    document.querySelectorAll(".docs-nav-group a, .docs-header-links a").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      var target;
      try {
        target = new URL(href, window.location.href).pathname;
      } catch (err) {
        return;
      }
      var sectionMarker = target.indexOf("/guides/");
      if (sectionMarker < 0) sectionMarker = target.indexOf("/migration/");
      if (sectionMarker < 0) sectionMarker = target.indexOf("/sdks/");
      if (sectionMarker < 0) sectionMarker = target.indexOf("/support/");
      if (sectionMarker < 0) sectionMarker = target.indexOf("/testing/");
      if (sectionMarker < 0) sectionMarker = target.indexOf("/webhooks/");
      if (sectionMarker < 0) sectionMarker = target.indexOf("/api/");
      if (sectionMarker < 0) sectionMarker = target.indexOf("/changelog/");
      if (sectionMarker < 0) sectionMarker = target.indexOf("/environments/");
      if (sectionMarker < 0) sectionMarker = target.indexOf("/errors/");
      if (sectionMarker < 0) sectionMarker = target.indexOf("/security/");
      if (sectionMarker >= 0) target = target.slice(sectionMarker);
      target = target.replace(/index\.html$/, "");
      var current = path.replace(/index\.html$/, "");
      if (target === current) a.setAttribute("aria-current", "page");
    });
  });

  safe(function () {
    /* --- Sidebar filter, search focus and shortcuts ------------------------- */

    var searchInput = document.querySelector(".docs-search input");
    var groups = Array.prototype.slice.call(document.querySelectorAll(".docs-nav-group"));
    var searchRegion = document.querySelector(".docs-search");
    var searchClose = searchRegion && searchRegion.querySelector(".docs-search-close");
    if (searchRegion) searchRegion.setAttribute("role", "search");

    /* On narrow screens the search box collapses to an icon (see
       responsive.css). These open/close it as a full-width overlay so it
       stays reachable with a tap instead of becoming a dead icon. */
    function openMobileSearch() {
      if (searchRegion) searchRegion.classList.add("is-active");
      if (searchInput) searchInput.focus();
    }
    function closeMobileSearch() {
      if (searchRegion) searchRegion.classList.remove("is-active");
    }

    if (searchRegion) {
      searchRegion.addEventListener("click", function () {
        if (!searchRegion.classList.contains("is-active")) openMobileSearch();
      });
    }
    if (searchClose) {
      searchClose.addEventListener("click", function (event) {
        event.stopPropagation();
        closeMobileSearch();
        searchInput && searchInput.blur();
      });
    }
    document.addEventListener("click", function (event) {
      if (searchRegion && searchRegion.classList.contains("is-active") && !searchRegion.contains(event.target)) {
        closeMobileSearch();
      }
    });

    function filterNav(query) {
      var q = query.trim().toLowerCase();
      groups.forEach(function (group) {
        var links = group.querySelectorAll("a");
        var any = false;
        links.forEach(function (a) {
          var text = a.textContent.toLowerCase();
          var show = !q || text.indexOf(q) !== -1;
          a.hidden = !show;
          if (show) any = true;
        });
        group.hidden = !any;
      });
    }

    if (searchInput) {
      searchInput.setAttribute("aria-label", "Search all documentation");
      searchInput.setAttribute("aria-keyshortcuts", "Control+K Meta+K");
      searchInput.addEventListener("input", function () {
        filterNav(searchInput.value);
      });
      searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          var query = searchInput.value.trim();
          if (query) {
            var directory = path.replace(/[^/]*$/, "");
            var depth = directory ? directory.split("/").filter(Boolean).length : 0;
            var prefix = "../".repeat(depth);
            window.location.href = prefix + "search/?q=" + encodeURIComponent(query);
          } else {
            var first = document.querySelector(".docs-nav-group a:not([hidden])");
            if (first) window.location.href = first.getAttribute("href");
          }
        } else if (event.key === "Escape") {
          /* Escape clears the active filter, or leaves the field when empty. */
          if (searchInput.value) {
            searchInput.value = "";
            filterNav("");
          } else {
            searchInput.blur();
            closeMobileSearch();
          }
        }
      });
      window.addEventListener("keydown", function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          openMobileSearch();
          searchInput.select();
        }
      });
    }
  });

  safe(function () {
    /* --- Reveal on scroll ---------------------------------------------------
     * The reveal class is added here (not in the HTML) to article blocks that sit
     * below the fold, so no-JS visitors and reduced-motion users never see hidden
     * content, and above-fold content paints immediately without a flash. */

    if (reduceMotion || !("IntersectionObserver" in window)) return;

    var article = document.querySelector("article.docs-article");
    if (article) {
      Array.prototype.forEach.call(article.children, function (el) {
        if (!el.classList.contains("reveal") && el.getBoundingClientRect().top > window.innerHeight) {
          el.classList.add("reveal");
        }
      });
    }

    var revealables = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    if (!revealables.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        var shown = 0;
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            /* Blocks revealed in the same batch cascade slightly. */
            entry.target.style.transitionDelay = Math.min(shown * 45, 270) + "ms";
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
            shown += 1;
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.04 }
    );
    revealables.forEach(function (el) { io.observe(el); });
  });

  safe(function () {
    /* --- Copy buttons on code blocks -----------------------------------------
     * A single shared visually-hidden live region announces the result for
     * screen readers; the button's own text change covers sighted users. */

    var preBlocks = document.querySelectorAll("pre.docs-code");
    if (!preBlocks.length) return;

    var liveRegion = document.createElement("span");
    liveRegion.className = "visually-hidden";
    liveRegion.setAttribute("role", "status");
    document.body.appendChild(liveRegion);

    Array.prototype.forEach.call(preBlocks, function (pre) {
      var button = document.createElement("button");
      button.className = "code-copy";
      button.type = "button";
      button.textContent = "Copy";
      button.addEventListener("click", function () {
        var text = pre.innerText.replace(/^Copy\n?/, "");
        var done = function () {
          button.classList.add("is-copied");
          button.textContent = "Copied";
          liveRegion.textContent = "Copied to clipboard";
          window.setTimeout(function () {
            button.classList.remove("is-copied");
            button.textContent = "Copy";
            liveRegion.textContent = "";
          }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, done);
        } else {
          var range = document.createRange();
          range.selectNodeContents(pre);
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          try { document.execCommand("copy"); } catch (err) { /* no-op */ }
          selection.removeAllRanges();
          done();
        }
      });
      pre.insertBefore(button, pre.firstChild);
    });
  });
})();
