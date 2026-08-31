/* RETAIL OPS // WALL 01 — build 56, the modern-creative lane
 * ---------------------------------------------------------------------------
 * Same data as 52-55. This one is a WALL board: it assumes you are six feet
 * away and glancing, so it shows four numbers the size of your hand rather
 * than twenty the size of a footnote.
 *
 * The whole page is driven by ONE control — the timeline. Click a month, or
 * arrow through it, and every readout re-reads. That is the only motion on the
 * page apart from a 10px caret: per Motion Must Be User Driven, the visitor
 * moves the board, the board does not move itself.
 *
 * The comparison rule from build 55 carries over unchanged: no number appears
 * without its change against the previous month.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const nf = new Intl.NumberFormat("en-GB");
const money = (n) =>
  n >= 1e6 ? (n / 1e6).toFixed(2) + "M"
: n >= 1e3 ? Math.round(n / 1e3) + "K"
           : String(Math.round(n));
const MONTH = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const mlab = (ym) => MONTH[+ym.split("-")[1] - 1];
const mfull = (ym) => { const [y, m] = ym.split("-"); return MONTH[+m - 1] + " " + y.slice(2); };

let D = null, sel = 0, partial = 99;

/* ── the change, printed the way a terminal would ────────────────────────── */
function setDelta(node, now, before, unit = "") {
  if (before == null || !before) { node.textContent = " "; node.className = "d"; return; }
  const pct = ((now - before) / before) * 100;
  node.textContent = (pct >= 0 ? "+" : "-") + Math.abs(pct).toFixed(1) + "% MOM" + unit;
  node.className = "d " + (pct >= 0 ? "d--up" : "d--down");
}

/* ── select a month: everything on the board re-reads ────────────────────── */
function select(i) {
  sel = Math.max(0, Math.min(D.months.length - 1, i));
  const m = D.months[sel], p = sel > 0 ? D.months[sel - 1] : null;

  $$(".mo").forEach((b, k) => {
    b.classList.toggle("is-on", k === sel);
    b.setAttribute("aria-checked", k === sel ? "true" : "false");
    b.tabIndex = k === sel ? 0 : -1;
  });

  $("#rMonth").innerHTML = mfull(m.m) + `<span class="caret"></span>`;
  $("#rNote").textContent = sel >= partial ? "PARTIAL — 9 DAYS" : " ";

  $("#rRev").textContent = money(m.rev);
  $("#rOrd").textContent = nf.format(m.orders);
  $("#rAov").textContent = Math.round(m.aov);
  $("#rCus").textContent = nf.format(m.customers);

  /* a partial month has no honest month-on-month reading, so it prints none */
  const cmp = sel >= partial ? null : p;
  setDelta($("#rRevD"), m.rev, cmp && cmp.rev);
  setDelta($("#rOrdD"), m.orders, cmp && cmp.orders);
  setDelta($("#rAovD"), m.aov, cmp && cmp.aov);
  setDelta($("#rCusD"), m.customers, cmp && cmp.customers);

  drawMarkets();
  $("#stat").textContent = sel >= partial ? "PARTIAL" : "LOCKED";
}

/* ── markets for the selected month, off the 12 x 13 matrix ──────────────── */
function drawMarkets() {
  const rows = D.matrix.markets
    .map((mk) => ({ name: mk.name, v: mk.series[sel] }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 10);
  const max = Math.max(...rows.map((r) => r.v), 1);
  const tot = rows.reduce((a, r) => a + r.v, 0);

  $("#bars").innerHTML = rows.map((r) => `
    <div class="bar">
      <span class="bar__n">${r.name.toUpperCase()}</span>
      <span class="bar__t"><span class="bar__f" style="width:${((r.v / max) * 100).toFixed(1)}%"></span></span>
      <span class="bar__v">${money(r.v)} ${((r.v / tot) * 100).toFixed(1)}%</span>
    </div>`).join("");
  $("#mktN").textContent = `${rows.length} OF ${D.months[sel].countries}`;
}

async function init() {
  try {
    const r = await fetch("data.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    D = await r.json();
  } catch (e) {
    $("#stat").textContent = "NO SIGNAL";
    $("#rMonth").textContent = "DATA FAILED";
    $("#rRev").textContent = e.message.toUpperCase();
    return;
  }

  partial = D.completeMonths;
  $("#asof").textContent = D.lastDate.toUpperCase();
  $("#ftL").textContent = `${nf.format(D.keptRows)} ROWS · ${nf.format(D.excludedTotal)} DROPPED`;
  $("#ftR").textContent = `${D.months.length} MONTHS · ARROWS TO SCRUB`;

  /* the timeline. Each cell carries its own month's revenue as a bar, so the
     control is also the year's shape — one element doing two jobs. */
  const max = Math.max(...D.months.map((m) => m.rev));
  $("#scrub").innerHTML = D.months.map((m, i) => `
    <button class="mo${i >= partial ? " mo--part" : ""}" data-i="${i}"
            role="radio" aria-checked="false" tabindex="-1"
            aria-label="${mfull(m.m)}, ${money(m.rev)}${i >= partial ? ", partial month" : ""}">
      <span class="mo__b" style="height:${((m.rev / max) * 54 + 4).toFixed(0)}px"></span>
      <span>${mlab(m.m)}</span>
    </button>`).join("");

  $$(".mo").forEach((b) => b.addEventListener("click", () => { select(+b.dataset.i); b.focus(); }));

  /* arrow keys move the selection — a wall board is usually driven from a
     keyboard or a remote, not a mouse */
  $("#scrub").addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: -1, ArrowDown: 1,
                   Home: -99, End: 99 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    select(step === -99 ? 0 : step === 99 ? D.months.length - 1 : sel + step);
    $$(".mo")[sel].focus();
  });

  select(partial - 1);        /* open on the last COMPLETE month, never the stub */
}

init();
