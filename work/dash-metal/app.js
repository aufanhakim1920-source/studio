/* LEDGER / Retail Telemetry — dashboard 2 of 3, the PACT route
 * ---------------------------------------------------------------------------
 * Same 541,909-row dataset as the other two. The one idea worth naming here:
 * PACT decorates its liquidity strip with bars at arbitrary `bg-white/N`
 * opacities. Here the opacity IS the month's share of the peak, so what was
 * decoration in the reference carries data in the build.
 */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const nf = new Intl.NumberFormat("en-GB");
const short = (n) =>
  n >= 1e6 ? "£" + (n / 1e6).toFixed(1) + "M"
: n >= 1e3 ? "£" + Math.round(n / 1e3) + "k"
           : "£" + Math.round(n);
const MONTH = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const mlabel = (ym) => { const [, m] = ym.split("-"); return MONTH[+m - 1]; };

let D = null;

/* the cursor as a light across a panel — PACT's per-card radial */
function cursorLight(el) {
  const base = "linear-gradient(135deg, #111 0%, #050505 100%)";
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    el.style.background =
      `radial-gradient(circle at ${e.clientX - r.left}px ${e.clientY - r.top}px,` +
      ` rgba(255,255,255,.07) 0%, #060607 70%)`;
  });
  el.addEventListener("pointerleave", () => (el.style.background = base));
}

async function init() {
  try {
    const r = await fetch("data.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    D = await r.json();
  } catch (e) {
    $("h1").textContent = "DATASET DID NOT LOAD.";
    $("#live").textContent = e.message.toUpperCase();
    return;
  }

  const k = D.kpi;
  $("#footSrc").textContent = D.source.toUpperCase();
  $("#live").innerHTML = `<i class="pulse"></i>${nf.format(D.keptRows)} ROWS`;

  /* the stream card — top markets, styled like a transaction feed */
  $("#stream").innerHTML = D.countries.slice(0, 5).map((c, i) => `
    <li>
      <span class="nm">${c.name}<span class="id">RANK ${String(i + 1).padStart(2, "0")} · ${c.orders ? nf.format(c.orders) + " ORDERS" : "—"}</span></span>
      <span class="amt">${short(c.rev)}</span>
    </li>`).join("");

  /* three verticals, each a real slice of the data */
  const top = D.products[0];
  const V = [
    { n: "01", ic: "£", h: "Revenue<br>Concentration",
      p: `The United Kingdom alone accounts for ${D.homeShare}% of takings across ${k.countries} markets. Growth has to come from abroad or from basket size — there is no third lever.`,
      k: "Held by one market", v: D.homeShare + "%", w: D.homeShare },
    { n: "02", ic: "#", h: "Line<br>Concentration",
      p: `The top line is ${top.share}% of revenue on its own, and the eight shown here carry ${D.products.reduce((a, p) => a + p.share, 0).toFixed(1)}% between them.`,
      k: "Top eight share", v: D.products.reduce((a, p) => a + p.share, 0).toFixed(1) + "%",
      w: D.products.reduce((a, p) => a + p.share, 0) },
    { n: "03", ic: "!", h: "Data<br>Retained",
      p: `${nf.format(D.excludedTotal)} of ${nf.format(D.rawRows)} rows were removed — duplicates, cancellations, non-positive quantities and zero prices. Every one is listed below.`,
      k: "Rows kept", v: ((D.keptRows / D.rawRows) * 100).toFixed(1) + "%",
      w: (D.keptRows / D.rawRows) * 100 },
  ];

  $("#vgrid").innerHTML = V.map((v) => `
    <article class="v">
      <span class="v__bg" aria-hidden="true">${v.n}</span>
      <div class="v__body">
        <div class="v__ic" aria-hidden="true">${v.ic}</div>
        <h3 class="v__h">${v.h}</h3>
        <p class="v__p">${v.p}</p>
      </div>
      <div class="v__foot">
        <div class="v__row"><span class="mono">${v.k}</span><b>${v.v}</b></div>
        <div class="v__track"><div class="v__fill" data-w="${v.w}"></div></div>
      </div>
    </article>`).join("");

  $$(".v").forEach(cursorLight);
  cursorLight($(".card--stream"));

  /* the trend — opacity carries the share of peak */
  const ms = D.months;
  const peak = ms.reduce((a, b) => (b.rev > a.rev ? b : a));
  const max = peak.rev;
  const lastIdx = ms.length - 1;
  $("#peak").textContent = `PEAK ${mlabel(peak.m)} ${peak.m.slice(2, 4)}`;

  $("#months").innerHTML = ms.map((m, i) => {
    const share = m.rev / max;
    const partial = i === lastIdx;
    return `<div class="mo${partial ? " mo--part" : ""}" tabindex="0" role="group"
                 aria-label="${mlabel(m.m)}: ${short(m.rev)}${partial ? ", partial month" : ""}">
      <span class="mo__v">${short(m.rev)}</span>
      <span class="mo__b" data-h="${(share * 100).toFixed(1)}"
            style="opacity:${(0.24 + share * 0.76).toFixed(2)}"></span>
      <span class="mo__l">${mlabel(m.m)}</span>
    </div>`;
  }).join("");

  const worst = ms.slice(0, -1).reduce((a, b) => (b.rev < a.rev ? b : a));
  $("#facts").innerHTML = [
    ["01.0", "The peak is 2.9× the trough",
      `${mlabel(peak.m)} took ${short(peak.rev)} against ${mlabel(worst.m)}'s ${short(worst.rev)}. Working capital should be timed to the run-up, not spread evenly.`],
    ["02.0", "The final bar is a partial month",
      `The data stops on ${D.lastDate}. That fall is the calendar, not demand — the bar is hatched to say so.`],
  ].map(([n, h, p]) => `
    <div class="fact"><span class="mono">${n}</span><div><h4>${h}</h4><p>${p}</p></div></div>`).join("");

  /* audit */
  $("#exgrid").innerHTML = D.excluded.map((e) => `
    <div class="ex">
      <span class="ex__l">${e.label}</span>
      <span class="ex__n">${nf.format(e.rows)}</span>
      <span class="ex__w">${e.why}</span>
    </div>`).join("") + `
    <div class="ex ex--total">
      <span class="ex__l">TOTAL EXCLUDED</span>
      <span class="ex__n">${nf.format(D.excludedTotal)}</span>
      <span class="ex__w">${((D.excludedTotal / D.rawRows) * 100).toFixed(1)}% of ${nf.format(D.rawRows)} source rows. ${nf.format(D.keptRows)} carry every figure above.</span>
    </div>`;
  $("#limits").innerHTML = D.limits.map((l) => `<li>${l}</li>`).join("");

  /* reveal once */
  const fill = () => {
    $$(".mo__b").forEach((b) => (b.style.height = b.dataset.h + "%"));
    $$(".v__fill").forEach((f) => (f.style.width = f.dataset.w + "%"));
  };
  if (REDUCED || !("IntersectionObserver" in window)) fill();
  else {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { fill(); io.unobserve(e.target); } });
    }, { threshold: .2 });
    [$("#months"), $("#vgrid")].filter(Boolean).forEach((el) => io.observe(el));
  }
}

init();
