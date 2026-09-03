(() => {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!REDUCED) document.documentElement.classList.add("motion");
  const MOTION = document.documentElement.classList.contains("motion");

  /* ---------------------------------------------------------
     Score data — swim / dive / fish, 7 days each. Illustrative
     example content for one spot; the brief's fixed numbers
     live only in the numbers band below.
  --------------------------------------------------------- */
  const DAYS = ["Today", "Tomorrow", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const SCORES = {
    swim: [82, 75, 40, 55, 90, 68, 88],
    dive: [64, 70, 35, 60, 80, 50, 72],
    fish: [91, 60, 45, 66, 77, 85, 58],
  };
  const REASONS = {
    swim: "Low chop, slack tide near 7am",
    dive: "Vis dropping, moderate groundswell",
    fish: "Light wind, tide turning at dawn",
  };
  const bandWord = (s) => (s >= 75 ? "Calm" : s >= 45 ? "Marginal" : "Rough");
  const bandClass = (s) => (s >= 75 ? "b-good" : s >= 45 ? "b-mid" : "b-low");
  const bandColor = (s) => (s >= 75 ? "#0FB88A" : s >= 45 ? "#C68A2E" : "#B2543D");
  const barHeight = (s) => (6 + (s / 100) * 46).toFixed(1);

  let activeActivity = "swim";

  /* ---------------------------------------------------------
     Smooth scroll — every [data-scroll] button, keyboard-safe
     because it's a real <button>.
  --------------------------------------------------------- */
  document.querySelectorAll("[data-scroll]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sel = btn.getAttribute("data-scroll");
      const behavior = MOTION ? "smooth" : "auto";
      if (sel === "#") { scrollTo({ top: 0, behavior }); return; }
      const target = document.querySelector(sel);
      if (target) target.scrollIntoView({ behavior, block: "start" });
      document.querySelectorAll(".nav-pill").forEach((p) => p.classList.remove("is-active"));
      if (btn.classList.contains("nav-pill")) btn.classList.add("is-active");
    });
  });

  /* ---------------------------------------------------------
     Activity toggle — a real state change, drives the forecast
     strip, the active score card, and the mobile sheet readout.
  --------------------------------------------------------- */
  const toggleBtns = document.querySelectorAll(".activity-btn");
  toggleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const act = btn.getAttribute("data-activity");
      if (act === activeActivity) return;
      activeActivity = act;
      toggleBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      document.querySelectorAll(".score-card").forEach((c) => {
        c.classList.toggle("is-active", c.getAttribute("data-score-card") === act);
      });
      renderForecast(act, { animate: true });
      const sheetScore = document.getElementById("sheetScore");
      if (sheetScore) sheetScore.textContent = `${SCORES[act][0]} · ${bandWord(SCORES[act][0])}`;
      const sheetLabel = document.querySelector(".mobile-sheet-label");
      if (sheetLabel) sheetLabel.textContent = `Today · ${btn.textContent}`;
      const sub = document.getElementById("forecastSub");
      if (sub) sub.textContent = `${btn.textContent} score, one bar per day — tap another activity above to switch it`;
    });
  });

  function renderForecast(activity, { animate = false } = {}) {
    const row = document.getElementById("forecastRow");
    if (!row) return;
    const chips = row.querySelectorAll(".day-chip");
    const arr = SCORES[activity];
    chips.forEach((chip, i) => {
      const s = arr[i];
      const bar = chip.querySelector(".forecast-bar");
      const scoreEl = chip.querySelector(".day-score");
      if (bar) {
        bar.style.height = barHeight(s) + "px";
        bar.style.background = bandColor(s);
      }
      if (scoreEl) scoreEl.textContent = s;
    });
  }

  /* ---------------------------------------------------------
     Content, always — regardless of motion or reduced-motion.
     buildFlapFigure only WRITES the correct final characters
     into the DOM; it never depends on the scramble running.
     Do this unconditionally so a reduced-motion visitor (or a
     JS failure partway through) never sees an empty stat.
  --------------------------------------------------------- */
  document.querySelectorAll(".stat-figure").forEach(buildFlapFigure);

  /* ---------------------------------------------------------
     Rule 2 — rAF-throttled scroll sweep, not IntersectionObserver.
     Cannot be outrun by a fast scroll or an anchor jump.
  --------------------------------------------------------- */
  const pending = MOTION ? [...document.querySelectorAll("[data-rise], [data-rise-slow]")] : [];
  let queued = false;

  function sweep() {
    queued = false;
    const line = innerHeight * 0.94;
    for (let i = pending.length - 1; i >= 0; i--) {
      const el = pending[i];
      if (el.getBoundingClientRect().top < line) {
        el.classList.add("in");
        const kind = el.getAttribute("data-reveal");
        if (kind) dispatchReveal(kind, el);
        pending.splice(i, 1);
      }
    }
    if (!pending.length) removeEventListener("scroll", ping);
  }
  const ping = () => { if (!queued) { queued = true; requestAnimationFrame(sweep); } };
  if (MOTION) {
    addEventListener("scroll", ping, { passive: true });
    sweep(); // catch whatever is above the fold on load
  }

  /* ---------------------------------------------------------
     Per-section reveal effects — variety, not one fade-up.
  --------------------------------------------------------- */
  function dispatchReveal(kind, el) {
    if (kind === "scores") revealScores(el);
    if (kind === "forecast") revealForecastBars(el);
    if (kind === "numbers") revealNumbers(el);
  }

  function revealScores(container) {
    const rings = container.querySelectorAll(".score-ring-val");
    rings.forEach((ring, i) => {
      const final = ring.getAttribute("data-final");
      setTimeout(() => {
        ring.style.transition = "none";
        ring.setAttribute("stroke-dashoffset", "201.1"); // fully hidden
        void ring.getBoundingClientRect();
        ring.style.transition = "";
        ring.setAttribute("stroke-dashoffset", final); // grow to score
      }, i * 90);
    });
  }

  function revealForecastBars(container) {
    const bars = container.querySelectorAll(".forecast-bar");
    bars.forEach((bar, i) => {
      setTimeout(() => bar.classList.add("in"), i * 45);
    });
  }

  function revealNumbers(container) {
    // figures are already built (see the unconditional call above) —
    // this only plays the scramble-in flourish on top of them.
    const figures = container.querySelectorAll(".stat-figure");
    figures.forEach((fig, fi) => setTimeout(() => scrambleFigure(fig), fi * 90));
    const fills = container.querySelectorAll(".ratio-bar-fill");
    fills.forEach((f, i) => setTimeout(() => f.classList.add("in"), i * 70));
  }

  /* ---------------------------------------------------------
     Flap-tile digit resolve — the mechanism from template 13
     (::before/::after pseudo tile, 5% squash = the click),
     ordered digit walk (not random), reskinned for light stock:
     the light layer sits BELOW the glyph (z-index 1, not 5),
     the glyph is its own stacked span (z-index 2), the seam
     stays on top (z-index 10). Final character is already the
     real DOM text — JS only re-plays the resolve on top of it.
  --------------------------------------------------------- */
  function buildFlapFigure(fig) {
    if (fig.dataset.built) return;
    fig.dataset.built = "1";
    const chars = fig.getAttribute("data-figure").split("");
    chars.forEach((ch) => {
      const isDigit = /[0-9]/.test(ch);
      const tile = document.createElement("span");
      tile.className = "flap-tile" + (isDigit ? "" : " wide");
      const glyph = document.createElement("span");
      glyph.className = "flap-glyph";
      glyph.textContent = ch;
      tile.appendChild(glyph);
      tile.dataset.target = ch;
      tile.dataset.digit = isDigit ? "1" : "0";
      fig.appendChild(tile);
    });
  }

  function scrambleFigure(fig) {
    const tiles = fig.querySelectorAll(".flap-tile");
    tiles.forEach((tile, i) => scrambleTile(tile, i * 70));
  }

  function scrambleTile(tile, delay) {
    const glyph = tile.querySelector(".flap-glyph");
    const target = tile.dataset.target;
    setTimeout(() => {
      if (tile.dataset.digit !== "1") {
        // punctuation / symbol tiles just settle with one click
        tile.classList.add("flipping");
        setTimeout(() => tile.classList.remove("flipping"), 25);
        return;
      }
      const targetN = parseInt(target, 10);
      const totalSteps = 10 + Math.floor(Math.random() * 6); // 10-15, ordered walk
      const start = (((targetN - totalSteps) % 10) + 10) % 10;
      let step = 0;
      const id = setInterval(() => {
        tile.classList.add("flipping");
        setTimeout(() => tile.classList.remove("flipping"), 25);
        const cur = (start + step) % 10;
        glyph.textContent = String(cur);
        step++;
        if (step > totalSteps) {
          clearInterval(id);
          glyph.textContent = target;
        }
      }, 45);
    }, delay);
  }

  /* ---------------------------------------------------------
     Tide curve — the path is already drawn statically in the
     markup (real computed points, works with zero JS). Under
     motion we play a one-shot stroke draw-in on load only.
  --------------------------------------------------------- */
  if (MOTION) {
    const line = document.getElementById("tideLine");
    if (line && line.getTotalLength) {
      const len = line.getTotalLength();
      line.style.strokeDasharray = String(len);
      line.style.strokeDashoffset = String(len);
      line.style.transition = "stroke-dashoffset .7s cubic-bezier(.4,0,.2,1)";
      requestAnimationFrame(() => requestAnimationFrame(() => {
        line.style.strokeDashoffset = "0";
      }));
    }
  }
})();
