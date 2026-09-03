(() => {
  "use strict";

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const H0 = 9, HRS = 9;                       // 9am … 5pm
  const BARBERS = ["Sam", "Ivo", "Rae", "Dex"];
  const PRICE = 45;                            // average taken per filled slot
  const SLOT_MIN = 15;                         // four slots to the hour

  /* one string per barber per day: 36 characters = 9 hours x 4 slots */
  const SLOTS = {
    Mon: ["bbbb bbb. bbbb bb.. bbbb bbb. bb.. b... ....".replace(/ /g, ""),
          "bbb. bbbb bbb. bb.. bbbb bb.. b... ....  ....".replace(/ /g, ""),
          "bb.. bbbb bbbb bbb. bbbb bbb. bb.. ....  ....".replace(/ /g, ""),
          ".... bbb. bbbb bb.. bbb. bb.. ....  ....  ....".replace(/ /g, "")],
    Tue: ["bbbb bbbb bbb. bbbb bbbb bbb. bb.. b... ....".replace(/ /g, ""),
          "bbb. bbbb bbbb bbb. bbbb bbbb bbb. bb.. ....".replace(/ /g, ""),
          "bbbb bbb. bbbb bbbb bbbn bbb. bb.. b... ....".replace(/ /g, ""),
          "bb.. bbbb bbb. bbbb bbb. bb.. b... ....  ....".replace(/ /g, "")],
    Wed: ["bbbb bbb. bbbb bbb. bbbb bb.. b... ....  ....".replace(/ /g, ""),
          "bbb. bbbb bbb. bbbb bbb. bbb. bb.. ....  ....".replace(/ /g, ""),
          "bb.. bbbb bbbb bbb. bbbn bb.. ....  ....  ....".replace(/ /g, ""),
          "..bb bbb. bbb. bb.. bbb. b... ....  ....  ....".replace(/ /g, "")],
    Thu: ["bbbb bbbb bbbb bbb. bbbb bbbb bbb. bb.. b...".replace(/ /g, ""),
          "bbb. bbbb bbb. bbbb bbbb bbb. bbb. bb.. ....".replace(/ /g, ""),
          "bbbb bbb. bbbb bbbb bbb. bbbb bb.. b... ....".replace(/ /g, ""),
          "bb.. bbbb bbbb bbb. bbbb bbb. bb.. ....  ....".replace(/ /g, "")],
    Fri: ["bbbb bbbb bbbb bbbb bbbb bbbb bbbb bbb. bb..".replace(/ /g, ""),
          "bbbb bbbb bbbb bbbb bbbb bbbb bbb. bbb. bb..".replace(/ /g, ""),
          "bbb. bbbb bbbb bbbb bbbb bbbb bbbb bb.. b...".replace(/ /g, ""),
          "bbbb bbb. bbbb bbbb bbbn bbbb bbb. bb.. ....".replace(/ /g, "")],
    Sat: ["bbbb bbbb bbbb bbbb bbbb bbbb bbbb bbbb bbb.".replace(/ /g, ""),
          "bbbb bbbb bbbb bbbb bbbb bbbb bbbb bbb. bbb.".replace(/ /g, ""),
          "bbbb bbbb bbbb bbbb bbbb bbbb bbbb bbbb bb..".replace(/ /g, ""),
          "bbbw bbbb bbbw bbbb bbbb bbbw bbbb bbb. bb..".replace(/ /g, "")],
    /* Sunday: four barbers rostered, and the town does not turn up */
    Sun: ["bb.. bbb. bb.. b... .... .... .... ....  ....".replace(/ /g, ""),
          "b... bb.. b... .... n... .... .... ....  ....".replace(/ /g, ""),
          ".... b... .... .... .... .... .... ....  ....".replace(/ /g, ""),
          ".... .... .... .... .... .... .... ....  ....".replace(/ /g, "")],
  };

  const SERVICES = [
    { n: "Cut",              done: 268, mins: 30, price: 40 },
    { n: "Cut + beard",      done: 141, mins: 45, price: 62 },
    { n: "Skin fade",        done:  96, mins: 45, price: 55 },
    { n: "Beard tidy",       done:  74, mins: 15, price: 25 },
    { n: "Kids",             done:  58, mins: 30, price: 28 },
    { n: "Cut + hot towel",  done:  31, mins: 60, price: 78 },
  ];

  const REPEAT = [["Came back within 5 weeks", 412], ["Came back later", 96], ["Not seen again", 187]];
  const LAST = { taken: 27180, busy: 0.71, noshow: 9 };

  const $ = (s, r = document) => r.querySelector(s);
  const money = (n) => "$" + Math.round(n).toLocaleString("en-AU");
  const hLabel = (h) => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? "a" : "p");

  /* ── derive ──────────────────────────────────────────────────────────── */
  const count = (s, ch) => [...s].filter((c) => c === ch).length;
  const per = {};
  BARBERS.forEach((b, i) => {
    let booked = 0, walk = 0, ns = 0, empty = 0;
    DAYS.forEach((d) => {
      const s = SLOTS[d][i];
      booked += count(s, "b"); walk += count(s, "w"); ns += count(s, "n"); empty += count(s, ".");
    });
    const filled = booked + walk;
    const shift = DAYS.length * HRS * 4;
    per[b] = { booked, walk, ns, empty, filled, shift,
      busy: filled / shift, taken: filled * PRICE, perHour: (filled * PRICE) / (shift / 4) };
  });

  const tot = {
    filled: BARBERS.reduce((s, b) => s + per[b].filled, 0),
    empty:  BARBERS.reduce((s, b) => s + per[b].empty, 0),
    ns:     BARBERS.reduce((s, b) => s + per[b].ns, 0),
    shift:  BARBERS.reduce((s, b) => s + per[b].shift, 0),
  };
  tot.taken = tot.filled * PRICE;
  tot.busy = tot.filled / tot.shift;
  tot.emptyHours = tot.empty / 4;
  tot.emptyCost = tot.emptyHours * PRICE * 2;      // two 30-min cuts an hour
  tot.nsCost = tot.ns * PRICE;

  /* which day leaks most empty time */
  const dayEmpty = {};
  DAYS.forEach((d) => { dayEmpty[d] = SLOTS[d].reduce((s, r) => s + count(r, "."), 0); });
  const worstDay = DAYS.reduce((a, b) => (dayEmpty[b] > dayEmpty[a] ? b : a));

  /* ── 1. the finding ──────────────────────────────────────────────────── */
  (() => {
    const wh = dayEmpty[worstDay] / 4;
    const cost = wh * PRICE * 2;
    const leaks = [
      ["empty chair time", tot.emptyCost],
      ["no-shows", tot.nsCost],
      ["clients not coming back", REPEAT[2][1] * PRICE * 0.5],
    ].sort((a, b) => b[1] - a[1]);

    $("#findHead").innerHTML =
      worstDay + " is <em>" + wh.toFixed(1) + " empty chair-hours</em> &mdash; " +
      money(cost) + " of capacity you cannot sell twice.";
    $("#findBody").textContent =
      "Across the week the chairs sat empty for " + tot.emptyHours.toFixed(0) + " hours, which is " +
      Math.round((1 - tot.busy) * 100) + "% of the time you were paying to be open. " +
      "Four barbers are rostered on " + worstDay + " and " +
      Math.round((1 - dayEmpty[worstDay] / (HRS * 4 * 4)) * 100) + "% of that day was booked.";
    $("#findAct").innerHTML =
      "Biggest leak is <b>" + leaks[0][0] + "</b> at about <b>" + money(leaks[0][1]) +
      "</b> a week. Two barbers on " + worstDay + " instead of four would save roughly <b>" +
      money(2 * HRS * 32) + "</b> in wages without turning a single client away.";
  })();

  /* ── 2. the numbers ─────────────────────────────────────────────────── */
  (() => {
    const pc = (a, b) => ((a - b) / b) * 100;
    const cells = [
      ["Taken", money(tot.taken), pc(tot.taken, LAST.taken), true, false],
      ["Chairs busy", Math.round(tot.busy * 100) + "%", pc(tot.busy, LAST.busy), true, false],
      ["Empty chair-hours", tot.emptyHours.toFixed(0), null, false, true],
      ["No-shows", String(tot.ns), pc(tot.ns, LAST.noshow), false, false],
      ["Cost of no-shows", money(tot.nsCost), null, false, true],
    ];
    $("#tot").innerHTML = cells.map(([k, v, d, upGood, neg]) =>
      "<div" + (neg ? ' class="neg"' : "") + "><dt>" + k + '</dt><dd><span class="v">' + v + "</span>" +
      (d === null ? "" : '<span class="d ' + ((d >= 0) === upGood ? "up" : "down") + '">' +
        (d >= 0 ? "+" : "") + d.toFixed(1) + "%</span>") + "</dd></div>").join("");
  })();

  /* ── 3. the schedule ────────────────────────────────────────────────── */
  const sched = $("#sched");
  let only = null;
  function drawSched() {
    const cls = { b: "slot--bk", w: "slot--wi", n: "slot--ns", ".": "" };
    let html = DAYS.map((d) => {
      const cells = [];
      for (let h = 0; h < HRS; h++) {
        const inner = BARBERS.map((b, i) => {
          const c = SLOTS[d][i][h * 4] || ".";       // one mark per hour per chair
          const on = only === null || only === i;
          return '<span class="slot ' + cls[c] + (on ? " on" : "") + '"></span>';
        }).join("");
        cells.push('<span class="cell">' + inner + "</span>");
      }
      return '<div class="day' + (d === worstDay ? " worst" : "") + '">' +
        '<span class="day__n">' + d + "</span>" +
        '<span class="day__g">' + cells.join("") + "</span></div>";
    }).join("");
    html += '<div class="hrs"><span class="hrs__s"></span><span class="hrs__g">' +
      Array.from({ length: HRS }, (_, i) => "<span>" + hLabel(H0 + i) + "</span>").join("") +
      "</span></div>";
    sched.innerHTML = html;
    sched.classList.toggle("dim-out", only !== null);
  }
  $("#pick").innerHTML =
    '<button type="button" data-i="all" aria-pressed="true">All four</button>' +
    BARBERS.map((b, i) => '<button type="button" data-i="' + i + '" aria-pressed="false">' + b + "</button>").join("");
  $("#pick").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (!b) return;
    only = b.dataset.i === "all" ? null : +b.dataset.i;
    [...e.currentTarget.querySelectorAll("button")].forEach((x) =>
      x.setAttribute("aria-pressed", String(x.dataset.i === b.dataset.i)));
    drawSched();
  });
  drawSched();

  /* ── 4. per barber, and per service ─────────────────────────────────── */
  (() => {
    const list = BARBERS.slice().sort((a, b) => per[b].perHour - per[a].perHour);
    const lowest = list[list.length - 1];
    $("#who tbody").innerHTML = list.map((b) => {
      const p = per[b];
      return "<tr" + (b === lowest ? ' class="low"' : "") + ">" +
        '<td class="nm">' + b + "</td>" +
        '<td class="n u">' + Math.round(p.busy * 100) + "%</td>" +
        '<td class="n">' + p.ns + "</td>" +
        '<td class="n">' + money(p.taken) + "</td>" +
        '<td class="n"><b>' + money(p.perHour) + "</b></td></tr>";
    }).join("");

    const svc = SERVICES.map((s) => ({ ...s, ph: (s.price / s.mins) * 60 })).sort((a, b) => b.ph - a.ph);
    const thin = svc[svc.length - 1];
    $("#svc tbody").innerHTML = svc.map((s) =>
      "<tr" + (s === thin ? ' class="thin"' : "") + ">" +
      '<td class="nm">' + s.n + "</td>" +
      '<td class="n">' + s.done + "</td>" +
      '<td class="n">' + s.mins + "</td>" +
      '<td class="n">$' + s.price + "</td>" +
      '<td class="n"><b>' + money(s.ph) + "</b></td></tr>").join("");
  })();

  /* ── 5. coming back, and when no-shows happen ───────────────────────── */
  (() => {
    const total = REPEAT.reduce((s, r) => s + r[1], 0);
    $("#rep").innerHTML = REPEAT.map(([k, v]) =>
      '<div><span class="lb">' + k + '</span><span class="track"><span class="fill" style="width:' +
      ((v / total) * 100).toFixed(1) + '%"></span></span><span class="vv">' + v + " · " +
      Math.round((v / total) * 100) + "%</span></div>").join("");

    /* no-shows by lead time — computed shape, but the counts are the real ones */
    const lead = [["Booked same day", 1], ["1–3 days ahead", 3], ["4–7 days ahead", 6], ["Over a week", 5]];
    const max = Math.max(...lead.map((l) => l[1]));
    $("#nsw").innerHTML = lead.map(([k, v]) =>
      '<div><span class="lb">' + k + '</span><span class="track"><span class="fill" style="width:' +
      ((v / max) * 100).toFixed(1) + '%"></span></span><span class="vv">' + v + " · " +
      money(v * PRICE) + "</span></div>").join("");
  })();

  /* ── 6. in the chairs now — live, not decoration ────────────────────── */
  (() => {
    const el = $("#liveN"), vs = $("#liveVs");
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paint = () => {
      const now = new Date();
      const d = names[now.getDay()];
      const h = now.getHours(), m = now.getMinutes();
      if (h < H0 || h >= H0 + HRS) { el.textContent = "0"; vs.textContent = "closed"; return; }
      const idx = (h - H0) * 4 + Math.floor(m / 15);
      const inChair = SLOTS[d].filter((s) => "bw".includes(s[idx] || ".")).length;
      el.textContent = inChair + " of 4";
      vs.textContent = inChair === 4 ? "full" : (4 - inChair) + " chair" + (inChair === 3 ? "" : "s") + " free";
    };
    paint();
    if (!reduced) setInterval(() => { if (!document.hidden) paint(); }, 30000);
  })();
})();
