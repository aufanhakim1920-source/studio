/* RETAIL OPS — build 55, the operational dashboard
 * ---------------------------------------------------------------------------
 * Same business as builds 52-54, opposite job. Those explain a dataset to
 * someone meeting it for the first time; this one is for someone who already
 * knows what the numbers mean and needs to see whether anything moved.
 *
 * Two rules the whole file follows:
 *
 *   1. NO NUMBER WITHOUT A COMPARISON. Every tile shows the current period,
 *      the change against the previous period of equal length, and the shape
 *      that got there. "£4.2m" on its own is decoration.
 *
 *   2. THE PARTIAL MONTH NEVER TOUCHES A KPI. The data stops on 9 Dec 2011.
 *      Letting nine days count as a month makes every trend look like a
 *      collapse. It is still drawn on the revenue chart, hatched, because
 *      hiding it would be its own kind of lie.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const nf = new Intl.NumberFormat("en-GB");
const money = (n) =>
  n >= 1e6 ? "£" + (n / 1e6).toFixed(2) + "m"
: n >= 1e3 ? "£" + Math.round(n / 1e3) + "k"
           : "£" + n.toFixed(0);
const MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const mlab = (ym) => MONTH[+ym.split("-")[1] - 1];
const mfull = (ym) => { const [y, m] = ym.split("-"); return MONTH[+m - 1] + " " + y.slice(2); };

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};
/* charts are drawn into a viewBox-less svg, so read its real pixel box */
const box = (svg) => { const r = svg.getBoundingClientRect(); return { w: r.width, h: r.height }; };

let D = null, period = 6;

/* ── the comparison ───────────────────────────────────────────────────────
   Positive is not automatically good — average order value falling while
   orders rise is a mix shift, not a failure. But for every metric on this
   board up IS the wanted direction, so a single rule is honest here. */
function delta(now, before) {
  if (before == null || !before) return null;
  return ((now - before) / before) * 100;
}
function chip(d) {
  if (d == null) return `<span class="chip">no prior</span>`;
  const cls = d >= 0 ? "chip--up" : "chip--down";
  const arr = d >= 0 ? "▲" : "▼";
  return `<span class="chip ${cls}">${arr} ${Math.abs(d).toFixed(1)}%</span>`;
}

/* ── sparkline: the shape behind the number ─────────────────────────────── */
function spark(values, w = 150, h = 26) {
  if (values.length < 2) return "";
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - 2 - ((v - min) / span) * (h - 5),
  ]);
  const d = pts.map(([x, y], i) => (i ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1)).join(" ");
  const last = pts.at(-1);
  return `<svg class="kpi__spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d}" fill="none" stroke="var(--sig)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2" fill="var(--sig)"/>
  </svg>`;
}

/* ── KPI row ─────────────────────────────────────────────────────────────── */
function drawKpis() {
  const ms = D.months.slice(0, D.completeMonths);      /* complete months only */
  const cur = ms.slice(-period);
  const prev = ms.length >= period * 2 ? ms.slice(-period * 2, -period) : null;

  const sum = (rows, k) => rows.reduce((a, r) => a + r[k], 0);
  const peak = (rows, k) => Math.max(...rows.map((r) => r[k]));

  const rev = sum(cur, "rev"), ord = sum(cur, "orders");
  const pRev = prev && sum(prev, "rev"), pOrd = prev && sum(prev, "orders");

  const tiles = [
    { k: "Revenue",   v: money(rev),                  d: delta(rev, pRev),
      s: cur.map((r) => r.rev) },
    { k: "Orders",    v: nf.format(ord),              d: delta(ord, pOrd),
      s: cur.map((r) => r.orders) },
    { k: "Avg order", v: "£" + (rev / ord).toFixed(0), d: delta(rev / ord, prev ? pRev / pOrd : null),
      s: cur.map((r) => r.aov) },
    { k: "Customers", v: nf.format(peak(cur, "customers")), sub: "peak mo",
      d: delta(peak(cur, "customers"), prev ? peak(prev, "customers") : null),
      s: cur.map((r) => r.customers) },
    { k: "Markets",   v: String(peak(cur, "countries")), sub: "peak mo",
      d: delta(peak(cur, "countries"), prev ? peak(prev, "countries") : null),
      s: cur.map((r) => r.countries) },
  ];

  $("#kpis").innerHTML = tiles.map((t) => `
    <article class="kpi">
      <div class="kpi__t">
        <span class="lab">${t.k}</span>
        ${chip(t.d)}
      </div>
      <div class="kpi__v">${t.v}${t.sub ? `<small> ${t.sub}</small>` : ""}</div>
      ${spark(t.s)}
    </article>`).join("");

  $("#cmp").textContent = prev
    ? `${period}M vs prior ${period}M`
    : `${period}M · no prior period`;
}

