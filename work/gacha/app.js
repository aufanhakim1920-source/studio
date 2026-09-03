const PROJECTS = [
  {
    name: "FanNest", mono: "FN", c: "#E2483A", r: "SSR", kind: "web",
    status: "Live", year: "2026", url: "https://fannest.store/",
    meta: "Shopify · Node · Meta API",
    desc: "A full anime-merch storefront — theme build, catalogue, pricing rules, and an automated Reels pipeline that sources product media, prices it in USD and posts on a schedule without ever repeating a listing.",
    tags: ["Shopify", "Liquid", "Node", "Automation"],
  },
  {
    name: "Week Board", mono: "WB", c: "#2E6FD8", r: "SSR", kind: "web",
    status: "Live", year: "2026", url: "https://stellular-queijadas-097900.netlify.app",
    meta: "Netlify · Serverless · GCal",
    desc: "A public departures-board of my real weekly availability, pulled live from Google Calendar, with a booking flow that emails me and blocks the slot the moment I approve it. Killed the back-and-forth entirely.",
    tags: ["Netlify", "Serverless", "Google Calendar"],
  },
  {
    name: "Biomate", mono: "BM", c: "#12A5A0", r: "SSR", kind: "web",
    status: "Live", year: "2026", url: "https://aufanhakim1920-source.github.io/biomate",
    meta: "Supabase · Postgres · GPS",
    desc: "A hiking-buddy matcher where you swipe on hikes people are hosting, not on people. Roles, XP and recommendations are all derived inside Postgres so the client can never write them, and it records a real GPS trail — tested against 50,000 fixes without the canvas slowing down.",
    tags: ["Supabase", "Postgres RLS", "Geolocation", "Team build"],
  },
  {
    name: "Pixel Dungeon Knight", mono: "PDK", c: "#2FA35C", r: "SR", kind: "game",
    status: "Playable", year: "2026", url: "",
    meta: "Canvas · Game design",
    desc: "Browser and mobile roguelike built end to end: 18 characters with two skills each, 136 weapons, 15 attachments, 9 pets, 98 enemies, 28 bosses, 17 biomes, plus Boss Rush and hidden vaults.",
    tags: ["JavaScript", "Canvas", "Mobile", "Balance"],
  },
  {
    name: "baka nae.", mono: "bn", c: "#E85FA0", r: "SR", kind: "web",
    status: "In build", year: "2026", url: "",
    meta: "HTML · CSS · i18n",
    desc: "Brand site for my sister's anime fanart label — 10.7k Shopee followers, 7.4k five-star reviews. Bilingual ID/EN, live catalogue filtering, built as a credibility flagship that hands checkout back to Shopee.",
    tags: ["Design system", "i18n", "Vanilla JS"],
  },
  {
    name: "Untitled Game", mono: "UG", c: "#7B4FE0", r: "SR", kind: "game",
    status: "In build", year: "2026", url: "",
    meta: "Unity · C# · Co-op",
    desc: "Co-op 3D pixel-art adventure in Unity, built with a partner. Where I learned to measure a game instead of feeling it — instrumenting combat cut time-per-kill from 8.0s to 2.2s.",
    tags: ["Unity", "C#", "3D pixel art"],
  },
  {
    name: "Hollowborne", mono: "HB", c: "#B0243A", r: "SR", kind: "game",
    status: "In build", year: "2026", url: "",
    meta: "JavaScript · Narrative",
    desc: "Browser action-RPG with an original story bible — world, combat and progression written before a single line of engine code.",
    tags: ["JavaScript", "Systems", "Writing"],
  },
  {
    name: "AgentSentry", mono: "AS", c: "#3A4048", r: "R", kind: "tool",
    status: "Prototype", year: "2026", url: "",
    meta: "Next.js · TypeScript",
    desc: "A kill-switch proxy for AI agents. Sits between an agent and the APIs it calls, logs every request, and lets a human cut it off mid-run.",
    tags: ["Next.js", "TypeScript", "Observability"],
  },
  {
    name: "FreshTrack", mono: "FT", c: "#E88A1B", r: "R", kind: "tool",
    status: "Prototype", year: "2026", url: "",
    meta: "Mobile · Vision",
    desc: "Mobile food-freshness tracker — point the camera at the fridge and get a shelf-life estimate before anything goes to waste.",
    tags: ["Mobile", "Computer vision", "Product"],
  },
  {
    name: "Motion Pipeline", mono: "MP", c: "#8A6BD1", r: "R", kind: "tool",
    status: "Shipped", year: "2026", url: "",
    meta: "Remotion · React · Sound",
    desc: "Vertical 9:16 explainer video built in Remotion — code-driven scenes with sound effects timed to the exact frame the animation starts, rather than eyeballed in an editor.",
    tags: ["Remotion", "React", "Sound design"],
  },
];
const RATES = [
  { n: "JavaScript & TypeScript",        note: "every project on this page", v: 92, c: "#E2483A" },
  { n: "Interface design → build",       note: "figma through to shipped css", v: 86, c: "#F5C243" },
  { n: "Front-end systems & motion",     note: "layout, state, interaction", v: 80, c: "#2E6FD8" },
  { n: "Backend & data modelling",       note: "postgres, supabase, rls", v: 64, c: "#0F9B8E" },
  { n: "Automation & third-party APIs",  note: "node, serverless, meta, gcal", v: 58, c: "#7B4FE0" },
  { n: "Game systems & balance",         note: "unity c#, canvas, tuning", v: 55, c: "#2FA35C" },
  { n: "Python & data science",          note: "the degree i am actually doing", v: 46, c: "#E85FA0" },
  { n: "C, close to the metal",          note: "comp10002, pointers and all", v: 38, c: "#3A4048" },
  { n: "Motion graphics in code",        note: "remotion, frame-timed sound", v: 30, c: "#E88A1B" },
];
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
document.documentElement.classList.replace("no-js", "js");
const state = { coined: false, opened: new Set(), queue: [...PROJECTS.keys()], active: null };
/* ─────────────── capsule markup, shared everywhere ─────────────── */
function capHTML(p, withPrize = true) {
  return `
  <div class="cap" style="--c:${p.c}">
    <div class="cap__tilt">
      <div class="cap__ball">
        <span class="cap__shadow"></span>
        ${withPrize ? `<div class="cap__prize">
          <div class="cap__prizeTok">${p.mono}</div>
          <div class="cap__prizeR">${p.r}</div>
        </div>` : ""}
        <div class="cap__half cap__bot">
          <span class="cap__mono" style="font-size:${p.mono.length > 2 ? 20 : 30}cqw">${p.mono}</span>
        </div>
        <div class="cap__half cap__top"></div>
        <span class="cap__rim"></span>
        <span class="cap__gloss"></span>
      </div>
    </div>
  </div>`;
}
/* ═══════════════ THE DOME ═══════════════ */
/* 22 capsules sitting still inside the glass. Fixed coordinates, no motion —
   they are scenery, and a bowl of independently drifting balls is exactly the
   over-stimulation this whole page is built to avoid. */
