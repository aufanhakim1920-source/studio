/* TWELVE MARKETS, THIRTEEN MONTHS — build 57, Claude's own pick
 * ---------------------------------------------------------------------------
 * Small multiples. Twelve panels, drawn identically, one per market, so the
 * only thing that differs between them is the SHAPE. There is no headline
 * number anywhere on this page, which is the point: 55 and 56 tell you the
 * answer, this one makes you see it.
 *
 * The argument is the toggle:
 *   SHARED — one axis across all twelve. Eleven flatline. That is the
 *            concentration finding as a picture rather than a sentence.
 *   OWN    — each panel fitted to itself. The eleven come alive and their
 *            individual seasonality becomes readable for the first time.
 *
 * Same 156 numbers both ways. Neither view is the honest one on its own,
 * which is exactly why the control exists and why it starts on SHARED.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const nf = new Intl.NumberFormat("en-GB");
const money = (n) =>
  n >= 1e6 ? "£" + (n / 1e6).toFixed(2) + "m"
: n >= 1e3 ? "£" + Math.round(n / 1e3) + "k"
           : "£" + Math.round(n);
const MONTH = ["J","F","M","A","M","J","J","A","S","O","N","D"];
const mfull = (ym) => {
  const F = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [y, m] = ym.split("-"); return F[+m - 1] + " " + y.slice(2);
};

const NS = "http://www.w3.org/2000/svg";
const el = (t, a = {}) => {
  const n = document.createElementNS(NS, t);
  for (const [k, v] of Object.entries(a)) n.setAttribute(k, v);
  return n;
};

let D = null, scale = "shared";

/* ── one panel ────────────────────────────────────────────────────────────
   Drawn in pixel space, measured off the real box. A viewBox with
   preserveAspectRatio="none" would let each panel stretch differently, and in
   a small-multiples grid that would defeat the entire technique — the panels
   must be geometrically identical or the shapes are not comparable. */
function drawPanel(cell, mk, sharedMax, partial) {
  const svg = cell.querySelector("svg");
  const r = svg.getBoundingClientRect();
  const w = r.width, h = r.height;
  if (!w || !h) return;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.textContent = "";

  const own = Math.max(...mk.series);
  const max = scale === "shared" ? sharedMax : own || 1;
  const T = 12, B = 9;
  const x = (i) => (i / (mk.series.length - 1)) * (w - 2) + 1;
  const y = (v) => h - B - (Math.min(v, max) / max) * (h - T - B);

  svg.appendChild(el("line", { class: "sm-base", x1: 0, x2: w, y1: h - B, y2: h - B }));

  /* the complete months are the solid series; the partial month is dashed and
     unfilled, so it can never be mistaken for a real fall */
  const full = mk.series.slice(0, partial);
  const d = full.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ");
  svg.appendChild(el("path", { class: "sm-a",
    d: `${d} L${x(partial - 1).toFixed(1)},${h - B} L${x(0).toFixed(1)},${h - B} Z` }));
  svg.appendChild(el("path", { class: "sm-l", d, "vector-effect": "non-scaling-stroke" }));

  if (mk.series.length > partial) {
    svg.appendChild(el("path", { class: "sm-p", "vector-effect": "non-scaling-stroke",
      d: `M${x(partial - 1).toFixed(1)},${y(full.at(-1)).toFixed(1)} ` +
         `L${x(partial).toFixed(1)},${y(mk.series[partial]).toFixed(1)}` }));
  }

  /* mark the peak — in own-scale mode it is the only way to know what the
     top of the panel is worth */
  const pi = full.indexOf(Math.max(...full));
  svg.appendChild(el("circle", { class: "sm-pk", cx: x(pi), cy: y(full[pi]), r: 2.2 }));

  if (scale === "own") {
    const t = el("text", { class: "sm-max", x: 2, y: 9 });
    t.textContent = money(own);
    svg.appendChild(t);
  }

  const ttl = el("title");
  ttl.textContent = `${mk.name}: peak ${money(full[pi])} in ${mfull(D.matrix.months[pi])}, ` +
    `${money(mk.rev)} over the year (${mk.share}% of revenue)`;
  svg.appendChild(ttl);
}

function render() {
  const partial = D.completeMonths;
  const sharedMax = Math.max(...D.matrix.markets.flatMap((m) => m.series.slice(0, partial)));
  $$(".cell").forEach((c, i) => drawPanel(c, D.matrix.markets[i], sharedMax, partial));

  $("#hint").textContent = scale === "shared"
    ? "One axis for all twelve. Eleven of them flatline — that is the finding."
    : "Each panel fitted to itself. Now the small markets have shapes.";
}

async function init() {
  try {
    const r = await fetch("data.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    D = await r.json();
  } catch (e) {
    $("h1").textContent = "The data did not load";
    $("#sub").textContent = e.message;
    return;
  }

  const mk = D.matrix.markets;
  const shown = mk.reduce((a, m) => a + m.share, 0);
  $("#sub").textContent =
    `Revenue per market, ${mfull(D.matrix.months[0])} to ${mfull(D.matrix.months.at(-1))} · ` +
    `${shown.toFixed(1)}% of ${money(D.months.reduce((a, m) => a + m.rev, 0))}`;
  $("#ftL").textContent = `${nf.format(D.keptRows)} rows · ${nf.format(D.excludedTotal)} removed`;
  $("#ftR").textContent = `${mk.length} of 38 markets · to ${D.lastDate}`;

  $("#grid").innerHTML = mk.map((m, i) => `
    <article class="cell" tabindex="0"
             aria-label="${m.name}: ${money(m.rev)}, ${m.share}% of revenue">
      <div class="cell__h">
        <span class="cell__n">${m.name}</span>
        <span class="cell__r">${String(i + 1).padStart(2, "0")}</span>
      </div>
      <div class="cell__s">
        <span class="cell__v">${money(m.rev)}</span>
        <span class="cell__p">${m.share}%</span>
      </div>
      <svg role="img"></svg>
    </article>`).join("");

  $$(".seg__b").forEach((b) =>
    b.addEventListener("click", () => {
      scale = b.dataset.s;
      $$(".seg__b").forEach((o) => o.classList.toggle("is-on", o === b));
      render();
    })
  );

  render();

  /* redraw on any panel resize — at first paint the grid rows have not settled,
     and a small-multiples grid is worthless if the panels are not identical */
  const seen = new WeakMap();
  const ro = new ResizeObserver((es) => {
    let changed = false;
    for (const e of es) {
      const c = e.contentRect, was = seen.get(e.target);
      if (!was || Math.abs(was.w - c.width) > 1 || Math.abs(was.h - c.height) > 1) {
        seen.set(e.target, { w: c.width, h: c.height });
        changed = true;
      }
    }
    if (changed) render();
  });
  $$(".cell svg").forEach((s) => ro.observe(s));
}

init();
