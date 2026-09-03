(() => {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const out = (name) => $$(`[data-out="${name}"]`);

  /* ── 1 · LIVE READOUT ───────────────────────────────────────────────
     CORE.on fires every animation frame while the core is moving, so each
     field remembers its last printed value and only writes when it changes.
     Digits are tabular in the stylesheet, so nothing shifts as they count. */
  const fields = {
    depth: out("depth").concat(out("depth2")),
    age:   out("age").concat(out("age2")),
    pitch: out("pitch"),
    bub:   out("bub"),
    pct:   out("pct"),
  };
  const last = {};
  const write = (key, text) => {
    if (last[key] === text) return;
    last[key] = text;
    for (const el of fields[key]) el.textContent = text;
  };

  const fill  = $('[data-out="fill"]');
  const thumb = $('[data-out="thumb"]');
  let lastPos = -1;

  /* Declared BEFORE CORE.on: on() invokes its callback synchronously, so a
     `const` further down the file is still in the temporal dead zone when the
     first frame runs and the whole readout dies with a ReferenceError. */
  const stops = $$(".stop");

  if (window.CORE) {
    CORE.on((d, a, t) => {
      write("depth", d.toLocaleString("en-AU"));
      write("age",   a.toLocaleString("en-AU"));

      /* Layer pitch is derived from the shader's OWN constant: its band
         frequency runs 26 -> 190 across the core, so the spacing between
         annual layers is inversely proportional to it. 380 mm at the
         surface, ~52 mm at the bottom. The number on screen and the bands
         behind it are therefore the same fact, not two guesses. */
      write("pitch", String(Math.round(380 * 26 / (26 + 164 * t))));
      write("bub",   String(Math.round((1 - t) * 100)));
      write("pct",   String(Math.round(t * 100)));

      const pos = +(t * 100).toFixed(1);
      if (pos !== lastPos) {
        lastPos = pos;
        if (fill)  fill.style.width = pos + "%";
        if (thumb) thumb.style.left = pos + "%";
      }
      for (const b of stops) {
        const on = Math.abs(+b.dataset.depth / CORE.MAXD - t) < 0.004;
        if ((b.getAttribute("aria-current") === "true") !== on)
          b.setAttribute("aria-current", on ? "true" : "false");
      }
    });
  }

  /* ── 2 · DEPTH STOPS ────────────────────────────────────────────────── */
  for (const b of stops) {
    b.addEventListener("click", () => {
      if (window.CORE) CORE.set(+b.dataset.depth / CORE.MAXD);
    });
  }

  /* ── 3 · DISCLOSURE (shared by the nav panel and the FAQ) ────────────
     grid-template-rows 0fr -> 1fr. On close the row collapses FIRST and the
     element is only hidden once the transition has actually ended, so the
     content never disappears out from under the animation. */
  function collapse(el, wrap, done) {
    if (REDUCED) { done(); return; }
    let fired = false;
    const finish = () => {
      if (fired) return;
      fired = true;
      wrap.removeEventListener("transitionend", onEnd);
      clearTimeout(timer);
      done();
    };
    const onEnd = (e) => { if (e.propertyName === "grid-template-rows") finish(); };
    wrap.addEventListener("transitionend", onEnd);
    const timer = setTimeout(finish, 600);   // transitionend can be skipped
  }

  /* ── 4 · FAQ ────────────────────────────────────────────────────────── */
  for (const d of $$("details.q")) {
    const sum = $("summary", d);
    const wrap = $(".qwrap", d);
    sum.addEventListener("click", (e) => {
      e.preventDefault();
      if (d.open) {
        d.classList.remove("is-open");
        collapse(d, wrap, () => { d.open = false; });
      } else {
        d.open = true;
        if (REDUCED) d.classList.add("is-open");
        else requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("is-open")));
      }
    });
  }

  /* ── 5 · PHONE NAV ──────────────────────────────────────────────────── */
  const toggle = $("#nav-toggle");
  const panel  = $("#nav-panel");
  function closeNav() {
    if (!toggle || toggle.getAttribute("aria-expanded") !== "true") return;
    toggle.setAttribute("aria-expanded", "false");
    panel.classList.remove("is-open");
    panel.classList.add("is-closing");
    collapse(panel, panel, () => { panel.hidden = true; panel.classList.remove("is-closing"); });
  }
  function openNav() {
    toggle.setAttribute("aria-expanded", "true");
    panel.hidden = false;
    if (REDUCED) panel.classList.add("is-open");
    else requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add("is-open")));
  }
  if (toggle && panel) {
    toggle.addEventListener("click", () => {
      toggle.getAttribute("aria-expanded") === "true" ? closeNav() : openNav();
    });
    for (const a of $$("a", panel)) a.addEventListener("click", closeNav);
    addEventListener("keydown", (e) => { if (e.key === "Escape") closeNav(); });
  }

  /* ── 6 · MODAL — grows out of the button that opened it ──────────────
     Measure both rectangles, express the button as a transform of the panel,
     start there and release to identity. No fixed "scale from 0.9" guess. */
  const scrim  = $("#scrim");
  const holder = $("#holder");
  const sheet  = $("#sheet");
  const openBtn = $("#open-req");
  let opener = null;

  const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

  function openSheet(from) {
    opener = from;
    holder.hidden = false;
    scrim.hidden = false;

    const b = from.getBoundingClientRect();
    const s = sheet.getBoundingClientRect();
    const sx = Math.max(b.width  / s.width,  0.08);
    const sy = Math.max(b.height / s.height, 0.08);
    const dx = (b.left + b.width  / 2) - (s.left + s.width  / 2);
    const dy = (b.top  + b.height / 2) - (s.top  + s.height / 2);

    if (!REDUCED) {
      sheet.style.transition = "none";
      sheet.style.transform  = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      sheet.style.opacity    = "0";
      void sheet.offsetWidth;               // commit the start state
      sheet.style.transition = "";
    }
    requestAnimationFrame(() => {
      scrim.classList.add("is-open");
      sheet.style.transform = "translate(0px, 0px) scale(1, 1)";
      sheet.style.opacity   = "1";
    });

    document.documentElement.style.overflow = "hidden";
    ($(FOCUSABLE, sheet) || sheet).focus({ preventScroll: true });
  }

  function closeSheet() {
    if (holder.hidden) return;
    const b = opener ? opener.getBoundingClientRect() : null;
    const s = sheet.getBoundingClientRect();
    scrim.classList.remove("is-open");
    if (b && !REDUCED) {
      const sx = Math.max(b.width / s.width, 0.08), sy = Math.max(b.height / s.height, 0.08);
      sheet.style.transform =
        `translate(${(b.left + b.width / 2) - (s.left + s.width / 2)}px, ` +
        `${(b.top + b.height / 2) - (s.top + s.height / 2)}px) scale(${sx}, ${sy})`;
    }
    sheet.style.opacity = "0";

    const done = () => {
      holder.hidden = true;
      scrim.hidden  = true;
      sheet.style.transition = "none";
      sheet.style.transform  = "";
      void sheet.offsetWidth;
      sheet.style.transition = "";
      document.documentElement.style.overflow = "";
      if (opener) { opener.focus({ preventScroll: true }); opener = null; }
    };
    REDUCED ? done() : setTimeout(done, 340);
  }

  if (openBtn) openBtn.addEventListener("click", () => openSheet(openBtn));
  if (scrim)   scrim.addEventListener("click", closeSheet);
  const sheetX = $("#sheet-x");
  if (sheetX)  sheetX.addEventListener("click", closeSheet);
  const sheetGo = $("#sheet-go");
  if (sheetGo) sheetGo.addEventListener("click", closeSheet);

  addEventListener("keydown", (e) => {
    if (holder.hidden) return;
    if (e.key === "Escape") { closeSheet(); return; }
    if (e.key !== "Tab") return;
    const items = $$(FOCUSABLE, sheet).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], lastEl = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { lastEl.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { first.focus(); e.preventDefault(); }
  });

  /* ── 7 · WHERE AM I — the bar marks the section in view ──────────────
     A throttled scroll read rather than an IntersectionObserver: the sections
     here are full-width bands with no threshold worth observing, and one
     rAF-gated pass costs less than eight observer entries. */
  const marks = $$(".bar-nav a");
  const targets = marks.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  let queued = false;
  function sweep() {
    queued = false;
    const line = innerHeight * 0.32;
    let active = -1;
    targets.forEach((sec, i) => { if (sec.getBoundingClientRect().top <= line) active = i; });
    marks.forEach((a, i) => a.style.color = i === active ? "var(--ice)" : "");
  }
  addEventListener("scroll", () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sweep);
  }, { passive: true });
  sweep();
})();
