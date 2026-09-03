(() => {
  "use strict";

  /* ── the century ──────────────────────────────────────────────────────── */
  const Y0 = 1955, Y1 = 2024, SPAN = Y1 - Y0;

  const STATIONS = [
    { y: 1955, n: "Break-bulk", lbl: "1955", fig: 1, fact: "A week or more in port",
      line: "Cargo came aboard piece by piece — sacks, barrels, crates — carried up the gangway by gangs of men. A ship could sit at the quay for a week." },
    { y: 1956, n: "The Ideal-X", lbl: "26 April 1956", fig: 2, fact: "$5.86 → $0.16 a ton",
      line: "Malcom McLean sent a converted tanker from Newark to Houston with 58 boxes lashed on deck. Loading fell from about $5.86 a ton to about $0.16." },
    { y: 1966, n: "The Crossing", lbl: "1966", fig: 3, fact: "236 boxes to Rotterdam",
      line: "Sea-Land’s Fairland reached Rotterdam with 236 boxes — the first container service across the Atlantic. Europe began rebuilding its ports to receive it." },
    { y: 1968, n: "The Standard", lbl: "1968 — 70", fig: 4, fact: "Twenty feet = one TEU",
      line: "ISO fixed the sizes and the corner castings: eight feet wide, eight feet six high, twenty or forty long. Any box, any ship, any crane, anywhere." },
    { y: 1970, n: "The Pacific", lbl: "1967 — 70", fig: 5, fact: "The empty leg, filled",
      line: "McLean’s ships supplied the war in Vietnam and came home empty, so he filled them in Japan. The trans-Pacific trade that started there never stopped." },
    { y: 1981, n: "The Docks Empty", lbl: "1981", fig: 6, fact: "About 35,000 → 3,500 men",
      line: "Cranes did the work the gangs used to do. New York’s registered longshoremen fell from about 35,000 to about 3,500, and London’s Royal Docks closed for good." },
    { y: 1995, n: "The Ports Move", lbl: "1995", fig: 7, fact: "Shanghai, about 49m boxes",
      line: "Rotterdam ran the world’s busiest port from 1962 to 2004. Then the trade turned east — Hong Kong, Singapore, and now Shanghai at about 49 million boxes a year." },
    { y: 2021, n: "The Jam", lbl: "2021", fig: 8, fact: "About $1,500 → $10,000",
      line: "The Ever Given wedged across the Suez Canal for six days. A hundred ships queued off Los Angeles, and the price of moving one box rose several times over." },
    { y: 2023, n: "Twenty-Four Thousand", lbl: "2023", fig: 9, fact: "24,346 boxes, 400 m",
      line: "MSC Irina carries 24,346 boxes on a hull four hundred metres long. About 90% of world trade still goes by sea, and most of the made things go in these." },
  ];
  const NS = STATIONS.length;

  /* largest container ship afloat, in boxes. Anchors are real vessels where a
     real vessel is known; the years between them are interpolated, which is why
     the readout says "about". */
  const CAP = [
    [1955, 0], [1956, 58], [1957, 226], [1960, 476], [1966, 700], [1969, 1530],
    [1972, 2400], [1980, 3050], [1988, 4340], [1996, 6400], [2003, 8100],
    [2006, 15000], [2013, 18270], [2021, 23992], [2023, 24346], [2030, 24346],
  ];
  const CAP_MAX = 24346;

  /* ── small maths ──────────────────────────────────────────────────────── */
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* containerisation as an S-curve: nothing before 1956, half the world by the
     mid seventies, effectively finished by 2000. */
  function era(y) {
    if (y < 1956) return 0;
    const L = 1 / (1 + Math.exp(-(y - 1976) / 7.2));
    const L0 = 1 / (1 + Math.exp(-(1956 - 1976) / 7.2));
    return clamp01((L - L0) / (1 - L0));
  }

  function capAt(y) {
    if (y <= CAP[0][0]) return 0;
    for (let i = 1; i < CAP.length; i++) {
      if (y <= CAP[i][0]) {
        const [ya, va] = CAP[i - 1], [yb, vb] = CAP[i];
        return lerp(va, vb, (y - ya) / (yb - ya));
      }
    }
    return CAP_MAX;
  }
  /* a 58-box ship was 160 m; a 24,346-box ship is 400 m. Length saturates long
     before capacity does — the boxes go up, not out. */
  const shipLenM = (teu) => (teu <= 1 ? 135 : 400 * (0.34 + 0.66 * Math.pow(Math.min(teu, CAP_MAX) / CAP_MAX, 0.34)));

  /* ── palette (the drawing's own; the ui reads it from the stylesheet) ─── */
  const C = {
    sky1: "#B0DAEA", sky2: "#DCEFF4",
    paper: "203,230,238",
    haze: "#8CB6CB", haze2: "#78A3BB", haze3: "#A0C6D8",
    ink: "#0F212B", ink2: "#2C4956", ink3: "#5C7F8A",
    sea: "#0E5C77", sea2: "#0A4459", foam: "#B9DFE9", ripple: "#2E85A0",
    quay: "#C3B392", quayEdge: "#8A7A57",
    red: "#DC3A1B", red2: "#B22C12",
    crate: ["#C4361E", "#E1731B", "#1D6FA8", "#2C7A55", "#D9A72F", "#8C3B6B", "#B8442E", "#2E8DA8", "#3E5C8A"],
    sack: "#B08A4E", sack2: "#8A6A38",
  };

  /* ── dom ──────────────────────────────────────────────────────────────── */
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const canvas = $("port"), ctx = canvas.getContext("2d");
  const fieldEl = $("field"), railEl = $("rail"), headEl = $("head");
  const yearsEl = $("years"), marksEl = $("marks"), plateEl = $("plate"), hintEl = $("hint");
  const odoYear = $("odoYear"), odoShip = $("odoShip");
  const stnNo = $("stnNo"), stnYear = $("stnYear"), stnAway = $("stnAway");
  const stnTitle = $("stnTitle"), stnLine = $("stnLine");
  const roCost = $("roCost"), roPct = $("roPct");
  const crossedTop = $("crossedTop"), crossedBottom = $("crossedBottom");
  const manifestEl = $("manifest"), manifestLink = $("manifestLink"), closeManifest = $("closeManifest"), mfList = $("mfList");
  const figs = [...document.querySelectorAll(".f")];
  const fLive = $("fLive");

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(pointer:coarse)").matches;
  const GAIN = coarse ? 1.9 : 1.15;

  /* ── state ────────────────────────────────────────────────────────────── */
  let target = 0, pos = 0;              // 0..1 across the century
  let touched = false, dragging = null, lastX = 0;
  let dwell = 0, shownIdx = -1;
  const crossed = new Array(NS).fill(false);
  let crossedCount = 0;
  let W = 0, H = 0, dpr = 1;
  let fieldTop = 0, fieldBottom = 0, quayY = 0, groundY = 0, waterH = 0;
  let pxPerYear = 120, pxm = 1.6, colW = 20, windowYears = 10, S = 1;
  const world = { city: [], stack: [], crane: [], ship: [], crew: [], ripple: [] };

  /* per-station arrival windows: a stop with a close neighbour gets a narrow
     one, so two stops a year apart never both light up. */
  const win = STATIONS.map((s, i) => {
    let gap = 99;
    STATIONS.forEach((o, j) => { if (i !== j) gap = Math.min(gap, Math.abs(o.y - s.y)); });
    const w0 = Math.min(2.4, gap * 0.55);
    return { w0, w1: w0 * 0.34 };
  });

  const yearNow = () => Y0 + pos * SPAN;

  /* ── the rail ───────────────────────────────────────────────────────────
     The track is inset by RAIL_PAD at both ends so the head and the first mark
     sit INSIDE the viewport instead of half-hanging off it — that overhang was
     five pixels of horizontal overflow at the far end of the century. */
  const RAIL_PAD = 9;
  const railPos = (f) => 'calc(' + RAIL_PAD + 'px + ' + (f * 100).toFixed(3) + '% - ' + (f * RAIL_PAD * 2).toFixed(2) + 'px)';

  function buildRail() {
    yearsEl.innerHTML = "";
    const step = window.innerWidth < 640 ? 20 : 10;
    for (let y = 1960; y <= 2020; y += step) {
      const el = document.createElement("span");
      el.className = "yr";
      el.style.left = railPos((y - Y0) / SPAN);
      el.textContent = y;
      yearsEl.appendChild(el);
    }
  }
  const markEls = STATIONS.map((s, i) => {
    const el = document.createElement("i");
    el.className = "mk";
    el.style.left = railPos((s.y - Y0) / SPAN);
    marksEl.appendChild(el);
    return el;
  });

  /* ── the manifest ─────────────────────────────────────────────────────── */
  const rowEls = STATIONS.map((s, i) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button"; b.className = "mf-row";
    b.innerHTML =
      '<span class="mf-n">' + String(i + 1).padStart(2, "0") + "</span>" +
      '<span class="mf-y">' + s.lbl + "</span>" +
      '<span class="mf-t">' + s.n + "</span>" +
      '<span class="mf-f">' + s.fact + "</span>" +
      '<span class="mf-s">—</span>';
    b.addEventListener("click", () => { arm(); target = (s.y - Y0) / SPAN; closeMf(); });
    li.appendChild(b); mfList.appendChild(li);
    return b;
  });

  let mfOpen = false;
  function openMf() { mfOpen = true; manifestEl.classList.add("open"); manifestEl.setAttribute("aria-hidden", "false"); closeManifest.focus(); }
  function closeMf() { mfOpen = false; manifestEl.classList.remove("open"); manifestEl.setAttribute("aria-hidden", "true"); manifestLink.focus(); }
  manifestLink.addEventListener("click", (e) => { e.preventDefault(); mfOpen ? closeMf() : openMf(); });
  closeManifest.addEventListener("click", closeMf);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && mfOpen) closeMf(); });

  /* ── figure 0: the live capacity curve, built from the same table the port
        is drawn from, so the chart and the ships can never disagree ─────── */
  const LV = { x0: 0, x1: 332, yTop: 30, yBase: 150 };
  const lvY = (teu) => LV.yBase - Math.pow(clamp01(teu / CAP_MAX), 0.5) * (LV.yBase - LV.yTop);
  function buildLive() {
    let d = "";
    for (let i = 0; i <= 69; i++) {
      const y = Y0 + i, x = LV.x0 + (i / SPAN) * (LV.x1 - LV.x0);
      d += (i ? "L" : "M") + x.toFixed(1) + " " + lvY(capAt(y)).toFixed(1);
    }
    $("lvLine").setAttribute("d", d);
    $("lvArea").setAttribute("d", d + "L" + LV.x1 + " " + LV.yBase + "L" + LV.x0 + " " + LV.yBase + "Z");
  }
  const lvHead = $("lvHead"), lvStem = lvHead.querySelector(".lv-stem"), lvDot = lvHead.querySelector(".lv-dot");

  /* ── figure 6: a hundred men, ninety of whom leave ────────────────────── */
  (function buildCrew() {
    const g = $("crewField");
    let s = "";
    for (let i = 0; i < 100; i++) {
      const col = i % 25, row = (i / 25) | 0;
      const x = 3 + col * 13.2, y = 30 + row * 27;
      const stay = i % 10 === 4;
      s += '<g class="cw-g ' + (stay ? "cw-stay" : "cw-go") + '" transform="translate(' + x.toFixed(1) + "," + y + ')">' +
        '<circle cx="0" cy="0" r="1.9"/>' +
        '<rect x="-0.9" y="2.4" width="1.8" height="6"/>' +
        '<rect x="-3.2" y="4" width="6.4" height="1.5"/></g>';
    }
    g.innerHTML = s;
  })();

  /* ── figure 7: the ranked ports, values written from the same numbers ─── */
  (function labelRank() {
    const v = [["12.6", "14.4"], ["11.8", "39.0"], ["4.8", "13.4"], ["1.5", "49.2"]];
    document.querySelectorAll(".rk-row").forEach((r, i) => {
      r.querySelector(".rk-v").textContent = v[i][0] + " → " + v[i][1];
    });
  })();

  /* ── figure 8: the queue off Los Angeles ──────────────────────────────── */
  (function buildQueue() {
    const g = $("jmQueue");
    let s = '<text class="f-t" x="332" y="150" text-anchor="end">109 SHIPS WAITING · LOS ANGELES</text>';
    for (let i = 0; i < 22; i++) s += '<rect x="' + (208 + i * 5.7).toFixed(1) + '" y="160" width="3.4" height="9"/>';
    g.innerHTML = s;
  })();

  /* ── layout ───────────────────────────────────────────────────────────── */
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.round(W * dpr)), ch = Math.max(1, Math.round(H * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const fr = fieldEl.getBoundingClientRect();
    fieldTop = fr.top; fieldBottom = fr.bottom;
    const fh = Math.max(120, fieldBottom - fieldTop);
    const narrow = W < 700;
    S = clamp(fh / 540, 0.60, 1.55);
    waterH = clamp(fh * (narrow ? 0.21 : 0.285), 74, 210);
    quayY = fieldBottom - waterH;
    groundY = quayY - Math.round(clamp(fh * 0.030, 9, 20));

    windowYears = clamp(W / 132, 6, 11.5);
    pxPerYear = W / windowYears;
    /* a phone gets a bigger metres-per-pixel so the ship still reads as a ship */
    pxm = clamp(W / (narrow ? 500 : 720), 0.60, 2.2);
    colW = clamp(W / (narrow ? 26 : 52), 15, 34);

    buildRail();
    buildWorld();
    placeHead();
  }

  /* ── the world, laid out in YEARS ─────────────────────────────────────
     Every family is spaced by a distance in SCREEN pixels converted to years,
     so the composition holds at 390px and at 1440px. The walk starts from a
     fixed year, so positions never drift while you travel. */
  function buildWorld() {
    const A = 1944, B = 2034;
    for (const k in world) world[k] = [];
    const rnd = mulberry(20260903);

    for (let y = A; y < B;) { world.city.push({ y, r: rnd(), r2: rnd() }); y += (118 + rnd() * 64) / pxPerYear; }
    for (let y = A; y < B;) { world.stack.push({ y, r: rnd(), r2: rnd(), r3: rnd() }); y += (colW * 1.38) / pxPerYear; }
    for (let y = A; y < B;) { world.crew.push({ y, r: rnd(), r2: rnd() }); y += 17 / pxPerYear; }
    for (let y = A; y < B;) { world.ripple.push({ y, r: rnd(), r2: rnd() }); y += 26 / pxPerYear; }
    /* a break-bulk quay had a crane every thirty metres and ships packed in;
       a container terminal has a handful of enormous ones. The density INVERTS,
       and that inversion is most of the story. */
    for (let y = A; y < B;) { world.crane.push({ y, r: rnd(), r2: rnd() }); y += (168 + 230 * era(y)) / pxPerYear; }
    for (let y = A; y < B;) {
      world.ship.push({ y, r: rnd(), r2: rnd() });
      y += (shipLenM(capAt(y)) * pxm * (era(y) < 0.02 ? 1.18 : 1.5) + (era(y) < 0.02 ? 40 : 130)) / pxPerYear;
    }
  }

  const xAt = (wy) => W * 0.5 + (wy - yearNow()) * pxPerYear;
  const visible = (list, padY) => {
    const c = yearNow(), lo = c - windowYears * (0.6 + padY), hi = c + windowYears * (0.6 + padY);
    return list.filter((o) => o.y > lo && o.y < hi);
  };

  /* ── drawing ──────────────────────────────────────────────────────────── */
  function px(v) { return Math.round(v) + 0.5; }

  function drawSky() {
    const g = ctx.createLinearGradient(0, fieldTop, 0, quayY);
    g.addColorStop(0, C.sky1); g.addColorStop(1, C.sky2);
    ctx.fillStyle = g; ctx.fillRect(0, fieldTop, W, quayY - fieldTop);

    /* flat printed cloud bars, drawn with a keyline like everything else */
    const base = yearNow() * pxPerYear * 0.34;
    for (let i = 0; i < 7; i++) {
      const pitch = 620;
      const off = ((base + i * 197) % pitch + pitch) % pitch;
      const cx = W - off * (W + 400) / pitch + 200;
      const cy = fieldTop + 78 + ((i * 53) % Math.max(40, (quayY - fieldTop) * 0.34));
      const cw = (110 + (i % 3) * 96) * S, chh = (11 + (i % 2) * 6) * S;
      ctx.fillStyle = "rgba(255,255,255,.34)";
      ctx.fillRect(cx, cy, cw, chh);
      ctx.fillRect(cx + cw * 0.22, cy - chh * 0.62, cw * 0.5, chh * 0.7);
      ctx.fillStyle = "rgba(126,166,186,.24)";
      ctx.fillRect(cx, cy + chh, cw, 1.4);
    }
  }

  function drawCity() {
    for (const o of visible(world.city, 0.3)) {
      const e = era(o.y), x = xAt(o.y);
      const w = (34 + o.r * 76) * S;
      const h = (56 + o.r2 * 76) * S + e * (40 + o.r * 168) * S;
      const top = groundY - 8 - h;
      ctx.fillStyle = o.r > 0.5 ? C.haze : C.haze2;
      ctx.fillRect(x - w / 2, top, w, h + 8);
      ctx.lineWidth = 1; ctx.strokeStyle = "rgba(15,33,43,.34)";
      ctx.strokeRect(x - w / 2 + 0.5, top + 0.5, w - 1, h + 7);
      /* corrugated iron: the ribs are what stop a transit shed being a slab */
      ctx.fillStyle = "rgba(15,33,43,.13)";
      for (let rx = x - w / 2 + 6; rx < x + w / 2 - 3; rx += 9 * S) ctx.fillRect(rx, top + 3, 1.3, h + 4);
      if (e < 0.34) {                       /* cargo doors along the shed front */
        ctx.fillStyle = "rgba(15,33,43,.40)";
        for (let dx = x - w / 2 + 9; dx < x + w / 2 - 16; dx += 27 * S) ctx.fillRect(dx, groundY - 17 * S, 13 * S, 17 * S + 8);
      }
      if (e < 0.34) {                       /* transit sheds: pitched roofs */
        ctx.beginPath();
        ctx.moveTo(x - w / 2 - 5, top); ctx.lineTo(x, top - (14 + o.r * 14) * S); ctx.lineTo(x + w / 2 + 5, top);
        ctx.closePath(); ctx.fillStyle = C.haze3; ctx.fill();
        if (o.r > 0.78) {                   /* grain silos: the tall thing on a 1950s dock */
          const sh = (120 + o.r2 * 80) * S, sw = (13 + o.r2 * 9) * S, sn = 3 + Math.floor(o.r2 * 3);
          for (let i = 0; i < sn; i++) {
            const bx = x - w * 0.34 + i * (sw + 1.5);
            ctx.fillStyle = i % 2 ? C.haze2 : C.haze;
            ctx.fillRect(bx, groundY - sh, sw, sh + 8);
            ctx.lineWidth = 1; ctx.strokeStyle = "rgba(15,33,43,.34)";
            ctx.strokeRect(bx + 0.5, groundY - sh + 0.5, sw - 1, sh + 7);
          }
          ctx.fillStyle = C.haze3;
          ctx.fillRect(x - w * 0.36, groundY - sh - 13 * S, (sw + 1.5) * sn + 4, 13 * S);
        }
        if (o.r2 > 0.74) {                  /* a works chimney behind the sheds */
          const ch = (60 + o.r * 130) * S, cw = (5 + o.r2 * 4) * S;
          ctx.fillStyle = C.haze2;
          ctx.fillRect(x + w * (0.16 + o.r * 0.4), top - ch, cw, ch + 6);
          ctx.fillStyle = "rgba(150,180,192,.26)";
          const n = 2 + Math.floor(o.r * 3);
          for (let i = 0; i < n; i++) {
            ctx.beginPath();
            ctx.arc(x + w * (0.16 + o.r * 0.4) + cw / 2 + i * (7 + o.r * 9) * S,
              top - ch - 8 * S - i * (12 + o.r2 * 10) * S, (6 + i * (4 + o.r * 4)) * S, 0, 6.2832);
            ctx.fill();
          }
        }
      } else {                              /* port-city blocks: window rows */
        ctx.fillStyle = "rgba(255,255,255,.22)";
        for (let i = 0; i < Math.floor(h / (17 * S)); i++) ctx.fillRect(x - w / 2 + 6, top + 10 + i * 17 * S, w - 12, 3.4);
      }
    }
  }

  function drawStacks() {
    const bh = colW * 0.52;
    for (const o of visible(world.stack, 0.15)) {
      const e = era(o.y), x = xAt(o.y) - colW / 2;
      if (e <= 0.004) { drawCargoPile(x, o, e); continue; }
      /* boxes did not arrive everywhere at once — in 1958 one slot in five has
         them, by 2000 almost all do. The frontier is visible as you travel. */
      if (o.r3 > 0.06 + 0.94 * Math.pow(e, 0.62)) { drawCargoPile(x, o, e); continue; }
      /* a back row, higher and smaller, so the yard has depth */
      const nb = Math.round(e * 2.6 + o.r2 * e * 2.2);
      for (let i = 0; i < nb; i++) {
        ctx.fillStyle = i % 3 === 0 ? C.haze2 : C.haze;
        ctx.fillRect(x + colW * 0.16, groundY - 26 * S - (i + 1) * bh * 0.74, colW * 0.74, bh * 0.74 - 1.4);
      }
      const n = Math.round(0.6 + e * 3.9 + o.r * e * 2.6);
      ctx.lineWidth = 1; ctx.strokeStyle = "rgba(15,33,43,.62)";
      for (let i = 0; i < n; i++) {
        const cy = groundY - (i + 1) * bh;
        ctx.fillStyle = C.crate[(Math.floor(o.r * 97) + i * 4) % C.crate.length];
        ctx.fillRect(x, cy, colW - 2, bh - 1.6);
        /* every box is keylined — this is a printed harbour, not an airbrush */
        ctx.strokeRect(x + 0.5, cy + 0.5, colW - 3, bh - 2.6);
        ctx.fillStyle = "rgba(255,255,255,.20)";
        ctx.fillRect(x + colW * 0.42, cy + 1.5, 1.2, bh - 4.6);
      }
    }
  }

  function drawCargoPile(x, o, e) {
    /* loose cargo lands where the gangs are working, and goes away with them */
    const gang = Math.pow(0.5 + 0.5 * Math.sin(o.y * 1.15) * Math.cos(o.y * 0.43 + 1.3), 1.2 + e);
    if (o.r > (0.46 + 0.54 * gang) * (1 - e * 0.92)) return;
    const n = 1 + Math.floor(o.r2 * 4);
    for (let i = 0; i < n; i++) {
      const w = colW * 0.62, h = colW * 0.3;
      const yy = groundY - (i + 1) * (h + 1);
      ctx.lineWidth = 1; ctx.strokeStyle = "rgba(15,33,43,.62)";
      if (o.r > 0.34) {                       /* barrels and crates */
        ctx.fillStyle = C.sack2;
        ctx.fillRect(x + 3 + (i % 2) * 3, yy, w * 0.7, h + 1);
        ctx.strokeRect(x + 3.5 + (i % 2) * 3, yy + 0.5, w * 0.7 - 1, h);
      } else {                                /* sacks */
        ctx.fillStyle = C.sack;
        ctx.beginPath();
        ctx.ellipse(x + 5 + (i % 2) * 3 + w * 0.3, yy + h * 0.5, w * 0.42, h * 0.62, 0, 0, 6.2832);
        ctx.fill(); ctx.stroke();
      }
    }
  }

  /* the gantries are the tall thing — capped just under the top of the frame so
     the boom is still visible. A crane whose boom is off-screen is red scribble. */
  /* the old lattice cranes did not vanish in 1961 — they were displaced,
     slot by slot, as the boxes took over. Mixed terminals are the truth. */
  const isLuffing = (o) => o.y < 1961 || (o.y < 1988 && o.r2 > era(o.y) * 1.05);

  function craneH(o) {
    const e = era(o.y), av = groundY - fieldTop;
    return Math.min(av * 0.84, av * (0.30 + 0.40 * e + o.r * 0.26));
  }

  function drawCraneLegs(t) {
    for (const o of visible(world.crane, 0.2)) {
      const x = xAt(o.y), e = era(o.y);
      if (isLuffing(o)) {
        /* a latticed luffing quay crane — the forest of them IS what a
           break-bulk dock looked like, and the lattice is what makes it read */
        const h = (86 + o.r * 54) * S, jib = h * 0.95, mw = 7 * S;
        const ty = groundY - h;
        ctx.strokeStyle = C.ink2; ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.moveTo(px(x - mw), groundY); ctx.lineTo(px(x - mw), ty);
        ctx.moveTo(px(x + mw), groundY); ctx.lineTo(px(x + mw), ty);
        ctx.moveTo(px(x - mw), ty); ctx.lineTo(px(x + mw), ty);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const y1 = groundY - (i * h) / 5, y2 = groundY - ((i + 1) * h) / 5;
          ctx.moveTo(px(x - mw), y1); ctx.lineTo(px(x + mw), y2);
          ctx.moveTo(px(x + mw), y1); ctx.lineTo(px(x - mw), y2);
        }
        ctx.stroke();
        const jx = x - jib * 0.92, jy = ty - jib * 0.30;
        ctx.lineWidth = 1.7;                    /* the jib, also latticed */
        ctx.beginPath();
        ctx.moveTo(px(x), ty); ctx.lineTo(jx, jy);
        ctx.moveTo(px(x), ty + 9 * S); ctx.lineTo(jx, jy + 7 * S);
        ctx.moveTo(px(x), ty); ctx.lineTo(x + jib * 0.30, ty + jib * 0.16);
        ctx.stroke();
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        for (let i = 1; i < 7; i++) {
          const p1 = i / 7, p2 = (i + 1) / 7;
          ctx.moveTo(x + (jx - x) * p1, ty + (jy - ty) * p1);
          ctx.lineTo(x + (jx - x) * p2, ty + 9 * S + (jy + 7 * S - ty - 9 * S) * p2);
        }
        ctx.stroke();
        ctx.lineWidth = 0.9;                    /* the fall, with a sling on it */
        const hk = groundY - (10 + o.r2 * 46) * S;
        ctx.beginPath(); ctx.moveTo(px(jx + 3), jy + 4 * S); ctx.lineTo(px(jx + 3), hk); ctx.stroke();
        ctx.fillStyle = C.sack;
        ctx.fillRect(jx - 6 * S, hk, 13 * S, 9 * S);
        ctx.strokeStyle = "rgba(15,33,43,.7)";
        ctx.strokeRect(jx - 6 * S + 0.5, hk + 0.5, 13 * S - 1, 9 * S - 1);
        ctx.fillStyle = C.ink2; ctx.fillRect(x - 11 * S, groundY - 17 * S, 22 * S, 17 * S);
        ctx.fillStyle = C.red; ctx.fillRect(x - 11 * S, groundY - 17 * S, 22 * S, 3.4 * S);
        continue;
      }
      const h = craneH(o), legW = h * 0.40;
      ctx.strokeStyle = C.red; ctx.lineWidth = Math.max(2.2, h * 0.011);
      ctx.beginPath();
      ctx.moveTo(px(x - legW / 2), groundY); ctx.lineTo(px(x - legW / 2), groundY - h);
      ctx.moveTo(px(x + legW / 2), groundY); ctx.lineTo(px(x + legW / 2), groundY - h);
      ctx.stroke();
      ctx.lineWidth = 1.4;                     /* portal beam + bracing */
      ctx.beginPath();
      ctx.moveTo(px(x - legW / 2), groundY - h * 0.34); ctx.lineTo(px(x + legW / 2), groundY - h * 0.34);
      ctx.moveTo(px(x - legW / 2), groundY - h * 0.34); ctx.lineTo(px(x + legW / 2), groundY - h * 0.62);
      ctx.moveTo(px(x + legW / 2), groundY - h * 0.34); ctx.lineTo(px(x - legW / 2), groundY - h * 0.62);
      ctx.stroke();
      void e;
    }
  }

  function drawCraneBooms(t) {
    for (const o of visible(world.crane, 0.2)) {
      if (isLuffing(o)) continue;
      const x = xAt(o.y), h = craneH(o);
      const by = groundY - h;
      const reachL = h * 0.82, reachR = h * 0.38;
      ctx.strokeStyle = C.red; ctx.lineWidth = Math.max(3.2, h * 0.017);
      ctx.beginPath(); ctx.moveTo(x - reachL, by); ctx.lineTo(x + reachR, by); ctx.stroke();
      ctx.lineWidth = Math.max(1.6, h * 0.008); /* the A-frame and its stays */
      ctx.beginPath();
      ctx.moveTo(px(x), by); ctx.lineTo(px(x), by - h * 0.20);
      ctx.moveTo(px(x), by - h * 0.20); ctx.lineTo(x - reachL, by);
      ctx.moveTo(px(x), by - h * 0.20); ctx.lineTo(x + reachR, by);
      ctx.stroke();
      /* the trolley, and a box on the way down */
      const ph = 0.5 + 0.5 * Math.sin(t * 0.42 + o.r * 6.283);
      const tx = x - reachL * 0.12 - (reachL * 0.78) * ph;
      const drop = (groundY - by) * (0.30 + 0.40 * (0.5 + 0.5 * Math.sin(t * 0.42 + o.r * 6.283 + 1.6)));
      ctx.fillStyle = C.red; ctx.fillRect(tx - 7, by - 3, 14, 7);
      ctx.strokeStyle = C.ink2; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px(tx), by + 4); ctx.lineTo(px(tx), by + drop); ctx.stroke();
      ctx.fillStyle = C.crate[Math.floor(o.r2 * C.crate.length)];
      ctx.fillRect(tx - colW * 0.55, by + drop, colW * 1.1, colW * 0.48);
    }
  }

  function drawQuay() {
    ctx.fillStyle = C.quay; ctx.fillRect(0, groundY, W, quayY - groundY);
    ctx.fillStyle = C.quayEdge;
    ctx.fillRect(0, quayY - 2.5, W, 2.5);
    ctx.fillRect(0, groundY, W, 1.2);
    /* the crane rails, and the bollards along the edge */
    ctx.fillStyle = "rgba(15,33,43,.34)";
    ctx.fillRect(0, groundY + (quayY - groundY) * 0.42, W, 1.4);
    ctx.fillStyle = C.ink2;
    const off = (yearNow() * pxPerYear) % 74;
    for (let x = -off; x < W; x += 74) {
      ctx.fillRect(x, groundY - 5, 5, 6);
      ctx.fillRect(x + 37, quayY - 6, 2, 4);
    }
  }

  function drawCrew(t) {
    const s = S * 1.75;
    for (const o of visible(world.crew, 0)) {
      const y = o.y;
      /* men work in gangs, so the crowd bunches and thins along the quay
         instead of standing in a picket line */
      const e0 = era(y);
      const gang = Math.pow(0.5 + 0.5 * Math.sin(y * 1.15) * Math.cos(y * 0.43 + 1.3), 1.1 + e0 * 1.4);
      const d = (y < 1956 ? 1 : Math.max(0.05, 1 - 0.95 * smoothstep(1958, 1988, y))) * gang;
      const x = xAt(y) + (o.r2 - 0.5) * 13;
      if (o.r < d) {
        const hh = 9 * s, fy = groundY - 1;
        ctx.fillStyle = C.ink;
        ctx.beginPath(); ctx.arc(x, fy - hh, 1.7 * s, 0, 6.2832); ctx.fill();
        ctx.fillRect(x - 0.9 * s, fy - hh + 1.7 * s, 1.9 * s, hh - 1.7 * s);
        ctx.fillRect(x - 2.6 * s, fy - hh * 0.55, 5.2 * s, 1.4 * s);
        if (o.r2 < 0.42 && y < 1972) {          /* a sack on the shoulder */
          ctx.fillStyle = C.sack;
          ctx.fillRect(x - 4.2 * s, fy - hh - 2.6 * s, 5 * s, 3.4 * s);
        }
      }
      /* railway wagons served the break-bulk quay; trucks arrive with the boxes */
      if (o.r2 > 0.92 && y < 1974) {
        const ww = 30 * s, wh = 11 * s;
        ctx.fillStyle = C.sack2; ctx.fillRect(x, groundY - wh, ww, wh);
        ctx.lineWidth = 1; ctx.strokeStyle = "rgba(15,33,43,.7)";
        ctx.strokeRect(x + 0.5, groundY - wh + 0.5, ww - 1, wh - 1);
        ctx.fillStyle = C.ink;
        ctx.fillRect(x + 4 * s, groundY - 2, 3.4 * s, 3.4 * s);
        ctx.fillRect(x + ww - 7 * s, groundY - 2, 3.4 * s, 3.4 * s);
      }
      if (o.r2 > 0.965 && y > 1961) {
        const e = era(y), tw = 26 * s;
        ctx.fillStyle = C.ink2; ctx.fillRect(x, groundY - 7 * s, tw, 6 * s);
        ctx.fillStyle = C.crate[Math.floor(o.r * C.crate.length)];
        ctx.fillRect(x + 3 * s, groundY - 7 * s - 8 * s * e - 2, tw * 0.8, 8 * s * e + 2);
      }
    }
  }

  function drawWater(t) {
    const g = ctx.createLinearGradient(0, quayY, 0, fieldBottom);
    g.addColorStop(0, C.sea); g.addColorStop(1, C.sea2);
    ctx.fillStyle = g; ctx.fillRect(0, quayY, W, fieldBottom - quayY);
    /* the harbour is DRAWN, in rows of wave marks, not left as a flat fill —
       the water is a fifth of the frame and a flat fill wastes it */
    const rows = Math.max(5, Math.round(waterH / 15));
    const base = yearNow() * pxPerYear;
    for (let r = 0; r < rows; r++) {
      const y = quayY + 5 + (r + 0.5) * (waterH - 8) / rows;
      const pitch = 28 + (r % 4) * 12;
      const drift = reduce.matches ? 0 : Math.sin(t * 0.36 + r * 1.7) * 6;
      const off = ((base * (0.88 + r * 0.035) + r * 13.7 + drift) % pitch + pitch) % pitch;
      ctx.fillStyle = r % 2 ? C.foam : C.ripple;
      ctx.globalAlpha = r % 2 ? 0.46 : 0.72;
      const w = 7 + (r % 4) * 6;
      for (let x = -off - pitch; x < W + pitch; x += pitch) ctx.fillRect(x, y, w, 1.8);
    }
    ctx.globalAlpha = 1;
  }

  function drawForeWater(t) {
    ctx.fillStyle = C.foam;
    for (const o of visible(world.ripple, 0)) {
      if (o.r2 < 0.78) continue;
      const x = xAt(o.y) * 1.06 - W * 0.03 + (reduce.matches ? 0 : Math.sin(t * 0.72 + o.r * 6.283) * 9);
      const y = quayY + waterH * (0.66 + o.r * 0.3);
      ctx.globalAlpha = 0.42;
      ctx.fillRect(x, y, 18 + o.r * 34, 1.6);
    }
    ctx.globalAlpha = 1;
  }

  function drawShips(t) {
    for (const o of visible(world.ship, 0.55)) {
      const teu = capAt(o.y);
      const len = shipLenM(teu) * pxm;
      const x = xAt(o.y) - len / 2;
      if (x > W + 40 || x + len < -40) continue;
      const bob = reduce.matches ? 0 : Math.sin(t * 0.55 + o.r * 6.283) * 1.6;
      const dy = quayY + 4 + bob;
      const hh = clamp(len * 0.132, 20, 82);
      /* the hull's reflection, so the harbour is water and not a flat band */
      ctx.globalAlpha = 0.20; ctx.fillStyle = "#04222E";
      ctx.fillRect(x + len * 0.05, dy + hh, len * 0.87, Math.min(waterH * 0.55, hh * 1.4));
      ctx.globalAlpha = 1;
      drawShip(x, dy, len, hh, teu, o, t);
    }
  }

  function drawShip(x, dy, len, hh, teu, o, t) {
    /* hull */
    ctx.beginPath();
    ctx.moveTo(x, dy + 2);
    ctx.lineTo(x + len * 0.93, dy);
    ctx.quadraticCurveTo(x + len, dy + hh * 0.18, x + len, dy + hh * 0.52);
    ctx.lineTo(x + len * 0.92, dy + hh);
    ctx.lineTo(x + len * 0.05, dy + hh);
    ctx.closePath();
    ctx.fillStyle = teu > 1 ? C.ink : "#22343E";
    ctx.fill();
    ctx.lineWidth = 1.3; ctx.strokeStyle = "rgba(6,16,22,.9)"; ctx.stroke();
    /* boot topping, and a lighter upper strake so the hull separates from the
       yard behind it instead of merging into one dark mass */
    ctx.fillStyle = C.red2;
    ctx.fillRect(x + len * 0.05, dy + hh - Math.max(2, hh * 0.13), len * 0.87, Math.max(2, hh * 0.13));
    ctx.fillStyle = "#31505F";
    ctx.fillRect(x + len * 0.05, dy + 2, len * 0.88, Math.max(2.5, hh * 0.15));

    if (teu <= 1) {
      /* a break-bulk freighter: masts, derricks, hatches, a tall funnel */
      const shH = hh * 1.5;
      ctx.fillStyle = "#EDF3F5";
      ctx.fillRect(x + len * 0.42, dy - shH, len * 0.19, shH);
      ctx.fillStyle = C.ink2;
      for (let i = 0; i < 3; i++) ctx.fillRect(x + len * 0.435, dy - shH + 4 + i * (shH / 3.6), len * 0.16, 2.2);
      ctx.fillStyle = C.red;
      ctx.fillRect(x + len * 0.485, dy - shH - hh * 1.05, len * 0.058, hh * 1.05);
      ctx.fillStyle = C.ink;
      ctx.fillRect(x + len * 0.485, dy - shH - hh * 1.05, len * 0.058, hh * 0.28);
      const mh = hh * 2.7;
      ctx.strokeStyle = C.ink;
      [0.18, 0.72].forEach((f) => {
        const mx = x + len * f;
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(px(mx), dy); ctx.lineTo(px(mx), dy - mh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px(mx), dy - mh * 0.86); ctx.lineTo(px(mx - len * 0.10), dy - mh * 0.20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px(mx), dy - mh * 0.86); ctx.lineTo(px(mx + len * 0.10), dy - mh * 0.20); ctx.stroke();
        ctx.lineWidth = 0.9;                  /* standing rigging */
        ctx.beginPath();
        ctx.moveTo(px(mx), dy - mh); ctx.lineTo(x + len * (f - 0.15), dy + 1);
        ctx.moveTo(px(mx), dy - mh); ctx.lineTo(x + len * (f + 0.15), dy + 1);
        ctx.moveTo(px(mx), dy - mh * 0.62); ctx.lineTo(x + len * (f - 0.08), dy + 1);
        ctx.moveTo(px(mx), dy - mh * 0.62); ctx.lineTo(x + len * (f + 0.08), dy + 1);
        ctx.stroke();
      });
      if (o.r > 0.42) {                       /* dressed overall: signal flags */
        const m1 = x + len * 0.18, m2 = x + len * 0.72, mt = dy - mh;
        ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(px(m1), mt); ctx.lineTo(px(m2), mt - 5); ctx.stroke();
        for (let i = 1; i < 8; i++) {
          const p = i / 8, fx2 = m1 + (m2 - m1) * p, fy2 = mt - 5 * p;
          ctx.fillStyle = [C.red, "#1D6FA8", "#D9A72F", "#2C7A55"][i % 4];
          ctx.beginPath();
          ctx.moveTo(fx2, fy2); ctx.lineTo(fx2 + 9, fy2 + 4); ctx.lineTo(fx2, fy2 + 9);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.fillStyle = C.ink2;
      [0.10, 0.28, 0.64, 0.82].forEach((f) => {
        ctx.fillRect(x + len * f, dy - hh * 0.34, len * 0.085, hh * 0.34);
        ctx.strokeStyle = "rgba(6,16,22,.8)"; ctx.lineWidth = 1;
        ctx.strokeRect(x + len * f + 0.5, dy - hh * 0.34 + 0.5, len * 0.085 - 1, hh * 0.34);
      });
      ctx.fillStyle = "rgba(200,222,230,.62)";  /* portholes */
      for (let i = 0; i < 9; i++) ctx.fillRect(x + len * (0.10 + i * 0.082), dy + hh * 0.34, 3.4, 3.4);
      /* steam. It is what a 1950s quay actually looked like, and it gives the
         empty part of the sky something to do before the gantries arrive. */
      const fx = x + len * 0.514, fy = dy - shH - hh * 1.05;
      ctx.fillStyle = "rgba(126,152,164,.19)";
      for (let i = 0; i < 8; i++) {
        const p = ((t * 0.055 + o.r + i * 0.125) % 1);
        ctx.beginPath();
        ctx.arc(fx + p * 62 + Math.sin(p * 5 + o.r * 6) * 11, fy - 6 - p * 190, (6 + p * 34) * S, 0, 6.2832);
        ctx.fill();
      }
      return;
    }

    /* a container ship: deck stack, accommodation aft */
    const cols = Math.max(4, Math.round(4 + 17 * Math.sqrt(teu / CAP_MAX)));
    const tiers = Math.max(1, Math.round(1 + 8.5 * Math.sqrt(teu / CAP_MAX)));
    const bw = (len * 0.72) / cols, bh = Math.min(bw * 0.70, hh * 0.50);
    const sx = x + len * 0.045;
    ctx.fillStyle = "#3E6070";                 /* the hatch coaming the boxes sit on */
    ctx.fillRect(sx - 4, dy - 4, cols * bw + 8, 5);
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(9,20,27,.70)";
    for (let c = 0; c < cols; c++) {
      const wobble = ((Math.floor(o.r * 91) + c * 7) % 5 === 0) ? 1 : 0;
      for (let r = 0; r < tiers - wobble; r++) {
        ctx.fillStyle = C.crate[(c * 5 + r * 3 + Math.floor(o.r2 * 89)) % C.crate.length];
        ctx.fillRect(sx + c * bw, dy - (r + 1) * bh, bw - 1.1, bh - 1.1);
        ctx.strokeRect(sx + c * bw + 0.5, dy - (r + 1) * bh + 0.5, bw - 2.1, bh - 2.1);
      }
    }
    const shW = len * 0.075, shH = Math.max(bh * tiers * 0.9, hh * 1.1);
    ctx.fillStyle = "#E7EDEF";
    ctx.fillRect(x + len * 0.80, dy - shH, shW, shH);
    ctx.fillStyle = C.ink2;
    for (let i = 0; i < 4; i++) ctx.fillRect(x + len * 0.80 + 1.5, dy - shH + 3 + i * (shH / 5), shW - 3, 1.6);
    ctx.fillStyle = C.red;
    ctx.fillRect(x + len * 0.815, dy - shH - hh * 0.46, shW * 0.5, hh * 0.46);
  }

  function drawGulls(t) {
    if (reduce.matches) return;
    ctx.strokeStyle = "rgba(15,33,43,.42)"; ctx.lineWidth = 1.3;
    for (let i = 0; i < 6; i++) {
      const s = 0.4 + (i % 3) * 0.24;
      const x = ((t * 13 * s + i * 260) % (W + 90)) - 45;
      const y = fieldTop + 34 + i * 21 + Math.sin(t * 0.9 + i) * 7;
      const a = 4 + i * 0.7;
      ctx.beginPath();
      ctx.moveTo(x - a, y); ctx.quadraticCurveTo(x, y - a * 0.7, x + a, y);
      ctx.stroke();
    }
  }

  /* the guards: the drawing is faded back where type sits, so nothing needs a
     container to be legible. Feathered to the viewport edge, never a shape. */
  function wash(x0, x1, y0, y1, strength) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "rgba(" + C.paper + ",1)");
    g.addColorStop(1, "rgba(" + C.paper + ",0)");
    const strips = 20, h = (y1 - y0) / strips;
    ctx.fillStyle = g;
    for (let i = 0; i < strips; i++) {
      const u = i / (strips - 1);
      /* full strength across the whole figure, then feathered away below it —
         a falloff that starts at the top leaves the last line of type unreadable */
      ctx.globalAlpha = strength * (u < 0.74 ? 1 : Math.pow((1 - u) / 0.26, 1.5));
      ctx.fillRect(Math.min(x0, x1), y0 + i * h, Math.abs(x1 - x0), h + 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawGuards() {
    const fh = fieldBottom - fieldTop;
    const g = ctx.createLinearGradient(0, fieldTop, 0, fieldTop + fh * 0.30);
    g.addColorStop(0, "rgba(" + C.paper + ",.30)");
    g.addColorStop(1, "rgba(" + C.paper + ",0)");
    ctx.fillStyle = g; ctx.fillRect(0, fieldTop, W, fh * 0.30);

    const pr = plateEl.getBoundingClientRect();
    if (pr.height > 8) wash(0, pr.right + 130, Math.max(fieldTop, pr.top - 20), Math.min(fieldBottom, pr.bottom + 92), 0.88);
    const or_ = document.querySelector(".odo").getBoundingClientRect();
    if (or_.height > 8 && or_.right > W * 0.5) wash(W, or_.left - 130, Math.max(fieldTop, or_.top - 20), Math.min(fieldBottom, or_.bottom + 92), 0.88);
  }

  function draw(t) {
    ctx.fillStyle = "rgb(" + C.paper + ")";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, fieldTop, W, fieldBottom - fieldTop); ctx.clip();
    drawSky();
    drawGulls(t);
    drawCity();
    drawStacks();
    /* atmospheric separation: the yard and the city sit BACK, so the red
       gantries and the ship at the quay read as the subject in front of them */
    ctx.globalAlpha = 0.32; ctx.fillStyle = "rgb(" + C.paper + ")";
    ctx.fillRect(0, fieldTop, W, groundY - fieldTop); ctx.globalAlpha = 1;
    drawCraneLegs(t);
    drawQuay();
    drawCrew(t);
    drawWater(t);
    drawShips(t);
    drawCraneBooms(t);
    drawForeWater(t);
    drawGuards();
    ctx.restore();
  }

  /* ── the readouts ─────────────────────────────────────────────────────── */
  function placeHead() {
    headEl.style.transform =
      "translateX(" + (RAIL_PAD + pos * Math.max(0, railEl.clientWidth - RAIL_PAD * 2)).toFixed(2) + "px)";
  }

  function showStation(i) {
    const s = STATIONS[i];
    stnNo.textContent = String(i + 1).padStart(2, "0");
    stnYear.textContent = s.lbl;
    stnTitle.textContent = s.n;
    stnLine.textContent = s.line;
    shownIdx = i;
  }

  function markCrossed(i) {
    crossed[i] = true; crossedCount++;
    markEls[i].classList.add("crossed");
    rowEls[i].classList.add("crossed");
    rowEls[i].querySelector(".mf-s").textContent = "●";
    crossedTop.textContent = crossedCount + "/" + NS;
    crossedBottom.textContent = "crossed " + crossedCount + " / " + NS;
  }

  /* ── input ────────────────────────────────────────────────────────────── */
  function arm() { if (touched) return; touched = true; hintEl.classList.add("gone"); }

  canvas.addEventListener("pointerdown", (e) => {
    dragging = "port"; lastX = e.clientX; arm();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
  });
  railEl.addEventListener("pointerdown", (e) => {
    dragging = "rail"; arm();
    const r = railEl.getBoundingClientRect();
    target = clamp01((e.clientX - r.left - RAIL_PAD) / Math.max(1, r.width - RAIL_PAD * 2));
    try { railEl.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (dragging === "port") {
      /* the world follows the finger: push it left and you walk forward */
      target = clamp01(target - ((e.clientX - lastX) / (pxPerYear * SPAN)) * GAIN);
      lastX = e.clientX;
    } else {
      const r = railEl.getBoundingClientRect();
      target = clamp01((e.clientX - r.left - RAIL_PAD) / Math.max(1, r.width - RAIL_PAD * 2));
    }
  });
  const endDrag = () => { dragging = null; };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  /* only a drag that began on the drawing surface or the rail eats the touch */
  document.addEventListener("touchmove", (e) => { if (dragging) e.preventDefault(); }, { passive: false });

  window.addEventListener("wheel", (e) => {
    if (mfOpen) return;
    arm();
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    target = clamp01(target + d * 0.00042);
    e.preventDefault();
  }, { passive: false });

  function keyTravel(e) {
    if (mfOpen) return false;
    const step = e.shiftKey ? 5 / SPAN : 0.6 / SPAN;
    let ok = true;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") target = clamp01(target + step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") target = clamp01(target - step);
    else if (e.key === "PageUp") target = clamp01(target + 8 / SPAN);
    else if (e.key === "PageDown") target = clamp01(target - 8 / SPAN);
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = 1;
    else ok = false;
    if (ok) { arm(); e.preventDefault(); }
    return ok;
  }
  railEl.addEventListener("keydown", keyTravel);
  window.addEventListener("keydown", (e) => {
    if (e.target !== document.body && e.target !== document.documentElement) return;
    keyTravel(e);
  });

  /* ── loop ─────────────────────────────────────────────────────────────── */
  let t0 = performance.now(), acc = 0;

  function frame(now) {
    const dt = Math.min((now - t0) / 1000, 0.05);
    t0 = now;
    const t = reduce.matches ? 0 : now / 1000;

    /* alive before anyone touches it: the century drifts past on its own, which
       also shows the visitor what the page is for. Stops on first input. */
    if (!touched && !reduce.matches) target = clamp01(target + dt * 0.0085);

    pos += (target - pos) * (1 - Math.exp(-dt * (reduce.matches ? 26 : 8.5)));
    if (Math.abs(target - pos) < 0.00008) pos = target;

    const y = yearNow();

    /* which stop is nearest, and how close */
    let ni = 0, nd = 1e9;
    for (let i = 0; i < NS; i++) { const d = Math.abs(STATIONS[i].y - y); if (d < nd) { nd = d; ni = i; } }
    const lock = 1 - smoothstep(win[ni].w1, win[ni].w0, nd);
    if (ni !== shownIdx) showStation(ni);

    const ahead = STATIONS[ni].y - y;
    root.style.setProperty("--lk", lock.toFixed(3));
    root.style.setProperty("--dir", ahead >= 0 ? "-1" : "1");
    stnAway.textContent = lock > 0.7 ? "you are here"
      : (Math.abs(ahead) < 1.4 ? "almost" : Math.round(Math.abs(ahead)) + (ahead > 0 ? " years ahead" : " years back"));

    /* the plate: the stop's own shape, or the live curve between stops */
    const vis = smoothstep(0.05, 0.34, lock);      /* fast swap, slow build */
    for (const f of figs) {
      if (f === fLive) continue;
      const on = Number(f.dataset.i) === ni + 1 && vis > 0.01;
      f.classList.toggle("on", on);
      if (on) { f.style.setProperty("--k", lock.toFixed(3)); f.style.setProperty("--vis", vis.toFixed(3)); }
    }
    const liveK = 1 - vis;
    fLive.classList.toggle("on", liveK > 0.01);
    fLive.style.setProperty("--k", "1");
    fLive.style.setProperty("--vis", liveK.toFixed(3));
    if (liveK > 0.01) {
      const lx = LV.x0 + (clamp01((y - Y0) / SPAN)) * (LV.x1 - LV.x0);
      const ly = lvY(capAt(y));
      lvHead.setAttribute("transform", "translate(" + lx.toFixed(1) + ",0)");
      lvStem.setAttribute("y1", ly.toFixed(1));
      lvDot.setAttribute("cy", ly.toFixed(1));
    }

    /* crossing a stop is the thing that accumulates */
    if (touched && lock > 0.86) {
      dwell += dt;
      if (dwell > 0.3 && !crossed[ni]) markCrossed(ni);
    } else dwell = 0;

    placeHead();

    acc += dt;
    if (acc > 0.06) {
      acc = 0;
      const yr = Math.round(y);
      odoYear.textContent = yr;
      const cap = Math.round(capAt(y));
      odoShip.textContent = cap < 1 ? "none yet" : "about " + cap.toLocaleString("en-US") + " boxes";
      roCost.textContent = y < 1956.3 ? "$5.86" : "$0.16";
      roPct.textContent = Math.round(pos * 100) + "%";
      railEl.setAttribute("aria-valuenow", String(yr));
      railEl.setAttribute("aria-valuetext", yr + " — " + STATIONS[ni].n + (crossed[ni] ? ", crossed" : ""));
    }

    draw(t);
    requestAnimationFrame(frame);
  }

  /* ── go ───────────────────────────────────────────────────────────────── */
  /* a year can be deep-linked: /land-container/#y1995 opens at that year */
  const hm = /y(\d{4})/.exec(location.hash || "");
  if (hm) { target = pos = clamp01((Number(hm[1]) - Y0) / SPAN); touched = true; hintEl.classList.add("gone"); }

  buildLive();
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 120));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  showStation(0);
  requestAnimationFrame(frame);
})();
