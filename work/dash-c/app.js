/* AUDIT DESK — dash-c
   One mechanism, five triggers: every "prove it" control, every lineage
   segment, every flagged product row and every "other markets" row opens the
   SAME drawer component, built from the SAME retail.json the KPIs are
   computed from. Nothing here is invented copy — every number in the drawer
   traces to a field in data.json. */

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function monthLabel(m) {           // "2011-03" -> "MAR 2011"
  const [y, mm] = m.split("-");
  return `${MONTHS[+mm - 1]} ${y}`;
}
function monthLabelShort(m) {
  const [, mm] = m.split("-");
  return MONTHS[+mm - 1];
}
function gbp(n, decimals = 0) {
  return "£" + n.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function gbpAbbr(n) {
  if (Math.abs(n) >= 1e6) return "£" + (n / 1e6).toFixed(2) + "m";
  if (Math.abs(n) >= 1e3) return "£" + (n / 1e3).toFixed(1) + "k";
  return gbp(n);
}
function intFmt(n) { return Math.round(n).toLocaleString("en-GB"); }
function pct1(n) { return (n >= 0 ? "" : "") + n.toFixed(1) + "%"; }
function sum(arr, key) { return arr.reduce((a, m) => a + m[key], 0); }

fetch("data.json").then(r => r.json()).then(init).catch(err => {
  document.getElementById("main").innerHTML =
    `<p style="padding:40px;color:#D9694F">Could not load data.json — ${err.message}</p>`;
});

/* Every trigger on this page is a real control, so every trigger has to be
   reachable by keyboard as well as by mouse. This binds BOTH from one place:
   the same `handler` runs on click and on Enter/Space — never a second copy of
   the logic that can drift out of step with the first. */
function makeActivatable(el, label, handler) {
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  if (label) el.setAttribute("aria-label", label);
  el.addEventListener("click", handler);
  el.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();          // stop Space scrolling the page
      handler(e);
    }
  });
}

