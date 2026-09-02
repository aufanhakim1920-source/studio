/* THE LOOM — portfolio 3 of 3, Claude's own pick
 * ---------------------------------------------------------------------------
 * The same nine projects as the other two, from the same projects.json.
 *
 * THE OBJECT IS A LOOM. Capabilities are the warp (down), projects are the
 * weft (across), and a knot is tied wherever a project was actually built from
 * a capability. Pull a thread and everything it touches lights up.
 *
 * ⭐ WHY THIS IS THE ONE WORTH KEEPING: it is the only one of the three that
 * says something a list cannot. A project list loses the overlap. A tag cloud
 * keeps the overlap but loses which project each tag belongs to. The weave
 * keeps BOTH axes, so the thick warps — the things he actually does, over and
 * over — become visible as a shape rather than a claim.
 *
 * ⚠️ The capability map below is a real judgement call and it is stated
 * openly rather than hidden: the raw tags are too granular to weave (33 unique
 * tags across 9 projects, and only two of them ever repeat, which would produce
 * a cloth with no cloth in it). So tags are grouped into capabilities. The
 * grouping is the honest part of this build, and it is written down where
 * anyone can disagree with it.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NS = "http://www.w3.org/2000/svg";
const el = (t, a = {}) => { const n = document.createElementNS(NS, t);
  for (const [k, v] of Object.entries(a)) n.setAttribute(k, v); return n; };

/* capability ← the tags that count as evidence for it. Order is the warp
   order, arranged so related capabilities sit next to each other. */
const CAPS = [
  ["JavaScript",     ["javascript","html/css/js","node","react","next.js","canvas","remotion","typescript"]],
  ["TypeScript",     ["typescript","next.js"]],
  ["Front-end craft",["html/css/js","design system","i18n","react","canvas"]],
  ["Back end",       ["node","serverless","netlify","proxy"]],
  ["Third-party API",["meta api","google calendar","composio","shopify"]],
  ["Automation",     ["automation","composio","serverless","meta api"]],
  ["Commerce",       ["shopify","liquid","product"]],
  ["Game systems",   ["game design","co-op","narrative","systems","unity","c#"]],
  ["Real-time gfx",  ["canvas","3d pixel art","unity","computer vision","video"]],
  ["Mobile",         ["mobile"]],
  ["Observability",  ["observability","proxy"]],
  ["Motion & sound", ["remotion","video","sound design"]],
];

let P = [], M = [], sel = null;      /* sel = {kind:'weft'|'warp', i} */

const has = (p, caps) => p.tags.some((t) => caps.includes(t.toLowerCase()));

/* ── draw ──────────────────────────────────────────────────────────────── */
function draw() {
  const svg = $("#web");
  const r = svg.getBoundingClientRect();
  const W = r.width, H = r.height;
  if (!W || !H) return;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

  const PADX = 10, PADY = 12;
  const cx = (j) => PADX + (j + 0.5) * ((W - PADX * 2) / CAPS.length);
  const cy = (i) => PADY + (i + 0.5) * ((H - PADY * 2) / P.length);

  const warps = $("#warps"), wefts = $("#wefts"), knots = $("#knots"), hit = $("#hit");
  [warps, wefts, knots, hit].forEach((g) => (g.textContent = ""));

  CAPS.forEach((_, j) => {
    warps.appendChild(el("line", { class: "warp", "data-w": j, x1: cx(j), x2: cx(j), y1: 0, y2: H }));
  });
  P.forEach((_, i) => {
    wefts.appendChild(el("line", { class: "weft", "data-p": i, x1: 0, x2: W, y1: cy(i), y2: cy(i) }));
  });

  /* the knot size is how many tags supported the crossing — a project that
     hits a capability from three different tags is more woven into it */
  M.forEach((row, i) => row.forEach((n, j) => {
    if (!n) return;
    knots.appendChild(el("circle", {
      class: "knot", "data-p": i, "data-w": j,
      cx: cx(j), cy: cy(i), r: Math.min(6.5, 3.1 + n * 1.1),
    }));
  }));

  /* generous invisible hit areas — 4px lines are not clickable */
  P.forEach((_, i) => {
    const h = el("rect", { class: "hitrow", "data-p": i, x: 0, y: cy(i) - (H / P.length) / 2,
      width: W, height: H / P.length });
    h.addEventListener("click", () => pick("weft", i));
    hit.appendChild(h);
  });
  CAPS.forEach((_, j) => {
    const h = el("rect", { class: "hitcol", "data-w": j, x: cx(j) - (W / CAPS.length) / 2, y: 0,
      width: W / CAPS.length, height: H });
    h.addEventListener("click", () => pick("warp", j));
    hit.appendChild(h);
  });

  paint();
}

/* ── selection: pull one thread, everything it touches lights ──────────── */
function pick(kind, i) {
  sel = sel && sel.kind === kind && sel.i === i ? null : { kind, i };
  paint();
  say();
}

