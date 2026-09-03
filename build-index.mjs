// build-index.mjs — generates BOTH index.html and work/index.html from builds.json.
//
//   node build-index.mjs
//
// Rewritten 2026-09-03 (second pass). The list is DATA: add a build by adding an
// object to builds.json and the count, both pages, the favourites view, the type
// filters and the "latest" tag all follow from it. A build with no folder on disk
// FAILS the run instead of shipping as a dead link — which is how 51-54 sat in the
// gallery as 404s for three days.
//
// This pass makes it a browsing TOOL rather than a list: newest first by default,
// filter by type, sort, search, and the view is remembered between visits.
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

const KINDS = [
  ["portfolio", "Portfolios"],
  ["landing", "Landing pages"],
  ["store", "Storefronts"],
  ["dashboard", "Dashboards"],
  ["product", "Product UI"],
  ["game", "Games"],
  ["editorial", "Editorial"],
  ["school", "Courses"],
];
const untyped = builds.filter((b) => !b.kind);
if (untyped.length) console.warn("no kind set for: " + untyped.map((b) => b.slug).join(", "));

const favs = builds.filter((b) => b.fav).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
const latest = builds[builds.length - 1];
const count = (k) => builds.filter((b) => b.kind === k).length;

const esc = (s) => String(s).replace(/&(?!#?\w+;)/g, "&amp;");
const plain = (s) => String(s).replace(/&[a-z]+;|&#\d+;/g, " ").replace(/"/g, "").toLowerCase();

const card = (b, prefix) => {
  const isFav = !!b.fav;
  const cls = "c" + (isFav ? " c--fav" : "") + (b === latest ? " c--new" : "");
  return [
    '      <li class="' + cls + '" data-fav="' + (isFav ? 1 : 0) + '" data-kind="' + (b.kind || "") + '"',
    '          data-n="' + b.n + '" data-rank="' + (b.rank ?? 99) + '"',
    '          data-k="' + plain(b.title + " " + b.blurb + " " + (b.kind || "")) + '">',
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
  background-image:radial-gradient(120% 62% at 50% -14%,rgba(255,61,110,.16),transparent 62%);
  background-repeat:no-repeat;
}
.w{max-width:1120px;margin:0 auto}
a{color:inherit;text-decoration:none}
:is(a,button,input,select):focus-visible{outline:2px solid var(--sig);outline-offset:3px;border-radius:6px}

header{padding:56px 0 22px}
.back{margin:0 0 20px;font:500 12.5px/1 var(--mono);letter-spacing:.06em}
.back a{color:var(--sig)}
.back a:hover{text-decoration:underline}
h1{font-size:clamp(30px,5.4vw,46px);margin:0 0 10px;letter-spacing:-.03em;font-weight:680;line-height:1.05}
.sub{color:var(--dim);margin:0;font-size:15.5px;max-width:56ch}
.meta{color:var(--dim);margin:14px 0 0;font:500 11.5px/1.7 var(--mono);letter-spacing:.1em;text-transform:uppercase}
.meta b{color:var(--ink);font-weight:500}

/* ── the control bar ────────────────────────────────────────────────────────
   Two rows on purpose: WHAT you are looking at on top, HOW it is arranged
   underneath. One row of nine controls is a wall; two rows of four is a tool. */
.bar{
  position:sticky;top:0;z-index:20;background:var(--bg);
  padding:14px 0 16px;margin-bottom:24px;border-bottom:1px solid var(--line);
}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.row + .row{margin-top:10px}

.chip{
  appearance:none;border:1px solid var(--line);background:var(--card);color:var(--dim);
  cursor:pointer;font:600 13px/1 var(--ui);letter-spacing:-.005em;
  display:inline-flex;align-items:center;gap:7px;
  min-height:44px;padding:0 15px;border-radius:999px;
  transition:color .18s var(--ease),background .18s var(--ease),border-color .18s var(--ease);
}
.chip:hover{color:var(--ink);border-color:#3B3049}
.chip[aria-pressed="true"]{background:var(--sig);border-color:var(--sig);color:#fff}
.chip .ct{font:500 11px/1 var(--mono);opacity:.72;font-variant-numeric:tabular-nums}
.chip .s{color:var(--gold);font-size:14px;line-height:1}
.chip[aria-pressed="true"] .s{color:#fff}
.sep{width:1px;align-self:stretch;background:var(--line);margin:0 4px}

.find{
  flex:1 1 200px;min-width:0;max-width:320px;
  background:var(--card);border:1px solid var(--line);border-radius:999px;
  color:var(--ink);font:400 13.5px/1 var(--ui);min-height:44px;padding:0 16px;
  transition:border-color .18s var(--ease);
}
.find::placeholder{color:var(--dim)}
.find:focus{border-color:var(--sig);outline:none}

.sortwrap{display:inline-flex;align-items:center;gap:8px}
.sortwrap label{color:var(--dim);font:500 11.5px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase}
select{
  appearance:none;background:var(--card);border:1px solid var(--line);border-radius:999px;
  color:var(--ink);font:600 13px/1 var(--ui);min-height:44px;padding:0 34px 0 15px;cursor:pointer;
  background-image:linear-gradient(45deg,transparent 50%,var(--dim) 50%),linear-gradient(135deg,var(--dim) 50%,transparent 50%);
  background-position:calc(100% - 18px) 50%,calc(100% - 13px) 50%;
  background-size:5px 5px,5px 5px;background-repeat:no-repeat;
}
select:hover{border-color:#3B3049}
.count{margin-left:auto;color:var(--dim);font:500 11.5px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.clear{
  appearance:none;border:0;background:none;color:var(--sig);cursor:pointer;
  font:500 12px/1 var(--mono);letter-spacing:.06em;min-height:44px;padding:0 6px;
}
.clear:hover{text-decoration:underline}
.clear[hidden]{display:none}

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
.c__sh{display:block;border-radius:9px;overflow:hidden;background:#0E0B14;aspect-ratio:16/10}
.c__sh img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center;
  transition:transform .5s var(--ease)}
.c a:hover .c__sh img{transform:scale(1.035)}
.c__b{display:flex;align-items:center;gap:9px;margin:13px 2px 0;min-width:0}
.c__n{font:500 11.5px/1 var(--mono);color:var(--dim);font-variant-numeric:tabular-nums;letter-spacing:.04em}
.c__t{font-weight:600;font-size:15.5px;letter-spacing:-.012em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c__star{color:var(--gold);font-size:13px;line-height:1;flex:none}
.c__tag{font:600 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--sig);
  border:1px solid var(--sig);border-radius:999px;padding:3px 7px;flex:none}
.c__d{margin-left:auto;font:400 11px/1 var(--mono);color:var(--dim);white-space:nowrap;flex:none}
.c__p{display:block;margin:7px 2px 0;color:var(--dim);font-size:13.5px;line-height:1.5}
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
kbd{font:500 11px/1 var(--mono);background:var(--card);border:1px solid var(--line);
  border-radius:5px;padding:3px 6px;color:var(--dim)}

@media(max-width:640px){
  body{padding:0 16px 72px}
  header{padding:36px 0 18px}
  ol{grid-template-columns:1fr;gap:14px}
  .count{display:none}
  .find{max-width:none;order:-1;flex-basis:100%}
  .sep{display:none}
  .bar{padding-top:10px}
}
@media(prefers-reduced-motion:reduce){*{transition-duration:1ms!important}}
`;

const JS = `
/* One filter pass drives everything: type, favourites, search and sort.
   No framework. Every card is already in the DOM; filtering toggles [hidden]
   and sorting re-appends, so the browser keeps scroll position and the back
   button still works.

   ⚠️ Sorting re-appends nodes rather than setting CSS \`order\`. An earlier
   version used \`order\` and the values leaked between views — ranked favourites
   jumped to the back of the ALL list and build 03 vanished from its slot. */
(function(){
  var body=document.body, list=document.getElementById("list");
  var cards=[].slice.call(list.children);
  var find=document.getElementById("find");
  var chips=[].slice.call(document.querySelectorAll(".chip"));
  var sortSel=document.getElementById("sort");
  var count=document.getElementById("count");
  var clear=document.getElementById("clear");
  var KEY="studio.view.v2";

  var view="all", sort="new";

  function save(){
    try{ localStorage.setItem(KEY, JSON.stringify({view:view,sort:sort})); }catch(e){}
  }
  function load(){
    try{
      var s=JSON.parse(localStorage.getItem(KEY)||"{}");
      if(s.view) view=s.view;
      if(s.sort) sort=s.sort;
    }catch(e){}
    /* a hash in the URL always wins, so a link he pastes opens on that view */
    var h=(location.hash||"").replace("#","");
    if(h){
      var parts=h.split("/");
      if(parts[0]) view=parts[0];
      if(parts[1]) sort=parts[1];
    }
  }

  var num=function(c){ return parseInt(c.dataset.n,10)||0; };
  var SORTS={
    "new":  function(a,b){ return num(b)-num(a); },
    "old":  function(a,b){ return num(a)-num(b); },
    "fav":  function(a,b){
      var fa=a.dataset.fav==="1"?parseInt(a.dataset.rank,10):999;
      var fb=b.dataset.fav==="1"?parseInt(b.dataset.rank,10):999;
      return fa-fb || num(b)-num(a);
    }
  };

  function apply(){
    var q=(find.value||"").trim().toLowerCase(), shown=0;

    cards.forEach(function(c){
      var okView = view==="all" ? true
                 : view==="fav" ? c.dataset.fav==="1"
                 : c.dataset.kind===view;
      var ok = okView && (!q || c.dataset.k.indexOf(q)>-1);
      c.hidden=!ok; if(ok) shown++;
    });

    /* re-append in the chosen order. Only the visible ones need moving, but
       sorting all of them keeps the DOM order honest for the next pass. */
    cards.slice().sort(SORTS[sort]||SORTS["new"]).forEach(function(c){ list.appendChild(c); });

    body.dataset.view=view;
    body.classList.toggle("is-empty",shown===0);
    count.textContent=shown+(shown===1?" build":" builds");
    chips.forEach(function(b){ b.setAttribute("aria-pressed",String(b.dataset.v===view)); });
    sortSel.value=sort;
    clear.hidden = (view==="all" && !q && sort==="new");

    save();
    try{
      var h = (view==="all"&&sort==="new") ? "" : "#"+view+"/"+sort;
      history.replaceState(null,"",h||location.pathname);
    }catch(e){}
  }

  chips.forEach(function(b){ b.addEventListener("click",function(){ view=b.dataset.v; apply(); }); });
  sortSel.addEventListener("change",function(){ sort=sortSel.value; apply(); });
  find.addEventListener("input",apply);
  clear.addEventListener("click",function(){ view="all"; sort="new"; find.value=""; apply(); find.blur(); });

  /* it is a tool, so it behaves like one */
  addEventListener("keydown",function(e){
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    if(e.key==="/"&&document.activeElement!==find){ e.preventDefault(); find.focus(); return; }
    if(e.key==="Escape"){
      if(document.activeElement===find&&find.value){ find.value=""; apply(); }
      else { view="all"; sort="new"; find.value=""; apply(); }
      find.blur();
    }
  });

  load();
  apply();
})();
`;

function page(o) {
  const chips = [
    `      <button class="chip" type="button" data-v="all" aria-pressed="true">All <span class="ct">${builds.length}</span></button>`,
    `      <button class="chip" type="button" data-v="fav" aria-pressed="false"><span class="s">&#9733;</span>Favourites <span class="ct">${favs.length}</span></button>`,
    `      <span class="sep" aria-hidden="true"></span>`,
    ...KINDS.filter(([k]) => count(k) > 0).map(([k, label]) =>
      `      <button class="chip" type="button" data-v="${k}" aria-pressed="false">${label} <span class="ct">${count(k)}</span></button>`),
  ].join("\n");

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
    <p class="meta"><b>${builds.length}</b> builds &middot; <b>${favs.length}</b> favourites &middot; newest first &middot; retired numbers are not reused</p>
  </header>

  <div class="bar">
    <div class="row" role="group" aria-label="Filter by type">
${chips}
    </div>
    <div class="row">
      <input class="find" id="find" type="search" placeholder="Search builds&hellip;  /" aria-label="Search builds">
      <span class="sortwrap">
        <label for="sort">Sort</label>
        <select id="sort" aria-label="Sort builds">
          <option value="new">Newest first</option>
          <option value="old">Oldest first</option>
          <option value="fav">Favourites first</option>
        </select>
      </span>
      <button class="clear" id="clear" type="button" hidden>Reset</button>
      <span class="count" id="count">${builds.length} builds</span>
    </div>
  </div>

  <ol id="list">
${builds.map((b) => card(b, o.prefix)).join("\n")}
  </ol>
  <p class="empty">Nothing matches that. <kbd>Esc</kbd> to reset.</p>

  <footer>
    Melbourne &middot; <a href="mailto:aufanhakim1920@gmail.com">aufanhakim1920@gmail.com</a><br>
    Every build here is self-initiated or spec work. Concept pages are labelled as such on the page.<br>
    <span style="color:var(--dim)"><kbd>/</kbd> search &middot; <kbd>Esc</kbd> reset &middot; your filter and sort are remembered</span>
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
console.log("types: " + KINDS.map(([k, l]) => l + " " + count(k)).join(", "));