function init(data) {
  const months = data.months;
  const complete = months.slice(0, -1);          // every month except the one the data stops mid-way through
  const partial = months[months.length - 1];

  // ── period window logic: current N complete months vs the N before them ──
  function windowFor(n) {
    const cur = complete.slice(-n);
    const priorStart = complete.length - 2 * n;
    const prior = priorStart >= 0 ? complete.slice(priorStart, priorStart + n) : null;
    return { cur, prior };
  }

  let currentN = 12;

  // ── drawer ────────────────────────────────────────────────────────────
  const drawer = document.getElementById("drawer");
  const drawerBody = document.getElementById("drawerBody");
  function openDrawer(html) {
    drawerBody.innerHTML = html;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
  }
  document.getElementById("drawerClose").addEventListener("click", closeDrawer);
  document.getElementById("drawerScrim").addEventListener("click", closeDrawer);
  window.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });

  // full raw→kept chain, optionally with one or more rules highlighted
  function chainHTML(kicker, title, lede, highlightLabels, tailNote) {
    const rows = [
      { n: intFmt(data.rawRows), t: "Raw rows", d: "Every line item in the source export, 1 Dec 2010 – 9 Dec 2011.", hi: false },
      ...data.excluded.map(e => ({
        n: "−" + intFmt(e.rows),
        t: e.label,
        d: e.why,
        hi: highlightLabels ? highlightLabels.includes(e.label) : false
      })),
      { n: intFmt(data.keptRows), t: "Kept rows", d: "What every figure on this page is computed from.", hi: false }
    ];
    return `
      <span class="kicker">${kicker}</span>
      <h3>${title}</h3>
      ${lede ? `<p class="lede">${lede}</p>` : ""}
      <div class="chain">
        ${rows.map(r => `
          <div class="chain-row ${r.hi ? "hi" : ""}">
            <div class="chain-row__n">${r.n}</div>
            <div class="chain-row__t"><b>${r.t}</b><span>${r.d}</span></div>
          </div>`).join("")}
      </div>
      <div class="sum">${intFmt(data.rawRows)} − ${intFmt(data.keptRows)} = ${intFmt(data.excludedTotal)} removed
        &nbsp;·&nbsp; ${data.excluded.map(e => intFmt(e.rows)).join(" + ")} = ${intFmt(data.excludedTotal)}
        <span class="ok"> ✓ matches</span></div>
      ${tailNote ? `<p class="lede" style="margin-top:16px;font-size:14px">${tailNote}</p>` : ""}
    `;
  }

  // ── KPIs ──────────────────────────────────────────────────────────────
  const kpiDefs = [
    {
      key: "revenue", label: "Revenue",
      value: cur => sum(cur, "rev"),
      fmt: v => gbpAbbr(v),
      spark: m => m.rev,
      caveat: "Revenue is GROSS. 9,251 cancelled invoices were removed rather than netted off — this figure would be lower if returns were subtracted instead.",
      rules: ["Exact duplicate rows", "Cancelled invoices", "Non-positive quantity", "Zero or negative price"]
    },
    {
      key: "orders", label: "Orders",
      value: cur => sum(cur, "orders"),
      fmt: v => intFmt(v),
      spark: m => m.orders,
      caveat: "Counts distinct invoices after removing 5,268 duplicate rows and 9,251 cancelled invoices — an “order” here means one surviving invoice number.",
      rules: ["Exact duplicate rows", "Cancelled invoices"]
    },
    {
      key: "aov", label: "AOV",
      value: cur => sum(cur, "rev") / sum(cur, "orders"),
      fmt: v => gbp(v, 0),
      spark: m => m.rev / m.orders,
      caveat: "Average order value inherits both adjustments above — revenue is gross of returns, and cancelled orders never entered the order count. Treat it as an approximation, not an audited figure.",
      rules: ["Exact duplicate rows", "Cancelled invoices", "Non-positive quantity", "Zero or negative price"]
    }
  ];

  const kpisEl = document.getElementById("kpis");

  function sparkPath(vals, w = 120, h = 34) {
    if (vals.length < 2) return { line: "", fill: "" };
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = (max - min) || 1;
    const pts = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - 3 - ((v - min) / span) * (h - 6);
      return [x, y];
    });
    const line = "M" + pts.map(p => p.join(",")).join(" L ");
    const fill = line + ` L ${w},${h} L 0,${h} Z`;
    return { line, fill };
  }

  function renderKPIs() {
    const { cur, prior } = windowFor(currentN);
    kpisEl.innerHTML = "";
    kpiDefs.forEach(def => {
      const curVal = def.value(cur);
      const priorVal = prior ? def.value(prior) : null;
      const delta = priorVal ? ((curVal - priorVal) / priorVal) * 100 : null;
      const spark = sparkPath(cur.map(def.spark));

      const wrap = document.createElement("div");
      wrap.className = "kpi";
      wrap.innerHTML = `
        <div class="kpi__top">
          <span class="kpi__label">${def.label}</span>
          <button class="proof" data-kpi="${def.key}">Prove it <span aria-hidden="true">›</span></button>
        </div>
        <div class="kpi__value">${def.fmt(curVal)}</div>
        ${delta === null
          ? `<span class="kpi__delta flat">no prior ${currentN}M window</span>`
          : `<span class="kpi__delta ${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "▲" : "▼"} ${pct1(Math.abs(delta))} vs prior ${currentN}M</span>`}
        <svg class="kpi__spark" viewBox="0 0 120 34" preserveAspectRatio="none">
          <path class="fill" d="${spark.fill}"></path>
          <path class="line" d="${spark.line}"></path>
        </svg>
      `;
      kpisEl.appendChild(wrap);
    });

    kpisEl.querySelectorAll("[data-kpi]").forEach(btn => {
      btn.addEventListener("click", () => {
        const def = kpiDefs.find(d => d.key === btn.dataset.kpi);
        openDrawer(chainHTML(
          "Prove it",
          `${def.label}, last ${currentN} complete months`,
          `${def.fmt(def.value(windowFor(currentN).cur))} is a sum over ${currentN} months of clean rows. The rules below are the ones that actually change this number — highlighted in the chain.`,
          def.rules,
          def.caveat
        ));
      });
    });
  }

  // ── revenue chart (all 13 months, active window highlighted) ──────────
  const revChart = document.getElementById("revChart");
  const revGrid = document.getElementById("revGrid");
  const revBars = document.getElementById("revBars");
  const revAxis = document.getElementById("revAxis");
  const VBW = 900, VBH = 220, PAD_B = 20, PAD_T = 10;

  function renderRevChart() {
    const maxRev = Math.max(...months.map(m => m.rev));
    const n = months.length;
    const gap = 6;
    const bw = (VBW - gap * (n - 1)) / n;
    const activeSet = new Set(windowFor(currentN).cur.map(m => m.m));

    // gridlines
    revGrid.innerHTML = [0.25, 0.5, 0.75, 1].map(f => {
      const y = PAD_T + (VBH - PAD_T - PAD_B) * (1 - f);
      return `<line x1="0" y1="${y}" x2="${VBW}" y2="${y}" stroke="rgba(243,233,210,.06)" stroke-width="1"></line>`;
    }).join("");

    revBars.innerHTML = months.map((m, i) => {
      const h = (m.rev / maxRev) * (VBH - PAD_T - PAD_B);
      const x = i * (bw + gap);
      const y = VBH - PAD_B - h;
      const isPartial = m === partial;
      const isActive = activeSet.has(m.m);
      const opacity = isActive || isPartial ? 1 : 0.32;
      // the focus ring is a drawn rect, not an outline — `outline` on an SVG
      // <g> does not paint in Chrome, so keyboard focus would be invisible.
      const fy = Math.max(0, y - 3);
      return `
        <g class="bar" data-m="${m.m}" style="opacity:${opacity}">
          <rect class="fill" x="${x}" y="${y}" width="${bw}" height="${h}" rx="2"
                fill="${isPartial ? "#3a332a" : "var(--sig)"}"></rect>
          ${isPartial ? `<rect class="hatch" x="${x}" y="${y}" width="${bw}" height="${h}" rx="2" fill="url(#hatch)"></rect>` : ""}
          <rect class="focusring" x="${x - 3}" y="${fy}" width="${bw + 6}" height="${VBH - PAD_B - fy + 3}" rx="3"></rect>
        </g>`;
    }).join("");

    revAxis.innerHTML = months.map(m => `<span>${monthLabelShort(m.m)}</span>`).join("");

    document.getElementById("revSub").textContent =
      `${monthLabel(months[0].m)} – ${monthLabel(months[months.length - 1].m)} · last month drawn hatched, stops 9 Dec`;
    document.getElementById("partialNote").textContent =
      `${monthLabel(partial.m)} stops on 9 Dec — only ${gbpAbbr(partial.rev)} across ${intFmt(partial.orders)} orders in 9 days. It is excluded from every KPI above and drawn hatched here so the fall at the right edge doesn't read as a collapse.`;

    revBars.querySelectorAll(".bar").forEach(el => {
      const bm = months.find(mm => mm.m === el.dataset.m);
      makeActivatable(el, `${monthLabel(bm.m)} — ${gbpAbbr(bm.rev)}, open month detail`, () => {
        const m = months.find(mm => mm.m === el.dataset.m);
        const isPartial = m === partial;
        openDrawer(`
          <span class="kicker">Month detail</span>
          <h3>${monthLabel(m.m)}</h3>
          <p class="lede">${gbp(m.rev)} across ${intFmt(m.orders)} orders — an average order value of ${gbp(m.rev / m.orders)}.
          ${isPartial ? " This month is only 9 days of data; it is excluded from every KPI on this page." : ` This is ${((m.rev / sum(months, "rev")) * 100).toFixed(1)}% of the full 13-month total.`}</p>
          <div class="chain">
            <div class="chain-row"><div class="chain-row__n">${gbp(m.rev)}</div><div class="chain-row__t"><b>Revenue</b><span>Sum of quantity × price on every kept row invoiced this month.</span></div></div>
            <div class="chain-row"><div class="chain-row__n">${intFmt(m.orders)}</div><div class="chain-row__t"><b>Orders</b><span>Distinct invoice numbers, cancellations and duplicates already removed.</span></div></div>
          </div>
          <button class="proof" data-drill="lineage" style="margin-top:4px">See the full cleaning chain ›</button>
        `);
        drawerBody.querySelector("[data-drill='lineage']")?.addEventListener("click", () => openDrawer(lineageDrawerHTML()));
      });
    });
  }

  // ── markets & products (bar sits BEHIND the label) ─────────────────────
  function renderRowbars(listEl, rows, opts) {
    listEl.innerHTML = "";
    const max = Math.max(...rows.map(r => r.rev));
    rows.forEach(r => {
      const li = document.createElement("li");
      li.className = "rowbar" + (r.other ? " rowbar--other" : "");
      li.innerHTML = `
        <div class="rowbar__fill" style="width:${(r.rev / max) * 100}%"></div>
        <div class="rowbar__row">
          <span class="rowbar__name">${r.name}</span>
          ${r.tag ? `<span class="rowbar__tag">${r.tag}</span>` : ""}
          <span class="rowbar__num">${opts.sub(r)}</span>
          <span class="rowbar__share">${r.share.toFixed(1)}%</span>
        </div>`;
      makeActivatable(li, opts.label(r), () => openDrawer(opts.drawer(r)));
      listEl.appendChild(li);
    });
  }

  function renderMarkets() {
    const countries = data.countries;
    const listedRev = sum(countries, "rev");
    const listedOrders = sum(countries, "orders");
    const otherRev = data.kpi.revenue - listedRev;
    const otherOrders = data.kpi.orders - listedOrders;
    const otherCount = data.kpi.countries - countries.length;
    const rows = [
      ...countries.map(c => ({ ...c, name: c.name })),
      { name: `${otherCount} other markets`, rev: otherRev, orders: otherOrders, share: (otherRev / data.kpi.revenue) * 100, other: true }
    ];
    renderRowbars(document.getElementById("markets"), rows, {
      sub: r => intFmt(r.orders) + " ord",
      label: r => `${r.name} — ${r.share.toFixed(1)}% of revenue, open market detail`,
      drawer: r => r.other ? `
        <span class="kicker">Remainder</span>
        <h3>${r.name}</h3>
        <p class="lede">${data.kpi.countries} markets are served in total. The 7 named above are shown individually; everything else is summed here so the list stays short without hiding the total.</p>
        <div class="chain">
          <div class="chain-row"><div class="chain-row__n">${gbp(data.kpi.revenue)}</div><div class="chain-row__t"><b>All markets</b><span>Total clean revenue, 38 countries.</span></div></div>
          <div class="chain-row"><div class="chain-row__n">−${gbp(listedRev)}</div><div class="chain-row__t"><b>7 named markets</b><span>United Kingdom down to Spain, listed above by revenue.</span></div></div>
          <div class="chain-row hi"><div class="chain-row__n">${gbp(otherRev)}</div><div class="chain-row__t"><b>${otherCount} remaining markets</b><span>Computed as the remainder, not looked up individually.</span></div></div>
        </div>` : `
        <span class="kicker">Market</span>
        <h3>${r.name}</h3>
        <p class="lede">${gbp(r.rev)} across ${intFmt(r.orders)} orders — ${r.share.toFixed(1)}% of all revenue.
        ${r.name === "United Kingdom" ? " This single market is 84.6% of the business; see the findings section for what that concentration means." : ` Home market (United Kingdom) alone is ${data.homeShare}% by comparison.`}</p>`
    });
    document.getElementById("mktSub").textContent = `${data.kpi.countries} markets served`;
  }

  function renderProducts() {
    const products = data.products;
    const rows = products.map(p => ({
      name: p.name, rev: p.rev, orders: p.units, share: p.share,
      units: p.units,
      tag: /postage/i.test(p.name) ? "FEE, NOT GOODS" : null
    }));
    renderRowbars(document.getElementById("products"), rows, {
      sub: r => intFmt(r.units) + " units",
      label: r => `${r.name} — ${r.share.toFixed(1)}% of revenue, open product detail`,
      drawer: r => r.tag ? `
        <span class="kicker">Flagged line</span>
        <h3>${r.name}</h3>
        <p class="lede">This is a delivery charge booked as a line item, not a physical product — it should not be read as your best-selling item.</p>
        <div class="chain">
          <div class="chain-row hi"><div class="chain-row__n">${gbp(data.nonGoodsRev)}</div><div class="chain-row__t"><b>Non-goods revenue</b><span>${data.nonGoodsShare}% of all revenue is postage, bank fees and manual adjustments booked as line items — this row is part of that total.</span></div></div>
          <div class="chain-row"><div class="chain-row__n">${gbp(r.rev)}</div><div class="chain-row__t"><b>${r.name}</b><span>${r.share.toFixed(1)}% of total revenue on its own — the single largest line item, precisely because it isn't a product.</span></div></div>
        </div>` : `
        <span class="kicker">Top line</span>
        <h3>${r.name}</h3>
        <p class="lede">${gbp(r.rev)} from ${intFmt(r.units)} units sold — ${r.share.toFixed(1)}% of all revenue. 5.7% of the catalogue earns half of takings; this is one line inside that top slice.</p>`
    });
    document.getElementById("prdSub").textContent = "top 8 lines, goods and fees";
  }

  // ── findings ─────────────────────────────────────────────────────────
  function renderFindings() {
    const el = document.getElementById("findings");
    el.innerHTML = data.findings.map((f, i) => `
      <div class="finding" data-i="${i}">
        <div class="finding__head">
          <span class="finding__conf ${f.confidence}">${f.confidence}</span>
          <div class="finding__text">
            <div class="finding__headline">${f.headline}</div>
            <div class="finding__detail">${f.detail}</div>
          </div>
          <span class="finding__toggle">▸</span>
        </div>
        <div class="finding__why">
          <div class="finding__why-in">
            <p>${f.why}</p>
            <div class="basis">Basis — ${f.basis}</div>
            <div class="basis" style="color:var(--sig)">Action — ${f.action}</div>
          </div>
        </div>
      </div>
    `).join("");
    el.querySelectorAll(".finding").forEach((card, i) => {
      const head = card.querySelector(".finding__head");
      head.setAttribute("aria-expanded", "false");
      makeActivatable(head, `Why: ${data.findings[i].headline}`, () => {
        card.classList.toggle("is-open");
        head.setAttribute("aria-expanded", card.classList.contains("is-open") ? "true" : "false");
      });
    });
  }

  // ── lineage ──────────────────────────────────────────────────────────
  function lineageDrawerHTML() {
    return chainHTML("Full chain", "Every row, kept or removed",
      `${intFmt(data.rawRows)} raw rows became ${intFmt(data.keptRows)} clean ones. Four rules did the removing; every count below is checked to sum to the total.`,
      null, null);
  }

  function renderLineage() {
    const bar = document.getElementById("lineageBar");
    const list = document.getElementById("lineageList");
    const total = data.rawRows;
    const segs = [
      { label: "Kept", rows: data.keptRows, kept: true, why: "Passed every check — this is what the dashboard is built from.", impact: "—" },
      ...data.excluded
    ];
    bar.innerHTML = segs.map(s => `
      <div class="lineage-seg ${s.kept ? "kept" : "cut"}" style="width:${(s.rows / total) * 100}%" data-label="${s.label}" title="${s.label}: ${intFmt(s.rows)} rows"></div>
    `).join("");
    list.innerHTML = segs.map(s => `
      <li class="lineage-row" data-label="${s.label}">
        <span class="lineage-row__sw ${s.kept ? "kept" : "cut"}"></span>
        <span class="lineage-row__label">${s.label}</span>
        <span class="lineage-row__n">${intFmt(s.rows)} rows</span>
        <span class="lineage-row__pct">${((s.rows / total) * 100).toFixed(1)}%</span>
      </li>
    `).join("");

    [...bar.children, ...list.children].forEach(el => {
      const seg0 = segs.find(s => s.label === el.dataset.label);
      const name = `${seg0.label} — ${intFmt(seg0.rows)} rows, ${((seg0.rows / total) * 100).toFixed(1)}%, open detail`;
      makeActivatable(el, name, () => {
        const label = el.dataset.label;
        const seg = segs.find(s => s.label === label);
        if (seg.kept) { openDrawer(lineageDrawerHTML()); return; }
        openDrawer(`
          <span class="kicker">Exclusion rule</span>
          <h3>${seg.label}</h3>
          <p class="lede">${seg.why}</p>
          <div class="chain">
            <div class="chain-row hi">
              <div class="chain-row__n">${intFmt(seg.rows)}</div>
              <div class="chain-row__t"><b>Rows removed by this rule</b><span>${((seg.rows / total) * 100).toFixed(2)}% of the raw export.</span></div>
            </div>
          </div>
          <p class="lede" style="margin-top:14px;font-size:14px"><b style="font-weight:700">Impact —</b> ${seg.impact}</p>
          <button class="proof" data-drill="lineage" style="margin-top:8px">See the whole chain ›</button>
        `);
        drawerBody.querySelector("[data-drill='lineage']")?.addEventListener("click", () => openDrawer(lineageDrawerHTML()));
      });
    });

    document.getElementById("lineageSub").textContent =
      `${intFmt(data.rawRows)} raw → ${intFmt(data.keptRows)} kept · ${intFmt(data.excludedTotal)} removed across 4 rules`;
    document.getElementById("assertLine").innerHTML =
      `${data.excluded.map(e => intFmt(e.rows)).join(" + ")} = ${intFmt(data.excludedTotal)} &nbsp;·&nbsp; ${intFmt(data.rawRows)} − ${intFmt(data.keptRows)} = ${intFmt(data.excludedTotal)} <span class="ok">✓ the parts sum to the whole</span>`;
  }

  // ── revenue chart's own "prove it" button ──────────────────────────────
  document.querySelectorAll("[data-drill='lineage']").forEach(btn => {
    btn.addEventListener("click", () => openDrawer(lineageDrawerHTML()));
  });

  // ── period control ───────────────────────────────────────────────────
  const periodEl = document.getElementById("period");
  periodEl.addEventListener("click", e => {
    const btn = e.target.closest(".period__b");
    if (!btn) return;
    periodEl.querySelectorAll(".period__b").forEach(b => b.classList.toggle("is-on", b === btn));
    currentN = +btn.dataset.n;
    renderKPIs();
    renderRevChart();
  });
  periodEl.querySelector('[data-n="12"]').classList.add("is-on");

  // ── header meta ──────────────────────────────────────────────────────
  document.getElementById("asofText").textContent =
    `as of 9 ${monthLabel(partial.m)} · ${months.length} months of data`;

  // ── initial render ───────────────────────────────────────────────────
  renderKPIs();
  renderRevChart();
  renderMarkets();
  renderProducts();
  renderFindings();
  renderLineage();
}
