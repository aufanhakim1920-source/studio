/* ═══════════════════════════════════════════════════════════════════
   SECOND RISE — the baker's rack trolley.

   Five trays, one per hour of the bake. Pull one forward and the other
   four push back. The rack carries the menu AND the timetable, so there
   is no hours block and no product list anywhere else on the page.

   MOTION POLICY: nothing in this file starts on its own. Every transform
   written here is the direct result of a click, a drag, a key or the
   pointer. There is no rAF loop, no interval, no autoplay.
   ═══════════════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  // ── the bake ───────────────────────────────────────────────────────
  const TRAYS = [
    {
      time: "05:00", out: 300, gone: 570, label: "Sourdough",
      title: "The first rack",
      note: "One hundred and twenty loaves, mixed at nine the night before and left cold until four. They come out at five and cool on this rack until the door opens. You can smell them from Normanby Avenue.",
      foot: "Out 05:00 · typically bare by 09:30 · 120 loaves",
      items: [
        { k: "country", n: "Country white",        s: "1.1 kg · 22 hr cold prove",     p: "$9.50"  },
        { k: "rye",     n: "Rye &amp; caraway bâtard", s: "900 g · 40 % rye",          p: "$10.00" },
        { k: "olive",   n: "Olive &amp; fennel",   s: "700 g · Mount Zero olives",     p: "$11.00" }
      ],
      front: [
        { g: "g-boule",   k: "country", w: 62, x: 2  },
        { g: "g-boule",   k: "country", w: 58, x: 22 },
        { g: "g-batard",  k: "rye",     w: 80, x: 42 },
        { g: "g-olive",   k: "olive",   w: 52, x: 74 }
      ],
      back: [
        { g: "g-boule",   k: "country", w: 56, x: 12 },
        { g: "g-batard",  k: "rye",     w: 72, x: 38 },
        { g: "g-olive",   k: "olive",   w: 48, x: 70 }
      ]
    },
    {
      time: "06:30", out: 390, gone: 615, label: "Pastry",
      title: "Butter, three days later",
      note: "Wednesday's butter, folded three times with an overnight rest between each fold. There are ninety pieces and they are the reason people stand on the footpath before six.",
      foot: "Out 06:30 · gone by 08:15 on a Saturday · 90 pieces",
      items: [
        { k: "croissant", n: "Croissant",           s: "three-day lamination",      p: "$6.50" },
        { k: "panchoc",   n: "Pain au chocolat",    s: "Callebaut 54 %",            p: "$7.20" },
        { k: "bun",       n: "Morning bun",         s: "Davidson plum sugar",       p: "$7.00" },
        { k: "kouign",    n: "Kouign-amann",        s: "Saturday and Sunday only",  p: "$7.80" }
      ],
      front: [
        { g: "g-croissant", k: "croissant", w: 68, x: 1  },
        { g: "g-panchoc",   k: "panchoc",   w: 60, x: 22 },
        { g: "g-scroll",    k: "bun",       w: 50, x: 43 },
        { g: "g-kouign",    k: "kouign",    w: 52, x: 61 },
        { g: "g-croissant", k: "croissant", w: 64, x: 80 }
      ],
      back: [
        { g: "g-croissant", k: "croissant", w: 60, x: 10 },
        { g: "g-panchoc",   k: "panchoc",   w: 56, x: 38 },
        { g: "g-kouign",    k: "kouign",    w: 48, x: 68 }
      ]
    },
    {
      time: "08:00", out: 480, gone: 780, label: "Tins",
      title: "Tins and slabs",
      note: "The soft end of the bench. Milk bread for the kids, a seeded tin for the toaster, and focaccia cut off a full tray with a bread knife and no ceremony whatsoever.",
      foot: "Out 08:00 · focaccia cut to order until it ends",
      items: [
        { k: "milk",     n: "Hokkaido milk bread", s: "800 g tin",                  p: "$9.00" },
        { k: "seeded",   n: "Seeded tin",          s: "linseed, sesame, poppy",     p: "$9.50" },
        { k: "focaccia", n: "Potato &amp; rosemary focaccia", s: "sold by the slab", p: "$6.00" }
      ],
      front: [
        { g: "g-tin",      k: "milk",     w: 74, x: 2  },
        { g: "g-seeded",   k: "seeded",   w: 74, x: 26 },
        { g: "g-focaccia", k: "focaccia", w: 86, x: 56 }
      ],
      back: [
        { g: "g-tin",      k: "milk",     w: 68, x: 14 },
        { g: "g-focaccia", k: "focaccia", w: 80, x: 48 }
      ]
    },
    {
      time: "11:00", out: 660, gone: 810, label: "Lunch",
      title: "The eleven o'clock",
      note: "The only savoury bake of the day, and the only thing we ever make twice — the first lot does not survive the crowd that comes down from the tile place on Dundas Street.",
      foot: "Out 11:00 · a second lot at 12:15 if the oven is free",
      items: [
        { k: "roll",   n: "Sausage roll",          s: "Gippsland pork, fennel seed", p: "$8.50" },
        { k: "pasty",  n: "Mushroom &amp; thyme pasty", s: "vegetarian, always",     p: "$8.00" },
        { k: "vegie",  n: "Cheese &amp; Vegemite scroll", s: "no apology offered",   p: "$6.00" }
      ],
      front: [
        { g: "g-roll",   k: "roll",  w: 70, x: 3  },
        { g: "g-pasty",  k: "pasty", w: 64, x: 27 },
        { g: "g-scroll", k: "vegie", w: 52, x: 51 },
        { g: "g-roll",   k: "roll",  w: 66, x: 70 }
      ],
      back: [
        { g: "g-pasty",  k: "pasty", w: 60, x: 16 },
        { g: "g-roll",   k: "roll",  w: 62, x: 46 },
        { g: "g-scroll", k: "vegie", w: 48, x: 74 }
      ]
    },
    {
      time: "15:00", out: 900, gone: 960, label: "What's left",
      title: "Whatever survived",
      note: "The last hour. Yesterday's country white at half, the heels and ends of the focaccia, and any pastry that made it through the morning. Bring a bag and do not expect a choice.",
      foot: "Out 15:00 · we lock up when this tray is bare",
      items: [
        { k: "dayold", n: "Day-old country white", s: "half price, still good toasted", p: "$4.75" },
        { k: "ends",   n: "Focaccia ends, bagged", s: "weight varies, price does not",  p: "$3.00" },
        { k: "mixed",  n: "Baker's mixed bag",     s: "one of us decides, not you",     p: "$6.00" }
      ],
      front: [
        { g: "g-half", k: "dayold", w: 42, x: 5  },
        { g: "g-bag",  k: "mixed",  w: 44, x: 25 },
        { g: "g-half", k: "dayold", w: 40, x: 45 },
        { g: "g-bag",  k: "ends",   w: 42, x: 66 }
      ],
      back: [
        { g: "g-half", k: "dayold", w: 38, x: 15 },
        { g: "g-bag",  k: "ends",   w: 40, x: 54 }
      ]
    }
  ];

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const rackEl   = $("#rackMount");
  const bodyEl   = $("#rackBody");
  const runnerWr = $("#runners");
  const trayWr   = $("#trays");
  const stage    = $("#stage");
  if (!rackEl || !trayWr) return;

  // deterministic scatter — jitter needs ROTATION, not just position
  const jitter = (n) => {
    const v = Math.sin(n * 127.1) * 43758.5453;
    return (v - Math.floor(v)) * 2 - 1;                // −1 … 1
  };

  const px = (v) => `calc(var(--lv0) + ${v} * var(--lvl))`;

  // viewBoxes must match the <symbol> definitions in index.html
  const VB = {
    "g-boule": "0 0 104 82", "g-batard": "0 0 136 66", "g-olive": "0 0 90 68",
    "g-croissant": "0 0 126 60", "g-panchoc": "0 0 108 58", "g-scroll": "0 0 90 62",
    "g-kouign": "0 0 94 60", "g-tin": "0 0 118 68", "g-seeded": "0 0 118 68",
    "g-focaccia": "0 0 132 46", "g-roll": "0 0 110 48", "g-pasty": "0 0 104 58",
    "g-half": "0 0 76 80", "g-bag": "0 0 80 86"
  };

  /* Every symbol is drawn from --crust / --crust-lo / --crust-dk, so one line
     per product repaints it. A rack where everything is the same brown reads as
     one lump; pale milk bread next to dark rye is what makes it read as a bake. */
  const COL = {
    country:  ["#C89354", "#E2B87E", "#7C4E1F"],
    rye:      ["#9A6835", "#B98A52", "#553213"],
    olive:    ["#C08B4A", "#DCAE70", "#764718"],
    croissant:["#D89F50", "#F3C983", "#8C5820"],
    panchoc:  ["#B87E3D", "#D5A263", "#66401A"],
    bun:      ["#C88E46", "#E4B472", "#7A4A18"],
    kouign:   ["#AE7031", "#CE9553", "#5F3510"],
    milk:     ["#E5C48F", "#F6E0B8", "#A9824C"],
    seeded:   ["#B27C40", "#CE9C60", "#633C14"],
    focaccia: ["#D8A85F", "#F0CB8E", "#93601F"],
    roll:     ["#DEB477", "#F4D6A4", "#96662B"],
    pasty:    ["#D3A461", "#EBC58C", "#8B5A20"],
    vegie:    ["#C68C43", "#E1B36F", "#75461A"],
    dayold:   ["#B98247", "#D2A46F", "#6E4318"],
    ends:     ["#B99C74", "#CFB58F", "#7A5F3C"],
    mixed:    ["#B99C74", "#CFB58F", "#7A5F3C"]
  };
  const paint = (k) => {
    const c = COL[k] || COL.country;
    return `--crust:${c[0]};--crust-lo:${c[1]};--crust-dk:${c[2]};`;
  };

  // ── build the rack ─────────────────────────────────────────────────
  const tags = [];
  const trays = [];

  TRAYS.forEach((t, i) => {
    // runners: two bars per level, running front to back, so the slot is visible
    ["l", "r"].forEach((side) => {
      const r = document.createElement("span");
      r.className = `runner runner--${side}`;
      r.style.top = px(i) + "";
      r.style.marginTop = "10px";
      runnerWr.appendChild(r);
    });

    // chalk tag clipped to the runner
    const tag = document.createElement("button");
    tag.type = "button";
    tag.className = "tag";
    tag.style.top = px(i);
    tag.dataset.i = String(i);
    tag.setAttribute("aria-controls", "docket");
    tag.innerHTML =
      `<span class="tag__t">${t.time}</span><span class="tag__l">${t.label}</span>`;
    tag.setAttribute("aria-label", `Pull out the ${t.time} tray — ${t.title}`);
    bodyEl.appendChild(tag);
    tags.push(tag);

    // the tray itself
    const tray = document.createElement("div");
    tray.className = "tray";
    tray.style.top = px(i);
    tray.dataset.i = String(i);
    tray.tabIndex = -1;

    const goodsHTML = (list, cls, seed) => {
      const inner = list.map((g, n) => {
        const rot = (jitter(seed * 31 + n * 7) * 4.5).toFixed(2);
        return `<svg class="good" data-item="${g.k}" data-tray="${i}" style="--w:${g.w}px;--rot:${rot}deg;left:${g.x}%;${paint(g.k)}"
                     viewBox="${VB[g.g]}" role="img" aria-label="${labelOf(t, g.k)}"><use href="#${g.g}"></use></svg>`;
      }).join("");
      return `<div class="goods ${cls}">${inner}</div>`;
    };

    tray.innerHTML =
      `<div class="tray__deck"></div>` +
      goodsHTML(t.back,  "goods--back",  i * 2 + 1) +
      goodsHTML(t.front, "goods--front", i * 2) +
      `<div class="tray__lip"></div>`;

    trayWr.appendChild(tray);
    trays.push(tray);
  });

  function labelOf(t, k) {
    const it = t.items.find((x) => x.k === k);
    return it ? it.n.replace(/&amp;/g, "&") : "baked good";
  }

  // ── time in Melbourne, read once on load (a ticking clock would loop) ──
  function melbourne() {
    const f = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Melbourne",
      hour: "2-digit", minute: "2-digit", hour12: false,
      weekday: "short", day: "2-digit", month: "short", year: "2-digit"
    });
    const p = {};
    for (const part of f.formatToParts(new Date())) p[part.type] = part.value;
    let h = parseInt(p.hour, 10);
    if (h === 24) h = 0;
    return {
      mins: h * 60 + parseInt(p.minute, 10),
      day: (p.weekday || "").toUpperCase(),
      stamp: `${p.day} ${(p.month || "").toUpperCase()} ${p.year}`
    };
  }
  const NOW = melbourne();
  const SHUT = NOW.day.startsWith("MON");

  function statusOf(t) {
    if (SHUT)              return { text: `Tomorrow ${t.time}`, cls: "" };
    if (NOW.mins < t.out)  return { text: `Out at ${t.time}`,   cls: "" };
    if (NOW.mins < t.gone) return { text: "On the rack now",    cls: "is-now" };
    return { text: "Gone for today", cls: "is-gone" };
  }

  // ── the docket reads whatever tray is out ──────────────────────────
  const dTime = $("#dTime"), dStatus = $("#dStatus"), dTitle = $("#dTitle"),
        dNote = $("#dNote"), dRows = $("#dRows"), dFoot = $("#dFoot");

  // ── the specimen window ────────────────────────────────────────────
  // It is what makes the good ↔ row link load-bearing rather than a highlight:
  // pointing at anything on the tray draws that thing at full size with its price.
  const sSvg = $("#dSpecSvg"), sUse = $("#dSpecUse"), sLab = $("#dSpecLabel"),
        sName = $("#dSpecName"), sSub = $("#dSpecSub"), sPrice = $("#dSpecPrice");

  const symbolFor = (t, k) => {
    const hit = t.front.find((g) => g.k === k) || t.back.find((g) => g.k === k);
    return hit ? hit.g : "g-boule";
  };

  function setSpec(i, key, pointed) {
    const t = TRAYS[i];
    const it = t.items.find((x) => x.k === key) || t.items[0];
    const sym = symbolFor(t, it.k);
    sSvg.setAttribute("viewBox", VB[sym]);
    sSvg.setAttribute("style", paint(it.k));
    sUse.setAttribute("href", "#" + sym);
    sLab.textContent = pointed ? "You are pointing at" : "On this tray";
    sName.innerHTML = it.n;
    sSub.textContent = it.s;
    sPrice.textContent = it.p;
  }

  function renderDocket(i) {
    const t = TRAYS[i];
    const st = statusOf(t);
    dTime.textContent  = t.time;
    dStatus.textContent = st.text;
    dStatus.className  = "docket__status " + st.cls;
    dTitle.textContent = t.title;
    dNote.textContent  = t.note;
    dFoot.textContent  = SHUT ? "Shut today — " + t.foot : t.foot;

    const sold = st.cls === "is-gone";
    dRows.innerHTML = t.items.map((it) =>
      `<li data-item="${it.k}" class="${sold ? "out" : ""}">
         <span class="n">${it.n} <em>${it.s}</em></span>
         <span class="dots"></span>
         <span class="p">${it.p}</span>
       </li>`).join("");

    // sold-out trays grey their own goods — state you can see on the object
    trays[i].querySelectorAll(".good").forEach((g) => g.classList.toggle("good__sold", sold));

    setSpec(i, t.items[0].k, false);
  }

  // ── the mechanic: pull one tray out, push the rest back ────────────
  let openIndex = -1;

  function openTray(i, { focusTag = false } = {}) {
    openIndex = i;
    trays.forEach((el, k) => {
      const on = k === i;
      el.style.setProperty("--z", on ? "var(--pull)" : "var(--push)");
      el.style.setProperty("--dim", on ? "1" : ".8");
      el.classList.toggle("is-open", on);
      tags[k].classList.toggle("is-open", on);
      tags[k].setAttribute("aria-expanded", String(on));
    });
    rock();
    renderDocket(i);
    if (focusTag) tags[i].focus();
  }

  // one-shot rock of the whole trolley on its castors. Caused by the pull.
  function rock() {
    bodyEl.classList.remove("is-rocking");
    void bodyEl.offsetWidth;                 // restart the animation
    bodyEl.classList.add("is-rocking");
  }
  bodyEl.addEventListener("animationend", () => bodyEl.classList.remove("is-rocking"));

  tags.forEach((tag) => {
    tag.addEventListener("click", () => openTray(+tag.dataset.i));
    tag.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next = (+tag.dataset.i + step + TRAYS.length) % TRAYS.length;
      openTray(next, { focusTag: true });
    });
  });

  // ── drag a tray out by hand ────────────────────────────────────────
  // The rack is yawed, so local +Z maps to (sin(yaw), 0, cos(yaw)) on screen:
  // horizontal pointer travel is only sin(yaw) of the real pull distance.
  const YAW = 22 * Math.PI / 180;
  const HSCALE = Math.sin(YAW);              // ≈ 0.375

  trays.forEach((tray) => {
    let id = null, x0 = 0, base = 0, moved = 0, max = 0;

    tray.addEventListener("pointerdown", (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const cs = getComputedStyle(tray);
      max = parseFloat(cs.getPropertyValue("--pull")) || 160;
      base = +tray.dataset.i === openIndex ? max : 0;
      id = e.pointerId; x0 = e.clientX; moved = 0;
      tray.setPointerCapture(id);
      tray.classList.add("is-dragging");
    });

    tray.addEventListener("pointermove", (e) => {
      if (id === null || e.pointerId !== id) return;
      moved = e.clientX - x0;
      const z = Math.max(-26, Math.min(max, base + moved / HSCALE));
      tray.style.setProperty("--z", z.toFixed(1) + "px");
    });

    const end = (e) => {
      if (id === null || (e.pointerId !== undefined && e.pointerId !== id)) return;
      try { tray.releasePointerCapture(id); } catch (_) {}
      id = null;
      tray.classList.remove("is-dragging");
      const z = parseFloat(getComputedStyle(tray).getPropertyValue("--z")) || 0;
      const i = +tray.dataset.i;
      // a short press with no travel counts as a click
      if (Math.abs(moved) < 5) { openTray(i); return; }
      if (z > max * 0.38) openTray(i);
      else if (openIndex === i) openTray((i + 1) % TRAYS.length);
      else openTray(openIndex);
    };
    tray.addEventListener("pointerup", end);
    tray.addEventListener("pointercancel", end);
  });

  // ── two-way link: a drawn good and its priced row are the same thing ──
  function light(key, on) {
    if (openIndex < 0) return;
    trays[openIndex].querySelectorAll(`.good[data-item="${key}"]`)
      .forEach((g) => g.classList.toggle("is-lit", on));
    const row = dRows.querySelector(`li[data-item="${key}"]`);
    if (row) row.classList.toggle("is-lit", on);
    setSpec(openIndex, on ? key : TRAYS[openIndex].items[0].k, on);
  }
  const keyOf = (el) => el && el.dataset ? el.dataset.item : null;

  trayWr.addEventListener("pointerover", (e) => {
    const g = e.target.closest(".good"); if (g && +g.dataset.tray === openIndex) light(keyOf(g), true);
  });
  trayWr.addEventListener("pointerout", (e) => {
    const g = e.target.closest(".good"); if (g) light(keyOf(g), false);
  });
  dRows.addEventListener("pointerover", (e) => {
    const li = e.target.closest("li"); if (li) light(keyOf(li), true);
  });
  dRows.addEventListener("pointerout", (e) => {
    const li = e.target.closest("li"); if (li) light(keyOf(li), false);
  });

  // ── pointer parallax: the trolley turns to face you, ±4°, then settles ──
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    const t = (e.clientX - r.left) / r.width - 0.5;      // −0.5 … 0.5
    rackEl.style.setProperty("--yaw", (t * -8).toFixed(2) + "deg");
  });
  stage.addEventListener("pointerleave", () => rackEl.style.setProperty("--yaw", "0deg"));

  // ── open on the tray that matters right now ────────────────────────
  let start = 0;
  for (let i = 0; i < TRAYS.length; i++) if (NOW.mins >= TRAYS[i].out) start = i;
  openTray(start);

  const hint = $("#stageHint");
  if (hint) {
    hint.textContent = SHUT
      ? "Closed Mondays · click a chalk tag to see the week's bake"
      : "Click a chalk tag · drag a tray · ↑ ↓ to step";
  }

  // ── the hero specimen turns to face the pointer, and the light with it ──
  const lw = $(".hero__loafwrap"), loaf = $(".hero__loaf");
  if (lw && loaf) {
    lw.addEventListener("pointermove", (e) => {
      const r = lw.getBoundingClientRect();
      const ux = (e.clientX - r.left) / r.width;
      const uy = (e.clientY - r.top) / r.height;
      loaf.style.setProperty("--ly", ((ux - 0.5) * 17).toFixed(2) + "deg");
      loaf.style.setProperty("--lx", ((0.5 - uy) * 11).toFixed(2) + "deg");
      lw.style.setProperty("--gx", (ux * 100).toFixed(1) + "%");
      lw.style.setProperty("--gy", (uy * 100).toFixed(1) + "%");
      lw.style.setProperty("--glare", "1");
    });
    lw.addEventListener("pointerleave", () => {
      loaf.style.setProperty("--ly", "0deg");
      loaf.style.setProperty("--lx", "0deg");
      lw.style.setProperty("--glare", "0");
    });
  }

  // ── the order pad ──────────────────────────────────────────────────
  const pad = $("#pad");
  if (pad) {
    $("#padNo").textContent = "No. 0" + (412 + (NOW.mins % 77));
    $("#stampDate").textContent = NOW.stamp;
    const err = $("#padErr"), stamp = $("#stamp");

    pad.addEventListener("submit", (e) => {
      e.preventDefault();                       // nothing leaves this page
      const missing = ["business", "suburb", "units", "product", "email"]
        .filter((n) => !String(pad.elements[n].value).trim());
      const email = String(pad.elements.email.value);
      const units = parseInt(pad.elements.units.value, 10);

      if (missing.length) {
        err.hidden = false;
        err.textContent = "Fill in " + missing.join(", ") + " and try again.";
        pad.elements[missing[0]].focus();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        err.hidden = false; err.textContent = "That email does not look right.";
        pad.elements.email.focus(); return;
      }
      if (!(units >= 20)) {
        err.hidden = false; err.textContent = "Twenty units a day is the minimum. Below that we would just be losing money politely.";
        pad.elements.units.focus(); return;
      }
      err.hidden = true;
      pad.classList.add("is-sent");
      stamp.classList.add("is-on");
      $$("input, select, button", pad).forEach((el) => { el.disabled = true; });
      pad.querySelector("button").textContent = "Kate has it";
    });
  }

  // exposed for the verification harness only — no page code reads this
  window.__rack = { openTray, open: () => openIndex, count: TRAYS.length };
})();