/* ── revenue chart ───────────────────────────────────────────────────────── */
function drawRevenue() {
  const ms = D.months;                        /* ALL months, partial included */
  const W = 760, H = 250, T = 14, B = 8, L = 4, R = 4;
  const max = Math.max(...ms.map((m) => m.rev));
  const x = (i) => L + (i / (ms.length - 1)) * (W - L - R);
  const y = (v) => H - B - (v / max) * (H - T - B);
  const partial = D.completeMonths;           /* index of the partial month */

  /* gridlines — four, unlabelled. They calibrate; they do not need naming. */
  const g = $("#revGrid"); g.textContent = "";
  for (let i = 1; i <= 4; i++) {
    g.appendChild(el("line", { class: "grid-l", x1: 0, x2: W,
      y1: (H - B) - (i / 5) * (H - T - B), y2: (H - B) - (i / 5) * (H - T - B) }));
  }

  const pts = ms.map((m, i) => [x(i), y(m.rev)]);
  const line = pts.map(([px, py], i) => (i ? "L" : "M") + px.toFixed(1) + "," + py.toFixed(1)).join(" ");

  const b = $("#revBody"); b.textContent = "";
  b.appendChild(el("path", { class: "rev-a", d: `${line} L${x(ms.length - 1)},${H} L${x(0)},${H} Z` }));
  b.appendChild(el("path", { class: "rev-l", d: line, "vector-effect": "non-scaling-stroke" }));

  /* the partial month, hatched — shown, and marked as not comparable */
  const px0 = x(partial - 0.5), px1 = W;
  b.appendChild(el("rect", { x: px0, y: 0, width: px1 - px0, height: H, fill: "url(#part)", opacity: ".5" }));

  pts.forEach(([cx, cy]) => b.appendChild(el("circle", { class: "rev-p", cx, cy, r: 2.5 })));

  /* hover the chart, read the month. The only interaction it needs. */
  const hit = $("#revHit"); hit.textContent = "";
  const bw = (W - L - R) / (ms.length - 1);
  ms.forEach((m, i) => {
    const r = el("rect", { class: "rev-hit", x: x(i) - bw / 2, y: 0, width: bw, height: H,
      tabindex: "0", role: "img",
      "aria-label": `${mfull(m.m)}: ${money(m.rev)}, ${nf.format(m.orders)} orders` +
        (i >= partial ? ", partial month" : "") });
    const mark = el("line", { class: "rev-mark", x1: x(i), x2: x(i), y1: 0, y2: H });
    const show = () => {
      $("#revRead").textContent =
        `${mfull(m.m)} · ${money(m.rev)} · ${nf.format(m.orders)} orders` +
        (i >= partial ? " · partial" : "");
    };
    r.addEventListener("pointerenter", show);
    r.addEventListener("focus", show);
    hit.appendChild(r); hit.appendChild(mark);
  });

  $("#revAxis").innerHTML = ms
    .map((m, i) => (i % 2 === 0 || i === ms.length - 1 ? `<span>${mlab(m.m)}</span>` : ""))
    .join("");
  $("#revRead").textContent = `${ms.length} months · to ${D.lastDate}`;
}

