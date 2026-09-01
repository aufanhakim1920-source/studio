/* =========================================================================
   FATHOM — swell-c
   The compass is the object: four needles (tide / swell / wind / water
   temperature) read the day's forecast at once, and the SPREAD between
   them — not any single needle — is the thing the page is built to show.
   One dial (7 days) drives the compass, the verdict pill, the agreement
   number and the three activity scores below it — Instruments §1c's
   "one input, five readouts" pattern.
   ========================================================================= */

(() => {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!REDUCED) document.documentElement.classList.add("motion");

  /* ---------------------------------------------------------------------
     DATA — one illustrative week. Four factors per day (0-100, "calm"
     reading for TIDE / SWELL / WIND / WATER TEMP — the exact four inputs
     named in the brief's own honest-limitation copy). Swim/dive/fish are
     COMPUTED from these, not hardcoded, so the "same physics, three
     readings" claim is literally true in code, not just in copy.
     ------------------------------------------------------------------- */
  const DAY_ABBR = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
  const DAY_FULL = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];

  // [TIDE, SWELL, WIND, WATER] — illustrative, deterministic, not live data
  const FACTORS = [
    [82, 78, 85, 80], // MON — clean, tight agreement
    [75, 68, 40, 78], // TUE — wind model pulls it down
    [70, 22, 55, 74], // WED — swell model disagrees hard
    [60, 58, 62, 70], // THU — mid, tight
    [88, 84, 30, 76], // FRI — offshore blow, wind tanks
    [90, 92, 88, 82], // SAT — best day of the week
    [65, 60, 58, 66], // SUN — mid, tight
  ];
  const FACTOR_COLORS = ["#34e5a0", "#5fc9ff", "#e8b84b", "#c68bff"];
  const FACTOR_NAMES  = ["TIDE", "SWELL", "WIND", "WATER"];

  /* The day the page LOADS on. Not arbitrary: computeScores() below is run
     over all seven days and only FRI separates the three activity readings
     far enough to see them —
       MON 81/81/55  TUE 64/65/51  WED 50/46/44  THU 60/61/55
       FRI 71/73/47  SAT 90/90/56  SUN 62/61/52
     MON and SAT tie two of the three outright (81/81, 90/90), which reads as
     a copy-paste bug directly under a claim that the three differ. FRI has
     the widest range (26 pts) and no near-tie tighter than 2, AND the widest
     source disagreement of the week (58 pts) — so the compass loads with its
     four needles genuinely fanned instead of stacked, which is the one thing
     the object exists to show. Change this and check both facts still hold. */
  const DEFAULT_DAY = 4;

  function computeScores([T, S, W, Wt]) {
    return {
      swim: Math.round(0.35 * T + 0.35 * S + 0.25 * W + 0.05 * Wt),
      dive: Math.round(0.25 * T + 0.45 * S + 0.20 * W + 0.10 * Wt),
      fish: Math.round(0.40 * (100 - T) + 0.20 * S + 0.10 * W + 0.30 * Wt),
    };
  }
  function verdictFor(factors) {
    const worst = Math.min(...factors);
    const spread = Math.max(...factors) - Math.min(...factors);
    if (worst >= 65 && spread <= 20) return "GO";
    if (worst < 35 || spread > 45) return "DON'T";
    return "CAUTION";
  }

  let currentDay = DEFAULT_DAY;

  /* ---------------------------------------------------------------------
     THE COMPASS — canvas, semicircle gauge, four needles + a filled
     "spread wedge" showing the range the sources occupy. Settles via a
     bounded ease-toward-target loop (Instruments §1c) with two ghost
     trail frames (Hand Rolled 3D Wireframe's ghost-layer trick) — then
     STOPS. No continuous rAF once settled.
     ------------------------------------------------------------------- */
  const canvas = document.getElementById("compassCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H - 34;
  const rOuter = Math.min(W, H) * 0.86;
  const rBand = rOuter * 0.56;

  let current = [0, 0, 0, 0];
  let target = FACTORS[DEFAULT_DAY];
  let ghosts = []; // trailing frames: {vals:[...], age:0..1}
  let rafId = null;

  function angleForValue(v) {
    // -90deg (left, ROUGH) .. +90deg (right, CALM), 0 = straight up
    return (-90 + (v / 100) * 180) * (Math.PI / 180);
  }

  function drawNeedle(theta, len, color, alpha, width) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(theta);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.stroke();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    // arc track
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, Math.PI, 2 * Math.PI);
    ctx.stroke();

    // tick marks every 20, longer at 0/50/100
    for (let v = 0; v <= 100; v += 20) {
      const a = angleForValue(v) - Math.PI / 2;
      const long = v === 0 || v === 50 || v === 100;
      const r1 = rOuter - (long ? 12 : 7);
      const x1 = cx + Math.cos(a) * rOuter, y1 = cy + Math.sin(a) * rOuter;
      const x2 = cx + Math.cos(a) * r1, y2 = cy + Math.sin(a) * r1;
      ctx.strokeStyle = long ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.15)";
      ctx.lineWidth = long ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    // end labels
    ctx.font = "10px " + getComputedStyle(document.body).getPropertyValue("--font-mono");
    ctx.fillStyle = "rgba(146,153,143,.9)";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText("ROUGH", 6, cy - 4);
    ctx.textAlign = "right";
    ctx.fillText("CALM", W - 6, cy - 4);

    // spread wedge — the RANGE, drawn first so needles sit on top
    const lo = Math.min(...current), hi = Math.max(...current);
    const startA = angleForValue(lo) - Math.PI / 2;
    const endA = angleForValue(hi) - Math.PI / 2;
    ctx.fillStyle = "rgba(52,229,160,.12)";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, rBand, startA, endA);
    ctx.closePath();
    ctx.fill();

    // ghost trails (older frames), faint
    ghosts.forEach((g, gi) => {
      const alpha = (1 - g.age) * 0.12;
      g.vals.forEach((v, i) => {
        drawNeedle(angleForValue(v), rOuter * 0.72, FACTOR_COLORS[i], alpha, 1);
      });
    });

    // live needles
    current.forEach((v, i) => {
      drawNeedle(angleForValue(v), rOuter * 0.8, FACTOR_COLORS[i], 0.95, 2);
    });

    // pivot cap
    ctx.fillStyle = "#0b0d0c";
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function updateReadouts() {
    const lo = Math.min(...current), hi = Math.max(...current);
    const spread = Math.round(hi - lo);
    const verdict = verdictFor(current);
    const pill = document.getElementById("verdictPill");
    const agree = document.getElementById("agreementValue");
    pill.textContent = verdict;
    pill.dataset.state = verdict === "GO" ? "go" : verdict === "CAUTION" ? "caution" : "dont";
    agree.textContent = spread;
  }

  function settleLoop() {
    let moving = false;
    const prev = current.slice();
    current = current.map((c, i) => {
      const t = target[i];
      const next = c + (t - c) * 0.14;
      if (Math.abs(t - next) > 0.25) moving = true;
      return next;
    });
    ghosts.unshift({ vals: prev, age: 0 });
    ghosts = ghosts.slice(0, 2).map((g) => ({ vals: g.vals, age: g.age + 0.5 }));

    render();
    updateReadouts();

    if (moving) {
      rafId = requestAnimationFrame(settleLoop);
    } else {
      current = target.slice();
      ghosts = [];
      render();
      updateReadouts();
      rafId = null; // fully stops — no residual loop
    }
  }

  function goToDay(index, { instant = false } = {}) {
    currentDay = index;
    target = FACTORS[index];

    if (REDUCED || instant) {
      current = target.slice();
      ghosts = [];
      render();
      updateReadouts();
    } else if (!rafId) {
      rafId = requestAnimationFrame(settleLoop);
    }

    updateScoreBars(index);
    updateDaySelectorUI(index);
  }

  /* ---------------------------------------------------------------------
     DAY SELECTOR — a real rotary dial (ref 11's exact atan2 technique)
     plus accessible buttons. Both call goToDay(); the dial is a bonus
     tactile layer, the buttons are the guaranteed-accessible control.
     ------------------------------------------------------------------- */
  const dialWell = document.getElementById("dayDialWell");
  const dialRotator = document.getElementById("dayDialRotator");
  const dayBtns = [...document.querySelectorAll(".day-btn")];
  const SEGMENT = 360 / 7;

  function updateDaySelectorUI(index) {
    dialRotator.style.setProperty("--rotation", `${index * SEGMENT}deg`);
    dialWell.setAttribute("aria-valuenow", String(index));
    dialWell.setAttribute("aria-valuetext", DAY_FULL[index]);
    dayBtns.forEach((b) => b.classList.toggle("is-active", Number(b.dataset.day) === index));
    document.getElementById("scoresDayLabel").textContent = DAY_FULL[index];
  }

  // rotation must start on the default segment, or the first drag jumps
  let dragging = false, startAngle = 0, rotation = DEFAULT_DAY * SEGMENT;
  function pointerAngle(e, el) {
    const r = el.getBoundingClientRect();
    const px = e.touches ? e.touches[0].clientX : e.clientX;
    const py = e.touches ? e.touches[0].clientY : e.clientY;
    return Math.atan2(py - (r.top + r.height / 2), px - (r.left + r.width / 2)) * (180 / Math.PI);
  }
  function onDragStart(e) {
    dragging = true;
    startAngle = pointerAngle(e, dialWell) - rotation;
  }
  function onDragMove(e) {
    if (!dragging) return;
    e.preventDefault();
    rotation = pointerAngle(e, dialWell) - startAngle;
    let norm = rotation % 360; if (norm < 0) norm += 360;
    const idx = Math.round(norm / SEGMENT) % 7;
    dialRotator.style.setProperty("--rotation", `${rotation}deg`);
    if (idx !== currentDay) goToDay(idx);
  }
  function onDragEnd() {
    if (!dragging) return;
    dragging = false;
    rotation = currentDay * SEGMENT; // snap clean to the settled segment
    dialRotator.style.setProperty("--rotation", `${rotation}deg`);
  }
  dialWell.addEventListener("mousedown", onDragStart);
  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", onDragEnd);
  dialWell.addEventListener("touchstart", onDragStart, { passive: false });
  window.addEventListener("touchmove", onDragMove, { passive: false });
  window.addEventListener("touchend", onDragEnd);

  dialWell.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); goToDay((currentDay + 1) % 7); rotation = currentDay * SEGMENT; }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); goToDay((currentDay + 6) % 7); rotation = currentDay * SEGMENT; }
  });
  dayBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      goToDay(Number(btn.dataset.day));
      rotation = currentDay * SEGMENT;
    });
  });

  /* ---------------------------------------------------------------------
     THREE SCORES — same four factors, three weightings, computed live.
     ------------------------------------------------------------------- */
  const fillEls = { swim: document.getElementById("fillSwim"), dive: document.getElementById("fillDive"), fish: document.getElementById("fillFish") };
  const numEls  = { swim: document.getElementById("numSwim"),  dive: document.getElementById("numDive"),  fish: document.getElementById("numFish") };
  function updateScoreBars(index) {
    const s = computeScores(FACTORS[index]);
    ["swim", "dive", "fish"].forEach((k) => {
      fillEls[k].style.width = s[k] + "%";
      numEls[k].textContent = s[k];
    });
  }

  /* ---------------------------------------------------------------------
     ACTIVITY CHIPS — jump to the matching score row, pulse it once.
     ------------------------------------------------------------------- */
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      const row = document.querySelector(`.score-row[data-score="${chip.dataset.activity}"]`);
      if (row) {
        row.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
        row.style.transition = "background .3s ease";
        row.style.background = "rgba(52,229,160,.08)";
        setTimeout(() => { row.style.background = "transparent"; }, 1200);
      }
    });
  });

  /* ---------------------------------------------------------------------
     NUMBERS BAND — count-up on reveal, toward the value already in the
     markup (Rule 3: animate toward the real value, never from nothing).
     ------------------------------------------------------------------- */
  function countUp(el) {
    const target = Number(el.dataset.count);
    if (REDUCED) { el.textContent = target.toLocaleString("en-AU"); return; }
    const start = performance.now();
    const dur = 700;
    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString("en-AU");
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------------------
     INTERVAL CHART — 15-minute update cycle as a small tick clock.
     Static diagram (not live time), draws in once.
     ------------------------------------------------------------------- */
  function buildIntervalChart() {
    const host = document.getElementById("intervalChart");
    const size = 48, r = 20, cx2 = size / 2, cy2 = size / 2;
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("width", size); svg.setAttribute("height", size);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const emphasise = i % 3 === 0; // every 15 min of a 60min face
      const rr = emphasise ? r : r - 4;
      const x1 = cx2 + Math.cos(a) * rr, y1 = cy2 + Math.sin(a) * rr;
      const x2 = cx2 + Math.cos(a) * (rr - 4), y2 = cy2 + Math.sin(a) * (rr - 4);
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", x1); line.setAttribute("y1", y1);
      line.setAttribute("x2", x2); line.setAttribute("y2", y2);
      line.setAttribute("stroke", emphasise ? "#34e5a0" : "rgba(255,255,255,.18)");
      line.setAttribute("stroke-width", emphasise ? 2 : 1);
      line.setAttribute("stroke-linecap", "round");
      svg.appendChild(line);
    }
    const ring = document.createElementNS(ns, "circle");
    ring.setAttribute("cx", cx2); ring.setAttribute("cy", cy2); ring.setAttribute("r", r + 2);
    ring.setAttribute("fill", "none"); ring.setAttribute("stroke", "rgba(255,255,255,.08)");
    svg.insertBefore(ring, svg.firstChild);
    host.appendChild(svg);
  }

  /* ---------------------------------------------------------------------
     ACCURACY CHART — a minutes scale with the ±4min honest band marked
     against the official-table zero line (the required comparison).
     ------------------------------------------------------------------- */
  function buildAccuracyChart() {
    const host = document.getElementById("accuracyChart");
    const w = 320, h = 40;
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", "100%"); svg.setAttribute("height", h);
    svg.setAttribute("preserveAspectRatio", "none");

    const minToX = (m) => w / 2 + (m / 15) * (w / 2 - 10);

    const track = document.createElementNS(ns, "line");
    track.setAttribute("x1", 10); track.setAttribute("x2", w - 10);
    track.setAttribute("y1", h - 12); track.setAttribute("y2", h - 12);
    track.setAttribute("stroke", "rgba(255,255,255,.14)");
    svg.appendChild(track);

    const band = document.createElementNS(ns, "rect");
    band.setAttribute("x", minToX(-4)); band.setAttribute("width", minToX(4) - minToX(-4));
    band.setAttribute("y", h - 20); band.setAttribute("height", 16);
    band.setAttribute("fill", "rgba(52,229,160,.18)");
    band.setAttribute("rx", 2);
    svg.appendChild(band);

    const zero = document.createElementNS(ns, "line");
    zero.setAttribute("x1", minToX(0)); zero.setAttribute("x2", minToX(0));
    zero.setAttribute("y1", h - 26); zero.setAttribute("y2", h - 6);
    zero.setAttribute("stroke", "#ECEAE1"); zero.setAttribute("stroke-width", 1.5);
    svg.appendChild(zero);

    [-15, -8, 0, 8, 15].forEach((m) => {
      const t = document.createElementNS(ns, "text");
      t.setAttribute("x", minToX(m)); t.setAttribute("y", h - 26);
      t.setAttribute("fill", "rgba(146,153,143,.8)");
      t.setAttribute("font-size", "8");
      t.setAttribute("font-family", "JetBrains Mono, monospace");
      t.setAttribute("text-anchor", "middle");
      t.textContent = m === 0 ? "OFFICIAL" : (m > 0 ? "+" : "") + m;
      svg.appendChild(t);
    });

    host.appendChild(svg);
  }

  /* ---------------------------------------------------------------------
     HEAT STRIP — 365 cells, 61 marked "don't". Fully deterministic
     (a hashed, seasonally-weighted selection — no Math.random), so the
     page renders identically every load and every screenshot.
     ------------------------------------------------------------------- */
  function buildHeatChart() {
    const host = document.getElementById("heatChart");
    const N = 364; // 52 * 7, fits the 52-column grid cleanly
    const DONT_COUNT = 61;

    const hash = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const seasonal = (i) => 0.5 + 0.5 * Math.sin(((i - 195) / N) * Math.PI * 2); // peaks mid-year (storm season)
    const scored = Array.from({ length: N }, (_, i) => ({ i, score: hash(i) * 0.55 + seasonal(i) * 0.45 }));
    scored.sort((a, b) => b.score - a.score);
    const dontDays = new Set(scored.slice(0, DONT_COUNT).map((d) => d.i));

    const frag = document.createDocumentFragment();
    for (let i = 0; i < N; i++) {
      const cell = document.createElement("div");
      cell.className = "heat-cell" + (dontDays.has(i) ? " is-on" : "");
      frag.appendChild(cell);
    }
    host.appendChild(frag);
  }

  /* ---------------------------------------------------------------------
     PRICING — capacity dot rows, computed from the real tier numbers.
     ------------------------------------------------------------------- */
  function buildCapDots() {
    document.querySelectorAll(".cap-dots[data-fill]").forEach((host) => {
      const fill = Number(host.dataset.fill), of = Number(host.dataset.of);
      for (let i = 0; i < of; i++) {
        const d = document.createElement("span");
        d.className = "cap-dot" + (i < fill ? " is-on" : "");
        host.appendChild(d);
      }
    });
    const club = document.getElementById("clubDots");
    if (club) {
      for (let i = 0; i < 30; i++) {
        const d = document.createElement("span");
        d.className = "cap-dot is-on";
        club.appendChild(d);
      }
    }
  }

  /* ---------------------------------------------------------------------
     LIMITATION — typewriter reveal, one-shot, bounded, on scroll-into-view.
     ------------------------------------------------------------------- */
  function typeLimitation(el) {
    const full = el.dataset.full;
    if (REDUCED) { el.textContent = full; return; }
    el.textContent = "";
    el.classList.add("is-typing");
    let i = 0;
    const step = () => {
      i += 2; // two chars per frame-ish tick keeps ~1.5s total, not sluggish
      el.textContent = full.slice(0, i);
      if (i < full.length) {
        setTimeout(step, 12);
      } else {
        el.textContent = full;
        el.classList.remove("is-typing");
      }
    };
    setTimeout(step, 12);
  }

  /* ---------------------------------------------------------------------
     REVEAL SWEEP — rAF-throttled scroll check, not IntersectionObserver
     (How to Animate a Page Without Breaking It, Rule 2: IO can be
     outrun by a fast scroll; a position check on scroll cannot).
     ------------------------------------------------------------------- */
  function setupReveal() {
    const els = [...document.querySelectorAll("[data-enter]")];
    els.forEach((el, i) => el.style.setProperty("--i", i % 6));

    let pending = els.slice();
    let queued = false;

    function reveal(el) {
      el.classList.add("in");
      const kind = el.dataset.enter;

      if (kind === "count") {
        el.querySelectorAll("[data-count]").forEach(countUp);
      }
      if (kind === "grid") {
        el.querySelectorAll(".heat-cell").forEach((cell, ci) => {
          setTimeout(() => cell.classList.add("is-shown"), REDUCED ? 0 : ci * 1.1);
        });
      }
      if (kind === "type") {
        const t = document.getElementById("limitationText");
        if (t) typeLimitation(t);
      }
    }

    function sweep() {
      queued = false;
      const line = window.innerHeight * 0.9;
      for (let i = pending.length - 1; i >= 0; i--) {
        if (pending[i].getBoundingClientRect().top < line) {
          reveal(pending[i]);
          pending.splice(i, 1);
        }
      }
      if (!pending.length) window.removeEventListener("scroll", ping);
    }
    const ping = () => { if (!queued) { queued = true; requestAnimationFrame(sweep); } };

    if (REDUCED) {
      els.forEach(reveal);
      return;
    }
    window.addEventListener("scroll", ping, { passive: true });
    sweep();
  }

  /* ---------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------- */
  function init() {
    buildIntervalChart();
    buildAccuracyChart();
    buildHeatChart();
    buildCapDots();
    updateDaySelectorUI(DEFAULT_DAY);
    updateScoreBars(DEFAULT_DAY);

    // the hero compass "boots" from zero to the default day's reading — the
    // same settle mechanic reused as a one-shot power-on, not a special case.
    render();
    updateReadouts();
    goToDay(DEFAULT_DAY, { instant: REDUCED });

    setupReveal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
