// build-index.mjs — generates BOTH index.html and work/index.html from builds.json.
//
//   node build-index.mjs
//
// Rewritten 2026-09-03. The old version derived work/index.html from index.html by
// string-replacing the hand-edited source, and recounted builds with a regex over the
// generated markup. It worked, but every fact lived in markup: the total went stale
// twice, and FOUR retired builds (51–54) sat in the list as dead 404 links for three
// days, because deleting their folders never touched their rows.
//
// Now the list is DATA. Add a build by adding an object to builds.json; the count,
// both pages, the favourites view and the "latest" tag all follow from it. A build
// with no folder on disk now FAILS the run instead of shipping as a dead link.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const builds = JSON.parse(readFileSync("builds.json", "utf8"));

/* ⚠️ the check that would have caught the four dead links */
const missing = builds.filter((b) => !existsSync(join("work", b.slug, "index.html")));
if (missing.length) {
  console.error("These builds are listed but have no folder in work/:");
  missing.forEach((b) => console.error(`  ${b.n} ${b.slug}`));
  console.error("Either restore the folder or remove the row from builds.json.");
  process.exit(1);
}
const noThumb = builds.filter((b) => !existsSync(join("work", "thumbs", b.slug + ".jpg")));
if (noThumb.length) {
  console.warn("no preview for: " + noThumb.map((b) => b.slug).join(", ") + "  (run: node shoot-thumbs.mjs)");
}

const favs = builds.filter((b) => b.fav).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
const latest = builds[builds.length - 1];