/* ── horizontal bar panels ───────────────────────────────────────────────── */
function drawBars(svgSel, rows, countSel, label) {
  const svg = $(svgSel);
  const { w, h } = box(svg);
  if (!w || !h) return;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.textContent = "";
  const g = el("g", { class: "brow" });

  const n = rows.length;
  const rowH = h / n, barH = Math.min(7, rowH * 0.28);
  const max = Math.max(...rows.map((r) => r.rev));

  rows.forEach((r, i) => {
    const top = i * rowH;
    const grp = el("g", {});
    const t1 = el("text", { class: "brow__n", x: 0, y: top + rowH / 2 - 2 });
    t1.textContent = r.name.length > 22 ? r.name.slice(0, 21) + "…" : r.name;
    const t2 = el("text", { class: "brow__v", x: w, y: top + rowH / 2 - 2, "text-anchor": "end" });
    t2.textContent = `${money(r.rev)} · ${r.share}%`;
    const by = top + rowH / 2 + 6;
    grp.appendChild(t1); grp.appendChild(t2);
    grp.appendChild(el("rect", { class: "brow__bg", x: 0, y: by, width: w, height: barH, rx: 2 }));
    grp.appendChild(el("rect", { class: "brow__f", x: 0, y: by,
      width: Math.max(2, (r.rev / max) * w), height: barH, rx: 2 }));
    const ttl = el("title");
    ttl.textContent = `${r.name}: ${money(r.rev)} (${r.share}% of period revenue)`;
    grp.appendChild(ttl);
    g.appendChild(grp);
  });
  svg.appendChild(g);
  $(countSel).textContent = `top ${n} · ${label}`;
}

/* ── concentration: the risk, tracked ──────────────────────────────────────
   Drawn in PIXEL space, not a stretched viewBox. The panel is 218px tall
   against a 120-unit box, so `preserveAspectRatio="none"` would stretch any
   type inside it by 82% — the reason the bar panels are drawn this way too. */
function drawConcentration() {
  /* Must follow the period control. A panel that ignores the selector reads as
     broken even when its own number is right — on a board, one control drives
     everything or it drives nothing. */
  const ms = D.months.slice(0, D.completeMonths).slice(-period);
  const svg = $("#concChart");
  const { w, h } = box(svg);
  if (!w || !h) return;
  svg.removeAttribute("preserveAspectRatio");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  $("#concBody").textContent = "";
  const g = $("#concBody");

  /* The series runs 83–92%. A 60–100 scale would leave the bottom half of the
     panel permanently blank — so the scale is fitted to the data, widened just
     enough to always keep the 80% limit line on screen. */
  const LIMIT = 80;
  const vals = ms.map((m) => m.homeShare);
  const lo = Math.min(LIMIT - 4, Math.floor(Math.min(...vals)) - 2);
  const hi = Math.max(LIMIT + 4, Math.ceil(Math.max(...vals)) + 2);
  const R = 34, T = 6, B = 16;
  const y = (v) => h - B - ((v - lo) / (hi - lo)) * (h - T - B);
  const x = (i) => (i / (ms.length - 1)) * (w - R);

  /* shade the BREACH zone, not the tolerable one — a band implying "fine"
     under a line sitting inside it would contradict the flag panel */
  g.appendChild(el("rect", { class: "conc-band", x: 0, y: y(hi), width: w - R, height: y(LIMIT) - y(hi) }));
  g.appendChild(el("line", { class: "conc-thresh", x1: 0, x2: w - R, y1: y(LIMIT), y2: y(LIMIT) }));

  const lt = el("text", { class: "conc-t", x: w - R + 5, y: y(LIMIT) + 4 });
  lt.textContent = LIMIT + "%";
  g.appendChild(lt);

  const over = ms.filter((m) => m.homeShare > LIMIT).length;
  const cur = ms.at(-1).homeShare;

  g.appendChild(el("path", { class: "conc-l", "vector-effect": "non-scaling-stroke",
    d: ms.map((m, i) => (i ? "L" : "M") + x(i).toFixed(1) + "," + y(m.homeShare).toFixed(1)).join(" ") }));
  g.appendChild(el("circle", { class: "conc-p", cx: x(ms.length - 1), cy: y(cur), r: 3 }));

  const ct = el("text", { class: "conc-v", x: w - R + 5, y: y(cur) + 4 });
  ct.textContent = cur + "%";
  g.appendChild(ct);

  $("#concN").textContent = `${over}/${ms.length} months over`;
}

