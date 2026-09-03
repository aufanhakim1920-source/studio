(() => {
  "use strict";

  const OPEN = 7, HOURS = 9;                       // 7am … 3pm, nine buckets
  const RATE = { Mon: 32, Tue: 32, Wed: 32, Thu: 32, Fri: 32, Sat: 38, Sun: 44 };

  /* takings per hour, and how many people were rostered that hour */
  const WEEK = {
    Mon: { take: [212, 486, 524, 302, 258, 341, 176,  92,  71], staff: [2, 3, 3, 2, 2, 2, 2, 1, 1] },
    Tue: { take: [188, 431, 498, 281, 236, 302, 151,  71,  60], staff: [2, 3, 3, 2, 2, 2, 3, 3, 3] },
    Wed: { take: [205, 462, 511, 294, 248, 318, 168,  88,  66], staff: [2, 3, 3, 2, 2, 2, 2, 3, 2] },
    Thu: { take: [219, 498, 540, 311, 264, 352, 182,  95,  74], staff: [2, 3, 3, 2, 2, 2, 2, 2, 1] },
    Fri: { take: [246, 561, 604, 348, 296, 402, 214, 118,  88], staff: [3, 3, 4, 3, 2, 3, 2, 2, 1] },
    /* the weekend is rostered for a busy day and the trade dies after two —
       on penalty rates that is where nearly all of the leak is */
    Sat: { take: [131, 302, 468, 522, 486, 398, 232, 118,  84], staff: [2, 3, 4, 4, 4, 3, 3, 3, 3] },
    Sun: { take: [ 98, 241, 402, 451, 428, 344, 186,  96,  62], staff: [2, 3, 3, 3, 3, 3, 3, 3, 3] },
  };
  const DAYS = Object.keys(WEEK);

  /* items: what was sold across the week, cost to make, price */
  const ITEMS = [
    { n: "Flat white",       sold: 1284, price: 4.80, cost: 1.35 },
    { n: "Long black",       sold:  392, price: 4.40, cost: 1.10 },
    { n: "Toastie",          sold:  318, price: 12.50, cost: 4.20 },
    { n: "Banana bread",     sold:  266, price: 6.50, cost: 1.55 },
    { n: "Big breakfast",    sold:  151, price: 24.00, cost: 9.40 },
    { n: "Croissant",        sold:  240, price: 5.50, cost: 2.05 },
    { n: "Iced latte",       sold:  198, price: 6.00, cost: 1.70 },
    { n: "Chai",             sold:  142, price: 5.20, cost: 1.25 },
  ];

  const WASTE = { value: 268, note: "62 pastries and 9 sandwiches" };
  const LAST_WEEK = { take: 17240, wages: 5104, covers: 2905, waste: 214 };

  /* ── derived, so nothing on screen can disagree with anything else ───── */
  const $ = (s, r = document) => r.querySelector(s);
  const money = (n) => "$" + Math.round(n).toLocaleString("en-AU");
  const money2 = (n) => "$" + n.toFixed(2);

  const dayRows = (d) => {
    const w = WEEK[d], rate = RATE[d];
    return w.take.map((take, i) => {
      const wage = w.staff[i] * rate;
      return { h: OPEN + i, take, staff: w.staff[i], wage, net: take - wage };
    });
  };

  const all = DAYS.map((d) => ({ d, rows: dayRows(d) }));
  const lossHours = [];
  all.forEach(({ d, rows }) => rows.forEach((r) => { if (r.net < 0) lossHours.push({ d, ...r }); }));

  const totTake = all.reduce((s, x) => s + x.rows.reduce((a, r) => a + r.take, 0), 0);
  const totWage = all.reduce((s, x) => s + x.rows.reduce((a, r) => a + r.wage, 0), 0);
  const lossTotal = lossHours.reduce((s, r) => s + r.net, 0);        // negative
  const dayLoss = {};
  DAYS.forEach((d) => { dayLoss[d] = lossHours.filter((r) => r.d === d).reduce((s, r) => s + r.net, 0); });

  const hLabel = (h) => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? "am" : "pm");
  const span = (rows) => {
    const a = rows[0].h, b = rows[rows.length - 1].h + 1;
    return hLabel(a) + "–" + hLabel(b);
  };

  /* ── 1. the finding ──────────────────────────────────────────────────── */
  (() => {
    const worstDay = DAYS.reduce((a, b) => (dayLoss[b] < dayLoss[a] ? b : a));
    const wr = lossHours.filter((r) => r.d === worstDay).sort((a, b) => a.h - b.h);
    const took = wr.reduce((s, r) => s + r.take, 0);
    const paid = wr.reduce((s, r) => s + r.wage, 0);

    $("#findHead").innerHTML =
      lossHours.length + " hours this week cost more to stay open than they took &mdash; <em>" +
      money(-lossTotal) + " gone</em>.";
    $("#findBody").textContent =
      "The worst of it is " + worstDay + " " + span(wr) + ": you took " + money(took) +
      " and paid " + money(paid) + " in wages across " + wr.length +
      " hours. Every one of those hours had " + Math.max(...wr.map((r) => r.staff)) +
      " people on, which is the same as the morning peak.";
    $("#findAct").innerHTML =
      "One person off after " + hLabel(wr[0].h) + " on " + worstDay + " and " +
      DAYS.filter((d) => d !== worstDay && dayLoss[d] < 0).join(", ") +
      " would return about <b>" + money(-lossTotal * 0.78) + "</b> a week &mdash; " +
      "<b>" + money(-lossTotal * 0.78 * 52) + "</b> a year.";
  })();

  /* ── 2. the chart: takings against the cost of being open ────────────── */
  const chart = $("#chart");
  let day = DAYS.reduce((a, b) => (dayLoss[b] < dayLoss[a] ? b : a));   // open on the worst day

  function draw(d) {
    const rows = dayRows(d);
    const W = 1000, H = 250, L = 44, R = 8, T = 14, B = 30;
    const iw = W - L - R, ih = H - T - B;
    const max = Math.max(...rows.map((r) => Math.max(r.take, r.wage))) * 1.12;
    const bw = iw / rows.length;
    const y = (v) => T + ih - (v / max) * ih;
    const p = [];

    /* horizontal grid — a genuine axis rule, not a box */
    for (let g = 0; g <= 4; g++) {
      const v = (max / 4) * g, yy = y(v);
      p.push('<line x1="' + L + '" y1="' + yy.toFixed(1) + '" x2="' + (W - R) + '" y2="' + yy.toFixed(1) +
        '" stroke="rgba(23,21,15,' + (g === 0 ? ".22" : ".07") + ')" stroke-width="1"/>');
      p.push('<text x="' + (L - 8) + '" y="' + (yy + 3.5).toFixed(1) + '" text-anchor="end" class="ax">' +
        (g === 0 ? "0" : "$" + Math.round(v / 10) * 10) + "</text>");
    }

    rows.forEach((r, i) => {
      const x = L + i * bw, cx = x + bw / 2, w = Math.min(34, bw * 0.46);
      const loss = r.net < 0;
      /* takings */
      p.push('<rect x="' + (cx - w).toFixed(1) + '" y="' + y(r.take).toFixed(1) +
        '" width="' + w.toFixed(1) + '" height="' + (ih + T - y(r.take)).toFixed(1) +
        '" fill="' + (loss ? "#C2410C" : "#4D7C0F") + '" opacity="' + (loss ? ".95" : ".82") + '"/>');
      /* wages */
      p.push('<rect x="' + cx.toFixed(1) + '" y="' + y(r.wage).toFixed(1) +
        '" width="' + w.toFixed(1) + '" height="' + (ih + T - y(r.wage)).toFixed(1) +
        '" fill="#8A8578" opacity="' + (loss ? ".92" : ".55") + '"/>');
      /* the shortfall, called out where it happens */
      if (loss) {
        p.push('<text x="' + cx.toFixed(1) + '" y="' + (y(r.wage) - 7).toFixed(1) +
          '" text-anchor="middle" class="lossv">&minus;$' + Math.abs(r.net) + "</text>");
      }
      p.push('<text x="' + cx.toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" class="ax' +
        (loss ? " axl" : "") + '">' + hLabel(r.h) + "</text>");
    });

    chart.innerHTML =
      '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Takings against wage cost, hour by hour, for ' + d + '">' +
      '<style>.ax{font:400 11px "IBM Plex Mono",monospace;fill:#8A8578}' +
      '.axl{fill:#C2410C}.lossv{font:500 11px "IBM Plex Mono",monospace;fill:#C2410C}</style>' +
      p.join("") + "</svg>";
  }

  const daysEl = $("#days");
  daysEl.innerHTML = DAYS.map((d) =>
    '<button type="button" data-d="' + d + '" aria-pressed="false"' +
    (dayLoss[d] < 0 ? ' class="has-loss"' : "") + ">" + d + "</button>").join("");
  const marks = [...daysEl.querySelectorAll("button")];
  function pick(d) {
    day = d;
    marks.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.d === d)));
    draw(d);
  }
  daysEl.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-d]");
    if (b) pick(b.dataset.d);
  });
  pick(day);

  /* ── 3. what actually earns ──────────────────────────────────────────── */
  (() => {
    const rows = ITEMS.map((it) => ({ ...it, margin: it.price - it.cost, profit: (it.price - it.cost) * it.sold }))
      .sort((a, b) => b.profit - a.profit);
    const most = rows.reduce((a, b) => (b.sold > a.sold ? b : a));
    $("#items tbody").innerHTML = rows.map((r, i) =>
      '<tr class="' + (i === 0 ? "best" : r === most ? "most" : "") + '">' +
      '<td class="nm">' + r.n + "</td>" +
      '<td class="n">' + r.sold.toLocaleString("en-AU") + "</td>" +
      '<td class="n">' + money2(r.margin) + "</td>" +
      '<td class="n"><b>' + money(r.profit) + "</b></td></tr>").join("");
  })();

  /* ── 4. against last week ────────────────────────────────────────────── */
  (() => {
    const covers = ITEMS.reduce((s, i) => s + i.sold, 0);
    const rows = [
      ["Taken", totTake, LAST_WEEK.take, money, true],
      ["Wages", totWage, LAST_WEEK.wages, money, false],
      ["Wages as % of takings", (totWage / totTake) * 100, (LAST_WEEK.wages / LAST_WEEK.take) * 100,
        (v) => v.toFixed(1) + "%", false],
      ["Items sold", covers, LAST_WEEK.covers, (v) => Math.round(v).toLocaleString("en-AU"), true],
      ["Thrown out", WASTE.value, LAST_WEEK.waste, money, false],
    ];
    $("#cmp").innerHTML = rows.map(([label, now, then, fmt, upGood]) => {
      const pc = ((now - then) / then) * 100;
      const up = pc >= 0;
      const cls = (up === upGood) ? "up" : "down";
      return "<div><dt>" + label + "</dt><dd>" +
        '<span class="v">' + fmt(now) + "</span>" +
        '<span class="d ' + cls + '">' + (up ? "+" : "") + pc.toFixed(1) + "%</span></dd></div>";
    }).join("");
    $("#wasteV").textContent = money(WASTE.value);
    $("#wasteN").textContent = WASTE.note + " · " + ((WASTE.value / totTake) * 100).toFixed(1) + "% of takings";
  })();

  /* ── 5. today, and it actually moves ─────────────────────────────────────
     A number labelled "so far" that never changes reads as a mockup. This is
     live data, not decoration: it fills in against the same hourly shape the
     chart uses, so the two can never disagree. */
  (() => {
    const el = $("#todayNow"), vs = $("#todayVs");
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const shape = dayRows(names[new Date().getDay()]);
    const full = shape.reduce((s, r) => s + r.take, 0);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const value = () => {
      const now = new Date();
      const mins = now.getHours() * 60 + now.getMinutes();
      let t = 0;
      shape.forEach((r) => {
        const a = r.h * 60, b = a + 60;
        if (mins >= b) t += r.take;
        else if (mins > a) t += r.take * ((mins - a) / 60);
      });
      return t;
    };
    const paint = () => {
      const t = value();
      el.textContent = money(t);
      const pace = full ? (t / full) * 100 : 0;
      vs.textContent = t <= 0 ? "before open"
        : pace >= 99.5 ? "day closed" : Math.round(pace) + "% of a normal " + names[new Date().getDay()];
    };
    paint();
    if (!reduced) setInterval(() => { if (!document.hidden) paint(); }, 20000);
  })();
})();