const esc = (s) => String(s).replace(/&(?!#?\w+;)/g, "&amp;");
const plain = (s) => String(s).replace(/&[a-z]+;|&#\d+;/g, " ").replace(/"/g, "").toLowerCase();

const card = (b, prefix) => {
  const isFav = !!b.fav;
  const cls = "c" + (isFav ? " c--fav" : "") + (b === latest ? " c--new" : "");
  return [
    '      <li class="' + cls + '" data-fav="' + (isFav ? 1 : 0) + '"',
    '          data-k="' + plain(b.title + " " + b.blurb) + '"' + (isFav ? ' data-rank="' + (b.rank ?? 99) + '"' : "") + ">",
    '        <a href="' + prefix + b.slug + '/">',
    '          <span class="c__sh"><img src="' + prefix + "thumbs/" + b.slug + '.jpg" alt="" loading="lazy" decoding="async" width="589" height="368"></span>',
    '          <span class="c__b">',
    '            <span class="c__n">' + b.n + "</span>",
    '            <span class="c__t">' + esc(b.title) + "</span>",
    b === latest ? '            <span class="c__tag">latest</span>' : "",
    isFav ? '            <span class="c__star" aria-label="favourite">&#9733;</span>' : "",
    '            <span class="c__d">' + esc(b.date) + "</span>",
    "          </span>",
    '          <span class="c__p">' + esc(b.blurb) + "</span>",
    isFav && b.why ? '          <span class="c__w">' + esc(b.why) + "</span>" : "",
    "        </a>",
    "      </li>",
  ].filter(Boolean).join("\n");
};

const CSS = `
:root{
  --bg:#17131F; --ink:#EDE8F0; --dim:#9A93A5; --sig:#FF3D6E;
  --line:#2C2436; --card:#1E1829; --card-2:#241D31; --gold:#FFC24B;
  --ui:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --ease:cubic-bezier(.2,.7,.3,1);
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0; background:var(--bg); color:var(--ink); font:16px/1.55 var(--ui);
  padding:0 22px 96px; -webkit-font-smoothing:antialiased;
  /* the ground is not flat black: one soft signal-coloured bloom behind the header.
     Cheapest way to stop a dark page reading as a default terminal. */
  background-image:radial-gradient(120% 62% at 50% -14%,rgba(255,61,110,.16),transparent 62%);
  background-repeat:no-repeat;
}
.w{max-width:1120px;margin:0 auto}
a{color:inherit;text-decoration:none}
:is(a,button,input):focus-visible{outline:2px solid var(--sig);outline-offset:3px;border-radius:6px}

/* ── header ─────────────────────────────────────────────────────────────── */
header{padding:64px 0 30px}
.back{margin:0 0 20px;font:500 12.5px/1 var(--mono);letter-spacing:.06em}
.back a{color:var(--sig)}
.back a:hover{text-decoration:underline}
h1{font-size:clamp(30px,5.4vw,46px);margin:0 0 10px;letter-spacing:-.03em;font-weight:680;line-height:1.05}
.sub{color:var(--dim);margin:0;font-size:15.5px;max-width:56ch}
/* line-height 1 collided with itself the moment this wrapped on a phone */
.meta{color:var(--dim);margin:14px 0 0;font:500 11.5px/1.7 var(--mono);letter-spacing:.1em;text-transform:uppercase}
.meta b{color:var(--ink);font-weight:500}

/* ── the control bar ────────────────────────────────────────────────────── */
.bar{
  display:flex;gap:12px;align-items:center;flex-wrap:wrap;
  padding:16px 0 22px;margin-bottom:26px;border-bottom:1px solid var(--line);
  position:sticky;top:0;z-index:20;background:var(--bg);
}
.seg{display:inline-flex;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:2px}
.seg button{
  appearance:none;border:0;background:none;color:var(--dim);cursor:pointer;
  font:600 13px/1 var(--ui);letter-spacing:-.005em;
  display:inline-flex;align-items:center;gap:7px;
  min-height:44px;padding:0 17px;border-radius:999px;   /* 44 is the tap floor, not 38 */
  transition:color .18s var(--ease),background .18s var(--ease);
}
.seg button:hover{color:var(--ink)}
.seg button[aria-pressed="true"]{background:var(--sig);color:#fff}
.seg button .s{color:var(--gold);font-size:14px;line-height:1}
.seg button[aria-pressed="true"] .s{color:#fff}
.seg button .ct{font:500 11px/1 var(--mono);opacity:.72;font-variant-numeric:tabular-nums}
.find{
  flex:1 1 190px;min-width:0;max-width:280px;
  background:var(--card);border:1px solid var(--line);border-radius:999px;
  color:var(--ink);font:400 13.5px/1 var(--ui);min-height:44px;padding:0 16px;
  transition:border-color .18s var(--ease);
}
.find::placeholder{color:var(--dim)}
.find:focus{border-color:var(--sig);outline:none}
.count{margin-left:auto;color:var(--dim);font:500 11.5px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase}

/* ── the grid ───────────────────────────────────────────────────────────── */
ol{list-style:none;padding:0;margin:0;display:grid;gap:16px;
  grid-template-columns:repeat(auto-fill,minmax(292px,1fr))}
.c{min-width:0}
.c a{
  display:block;height:100%;
  background:var(--card);border:1px solid var(--line);border-radius:14px;
  padding:10px 10px 15px;
  transition:transform .22s var(--ease),border-color .22s var(--ease),background .22s var(--ease);
}
.c a:hover,.c a:focus-visible{transform:translateY(-3px);border-color:#3B3049;background:var(--card-2)}
/* the preview is the point of the card, so it gets the space */
.c__sh{display:block;border-radius:9px;overflow:hidden;background:#0E0B14;aspect-ratio:16/10}
.c__sh img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center;
  transition:transform .5s var(--ease)}
.c a:hover .c__sh img{transform:scale(1.035)}
.c__b{display:flex;align-items:center;gap:9px;margin:13px 2px 0;min-width:0}
.c__n{font:500 11.5px/1 var(--mono);color:var(--dim);font-variant-numeric:tabular-nums;letter-spacing:.04em}
.c__t{font-weight:600;font-size:15.5px;letter-spacing:-.012em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c__star{color:var(--gold);font-size:13px;line-height:1;flex:none}
/* 11px is the phone legibility floor - 9.5px failed the gate */
.c__tag{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--sig);
  border:1px solid var(--sig);border-radius:999px;padding:3px 7px;flex:none}
.c__d{margin-left:auto;font:400 11px/1 var(--mono);color:var(--dim);white-space:nowrap;flex:none}
.c__p{display:block;margin:7px 2px 0;color:var(--dim);font-size:13.5px;line-height:1.5}
/* why a favourite is a favourite — shown only in the favourites view, so the list
   explains itself instead of being a pile of bookmarks */
.c__w{display:none;margin:10px 2px 0;padding-top:9px;border-top:1px dashed var(--line);
  color:var(--gold);font-size:12.5px;line-height:1.5}
body[data-view="fav"] .c__w{display:block}
.c--new .c__n{color:var(--sig)}

.empty{display:none;color:var(--dim);padding:26px 2px;font-size:14.5px}
body.is-empty .empty{display:block}

footer{margin-top:52px;padding-top:24px;border-top:1px solid var(--line);
  color:var(--dim);font-size:13px;line-height:1.75}
footer a{color:var(--sig)}
footer a:hover{text-decoration:underline}

@media(max-width:560px){
  body{padding:0 16px 72px}
  header{padding:40px 0 22px}
  ol{grid-template-columns:1fr;gap:14px}
  .count{display:none}
  .find{max-width:none}
}
@media(prefers-reduced-motion:reduce){*{transition-duration:1ms!important}}
`;

const JS = `
/* Favourites and search are ONE filter pass. No framework and no re-render — every
   card is already in the DOM and we toggle [hidden], which is why the count is
   instant and the back button never loses your place. */
(function(){
  var body=document.body, list=document.getElementById("list");
  var cards=[].slice.call(list.children);
  var find=document.getElementById("find");
  var btns=[].slice.call(document.querySelectorAll(".seg button"));
  var count=document.getElementById("count");
  var view=(location.hash==="#favourites")?"fav":"all";

  function apply(){
    var q=(find.value||"").trim().toLowerCase(), shown=0, fav=(view==="fav");
    cards.forEach(function(c){
      var ok=(view==="all"||c.dataset.fav==="1")&&(!q||c.dataset.k.indexOf(q)>-1);
      c.hidden=!ok; if(ok) shown++;
      /* ⚠️ rank is applied ONLY in the favourites view. Setting it once at load
         reordered the ALL view too — grid order defaults to 0, so every ranked
         favourite jumped to the back and 03 vanished from its slot. */
      c.style.order=(fav&&c.dataset.rank)?c.dataset.rank:"";
    });
    body.dataset.view=view;
    body.classList.toggle("is-empty",shown===0);
    count.textContent=shown+(shown===1?" build":" builds");
    btns.forEach(function(b){ b.setAttribute("aria-pressed",String(b.dataset.v===view)); });
    try{ history.replaceState(null,"",view==="fav"?"#favourites":location.pathname); }catch(e){}
  }
  btns.forEach(function(b){ b.addEventListener("click",function(){ view=b.dataset.v; apply(); }); });
  find.addEventListener("input",apply);
  /* "/" focuses search, Escape clears it — it is a tool, it should behave like one */
  addEventListener("keydown",function(e){
    if(e.key==="/"&&document.activeElement!==find){ e.preventDefault(); find.focus(); }
    if(e.key==="Escape"&&document.activeElement===find){ find.value=""; apply(); find.blur(); }
  });
  apply();
})();
`;

function page(o) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${o.title}</title>
<meta name="description" content="Hand-built portfolios, landing pages and storefronts. No framework, no template.">
<meta name="color-scheme" content="dark">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' fill='%2317131F'/><circle cx='8' cy='8' r='3' fill='%23FF3D6E'/></svg>">
<style>${CSS}</style>
</head>
<body data-view="all">
<div class="w">

  <header>
${o.back ? '    <p class="back"><a href="../">&larr; Aufan Rachmad</a></p>' : ""}
    <h1>${o.h1}</h1>
    <p class="sub">${o.sub}</p>
    <p class="meta"><b>${builds.length}</b> builds &middot; <b>${favs.length}</b> favourites &middot; retired numbers are not reused</p>
  </header>

  <div class="bar">
    <div class="seg" role="group" aria-label="Filter builds">
      <button type="button" data-v="all" aria-pressed="true">All <span class="ct">${builds.length}</span></button>
      <button type="button" data-v="fav" aria-pressed="false"><span class="s">&#9733;</span>Favourites <span class="ct">${favs.length}</span></button>
    </div>
    <input class="find" id="find" type="search" placeholder="Search builds&hellip;  /" aria-label="Search builds">
    <span class="count" id="count">${builds.length} builds</span>
  </div>

  <ol id="list">
${builds.map((b) => card(b, o.prefix)).join("\n")}
  </ol>
  <p class="empty">Nothing matches that.</p>

  <footer>
    Melbourne &middot; <a href="mailto:aufanhakim1920@gmail.com">aufanhakim1920@gmail.com</a><br>
    Every build here is self-initiated or spec work. Concept pages are labelled as such on the page.
  </footer>

</div>
<script>${JS}</script>
</body>
</html>
`;
}

writeFileSync("index.html", page({
  prefix: "work/",
  title: "Aufan Rachmad — Work",
  back: false,
  h1: "Aufan Rachmad",
  sub: "Portfolios, landing pages and storefronts. Hand-built &mdash; no framework, no template, no page builder.",
}));

writeFileSync("work/index.html", page({
  prefix: "",
  title: "Work — Aufan Rachmad",
  back: true,
  h1: "Work",
  sub: "Every build, live. Hand-built HTML, CSS and vanilla JS.",
}));

console.log("index.html + work/index.html generated — " + builds.length + " builds, " + favs.length + " favourites");
console.log("favourites in order: " + favs.map((b) => b.n + " " + b.title).join(", "));
