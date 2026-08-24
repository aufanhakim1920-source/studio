/* ============================================================
   AUFAN — FOIL
   Every motion in here is something the visitor causes.
   Nothing animates on its own except the status LED.
   ============================================================ */

const PROJECTS = [
  {
    name: "FanNest", mono: "FN", c: "#B23A2E", status: "Live", year: "2026",
    url: "https://fannest.store/", meta: "Shopify · Node · Meta API",
    desc: "A full anime-merch storefront — theme build, catalogue, pricing rules, and an automated Reels pipeline that sources product media, prices it in USD and posts on a schedule without ever repeating a listing.",
    tags: ["Shopify", "Liquid", "Node", "Automation"],
  },
  {
    name: "Week Board", mono: "WB", c: "#1E4E8C", status: "Live", year: "2026",
    url: "https://stellular-queijadas-097900.netlify.app", meta: "Netlify · Serverless · GCal",
    desc: "A public departures-board of my real weekly availability, pulled live from Google Calendar, with a booking flow that emails me and blocks the slot the moment I approve it. Killed the back-and-forth entirely.",
    tags: ["Netlify", "Serverless", "Google Calendar"],
  },
  {
    name: "baka nae.", mono: "bn", c: "#C24E86", status: "In build", year: "2026",
    url: "", meta: "HTML · CSS · i18n",
    desc: "Brand site for my sister's anime fanart label — 10.7k Shopee followers, 7.4k five-star reviews. Bilingual ID/EN, live catalogue filtering, built as a credibility flagship that hands checkout back to Shopee.",
    tags: ["Design system", "i18n", "Vanilla JS"],
  },
  {
    name: "Pixel Dungeon Knight", mono: "PDK", c: "#2E6B47", status: "Playable", year: "2026",
    url: "", meta: "Canvas · Game design",
    desc: "Browser and mobile roguelike built end to end: 18 characters with two skills each, 136 weapons, 15 attachments, 9 pets, 98 enemies, 28 bosses, 17 biomes, plus Boss Rush and hidden vaults.",
    tags: ["JavaScript", "Canvas", "Mobile"],
  },
  {
    name: "Untitled Game", mono: "UG", c: "#5B3FD9", status: "In build", year: "2026",
    url: "", meta: "Unity · C# · Co-op",
    desc: "Co-op 3D pixel-art adventure in Unity, built with a partner. Where I learned to measure a game instead of feeling it — instrumenting combat cut time-per-kill from 8.0s to 2.2s.",
    tags: ["Unity", "C#", "3D pixel art"],
  },
  {
    name: "Hollowborne", mono: "HB", c: "#8C1C28", status: "In build", year: "2026",
    url: "", meta: "JavaScript · Narrative",
    desc: "Browser action-RPG with an original story bible — world, combat and progression written before a single line of engine code.",
    tags: ["JavaScript", "Systems", "Writing"],
  },
  {
    name: "AgentSentry", mono: "AS", c: "#26292E", status: "Prototype", year: "2026",
    url: "", meta: "Next.js · TypeScript",
    desc: "A kill-switch proxy for AI agents. Sits between an agent and the APIs it calls, logs every request, and lets a human cut it off mid-run.",
    tags: ["Next.js", "TypeScript", "Observability"],
  },
  {
    name: "FreshTrack", mono: "FT", c: "#127A80", status: "Prototype", year: "2026",
    url: "", meta: "Mobile · Vision",
    desc: "Mobile food-freshness tracker — point the camera at the fridge and get a shelf-life estimate before anything goes to waste.",
    tags: ["Mobile", "Computer vision", "Product"],
  },
  {
    name: "Motion Pipeline", mono: "MP", c: "#C97F16", status: "Shipped", year: "2026",
    url: "", meta: "Remotion · React · Sound",
    desc: "Vertical 9:16 explainer video built in Remotion — code-driven scenes with sound effects timed to the exact frame the animation starts, rather than eyeballed in an editor.",
    tags: ["Remotion", "React", "Sound design"],
  },
];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- the front of a card, shared by the pile and the grid ---------- */
function faceHTML(p, i) {
  const size = p.mono.length > 2 ? 18 : 30;   // cqw — scales with whatever card holds it
  return `
    <div class="cface" style="--c:${p.c}">
      <div class="cface__top">
        <span class="cface__no">${String(i + 1).padStart(2, "0")} / 09</span>
        <span class="cface__status">${p.status}</span>
      </div>
      <div class="cface__art"><span class="cface__mono" style="font-size:${size}cqw">${p.mono}</span></div>
      <div class="cface__name">${p.name}</div>
      <div class="cface__meta">${p.meta}</div>
      <div class="foil"></div>
      <div class="glare"></div>
    </div>`;
}

