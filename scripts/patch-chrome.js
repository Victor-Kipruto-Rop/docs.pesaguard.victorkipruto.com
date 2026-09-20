const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "generate-pages.js");
let h = fs.readFileSync(p, "utf8");
const orig = h;
function rep(a, b) {
  if (!h.includes(a)) { console.log("MISS: " + a.slice(0, 80)); return; }
  h = h.split(a).join(b);
  console.log("OK: " + a.slice(0, 80));
}
rep('<title>${page.title}', '<title>${titleText}');
rep('<link rel="icon" type="image/svg+xml" href="${fav}">',
  '<link rel="canonical" href="${canonical}">\n'
  + '<meta property="og:type" content="website">\n'
  + '<meta property="og:site_name" content="PesaGuard docs">\n'
  + '<meta property="og:title" content="${titleText}">\n'
  + '<meta property="og:description" content="${page.description}">\n'
  + '<meta property="og:url" content="${canonical}">\n'
  + '<meta property="og:image" content="${ogImage}">\n'
  + '<link rel="icon" type="image/svg+xml" href="${fav}">\n'
  + '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
  + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
  + '<link href="${fonts}" rel="stylesheet">');
rep('<link rel="stylesheet" href="${up}css/responsive.css">\n</head>',
  '<link rel="stylesheet" href="${up}css/responsive.css">\n<script>(function(){})();</script>\n</head>');
rep('<a class="docs-brand" href="${up}index.html"><img src="${fav}" alt="" width="26" height="26">PesaGuard <small>Docs</small></a>',
  '<a class="docs-brand" href="${up}index.html">${mark}PesaGuard <small>Docs</small></a>');
rep('<nav class="docs-header-links" aria-label="Primary">${sectionLinks}</nav>',
  '<nav class="docs-header-links" aria-label="Primary" id="primary-nav">${sectionLinks}</nav>\n  <div class="header-actions"><a class="header-cta" href="${up}getting-started/quickstart.html">Quickstart</a>\n  <button class="docs-theme-toggle" type="button" aria-label="Toggle dark mode"><span class="icon-light">${sun}</span><span class="icon-dark">${moon}</span></button>\n  <button class="docs-nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Toggle navigation menu"><span></span><span></span><span></span></button></div>');
rep('<header class="docs-header"><div class="docs-header-inner">',
  '<header class="docs-header"><div class="read-progress" aria-hidden="true"></div><div class="docs-header-inner">');
rep('<span>2026 PesaGuard</span>',
  '<span class="footer-brand">${mark}2026 PesaGuard</span>');
rep('/* HEADLINE */\n  const doctitle = titleText;', '');
if (h !== orig) { fs.writeFileSync(p, h); console.log("WROTE"); }
else { console.log("NO CHANGE"); }
