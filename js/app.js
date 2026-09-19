/**
 * Shared behaviour for the static docs tree.
 *
 * - Marks the current sidebar/header link from body[data-path].
 * - Filters the sidebar while typing and opens the section on "/" like MkDocs.
 * - Reveal-on-scroll via IntersectionObserver (respects reduced motion).
 * - Ctrl/⌘+K focuses search; Enter jumps to the first visible sidebar hit.
 * - Copy buttons on every pre.docs-code block.
 *
 * No frameworks, no build step, file://-safe (fetch is only used lazily).
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var path = document.body.getAttribute("data-path") || "/";

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

  /* --- Copy buttons on code blocks ---------------------------------------- */

  document.querySelectorAll("pre.docs-code").forEach(function (pre) {
    var button = document.createElement("button");
    button.className = "code-copy";
    button.type = "button";
    button.textContent = "Copy";
    button.addEventListener("click", function () {
      var text = pre.innerText.replace(/^Copy\n?/, "");
      var done = function () {
        button.textContent = "Copied";
        window.setTimeout(function () { button.textContent = "Copy"; }, 1400);
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
})();