/* ═══════════════ THE GRID ═══════════════ */
function renderGrid() {
  $("#grid").innerHTML = PROJECTS.map((p, i) => {
    const link = p.url
      ? `<a class="cback__link" href="${p.url}" target="_blank" rel="noopener" data-stop>Visit the site ↗</a>`
      : `<span class="cback__link">${p.status}</span>`;
    // a div, not a button — the back of the card carries a real <a>, and an
    // anchor nested inside a button is invalid and unclickable in some browsers
    return `
      <div class="card" role="button" tabindex="0" data-i="${i}" data-status="${p.status}"
           aria-label="${p.name} — turn card over">
        <div class="card__tilt">
          <div class="card__flip">
            <div class="card__face card__face--front">${faceHTML(p, i)}</div>
            <div class="card__face card__face--back">
              <div class="cback" style="--c:${p.c}">
                <span class="cback__mark" style="font-size:${p.mono.length > 2 ? 22 : 34}cqw">${p.mono}</span>
                <div class="cback__bar"></div>
                <div>
                  <div class="cback__name">${p.name}</div>
                  <p class="cback__desc">${p.desc}</p>
                </div>
                <div class="cback__tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div>
                <div class="cback__foot">${link}<span class="cback__back">${p.year} · tap to flip back</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }).join("");

  $("#grid").addEventListener("click", (e) => {
    if (e.target.closest("[data-stop]")) return;      // let the real link through
    const card = e.target.closest(".card");
    if (card) card.classList.toggle("is-flipped");
  });

  $("#grid").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".card");
    if (!card) return;
    e.preventDefault();
    card.classList.toggle("is-flipped");
  });

  $$(".card").forEach(attachTilt);
}

/* ═══════════════ TILT + FOIL ═══════════════
   The foil is not decoration bolted on top — it reads the same pointer
   position the tilt does, so the sheen always tracks the angle you're
   holding the card at. Rotate the card and the rainbow sweeps with it. */
function attachTilt(host, opts = {}) {
  if (reduced) return;
  const tilt = opts.tiltEl || $(".card__tilt", host);
  const face = $(".cface", host);
  if (!face) return;

  const move = (e) => {
    const r = host.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;    // 0 → 1
    const py = (e.clientY - r.top) / r.height;

    if (tilt) tilt.style.transform = `rotateY(${(px - 0.5) * 15}deg) rotateX(${(0.5 - py) * 15}deg)`;

    // foil sweeps across a 260% background, so small pointer moves travel far
    face.style.setProperty("--fx", `${18 + px * 64}%`);
    face.style.setProperty("--fy", `${18 + py * 64}%`);
    face.style.setProperty("--gx", `${px * 100}%`);
    face.style.setProperty("--gy", `${py * 100}%`);
    face.classList.add("is-lit");
  };

  const leave = () => {
    if (tilt) tilt.style.transform = "";
    face.classList.remove("is-lit");
  };

  host.addEventListener("pointermove", move);
  host.addEventListener("pointerleave", leave);
}

/* ═══════════════ THE PILE ═══════════════ */
const OFFSETS = [
  { x: 0, y: 0, r: 0, s: 1 },
  { x: 13, y: -17, r: -4.6, s: 0.955 },
  { x: -12, y: -32, r: 4.2, s: 0.91 },
  { x: 18, y: -45, r: -2.4, s: 0.87 },
  { x: -8, y: -56, r: 2.2, s: 0.83 },
];

let order = PROJECTS.map((_, i) => i);
let dcards = [];

function layoutPile() {
  order.forEach((id, pos) => {
    const el = dcards[id];
    const d = Math.min(pos, OFFSETS.length - 1);
    const o = OFFSETS[d];

    if (el.dataset.jump) {
      el.style.transition = "none";
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          el.style.transition = "";
          delete el.dataset.jump;
        })
      );
    }

    el.style.zIndex = String(60 - pos);
    el.style.opacity = pos >= OFFSETS.length ? "0" : "1";
    el.style.pointerEvents = pos === 0 ? "auto" : "none";
    el.style.transform = `translate3d(${o.x}px, ${o.y}px, 0) rotate(${o.r}deg) scale(${o.s})`;
  });

  const top = PROJECTS[order[0]];
  $("#deck-count").textContent = `${String(order[0] + 1).padStart(2, "0")} / 09 · ${top.name}`;
}

function renderPile() {
  const stack = $("#deck-stack");
  stack.innerHTML = PROJECTS.map(
    (p, i) => `<div class="dcard" data-i="${i}">${faceHTML(p, i)}</div>`
  ).join("");

  dcards = $$(".dcard", stack);
  dcards.forEach((el) => attachTilt(el, { tiltEl: null }));
  dcards.forEach(attachDrag);
  layoutPile();
}

/* throw the top card off and send it to the bottom */
let busy = false;
function throwTop(dir = 1) {
  if (busy) return;
  busy = true;
  const el = dcards[order[0]];
  el.classList.add("is-gone");
  el.style.transform = `translate3d(${dir * 640}px, -70px, 0) rotate(${dir * 24}deg)`;

  setTimeout(() => {
    order.push(order.shift());
    el.classList.remove("is-gone");
    el.dataset.jump = "1";
    layoutPile();
    busy = false;
  }, 430);
}

function attachDrag(el) {
  let sx = 0, sy = 0, dragging = false, moved = 0;

  el.addEventListener("pointerdown", (e) => {
    if (busy) return;
    dragging = true; moved = 0;
    sx = e.clientX; sy = e.clientY;
    el.setPointerCapture(e.pointerId);
    el.classList.add("is-dragging");
  });

  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    moved = Math.max(moved, Math.hypot(dx, dy));
    el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(${dx * 0.05}deg)`;
  });

  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove("is-dragging");
    const dx = e.clientX - sx;

    if (Math.abs(dx) > 105) {
      throwTop(Math.sign(dx) || 1);
    } else if (moved < 7) {
      openInGrid(Number(el.dataset.i));       // a tap, not a drag
      layoutPile();
    } else {
      layoutPile();                            // springs home
    }
    $("#hint").textContent = "Drag the top card off the pile. Or click it to open the full entry.";
  };

  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