function paint() {
  const on = (p, w) => {
    if (!sel) return null;
    return sel.kind === "weft" ? p === sel.i : w === sel.i;
  };
  $$(".warp").forEach((n) => {
    const j = +n.dataset.w;
    n.classList.toggle("is-lit",
      !!sel && (sel.kind === "warp" ? j === sel.i : M[sel.i][j] > 0));
  });
  $$(".weft").forEach((n) => {
    const i = +n.dataset.p;
    n.classList.toggle("is-lit",
      !!sel && (sel.kind === "weft" ? i === sel.i : M[i][sel.i] > 0));
  });
  $$(".knot").forEach((n) => {
    const i = +n.dataset.p, j = +n.dataset.w;
    const lit = on(i, j);
    n.classList.toggle("is-lit", lit === true);
    n.classList.toggle("is-dim", lit === false);
  });
  $$(".wlab button").forEach((b, j) =>
    b.classList.toggle("is-lit", !!sel && (sel.kind === "warp" ? j === sel.i : M[sel.i][j] > 0)));
  $$(".plabs button").forEach((b, i) =>
    b.classList.toggle("is-lit", !!sel && (sel.kind === "weft" ? i === sel.i : M[i][sel.i] > 0)));
}

/* ── the readout says what the cloth is showing ────────────────────────── */
function say() {
  const stat = (k, v, s) => `<div><dt>${k}</dt><dd>${v}${s ? `<small>${s}</small>` : ""}</dd></div>`;

  if (!sel) {
    const counts = CAPS.map((_, j) => M.reduce((a, row) => a + (row[j] ? 1 : 0), 0));
    const thickest = counts.indexOf(Math.max(...counts));
    const once = counts.filter((c) => c === 1).length;
    const knots = M.flat().filter(Boolean).length;
    $("#readK").textContent = "The whole cloth";
    $("#readT").textContent = "Nine projects, twelve capabilities";
    $("#readD").textContent =
      `${knots} crossings. The thickest warp is ${CAPS[thickest][0]}, woven through ` +
      `${counts[thickest]} of ${P.length} projects — that is the thread everything else hangs off. ` +
      `${once} ${once === 1 ? "capability appears" : "capabilities appear"} exactly once.`;
    $("#readA").hidden = true;
    $("#readStats").innerHTML =
      stat("Projects", P.length) + stat("Capabilities", CAPS.length) +
      stat("Crossings", knots) +
      stat("Live", P.filter((p) => p.url).length, ` of ${P.length}`);
    return;
  }

  if (sel.kind === "weft") {
    const p = P[sel.i];
    const used = CAPS.filter((_, j) => M[sel.i][j]).map(([n]) => n);
    $("#readK").textContent = `Weft ${String(sel.i + 1).padStart(2, "0")} · ${p.year} · ${p.status}`;
    $("#readT").textContent = p.name;
    $("#readD").textContent = p.desc;
    const a = $("#readA");
    a.hidden = !p.url;
    if (p.url) { a.href = p.url; a.target = "_blank"; a.rel = "noopener"; }
    $("#readStats").innerHTML =
      stat("Crosses", used.length, ` of ${CAPS.length}`) +
      stat("Tags", p.tags.length) +
      `<div><dt>Woven from</dt><dd style="font-size:11px;text-align:right;line-height:1.5">${used.join("<br>")}</dd></div>`;
    return;
  }

  const [name] = CAPS[sel.i];
  const projects = P.filter((_, i) => M[i][sel.i]);
  $("#readK").textContent = `Warp ${String(sel.i + 1).padStart(2, "0")} · capability`;
  $("#readT").textContent = name;
  $("#readD").textContent = projects.length > 1
    ? `Woven through ${projects.length} of ${P.length} projects: ${projects.map((p) => p.name).join(", ")}.`
    : `Used once so far — ${projects[0] ? projects[0].name : "nowhere yet"}. A thin thread is not a weak one, but it is not proven either.`;
  $("#readA").hidden = true;
  $("#readStats").innerHTML =
    stat("Woven through", projects.length, ` of ${P.length}`) +
    `<div><dt>Projects</dt><dd style="font-size:11px;text-align:right;line-height:1.5">${projects.map((p) => p.name).join("<br>")}</dd></div>`;
}

async function init() {
  try {
    const r = await fetch("projects.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    P = await r.json();
  } catch (e) {
    $("#readT").textContent = "Nothing on the loom";
    $("#readD").textContent = e.message;
    return;
  }

  /* the matrix: how many tags support each project × capability crossing */
  M = P.map((p) => CAPS.map(([, caps]) =>
    p.tags.filter((t) => caps.includes(t.toLowerCase())).length));

  const counts = CAPS.map((_, j) => M.reduce((a, row) => a + (row[j] ? 1 : 0), 0));
  $("#wlab").innerHTML = CAPS.map(([n], j) =>
    `<button data-w="${j}" aria-label="${n}, woven through ${counts[j]} of ${P.length} projects">${n}<i>·</i><b>${counts[j]}</b></button>`).join("");
  $("#plabs").innerHTML = P.map((p, i) =>
    `<li><button data-p="${i}"><b>${p.name}</b><em>${p.status}</em></button></li>`).join("");

  $$(".wlab button").forEach((b) => b.addEventListener("click", () => pick("warp", +b.dataset.w)));
  $$(".plabs button").forEach((b) => b.addEventListener("click", () => pick("weft", +b.dataset.p)));

  draw();
  say();

  /* the cloth is drawn in pixel space, so it has to be redrawn when the frame
     changes size — same reason as every other pixel-space chart in this set */
  const seen = { w: 0, h: 0 };
  new ResizeObserver((es) => {
    for (const e of es) {
      const c = e.contentRect;
      if (Math.abs(c.width - seen.w) > 1 || Math.abs(c.height - seen.h) > 1) {
        seen.w = c.width; seen.h = c.height; draw();
      }
    }
  }).observe($("#web"));
}

init();
