(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  function parseMonth(m) {
    const [y, mm] = m.split("-");
    const idx = parseInt(mm, 10) - 1;
    return { year: y, idx };
  }
  function monthShort(m) {
    const { year, idx } = parseMonth(m);
    return MONTHS_SHORT[idx] + " " + year.slice(2);
  }
  function monthLong(m) {
    const { year, idx } = parseMonth(m);
    return MONTHS_LONG[idx] + " " + year;
  }

  function fmtGBPCompact(n) {
    const abs = Math.abs(n);
    if (abs >= 1e6) return "£" + (n / 1e6).toFixed(2) + "m";
    if (abs >= 1e3) return "£" + (n / 1e3).toFixed(0) + "k";
    return "£" + Math.round(n);
  }
  function fmtGBPFull(n) {
    return "£" + Math.round(n).toLocaleString("en-GB");
  }
  function fmtInt(n) {
    return Math.round(n).toLocaleString("en-GB");
  }
  function fmtPct(n, d) {
    return n.toFixed(d == null ? 1 : d) + "%";
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ── tiny sparkline: an SVG polyline with no text in it, so viewBox
  //    stretching is safe (the pixel-space warning in the vault only
  //    applies to charts that also carry type). ──────────────────────────
  function sparkSVG(values) {
    const n = values.length;
    if (n < 2) return "";
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => {
      const x = (i / (n - 1)) * 100;
      const y = 24 - ((v - min) / span) * 20 - 2;
      return x.toFixed(1) + "," + y.toFixed(1);
    });
    const last = pts[pts.length - 1].split(",");
    return (
      '<svg viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">' +
      '<polyline points="' + pts.join(" ") + '" fill="none" stroke="var(--acc)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="2.2" fill="var(--acc)"/>' +
      "</svg>"
    );
  }

  // ── marks: the pictures that replaced the panel footnotes ─────────────
  //    A dashboard's reader already knows what the numbers mean, so a
  //    sentence explaining a ratio is dead weight — the ratio itself is the
  //    mark. Every one of these carries the full sentence in aria-label, so
  //    nothing is lost to a screen reader; only the on-screen prose goes.
  function markBar(pct, aria, mod) {
    return (
      '<div class="mark__bar' + (mod ? " " + mod : "") + '" role="img" aria-label="' + esc(aria) + '">' +
      '<span class="mark__seg" style="width:' + Math.min(pct, 100).toFixed(1) + '%"></span>' +
      "</div>"
    );
  }
  function markTrack(label, pct, valueText, aria) {
    return (
      '<div class="mark__track">' +
      '<span class="mark__lab">' + esc(label) + "</span>" +
      markBar(pct, aria) +
      '<span class="mark__n">' + esc(valueText) + "</span>" +
      "</div>"
    );
  }

  // ── tooltip ─────────────────────────────────────────────────────────
  const tip = $("#tip");
  let tipPinned = false;
  const isCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  function showTip(x, y, html) {
    tip.innerHTML = html;
    tip.hidden = false;
    positionTip(x, y);
  }
  function positionTip(x, y) {
    const pad = 10;
    const w = tip.offsetWidth || 160;
    let left = x, top = y - pad;
    left = Math.min(Math.max(left, w / 2 + 6), window.innerWidth - w / 2 - 6);
    top = Math.max(top, 40);
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }
  function hideTip() {
    tipPinned = false;
    tip.hidden = true;
  }
  // A2 — the tooltip carries the exact £ / orders / AOV, so it is real content,
  // not decoration: it has to be reachable without a pointer. `togglePinned` is
  // the SAME function the touch tap uses — Enter/Space does not get its own copy.
  function bindTooltip(el, getHtml, label) {
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    if (label) el.setAttribute("aria-label", label);

    function showAtEl() {
      const r = el.getBoundingClientRect();
      showTip(r.left + r.width / 2, r.top, getHtml());
    }
    function togglePinned() {
      if (tipPinned && tip.dataset.owner === el.dataset.tipId) { hideTip(); return; }
      tipPinned = true;
      tip.dataset.owner = el.dataset.tipId;
      showAtEl();
    }

    if (isCoarse) {
      el.addEventListener("click", togglePinned);
    } else {
      el.addEventListener("pointerenter", showAtEl);
      el.addEventListener("pointermove", (e) => positionTip(e.clientX, e.clientY - 14));
      el.addEventListener("pointerleave", hideTip);
    }

    el.addEventListener("focus", showAtEl);
    el.addEventListener("blur", () => {
      if (tip.dataset.owner === el.dataset.tipId || !tipPinned) hideTip();
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();          // stop Space scrolling the page
        togglePinned();
      } else if (e.key === "Escape") {
        hideTip();
      }
    });
  }
  document.addEventListener("click", (e) => {
    if (isCoarse && tipPinned && !e.target.closest("[data-tip-id]")) hideTip();
  });

  // ── load ────────────────────────────────────────────────────────────
  fetch("data.json")
    .then((r) => r.json())
    .then(init)
    .catch((err) => {
      document.body.innerHTML = '<p style="padding:40px;font:14px monospace">Could not load data.json — ' + esc(err.message) + "</p>";
    });

  const hintEl = $("#barHint");
  if (hintEl) hintEl.textContent = isCoarse ? "tap a bar" : "hover a bar";

  function init(data) {
    const months = data.months;                 // 13 entries, last is partial
    const complete = months.slice(0, 12);        // Dec 2010 – Nov 2011
    const partial = months[12];                  // Dec 2011, through the 9th

    let period = 6;

    // windowed sums over the COMPLETE months only — the partial month never
    // touches a KPI (Retail Dashboard Round's rule, reapplied here).
    function windowOf(n) {
      const last = complete.slice(complete.length - n);
      const priorStart = complete.length - n * 2;
      const prior = priorStart >= 0 ? complete.slice(priorStart, complete.length - n) : null;
      const sum = (arr, key) => arr.reduce((a, m) => a + m[key], 0);
      const out = { months: last, rev: sum(last, "rev"), orders: sum(last, "orders") };
      out.aov = out.orders ? out.rev / out.orders : 0;
      if (prior && prior.length === n) {
        out.priorRev = sum(prior, "rev");
        out.priorOrders = sum(prior, "orders");
        out.priorAov = out.priorOrders ? out.priorRev / out.priorOrders : 0;
      } else {
        out.priorRev = null;
      }
      return out;
    }

    function deltaChip(cur, prior) {
      if (prior == null) return '<span class="kpi__chip flat">no prior</span>';
      const pct = ((cur - prior) / prior) * 100;
      const cls = pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat";
      const sign = pct > 0 ? "▲" : pct < 0 ? "▼" : "•";
      return '<span class="kpi__chip ' + cls + '">' + sign + " " + Math.abs(pct).toFixed(1) + "%</span>";
    }

    // ── KPI row ───────────────────────────────────────────────────────
    const kpiEl = $("#kpis");

    function renderKPIs() {
      const w = windowOf(period);
      const revSpark = sparkSVG(w.months.map((m) => m.rev));
      const ordSpark = sparkSVG(w.months.map((m) => m.orders));
      const aovSpark = sparkSVG(w.months.map((m) => m.rev / m.orders));

      const nextCountry = data.countries[1];
      const homeRatio = (data.homeShare / nextCountry.share).toFixed(1);

      // 65.6% repeat customers / 93.1% repeat revenue — data.findings[2].detail
      const repeatCustomerShare = 65.6;
      const repeatRevenueShare = 93.1;

      kpiEl.innerHTML =
        kpiCard({
          label: "Revenue", value: fmtGBPCompact(w.rev),
          chip: deltaChip(w.rev, w.priorRev), spark: revSpark,
        }) +
        kpiCard({
          label: "Orders", value: fmtInt(w.orders),
          chip: deltaChip(w.orders, w.priorOrders), spark: ordSpark,
        }) +
        kpiCard({
          label: "AOV", value: fmtGBPFull(w.aov),
          chip: deltaChip(w.aov, w.priorAov), spark: aovSpark,
        }) +
        kpiCard({
          label: "Home share", tag: "ALL-TIME", value: fmtPct(data.homeShare),
          chip: '<span class="kpi__chip flat">' + homeRatio + "×</span>",
          mark: markBar(
            data.homeShare,
            "United Kingdom is " + fmtPct(data.homeShare) + " of revenue — " + homeRatio +
            " times the next market, " + nextCountry.name + " at " + fmtPct(nextCountry.share),
            "mark__bar--tall"
          ),
        }) +
        kpiCard({
          label: "Repeat revenue", tag: "ALL-TIME", value: fmtPct(repeatRevenueShare),
          mark:
            markTrack("Rev", repeatRevenueShare, fmtPct(repeatRevenueShare),
              "Repeat customers produce " + fmtPct(repeatRevenueShare) + " of attributable revenue") +
            markTrack("Cust", repeatCustomerShare, fmtPct(repeatCustomerShare),
              "Repeat customers are " + fmtPct(repeatCustomerShare) + " of identifiable customers"),
          limit: "25.2% rows unattributed",
        });
    }

    function kpiCard(cfg) {
      const rowInner = cfg.spark
        ? (cfg.chip || "") + '<span class="kpi__spark">' + cfg.spark + "</span>"
        : (cfg.chip || "") + '<span class="kpi__mark">' + (cfg.mark || "") + "</span>";
      return (
        '<article class="kpi">' +
        '<div class="kpi__top"><span class="kpi__label">' + esc(cfg.label) + "</span>" +
        (cfg.tag ? '<span class="kpi__tag">' + esc(cfg.tag) + "</span>" : "") +
        "</div>" +
        '<div class="kpi__value">' + cfg.value + "</div>" +
        '<div class="kpi__row">' + rowInner + "</div>" +
        (cfg.limit ? '<span class="kpi__limit">' + esc(cfg.limit) + "</span>" : "") +
        "</article>"
      );
    }

    // ── monthly bar chart ────────────────────────────────────────────
    const barEl = $("#barchart");
    const axisEl = $("#barchartAxis");
    const maxRev = Math.max(...months.map((m) => m.rev));

    months.forEach((m, i) => {
      const isPartial = i === months.length - 1;
      const pct = Math.max((m.rev / maxRev) * 100, 4);
      const col = document.createElement("div");
      col.className = "barcol" + (isPartial ? " is-partial" : "");
      col.dataset.idx = i;
      col.dataset.tipId = "bar-" + i;
      col.innerHTML = '<div class="barcol__fill" style="height:' + pct.toFixed(1) + '%"></div>';
      barEl.appendChild(col);

      const aov = m.orders ? m.rev / m.orders : 0;
      bindTooltip(col, () =>
        "<b>" + monthLong(m.m) + (isPartial ? " (partial — thru 9th)" : "") + "</b><br>" +
        "Revenue " + fmtGBPFull(m.rev) + "<br>" +
        "Orders " + fmtInt(m.orders) + " · AOV " + fmtGBPFull(aov),
        monthLong(m.m) + (isPartial ? " (partial month)" : "") + " — show revenue, orders and AOV"
      );

      const lab = document.createElement("span");
      lab.textContent = monthShort(m.m);
      axisEl.appendChild(lab);
    });

    function highlightWindow() {
      const cols = $$(".barcol", barEl);
      const completeCount = complete.length;
      cols.forEach((col) => {
        const i = parseInt(col.dataset.idx, 10);
        const inWindow = i < completeCount && i >= completeCount - period;
        col.classList.toggle("in-window", inWindow);
      });
    }

    // ── ranked lists: bar-fill sits BEHIND the row's own text ──────────
    function renderRankList(el, rows, opts) {
      const max = Math.max(...rows.map((r) => r.metric));
      el.innerHTML = "";
      rows.forEach((r, i) => {
        const row = document.createElement("div");
        row.className = "rankrow";
        row.dataset.tipId = "rank-" + opts.key + "-" + i;
        const widthPct = Math.max((r.metric / max) * 100, 3);
        row.innerHTML =
          '<span class="rankrow__fill" style="width:' + widthPct.toFixed(1) + '%"></span>' +
          '<span class="rankrow__rank">' + (i + 1) + "</span>" +
          '<span class="rankrow__name">' + esc(r.name) + "</span>" +
          '<span class="rankrow__value">' + r.valueLabel + "</span>";
        bindTooltip(row, () => r.tip, r.name + " — show exact figures");
        el.appendChild(row);
        // one-shot entrance, not a loop — width transitions in from 0 on first paint
        requestAnimationFrame(() => { row.querySelector(".rankrow__fill").style.width = widthPct.toFixed(1) + "%"; });
      });
    }

    const topCountries = data.countries.slice(0, 7);
    const countrySum = topCountries.reduce((a, c) => a + c.share, 0);
    const restShare = Math.max(0, 100 - countrySum);
    const countryRows = topCountries.map((c) => ({
      name: c.name, metric: c.share, valueLabel: fmtPct(c.share),
      tip: "<b>" + esc(c.name) + "</b><br>" + fmtGBPFull(c.rev) + " · " + fmtInt(c.orders) + " orders",
    }));
    countryRows.push({
      name: "Rest of world (" + (data.kpi.countries - topCountries.length) + " markets)",
      metric: restShare, valueLabel: fmtPct(restShare),
      tip: "<b>Rest of world</b><br>" + fmtPct(restShare) + " of revenue across " + (data.kpi.countries - topCountries.length) + " smaller markets",
    });
    renderRankList($("#countryList"), countryRows, { key: "country" });
    $("#countryCount").textContent = data.kpi.countries + " markets";
    // was: "Top 7 = 96.0% of revenue · one market carries the page"
    $("#countryFoot").innerHTML = markTrack(
      "Top 7", countrySum, fmtPct(countrySum),
      "The top seven markets are " + fmtPct(countrySum) + " of revenue; the remaining " +
      (data.kpi.countries - topCountries.length) + " markets are " + fmtPct(restShare)
    );

    const products = data.products.slice(0, 8);
    const productRows = products.map((p) => ({
      name: p.name, metric: p.rev, valueLabel: fmtGBPCompact(p.rev),
      tip: "<b>" + esc(p.name) + "</b><br>" + fmtGBPFull(p.rev) + " · " + fmtInt(p.units) + " units · " + fmtPct(p.share) + " of revenue",
    }));
    renderRankList($("#productList"), productRows, { key: "product" });
    // 230 of 4,026 SKUs / 50% — data.findings[0].detail
    $("#productCount").textContent = "4,026 SKUs";
    // was: "230 of 4,026 SKUs (5.7%) earn half of revenue" — two tracks say it
    // in one glance: a fifth of a bar's worth of catalogue against half a bar
    // of revenue.
    $("#productFoot").innerHTML =
      markTrack("SKUs", 5.7, "5.7%", "230 of 4,026 stock lines — 5.7% of the catalogue") +
      markTrack("Rev", 50, "50%", "Those 230 lines earn 50% of revenue");

    // ── footer: the cleaning chain as one bar, not a sentence ──────────
    const keptPct = (data.keptRows / data.rawRows) * 100;
    $("#foot").innerHTML =
      '<span class="mark__lab">Rows</span>' +
      markBar(
        keptPct,
        fmtInt(data.keptRows) + " of " + fmtInt(data.rawRows) + " raw rows kept — " +
        fmtInt(data.rawRows - data.keptRows) + " removed as duplicates, cancellations, " +
        "non-positive quantity or non-positive price. Revenue is gross of returns and the " +
        "data stops mid-" + partial.m + ", so the last month is partial.",
        "mark__bar--wide"
      ) +
      // one wrapping unit, so a narrow phone never orphans the raw count on
      // its own line under the bar
      '<span class="foot__nums"><span class="mark__n">' + fmtInt(data.keptRows) + "</span>" +
      '<span class="mark__n mark__n--raw">' + fmtInt(data.rawRows) + "</span></span>";

    // ── period control ─────────────────────────────────────────────
    $$(".seg__b").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".seg__b").forEach((b) => { b.classList.remove("is-on"); b.setAttribute("aria-pressed", "false"); });
        btn.classList.add("is-on");
        btn.setAttribute("aria-pressed", "true");
        period = parseInt(btn.dataset.p, 10);
        renderKPIs();
        highlightWindow();
      });
    });

    renderKPIs();
    highlightWindow();
  }
})();
