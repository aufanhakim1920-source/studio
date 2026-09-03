(() => {
  "use strict";

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const MAXD = 3270, MAXA = 1200000, EXP = 1.7;
  const DEN  = Math.pow(MAXD, EXP);

  /* age at a depth, in years — identical to core.js */
  const ageAt = (d) => Math.round(Math.pow(d / MAXD, EXP) * MAXA);

  /* annual layer thickness in mm/yr — the derivative of that law.
     dAge/dDepth = EXP * MAXA * d^(EXP-1) / MAXD^EXP  (years per metre) */
  const layerAt = (d) => {
    const dd = Math.max(d, 1);
    const yrPerM = (EXP * MAXA * Math.pow(dd, EXP - 1)) / DEN;
    return Math.min(1000 / yrPerM, 250);
  };

  /* ── formatting: fixed-width, catalogue style ────────────────────── */
  const grp = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  const fmtAge = (y) => {
    if (y >= 1e6) return (y / 1e6).toFixed(2) + " Ma";
    if (y >= 1e5) return Math.round(y / 1e3) + " ka";
    if (y >= 1e3) return (y / 1e3).toFixed(1) + " ka";
    return Math.round(y) + " yr";
  };
  const fmtLayer = (mm) => (mm >= 100 ? mm.toFixed(0) : mm.toFixed(mm >= 10 ? 1 : 2));

  /* ── THE HOLDINGS ────────────────────────────────────────────────── */
  const ST = { V: "IN VAULT", L: "ON LOAN", A: "IN ANALYSIS" };
  const AB = { "IN VAULT": "VLT", "ON LOAN": "LN", "IN ANALYSIS": "ANL" };

  const CORES = [
    { id: "KCL-0001", site: "KIRKWOOD DOME",   d: 3270, st: ST.V, drilled: "1994–2001", sec: 3270, bt: -57.2,
      note: "The deepest hole on the shelf and the reason the library exists. Basal forty metres are folded; nothing below 3 214 m carries a chronology anyone will sign." },
    { id: "KCL-0018", site: "AURORA SADDLE",   d: 2840, st: ST.L, drilled: "2003–2006", sec: 2840, bt: -54.8,
      note: "On loan to a deuterium-excess programme until March. Two hundred sections out, archive half retained here as always." },
    { id: "KCL-0042", site: "COLBECK SPUR",    d: 2115, st: ST.V, drilled: "2009–2011", sec: 2115, bt: -51.6,
      note: "Cut once, in 2013, for a dust study. The committee has refused every request since; the record is intact and it is staying that way." },
    { id: "KCL-0107", site: "HAWSER GLACIER",  d: 1660, st: ST.A, drilled: "2014",      sec: 1660, bt: -49.3,
      note: "In the cold laboratory downstairs. Continuous-flow analysis, 6 cm/min, running through winter." },
    { id: "KCL-0233", site: "PENITENTE FIELD", d: 1204, st: ST.V, drilled: "2016",      sec: 1204, bt: -47.9,
      note: "Bubble-to-clathrate transition sits inside this core, near 1 150 m. Requests for that interval are heavily oversubscribed." },
    { id: "KCL-0361", site: "DUNNAGE BASIN",   d:  880, st: ST.V, drilled: "2017",      sec:  880, bt: -45.1,
      note: "Two volcanic horizons, both tied to dated eruptions. It is the tie-point core for everything drilled after it." },
    { id: "KCL-0574", site: "TALLOW RIDGE",    d:  612, st: ST.L, drilled: "2019",      sec:  612, bt: -41.7,
      note: "Out to a sea-salt aerosol group. Due back before the December resupply; the shelf space is already allocated." },
    { id: "KCL-0890", site: "BELLINGER FLAT",  d:  418, st: ST.V, drilled: "2021",      sec:  418, bt: -38.4,
      note: "Shallow, high accumulation, and annually resolved the whole way down. The core we hand to visiting students." },
    { id: "KCL-1206", site: "MARRAWAH SHELF",  d:  240, st: ST.A, drilled: "2023",      sec:  240, bt: -33.0,
      note: "Being logged for black carbon. Every year since 1785 is countable by eye under raking light." },
    { id: "KCL-1788", site: "SOUNDING BAY",    d:   96, st: ST.V, drilled: "2025",      sec:   96, bt: -29.6,
      note: "The newest core in the building, and the only one whose top metre fell as snow within living memory." },
  ];

  /* ══ 1 · RENDER THE SPECIMEN INDEX ═══════════════════════════════ */
  const tbody = $("#tbody");

  CORES.forEach((c) => {
    const tr = document.createElement("tr");
    tr.dataset.id = c.id;
    tr.dataset.st = c.st;
    tr.innerHTML =
      '<td class="c-flag" aria-hidden="true"></td>' +
      '<td class="c-id"><button class="idbtn" type="button" aria-haspopup="dialog">' +
        c.id + '<span class="c-site-m">' + c.site + "</span></button></td>" +
      '<td class="c-site">' + c.site + "</td>" +
      '<td class="num">' + grp(c.d) + "</td>" +
      '<td class="num">' + fmtAge(ageAt(c.d)) + "</td>" +
      '<td class="c-lay num">' + fmtLayer(layerAt(c.d)) + "</td>" +
      '<td class="c-st"><i class="dot" aria-hidden="true"></i>' +
        '<span class="full">' + c.st + '</span><span class="abbr">' + AB[c.st] + "</span></td>";
    tr.querySelector(".idbtn").setAttribute(
      "aria-label", "Open record " + c.id + ", " + c.site + ", " + c.d + " metres"
    );
    tr._d = c.d;
    tr._c = c;
    tbody.appendChild(tr);
  });

  /* ── filter: the table re-queries rather than snapping ───────────── */
  const filter = $("#filter"), rowcount = $("#rowcount"), qstate = $("#qstate");
  let queryTimer = 0;

  filter.addEventListener("change", () => {
    const want = filter.value;
    clearTimeout(queryTimer);
    tbody.classList.add("requery");
    qstate.textContent = "QUERY…";
    queryTimer = setTimeout(() => {
      let n = 0;
      $$("tr", tbody).forEach((tr) => {
        const show = want === "ALL" || tr.dataset.st === want;
        tr.style.display = show ? "" : "none";
        if (show) n++;
      });
      rowcount.textContent = n;
      qstate.textContent = "READY";
      tbody.classList.remove("requery");
    }, REDUCED ? 0 : 170);
  });

  /* ══ 2 · THE LIVE READOUT STRIP ══════════════════════════════════ */
  const rDepth = $("#r-depth"), rAge = $("#r-age"), rLayer = $("#r-layer"),
        rPhase = $("#r-phase"), mark = $("#mark");
  const rows = $$("tr", tbody);
  let lastHere = null;

  const put = (el, v) => { if (el.textContent !== v) el.textContent = v; };

  window.CORE.on((depth, age, t) => {
    put(rDepth, grp(depth));
    put(rAge, depth === 0 ? "0" : fmtAge(age));
    put(rLayer, fmtLayer(layerAt(depth)));
    put(rPhase, depth < 1150 ? "BUBBLE ICE" : "CLATHRATE");
    mark.style.left = (t * 100).toFixed(3) + "%";

    /* which held core are you standing inside? only rows the filter left visible */
    let best = null, bd = Infinity;
    for (const tr of rows) {
      if (tr.style.display === "none") continue;
      const gap = Math.abs(tr._d - depth);
      if (gap < bd) { bd = gap; best = tr; }
    }
    if (!best) {
      if (lastHere) { lastHere.classList.remove("here"); lastHere.cells[0].textContent = ""; lastHere = null; }
      return;
    }
    if (best !== lastHere) {
      if (lastHere) { lastHere.classList.remove("here"); lastHere.cells[0].textContent = ""; }
      best.classList.add("here");
      best.cells[0].textContent = "▶";
      lastHere = best;
    }
  });

  /* ══ 3 · CORE RECORD — grows out of the row it came from ═════════ */
  const scrim = $("#scrim"), panel = $("#panel"),
        pId = $("#p-id"), pSpec = $("#p-spec"), pNote = $("#p-note"),
        pBar = $("#p-bar"), pClose = $("#p-close"), pCta = $("#p-cta");
  let lastFocus = null, openId = null, closingTimer = 0;

  const specRow = (k, v) => "<div><dt>" + k + "</dt><dd>" + v + "</dd></div>";

  function fill(c) {
    const age = ageAt(c.d);
    pId.textContent = c.id;
    pSpec.innerHTML =
      specRow("SITE", c.site) +
      specRow("DRILLED", c.drilled) +
      specRow("DEPTH", grp(c.d) + " m") +
      specRow("BASAL AGE", grp(age) + " yr &nbsp;<span class='dim'>" + fmtAge(age) + "</span>") +
      specRow("LAYER AT BASE", fmtLayer(layerAt(c.d)) + " mm/yr") +
      specRow("ICE PHASE", c.d < 1150 ? "Bubble ice" : "Clathrate below 1 150 m") +
      specRow("SECTIONS", grp(c.sec) + " &times; 1 m") +
      /* U+2212, the same minus the rest of the record uses */
      specRow("BOREHOLE TEMP", c.bt.toFixed(1).replace("-", "−") + " °C") +
      specRow("HELD AT", "−55 °C, Hobart, Tasmania") +
      specRow("STATUS", c.st);
    pNote.textContent = c.note;
    pBar.style.width = ((c.d / MAXD) * 100).toFixed(2) + "%";
    pCta.setAttribute("aria-label", "Request section from " + c.id);
  }

  function open(c, origin, focusBack) {
    clearTimeout(closingTimer);
    openId = c.id;
    lastFocus = focusBack || document.activeElement;
    fill(c);

    scrim.classList.add("on");
    scrim.setAttribute("aria-hidden", "false");

    if (REDUCED) { scrim.classList.add("shown"); pClose.focus(); return; }

    /* FLIP: measure where the panel WILL be, then start it on the row */
    panel.style.transition = "none";
    panel.style.transform = "none";
    const F = panel.getBoundingClientRect();
    const O = origin.getBoundingClientRect();
    panel.style.transformOrigin = "top left";
    panel.style.transform =
      "translate(" + (O.left - F.left) + "px," + (O.top - F.top) + "px) " +
      "scale(" + (O.width / F.width) + "," + (O.height / F.height) + ")";
    panel.getBoundingClientRect();                       // force the start state

    requestAnimationFrame(() => {
      panel.style.transition = "transform .46s cubic-bezier(.16,.86,.24,1)";
      panel.style.transform = "none";
      scrim.classList.add("shown");
      pClose.focus({ preventScroll: true });
    });
  }

  function close() {
    if (!openId) return;
    const origin = tbody.querySelector('tr[data-id="' + openId + '"]');
    openId = null;

    /* drop .on straight away so the scrim fades WHILE the panel shrinks back;
       resetting the transform after the fade is what stops the visible snap. */
    scrim.classList.remove("shown", "on");
    scrim.setAttribute("aria-hidden", "true");
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    lastFocus = null;

    const reset = () => { panel.style.transition = "none"; panel.style.transform = "none"; };
    const visible = origin && origin.style.display !== "none";
    if (REDUCED || !visible) { reset(); return; }

    const F = panel.getBoundingClientRect();
    const O = origin.getBoundingClientRect();
    panel.style.transition = "transform .27s cubic-bezier(.5,0,.9,.5)";
    panel.style.transform =
      "translate(" + (O.left - F.left) + "px," + (O.top - F.top) + "px) " +
      "scale(" + (O.width / F.width) + "," + (O.height / F.height) + ")";
    closingTimer = setTimeout(reset, 320);
  }

  tbody.addEventListener("click", (e) => {
    const tr = e.target.closest("tr");
    if (!tr || !tr._c) return;
    e.preventDefault();
    open(tr._c, tr, tr.querySelector(".idbtn"));
  });

  pClose.addEventListener("click", close);
  pCta.addEventListener("click", close);
  scrim.addEventListener("click", (e) => { if (e.target === scrim) close(); });

  addEventListener("keydown", (e) => {
    if (!openId) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    const f = $$('button,a[href],select,[tabindex]:not([tabindex="-1"])', panel)
      .filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ══ 4 · ACCESS ACCORDION — 0fr -> 1fr, [open] survives the close ═ */
  $$(".step").forEach((step) => {
    const head = $(".step-head", step);
    const body = $(".step-body", step);
    let timer = 0;

    const finish = () => {
      step.classList.remove("closing");
      step.removeAttribute("open");
    };

    body.addEventListener("transitionend", (e) => {
      if (e.propertyName !== "grid-template-rows" || e.target !== body) return;
      if (step.classList.contains("closing")) { clearTimeout(timer); finish(); }
    });

    head.addEventListener("click", () => {
      const isOpen = step.hasAttribute("open") && !step.classList.contains("closing");
      if (isOpen) {
        head.setAttribute("aria-expanded", "false");
        step.classList.add("closing");
        clearTimeout(timer);
        timer = setTimeout(finish, REDUCED ? 0 : 600);   /* safety net */
      } else {
        clearTimeout(timer);
        step.classList.remove("closing");
        step.setAttribute("open", "");
        head.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ══ 5 · PHONE MENU ══════════════════════════════════════════════ */
  const top = $("#top"), toggle = $("#navtoggle"), nav = $("#nav");
  toggle.addEventListener("click", () => {
    const on = top.classList.toggle("open");
    toggle.setAttribute("aria-expanded", on ? "true" : "false");
    toggle.textContent = on ? "CLOSE" : "MENU";
  });
  nav.addEventListener("click", (e) => {
    if (e.target.tagName !== "A") return;
    top.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "MENU";
  });

  /* ══ 6 · WEBGL DIDN'T START — say so rather than lying ═══════════ */
  if (window.CORE && window.CORE.ok === false) {
    document.documentElement.dataset.gl = "off";
    console.warn("core.js: WebGL unavailable — the ice is not rendering.");
  }
})();