/* ── boot ────────────────────────────────────────────────────────────────── */
function render() {
  drawKpis();
  drawRevenue();
  const p = D.periods[String(period)];
  drawBars("#mktChart", p.markets, "#mktN", "by revenue");
  drawBars("#prdChart", p.products, "#prdN", "by revenue");
  drawConcentration();
}

async function init() {
  try {
    const r = await fetch("data.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    D = await r.json();
  } catch (e) {
    $("#foot").textContent = "Data did not load: " + e.message;
    return;
  }

  $("#asof").textContent = `to ${D.lastDate}`;

  /* data quality — a bar and four rows, no prose */
  const kept = D.keptRows, tot = D.rawRows;
  const dq = $("#dqBody"); dq.textContent = "";
  dq.appendChild(el("rect", { x: 0, y: 4, width: 340, height: 14, rx: 3, fill: "var(--panel-2)" }));
  dq.appendChild(el("rect", { x: 0, y: 4, width: (kept / tot) * 340, height: 14, rx: 3, fill: "var(--up)" }));
  $("#dqN").textContent = `${((kept / tot) * 100).toFixed(1)}% kept`;
  $("#dq").innerHTML = D.excluded
    .sort((a, b) => b.rows - a.rows).slice(0, 4)
    .map((e) => `<li><span>${e.label.replace(/^Exact duplicate/, "Duplicate")}</span><b>${nf.format(e.rows)}</b></li>`)
    .join("") +
    `<li class="dq--t"><span>Rows used</span><b>${nf.format(kept)}</b></li>`;

  /* flags — the only place words are allowed, and they are still counted */
  const ms = D.months.slice(0, D.completeMonths);
  const home = ms.at(-1).homeShare;
  const peakM = ms.reduce((a, b) => (b.rev > a.rev ? b : a));
  const lowM = ms.reduce((a, b) => (b.rev < a.rev ? b : a));
  $("#flags").innerHTML = [
    ["high", `Home market <b>${home}%</b> of revenue`],
    ["med",  `Peak is <b>${(peakM.rev / lowM.rev).toFixed(1)}×</b> the trough`],
    ["low",  `<b>25.2%</b> of rows have no customer ID`],
  ].map(([s, t]) => `<li><i class="f--${s}"></i><span>${t}</span></li>`).join("");
  $("#flagN").textContent = "3 open";

  $("#foot").textContent = D.source;

  $$(".seg__b").forEach((b) =>
    b.addEventListener("click", () => {
      period = +b.dataset.p;
      $$(".seg__b").forEach((o) => o.classList.toggle("is-on", o === b));
      render();
    })
  );

  render();

  /* Three charts are drawn in PIXEL space (so their type is not stretched by a
     viewBox), which means they have to be redrawn whenever their panel changes
     size. A window resize listener is not enough: at first paint the grid rows
     had not settled, so they were measured ~90px short and rendered letterboxed
     inside the box they ended up in. A ResizeObserver catches that. */
  const redraw = () => {
    const p = D.periods[String(period)];
    drawBars("#mktChart", p.markets, "#mktN", "by revenue");
    drawBars("#prdChart", p.products, "#prdN", "by revenue");
    drawConcentration();
  };
  const seen = new WeakMap();
  const ro = new ResizeObserver((entries) => {
    let changed = false;
    for (const e of entries) {
      const r = e.contentRect, was = seen.get(e.target);
      if (!was || Math.abs(was.w - r.width) > 1 || Math.abs(was.h - r.height) > 1) {
        seen.set(e.target, { w: r.width, h: r.height });
        changed = true;
      }
    }
    if (changed) redraw();      /* guarded, so redrawing cannot re-trigger this */
  });
  ["#mktChart", "#prdChart", "#concChart"].forEach((sel) => ro.observe($(sel)));
}

init();