/* tapping a pile card jumps to its entry in the collection and turns it over */
function openInGrid(i) {
  const card = $(`.card[data-i="${i}"]`);
  if (!card) return;
  $$(".card.is-flipped").forEach((c) => c.classList.remove("is-flipped"));
  card.classList.add("is-flipped");
  card.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
}

/* ═══════════════ LEGEND / FILTER ═══════════════ */
function renderLegend() {
  const seen = [];
  PROJECTS.forEach((p) => {
    if (!seen.some((s) => s.status === p.status)) seen.push({ status: p.status, c: p.c });
  });

  $("#legend").innerHTML = seen
    .map((s) => {
      const n = PROJECTS.filter((p) => p.status === s.status).length;
      return `<button class="chip" data-status="${s.status}" style="--c:${s.c}"><i></i>${s.status} · ${n}</button>`;
    })
    .join("");

  const off = new Set();
  $("#legend").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const st = chip.dataset.status;
    off.has(st) ? off.delete(st) : off.add(st);
    chip.classList.toggle("is-off", off.has(st));
    $$(".card").forEach((c) => c.classList.toggle("is-hidden", off.has(c.dataset.status)));
  });
}

/* ═══════════════ COUNTERS ═══════════════ */
function initCounters() {
  const nums = $$(".num");
  const run = (el) => {
    const to = parseFloat(el.dataset.to);
    const dp = Number(el.dataset.dp || 0);
    if (reduced) { el.textContent = to.toFixed(dp); return; }
    const t0 = performance.now(), dur = 1100;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);          // ease-out cubic
      el.textContent = (to * e).toFixed(dp);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (!("IntersectionObserver" in window)) { nums.forEach(run); return; }
  const obs = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); } }),
    { threshold: 0.6 }
  );
  nums.forEach((n) => obs.observe(n));
}

/* ═══════════════ REVEAL ═══════════════ */
/* hidden ONLY after JS proves it can un-hide — never a CSS-only opacity:0 */
function initReveal() {
  if (reduced || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("anim-ready");
  const obs = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); } }),
    { threshold: 0.12, rootMargin: "-3% 0px -3% 0px" }
  );
  $$(".rise").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    obs.observe(el);
  });
}

/* ═══════════════ CLOCK ═══════════════ */
function initClock() {
  const el = $("#clock");
  const tick = () => {
    const t = new Date().toLocaleTimeString("en-AU", {
      timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit", hour12: false,
    });
    el.textContent = `Open to work · ${t} MEL`;
  };
  tick();
  setInterval(tick, 30000);
}

/* ═══════════════ BOOT ═══════════════ */
renderGrid();
renderLegend();
renderPile();
initCounters();
initReveal();
initClock();

$("#draw-btn").addEventListener("click", () => throwTop(1));
