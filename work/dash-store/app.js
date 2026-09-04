(() => {
  "use strict";

  /* units, price, cost of goods, postage paid by us, ad spend, return rate */
  const P = [
    /* the trap: most revenue in the shop, and it loses money on every order.
       Heavily advertised, and a quarter of them come back because the copper
       photographs warmer than it looks in a kitchen. */
    { n: "Copper kettle",      u: 268, price: 89.00, cogs: 41.00, post: 11.40, ads: 7600, ret: 0.26 },
    { n: "Enamel mug",         u: 986, price: 14.00, cogs:  4.10, post:  4.90, ads:  620, ret: 0.03 },
    { n: "Linen apron",        u: 342, price: 46.00, cogs: 17.50, post:  6.20, ads: 1140, ret: 0.07 },
    { n: "Cast pan, 26cm",     u: 168, price:129.00, cogs: 62.00, post: 14.80, ads: 1980, ret: 0.05 },
    { n: "Wooden spoon set",   u: 604, price: 19.50, cogs:  5.60, post:  4.90, ads:  410, ret: 0.02 },
    { n: "Glass storage, 6pk", u: 231, price: 58.00, cogs: 26.00, post: 12.60, ads: 1460, ret: 0.11 },
    { n: "Tea towel, pair",    u: 712, price: 16.00, cogs:  4.80, post:  4.20, ads:  330, ret: 0.02 },
    { n: "Stovetop brewer",    u: 187, price: 72.00, cogs: 33.00, post:  7.40, ads:  980, ret: 0.06 },
    { n: "Chopping board",     u: 259, price: 64.00, cogs: 24.50, post:  9.80, ads:  760, ret: 0.04 },
  ];

  const FUNNEL = [
    ["Visited",     41820],
    ["Viewed item", 22640],
    ["Added",        6180],
    ["Checkout",     4310],
    ["Paid",         3703],
  ];

  const WHY = [
    ["Not as pictured", 148, "colour of the copper"],
    ["Arrived damaged",  96, "kettles and glass"],
    ["Changed mind",     71, ""],
    ["Wrong size",       34, "aprons"],
  ];

  const LAST = { revenue: 134500, profit: 34200, orders: 3540, ads: 12900 };

  const $ = (s, r = document) => r.querySelector(s);
  const money = (n) => (n < 0 ? "−$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-AU");
  const money2 = (n) => (n < 0 ? "−$" : "$") + Math.abs(n).toFixed(2);

  /* ── derive everything ───────────────────────────────────────────────── */
  const rows = P.map((p) => {
    const revenue = p.u * p.price;
    const returned = Math.round(p.u * p.ret);
    /* a return costs the postage out, the postage back, and a third of them
       cannot be resold at full price */
    const retCost = returned * (p.post * 2 + p.price * 0.33);
    const profit = revenue - p.u * p.cogs - p.u * p.post - p.ads - retCost;
    return { ...p, revenue, returned, retCost, profit, per: profit / p.u };
  });

  const tot = {
    revenue: rows.reduce((s, r) => s + r.revenue, 0),
    profit:  rows.reduce((s, r) => s + r.profit, 0),
    orders:  rows.reduce((s, r) => s + r.u, 0),
    ads:     rows.reduce((s, r) => s + r.ads, 0),
    retCost: rows.reduce((s, r) => s + r.retCost, 0),
    returned: rows.reduce((s, r) => s + r.returned, 0),
  };
  const hero = rows.reduce((a, b) => (b.revenue > a.revenue ? b : a));
  const losers = rows.filter((r) => r.profit < 0).sort((a, b) => a.profit - b.profit);

  /* ── 1. the finding ──────────────────────────────────────────────────── */
  (() => {
    const worst = losers[0] || rows.reduce((a, b) => (b.per < a.per ? b : a));
    const isHero = worst === hero;
    /* ⚠️ never say "loses" about a positive number — the first version picked the
       thinnest-margin product when nothing was actually loss-making and called it
       a loss, while the table beside it showed the same figure as a profit. */
    const verb = worst.profit < 0
      ? "<em>loses " + money2(Math.abs(worst.per)) + " an order</em>"
      : "earns only <em>" + money2(worst.per) + " an order</em>";
    $("#findHead").innerHTML = isHero
      ? "Your biggest seller by revenue " + verb + "."
      : "Revenue looks fine, but the " + worst.n.toLowerCase() + " " + verb + ".";
    $("#findBody").textContent =
      (worst.profit<0?worst.n+" took ":worst.n+" took ") + money(worst.revenue) + " this month and ended " + money(worst.profit) +
      ". " + money(worst.ads) + " of that went on ads and " + worst.returned +
      " of " + worst.u + " came back — a " + Math.round(worst.ret * 100) +
      "% return rate, which costs " + money(worst.retCost) + " on its own.";
    $("#findAct").innerHTML =
      "Stop the ads on it and the month goes from <b>" + money(tot.profit) + "</b> to <b>" +
      money(tot.profit + worst.ads) + "</b>. Fix the photos and the returns are worth another <b>" +
      money(worst.retCost * 0.6) + "</b>.";
  })();

  /* ── 2. the four numbers that matter ─────────────────────────────────── */
  (() => {
    const pc = (a, b) => ((a - b) / b) * 100;
    const cells = [
      ["Revenue", money(tot.revenue), pc(tot.revenue, LAST.revenue), true, false],
      ["Profit after everything", money(tot.profit), pc(tot.profit, LAST.profit), true, false],
      ["Orders", tot.orders.toLocaleString("en-AU"), pc(tot.orders, LAST.orders), true, false],
      ["Spent on ads", money(tot.ads), pc(tot.ads, LAST.ads), false, false],
      ["Lost to returns", money(tot.retCost), null, false, true],
    ];
    $("#tot").innerHTML = cells.map(([k, v, d, upGood, neg]) =>
      "<div" + (neg ? ' class="neg"' : "") + "><dt>" + k + '</dt><dd><span class="v">' + v + "</span>" +
      (d === null ? "" : '<span class="d ' + ((d >= 0) === upGood ? "up" : "down") + '">' +
        (d >= 0 ? "+" : "") + d.toFixed(1) + "%</span>") + "</dd></div>").join("");
  })();

  /* ── 3. the product table, sortable in place ─────────────────────────── */
  const SORTS = [["profit", "Profit"], ["per", "Per order"], ["revenue", "Revenue"], ["ret", "Return rate"], ["u", "Units"]];
  let sortKey = "profit";
  const body = $("#items tbody");

  function paint() {
    const list = rows.slice().sort((a, b) =>
      sortKey === "ret" ? b.ret - a.ret : (a[sortKey] < b[sortKey] ? 1 : -1));
    body.innerHTML = list.map((r) => {
      const cls = [r.profit < 0 ? "bad" : "", r === hero ? "hero" : ""].filter(Boolean).join(" ");
      return "<tr" + (cls ? ' class="' + cls + '"' : "") + ">" +
        '<td class="nm">' + r.n + "</td>" +
        '<td class="n">' + r.u.toLocaleString("en-AU") + "</td>" +
        '<td class="n">' + money(r.revenue) + "</td>" +
        '<td class="n">' + money(r.ads) + "</td>" +
        '<td class="n">' + Math.round(r.ret * 100) + "%</td>" +
        '<td class="n p"><b>' + money(r.profit) + "</b></td>" +
        '<td class="n p">' + money2(r.per) + "</td></tr>";
    }).join("");
  }
  $("#sorts").innerHTML = SORTS.map(([k, label]) =>
    '<button type="button" data-k="' + k + '" aria-pressed="' + (k === sortKey) + '">' + label + "</button>").join("");
  $("#sorts").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-k]");
    if (!b) return;
    sortKey = b.dataset.k;
    [...e.currentTarget.querySelectorAll("button")].forEach((x) =>
      x.setAttribute("aria-pressed", String(x.dataset.k === sortKey)));
    paint();
  });
  paint();

  /* ── 4. the funnel, with the worst drop called out ───────────────────── */
  (() => {
    const top = FUNNEL[0][1];
    const drops = FUNNEL.map(([, v], i) => (i === 0 ? 0 : 1 - v / FUNNEL[i - 1][1]));
    const worst = drops.indexOf(Math.max(...drops));
    $("#fun").innerHTML = FUNNEL.map(([k, v], i) =>
      "<div" + (i === worst ? ' class="worst"' : "") + '><span class="lb">' + k + "</span>" +
      '<span class="track"><span class="fill" style="width:' + ((v / top) * 100).toFixed(1) + '%"></span></span>' +
      '<span class="vv">' + v.toLocaleString("en-AU") + "</span>" +
      '<span class="drop">' + (i === 0 ? "" : "−" + Math.round(drops[i] * 100) + "%") + "</span></div>").join("");
  })();

  /* ── 5. why things came back ─────────────────────────────────────────── */
  (() => {
    $("#why").innerHTML = WHY.map(([k, n, note]) =>
      "<div><span>" + k + (note ? ' <span class="dim">— ' + note + "</span>" : "") +
      '</span><span class="n">' + n + "</span></div>").join("");
    $("#retV").textContent = money(tot.retCost);
    $("#retN").textContent = tot.returned + " of " + tot.orders.toLocaleString("en-AU") +
      " orders · " + ((tot.retCost / tot.revenue) * 100).toFixed(1) + "% of revenue";
  })();

  /* ── 6. orders today — live, because a frozen "today" reads as a mockup ─ */
  (() => {
    const el = $("#liveN"), vs = $("#liveVs");
    const daily = tot.orders / 31;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paintLive = () => {
      const now = new Date();
      const frac = (now.getHours() * 60 + now.getMinutes()) / (24 * 60);
      /* shopping is not flat across the day — weight it toward the evening */
      const shaped = Math.pow(frac, 1.35);
      const n = Math.round(daily * shaped);
      el.textContent = String(n);
      vs.textContent = n === 0 ? "none yet" : Math.round(shaped * 100) + "% through the day";
    };
    paintLive();
    if (!reduced) setInterval(() => { if (!document.hidden) paintLive(); }, 15000);
  })();

  /* ── CHANGE OVER TIME and PART-TO-WHOLE ─────────────────────────────────
     Added after Aufan's CEO test: "if i were ceo i would not know a damn
     thing, it should be streamlined and graph". The FT Visual Vocabulary sorts
     charts by the question they answer, and the two an owner asks first are
     "which way is it going" (change over time) and "where did the money go"
     (part-to-whole). This board had neither — only tables. */
  const BLUE = "#4F8DF7", BLUE_L = "#7FB2E8", RED = "#F2544B";
  const chartSvg = (w, h, inner, label) =>
    '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + label + '">' +
    '<style>.ax{font:400 11px "JetBrains Mono",monospace;fill:#6B7280}' +
    '.vl{font:500 11px "JetBrains Mono",monospace;fill:#EDEEF0}' +
    '.vo{font:500 11px "JetBrains Mono",monospace;fill:#F2544B}</style>' + inner + "</svg>";

  (() => {
    /* twelve months of revenue, this month last. Profit is derived at the same
       margin the current month actually runs at, so the two panels agree with
       the waterfall and with the totals. */
    const REV = [98400, 104200, 112800, 108900, 117600, 121300, 119800, 126400, 131900, 128700, 134500, tot.revenue];
    const margin = tot.profit / tot.revenue;
    const PRO = REV.map((r, i) => (i === REV.length - 1 ? tot.profit : r * (margin * (0.92 + i * 0.014))));

    const W = 520, L = 66, R = 12, Ht = 244;
    const panel = (vals, top, h, colour, label) => {
      const lo = Math.min(...vals), hi = Math.max(...vals);
      const pad = (hi - lo) * 0.35 || 1, min = lo - pad, max = hi + pad;
      const x = (i) => L + (i / (vals.length - 1)) * (W - L - R);
      const y = (v) => top + h - ((v - min) / (max - min)) * h;
      let p = '<line x1="' + L + '" y1="' + (top + h) + '" x2="' + (W - R) + '" y2="' + (top + h) +
        '" stroke="rgba(237,238,240,.10)"/>';
      p += '<text x="' + (L - 7) + '" y="' + (y(hi) + 4).toFixed(1) + '" text-anchor="end" class="ax">' + money(hi) + "</text>";
      p += '<text x="' + (L - 7) + '" y="' + (y(lo) + 4).toFixed(1) + '" text-anchor="end" class="ax">' + money(lo) + "</text>";
      p += '<path d="' + vals.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join("") +
        '" fill="none" stroke="' + colour + '" stroke-width="2" stroke-linejoin="round"/>';
      const li = vals.length - 1;
      p += '<circle cx="' + x(li).toFixed(1) + '" cy="' + y(vals[li]).toFixed(1) + '" r="4" fill="' + RED + '"/>';
      p += '<text x="' + (x(li) - 7).toFixed(1) + '" y="' + (y(vals[li]) - 9).toFixed(1) +
        '" text-anchor="end" class="vo">' + money(vals[li]) + "</text>";
      p += '<text x="' + L + '" y="' + (top - 5) + '" class="ax">' + label + "</text>";
      return p;
    };
    let p = panel(REV, 30, 68, BLUE, "REVENUE");
    p += panel(PRO, 158, 62, BLUE_L, "PROFIT AFTER EVERYTHING");
    p += '<text x="' + L + '" y="' + (Ht - 4) + '" class="ax">12 months ago</text>';
    p += '<text x="' + (W - R) + '" y="' + (Ht - 4) + '" text-anchor="end" class="ax">this month</text>';
    document.querySelector("#trendCh").innerHTML = chartSvg(W, Ht, p, "Revenue and profit, twelve months");
  })();

  (() => {
    const cogs = rows.reduce((s, r) => s + r.u * r.cogs, 0);
    const post = rows.reduce((s, r) => s + r.u * r.post, 0);
    const steps = [
      ["Revenue", tot.revenue, "in"],
      ["Cost of goods", -cogs, "out"],
      ["Postage", -post, "out"],
      ["Ads", -tot.ads, "out"],
      ["Returns", -tot.retCost, "out"],
      ["Profit", tot.profit, "end"],
    ];
    const W = 520, H = 210, L = 8, R = 8, T = 10, B = 40;
    const iw = W - L - R, ih = H - T - B, bw = iw / steps.length;
    const max = tot.revenue * 1.05, yy = (v) => T + ih - (v / max) * ih;
    let run = 0, p = "";
    steps.forEach(([label, v, kind], i) => {
      const x = L + i * bw + bw * 0.17, w = bw * 0.66;
      let top, bot;
      if (kind === "in") { top = yy(v); bot = yy(0); run = v; }
      else if (kind === "out") { top = yy(run); bot = yy(run + v); run += v; }
      else { top = yy(v); bot = yy(0); }
      const fill = kind === "out" ? RED : kind === "end" ? BLUE : BLUE_L;
      p += '<rect x="' + x.toFixed(1) + '" y="' + Math.min(top, bot).toFixed(1) +
        '" width="' + w.toFixed(1) + '" height="' + Math.max(2, Math.abs(bot - top)).toFixed(1) +
        '" fill="' + fill + '" opacity="' + (kind === "out" ? ".88" : ".95") + '"/>';
      p += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (Math.min(top, bot) - 6).toFixed(1) +
        '" text-anchor="middle" class="' + (kind === "out" ? "vo" : "vl") + '">' +
        (kind === "out" ? "−" : "") + money(Math.abs(v)) + "</text>";
      const words = label.split(" ");
      const lines = words.length > 2 ? [words.slice(0, 2).join(" "), words.slice(2).join(" ")] : [label];
      lines.forEach((ln, k) => {
        p += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 22 + k * 12) +
          '" text-anchor="middle" class="ax">' + ln + "</text>";
      });
    });
    document.querySelector("#fallCh").innerHTML = chartSvg(W, H, p, "Where the month's revenue went");
    document.querySelector("#fallNote").innerHTML = "Profit is <b>" +
      ((tot.profit / tot.revenue) * 100).toFixed(1) + "%</b> of revenue. Ads alone are <b>" +
      ((tot.ads / tot.revenue) * 100).toFixed(1) + "%</b>.";
  })();

})();
