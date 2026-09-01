/* ===========================================================
   Fathom — swell-b
   The object: a graduated glass tide gauge. Selecting a day
   is the only thing that moves the water — nothing loops.
   =========================================================== */
(() => {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- sample forecast data (invented for the demo; the
  // brief's own numbers — 1,840 / 7 / 15 / 4 / ±4 / 23,400 / 61 —
  // are used verbatim elsewhere and never altered here) ----------
  const DAYS = [
    { label: "TODAY", tide: 0.6, swim: 82, dive: 74, fish: 55 },
    { label: "TUE",   tide: 0.9, swim: 68, dive: 60, fish: 62 },
    { label: "WED",   tide: 1.3, swim: 41, dive: 38, fish: 70 },
    { label: "THU",   tide: 1.6, swim: 22, dive: 18, fish: 75 },
    { label: "FRI",   tide: 1.1, swim: 55, dive: 50, fish: 65 },
    { label: "SAT",   tide: 0.7, swim: 78, dive: 70, fish: 58 },
    { label: "SUN",   tide: 0.4, swim: 91, dive: 85, fish: 48 },
  ];

  const MAX_TIDE = 2.0;
  const G_TOP = 60;     // y for 2.0m / score 100
  const G_BOTTOM = 460; // y for 0m   / score 0
  const G_RANGE = G_BOTTOM - G_TOP;

  const statusOf = (score) => (score >= 70 ? "go" : score >= 40 ? "caution" : "stop");
  const statusWord = { go: "Go", caution: "Caution", stop: "Don't" };

  // ---------- tween helper: rAF, no CSS transition on SVG attrs ----------
  function tween(duration, easeFn, onFrame, onDone) {
    if (REDUCED) { onFrame(1); if (onDone) onDone(); return; }
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      onFrame(easeFn(t));
      if (t < 1) requestAnimationFrame(step);
      else if (onDone) onDone();
    }
    requestAnimationFrame(step);
  }
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- elements ----------
  const gauge = document.getElementById("gauge");
  const ticksGroup = document.getElementById("ticks");
  const waterFill = document.getElementById("waterFill");
  const meniscus = document.getElementById("meniscus");
  const rippleWide = document.getElementById("rippleWide");
  const rippleCrisp = document.getElementById("rippleCrisp");
  const dayTabsWrap = document.querySelector(".day-tabs");

  const flags = {
    swim: { el: document.getElementById("flagSwim"), x: 248 },
    dive: { el: document.getElementById("flagDive"), x: 266 },
    fish: { el: document.getElementById("flagFish"), x: 284 },
  };

  const scoreEls = {
    swim: { v: document.getElementById("v-swim"), s: document.getElementById("s-swim") },
    dive: { v: document.getElementById("v-dive"), s: document.getElementById("s-dive") },
    fish: { v: document.getElementById("v-fish"), s: document.getElementById("s-fish") },
  };

  const flagColor = { go: "var(--sig-go)", caution: "var(--sig-caution)", stop: "var(--sig-stop)" };

  // ---------- build graduation ticks (0 to 2.0m, every 0.2, labelled every 0.5) ----------
  function buildTicks() {
    ticksGroup.innerHTML = "";
    for (let i = 0; i <= 10; i++) {
      const m = i * 0.2;
      const y = G_BOTTOM - (m / MAX_TIDE) * G_RANGE;
      const major = Math.abs((m * 2) % 1) < 0.001; // every 0.5m
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", "108");
      line.setAttribute("y1", y);
      line.setAttribute("x2", major ? "120" : "115");
      line.setAttribute("y2", y);
      line.setAttribute("stroke", major ? "rgba(238,243,241,.75)" : "rgba(238,243,241,.3)");
      line.setAttribute("stroke-width", major ? "1.5" : "1");
      ticksGroup.appendChild(line);
      if (major) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", m === 0 ? "34" : "26");
        text.setAttribute("y", y + 4);
        text.textContent = m.toFixed(1) + "m";
        ticksGroup.appendChild(text);
      }
    }
  }

  // ---------- build day tabs ----------
  function buildDayTabs() {
    dayTabsWrap.innerHTML = "";
    DAYS.forEach((d, i) => {
      const btn = document.createElement("button");
      btn.className = "day-tab" + (i === 0 ? " is-active" : "");
      btn.type = "button";
      btn.role = "tab";
      btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
      btn.dataset.day = i;
      const overall = statusOf(Math.round((d.swim + d.dive + d.fish) / 3));
      btn.innerHTML = `<span class="day-label">${d.label}</span><i class="day-dot ${overall}" aria-hidden="true"></i>`;
      btn.addEventListener("click", () => selectDay(i));
      dayTabsWrap.appendChild(btn);
    });
  }

  // ---------- position + colour a flag ----------
  function placeFlag(key, score, animate) {
    const f = flags[key];
    const targetY = G_BOTTOM - (score / 100) * G_RANGE - 5;
    const path = f.el.querySelector("path");
    const from = f._y ?? targetY;
    tween(350, easeOutCubic, (t) => {
      const y = lerp(from, targetY, t);
      f.el.setAttribute("transform", `translate(${f.x},${y})`);
    }, () => { f._y = targetY; });
    path.setAttribute("fill", flagColor[statusOf(score)]);
  }

  // ---------- the main state change: select a day ----------
  let current = 0;
  function selectDay(i) {
    if (i === current && gauge.dataset.ready) return;
    current = i;
    const d = DAYS[i];

    [...dayTabsWrap.children].forEach((btn, idx) => {
      btn.classList.toggle("is-active", idx === i);
      btn.setAttribute("aria-selected", idx === i ? "true" : "false");
    });

    // water level travels to the new tide height
    const targetY = G_BOTTOM - (d.tide / MAX_TIDE) * G_RANGE;
    const fromY = parseFloat(waterFill.getAttribute("y")) || G_BOTTOM;
    tween(REDUCED ? 1 : 450, easeOutCubic, (t) => {
      const y = lerp(fromY, targetY, t);
      waterFill.setAttribute("y", y);
      waterFill.setAttribute("height", Math.max(0, G_BOTTOM - y));
      meniscus.setAttribute("cy", y);
      rippleWide.setAttribute("d", `M154 ${y} Q188 ${y - 8} 222 ${y}`);
      rippleCrisp.setAttribute("d", `M156 ${y} Q188 ${y - 6} 220 ${y}`);
    }, () => flashRipple());

    // the three flags travel to their new scores
    placeFlag("swim", d.swim);
    placeFlag("dive", d.dive);
    placeFlag("fish", d.fish);

    // captions update with the object
    ["swim", "dive", "fish"].forEach((key) => {
      const score = d[key];
      const st = statusOf(score);
      scoreEls[key].v.textContent = score;
      scoreEls[key].s.textContent = statusWord[st];
      scoreEls[key].s.className = "score-status " + st;
    });

    gauge.dataset.ready = "1";
  }

  // one-shot flash on the meniscus highlight — the visible "reaction"
  function flashRipple() {
    if (REDUCED) return;
    rippleWide.style.opacity = ".55";
    rippleCrisp.style.opacity = "1";
    tween(400, (t) => t, (t) => {
      rippleWide.style.opacity = String(0.55 - 0.27 * t);
      rippleCrisp.style.opacity = String(1 - 0.1 * t);
    });
  }

  // ---------- count-up for data-count plates ----------
  function countUp(el) {
    const target = +el.dataset.count;
    if (REDUCED) { el.textContent = target.toLocaleString(); return; }
    tween(650, easeOutCubic, (t) => {
      el.textContent = Math.round(lerp(0, target, t)).toLocaleString();
    });
  }

  // ---------- rAF sweep reveal (never IntersectionObserver — see
  // "How to Animate a Page Without Breaking It": IO can be outrun) ----------
  function initSweep() {
    const pending = [...document.querySelectorAll("[data-reveal]")].filter(
      (el) => !el.closest(".hero") // hero runs its own one-time sequence on load
    );
    if (!pending.length) return;
    let queued = false;
    function sweep() {
      queued = false;
      const line = window.innerHeight * 0.92;
      for (let i = pending.length - 1; i >= 0; i--) {
        const el = pending[i];
        if (el.getBoundingClientRect().top < line) {
          el.classList.add("in");
          if (el.dataset.count !== undefined) countUp(el);
          el.querySelectorAll("[data-count]").forEach(countUp);
          if (el.classList.contains("limitation-chart") && !donutBig._drawn) drawDonut();
          pending.splice(i, 1);
        }
      }
      if (!pending.length) window.removeEventListener("scroll", ping);
    }
    const ping = () => { if (!queued) { queued = true; requestAnimationFrame(sweep); } };
    window.addEventListener("scroll", ping, { passive: true });
    sweep();
  }

  const donutBig = document.getElementById("donutBig");
  const donutSmall = document.getElementById("donutSmall");
  function drawDonut() {
    donutBig._drawn = true;
    const circumference = 2 * Math.PI * 46; // r=46
    const target = circumference * (1 - 61 / 365);
    tween(REDUCED ? 1 : 550, easeOutCubic, (t) => {
      donutBig.setAttribute("stroke-dashoffset", lerp(circumference, target, t));
    });
  }

  // ---------- hero entrance: the gauge's own sequence, once ----------
  function heroEntrance() {
    document.querySelectorAll(".hero [data-reveal]").forEach((el) => el.classList.add("in"));
    document.querySelectorAll(".line[data-clip]").forEach((el, i) => {
      setTimeout(() => el.classList.add("in"), REDUCED ? 0 : i * 90);
    });
    // ticks appear stroke by stroke, like a tape drawn out
    [...ticksGroup.children].forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transition = REDUCED ? "none" : `opacity .18s linear ${i * 14}ms`;
      requestAnimationFrame(() => { el.style.opacity = "1"; });
    });
    setTimeout(() => selectDay(0), REDUCED ? 0 : 260);
  }

  // ---------- boot ----------
  document.addEventListener("DOMContentLoaded", () => {
    if (!REDUCED) document.documentElement.classList.add("motion");
    buildTicks();
    buildDayTabs();
    heroEntrance();
    initSweep();

    // small honest touch: donut in the numbers plate mirrors the same ratio
    if (donutSmall) {
      const c = 2 * Math.PI * 15;
      donutSmall.setAttribute("stroke-dasharray", c.toFixed(1));
      donutSmall.setAttribute("stroke-dashoffset", (c * (1 - 61 / 365)).toFixed(1));
    }
  });
})();
