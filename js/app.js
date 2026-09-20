/**
 * Shared behaviour for the static docs tree.
 *
 * - Marks the current sidebar/header link from body[data-path].
<<<<<<< HEAD
 * - Filters the sidebar while typing; Enter jumps to first hit.
 * - Reveal-on-scroll via IntersectionObserver (respects reduced motion).
 * - Ctrl/⌘+K focuses search; reading progress bar; TOC; copy buttons.
 * - Back-to-top button; tiny syntax tint for code blocks.
 *
 * No frameworks, no build step, file://-safe.
=======
 * - Filters the sidebar while typing and opens the section on "/" like MkDocs.
 * - Reveal-on-scroll via IntersectionObserver (respects reduced motion).
 * - Ctrl/⌘+K focuses search; Enter jumps to the first visible sidebar hit.
 * - Copy buttons on every pre.docs-code block.
 *
 * No frameworks, no build step, file://-safe (fetch is only used lazily).
>>>>>>> 4fc729086b56f24d3ca0019aa980812a49d2fd98
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var path = document.body.getAttribute("data-path") || "/";

<<<<<<< HEAD
  /* --- Theme toggle -------------------------------------------------------
   * The <head> inline script already applies any stored theme before paint
   * (avoids a flash of the wrong theme). This just wires the button.
   */

  var themeToggle = document.querySelector(".docs-theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var current = document.documentElement.getAttribute("data-theme") || (systemDark ? "dark" : "light");
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("pg-theme", next); } catch (e) { /* no-op */ }
    });
  }

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

=======
>>>>>>> 4fc729086b56f24d3ca0019aa980812a49d2fd98
  /* --- Current link marking ---------------------------------------------- */

  document.querySelectorAll(".docs-nav-group a, .docs-header-links a").forEach(function (a) {
    var href = a.getAttribute("href");
    if (!href) return;
    var target = href.replace(/index\.html$/, "");
    if (target === path || (target !== "/" && path.indexOf(target) === 0)) {
      a.setAttribute("aria-current", "page");
    }
  });

  /* --- Sidebar filter ---------------------------------------------------- */

  var searchInput = document.querySelector(".docs-search input");
  var groups = Array.prototype.slice.call(document.querySelectorAll(".docs-nav-group"));

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
    searchInput.addEventListener("input", function () {
      filterNav(searchInput.value);
    });
    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        var first = document.querySelector(".docs-nav-group a:not([hidden])");
        if (first) window.location.href = first.getAttribute("href");
      }
    });
    window.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });
  }

  /* --- Reveal on scroll --------------------------------------------------- */

  var revealables = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (revealables.length && !reduceMotion && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.04 }
    );
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  }

<<<<<<< HEAD
  /* --- Copy buttons + tint ----------------------------------------------- */

  function tint(pre) {
    var code = pre.querySelector("code");
    if (!code || code.children.length) return;
    var html = code.innerHTML
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html
      .replace(/(^|\s)(curl|GET|POST|PUT|PATCH|DELETE|export|python|node|npm)(\s|;|$)/g, '$1<span class="tok-cmd">$2</span>$3')
      .replace(/("[^"\n]*")/g, '<span class="tok-str">$1</span>')
      .replace(/(^|[\s:=])(-?\d[\d.,]*)/g, '$1<span class="tok-num">$2</span>')
      .replace(/(#[^\n<]*)/g, '<span class="tok-com">$1</span>');
    code.innerHTML = html;
  }

  document.querySelectorAll("pre.docs-code").forEach(function (pre) {
    try { tint(pre); } catch (e) { /* no-op */ }
=======
  /* --- Copy buttons on code blocks ---------------------------------------- */

  document.querySelectorAll("pre.docs-code").forEach(function (pre) {
>>>>>>> 4fc729086b56f24d3ca0019aa980812a49d2fd98
    var button = document.createElement("button");
    button.className = "code-copy";
    button.type = "button";
    button.textContent = "Copy";
<<<<<<< HEAD
    button.setAttribute("aria-label", "Copy code to clipboard");
=======
>>>>>>> 4fc729086b56f24d3ca0019aa980812a49d2fd98
    button.addEventListener("click", function () {
      var text = pre.innerText.replace(/^Copy\n?/, "");
      var done = function () {
        button.textContent = "Copied";
<<<<<<< HEAD
        button.classList.add("is-copied");
        window.setTimeout(function () { button.textContent = "Copy"; button.classList.remove("is-copied"); }, 1400);
=======
        window.setTimeout(function () { button.textContent = "Copy"; }, 1400);
>>>>>>> 4fc729086b56f24d3ca0019aa980812a49d2fd98
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
<<<<<<< HEAD

  /* --- Reading progress --------------------------------------------------- */

  var progress = document.querySelector(".read-progress");
  if (progress) {
    var tick = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var ratio = max > 0 ? (h.scrollTop / max) : 0;
      progress.style.transform = "scaleX(" + Math.min(1, Math.max(0, ratio)) + ")";
    };
    document.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    tick();
  }

  /* --- Back to top -------------------------------------------------------- */

  var topBtn = document.createElement("button");
  topBtn.className = "back-to-top";
  topBtn.type = "button";
  topBtn.setAttribute("aria-label", "Back to top");
  topBtn.textContent = "↑";
  document.body.appendChild(topBtn);
  var onScrollTop = function () {
    topBtn.setAttribute("data-visible", window.scrollY > 900 ? "true" : "false");
  };
  document.addEventListener("scroll", onScrollTop, { passive: true });
  onScrollTop();
  topBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  /* --- Table of contents -------------------------------------------------- */

  try {
    var article = document.querySelector(".docs-article");
    var heads = article ? article.querySelectorAll("h2") : [];
    if (article && heads.length >= 2) {
      var toc = document.createElement("nav");
      toc.className = "docs-toc";
      toc.setAttribute("aria-label", "On this page");
      var label = document.createElement("p");
      label.textContent = "On this page";
      toc.appendChild(label);
      var list = document.createElement("ul");
      var links = [];
      heads.forEach(function (h, i) {
        if (!h.id) h.id = "section-" + (i + 1) + "-" + h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#" + h.id;
        a.textContent = h.textContent.trim();
        li.appendChild(a);
        list.appendChild(li);
        links.push(a);
      });
      toc.appendChild(list);
      article.insertBefore(toc, article.children[3] || article.firstChild);
      if ("IntersectionObserver" in window) {
        var spy = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            var id = "#" + en.target.id;
            links.forEach(function (a) {
              a.classList.toggle("is-active", a.getAttribute("href") === id);
            });
          });
        }, { rootMargin: "-30% 0px -60% 0px" });
        heads.forEach(function (h) { spy.observe(h); });
      }
    }
  } catch (e) { /* no-op */ }
=======
>>>>>>> 4fc729086b56f24d3ca0019aa980812a49d2fd98
})();