const DOME_POS = [
  // bottom row first: stock depletes from the top of the pile, like a real bowl
  [8,92,30],[20,92,29],[32,93,30],[44,92,29],[56,93,30],[68,92,29],[80,92,30],[92,93,28],
  [14,81,29],[26,82,30],[38,81,28],[50,82,30],[62,81,29],[74,82,30],[86,81,28],
  [20,70,29],[32,71,28],[44,70,30],[56,71,28],[68,70,29],[80,70,27],
  [26,59,28],[38,60,27],[50,59,29],[62,60,27],[74,59,26],
  [32,48,27],[44,49,26],[56,48,28],[68,48,25],
  [38,37,26],[50,38,25],[62,37,24],
];
/* deterministic jitter: a perfect triangle reads as a rack of pool balls,
   not as capsules that settled where they fell */
const jit = (n) => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };
function renderDome() {
  const caps = DOME_POS.map((pos, i) => {
    const [x, y, s] = pos;
    const c = PROJECTS[i % PROJECTS.length].c;
    const dx = (jit(i + 1) - 0.5) * 4.6;
    const dy = (jit(i + 41) - 0.5) * 3.4;
    const rot = (jit(i + 97) - 0.5) * 34;
    return `<span class="dcap" style="left:${(x + dx).toFixed(2)}%;top:${(y + dy).toFixed(2)}%;
      width:${s}px;height:${s}px;--rot:${rot.toFixed(1)}deg;
      background:linear-gradient(color-mix(in srgb,${c} 20%,#fff) 0 50%, ${c} 50% 100%)"></span>`;
  });
  $("#domeCaps").innerHTML = caps.join("");
}
function setDomeStock(n) {
  const show = Math.min(DOME_POS.length, Math.round(8 + n * 2.5));
  $$("#domeCaps .dcap").forEach((el, i) => { el.style.display = i < show ? "" : "none"; });
}
/* ═══════════════ THE GRID ═══════════════ */
function renderGrid() {
  $("#capgrid").innerHTML = PROJECTS.map((p, i) => `
    <article class="capcell" data-i="${i}" data-r="${p.r}" data-kind="${p.kind}"
             role="button" tabindex="0" aria-expanded="false"
             aria-label="${p.name} — ${p.r}, ${p.status}. Crack the capsule open.">
      <span class="capcell__state">SEALED</span>
      <span class="capcell__r r-${p.r}">${p.r}</span>
      ${capHTML(p)}
      <h3 class="capcell__name">${p.name}</h3>
      <p class="capcell__meta">${p.meta}</p>
    </article>`).join("");
  $$(".capcell").forEach((cell) => {
    cell.addEventListener("click", () => openCell(cell, true));
    cell.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCell(cell, true); }
    });
    attachTilt(cell);
  });
}
/* pointer tilt + specular — the card only moves while a pointer is on it */
function attachTilt(cell) {
  const tilt = $(".cap__tilt", cell);
  const gloss = $(".cap__gloss", cell);
  cell.addEventListener("pointermove", (e) => {
    const b = cell.getBoundingClientRect();
    const px = (e.clientX - b.left) / b.width;
    const py = (e.clientY - b.top) / b.height;
    tilt.style.transform = `perspective(600px) rotateX(${(0.5 - py) * 16}deg) rotateY(${(px - 0.5) * 18}deg)`;
    gloss.style.setProperty("--gx", `${px * 100}%`);
    gloss.style.setProperty("--gy", `${py * 100}%`);
  });
  cell.addEventListener("pointerleave", () => { tilt.style.transform = ""; });
}
function openCell(cell, showDetail) {
  const i = +cell.dataset.i;
  const cap = $(".cap", cell);
  if (!state.opened.has(i)) {
    state.opened.add(i);
    cap.classList.add("is-open");
    $(".capcell__state", cell).textContent = "OPENED";
    cell.setAttribute("aria-expanded", "true");
    updateCollected();
  }
  if (showDetail) {
    $$(".capcell").forEach((c) => c.classList.toggle("is-active", c === cell));
    state.active = i;
    renderDetail(i);
  }
}
function resealAll() {
  state.opened.clear();
  state.active = null;
  $$(".capcell").forEach((cell) => {
    $(".cap", cell).classList.remove("is-open");
    cell.classList.remove("is-active");
    cell.setAttribute("aria-expanded", "false");
    $(".capcell__state", cell).textContent = "SEALED";
  });
  $("#detail").innerHTML = "";
  state.queue = [...PROJECTS.keys()];
  $("#stock").textContent = state.queue.length;
  setDomeStock(state.queue.length);
  $("#trayHolder").innerHTML = "";
  $("#trayHint").style.display = "";
  $("#plateTxt").textContent = state.coined ? "READY — TURN CRANK" : "INSERT COIN";
  updateCollected();
}
function updateCollected() {
  $("#collected").textContent = state.opened.size;
}
/* ═══════════════ DETAIL PANEL ═══════════════ */
function renderDetail(i) {
  const p = PROJECTS[i];
  const link = p.url
    ? `<a class="btn btn--link" href="${p.url}" target="_blank" rel="noopener">Visit it ↗</a>`
    : `<span class="dpanel__meta" style="margin:0">Not public — happy to walk you through it</span>`;
  $("#detail").innerHTML = `
    <div class="dpanel" style="--c:${p.c}">
      <div class="dpanel__plinth"><div class="dpanel__tok">${p.mono}</div></div>
      <div>
        <p class="dpanel__meta">${String(i + 1).padStart(2, "0")} / ${PROJECTS.length} · ${p.r} · ${p.status} · ${p.year}</p>
        <h3>${p.name}</h3>
        <p class="dpanel__meta">${p.meta}</p>
        <p class="dpanel__desc">${p.desc}</p>
        <ul class="dpanel__tags">${p.tags.map((t) => `<li>${t}</li>`).join("")}</ul>
        <div class="dpanel__foot">${link}</div>
      </div>
    </div>`;
}
/* ═══════════════ FILTERS ═══════════════ */
function initFilters() {
  $$(".ban").forEach((b) => b.addEventListener("click", () => {
    $$(".ban").forEach((x) => { x.classList.remove("is-on"); x.setAttribute("aria-selected", "false"); });
    b.classList.add("is-on"); b.setAttribute("aria-selected", "true");
    const f = b.dataset.f;
    $$(".capcell").forEach((cell) => {
      const hit = f === "all" || cell.dataset.r === f || cell.dataset.kind === f;
      cell.classList.toggle("is-hidden", !hit);
    });
  }));
}
/* ═══════════════ THE COIN ═══════════════ */
function initCoin() {
  const coin = $("#coin");
  coin.classList.add("is-wait");
  coin.addEventListener("click", () => {
    if (state.coined) return;
    state.coined = true;
    coin.classList.remove("is-wait");
    coin.classList.add("is-in");
    setTimeout(() => {
      $("#plate").classList.add("is-ready");
      $("#plateTxt").textContent = "READY — TURN CRANK";
      $("#knob").classList.remove("is-locked");
      const b = $("#turnBtn");
      b.disabled = false;
      b.textContent = "Turn the crank";
    }, 420);
  });
}
/* ═══════════════ THE CRANK ═══════════════ */
/* Drag accumulates real angle deltas (atan2). One full 360° turn dispenses.
   The knurl layer rotates; the lighting layer above it never does — that is
   what stops it reading as a flat spinning disc. */
function initKnob() {
  const knob = $("#knob"), knurl = $("#knurl");
  knob.classList.add("is-locked");
  let dragging = false, last = 0, spun = 0, base = 0;
  const angleOf = (e) => {
    const b = knob.getBoundingClientRect();
    return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) * 180 / Math.PI;
  };
  knob.addEventListener("pointerdown", (e) => {
    if (!state.coined) { nudgeCoin(); return; }
    dragging = true; last = angleOf(e); knob.setPointerCapture(e.pointerId);
  });
  knob.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const a = angleOf(e);
    let d = a - last;
    if (d > 180) d -= 360; else if (d < -180) d += 360;
    last = a;
    spun += Math.abs(d);
    base += d;
    knurl.style.transform = `rotate(${base}deg)`;
    knob.style.setProperty("--turn", Math.min(360, spun));
    if (spun >= 360) { spun = 0; knob.style.setProperty("--turn", 0); dispense(); }
  });
  const end = () => { dragging = false; };
  knob.addEventListener("pointerup", end);
  knob.addEventListener("pointercancel", end);
  knob.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (!state.coined) { nudgeCoin(); return; }
    autoTurn();
  });
  $("#turnBtn").addEventListener("click", autoTurn);
  function autoTurn() {
    if (!state.coined || knob.dataset.busy) return;
    knob.dataset.busy = "1";
    base += 360;
    knurl.style.transition = "transform .75s cubic-bezier(.3,.9,.3,1)";
    knurl.style.transform = `rotate(${base}deg)`;
    setTimeout(() => { knurl.style.transition = ""; delete knob.dataset.busy; dispense(); }, 620);
  }
}
function nudgeCoin() {
  const coin = $("#coin");
  coin.animate(
    [{ transform: "translateY(0)" }, { transform: "translateY(-9px) rotate(-14deg)" },
     { transform: "translateY(0)" }, { transform: "translateY(-5px)" }, { transform: "translateY(0)" }],
    { duration: 620, easing: "ease-out" }
  );
  $("#plateTxt").textContent = "INSERT COIN FIRST";
}
/* ═══════════════ DISPENSE ═══════════════ */
function dispense() {
  if (!state.queue.length) {
    $("#plateTxt").textContent = "SOLD OUT — SEE COLLECTION";
    return;
  }
  const i = state.queue.shift();
  const p = PROJECTS[i];
  $("#stock").textContent = state.queue.length;
  setDomeStock(state.queue.length);
  $("#plateTxt").textContent = `PULLED ${p.r}`;
  $("#trayHint").style.display = "none";
  const holder = $("#trayHolder");
  holder.innerHTML = `
    <div class="drop is-fresh" id="dropCap" role="button" tabindex="0"
         aria-label="A ${p.r} capsule dropped — open it">
      ${capHTML(p)}
      <p class="drop__tag">tap to open</p>
    </div>`;
  const drop = $("#dropCap");
  const open = () => {
    drop.classList.remove("is-fresh");
    $(".cap", drop).classList.add("is-open");
    $(".drop__tag", drop).textContent = p.name;
    const cell = $(`.capcell[data-i="${i}"]`);
    setTimeout(() => {
      openCell(cell, true);
      cell.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 420);
  };
  drop.addEventListener("click", open);
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
}
/* ═══════════════ DOME SPECULAR (pointer) ═══════════════ */
function initDomeLight() {
  const m = $("#machineUnit"), spec = $(".dome__spec");
  m.addEventListener("pointermove", (e) => {
    const b = $("#dome").getBoundingClientRect();
    spec.style.setProperty("--sx", `${((e.clientX - b.left) / b.width) * 100}%`);
    spec.style.setProperty("--sy", `${((e.clientY - b.top) / b.height) * 100}%`);
    m.classList.add("is-touched");
  });
  m.addEventListener("pointerleave", () => m.classList.remove("is-touched"));
}
/* ═══════════════ DROP RATES ═══════════════ */
function renderRates() {
  $("#ratesList").innerHTML = RATES.map((r) => {
    const stars = Math.max(1, Math.round(r.v / 20));
    return `
    <div class="rate" style="--c:${r.c}">
      <div class="rate__n"><b>${r.n}</b><span>${r.note}</span></div>
      <div class="rate__bar"><span class="rate__fill" data-w="${r.v}"></span></div>
      <div>
        <div class="rate__v">${r.v}%</div>
        <div class="rate__stars">${"★".repeat(stars)}${"☆".repeat(5 - stars)}</div>
      </div>
    </div>`;
  }).join("");
}
/* ═══════════════ SCROLL-IN, ONCE ═══════════════ */
function initReveal() {
  $$(".sechead, .banners, .capgrid, .rates, .rates__foot, .prizes, .proof, .leaders, .counterwin, .stage")
    .forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("is-in");
      io.unobserve(en.target);
      if (en.target.classList.contains("rates")) {
        $$(".rate__fill", en.target).forEach((f, k) => {
          setTimeout(() => { f.style.width = `${f.dataset.w}%`; }, 60 * k);
        });
      }
      if (en.target.classList.contains("prizes")) {
        $$(".prize__n", en.target).forEach((n) => countUp(n));
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));
}
function countUp(el) {
  const target = parseFloat(el.dataset.count);
  const dec = +(el.dataset.decimal || 0);
  const suffix = el.dataset.suffix || "";
  const dur = 1100;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - k, 3);
    el.textContent = (target * eased).toFixed(dec) + suffix;
    if (k < 1) requestAnimationFrame(step);
    else el.textContent = target.toFixed(dec) + suffix;
  };
  requestAnimationFrame(step);
}
/* ═══════════════ CLOCK ═══════════════ */
function initClock() {
  const el = $("#clock");
  const tick = () => {
    el.textContent = new Intl.DateTimeFormat("en-AU", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Australia/Melbourne",
    }).format(new Date());
  };
  tick();
  setInterval(tick, 30000);
}
/* ═══════════════ BOOT ═══════════════ */
renderDome();
renderGrid();
renderRates();
initFilters();
initCoin();
initKnob();
initDomeLight();
initReveal();
initClock();
setDomeStock(PROJECTS.length);
$("#stock").textContent = PROJECTS.length;
$("#openAll").addEventListener("click", () => {
  $$(".capcell").forEach((cell, k) => setTimeout(() => openCell(cell, false), k * 70));
  $("#plateTxt").textContent = "COLLECTION UNSEALED";
});
$("#resealAll").addEventListener("click", resealAll);
if (!state.coined) $("#turnBtn").textContent = "Insert the coin first";
